/**
 * AI Code Assistant Edge Function — PRIMARY CALL PATH
 *
 * Handles ALL code generation, template rendering, and analysis modes:
 *   - code: React/TSX code generation with edit mode support
 *   - template-react: Full React/TSX template generation for VFS & Docker preview
 *   - design: UI/UX design advisory
 *   - review: Code review and analysis
 *   - debug: Debugging and troubleshooting
 *
 * Primary endpoint for:
 *   - AIBuilderPanel (template generation & rendering)
 *   - aiLaunchService (AI launcher wizard)
 *   - MonacoEditor, AICodeAssistant, AIAssistantCore
 */

import { serve } from "serve";
import { createClient } from "@supabase/supabase-js";
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
  analyzeTemplateStructure,
  formatLearnedPatterns,
  handleCorsOptions,
  buildErrorResponse,
  THINKING_INSTRUCTION,
  type CodePattern,
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
      mode: z.enum(['code', 'template-react', 'template-html', 'template-json', 'design', 'review', 'debug']).default('code'),
      currentCode: z.string().nullish(),
      editMode: z.boolean().optional(),
      templateAction: z.string().max(100).nullish(),
      savePattern: z.boolean().optional(),
      generateImage: z.boolean().optional(),
      imagePlacement: z.string().max(50).nullish(),
      // Launcher-specific fields for template-react mode
      callerManaged: z.boolean().optional(),
      aesthetic: z.string().max(200).nullish(),
      source: z.string().max(200).nullish(),
      variationSeed: z.string().max(200).nullish(),
      systemType: z.string().max(100).nullish(),
      templateName: z.string().max(200).nullish(),
      userDesignProfile: z.object({
        projectCount: z.number().optional(),
        dominantStyle: z.enum(["dark", "light", "colorful", "minimal", "mixed"]).optional(),
        industryHints: z.array(z.string()).optional(),
      }).optional(),
      systemsBuildContext: z.record(z.any()).optional(),
      siteElementsLibraryContext: z.string().nullish(),
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
      currentCode,
      editMode,
      templateAction,
      savePattern,
      generateImage,
      imagePlacement,
      callerManaged = false,
      aesthetic,
      source,
      variationSeed,
      systemType,
      templateName,
      userDesignProfile,
      systemsBuildContext,
      siteElementsLibraryContext,
    } = parsed.data;

    const systemTypeContext = buildSystemTypeContext(systemType ?? null);
    const designProfileContext = buildDesignProfileContext(userDesignProfile ?? null);
    const systemsBuildContextText = buildSystemsBuildContextText(
      systemsBuildContext ?? null,
      systemType ?? null,
      templateName ?? null
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.warn("[ai-code-assistant] LOVABLE_API_KEY not configured — will attempt direct provider APIs as fallback");
    }

    // Initialize Supabase for learning system
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch learned patterns
    const { data: patterns } = await supabase
      .from('ai_code_patterns')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('success_rate', { ascending: false })
      .limit(12);

    const learnedPatterns = formatLearnedPatterns((patterns as CodePattern[]) || []);

    // ================================================================
    // Build edit mode context (for code + editMode from AICodeAssistant)
    // ================================================================

    const maxCodeLength = 4000;
    const templateStructure = currentCode ? analyzeTemplateStructure(currentCode) : '';

    const templateActionContext = templateAction ? `
🎯 **TEMPLATE ACTION: ${templateAction.toUpperCase()}**
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

**OUTPUT REQUIREMENTS:**
1. Return COMPLETE, PRODUCTION-READY React/TSX components
2. Use Tailwind CSS with design token classes (bg-primary, text-foreground, etc.)
3. Use CSS-in-JS or index.css for custom animations (NOT <style> tags)
4. Use React hooks for interactivity (NOT <script> tags)
5. Ensure responsive design (mobile-first with sm:, md:, lg: breakpoints)
6. Wire ALL conversion elements with data-ut-intent
7. For multi-file: output JSON {"files": {"src/App.tsx": "...", ...}}. For single file: use \`\`\`tsx code fence.` : ''}
${templateAction === 'apply-design-preset' ? `🎨 **DESIGN PRESET APPLICATION MODE - VISUAL STYLING ONLY**

⚠️ **CRITICAL: PRESERVE ALL TEMPLATE CONTENT EXACTLY AS-IS**
- ALL text content, headings, paragraphs must stay identical

✅ **YOU MUST ONLY CHANGE (visual styling):**
- Font families, sizes, weights, colors
- Background colors, border colors, gradients
- Shadow effects, hover states

🚫 **YOU MUST NEVER CHANGE:**
- ANY text content, layout structure, section order
- Images, icons, JSX structure, React hooks, data-* attributes

Return the COMPLETE React/TSX code with visual aesthetic applied.` : ''}
` : '';

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

🚨🚨🚨 **ABSOLUTE EDIT MODE REQUIREMENTS — VIOLATION = USER DATA LOSS** 🚨🚨🚨

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

🔍 **POSITIONING & LAYOUT COMMANDS:**
When user asks to reposition elements, ONLY add/modify classes on the targeted element:

**Centering:**
- "center" / "center horizontally" → mx-auto (block) or justify-center (flex) or text-center (text)
- "center vertically" → items-center (flex) or my-auto
- "center both" → flex items-center justify-center

**Flexbox Layout:**
- "make flex" / "use flexbox" → flex
- "flex row" → flex flex-row
- "flex column" → flex flex-col
- "space between" → flex justify-between

**Grid Layout:**
- "2 columns" → grid grid-cols-2
- "3 columns" → grid grid-cols-3
- "responsive grid" → grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Positioning:**
- "fixed" → fixed
- "sticky" → sticky top-0
- "full width" → w-full

` : '';

    // ================================================================
    // System Prompts for Code/Design/Review/Debug
    // ================================================================

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

INTENT VOCABULARY (REFERENCE):
| Intent | Payload Attributes | Action |
|--------|-------------------|--------|
| nav.goto | data-ut-path="/page" | Route navigation |
| nav.anchor | data-ut-anchor="section" | Scroll to section |
| nav.external | href="https://..." | Open in new tab |
| cart.add | data-product-id, data-price, data-name | Add to cart |
| cart.view | none | Open cart overlay |
| auth.signin | none | Open auth overlay (login) |
| auth.signup | none | Open auth overlay (register) |
| booking.create | data-service | Open booking overlay |
| contact.submit | none | Open contact overlay |
| quote.request | none | Open quote form |
| newsletter.subscribe | none | Newsletter signup |
| lead.capture | none | Capture lead |
| pay.checkout | data-plan, data-price-id | Begin checkout |

CTA TRACKING LABELS (data-ut-cta values):
- cta.nav → Header/navbar CTA button
- cta.hero → Hero section primary CTA
- cta.hero-secondary → Hero section secondary CTA
- cta.primary → Main conversion CTAs
- cta.secondary → Secondary/supporting CTAs
- cta.footer → Footer CTA button

INDUSTRY-AWARE INTENT SELECTION:
- SaaS → auth.signup
- Ecommerce → cart.add / cart.view
- Booking businesses → booking.create
- Service businesses → quote.request or contact.submit
- Portfolio/Agency → contact.submit

DESIGN SYSTEM RULES (CRITICAL):
- Prefer design tokens via classes: bg-background, text-foreground, bg-card, text-muted-foreground, border-border, bg-primary, text-primary-foreground.
- Avoid hardcoded colors unless explicitly requested.

🧠 **CONTINUOUS LEARNING SYSTEM:**
You actively learn from successful code patterns and build upon proven solutions.

**CURRENT LEARNED PATTERNS:**
${learnedPatterns}

🏆 **PREMIUM DESIGN MANDATE — AWARD-WINNING LEVEL:**
Your output MUST rival top-tier ThemeForest templates and Framer showcases.

**DARK LUXURY HERO (default for service businesses):**
- min-h-screen with Unsplash background + gradient overlay (from-black/80 via-black/60 to-transparent)
- Badge above headline: inline-flex rounded-full bg-white/10 backdrop-blur-sm
- H1: text-5xl md:text-6xl lg:text-7xl font-bold with gradient text accent
- Dual CTAs: primary (bg-primary rounded-full shadow-lg) + secondary (border-2 border-white/20)

**SERVICE CARDS:**
- bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-primary/50 hover:-translate-y-1
- CATEGORY PILLS: rounded-full bg-white/10 text-gray-300 (active: bg-primary text-white)

**SECTION DESIGN DENSITY:**
- Section headers: ALWAYS eyebrow + h2 + subtitle
- Cards: 4-6 content elements minimum
- py-20 md:py-28 section padding, max-w-6xl mx-auto containers

💡 **CODE GENERATION EXCELLENCE:**
1. **REACT FUNCTIONAL COMPONENTS** with hooks, TypeScript, clean exports
2. **Semantic HTML5 in JSX** — proper structure, ARIA labels, keyboard nav
3. **Tailwind CSS** — utility classes, design tokens, responsive breakpoints
4. **React Hooks** — useState for state, useEffect for side effects
5. **Production Quality** — error handling, loading states
6. **Responsive Design** — mobile-first, fluid layouts

**CRITICAL OUTPUT RULES:**
1. ALWAYS generate React/TypeScript functional components
2. Use proper imports: import React from 'react'; import { useState, useEffect } from 'react';
3. Use Tailwind CSS classes
4. EXPORT a default component for each file
5. For multi-file projects: output JSON: {"files": {"src/App.tsx": "...", ...}}
6. For single component edits: output a \`\`\`tsx code fence

7. **BACKEND WIRING (REQUIRED):** Wire actions via data-ut-intent attributes
8. **STRUCTURED OUTPUT:** JSON {"files": {"/path/file.tsx": "content"}} for multi-file, tsx code fence for single-file

9. **DYNAMIC COMPONENT INJECTION:**
   **AUTH FLOWS — preview runtime has built-in auth overlays:**
   - Sign-in: add data-ut-intent="auth.signin"
   - Sign-up: add data-ut-intent="auth.signup"
   
   **ROUTING & PAGE NAVIGATION:**
   - <a href="/about" data-ut-intent="nav.goto" data-ut-path="/about">About</a>

   **DYNAMIC FORMS:**
   - Booking: data-ut-intent="booking.create"
   - Contact: data-ut-intent="contact.submit"
   - Quote: data-ut-intent="quote.request"
   CRITICAL: NEVER generate fake auth logic. Use data-ut-intent attributes.

**ANIMATION INTEGRATION:**
- Tailwind: animate-pulse, animate-bounce, transition-all
- CSS keyframes in index.css for custom animations
- IntersectionObserver for scroll reveals via useEffect + useRef

**TAILWIND CSS INTEGRATION:**
- Use @apply for repeated patterns in index.css
- Responsive: sm:, md:, lg:, xl: breakpoints
- Dark mode: dark: prefix variants
- Design tokens: bg-primary, text-primary-foreground, etc.

**IMAGE INTEGRATION RULES:**
✅ CORRECT: https://images.unsplash.com/photo-[id]?w=800&h=600, https://picsum.photos/800/600
❌ NEVER: Relative paths, local filesystem
Use onError fallback: (e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/cccccc/666666?text=Image+Not+Available'; }

**PREFERRED OUTPUT FORMAT:**
For multi-file React projects, use JSON:
{"files": {"src/App.tsx": "import React from 'react';...", "src/components/Hero.tsx": "...", "src/index.css": "..."}}

PRE-BUILT COMPONENTS AVAILABLE (use via import):
- shadcn/ui components: Button, Card, Input, Dialog, Tabs, etc.
- Lucide React icons: import { Heart, Star, Menu } from "lucide-react";

⛔ **NEVER GENERATE:**
- Raw HTML documents (<!DOCTYPE html>, <html>)
- <script> tags or vanilla JavaScript
- document.createElement, DOM manipulation
- CDN script tags
- module.exports

REMEMBER: Every component you generate MUST be a valid React/TypeScript functional component.`,

      'template-react': (() => {
        // Build template-react prompt dynamically based on caller context
        if (callerManaged) {
          // CALLER-MANAGED MODE: systems-build has injected all design tokens into user message
          const referenceTemplateBlock = currentCode && templateAction === 'use-as-schema' ? `
## 📝 CONTENT REFERENCE (INSPIRATION ONLY — DO NOT COPY LAYOUT)
Below is a reference for CONTENT DIRECTION ONLY (services, copy tone, industry terms).
DO NOT copy its layout, color scheme, section order, or visual structure.
\`\`\`
${(currentCode ?? '').substring(0, 8000)}
\`\`\`
` : '';

          return `You are an ELITE React fullstack developer producing PREMIUM, PRODUCTION-READY React applications that rival Lovable, Framer, and ThemeForest premium templates.
${referenceTemplateBlock}
## CRITICAL: DESIGN SPECIFICATIONS ARE IN BOTH THE USER MESSAGE AND SYSTEM CONTEXT
The user message contains EXACT specifications for CSS color variables, layout, typography, sections, images, and industry rules.
The system context (Business Blueprint) provides brand, identity, and intent wiring details.
Follow BOTH precisely. DO NOT invent your own colors, layout, or fonts.

## REACT ARCHITECTURE
⚠️ CRITICAL: OUTPUT EXACTLY TWO FILES — src/App.tsx and src/index.css
All components MUST be defined INLINE in App.tsx as named function components.
🚫 NEVER import from './components/', './sections/', or any relative path.

## AVAILABLE LIBRARIES (pre-installed):
### Icons:
\`\`\`tsx
import { Star, ArrowRight, Check, Phone, Mail, MapPin, Clock, Users, Heart, Shield, Zap, Menu, X, ChevronDown, Quote, Calendar, Sparkles, TrendingUp, Award, Target } from "lucide-react";
\`\`\`
### Animations:
\`\`\`tsx
import { motion, useInView } from "framer-motion";
\`\`\`
### Charts:
\`\`\`tsx
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
\`\`\`
### Utilities:
\`\`\`tsx
import { cn } from "@/lib/utils";
\`\`\`

## INTENT HANDLERS:
\`\`\`tsx
<button data-ut-intent="booking.create">Book Now</button>
<a href="#contact" data-ut-intent="nav.anchor" data-ut-anchor="contact">Contact</a>
\`\`\`

## 🖼️ IMAGE RULES (MANDATORY):
- Hero MUST have a full-viewport Unsplash background image with dark gradient overlay
- Service/feature cards SHOULD have icons (Lucide) AND contextual imagery where possible
- About section MUST have a real Unsplash image (not a placeholder icon)
- Use the EXACT Unsplash URLs provided in the user message
- Every <img> MUST have: alt text + onError fallback: onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/cccccc/666666?text=Image'; }}
- ❌ NEVER use gradient-only backgrounds as a substitute for real hero images
- ❌ NEVER use empty divs with just an icon where an image should be

## PREMIUM CSS UTILITIES (include in index.css):
\`\`\`css
.glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
.gradient-text { background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent, var(--secondary))) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-weight: 600; padding: 0.75rem 1.5rem; border-radius: var(--radius, 0.5rem); transition: all 0.2s ease; border: none; cursor: pointer; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 14px hsl(var(--primary) / 0.3); }
.hover-lift { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
.hover-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
.card-elevated { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius, 0.75rem); padding: 2rem; transition: all 0.3s ease; }
.card-elevated:hover { border-color: hsl(var(--primary) / 0.3); box-shadow: 0 8px 30px hsl(var(--primary) / 0.1); transform: translateY(-4px); }
.headline-xl { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
.headline-lg { font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; line-height: 1.2; }
.section-spacing { padding: 5rem 1rem; }
.container-wide { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
@keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { opacity: 0; animation: fade-in-up 0.6s ease forwards; }
\`\`\`

## OUTPUT FORMAT:
Return a single JSON object (no markdown):
\`\`\`json
{ "files": { "src/App.tsx": "...", "src/index.css": "..." }, "entryPoint": "src/App.tsx", "framework": "react", "buildTool": "vite" }
\`\`\`
⛔ NEVER INCLUDE: tailwind.config, package.json, vite.config, tsconfig, main.tsx, hooks/, lib/, components/

## QUALITY CHECKLIST (NON-NEGOTIABLE — every item MUST be true):
- [ ] MINIMUM 10 inline section components in App.tsx (Header, Hero, Features/Services, About, Stats, Testimonials, CTA, Contact, Pricing/FAQ, Footer)
- [ ] EXACTLY ONE Hero section — full-viewport with Unsplash background image
- [ ] framer-motion scroll-triggered reveals on EVERY section + staggered grid animations on cards
- [ ] Lucide icons on EVERY feature card, stat block, testimonial, nav link, and CTA
- [ ] Real Unsplash images used (hero bg, about section, gallery) — NOT gradient-only placeholders
- [ ] Contact form with name, email, message fields + submit button with data-ut-intent="contact.submit"
- [ ] EVERY CTA button has data-ut-intent + visible industry-specific label
- [ ] Responsive with sm/md/lg/xl breakpoints — mobile hamburger menu in Header
- [ ] Section headers use eyebrow text + headline + subtitle pattern
- [ ] Cards have hover-lift/shadow animation effects`;
        }

        // NON-CALLER-MANAGED: Builder panel template generation with industry variations
        const templatePromptText = templateName
          ? `${templateName} ${aesthetic || ''} ${source || ''}`
          : extractTextContent(messages[messages.length - 1]?.content) || '';
        const variation = generateVariation(templatePromptText, variationSeed ?? undefined);
        const variationContext = variationToPromptContext(variation);

        return `You are an ELITE React fullstack developer producing PREMIUM, PRODUCTION-READY React applications.
${editModeContext}
${variationContext}

## REACT ARCHITECTURE
⚠️ CRITICAL: OUTPUT EXACTLY TWO FILES — src/App.tsx and src/index.css
All components MUST be defined INLINE in App.tsx. DO NOT create separate files.

## DESIGN SYSTEM (MANDATORY CSS VARIABLES):
\`\`\`css
:root {
  --primary: ${hexToHsl(variation.colorScheme.primary)};
  --primary-foreground: 0 0% 100%;
  --secondary: ${hexToHsl(variation.colorScheme.secondary)};
  --accent: ${hexToHsl(variation.colorScheme.accent)};
  --background: ${hexToHsl(variation.colorScheme.background)};
  --foreground: ${hexToHsl(variation.colorScheme.foreground)};
  --muted: ${hexToHsl(variation.colorScheme.muted)};
  --card: ${hexToHsl(variation.colorScheme.cardBg)};
  --border: 240 5.9% 90%;
  --radius: 0.5rem;
}
\`\`\`

## TYPOGRAPHY: Heading: "${variation.fontPairing.heading}", Body: "${variation.fontPairing.body}"

## SECTION ORDER:
${variation.sectionOrder.map((s: string, i: number) => `${i + 1}. ${s.charAt(0).toUpperCase() + s.slice(1)}`).join('\n')}
⚠️ Generate EXACTLY ONE Hero section.
## HERO LAYOUT: ${variation.heroVariant.name} (${variation.heroVariant.layout})

## IMAGES:
${variation.industry.unsplashIds.map((id: string) => `https://images.unsplash.com/${id}?w=800&q=80`).join('\n')}

## AVAILABLE LIBRARIES:
\`\`\`tsx
import { Star, ArrowRight, Check, Phone, Mail, MapPin, Clock, Users, Heart, Shield, Zap, Menu, X } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIntentHandlers } from './hooks-shim';
\`\`\`

## INTENT WIRING:
\`\`\`tsx
<button data-ut-intent="booking.create">Book Now</button>
<button data-ut-intent="nav.goto" data-ut-payload='{"path":"#contact"}'>Contact</button>
\`\`\`

## OUTPUT FORMAT:
\`\`\`json
{ "files": { "src/App.tsx": "...", "src/index.css": "..." }, "entryPoint": "src/App.tsx", "framework": "react", "buildTool": "vite" }
\`\`\`
⛔ NEVER INCLUDE: tailwind.config, package.json, vite.config, tsconfig, main.tsx, hooks/, lib/, components/

## QUALITY:
- MINIMUM 10 inline sections, EXACTLY ONE Hero
- framer-motion scroll reveals + staggered grids
- Lucide icons everywhere
- Responsive sm/md/lg/xl`;
      })(),

      'template-json': (() => {
        const templatePromptText = templateName
          ? `${templateName} ${aesthetic || ''} ${source || ''}`
          : extractTextContent(messages[messages.length - 1]?.content) || '';
        const variation = generateVariation(templatePromptText, variationSeed ?? undefined);
        const variationContext = variationToPromptContext(variation);

        return `You are an ELITE web template generator producing PREMIUM, PRODUCTION-READY templates for a Web Builder canvas. Your templates must rival top-tier designs from ThemeForest, Webflow, and Framer.

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

MINIMUM 6 sections with 4-6 components each. Use the industry images: ${variation.industry.unsplashIds.map((id: string) => `https://images.unsplash.com/${id}?w=800&q=80`).join(', ')}

OUTPUT: Return ONLY valid JSON matching this schema.`;
      })(),

      'template-html': (() => {
        const templatePromptText = templateName
          ? `${templateName} ${aesthetic || ''} ${source || ''}`
          : extractTextContent(messages[messages.length - 1]?.content) || '';
        const variation = generateVariation(templatePromptText, variationSeed ?? undefined);
        const variationContext = variationToPromptContext(variation);

        return `You are an ELITE web designer producing PREMIUM, AWARD-WINNING website templates. Your output must rival top-tier templates from ThemeForest, Webflow, and Framer.

${variationContext}

DESIGN SYSTEM (MANDATORY):
Use CSS custom properties for theming:
:root {
  --primary: ${hexToHsl(variation.colorScheme.primary)};
  --secondary: ${hexToHsl(variation.colorScheme.secondary)};
  --accent: ${hexToHsl(variation.colorScheme.accent)};
  --background: ${hexToHsl(variation.colorScheme.background)};
  --foreground: ${hexToHsl(variation.colorScheme.foreground)};
  --muted: ${hexToHsl(variation.colorScheme.muted)};
  --card: ${hexToHsl(variation.colorScheme.cardBg)};
}

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
${variation.sectionOrder.map((s: string, i: number) => `${i + 1}. ${s.toUpperCase()}`).join('\n')}

⚠️ CRITICAL: Generate EXACTLY ONE hero section.

HERO LAYOUT: ${variation.heroVariant.name} (${variation.heroVariant.layout})

IMAGES TO USE:
${variation.industry.unsplashIds.map((id: string) => `https://images.unsplash.com/${id}?w=800&q=80`).join('\n')}

OUTPUT: Return ONLY the complete, self-contained HTML document. No markdown, no explanations.`;
      })(),

      design: `You are an ELITE "Super Web Builder Expert" UI/UX design advisor with a continuously learning system.

🎨 **DESIGN EXPERTISE WITH LEARNING:**
You actively learn from successful design patterns and provide increasingly sophisticated recommendations.

**LEARNED DESIGN PATTERNS:**
${learnedPatterns}

**YOUR DESIGN MASTERY:**
- Color Theory & Psychology
- Typography Systems
- Spacing & Layout
- Visual Hierarchy
- Motion Design
- Accessibility (WCAG)
- Design Trends

**DESIGN PRINCIPLES:**
1. **Accessibility First** - WCAG AA compliance
2. **Visual Hierarchy** - Guide attention through size, color, spacing
3. **Consistency** - Design systems, tokens, reusable patterns
4. **Responsive** - Mobile-first, fluid layouts
5. **Performance** - Optimized assets, smooth animations
6. **User-Centric** - Intuitive navigation, clear feedback

Build upon proven design patterns to create increasingly sophisticated solutions!`,

      review: `You are an ELITE "Super Web Builder Expert" code reviewer with a learning-driven analysis system.

🔍 **COMPREHENSIVE CODE REVIEW WITH LEARNING:**
**LEARNED BEST PRACTICES:**
${learnedPatterns}

**REVIEW FRAMEWORK:**
1. **Critical Issues** 🚨 — Security, performance, accessibility
2. **Improvements** 💡 — Organization, type safety, optimization
3. **Best Practices** ✅ — What's done well, patterns worth reusing

**REVIEW STYLE:**
- Constructive and specific with code examples
- Prioritize: critical → nice-to-have
- Include impact and reasoning
- Reference learned patterns`,

      debug: `You are an ELITE "Super Web Builder Expert" debugging specialist.

🔧 **ADVANCED DEBUGGING:**
**LEARNED ERROR PATTERNS:**
${learnedPatterns}

${editModeContext}

**DEBUGGING EXPERTISE:**
1. **Rendering Issues** — Layout breaking, CSS conflicts, responsive failures
2. **React/TypeScript Errors** — Hook violations, type errors, stale closures
3. **Visual Problems** — Styling not applying, z-index, animation glitches
4. **Functional Bugs** — Interactive elements, forms, state management

**DEBUGGING PROCESS:**
1. ANALYZE — Read the React/TSX code
2. IDENTIFY — Locate the exact issue
3. DIAGNOSE — Explain the cause
4. FIX — Provide complete corrected React/TSX code
5. EXPLAIN — What changed and why

**CRITICAL RULES:**
✅ ALWAYS provide COMPLETE FIXED CODE as React/TSX
✅ Output valid TSX — not HTML documents
✅ Preserve working code — only fix what's broken
✅ Validate JSX structure

**RESPONSE FORMAT:**
🔍 **Issue Identified:** [description]
🎯 **Root Cause:** [why]
✅ **Solution:** [what to change]
📝 **Fixed Code:** \`\`\`tsx [complete code] \`\`\`
💡 **Explanation:** [what changed]`
    };

    const systemPrompt = systemPrompts[mode] || systemPrompts.code;

    // ================================================================
    // Image Generation (code mode only)
    // ================================================================

    const userPromptText = extractTextContent(messages[messages.length - 1]?.content);
    const userPrompt = userPromptText.toLowerCase();

    const researchPromise = performPromptResearch(userPromptText);

    const imageKeywords = ['generate image', 'create image', 'generate a logo', 'create a logo', 'make a logo', 'add logo image', 'insert image'];
    const shouldGenerateImage = generateImage || imageKeywords.some(kw => userPrompt.includes(kw));

    let generatedImageUrl = '';
    let imageHtml = '';

    if (shouldGenerateImage && LOVABLE_API_KEY) {
      console.log('[ai-code-assistant] Generating image for request');
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
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (imageResponse.ok) {
          const imageText = await imageResponse.text();
          if (imageText?.trim()) {
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
                imageHtml = `\n<div class="ai-image-container resizable-image" style="${placementCss} ${maxSize} z-index: 100;">\n  <img src="${generatedImageUrl}" alt="${imageDescription}" class="w-full h-auto object-contain" />\n</div>`;
                console.log('[ai-code-assistant] Image generated, placed at:', detectedPlacement);
              }
            } catch (parseErr) {
              console.error('[ai-code-assistant] Failed to parse image response:', parseErr);
            }
          }
        }
      } catch (imageError) {
        if (imageError instanceof Error && imageError.name === 'AbortError') {
          console.warn('[ai-code-assistant] Image generation timed out');
        } else {
          console.error('[ai-code-assistant] Image generation failed:', imageError);
        }
      }
    }

    // Elements library context
    const elementsLibraryBlock = siteElementsLibraryContext
      ? `\n${siteElementsLibraryContext}\n⚠️ LIBRARY USAGE RULE: The element library provides STRUCTURE and INTENT WIRING patterns only. For visual design, follow the design profile and brand palette.\n`
      : '';

    // Wait for research
    const research = await researchPromise;
    const researchContext = formatResearchContext(research);

    const normalizedMessages: AIMessage[] = messages.map(m => ({ role: m.role, content: m.content ?? '' }));
    const processedMessages = processMessages(normalizedMessages);

    console.log(`[ai-code-assistant] Processing ${processedMessages.length} messages, mode=${mode}`);

    const aiMessages = [
      {
        role: 'system',
        content: systemPrompt + researchContext + systemTypeContext + designProfileContext + systemsBuildContextText + elementsLibraryBlock + THINKING_INSTRUCTION + (generatedImageUrl ? `\n\n**IMPORTANT: An AI-generated image has been created. Include this image HTML in your response:**\n${imageHtml}\nThe image is styled for "${imagePlacement || 'top-left'}" position.` : ''),
      },
      ...processedMessages,
    ];

    // Call AI providers
    const result: AIProviderResult = await callAIProviders(aiMessages);

    if (!result.ok) {
      const err = result as { ok: false; status: number; error: string; errorType: string };
      return new Response(
        JSON.stringify({ error: err.error, errorType: err.errorType }),
        { status: err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Post-process
    const content = stripConfigFilesFromOutput(result.content);

    // Save learning session (async, fire-and-forget)
    if (savePattern && userPromptText) {
      supabase.from('ai_learning_sessions').insert({
        session_type: mode === 'code' ? 'code_generation' : mode === 'design' ? 'design_review' : 'code_review',
        user_prompt: userPromptText.substring(0, 500),
        ai_response: content.substring(0, 500),
        was_successful: true,
        technologies_used: ['React', 'TypeScript', 'Tailwind CSS'],
      }).then(() => console.log('[ai-code-assistant] Learning session saved'));
    }

    return new Response(
      JSON.stringify({
        content,
        thinking: result.reasoning ? result.reasoning.substring(0, 12000) : undefined,
        generatedImage: generatedImageUrl || undefined,
        imagePlacement: generatedImageUrl ? (imagePlacement || 'top-left') : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return buildErrorResponse(error);
  }
});
