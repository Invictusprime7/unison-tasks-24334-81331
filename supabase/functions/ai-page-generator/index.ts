/**
 * AI Page Generator Edge Function
 *
 * Handles fast on-demand page generation triggered by in-preview nav clicks.
 * Optimized for speed: no thinking tags, reduced token limits, industry page patterns.
 *
 * Uses the template-react system prompt with navPageGen optimizations.
 */

import { serve } from "serve";
import { z } from "zod";
import { generateVariation, variationToPromptContext } from "../_shared/industryVariations.ts";
import {
  getIndustryProfile,
  matchPagePattern,
  buildIndustryPageContext,
  getResearchQueries,
} from "../_shared/industryPagePatterns.ts";
import {
  corsHeaders,
  hexToHsl,
  extractTextContent,
  performPromptResearch,
  formatResearchContext,
  processMessages,
  callAIProviders,
  stripConfigFilesFromOutput,
  buildDesignProfileContext,
  handleCorsOptions,
  buildErrorResponse,
  type AIProviderResult,
} from "../_shared/aiShared.ts";

type AIMessage = { role: string; content: unknown };

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCorsOptions();

  try {
    const body = await req.json();

    const bodySchema = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.unknown(),
      })).min(1),
      systemType: z.string().max(100).nullish(),
      navPageName: z.string().max(100).nullish(),
      navLabel: z.string().max(120).nullish(),
      templateName: z.string().max(200).nullish(),
      aesthetic: z.string().max(200).nullish(),
      source: z.string().max(200).nullish(),
      variationSeed: z.string().max(200).nullish(),
      templateAction: z.string().max(100).nullish(),
      userDesignProfile: z.object({
        projectCount: z.number().optional(),
        dominantStyle: z.enum(["dark", "light", "colorful", "minimal", "mixed"]).optional(),
        industryHints: z.array(z.string()).optional(),
      }).optional(),
    });

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: parsed.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      messages,
      systemType,
      navPageName,
      navLabel,
      templateName,
      aesthetic,
      source,
      variationSeed,
      userDesignProfile,
    } = parsed.data;

    const designProfileContext = buildDesignProfileContext(userDesignProfile ?? null);

    // Run web research and industry page research in parallel
    const userPromptText = extractTextContent(messages[messages.length - 1]?.content);
    const researchPromise = performPromptResearch(userPromptText);

    const navResearchPromise: Promise<string> = (systemType)
      ? (async () => {
          try {
            const profile = getIndustryProfile(systemType ?? null);
            const pattern = matchPagePattern(profile, navPageName ?? '', navLabel ?? '');
            const staticCtx = buildIndustryPageContext(profile, pattern);
            const queries = getResearchQueries(pattern);
            const liveResults = await Promise.allSettled(
              queries.map(q => performPromptResearch(q))
            );
            const liveSnippets = liveResults
              .filter((r): r is PromiseFulfilledResult<{ snippets: string[]; trends: string[]; keyPhrases: string[] }> => r.status === 'fulfilled')
              .flatMap(r => r.value.snippets.slice(0, 3));
            const liveCtx = liveSnippets.length > 0
              ? `\n\n📡 LIVE WEB RESEARCH (industry page patterns):\n${liveSnippets.map(s => `  • ${s}`).join('\n')}`
              : '';
            return staticCtx + liveCtx;
          } catch (e) {
            console.warn('[ai-page-generator] navResearch failed:', e);
            return '';
          }
        })()
      : Promise.resolve('');

    // Build a template-react prompt optimized for single-page generation
    const templatePromptText = templateName
      ? `${templateName} ${aesthetic || ''} ${source || ''}`
      : userPromptText;
    const variation = generateVariation(templatePromptText, variationSeed ?? undefined);
    const variationContext = variationToPromptContext(variation);

    const systemPrompt = `You are an ELITE React developer generating a SINGLE PAGE component for an existing React application.

${variationContext}

## DESIGN SYSTEM CSS VARIABLES (USE THESE):
:root {
  --primary: ${hexToHsl(variation.colorScheme.primary)};
  --secondary: ${hexToHsl(variation.colorScheme.secondary)};
  --accent: ${hexToHsl(variation.colorScheme.accent)};
  --background: ${hexToHsl(variation.colorScheme.background)};
  --foreground: ${hexToHsl(variation.colorScheme.foreground)};
  --muted: ${hexToHsl(variation.colorScheme.muted)};
  --card: ${hexToHsl(variation.colorScheme.cardBg)};
}

## RULES:
1. Generate a COMPLETE React/TSX page component (export default)
2. Use Tailwind CSS utility classes with design token CSS variables
3. Use Lucide React icons: import { Icon } from "lucide-react"
4. Use data-ut-intent attributes for CTAs
5. Responsive with sm/md/lg breakpoints
6. MINIMUM 5 sections, MINIMUM 4 rich content items per section
7. All images from Unsplash with alt text
8. For multi-file output: {"files": {"src/pages/PageName.tsx": "..."}}
9. For single file: \`\`\`tsx code fence with complete component

## INTENT ATTRIBUTES:
- Booking: data-ut-intent="booking.create"
- Contact: data-ut-intent="contact.submit"
- Nav: data-ut-intent="nav.goto" data-ut-path="/page"
- Anchor: data-ut-intent="nav.anchor" data-ut-anchor="section"

## IMAGES:
${variation.industry.unsplashIds.map((id: string) => `https://images.unsplash.com/${id}?w=800&q=80`).join('\n')}

Generate a rich, production-quality page. Output the code directly — no explanations.`;

    // Wait for parallel research
    const [research, industryPageContext] = await Promise.all([researchPromise, navResearchPromise]);
    const researchContext = formatResearchContext(research);

    const normalizedMessages: AIMessage[] = messages.map(m => ({ role: m.role, content: m.content ?? '' }));
    const processedMessages = processMessages(normalizedMessages);

    // NavPageGen: NO thinking instruction (speed), reduced tokens
    const aiMessages = [
      { role: 'system', content: systemPrompt + researchContext + industryPageContext + designProfileContext },
      ...processedMessages,
    ];

    console.log(`[ai-page-generator] Generating page: ${navPageName || 'unknown'} (${navLabel || 'no label'})`);

    const result: AIProviderResult = await callAIProviders(aiMessages, { navPageGen: true });

    if (!result.ok) {
      const err = result as { ok: false; status: number; error: string; errorType: string };
      return new Response(
        JSON.stringify({ error: err.error, errorType: err.errorType }),
        { status: err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = stripConfigFilesFromOutput(result.content);

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return buildErrorResponse(error);
  }
});
