/**
 * ai-code-assistant — Thin entry point / orchestrator.
 * 
 * All heavy logic lives in extracted modules:
 *   requestSchema.ts      — Zod validation
 *   taskClassifier.ts     — Task type detection
 *   providerRouter.ts     — Model selection
 *   responseNormalizer.ts  — Thinking extraction + post-processing
 *   contextBuilders.ts    — System/blueprint/VFS context blocks
 *   webResearch.ts        — DDG web research
 *   contextCompactor.ts   — Message truncation + thinking instructions
 *   sessionMemory.ts      — Lane B session memory
 *   imageGeneration.ts    — Image generation
 *   aiProviderLoop.ts     — Gateway + direct API fallback loop
 *   prompts/codePrompt.ts     — Code-mode system prompt
 *   prompts/templatePrompts.ts — template-json / template-html / template-react prompts
 *   prompts/editPrompts.ts     — Edit / surgical edit / template action context
 */

import { serve } from "serve";
import { createClient } from "@supabase/supabase-js";
import { generateVariation, variationToPromptContext } from "../_shared/industryVariations.ts";
import {
  getIndustryProfile,
  matchPagePattern,
  buildIndustryPageContext,
  getResearchQueries,
} from "../_shared/industryPagePatterns.ts";

// ── Extracted modules ───────────────────────────────────────────────────────
import { AIRequestSchema } from "./requestSchema.ts";
import { classifyTask } from "./taskClassifier.ts";
import { buildProviderPlan } from "./providerRouter.ts";
import { postProcessContent, buildResponseBody } from "./responseNormalizer.ts";
import { extractTextContent, corsHeaders } from "./utils.ts";
import { performPromptResearch, formatResearchContext, type ResearchResult } from "./webResearch.ts";
import {
  buildSystemTypeContext,
  buildDesignProfileContext,
  buildSystemsBlueprintContext,
  analyzeTemplateStructure,
  buildElementsLibraryBlock,
  buildVfsFilesContext,
  buildFastPathSystemPrompt,
} from "./contextBuilders.ts";
import { buildTemplateActionContext, buildEditModeContext, buildSurgicalEditReinforcement } from "./prompts/editPrompts.ts";
import { buildCodeModePrompt } from "./prompts/codePrompt.ts";
import { buildTemplateJsonPrompt, buildTemplateHtmlPrompt, buildTemplateReactPrompt } from "./prompts/templatePrompts.ts";
import { generateImageIfNeeded } from "./imageGeneration.ts";
import { runProviderLoop } from "./aiProviderLoop.ts";
import { compactMessages, buildThinkingInstruction } from "./contextCompactor.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface CodePattern {
  pattern_type: string;
  description: string | null;
  usage_count: number;
  success_rate: number;
  tags: string[] | null;
  code_snippet: string;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. Parse & validate ──────────────────────────────────────────────
    const parsed = AIRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path, message: i.message })),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      messages,
      mode,
      savePattern = true,
      generateImage = false,
      imagePlacement,
      currentCode,
      editMode = false,
      debugMode: _debugMode = false,
      templateAction,
      systemType,
      variationSeed,
      templateName,
      aesthetic,
      source,
      userDesignProfile,
      systemsBuildContext,
      navPageGen = false,
      navPageName,
      navLabel,
      siteElementsLibraryContext,
      surgicalEdit = false,
      vfsFiles,
      gatewayOptions,
    } = parsed.data;

    // ── 2. Classify task ─────────────────────────────────────────────────
    const task = classifyTask({
      mode,
      systemsBuildContext,
      currentCode,
      editMode,
      templateAction: templateAction ?? undefined,
      navPageGen,
      surgicalEdit,
      debugMode: _debugMode,
      vfsFiles,
    });

    const fastTemplateReact = task.type === "wizard_template_react";
    const fastGenerationMode = task.fastPath;

    if (fastTemplateReact) {
      console.log('[ai-code-assistant] FAST PATH: wizard launch detected, using compact prompt');
    }

    // ── 3. Environment & Supabase ────────────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.warn("LOVABLE_API_KEY not configured — will attempt direct provider APIs as fallback");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── 4. Fetch learned patterns (skip for fast path) ───────────────────
    let learnedPatterns = 'No patterns loaded (fast mode).';
    if (!fastGenerationMode) {
      const { data: patterns } = await supabase
        .from('ai_code_patterns')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('success_rate', { ascending: false })
        .limit(12);

      learnedPatterns = patterns && patterns.length > 0
        ? (patterns as CodePattern[]).map((p) => `
📐 **${p.pattern_type.toUpperCase()}** — ${p.description || 'N/A'}
Tags: ${(p.tags || []).join(', ')} | Used ${p.usage_count}× | ${p.success_rate}% success
\`\`\`tsx
${p.code_snippet.substring(0, 600)}${p.code_snippet.length > 600 ? '...' : ''}
\`\`\`
`).join('\n')
        : 'No learned patterns yet - but I will learn from every successful interaction!';
    }

    // ── 5. Build context blocks ──────────────────────────────────────────
    const systemTypeContext = buildSystemTypeContext(systemType);
    const designProfileContext = buildDesignProfileContext(userDesignProfile);
    const systemsBuildContextText = buildSystemsBlueprintContext(systemsBuildContext);
    const templateStructure = currentCode ? analyzeTemplateStructure(currentCode) : '';
    const templateActionCtx = buildTemplateActionContext(templateAction ?? undefined);
    const editModeContext = buildEditModeContext(editMode, currentCode, templateStructure, templateActionCtx);

    // ── 6. Build system prompt ───────────────────────────────────────────
    let systemPrompt: string;

    if (mode === 'template-json' || mode === 'template-html' || mode === 'template-react') {
      const userPromptText = extractTextContent(messages[messages.length - 1]?.content) || '';
      const templatePromptText = templateName
        ? `${templateName} ${aesthetic || ''} ${source || ''}`
        : userPromptText;

      const variation = generateVariation(templatePromptText, variationSeed ?? undefined);
      const variationContext = variationToPromptContext(variation);

      console.log(`[ai-code-assistant] Template mode=${mode}, Industry=${variation.industry.name}, Colors=${variation.colorScheme.name}, Seed=${variation.seed}`);

      if (mode === 'template-json') {
        systemPrompt = buildTemplateJsonPrompt(variation, variationContext);
      } else if (mode === 'template-html') {
        systemPrompt = buildTemplateHtmlPrompt(variation, variationContext);
      } else {
        // template-react
        systemPrompt = buildTemplateReactPrompt(variation, variationContext, currentCode, templateAction ?? undefined);
      }
    } else {
      systemPrompt = buildCodeModePrompt({ editModeContext, learnedPatterns });
    }

    // ── 7. User prompt extraction ────────────────────────────────────────
    const lastMessageContent = messages[messages.length - 1]?.content;
    const userPromptText = extractTextContent(lastMessageContent);
    const userPrompt = userPromptText.toLowerCase();

    // ── 8. Web research (parallel, skip for fast path) ───────────────────
    const researchPromise = task.skipResearch
      ? Promise.resolve({ snippets: [], trends: [], keyPhrases: [] } as ResearchResult)
      : performPromptResearch(userPromptText);

    const navResearchPromise: Promise<string> = (navPageGen && !fastTemplateReact && systemType)
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
              .filter((r): r is PromiseFulfilledResult<ResearchResult> => r.status === 'fulfilled')
              .flatMap(r => r.value.snippets.slice(0, 3));
            const liveCtx = liveSnippets.length > 0
              ? `\n\n📡 LIVE WEB RESEARCH (industry page patterns):\n${liveSnippets.map(s => `  • ${s}`).join('\n')}`
              : '';
            return staticCtx + liveCtx;
          } catch (e) {
            console.warn('[navResearch] failed:', e);
            return '';
          }
        })()
      : Promise.resolve('');

    // ── 9. Image generation (parallel, skip for fast path) ───────────────
    const imagePromise = generateImageIfNeeded({
      userPrompt,
      generateImage,
      imagePlacement: imagePlacement ?? undefined,
      fastTemplateReact,
      lovableApiKey: LOVABLE_API_KEY ?? undefined,
    });

    // ── 10. Await parallel work ──────────────────────────────────────────
    const [research, industryPageContext, imageResult] = await Promise.all([
      researchPromise,
      navResearchPromise,
      imagePromise,
    ]);

    const researchContext = formatResearchContext(research);

    // ── 11. Compact messages ─────────────────────────────────────────────
    const processedMessages = compactMessages(messages);
    console.log(`[AI-Code-Assistant] Processing ${processedMessages.length} messages (from ${messages.length} original)`);

    // ── 12. Assemble final system prompt ─────────────────────────────────
    const thinkingInstruction = buildThinkingInstruction(task.skipThinking);
    const elementsLibraryBlock = buildElementsLibraryBlock(siteElementsLibraryContext, surgicalEdit);
    const vfsFilesContext = buildVfsFilesContext(surgicalEdit, vfsFiles);
    const surgicalEditReinforcement = buildSurgicalEditReinforcement(surgicalEdit, vfsFilesContext);

    const finalSystemPrompt = fastTemplateReact
      ? buildFastPathSystemPrompt({
          systemsBuildContext: systemsBuildContext as Record<string, any>,
          templateName,
          source,
        })
      : systemPrompt
        + surgicalEditReinforcement
        + researchContext
        + industryPageContext
        + systemTypeContext
        + designProfileContext
        + systemsBuildContextText
        + elementsLibraryBlock
        + thinkingInstruction
        + (imageResult.generatedImageUrl
          ? `\n\n**IMPORTANT: An AI-generated image has been created for this request. Include this image HTML in your response at the appropriate location:**\n${imageResult.imageHtml}\n\nThe image is already styled for the "${imagePlacement || 'top-left'}" position. Make sure to include it in a relative-positioned container.`
          : '');

    const aiMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...processedMessages,
    ];

    // ── 13. Call AI providers ────────────────────────────────────────────
    const providerPlan = buildProviderPlan(task, Boolean(LOVABLE_API_KEY));
    const providerResult = await runProviderLoop({
      aiMessages,
      providerPlan,
      navPageGen,
      lovableApiKey: LOVABLE_API_KEY ?? undefined,
    });

    if (providerResult.earlyResponse) {
      return providerResult.earlyResponse;
    }

    // ── 14. Post-process + response ──────────────────────────────────────
    const content = postProcessContent(providerResult.content);

    // Save learning session (async, don't wait)
    const originalUserPrompt = extractTextContent(messages[messages.length - 1]?.content);
    if (savePattern && originalUserPrompt) {
      supabase.from('ai_learning_sessions').insert({
        session_type: mode === 'code' ? 'code_generation' : mode === 'design' ? 'design_review' : 'code_review',
        user_prompt: originalUserPrompt.substring(0, 500),
        ai_response: content.substring(0, 500),
        was_successful: true,
        technologies_used: ['React', 'TypeScript', 'Tailwind CSS'],
      }).then(() => console.log('Learning session saved'));
    }

    const responseBody = buildResponseBody({
      content,
      reasoning: providerResult.reasoning,
      generatedImageUrl: imageResult.generatedImageUrl,
      imagePlacement: imagePlacement ?? undefined,
    });

    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-code-assistant:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Request timed out. The AI service is taking too long. Please try again.', errorType: 'timeout' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = message;
    let errorType = 'unknown';

    if (message.includes('All AI providers failed') || message.includes('All AI models failed')) {
      userMessage = 'AI service temporarily unavailable. All models are busy or experiencing issues. Please try again in a moment.';
      errorType = 'ai_unavailable';
    } else if (message.includes('network') || message.includes('fetch')) {
      userMessage = 'Network error connecting to AI service. Please check your connection and try again.';
      errorType = 'network';
    } else if (message.includes('JSON') || message.includes('parse')) {
      userMessage = 'Received invalid response from AI service. Please try again.';
      errorType = 'parse_error';
    }

    return new Response(
      JSON.stringify({ error: userMessage, errorType, details: message !== userMessage ? message : undefined }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
