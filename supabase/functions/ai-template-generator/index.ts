/**
 * AI Template Generator Edge Function
 *
 * Handles template generation modes:
 *   - template-json: Canvas template JSON format
 *   - template-html: Self-contained HTML templates
 *   - template-react: Full React/TSX applications
 *   - caller-managed template-react: Systems-build managed generation
 *
 * Split from the monolithic ai-code-assistant for:
 *   - Faster cold starts (no code/design/review/debug prompt loading)
 *   - Clearer separation of concerns
 *   - Easier maintenance
 */

import { serve } from "serve";
import { z } from "zod";
import { generateVariation, variationToPromptContext } from "../_shared/industryVariations.ts";
import {
  corsHeaders,
  hexToHsl,
  extractTextContent,
  performPromptResearch,
  formatResearchContext,
  processMessages,
  callAIProviders,
  stripConfigFilesFromOutput,
  buildSystemTypeContext,
  buildDesignProfileContext,
  buildSystemsBuildContextText,
  handleCorsOptions,
  buildErrorResponse,
  saveLearnSession,
  THINKING_INSTRUCTION,
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
      mode: z.enum(['template-json', 'template-html', 'template-react']),
      callerManaged: z.boolean().optional(),
      templateName: z.string().max(200).nullish(),
      aesthetic: z.string().max(200).nullish(),
      source: z.string().max(200).nullish(),
      variationSeed: z.string().max(200).nullish(),
      currentCode: z.string().nullish(),
      templateAction: z.string().max(100).nullish(),
      savePattern: z.boolean().optional(),
      systemType: z.string().max(100).nullish(),
      userDesignProfile: z.object({
        projectCount: z.number().optional(),
        dominantStyle: z.enum(["dark", "light", "colorful", "minimal", "mixed"]).optional(),
        industryHints: z.array(z.string()).optional(),
      }).optional(),
      systemsBuildContext: z.record(z.any()).optional(),
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
      mode,
      callerManaged = false,
      templateName,
      aesthetic,
      source,
      variationSeed,
      currentCode,
      templateAction,
      savePattern,
      systemType,
      userDesignProfile,
      systemsBuildContext,
    } = parsed.data;

    const systemTypeContext = buildSystemTypeContext(systemType ?? null);
    const designProfileContext = buildDesignProfileContext(userDesignProfile ?? null);
    const systemsBuildContextText = buildSystemsBuildContextText(
      systemsBuildContext ?? null,
      systemType ?? null,
      templateName ?? null
    );

    // Perform web research in parallel
    const userPromptText = extractTextContent(messages[messages.length - 1]?.content);
    const researchPromise = performPromptResearch(userPromptText);

    // Build system prompt based on mode
    let systemPrompt: string;

    if (callerManaged && mode === 'template-react') {
      // ================================================================
      // CALLER-MANAGED MODE: systems-build has already injected all
      // color tokens, layout directives, section orders, fonts, and
      // industry-specific generation rules into the user message.
      // ================================================================
      console.log(`[ai-template-generator] Caller-managed template-react mode`);

      const referenceTemplateBlock = currentCode && templateAction === 'use-as-schema' ? `

## 📝 CONTENT REFERENCE (INSPIRATION ONLY — DO NOT COPY LAYOUT)
Below is a reference for CONTENT DIRECTION ONLY (what services to mention, copy tone, industry terminology).
DO NOT copy its layout, color scheme, section order, or visual structure.
Your layout, colors, and structure MUST come from the user message specifications.

**Reference content (for terminology and copy direction only):**
\`\`\`
${currentCode.substring(0, 8000)}
\`\`\`
` : '';

      systemPrompt = `You are an ELITE React fullstack developer producing PREMIUM, PRODUCTION-READY React applications.

${referenceTemplateBlock}

## CRITICAL: ALL DESIGN DECISIONS ARE IN THE USER MESSAGE

The user message contains EXACT specifications for:
- CSS color variables (:root tokens) — use them EXACTLY as provided
- Layout structure (hero style, section order, spacing) — follow EXACTLY
- Typography (fonts, weights, transforms) — follow EXACTLY  
- Component styles (buttons, cards, images) — follow EXACTLY
- Required sections list — include ALL of them
- Industry-specific generation rules — follow EXACTLY

DO NOT invent your own colors, layout, sections, or fonts. The user message is the SINGLE SOURCE OF TRUTH.

## REACT ARCHITECTURE

⚠️ CRITICAL: OUTPUT EXACTLY TWO FILES — src/App.tsx and src/index.css
All components (Hero, Features, Header, Footer, Testimonials, etc.) MUST be defined
INLINE in App.tsx as named function components. DO NOT create separate files for sections,
layouts, or UI components. The preview runtime provides its own hooks-shim and ui-shim
so you NEVER need to generate those files.

File structure:
\`\`\`
src/
├── App.tsx              # ALL components inline + main app composition
├── index.css            # Global styles with CSS variables FROM USER MESSAGE
\`\`\`

## COMPONENT PATTERNS (ALL INLINE IN App.tsx):

### Button:
\`\`\`tsx
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button className={cn(
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
      { "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
        "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
        "hover:bg-accent hover:text-accent-foreground": variant === "ghost" },
      { "h-9 px-3 text-sm": size === "sm", "h-10 px-4 py-2": size === "md", "h-11 px-8 text-lg": size === "lg" },
      className
    )} ref={ref} {...props} />
  )
);
\`\`\`

### Section:
\`\`\`tsx
export function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">{children}</div>
    </section>
  );
}
\`\`\`

## INTENT HANDLERS:
Use the pre-built hooks-shim:
\`\`\`tsx
import { useIntentHandlers } from './hooks-shim';
const { handleBooking, handleContact, handleNewsletter, handleNavigation, handleAuth } = useIntentHandlers();
\`\`\`

For buttons, use data-ut-intent attributes:
\`\`\`tsx
<button data-ut-intent="booking.create">Book Now</button>
<button data-ut-intent="nav.goto" data-ut-payload='{"path":"#contact"}'>Contact Us</button>
<form data-ut-intent="contact.submit">...</form>
\`\`\`

## ICONS: import { IconName } from "lucide-react";

## CSS UTILITY CLASSES (include in index.css alongside the :root variables from user message):
\`\`\`css
.glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
.glass-card { background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; }
.gradient-text { background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hover-lift { transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease; }
.hover-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
@keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { opacity: 0; animation: fade-in-up 0.6s ease forwards; }
.stagger-1 { animation-delay: 0.1s; } .stagger-2 { animation-delay: 0.2s; } .stagger-3 { animation-delay: 0.3s; }
.caption { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(var(--primary)); }
\`\`\`

## OUTPUT FORMAT:
Return a single JSON object (no markdown, no explanations).
ONLY include src/App.tsx and src/index.css — no other files:
\`\`\`json
{ "files": { "src/App.tsx": "...", "src/index.css": "..." }, "entryPoint": "src/App.tsx", "framework": "react", "buildTool": "vite" }
\`\`\`

## ⛔ NEVER INCLUDE: tailwind.config, package.json, vite.config, tsconfig, postcss.config, main.tsx, hooks/, lib/, components/ui/, components/sections/, components/layout/

## QUALITY (NON-NEGOTIABLE):
- MINIMUM 10 section components (ALL INLINE in App.tsx)
- EXACTLY ONE Hero section
- MINIMUM 6 service items, 3 testimonials, 5 FAQ items
- All images from Unsplash with alt text
- Professional typography hierarchy (eyebrow → headline → body)
- Responsive with sm/md/lg/xl breakpoints
- Smooth scroll animations

OUTPUT: Return ONLY the JSON object with EXACTLY two files: src/App.tsx and src/index.css.`;

    } else {
      // Standard template generation — use industry variations
      const extractText = (content: unknown): string => {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
          return content.map((p: Record<string, unknown>) => (p?.text as string) || '').filter(Boolean).join(' ');
        }
        return '';
      };

      const userText = extractText(messages[messages.length - 1]?.content) || '';
      const templatePromptText = templateName
        ? `${templateName} ${aesthetic || ''} ${source || ''}`
        : userText;

      const variation = generateVariation(templatePromptText, variationSeed ?? undefined);
      const variationContext = variationToPromptContext(variation);

      console.log(`[ai-template-generator] mode=${mode}, Industry=${variation.industry.name}, Colors=${variation.colorScheme.name}, Seed=${variation.seed}`);

      if (mode === 'template-json') {
        systemPrompt = `You are an ELITE web template generator producing PREMIUM, PRODUCTION-READY templates for a Web Builder canvas. Your templates must rival top-tier designs from ThemeForest, Webflow, and Framer.

${variationContext}

TEMPLATE SCHEMA (STRICT — follow exactly, USE THE COLORS SPECIFIED ABOVE):
{
  "name": "Template Name",
  "description": "Brief description",
  "industry": "${variation.industry.id}",
  "brandKit": {
    "primaryColor": "${variation.colorScheme.primary}",
    "secondaryColor": "${variation.colorScheme.secondary}",
    "accentColor": "${variation.colorScheme.accent}",
    "fonts": {
      "heading": "${variation.fontPairing.heading}",
      "body": "${variation.fontPairing.body}"${variation.fontPairing.accent ? `,
      "accent": "${variation.fontPairing.accent}"` : ''}
    }
  },
  "sections": [ ... ],
  "formats": [
    { "id": "desktop", "name": "Desktop", "size": { "width": 1280, "height": 800 }, "format": "web" }
  ],
  "data": { ... }
}

SECTION STRUCTURE:
{
  "id": "section-[name]",
  "name": "Section Name",
  "type": "hero" | "features" | "cta" | "testimonials" | "pricing" | "stats" | "about" | "footer",
  "constraints": {
    "width": { "mode": "fill" },
    "height": { "mode": "fixed", "value": 600 },
    "padding": { "top": 60, "right": 80, "bottom": 60, "left": 80 },
    "gap": 24,
    "flexDirection": "column",
    "alignItems": "center",
    "justifyContent": "center"
  },
  "style": { "background": "linear-gradient(135deg, ${variation.colorScheme.gradients[0]})" },
  "components": [ ... ]
}

COMPONENT STRUCTURE:
{
  "id": "unique-id",
  "type": "text" | "image" | "shape" | "button" | "container",
  "constraints": { "width": { "mode": "fill" | "hug" | "fixed" }, "height": { "mode": "fill" | "hug" | "fixed" } },
  "style": { "backgroundColor": "${variation.colorScheme.primary}", "borderRadius": 12 },
  "fabricProps": { "fontSize": 56, "fontFamily": "${variation.fontPairing.heading}", "fontWeight": "bold", "fill": "${variation.colorScheme.foreground}" }
}

MINIMUM 6 sections with 4-6 components each. Use the industry images: ${variation.industry.unsplashIds.map(id => `https://images.unsplash.com/${id}?w=800&q=80`).join(', ')}

OUTPUT: Return ONLY valid JSON matching this schema.`;

      } else if (mode === 'template-html') {
        systemPrompt = `You are an ELITE web designer producing PREMIUM, AWARD-WINNING website templates. Your output must rival top-tier templates from ThemeForest, Webflow, and Framer.

${variationContext}

DESIGN SYSTEM (MANDATORY):
Use CSS custom properties for theming. These are already configured:
:root {
  --primary: ${hexToHsl(variation.colorScheme.primary)};
  --secondary: ${hexToHsl(variation.colorScheme.secondary)};
  --accent: ${hexToHsl(variation.colorScheme.accent)};
  --background: ${hexToHsl(variation.colorScheme.background)};
  --foreground: ${hexToHsl(variation.colorScheme.foreground)};
  --muted: ${hexToHsl(variation.colorScheme.muted)};
  --card: ${hexToHsl(variation.colorScheme.cardBg)};
}

## 🎨 PREMIUM CSS (INCLUDE IN <style> TAG):
\`\`\`css
.glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
.glass-card { background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; }
.nav-blur { background: rgba(10,10,10,0.8); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.1); }
.gradient-text { background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.btn-primary { background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary))); color: white; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 9999px; transition: all 0.3s ease; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
.btn-secondary { background: transparent; border: 2px solid rgba(255,255,255,0.3); color: white; padding: 0.75rem 1.5rem; border-radius: 9999px; }
.hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
.hover-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
@keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { opacity: 0; animation: fade-in-up 0.6s ease forwards; }
.stagger-1 { animation-delay: 0.1s; } .stagger-2 { animation-delay: 0.2s; } .stagger-3 { animation-delay: 0.3s; }
.headline-xl { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; line-height: 1.1; }
.headline-lg { font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; line-height: 1.2; }
.body-lg { font-size: 1.125rem; line-height: 1.7; color: rgba(255,255,255,0.7); }
.body-md { font-size: 1rem; line-height: 1.6; color: rgba(255,255,255,0.6); }
.caption { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(var(--primary)); }
.card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5rem; padding: 2rem; transition: all 0.3s ease; }
.card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); transform: translateY(-4px); }
.section-spacing { padding: 5rem 1rem; }
.container-wide { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
.badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; background: rgba(var(--primary), 0.1); border: 1px solid rgba(var(--primary), 0.2); }
\`\`\`

ARCHITECTURE RULES:
- Use Tailwind CSS via CDN
- Use Lucide Icons CDN: <i data-lucide="icon-name" class="w-6 h-6"></i>
- Use semantic HTML5
- Mobile-first responsive: sm → md → lg → xl
- Initialize icons: <script>lucide.createIcons();</script>

TYPOGRAPHY (USE THESE FONTS):
- Heading: "${variation.fontPairing.heading}"
- Body: "${variation.fontPairing.body}"

SECTION ORDER (FOLLOW EXACTLY — ONE OF EACH TYPE, NO DUPLICATES):
${variation.sectionOrder.map((s: string, i: number) => `${i + 1}. ${s.toUpperCase()}`).join('\n')}

⚠️ CRITICAL: Generate EXACTLY ONE hero section. Do NOT create multiple hero variants.

HERO LAYOUT: ${variation.heroVariant.name} (${variation.heroVariant.layout})

IMAGES TO USE:
${variation.industry.unsplashIds.map((id: string) => `https://images.unsplash.com/${id}?w=800&q=80`).join('\n')}

OUTPUT: Return ONLY the complete, self-contained HTML document. No markdown, no explanations.`;

      } else {
        // template-react mode — Full React application
        const referenceTemplateBlock = currentCode && templateAction === 'use-as-schema' ? `

## 📝 CONTENT REFERENCE (INSPIRATION ONLY — DO NOT COPY LAYOUT OR COLORS)
Use this reference for CONTENT DIRECTION ONLY (what services to mention, copy tone, industry terminology).
DO NOT copy its layout, section order, color scheme, or visual structure.

**Reference content (for terminology/copy only):**
\`\`\`
${currentCode.substring(0, 8000)}
\`\`\`
` : '';

        systemPrompt = `You are an ELITE React fullstack developer producing PREMIUM, PRODUCTION-READY React applications.
${referenceTemplateBlock}
${variationContext}

## REACT FULLSTACK ARCHITECTURE

⚠️ CRITICAL: OUTPUT EXACTLY TWO FILES — src/App.tsx and src/index.css
All components (Hero, Features, Header, Footer, Testimonials, etc.) MUST be defined
INLINE in App.tsx as named function components. DO NOT create separate files for sections,
layouts, or UI components. The preview runtime provides its own hooks-shim and ui-shim
so you NEVER need to generate those files.

File structure:
\`\`\`
src/
├── App.tsx              # ALL components inline + main app composition
├── index.css            # Global styles with CSS variables
\`\`\`

## DESIGN SYSTEM (MANDATORY CSS VARIABLES):

\`\`\`css
:root {
  --primary: ${hexToHsl(variation.colorScheme.primary)};
  --primary-foreground: 0 0% 100%;
  --secondary: ${hexToHsl(variation.colorScheme.secondary)};
  --secondary-foreground: 0 0% 100%;
  --accent: ${hexToHsl(variation.colorScheme.accent)};
  --accent-foreground: 0 0% 100%;
  --background: ${hexToHsl(variation.colorScheme.background)};
  --foreground: ${hexToHsl(variation.colorScheme.foreground)};
  --muted: ${hexToHsl(variation.colorScheme.muted)};
  --muted-foreground: 240 3.8% 46.1%;
  --card: ${hexToHsl(variation.colorScheme.cardBg)};
  --card-foreground: ${hexToHsl(variation.colorScheme.foreground)};
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: ${hexToHsl(variation.colorScheme.primary)};
  --radius: 0.5rem;
}
\`\`\`

## TYPOGRAPHY:
- Heading: "${variation.fontPairing.heading}"
- Body: "${variation.fontPairing.body}"

## SECTION ORDER:
${variation.sectionOrder.map((s: string, i: number) => `${i + 1}. ${s.charAt(0).toUpperCase() + s.slice(1)}`).join('\n')}

⚠️ CRITICAL: Generate EXACTLY ONE Hero section component.

## HERO LAYOUT: ${variation.heroVariant.name} (${variation.heroVariant.layout})

## IMAGES:
${variation.industry.unsplashIds.map((id: string) => `https://images.unsplash.com/${id}?w=800&q=80`).join('\n')}

## ICONS: import { IconName } from "lucide-react";

## PREMIUM CSS PATTERNS (COPY INTO index.css):
\`\`\`css
.glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.glass-card { background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; }
.nav-blur { background: rgba(10,10,10,0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.1); }
.gradient-text { background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%); color: white; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 9999px; transition: all 0.3s ease; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
.btn-secondary { background: transparent; border: 2px solid rgba(255,255,255,0.3); color: white; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 9999px; transition: all 0.3s ease; }
.btn-secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.5); }
.hover-lift { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
.hover-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
@keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { opacity: 0; animation: fade-in-up 0.6s ease forwards; }
.stagger-1 { animation-delay: 0.1s; } .stagger-2 { animation-delay: 0.2s; } .stagger-3 { animation-delay: 0.3s; } .stagger-4 { animation-delay: 0.4s; }
.shadow-elevation-3 { box-shadow: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1); }
.headline-xl { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
.headline-lg { font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; line-height: 1.2; }
.body-lg { font-size: 1.125rem; line-height: 1.7; color: rgba(255,255,255,0.7); }
.body-md { font-size: 1rem; line-height: 1.6; color: rgba(255,255,255,0.6); }
.caption { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(var(--primary)); }
.card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5rem; padding: 2rem; transition: all 0.3s ease; }
.card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); transform: translateY(-4px); }
.section-spacing { padding: 5rem 1rem; }
.container-wide { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
.badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; }
\`\`\`

## INTENT HANDLERS (USE HOOKS-SHIM):
\`\`\`tsx
import { useIntentHandlers } from './hooks-shim';
const { handleBooking, handleContact, handleNewsletter, handleNavigation, handleAuth } = useIntentHandlers();
\`\`\`

For buttons/elements, PREFER data-ut-intent attributes:
\`\`\`tsx
<button data-ut-intent="booking.create">Book Now</button>
<button data-ut-intent="nav.goto" data-ut-payload='{"path":"#contact"}'>Contact Us</button>
\`\`\`

## OUTPUT FORMAT:
Return a single JSON object (no markdown, no explanations).
ONLY include src/App.tsx and src/index.css — no other files:
\`\`\`json
{
  "files": { "src/App.tsx": "...", "src/index.css": "..." },
  "entryPoint": "src/App.tsx",
  "framework": "react",
  "buildTool": "vite"
}
\`\`\`

## ⛔ NEVER INCLUDE: tailwind.config, package.json, vite.config, tsconfig, postcss.config, main.tsx, hooks/, lib/, components/ui/, components/sections/, components/layout/

## QUALITY (NON-NEGOTIABLE):
- MINIMUM 10 section components (ALL INLINE in App.tsx)
- EXACTLY ONE Hero section
- MINIMUM 6 service items, 3 testimonials, 5 FAQ items
- All images from Unsplash with alt text
- Professional typography hierarchy
- Responsive with sm/md/lg/xl breakpoints
- Smooth scroll animations

OUTPUT: Return ONLY the JSON object with EXACTLY two files: src/App.tsx and src/index.css.`;
      }
    }

    // Wait for research
    const research = await researchPromise;
    const researchContext = formatResearchContext(research);

    // Process messages
    const normalizedMessages: AIMessage[] = messages.map(m => ({ role: m.role, content: m.content ?? '' }));
    const processedMessages = processMessages(normalizedMessages);

    // Build final messages
    const aiMessages = [
      { role: 'system', content: systemPrompt + researchContext + systemTypeContext + designProfileContext + systemsBuildContextText + THINKING_INSTRUCTION },
      ...processedMessages,
    ];

    console.log(`[ai-template-generator] Processing ${processedMessages.length} messages`);

    // Call AI providers
    const result: AIProviderResult = await callAIProviders(aiMessages);

    if (!result.ok) {
      const err = result as { ok: false; status: number; error: string; errorType: string };
      return new Response(
        JSON.stringify({ error: err.error, errorType: err.errorType }),
        { status: err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Post-process: strip config files
    const content = stripConfigFilesFromOutput(result.content);

    // Save learning session (async, don't wait)
    if (savePattern && userPromptText) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      saveLearnSession(supabaseUrl, supabaseKey, mode, userPromptText, content).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        content,
        thinking: result.reasoning ? result.reasoning.substring(0, 12000) : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return buildErrorResponse(error);
  }
});
