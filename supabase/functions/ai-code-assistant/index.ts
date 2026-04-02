import { serve } from "serve";
import { createClient } from "@supabase/supabase-js";
import { generateVariation, variationToPromptContext } from "../_shared/industryVariations.ts";
import {
  getIndustryProfile,
  matchPagePattern,
  buildIndustryPageContext,
  getResearchQueries,
} from "../_shared/industryPagePatterns.ts";

// ── Extracted modules (Stage 1) ─────────────────────────────────────────────
import { AIRequestSchema } from "./requestSchema.ts";
import { classifyTask } from "./taskClassifier.ts";
import { buildProviderPlan } from "./providerRouter.ts";
import { extractThinkingTags, postProcessContent, buildResponseBody } from "./responseNormalizer.ts";
import { hexToHsl, extractTextContent, corsHeaders } from "./utils.ts";

// ── Extracted modules (Stage 2) ─────────────────────────────────────────────
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

interface CodePattern {
  pattern_type: string;
  description: string | null;
  usage_count: number;
  success_rate: number;
  tags: string[] | null;
  code_snippet: string;
}

// Web research functions moved to ./webResearch.ts

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      templateAnalysis: _templateAnalysis,
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
    } = parsed.data;

    // ── Classify the task using extracted module ─────────────────────────
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

    void _debugMode;
    void _templateAnalysis;

    // Build context blocks via extracted modules
    const systemTypeContext = buildSystemTypeContext(systemType);
    const designProfileContext = buildDesignProfileContext(userDesignProfile);
    const systemsBuildContextText = buildSystemsBlueprintContext(systemsBuildContext);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.warn("LOVABLE_API_KEY not configured — will attempt direct provider APIs as fallback");
    }

    // Initialize Supabase for learning system
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch top learned patterns — SKIP for fast path
    let learnedPatterns = 'No patterns loaded (fast mode).';
    if (!fastGenerationMode) {
      const { data: patterns } = await supabase
        .from('ai_code_patterns')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('success_rate', { ascending: false })
        .limit(12);

      learnedPatterns = patterns && patterns.length > 0 ? (patterns as CodePattern[]).map((p: CodePattern) => `
📐 **${p.pattern_type.toUpperCase()}** — ${p.description || 'N/A'}
Tags: ${(p.tags || []).join(', ')} | Used ${p.usage_count}× | ${p.success_rate}% success
\`\`\`tsx
${p.code_snippet.substring(0, 600)}${p.code_snippet.length > 600 ? '...' : ''}
\`\`\`
`).join('\n') : 'No learned patterns yet - but I will learn from every successful interaction!';
    }

    // Template structure + action + edit context via extracted modules
    const templateStructure = currentCode ? analyzeTemplateStructure(currentCode) : '';
    const templateActionCtx = buildTemplateActionContext(templateAction ?? undefined);
    const editModeContext = buildEditModeContext(editMode, currentCode, templateStructure, templateActionCtx);
${templateAction === 'add' ? `User wants to ADD new elements/sections/components to the project.
- For React projects: create new component files or add JSX to existing components
- Identify the best location for new content based on the site component map
- Maintain existing design patterns, imports, and component structure
- If adding a section to a page: import and render it in the parent component (App.tsx or relevant page)
- Output modified files in JSON format: {"files": {"/path": "content"}}` : ''}
${templateAction === 'remove' ? `User wants to REMOVE elements/sections/components from the project.
- For React projects: remove the component usage from the parent, clean up unused imports
- Carefully remove ONLY what's specified
- Clean up any orphaned styles, imports, or empty containers
- Maintain structural integrity after removal` : ''}
${templateAction === 'modify' ? `User wants to MODIFY existing elements/sections/components.
- For React projects: identify which file contains the targeted component using the site component map
- Make targeted changes to ONLY that component's JSX, styles, or logic
- Preserve all imports, hooks, state, props, and other component structure
- Output only the modified file(s), not the entire project
- Update only the specified properties/content` : ''}
${templateAction === 'suggest' ? `User wants UI/UX SUGGESTIONS for improvement.
- Analyze current template for improvements
- Suggest specific, actionable enhancements
- Provide code examples for each suggestion
- Consider accessibility, performance, and UX best practices` : ''}
${templateAction === 'restyle' ? `User wants to RESTYLE the template/component visually.
- For React projects: modify className props and CSS/style on targeted elements
- Change colors, fonts, spacing as requested
- Maintain layout and structure
- Ensure consistent styling across all sections` : ''}
${templateAction === 'full-control' ? `🚀 **FULL CREATIVE CONTROL MODE - AI HAS COMPLETE AUTHORITY**

You have FULL AUTHORITY to make ANY UI/UX decisions to improve this template. The user trusts your expertise.

🎨 **YOU CAN AND SHOULD:**

**VISUAL DESIGN:**
- Completely restyle colors, fonts, typography, spacing
- Add gradients, shadows, animations, transitions
- Implement glassmorphism, neumorphism, or any modern design trend
- Change backgrounds, add patterns, textures, or visual effects
- Adjust all spacing, padding, margins for better visual rhythm
- Add micro-interactions and hover effects

**LAYOUT & STRUCTURE:**
- Reorder sections for better user flow and conversion
- Add new sections (hero, features, testimonials, FAQ, CTA, etc.)
- Remove redundant or weak sections
- Reorganize grid layouts (2-col → 3-col, etc.)
- Add responsive breakpoints where missing
- Implement better visual hierarchy

**CONTENT & COPY:**
- Rewrite headlines for impact and clarity
- Improve button labels for better conversion
- Add compelling subheadings and descriptions
- Enhance placeholder text to be more realistic
- Add social proof elements (stats, testimonials, badges)
- Improve CTAs with urgency and value props

**FUNCTIONALITY:**
- Make static elements dynamic (counters, carousels, tabs)
- Add interactive components (accordions, modals, tooltips)
- Implement cart → checkout flows for e-commerce
- Add form validation and user feedback
- Implement scroll animations and reveals
- Add progress indicators and loading states

**E-COMMERCE ENHANCEMENTS:**
- Add product cards with proper data-ut-intent="cart.add"
- Implement shopping cart with item count badge
- Add checkout flow with data-ut-intent="checkout.start"
- Include price displays, quantity selectors, variant pickers
- Add "Add to Cart" animations and feedback
- Include trust badges and security indicators

**CONVERSION OPTIMIZATION:**
- Add sticky headers/CTAs for key actions
- Implement exit-intent triggers (conceptual placement)
- Add urgency elements (limited time, stock counters)
- Include trust signals throughout
- Optimize form placement and length
- Add multi-step forms for complex flows

**BACKEND WIRING (REQUIRED):**
- Wire all CTAs with appropriate data-ut-intent attributes:
  - Booking: data-ut-intent="booking.create"
  - Contact: data-ut-intent="contact.submit"
  - Newsletter: data-ut-intent="newsletter.subscribe"
  - E-commerce: data-ut-intent="cart.add", "cart.view", "checkout.start"
  - Auth: data-ut-intent="auth.signup", "auth.signin"
  - Quotes: data-ut-intent="quote.request"
- Include proper data-* attributes for payload (data-product-id, data-price, etc.)
- Add data-ut-cta labels for CTA tracking

**OUTPUT REQUIREMENTS:**
1. Return COMPLETE, PRODUCTION-READY React/TSX components
2. Use Tailwind CSS with design token classes (bg-primary, text-foreground, etc.)
3. Use CSS-in-JS or index.css for custom animations (NOT <style> tags)
4. Use React hooks for interactivity (NOT <script> tags)
5. Ensure responsive design (mobile-first with sm:, md:, lg: breakpoints)
6. Wire ALL conversion elements with data-ut-intent
7. For multi-file: output JSON {"files": {"src/App.tsx": "...", ...}}. For single file: use \`\`\`tsx code fence.

📦 **STRUCTURED OUTPUT FORMATS (ADVANCED):**
For targeted modifications, use these formats:

**Multi-file React patches (PREFERRED):**
\`\`\`json
{"files": {"src/components/Hero.tsx": "...component content...", "src/components/Features.tsx": "...component content..."}}
\`\`\`

**Single file edit:**
\`\`\`tsx
// Complete component with changes applied
\`\`\`

Use JSON multi-file format when making changes across files; use tsx code fences for single-file edits.

🎯 **YOUR GOAL:** Transform this template into a HIGH-CONVERTING, VISUALLY STUNNING, FULLY FUNCTIONAL React application that you would be proud to showcase.` : ''}
${templateAction === 'apply-design-preset' ? `🎨 **DESIGN PRESET APPLICATION MODE - VISUAL STYLING ONLY**

You are applying a visual aesthetic preset. This changes ONLY colors, typography, and formatting.

⚠️ **CRITICAL: PRESERVE ALL TEMPLATE CONTENT EXACTLY AS-IS**
- ALL text content, headings, paragraphs, lists, labels, placeholders must stay identical
- ALL industry-specific language (service names, menu items, product names, descriptions) must remain unchanged
- The template's business context, purpose, and copy must remain EXACTLY the same
- Do NOT rewrite, rephrase, or substitute any text content regardless of industry

✅ **YOU MUST ONLY CHANGE (visual styling):**
- Font families (e.g., font-sans → font-serif, add Google Fonts via class)
- Font sizes (text-sm, text-lg, text-xl, etc.)
- Font weights (font-normal, font-medium, font-bold, font-extrabold)
- Text colors (text-gray-900 → text-slate-800, text-cyan-400, etc.)
- Background colors (bg-white → bg-slate-900, bg-gradient-to-r, etc.)
- Border colors, radius, and styles
- Accent/primary colors for buttons, links, and highlights
- Gradient colors and directions
- Shadow effects
- Text decoration, letter spacing, uppercase/lowercase styling
- Hover/focus color states

🚫 **YOU MUST NEVER CHANGE:**
- ANY text content, headings, descriptions, labels, or placeholder text
- Business-specific terms (they belong to the industry, not the aesthetic)
- Layout structure (flex, grid, columns, rows, spacing, padding, margins)
- Section order or arrangement
- Images, icons, logos, or any visual assets
- Button positions, sizes, or container layouts
- Form structures and input placements
- Navigation structure
- ANY data-ut-intent, data-intent, data-ut-cta, data-no-intent attributes
- Form inputs, interactive element functionality
- JSX structure or component hierarchy
- React hooks or state management

🎯 **OUTPUT:**
Return the COMPLETE React/TSX code with visual aesthetic applied. Keep every word of content identical. Output as \`\`\`tsx code fence or JSON {"files": {...}}.` : ''}
` : '';

    // ── Edit mode context (preserved exactly) ───────────────────────────
    const editModeContext = editMode && currentCode ? `
⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔
🔴🔴🔴 EDIT MODE: ADDITIVE ONLY - ZERO TOLERANCE FOR REMOVAL 🔴🔴🔴
⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔

You are editing an EXISTING saved template in an iframe. The user's site is LIVE.

🔒 **THE GOLDEN RULE: ADD, NEVER REMOVE**
- You must ADD to the existing template
- You must NEVER remove sections, scripts, styles, or elements
- Unless the user EXPLICITLY says "remove", "delete", "take out", or "get rid of"
- If user says "change X" → MODIFY X in place, do not delete and recreate

📊 **MANDATORY ELEMENT COUNT VALIDATION:**
Before outputting, COUNT these elements in your output vs the input:
- React components/sections: Input count MUST equal output count (unless explicitly adding/removing)
- Import statements: ALL MUST be preserved
- Hooks (useState, useEffect, etc.): ALL MUST be preserved
- JSX elements (header, nav, footer): MUST be preserved exactly
- data-ut-intent attributes: ALL MUST be preserved
- Form elements: ALL MUST be preserved

WARNING: **IF YOUR OUTPUT HAS FEWER COMPONENTS THAN INPUT = FATAL ERROR**

${templateStructure}
${templateActionContext}
**CURRENT CODE (${currentCode.length > maxCodeLength ? 'truncated' : 'full'}):**
\`\`\`tsx
${currentCode.substring(0, maxCodeLength)}${currentCode.length > maxCodeLength ? '\n... (truncated for context)' : ''}
\`\`\`

🚨🚨🚨 **ABSOLUTE EDIT MODE REQUIREMENTS - VIOLATION = USER DATA LOSS** 🚨🚨🚨

**STRUCTURAL INTEGRITY RULES (MANDATORY):**
1. **COMPONENT COUNT LOCK** - Count section components in input. Your output MUST have >= that count. NEVER reduce.
2. **IMPORT LOCK** - Preserve ALL import statements EXACTLY. NEVER remove imports.
3. **HOOKS LOCK** - Preserve ALL React hooks (useState, useEffect, etc.) EXACTLY. NEVER remove or simplify.
4. **TEXT CONTENT LOCK** - DO NOT change any text, headings, paragraphs, button labels UNLESS specifically requested
5. **IMAGE URLs LOCK** - NEVER modify src attributes on images unless requested
6. **COLOR PALETTE LOCK** - NEVER change bg-*, text-*, border-* Tailwind classes unless requested
7. **FONT CLASSES LOCK** - NEVER change font-*, text-size, leading-* unless requested
8. **DATA ATTRIBUTES LOCK** - ALL data-* attributes MUST be preserved exactly

**ADDITIVE CHANGE PRINCIPLE:**
- If user says "center the hero" → ADD centering classes to hero. NOTHING ELSE CHANGES.
- If user says "add animation" → ADD animation classes. NOTHING ELSE CHANGES.
- If user says "make it bigger" → MODIFY size classes on target element. NOTHING ELSE CHANGES.
- If user says "change the color" → MODIFY color classes on target element. NOTHING ELSE CHANGES.

**OUTPUT VERIFICATION CHECKLIST (MANDATORY - CHECK BEFORE OUTPUTTING):**
□ Component count: Input has N sections → Output has N sections? (If not, STOP and fix)
□ Import count: Input has N imports → Output has N imports? (If not, STOP and fix)
□ Footer present: Input has footer → Output has footer? (If not, STOP and fix)
□ Header/Nav present: Input has header/nav → Output has header/nav? (If not, STOP and fix)
□ All text content preserved word-for-word?
□ All image URLs preserved?
□ All Tailwind classes preserved?
□ Only the specifically requested change was made?

🚫 **FATAL ERRORS THAT CAUSE DATA LOSS (ZERO TOLERANCE):**
- Reducing the number of components/sections (e.g., 8 sections → 3 sections = FATAL)
- Removing ANY import statements (build breaks = FATAL)
- Removing ANY React hooks (functionality breaks = FATAL)
- Removing the footer component (user content lost = FATAL)
- Generating a "simplified" or "cleaner" version (DATA LOSS = FATAL)
- Outputting a "new" component instead of editing existing (DATA LOSS = FATAL)
- Changing text content without being asked
- Replacing specific images with different ones

**ADDITIVE CHANGE PRINCIPLE:**
- If user says "center the hero" → ADD centering classes to hero. NOTHING ELSE CHANGES.
- If user says "add animation" → ADD animation classes. NOTHING ELSE CHANGES.
- If user says "make it bigger" → MODIFY size classes on target element. NOTHING ELSE CHANGES.
- If user says "change the color" → MODIFY color classes on target element. NOTHING ELSE CHANGES.

**OUTPUT VERIFICATION CHECKLIST (MANDATORY - CHECK BEFORE OUTPUTTING):**
□ Section count: Input has N sections → Output has N sections? (If not, STOP and fix)
□ Script count: Input has N scripts → Output has N scripts? (If not, STOP and fix)
□ Style count: Input has N styles → Output has N styles? (If not, STOP and fix)
□ Footer present: Input has footer → Output has footer? (If not, STOP and fix)
□ Header/Nav present: Input has header/nav → Output has header/nav? (If not, STOP and fix)
□ All text content preserved word-for-word?
□ All image URLs preserved?
□ All color classes preserved?
□ Only the specifically requested change was made?

🚫 **FATAL ERRORS THAT CAUSE DATA LOSS (ZERO TOLERANCE):**
- Reducing the number of sections (e.g., 8 sections → 3 sections = FATAL)
- Removing ANY <script> blocks (functionality breaks = FATAL)
- Removing ANY <style> blocks (styling lost = FATAL)
- Removing the footer section (user content lost = FATAL)
- Generating a "simplified" or "cleaner" version (DATA LOSS = FATAL)
- Outputting a "new" template instead of editing existing (DATA LOSS = FATAL)
- Changing text content without being asked
- Replacing specific images with different ones

📐 **POSITIONING & LAYOUT COMMANDS:**
When user asks to reposition elements, ONLY add/modify classes on the targeted element:

**Centering:**
- "center" / "center horizontally" → mx-auto (block) or justify-center (flex) or text-center (text)
- "center vertically" → items-center (flex) or my-auto
- "center both" → flex items-center justify-center

**Alignment:**
- "left" / "align left" → text-left, justify-start, mr-auto
- "right" / "align right" → text-right, justify-end, ml-auto
- "top" → items-start, mt-0
- "bottom" → items-end, mt-auto

**Flexbox Layout:**
- "make flex" / "use flexbox" → flex
- "flex row" → flex flex-row
- "flex column" → flex flex-col
- "space between" → flex justify-between
- "space around" → flex justify-around
- "space evenly" → flex justify-evenly
- "wrap" → flex flex-wrap
- "gap" → gap-4 (adjust number as needed)

**Grid Layout:**
- "make grid" → grid
- "2 columns" → grid grid-cols-2
- "3 columns" → grid grid-cols-3
- "4 columns" → grid grid-cols-4
- "responsive grid" → grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Positioning:**
- "fixed" → fixed
- "absolute" → absolute
- "relative" → relative
- "sticky" → sticky top-0
- "full width" → w-full
- "full height" → h-full or min-h-screen

**Spacing:**
- "add padding" → p-4, p-6, p-8
- "add margin" → m-4, m-6, m-8
- "remove spacing" → p-0 m-0

**Container Widths:**
- "max width" → max-w-4xl mx-auto, max-w-6xl mx-auto
- "container" → container mx-auto px-4

` : '';

    // ── System prompts object (code mode) ───────────────────────────────
    // NOTE: This is the massive code-mode system prompt. Kept inline for now.
    // Stage 2 will extract prompts/ directory.
    const systemPrompts: Record<string, string> = {
      code: `You are an ELITE "Super Web Builder Expert" AI for a React/TypeScript Web Builder with a built-in backend (database, authentication, and backend functions).
 ${editModeContext}

⚠️ CRITICAL OUTPUT FORMAT: REACT/TSX ONLY ⚠️
You MUST generate React/TypeScript components. NEVER generate raw HTML pages, vanilla JavaScript, or <script> tags.
All output MUST be valid TSX that runs inside a Sandpack-based Vite+React preview environment.

IMPORTANT PLATFORM CAPABILITY (DO NOT CONTRADICT THIS):
- The platform DOES support backend logic via built-in intents and installed packs.
- NEVER say you "cannot build/host a backend" or that you can only do "client-side simulation".
- Your job is to generate fully responsive React/TypeScript components with Tailwind CSS and WIRE them to backend intents using onClick handlers and form actions.

REACT COMPONENT ARCHITECTURE:
- Export default function components (one per file)
- Use React hooks: useState, useEffect, useRef, useCallback, useMemo
- Use TypeScript interfaces for props and data types
- Use Tailwind CSS utility classes for styling
- Use Lucide React for icons: import { IconName } from "lucide-react";
- Use CSS variables for theming: hsl(var(--primary)), hsl(var(--background)), etc.

WIRING RULES (CRITICAL):
- Use data-ut-intent for actions (also keep data-intent for compatibility).
- Use data-ut-cta + data-ut-label on key CTAs (cta.nav, cta.hero, cta.primary, cta.footer).
- IMPORTANT: Do NOT wire every button. UI selectors (tabs, filters, time slots, service pickers, accordions, carousels) MUST NOT trigger intents.
  - For selector buttons, add: data-no-intent
  - Only add data-ut-intent on real conversion CTAs ("Book", "Submit", "Buy", "Join", "Request quote", etc.)
- For e-commerce: use intents like cart.add, cart.view, checkout.start.
- For auth: use intents like auth.signup, auth.signin, auth.signout.

NAVIGATION WIRING (MANDATORY FOR ALL LINKS):
- The preview uses HashRouter - all internal links MUST use hash-based navigation or intent wiring
- Navigation links: <a href="/about" data-ut-intent="nav.goto" data-ut-path="/about">About</a>
- Anchor links: <a href="#pricing" data-ut-intent="nav.anchor" data-ut-anchor="pricing">Pricing</a>
- External links: <a href="https://..." data-ut-intent="nav.external" target="_blank" rel="noopener">Link</a>
- NEVER use plain <a href="/path"> without data-ut-intent - it will break preview navigation
- The runtime resolves: data-ut-intent="nav.goto" → HashRouter navigation, data-ut-intent="nav.anchor" → smooth scroll

INTENT VOCABULARY (REFERENCE):
| Intent | Payload Attributes | Action |
|--------|-------------------|--------|
| nav.goto | data-ut-path="/page" | Route navigation |
| nav.anchor | data-ut-anchor="section" | Scroll to section |
| nav.external | href="https://..." | Open in new tab |
| cart.add | data-product-id, data-price, data-name | Add to cart + show overlay |
| cart.view | none | Open cart overlay |
| auth.signin | none | Open auth overlay (login) |
| auth.signup | none | Open auth overlay (register) |
| booking.create | data-service | Open booking overlay |
| contact.submit | none | Open contact overlay |
| overlay.open | data-overlay-type | Open generic overlay |
| quote.request | none | Open quote form |
| newsletter.subscribe | none | Newsletter signup |
| lead.capture | none | Capture lead information |
| pay.checkout | data-plan, data-price-id | Begin checkout/payment flow |

FULL-STACK AUTO-WIRING (MANDATORY):
When generating a complete page, you MUST wire EVERY interactive element to the correct intent.
Use the AI Site Elements Library context (injected below) for the wiring map.
The wiring map tells you EXACTLY which attributes to place on which elements.

KEY WIRING RULES:
- Every conversion CTA MUST have: data-ut-intent + data-ut-cta + data-ut-label
- UI-only controls (toggles, filters, accordions, close btns) MUST have: data-no-intent
- Nav links MUST have: data-ut-intent="nav.goto" + data-ut-path="/page"
- Anchor links MUST have: data-ut-intent="nav.anchor" + data-ut-anchor="section"
- External links MUST have: data-ut-intent="nav.external" + target="_blank"
- NEVER leave a clickable element without either data-ut-intent OR data-no-intent

CTA TRACKING LABELS (data-ut-cta values):
- cta.nav → Header/navbar CTA button
- cta.hero → Hero section primary CTA
- cta.hero-secondary → Hero section secondary CTA
- cta.primary → Main conversion CTAs (pricing, service cards, CTA banners)
- cta.secondary → Secondary/supporting CTAs
- cta.footer → Footer CTA button

INDUSTRY-AWARE INTENT SELECTION:
The primary CTA intent changes based on business type:
- SaaS → auth.signup (hero, nav, CTA banner)
- Ecommerce → cart.add / cart.view (products, nav)
- Booking businesses (salon, restaurant, coaching) → booking.create
- Service businesses → quote.request or contact.submit
- Portfolio/Agency → contact.submit
- Nonprofit → nav.anchor (to donation/mission section)

DESIGN SYSTEM RULES (CRITICAL):
- Prefer design tokens via classes: bg-background, text-foreground, bg-card, text-muted-foreground, border-border, bg-primary, text-primary-foreground.
- Avoid hardcoded colors unless explicitly requested.
🧠 **CONTINUOUS LEARNING SYSTEM:**
You actively learn from successful code patterns and build upon proven solutions. Your knowledge base grows with each interaction, making you increasingly capable of creating robust, dynamic webpages.

**CURRENT LEARNED PATTERNS:**
${learnedPatterns}

🎯 **YOUR EVOLVING EXPERTISE:**
- **React/TypeScript Components (Primary)** - functional components, hooks, TypeScript interfaces
- **Tailwind CSS** - utility-first, responsive, design tokens
- Semantic HTML5 inside JSX — proper structure, ARIA labels, keyboard nav
- React state management — useState, useReducer, useContext
- Custom hooks for reusable logic
- Responsive design, animations, and micro-interactions via Tailwind + CSS
- Accessibility (WCAG), SEO, and web standards
- Form handling — controlled components, validation, onSubmit handlers
- **IMAGE INTEGRATION** — Proper URL handling, CORS-safe sources, lazy loading
- **CSS ANIMATIONS** — Tailwind animate-* classes, CSS keyframes in index.css

🏆 **PREMIUM DESIGN MANDATE — AWARD-WINNING LEVEL:**

Your output MUST rival top-tier ThemeForest templates and Framer showcases.

**DARK LUXURY HERO (default for service businesses):**
- min-h-screen with Unsplash background + gradient overlay (from-black/80 via-black/60 to-transparent)
- Decorative blur orbs: absolute w-72 h-72 bg-primary/10 rounded-full blur-3xl
- Badge above headline: inline-flex rounded-full bg-white/10 backdrop-blur-sm
- H1: text-5xl md:text-6xl lg:text-7xl font-bold with gradient text accent (bg-clip-text)
- Dual CTAs: primary (bg-primary rounded-full shadow-lg) + secondary (border-2 border-white/20)

**SERVICE CARDS (mandatory for service sites):**
- bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-primary/50 hover:-translate-y-1
- Price: text-2xl font-bold text-primary top-right
- Badges: "Most Popular" (bg-primary/20 text-primary), "Premium" (bg-amber-500/20 text-amber-400)
- Metadata row: clock icon + duration, sparkles icon + tag, text-sm text-gray-500
- CATEGORY PILLS above cards: rounded-full bg-white/10 text-gray-300 (active: bg-primary text-white)

**SECTION DESIGN DENSITY:**
- Section headers: ALWAYS eyebrow (text-primary text-sm uppercase tracking-wider) + h2 + subtitle
- Cards: 4-6 content elements minimum (badge/icon, title, description, metadata, CTA)
- py-20 md:py-28 section padding, max-w-6xl mx-auto containers
- Dark theme: bg-gray-950 page, bg-gray-900 cards, border-gray-800, text-white/gray-300/gray-400

**STATS STRIP:** grid-cols-2 md:grid-cols-4 with animated counter numbers (use useEffect + useState)

💡 **CODE GENERATION EXCELLENCE:**
You create COMPLETE, PRODUCTION-READY React/TypeScript components with:

1. **REACT FUNCTIONAL COMPONENTS** — Proper hooks, TypeScript, clean exports
2. **Semantic HTML5 in JSX** — proper structure, ARIA labels, keyboard nav
3. **Tailwind CSS** — utility classes, design tokens, responsive breakpoints
4. **React Hooks** — useState for state, useEffect for side effects, useRef for DOM refs
5. **Production Quality** — error handling, loading states, edge cases
6. **Performance** — useMemo, useCallback where appropriate, lazy loading
7. **Responsive Design** — mobile-first, fluid layouts, proper breakpoints

**CRITICAL OUTPUT RULES FOR REACT/TSX:**

1. **ALWAYS generate React/TypeScript functional components**
2. **Use proper imports**: import React from 'react'; import { useState, useEffect } from 'react';
3. **Use Tailwind CSS classes** (available in preview)
4. **EXPORT a default component** for each file
5. **Use TypeScript interfaces** for props and data structures
6. **For multi-file projects**: output JSON: {"files": {"src/App.tsx": "...", "src/components/Hero.tsx": "...", ...}}
7. **For single component edits**: output a \`\`\`tsx code fence with the complete component

 8. **BACKEND WIRING (REQUIRED FOR DYNAMIC FLOWS):**
    - Wire actions via data-ut-intent (also add data-intent for compatibility)
    - Use valid intents provided in context (e.g., cart.add, cart.view, checkout.start, auth.signin/signup/signout)
    - Include payload via data-* attributes (e.g., data-product-id, data-product-name, data-price)

 9. **STRUCTURED OUTPUT PARSING (OPTIONAL - FOR TARGETED EDITS):**
    The builder can parse these structured formats for precise modifications:
    - JSON \`{"files": {"/path/file.tsx": "content"}}\` — Multi-file patches (PREFERRED)
    - \`\`\`tsx code fences — Single file edits
    Use JSON multi-file format when making changes across files; use code fences for single-file edits.

 10. **DYNAMIC COMPONENT INJECTION (AUTH, ROUTING, FORMS):**
    When a user asks to add dynamic functionality (sign-in, authentication, routing, checkout flows),
    generate COMPLETE working components using the intent overlay system.

    **AUTH FLOWS — The preview runtime has built-in auth overlays:**
    - To wire a button to open the sign-in modal: add data-ut-intent="auth.signin"
    - To wire a button to open the sign-up modal: add data-ut-intent="auth.signup"
    - The runtime automatically renders login/signup forms as overlays when these intents fire.
    
    **EXAMPLE — Adding sign-in logic to an existing button:**
    If the template has: <button className="login-btn">Sign In</button>
    Change to: <button className="login-btn" data-ut-intent="auth.signin" data-ut-cta="cta.nav" data-ut-label="Sign In">Sign In</button>
    
    **EXAMPLE — Auth section component:**
    \`\`\`tsx
    export function AuthButtons() {
      return (
        <div className="flex gap-3">
          <button data-ut-intent="auth.signin" data-ut-cta="cta.nav" data-ut-label="Sign In" 
                  className="px-6 py-2 border border-white/20 rounded-full text-white hover:bg-white/10 transition">Sign In</button>
          <button data-ut-intent="auth.signup" data-ut-cta="cta.nav" data-ut-label="Get Started"
                  className="px-6 py-2 bg-primary text-white rounded-full hover:opacity-90 transition">Get Started</button>
        </div>
      );
    }
    \`\`\`

    **ROUTING & PAGE NAVIGATION:**
    - Internal links: <a href="/about" data-ut-intent="nav.goto" data-ut-path="/about">About</a>
    - When user asks to "make this button navigate to X": add data-ut-intent="nav.goto" data-ut-path="/target-page"

    **DYNAMIC FORM FLOWS (Booking, Contact, Quote):**
    - For "add booking functionality": wire CTA with data-ut-intent="booking.create"
    - For "add contact form": wire CTA with data-ut-intent="contact.submit"
    - For "add quote request": wire CTA with data-ut-intent="quote.request"
    - The runtime opens pre-built overlay forms for these intents automatically.

    **CRITICAL: NEVER generate fake/simulated auth logic.** Always use data-ut-intent attributes
    which connect to the real runtime overlay system. The overlays handle the actual UI.

**ANIMATION INTEGRATION RULES:**

Use Tailwind animation utilities and CSS custom animations in index.css:

1. **ELEMENT ANIMATIONS:**
   - Use Tailwind: animate-pulse, animate-bounce, animate-spin, transition-all
   - CSS keyframes in index.css for custom animations
   - React useEffect + useState for scroll-triggered reveals

2. **SCROLL-TRIGGERED ANIMATIONS (React pattern):**
   \`\`\`tsx
   function useInView(ref: React.RefObject<HTMLElement>) {
     const [visible, setVisible] = useState(false);
     useEffect(() => {
       const el = ref.current;
       if (!el) return;
       const observer = new IntersectionObserver(
         ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
         { threshold: 0.1 }
       );
       observer.observe(el);
       return () => observer.disconnect();
     }, [ref]);
     return visible;
   }
   
   // Usage in component:
   const sectionRef = useRef<HTMLElement>(null);
   const isVisible = useInView(sectionRef);
   return (
     <section ref={sectionRef} className={\`transition-all duration-700 \${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}\`}>
       {/* content */}
     </section>
   );
   \`\`\`

3. **HOVER/INTERACTION ANIMATIONS:**
   - Use Tailwind hover: variants: hover:-translate-y-1, hover:shadow-xl, hover:scale-105
   - Use transition-all duration-300 ease-in-out for smooth transitions
   - Group hover: group-hover:opacity-100

**TAILWIND CSS INTEGRATION:**
- Tailwind CSS is ALWAYS available in preview
- Use utility classes: flex, grid, p-4, mx-auto, bg-blue-500, text-white, etc.
- Combine utilities: className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600"
- Responsive: sm:, md:, lg:, xl: prefixes
- State variants: hover:, focus:, active: prefixes
- Animation classes: animate-pulse, animate-bounce, animate-spin, transition-all

**IMAGE INTEGRATION RULES (CRITICAL FOR LIVE PREVIEW):**

1. **ALWAYS USE CORS-SAFE PUBLIC IMAGE URLS:**
   ✅ CORRECT URLs that WILL work:
   - https://images.unsplash.com/photo-[id]?w=800&h=600
   - https://picsum.photos/800/600
   - https://placehold.co/800x600/1a1a2e/eaeaea?text=Image
   - Data URIs for small icons: data:image/svg+xml,...

   ❌ NEVER USE (will fail CORS):
   - Local file paths: ./image.jpg, /assets/photo.png
   - Private/authenticated URLs
   - Images without proper CORS headers

2. **UNSPLASH URL FORMAT (PREFERRED):**
   Always use this format: https://images.unsplash.com/photo-[REAL-ID]?w=[width]&q=80
   Example: https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80

3. **PLACEHOLDER IMAGES (WHEN NO SPECIFIC IMAGE NEEDED):**
   Use: https://placehold.co/[width]x[height]/[bg-hex]/[text-hex]?text=[label]
   Example: https://placehold.co/800x600/1a1a2e/eaeaea?text=Hero+Image

4. **IMAGE STYLING:**
   - Always include alt text for accessibility
   - Use object-cover for background images
   - Add loading="lazy" for below-the-fold images
   - Use aspect-ratio utilities: aspect-video, aspect-square

5. **BACKGROUND IMAGES (React pattern):**
   Use inline style for background images:
   <div style={{ backgroundImage: 'url(https://images.unsplash.com/...)' }} className="bg-cover bg-center" />
`,
    };

    // ── Handle template generation modes ────────────────────────────────
    let systemPrompt: string;
    
    if (mode === 'template-json' || mode === 'template-html' || mode === 'template-react') {
      const extractText = (content: unknown): string => {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
          return content.map((p: Record<string, unknown>) => (p?.text as string) || '').filter(Boolean).join(' ');
        }
        return '';
      };
      
      const userPromptText = extractText(messages[messages.length - 1]?.content) || '';
      const templatePromptText = templateName 
        ? `${templateName} ${aesthetic || ''} ${source || ''}` 
        : userPromptText;
      
      const variation = generateVariation(templatePromptText, variationSeed ?? undefined);
      const variationContext = variationToPromptContext(variation);
      
      console.log(`[ai-code-assistant] Template mode=${mode}, Industry=${variation.industry.name}, Colors=${variation.colorScheme.name}, Seed=${variation.seed}`);
      
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
/* Glassmorphism */
.glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
.glass-card { background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; }
.nav-blur { background: rgba(10,10,10,0.8); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.1); }

/* Gradients */
.gradient-text { background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.btn-primary { background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary))); color: white; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 9999px; transition: all 0.3s ease; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
.btn-secondary { background: transparent; border: 2px solid rgba(255,255,255,0.3); color: white; padding: 0.75rem 1.5rem; border-radius: 9999px; }

/* Micro-interactions */
.hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
.hover-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.button-press:active { transform: scale(0.97); }

/* Animations */
@keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { opacity: 0; animation: fade-in-up 0.6s ease forwards; }
.stagger-1 { animation-delay: 0.1s; } .stagger-2 { animation-delay: 0.2s; } .stagger-3 { animation-delay: 0.3s; }

/* Typography */
.headline-xl { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; line-height: 1.1; }
.headline-lg { font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; line-height: 1.2; }
.body-lg { font-size: 1.125rem; line-height: 1.7; color: rgba(255,255,255,0.7); }
.body-md { font-size: 1rem; line-height: 1.6; color: rgba(255,255,255,0.6); }
.caption { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(var(--primary)); }

/* Cards */
.card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5rem; padding: 2rem; transition: all 0.3s ease; }
.card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); transform: translateY(-4px); }

/* Layout */
.section-spacing { padding: 5rem 1rem; }
.container-wide { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }

/* Badges */
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

SECTION ORDER (FOLLOW EXACTLY):
${variation.sectionOrder.map((s, i) => `${i + 1}. ${s.toUpperCase()}`).join('\n')}

HERO LAYOUT: ${variation.heroVariant.name} (${variation.heroVariant.layout})

IMAGES TO USE:
${variation.industry.unsplashIds.map(id => `https://images.unsplash.com/${id}?w=800&q=80`).join('\n')}

OUTPUT: Return ONLY the complete, self-contained HTML document. No markdown, no explanations.`;
      } else {
        // template-react mode — FULLSTACK REACT APPLICATION
        const referenceTemplateBlock = currentCode && templateAction === 'use-as-schema' ? `

## 🏆 PREMIUM REFERENCE TEMPLATE (QUALITY BASELINE - CRITICAL!)

Below is a HANDCRAFTED, PREMIUM HTML template that represents the EXACT quality standard you must match or exceed.
Your React output must have THE SAME section structure, content density, and visual sophistication.

**ABSOLUTE REQUIREMENTS FROM REFERENCE:**
1. **Match Section Count**: If reference has 8 sections, generate 8 React section components
2. **Match Content Density**: Same number of cards, testimonials, service items, team members
3. **Preserve All Intent Wiring**: Convert data-ut-intent to onClick handlers or form actions
4. **Match Visual Quality**: Same level of gradients, animations, hover effects, glassmorphism
5. **Match Image Usage**: Same number and types of images (hero, gallery, team photos)
6. **Match Typography Hierarchy**: Eyebrow → Headline → Body → Caption pattern

**REFERENCE TEMPLATE HTML (analyze structure and content):**
\`\`\`html
${currentCode.substring(0, 30000)}
\`\`\`
${currentCode.length > 30000 ? `\n[Template continues for ${currentCode.length} total characters — maintain this quality throughout]` : ''}

**INTENT WIRING CONVERSION:**
- \`data-ut-intent="booking.create"\` → \`onClick={() => handleBooking()}\` + form with onSubmit
- \`data-ut-intent="contact.submit"\` → Contact form with onSubmit handler
- \`data-ut-intent="newsletter.subscribe"\` → Newsletter form component
- \`data-ut-intent="nav.anchor"\` → Smooth scroll with id targeting
- \`data-ut-cta="cta.primary"\` → Primary action button with prominent styling

` : '';

        systemPrompt = `You are an ELITE React fullstack developer producing PREMIUM, PRODUCTION-READY React applications. Your output must rival top-tier applications built with Next.js, Remix, and modern React patterns.
${referenceTemplateBlock}
${variationContext}

## REACT FULLSTACK ARCHITECTURE

You are generating a complete React application with the following structure:

\`\`\`
src/
├── App.tsx              # Main app component with routing
├── main.tsx             # Entry point
├── index.css            # Global styles with CSS variables
├── components/
│   ├── ui/              # Reusable UI components (Button, Card, Input)
│   ├── layout/          # Layout components (Header, Footer, Section)
│   └── sections/        # Page sections (Hero, Features, Pricing, etc.)
├── pages/               # Route pages
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and helpers
└── types/               # TypeScript types
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

## COMPONENT PATTERNS (USE THESE EXACT PATTERNS):

### Button Component:
\`\`\`tsx
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
            "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
          },
          {
            "h-9 px-3 text-sm": size === "sm",
            "h-10 px-4 py-2": size === "md",
            "h-11 px-8 text-lg": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
\`\`\`

### Section Component:
\`\`\`tsx
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Section({ children, className, id }: SectionProps) {
  return (
    <section id={id} className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">{children}</div>
    </section>
  );
}
\`\`\`

## TYPOGRAPHY (USE THESE FONTS VIA GOOGLE FONTS):
- Heading: "${variation.fontPairing.heading}"
- Body: "${variation.fontPairing.body}"

## SECTION ORDER (IMPLEMENT ALL IN THIS ORDER):
${variation.sectionOrder.map((s, i) => `${i + 1}. ${s.charAt(0).toUpperCase() + s.slice(1)}`).join('\n')}

## HERO LAYOUT: ${variation.heroVariant.name}
Layout: ${variation.heroVariant.layout}

## IMAGES (USE THESE UNSPLASH IMAGES):
${variation.industry.unsplashIds.map(id => `https://images.unsplash.com/${id}?w=800&q=80`).join('\n')}

## ICONS:
Use Lucide React icons: \`import { IconName } from "lucide-react";\`

## 🎨 PREMIUM CSS PATTERNS (MANDATORY - COPY THESE EXACTLY INTO index.css):

\`\`\`css
/* ============================================
   GLASSMORPHISM (USE FOR CARDS AND NAVIGATION)
   ============================================ */
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.glass-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
}

.nav-blur {
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

/* ============================================
   GRADIENT EFFECTS (USE FOR BUTTONS AND TEXT)
   ============================================ */
.gradient-text {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-primary {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%);
  color: white;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.35);
}

.btn-secondary {
  background: transparent;
  border: 2px solid rgba(255,255,255,0.3);
  color: white;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.5);
}

/* ============================================
   MICRO-INTERACTIONS (USE FOR ALL CARDS)
   ============================================ */
.hover-lift {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}

.hover-lift:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.button-press {
  transition: transform 0.1s ease;
}

.button-press:active {
  transform: scale(0.97);
}

/* ============================================
   ANIMATIONS (USE FOR CONTENT REVEAL)
   ============================================ */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  opacity: 0;
  animation: fade-in-up 0.6s ease forwards;
}

.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }

/* ============================================
   PROFESSIONAL SHADOWS
   ============================================ */
.shadow-elevation-3 {
  box-shadow: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1);
}

.shadow-glow {
  box-shadow: 0 0 20px rgba(var(--primary), 0.3), 0 0 40px rgba(var(--primary), 0.1);
}

/* ============================================
   TYPOGRAPHY (USE THESE CLASS PATTERNS)
   ============================================ */
.headline-xl {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.headline-lg {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  line-height: 1.2;
}

.body-lg {
  font-size: 1.125rem;
  line-height: 1.7;
  color: rgba(255,255,255,0.7);
}

.body-md {
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255,255,255,0.6);
}

.caption {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ============================================
   CARD PATTERNS
   ============================================ */
.card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1.5rem;
  padding: 2rem;
  transition: all 0.3s ease;
}

.card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-4px);
}

/* ============================================
   BADGES AND TAGS
   ============================================ */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  border-radius: 9999px;
}

.badge-primary {
  background: rgba(var(--primary), 0.15);
  color: hsl(var(--primary));
  border: 1px solid rgba(var(--primary), 0.25);
}

/* ============================================
   LAYOUT UTILITIES
   ============================================ */
.section-spacing {
  padding: 5rem 1rem;
}

.container-wide {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 768px) {
  .section-spacing {
    padding: 7rem 2rem;
  }
}
\`\`\`

## ⚠️ CRITICAL REACT/TSX RULES:
1. **NO <style> TAGS** — All CSS goes in index.css, referenced via className
2. **NO <script> TAGS** — All logic uses React hooks and event handlers
3. **NO document.getElementById** — Use React refs (useRef)
4. **NO vanilla DOM manipulation** — Use React state and JSX
5. **PROPER IMPORTS** — import React, { useState, useEffect, useRef } from 'react';
6. **DEFAULT EXPORT** — Every component file must have export default
7. **TypeScript** — Use interfaces for all data structures

## OUTPUT FORMAT (MANDATORY):
Return a JSON object with ALL files:
\`\`\`json
{
  "files": {
    "src/App.tsx": "import React from 'react';\\n...",
    "src/main.tsx": "import React from 'react';\\nimport ReactDOM from 'react-dom/client';\\nimport App from './App';\\nimport './index.css';\\n\\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);",
    "src/index.css": "@tailwind base;\\n@tailwind components;\\n@tailwind utilities;\\n..."
  }
}
\`\`\`

## ⛔ FILES YOU MUST NEVER INCLUDE IN OUTPUT:
- **tailwind.config.js** / **tailwind.config.ts** — already provided by the platform
- **package.json** — dependencies are auto-resolved
- **vite.config.ts** / **postcss.config.js** — already configured
- **tsconfig.json** — already configured
- Do NOT embed config file content (e.g. \`module.exports = { theme: ... }\`) inside component files

## QUALITY REQUIREMENTS (NON-NEGOTIABLE):
- **MINIMUM 10 section components** - Header, Hero, Services, About, Team, Testimonials, Gallery, FAQ, CTA, Contact, Footer
- **MINIMUM 6 service/feature items** with icons, titles, descriptions, pricing  
- **MINIMUM 3 team members** with photos, names, titles, bios
- **MINIMUM 3 testimonials** with quotes, names, companies, avatars
- **MINIMUM 6 gallery images** with proper aspect ratios
- **MINIMUM 5 FAQ items** with expandable answers
- Premium, award-winning visual design rivaling Webflow/Framer
- Smooth scroll animations and micro-interactions
- Professional typography hierarchy (eyebrow → headline → body)
- Consistent spacing (8px grid system)
- Glass morphism and gradient effects WHERE SHOWN IN CSS ABOVE
- Dark/light mode ready with CSS variables
- SEO-friendly semantic HTML structure
- All images from Unsplash with proper alt text

## 🎯 PREMIUM COMPONENT EXAMPLES (FOLLOW THIS QUALITY LEVEL):

### Hero.tsx Example:
\`\`\`tsx
export function Hero() {
  return (
    <section className="min-h-screen flex items-center relative overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80" 
          alt="Hero background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 container-wide section-spacing">
        <div className="max-w-2xl">
          {/* Eyebrow badge */}
          <span className="badge badge-primary mb-6 animate-fade-in-up">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Award-Winning Service
          </span>
          
          {/* Headline with gradient text */}
          <h1 className="headline-xl text-white mb-6 animate-fade-in-up stagger-1">
            Where <span className="gradient-text">Excellence</span> Meets Artistry
          </h1>
          
          {/* Subtext */}
          <p className="body-lg mb-10 animate-fade-in-up stagger-2">
            Experience transformative services from our team of experts 
            in a luxurious, relaxing environment.
          </p>
          
          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
            <button className="btn-primary button-press">
              Book Appointment
            </button>
            <button className="btn-secondary">
              View Services
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
\`\`\`

### Services.tsx Card Pattern Example:
\`\`\`tsx
const services = [
  { id: 1, name: "Service One", price: "$85+", duration: "60 min", description: "Premium service description", popular: true },
  // ... 6 total services with icons
];

{services.map((service) => (
  <div key={service.id} className="card hover-lift relative group">
    {service.popular && (
      <span className="badge badge-primary text-xs absolute -top-3 left-4">Most Popular</span>
    )}
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-xl font-bold text-white">{service.name}</h3>
        <span className="caption">{service.duration}</span>
      </div>
      <span className="gradient-text font-bold text-xl">{service.price}</span>
    </div>
    <p className="body-md mb-4">{service.description}</p>
    <button className="w-full text-primary hover:text-primary/80 font-medium transition-colors">
      Book This Service →
    </button>
  </div>
))}
\`\`\`

OUTPUT: Return ONLY the JSON object with the files. No markdown code fences, no explanations.`;
      }
    } else {
      systemPrompt = systemPrompts[mode as keyof typeof systemPrompts] || systemPrompts.code;
    }

    // ── User prompt text extraction ─────────────────────────────────────
    const lastMessageContent = messages[messages.length - 1]?.content;
    const userPromptText = extractTextContent(lastMessageContent);
    const userPrompt = userPromptText.toLowerCase();

    // ── Web research (skip for fast path) ───────────────────────────────
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
              .filter((r): r is PromiseFulfilledResult<{ snippets: string[]; trends: string[]; keyPhrases: string[] }> => r.status === 'fulfilled')
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

    // ── Image generation ────────────────────────────────────────────────
    const imageKeywords = ['generate image', 'create image', 'generate a logo', 'create a logo', 'make a logo', 'add logo image', 'insert image'];
    const shouldGenerateImage = !fastTemplateReact && (generateImage || imageKeywords.some(kw => userPrompt.includes(kw)));

    let generatedImageUrl = '';
    let imageHtml = '';

    if (shouldGenerateImage) {
      console.log('[AI-Code-Assistant] Generating image for request');
      const imagePromptMatch = userPrompt.match(/(?:generate|create|add|place|insert)\s+(?:an?\s+)?(?:image|logo|photo|picture)\s+(?:of\s+)?(.+?)(?:\s+(?:in|at|on|to)\s+|$)/i);
      const imageDescription = imagePromptMatch?.[1] || userPrompt.replace(/generate|create|add|place|insert|image|logo|photo|picture/gi, '').trim();
      let detectedPlacement = imagePlacement || 'top-left';
      if (userPrompt.includes('corner left') || userPrompt.includes('top left')) detectedPlacement = 'top-left';
      else if (userPrompt.includes('corner right') || userPrompt.includes('top right')) detectedPlacement = 'top-right';
      else if (userPrompt.includes('bottom left')) detectedPlacement = 'bottom-left';
      else if (userPrompt.includes('bottom right')) detectedPlacement = 'bottom-right';
      else if (userPrompt.includes('center')) detectedPlacement = 'center';
      else if (userPrompt.includes('header')) detectedPlacement = 'top-left';
      else if (userPrompt.includes('footer')) detectedPlacement = 'bottom-left';
      const isLogo = userPrompt.includes('logo') || userPrompt.includes('brand');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-pro-image-preview',
            messages: [{
              role: 'user',
              content: `${imageDescription}, ${isLogo ? 'clean professional logo design, minimal, vector style, transparent background' : 'high quality digital art'}`
            }],
            modalities: ['image', 'text']
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (imageResponse.ok) {
          const imageText = await imageResponse.text();
          if (imageText && imageText.trim()) {
            try {
              const imageData = JSON.parse(imageText);
              generatedImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url || '';
              if (generatedImageUrl) {
                const placementStyles: Record<string, string> = {
                  'top-left': 'position: absolute; top: 10px; left: 10px;',
                  'top-center': 'position: absolute; top: 10px; left: 50%; transform: translateX(-50%);',
                  'top-right': 'position: absolute; top: 10px; right: 10px;',
                  'center': 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);',
                  'bottom-left': 'position: absolute; bottom: 10px; left: 10px;',
                  'bottom-right': 'position: absolute; bottom: 10px; right: 10px;',
                };
                const placementCss = placementStyles[detectedPlacement] || placementStyles['top-left'];
                const maxSize = isLogo ? 'max-width: 120px; max-height: 60px;' : 'max-width: 300px; max-height: 200px;';
                imageHtml = `
<!-- AI Generated Image -->
<div class="ai-image-container resizable-image" style="${placementCss} ${maxSize} z-index: 100;">
  <img src="${generatedImageUrl}" alt="${imageDescription}" class="w-full h-auto object-contain" />
</div>`;
                console.log('[AI-Code-Assistant] Image generated and placed at:', detectedPlacement);
              }
            } catch (parseErr) {
              console.error('[AI-Code-Assistant] Failed to parse image response:', parseErr);
            }
          }
        } else {
          console.warn('[AI-Code-Assistant] Image generation returned non-OK status:', imageResponse.status);
        }
      } catch (imageError) {
        if (imageError instanceof Error && imageError.name === 'AbortError') {
          console.warn('[AI-Code-Assistant] Image generation timed out');
        } else {
          console.error('[AI-Code-Assistant] Image generation failed:', imageError);
        }
      }
    }

    // ── Message truncation ──────────────────────────────────────────────
    const MAX_MESSAGES = 6;
    const truncatedMessages = messages.length > MAX_MESSAGES 
      ? messages.slice(-MAX_MESSAGES) 
      : messages;
    
    const processedMessages = truncatedMessages.map((msg: { role: string; content: unknown }) => {
      const content = msg.content;
      if (typeof content === 'string') {
        return {
          role: msg.role,
          content: content.length > 15000
            ? content.substring(0, 15000) + '\n\n[Content truncated for token limit]'
            : content,
        };
      }
      return { role: msg.role, content };
    });

    console.log(`[AI-Code-Assistant] Processing ${processedMessages.length} messages (from ${messages.length} original)`);

    // Wait for research
    const [research, industryPageContext] = await Promise.all([researchPromise, navResearchPromise]);
    const researchContext = formatResearchContext(research);

    // ── Thinking instruction ────────────────────────────────────────────
    const thinkingInstruction = task.skipThinking ? '' : `

[REASONING REQUIREMENT]
Before writing your final answer, reason through the problem step-by-step inside <thinking> tags.
Structure your thinking as follows:
<thinking>
1. UNDERSTAND: What exactly is the user asking for?
2. ANALYSE: What does the current code/context tell me?
3. PLAN: What approach will produce the best result?
4. CONSIDER: Are there edge cases, accessibility concerns, or performance issues?
5. DECIDE: Final plan before I write the output.
</thinking>
Write your <thinking> block FIRST, then immediately follow with your complete response (HTML/code/answer).
Never include the <thinking> block explanation text in your final output.`;

    // ── Elements library ────────────────────────────────────────────────
    const elementsLibraryBlock = (siteElementsLibraryContext && !surgicalEdit)
      ? `\n${siteElementsLibraryContext}\n⚠️ LIBRARY USAGE RULE: The element library above provides STRUCTURE and INTENT WIRING patterns only. For colors, fonts, gradients, card styles, and visual effects, follow the industry variation system, design profile, and brand palette provided elsewhere in this prompt. Do NOT copy visual styles from the library skeletons — create a UNIQUE design each time.\n`
      : '';

    // ── Surgical edit reinforcement ─────────────────────────────────────
    let vfsFilesContext = '';
    if (surgicalEdit && vfsFiles && Object.keys(vfsFiles).length > 0) {
      const vfsEntries = Object.entries(vfsFiles);
      const sorted = vfsEntries.sort(([a], [b]) => {
        const aReact = /\.(tsx|jsx)$/.test(a) ? 0 : 1;
        const bReact = /\.(tsx|jsx)$/.test(b) ? 0 : 1;
        return aReact - bReact;
      });
      let totalChars = 0;
      const MAX_VFS_CHARS = 80_000;
      const included: string[] = [];
      for (const [path, content] of sorted) {
        if (totalChars + content.length > MAX_VFS_CHARS) continue;
        included.push(`--- FILE: ${path} ---\n${content}\n--- END FILE ---`);
        totalChars += content.length;
      }
      if (included.length > 0) {
        vfsFilesContext = `\n\n📁 CURRENT PROJECT FILES (${included.length} files):\n${included.join('\n\n')}`;
      }
    }

    const surgicalEditReinforcement = surgicalEdit ? `

🔒🔒🔒 SURGICAL EDIT OVERRIDE — HIGHEST PRIORITY 🔒🔒🔒
This is a SURGICAL EDIT request. The user wants ONE specific change.

⚠️ MANDATORY OUTPUT FORMAT ⚠️
You MUST output the modified code. Do NOT just explain what you would do.
For multi-file React projects, output JSON: {"files": {"/path/file.tsx": "...full file content..."}, "explanation": "Brief summary"}
For single-file edits, output the COMPLETE modified file content in a \`\`\`tsx code fence.
NEVER respond with only text/reasoning — ALWAYS include the actual code with the change applied.

FOR REACT/TSX PROJECTS:
- If the user's prompt targets a specific component or section, output ONLY the modified file(s) using JSON format: {"files": {"/path/file.tsx": "...content..."}}
- Preserve ALL imports, hooks, state declarations, and component structure in the file — only change the targeted JSX, logic, or styles.
- If the edit targets a child component in a separate file, output only that child file — not the parent.
- Keep all React patterns intact: hooks order, conditional rendering, map calls, event handlers.
- For style changes on React components: modify only the className or style prop on the targeted element.

FOR HTML TEMPLATES:
- Output the COMPLETE template HTML, but with ONLY the requested element modified.

UNIVERSAL RULES:
EVERY other section, element, style, script, text, image, color, font, and data attribute MUST remain BYTE-FOR-BYTE IDENTICAL to the input.
Think of this as applying a minimal diff — if a line wasn't mentioned by the user, it MUST NOT change.
DO NOT "improve", reorganize, or modernize unmentioned parts of the code.
DO NOT add new sections or components unless explicitly asked.
DO NOT remove any sections, scripts, components, or styles.
If the user asks to change ONE element's color, ONLY that element's color class changes. Nothing else.

⚠️ CRITICAL STYLE PRESERVATION ⚠️
- Copy ALL CSS/style blocks from the input VERBATIM — character for character.
- DO NOT rewrite, reformat, consolidate, minify, or "clean up" any CSS.
- DO NOT change CSS custom properties, color values, font-family declarations, or animation keyframes.
- DO NOT change Tailwind utility classes on elements you were NOT asked to modify.
- If the user asks to change element X, ONLY modify classes/styles on element X. Leave ALL other elements' classes untouched.
- DO NOT change background colors, gradients, border-radius, box-shadow, or any visual property on ANY element not targeted by the user.

⚠️ BACKEND / WIRING EDITS — EXTRA RULES ⚠️
When the user asks to "wire", "connect", "integrate", "hook up", "link to backend", "add API call", "submit data", "save to database", or similar backend-wiring requests:
- You are ONLY allowed to add/modify script blocks, event handlers, data attributes (data-*), form attributes, or fetch/API call logic.
- You MUST NOT change ANY visual styling: no class changes, no inline style changes, no CSS modifications.
- You MUST NOT rearrange, rewrite, or "improve" any HTML/JSX structure or element order.
- The ONLY acceptable changes are functional: adding event listeners, fetch calls, form handlers, hooks, state.
- Copy the entire file as-is and ONLY inject the minimal code needed for the backend wiring.
🔒🔒🔒 END SURGICAL EDIT OVERRIDE 🔒🔒🔒
${vfsFilesContext}
` : '';

    // ── Fast-path system prompt override for wizard launches ─────────────
    const finalSystemPrompt = fastTemplateReact ? (() => {
      const bp = systemsBuildContext as Record<string, any>;
      const brandName = bp?.brand?.business_name || templateName || 'My Business';
      const industry = bp?.identity?.industry || source || 'professional services';
      const tone = bp?.brand?.tone || 'professional and friendly';
      const palette = bp?.brand?.palette || {};
      const sections = bp?.template_sections || ['hero', 'services', 'about', 'testimonials', 'cta', 'contact', 'footer'];
      const intents = (bp?.intents || []).map((i: any) => i.intent).join(', ') || 'contact.submit, booking.create';

      const toHsl = (hex: string | undefined, fallback: string): string => {
        if (!hex) return fallback;
        try { return hexToHsl(hex); } catch { return fallback; }
      };
      const primaryHsl = toHsl(palette.primary, '221.2 83.2% 53.3%');
      const secondaryHsl = toHsl(palette.secondary, '160 84.1% 39.4%');
      const accentHsl = toHsl(palette.accent, '38 92.1% 50.2%');
      const backgroundHsl = toHsl(palette.background, '222.2 84% 4.9%');
      const foregroundHsl = toHsl(palette.foreground, '210 40% 98%');

      return `You are an elite React developer. Generate a COMPLETE, premium single-page website as a React application.

BUSINESS: "${brandName}" — ${industry}
TONE: ${tone}
SECTIONS: ${sections.join(' → ')}
INTENTS TO WIRE: ${intents}

BRAND COLORS — HSL values for CSS custom properties (no hsl() wrapper, just the values):
--primary: ${primaryHsl}
--primary-foreground: 210 40% 98%
--secondary: ${secondaryHsl}
--secondary-foreground: 210 40% 98%
--accent: ${accentHsl}
--accent-foreground: 210 40% 98%
--background: ${backgroundHsl}
--foreground: ${foregroundHsl}
--muted: 217.2 32.6% 17.5%
--muted-foreground: 215 20.2% 65.1%
--border: 217.2 32.6% 17.5%
--card: 222.2 84% 4.9%
--card-foreground: 210 40% 98%
--ring: 224.3 76.3% 48%
--radius: 0.75rem

RULES:
1. Output ONLY valid JSON: {"files": {"src/App.tsx": "...", "src/index.css": "..."}}
2. App.tsx: SINGLE FILE, ALL sections inline, starts with: import React, { useState } from 'react';
3. Use ONLY these imports: react, lucide-react, framer-motion (optional). NO other imports.
4. In App.tsx use Tailwind classes with semantic tokens: bg-primary, text-foreground, bg-muted, etc.
5. For custom colors reference CSS vars: style={{ color: 'hsl(var(--primary))' }}
6. Wire CTAs with data-ut-intent attributes: data-ut-intent="booking.create", data-ut-intent="contact.submit"
7. Navigation anchor links: <a href="#sectionId" data-ut-intent="nav.anchor">
8. Images: use REAL Unsplash URLs that match the industry context. Examples by industry:
   - Restaurant: https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80 (dining room), https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80 (food plating)
   - Salon/Beauty: https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80 (salon interior), https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80 (styling)
   - Fitness: https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80 (gym), https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80 (workout)
   - Medical: https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80 (hospital), https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80 (healthcare)
   - SaaS/Tech: https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80 (dashboard), https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80 (team)
   - Ecommerce: https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80 (store), https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80 (avatar)
   - Portfolio: https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80 (workspace), https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80 (collaboration)
   - Contractor: https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80 (construction), https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80 (tools)
   - Agency: https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80 (office), https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80 (meeting)
   For people/testimonials: https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80, https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80, https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80
   NEVER use fake/placeholder URLs like "photo-1234567890" — every image MUST load.
9. index.css MUST contain: @tailwind base; @tailwind components; @tailwind utilities; then :root { } with ALL the HSL variables above
10. MINIMUM 7 distinct sections, each with rich content
11. Dark theme, premium glassmorphism + gradient effects, responsive (sm:/md:/lg:)
12. export default function App() — must be the default export
13. NO markdown, NO explanations, NO code fences — ONLY the raw JSON object
14. CONTRAST RULE: --foreground MUST be visually distinct from --background. If background is dark (lightness < 30%), foreground MUST be light (lightness > 80%). If background is light (lightness > 70%), foreground MUST be dark (lightness < 25%). Same rule applies to --card vs --card-foreground, --primary vs --primary-foreground. NEVER make text invisible.`;
    })() : systemPrompt + surgicalEditReinforcement + researchContext + industryPageContext + systemTypeContext + designProfileContext + systemsBuildContextText + elementsLibraryBlock + thinkingInstruction + (generatedImageUrl ? `\n\n**IMPORTANT: An AI-generated image has been created for this request. Include this image HTML in your response at the appropriate location:**\n${imageHtml}\n\nThe image is already styled for the "${imagePlacement || 'top-left'}" position. Make sure to include it in a relative-positioned container.` : '');

    const aiMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...processedMessages
    ];

    // ── Provider routing via extracted module ───────────────────────────
    const providerPlan = buildProviderPlan(task, Boolean(LOVABLE_API_KEY));

    let content = '';
    let lastError = '';
    const capture = { reasoning: '' };

    // ── Phase 1: Lovable AI Gateway ─────────────────────────────────────
    for (const model of providerPlan.gatewayModels) {
      try {
        console.log(`[AI-Hybrid] Trying gateway model ${model.label} (timeout: ${providerPlan.perModelTimeoutMs / 1000}s)...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), providerPlan.perModelTimeoutMs);

        const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: model.id, ...(model.id.startsWith('openai/') ? { max_completion_tokens: model.maxTokens } : { max_tokens: model.maxTokens }), messages: aiMessages }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (resp.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!resp.ok) {
          const errText = await resp.text();
          console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 200)}`);
          lastError = `${model.label}: ${resp.status}`;
          continue;
        }

        const responseText = await resp.text();
        if (!responseText || responseText.trim() === '') {
          console.warn(`[AI-Hybrid] ${model.label} returned empty response, trying next...`);
          lastError = `${model.label}: empty response`;
          continue;
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.warn(`[AI-Hybrid] ${model.label} returned invalid JSON, trying next...`);
          lastError = `${model.label}: invalid JSON`;
          continue;
        }

        const parsedContent = data.choices?.[0]?.message?.content || '';
        if (!parsedContent) {
          console.warn(`[AI-Hybrid] ${model.label} returned no content, trying next...`);
          lastError = `${model.label}: no content`;
          continue;
        }

        const extracted = extractThinkingTags(parsedContent);
        if (extracted.reasoning) {
          capture.reasoning = extracted.reasoning;
          console.log(`[AI-Hybrid] Thinking tags extracted from ${model.label}: ${extracted.reasoning.length} chars`);
        }
        content = extracted.content;
        console.log(`[AI-Hybrid] Success with ${model.label}`);
        break;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn(`[AI-Hybrid] ${model.label} timed out, trying next...`);
          lastError = `${model.label}: timeout`;
          continue;
        }
        console.warn(`[AI-Hybrid] ${model.label} failed:`, err);
        lastError = `${model.label}: ${err instanceof Error ? err.message : 'unknown'}`;
        continue;
      }
    }

    // ── Phase 2: Direct OpenAI API fallback ─────────────────────────────
    if (!content) {
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (OPENAI_API_KEY) {
        const openaiModels = [
          { id: 'gpt-4o-mini', maxTokens: 16000, label: 'OpenAI gpt-4o-mini' },
          { id: 'gpt-4o',      maxTokens: 16000, label: 'OpenAI gpt-4o' },
        ];
        for (const model of openaiModels) {
          try {
            console.log(`[AI-Hybrid] Trying direct ${model.label}...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);
            const resp = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ model: model.id, max_completion_tokens: model.maxTokens, messages: aiMessages }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!resp.ok) {
              const errText = await resp.text();
              console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 200)}`);
              lastError = `${model.label}: ${resp.status}`;
              continue;
            }
            const data = await resp.json();
            const parsedContent = data.choices?.[0]?.message?.content || '';
            if (!parsedContent) { lastError = `${model.label}: no content`; continue; }
            const extracted = extractThinkingTags(parsedContent);
            if (extracted.reasoning) {
              capture.reasoning = extracted.reasoning;
              console.log(`[AI-Hybrid] Thinking tags extracted from ${model.label}: ${extracted.reasoning.length} chars`);
            }
            content = extracted.content;
            console.log(`[AI-Hybrid] Success with ${model.label}`);
            break;
          } catch (err) {
            lastError = `${model.label}: ${err instanceof Error ? err.message : 'unknown'}`;
            continue;
          }
        }
      }
    }

    // ── Phase 3: Direct Anthropic API fallback ──────────────────────────
    if (!content) {
      const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
      if (ANTHROPIC_API_KEY) {
        try {
          console.log('[AI-Hybrid] Trying direct Anthropic claude-sonnet-4-5 (extended thinking)...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          const systemMsg = aiMessages.find(m => m.role === 'system')?.content || '';
          const userMsgs = aiMessages.filter(m => m.role !== 'system');
          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2025-02-19',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-5',
              max_tokens: navPageGen ? 10000 : 32000,
              ...(navPageGen ? {} : {
                thinking: {
                  type: 'enabled',
                  budget_tokens: 10000,
                },
              }),
              system: systemMsg,
              messages: userMsgs,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (resp.ok) {
            const data = await resp.json();
            const textBlock = (data.content as Array<{ type: string; text?: string; thinking?: string }> | undefined)
              ?.find(b => b.type === 'text');
            const thinkingBlocks = (data.content as Array<{ type: string; thinking?: string }> | undefined)
              ?.filter(b => b.type === 'thinking')
              .map(b => b.thinking || '')
              .filter(Boolean);
            const parsedContent = textBlock?.text || data.content?.[0]?.text || '';
            if (parsedContent) {
              if (thinkingBlocks?.length) {
                capture.reasoning = thinkingBlocks.join('\n\n');
                console.log(`[AI-Hybrid] Native extended thinking captured from Anthropic: ${capture.reasoning.length} chars`);
                content = parsedContent;
              } else {
                const extracted = extractThinkingTags(parsedContent);
                if (extracted.reasoning) {
                  capture.reasoning = extracted.reasoning;
                  console.log(`[AI-Hybrid] Thinking tags extracted from Anthropic response: ${extracted.reasoning.length} chars`);
                }
                content = extracted.content;
              }
              console.log('[AI-Hybrid] Success with Anthropic claude-sonnet-4-5');
            } else {
              lastError = 'Anthropic: no content';
            }
          } else {
            const errText = await resp.text();
            lastError = `Anthropic: ${resp.status} ${errText.substring(0, 100)}`;
          }
        } catch (err) {
          lastError = `Anthropic: ${err instanceof Error ? err.message : 'unknown'}`;
        }
      }
    }

    if (!content) {
      throw new Error(`All AI providers failed. Last error: ${lastError}. Please ensure at least one of LOVABLE_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY is set in your Supabase secrets.`);
    }

    // ── Post-process via extracted module ────────────────────────────────
    content = postProcessContent(content);

    // Save learning session (async, don't wait)
    const originalUserPrompt = extractTextContent(messages[messages.length - 1]?.content);
    if (savePattern && originalUserPrompt) {
      supabase.from('ai_learning_sessions').insert({
        session_type: mode === 'code' ? 'code_generation' : mode === 'design' ? 'design_review' : 'code_review',
        user_prompt: originalUserPrompt.substring(0, 500),
        ai_response: content.substring(0, 500),
        was_successful: true,
        technologies_used: ['React', 'TypeScript', 'Tailwind CSS']
      }).then(() => console.log('Learning session saved'));
    }

    // ── Build response via extracted module ──────────────────────────────
    const responseBody = buildResponseBody({
      content,
      reasoning: capture.reasoning,
      generatedImageUrl,
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
