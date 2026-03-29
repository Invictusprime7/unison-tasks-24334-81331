/**
 * AI Editor Edge Function
 *
 * Handles edit mode and surgical edit operations:
 *   - editMode: ADDITIVE editing of existing templates (code + React)
 *   - surgicalEdit: Targeted single-element changes with VFS context
 *   - templateAction: add, remove, modify, suggest, restyle, full-control, apply-design-preset
 *
 * Split from ai-code-assistant for:
 *   - Dedicated VFS-aware editing without template generation overhead
 *   - Cleaner separation of creation vs. editing concerns
 */

import { serve } from "serve";
import { z } from "zod";
import {
  corsHeaders,
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
  fetchLearnedPatterns,
  formatLearnedPatterns,
  handleCorsOptions,
  buildErrorResponse,
  saveLearnSession,
  THINKING_INSTRUCTION,
  type AIProviderResult,
} from "../_shared/aiShared.ts";

type AIMessage = { role: string; content: unknown };

// ============================================================================
// Template Action Context Builder
// ============================================================================

function buildTemplateActionContext(templateAction: string | null): string {
  if (!templateAction) return '';
  return `
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

You have FULL AUTHORITY to make ANY UI/UX decisions. The user trusts your expertise.

⚠️ CRITICAL ARCHITECTURE RULE: ALL COMPONENTS INLINE IN ONE FILE
Define every section (Hero, Features, Testimonials, Footer, etc.) as named function
components INSIDE a single App.tsx file. DO NOT import from ./components/, ./sections/,
or any relative path that doesn't exist in the current VFS.

🚫 FORBIDDEN:
\`\`\`tsx
import Hero from './components/sections/Hero'; // ❌ NEVER
import Features from './sections/Features';     // ❌ NEVER
\`\`\`
✅ CORRECT:
\`\`\`tsx
function Hero() { return <section>...</section>; }
function Features() { return <section>...</section>; }
export default function App() { return <><Hero /><Features /></>; }
\`\`\`

🎨 **YOU CAN AND SHOULD:**
- Completely restyle colors, fonts, typography, spacing
- Add gradients, shadows, animations, transitions
- Reorder sections for better user flow and conversion
- Add new sections or remove redundant ones
- Make static elements dynamic
- Add interactive components

**OUTPUT REQUIREMENTS:**
1. Return COMPLETE, PRODUCTION-READY React/TSX components
2. Use Tailwind CSS with design token classes: hsl(var(--primary)), hsl(var(--background)), etc.
3. Use CSS-in-JS or index.css for custom animations (NOT <style> tags)
4. Use React hooks for interactivity (NOT <script> tags)
5. Use Lucide React icons: import { Star, ArrowRight, Check, ... } from "lucide-react";
6. Use framer-motion for scroll animations: import { motion, useInView } from "framer-motion";
7. Ensure responsive design (mobile-first with md: and lg: breakpoints)
8. Wire ALL conversion elements with data-ut-intent
9. For multi-file: output JSON {"files": {"src/App.tsx": "...", "src/index.css": "..."}}. For single file: use tsx code fence.
10. Generate MINIMUM 6 sections: Hero, Features/Services, About/Stats, Testimonials, CTA, Footer` : ''}
${templateAction === 'apply-design-preset' ? `🎨 **DESIGN PRESET APPLICATION MODE - VISUAL STYLING ONLY**

⚠️ **CRITICAL: PRESERVE ALL TEMPLATE CONTENT EXACTLY AS-IS**
- ALL text content must stay identical
- ALL industry-specific language must remain unchanged

✅ **YOU MUST ONLY CHANGE (visual styling):**
- Font families, sizes, weights
- Text colors, background colors
- Border colors, radius, styles
- Gradient colors and directions
- Shadow effects, hover states

🚫 **YOU MUST NEVER CHANGE:**
- ANY text content
- Layout structure
- Section order
- Images, icons, logos
- JSX structure or component hierarchy
- React hooks or state management
- ANY data-ut-intent, data-intent attributes

Return the COMPLETE React/TSX code with visual aesthetic applied.` : ''}
`;
}

// ============================================================================
// Edit Mode Context Builder
// ============================================================================

function buildEditModeContext(
  editMode: boolean,
  currentCode: string | null,
  templateAction: string | null,
  maxCodeLength = 4000
): string {
  if (!editMode || !currentCode) return '';

  const templateStructure = analyzeTemplateStructure(currentCode);
  const templateActionCtx = buildTemplateActionContext(templateAction);

  return `
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
${templateActionCtx}
**CURRENT CODE (${currentCode.length > maxCodeLength ? 'truncated' : 'full'}):**
\`\`\`tsx
${currentCode.substring(0, maxCodeLength)}${currentCode.length > maxCodeLength ? '\n... (truncated for context)' : ''}
\`\`\`

🚨🚨🚨 **ABSOLUTE EDIT MODE REQUIREMENTS** 🚨🚨🚨

**STRUCTURAL INTEGRITY RULES (MANDATORY):**
1. **COMPONENT COUNT LOCK** - Count section components in input. Output MUST have >= that count.
2. **IMPORT LOCK** - Preserve ALL import statements EXACTLY.
3. **HOOKS LOCK** - Preserve ALL React hooks EXACTLY.
4. **TEXT CONTENT LOCK** - DO NOT change text UNLESS specifically requested
5. **IMAGE URLs LOCK** - NEVER modify src attributes unless requested
6. **COLOR PALETTE LOCK** - NEVER change color classes unless requested
7. **FONT CLASSES LOCK** - NEVER change font classes unless requested
8. **DATA ATTRIBUTES LOCK** - ALL data-* attributes MUST be preserved

**ADDITIVE CHANGE PRINCIPLE:**
- "center the hero" → ADD centering classes. NOTHING ELSE CHANGES.
- "add animation" → ADD animation classes. NOTHING ELSE CHANGES.
- "make it bigger" → MODIFY size classes on target. NOTHING ELSE CHANGES.
- "change the color" → MODIFY color classes on target. NOTHING ELSE CHANGES.

**OUTPUT VERIFICATION CHECKLIST:**
□ Component count: Input N → Output N?
□ Import count: Input N → Output N?
□ Footer present? Header/Nav present?
□ All text content preserved?
□ All image URLs preserved?
□ Only the requested change was made?

🚫 **FATAL ERRORS (ZERO TOLERANCE):**
- Reducing sections/components
- Removing imports/hooks
- Generating "simplified" versions
- Changing unrequested text/images/colors
`;
}

// ============================================================================
// Surgical Edit Reinforcement Builder
// ============================================================================

function buildSurgicalEditReinforcement(
  surgicalEdit: boolean,
  vfsFiles?: Record<string, string>
): string {
  if (!surgicalEdit) return '';

  let vfsFilesContext = '';
  if (vfsFiles && Object.keys(vfsFiles).length > 0) {
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

  return `

🔒🔒🔒 SURGICAL EDIT OVERRIDE — HIGHEST PRIORITY 🔒🔒🔒
This is a SURGICAL EDIT request. The user wants ONE specific change.

⚠️ MANDATORY OUTPUT FORMAT ⚠️
You MUST output the modified code. Do NOT just explain what you would do.
For multi-file React projects, output JSON: {"files": {"/path/file.tsx": "...full file content..."}, "explanation": "Brief summary"}
For single-file edits, output the COMPLETE modified file content in a \`\`\`tsx code fence.

FOR REACT/TSX PROJECTS:
- If targeting a specific component, output ONLY the modified file(s) using JSON: {"files": {"/path/file.tsx": "...content..."}}
- Preserve ALL imports, hooks, state, props, and component structure — only change targeted JSX/logic/styles.
- If editing a child component, output only that child file — not the parent.

UNIVERSAL RULES:
EVERY other section, element, style, text, image, color, font, and data attribute MUST remain BYTE-FOR-BYTE IDENTICAL.
Think of this as applying a minimal diff — if a line wasn't mentioned, it MUST NOT change.
DO NOT "improve", reorganize, or modernize unmentioned parts.
DO NOT add new sections or remove any existing ones.

⚠️ CRITICAL STYLE PRESERVATION ⚠️
- Copy ALL CSS/style blocks VERBATIM.
- DO NOT rewrite, reformat, consolidate, minify, or "clean up" any CSS.
- DO NOT change Tailwind classes on elements you were NOT asked to modify.

⚠️ BACKEND / WIRING EDITS — EXTRA RULES ⚠️
When the user asks to "wire", "connect", "hook up", etc.:
- ONLY add/modify event handlers, data attributes, fetch/API calls.
- MUST NOT change ANY visual styling.
- MUST NOT rearrange HTML/JSX structure.
🔒🔒🔒 END SURGICAL EDIT OVERRIDE 🔒🔒🔒
${vfsFilesContext}
`;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCorsOptions();

  try {
    const body = await req.json();

    const bodySchema = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.unknown(),
      })).min(1),
      mode: z.enum(['code', 'template-react']).default('code'),
      currentCode: z.string().nullish(),
      editMode: z.boolean().optional(),
      surgicalEdit: z.boolean().optional(),
      templateAction: z.string().max(100).nullish(),
      savePattern: z.boolean().optional(),
      systemType: z.string().max(100).nullish(),
      templateName: z.string().max(200).nullish(),
      userDesignProfile: z.object({
        projectCount: z.number().optional(),
        dominantStyle: z.enum(["dark", "light", "colorful", "minimal", "mixed"]).optional(),
        industryHints: z.array(z.string()).optional(),
      }).optional(),
      systemsBuildContext: z.record(z.any()).optional(),
      siteElementsLibraryContext: z.string().nullish(),
      vfsFiles: z.record(z.string()).optional(),
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
      editMode = true,
      surgicalEdit = false,
      templateAction,
      savePattern,
      systemType,
      templateName,
      userDesignProfile,
      systemsBuildContext,
      siteElementsLibraryContext,
      vfsFiles,
    } = parsed.data;

    const systemTypeContext = buildSystemTypeContext(systemType ?? null);
    const designProfileContext = buildDesignProfileContext(userDesignProfile ?? null);
    const systemsBuildContextText = buildSystemsBuildContextText(
      systemsBuildContext ?? null,
      systemType ?? null,
      templateName ?? null
    );

    // Fetch learned patterns for edit context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const patterns = await fetchLearnedPatterns(supabaseUrl, supabaseKey);
    const learnedPatterns = formatLearnedPatterns(patterns);

    // Build edit contexts
    const editModeContext = buildEditModeContext(editMode, currentCode ?? null, templateAction ?? null);
    const surgicalEditCtx = buildSurgicalEditReinforcement(surgicalEdit, vfsFiles as Record<string, string> | undefined);

    // Elements library context (skip for surgical edits)
    const elementsLibraryBlock = (siteElementsLibraryContext && !surgicalEdit)
      ? `\n${siteElementsLibraryContext}\n⚠️ LIBRARY USAGE RULE: The element library above provides STRUCTURE and INTENT WIRING patterns only. For colors, fonts, gradients, follow the design profile and brand palette.\n`
      : '';

    // Web research
    const userPromptText = extractTextContent(messages[messages.length - 1]?.content);
    const researchPromise = performPromptResearch(userPromptText);

    // Build system prompt — based on the code mode prompt but focused on editing
    const systemPrompt = `You are an ELITE "Super Web Builder Expert" AI specialized in EDITING existing React/TypeScript web applications.
${editModeContext}

⚠️ CRITICAL OUTPUT FORMAT: REACT/TSX ONLY ⚠️
You MUST generate React/TypeScript components. NEVER generate raw HTML pages or vanilla JavaScript.

⚠️ INLINE ARCHITECTURE RULE ⚠️
All section components (Hero, Features, Testimonials, Footer, etc.) MUST be defined
as named function declarations INSIDE the file they are used in. DO NOT import from
./components/, ./sections/, or any relative path that doesn't exist in the current project.

REACT COMPONENT ARCHITECTURE:
- Export default function components (one per file)
- Use React hooks: useState, useEffect, useRef, useCallback, useMemo
- Use TypeScript interfaces for props and data types
- Use Tailwind CSS utility classes for styling
- Use Lucide React for icons: import { IconName } from "lucide-react";
- Use CSS variables for theming: hsl(var(--primary)), hsl(var(--background)), etc.

WIRING RULES:
- Use data-ut-intent for actions (also keep data-intent for compatibility).
- Use data-ut-cta + data-ut-label on key CTAs.
- UI selectors (tabs, filters, accordions) MUST have data-no-intent.
- Only add data-ut-intent on real conversion CTAs.

NAVIGATION WIRING:
- Navigation links: <a href="/about" data-ut-intent="nav.goto" data-ut-path="/about">About</a>
- Anchor links: <a href="#pricing" data-ut-intent="nav.anchor" data-ut-anchor="pricing">Pricing</a>
- External links: <a href="https://..." data-ut-intent="nav.external" target="_blank" rel="noopener">Link</a>

DESIGN SYSTEM RULES:
- Prefer design tokens: bg-background, text-foreground, bg-card, text-muted-foreground, border-border, bg-primary, text-primary-foreground.

🧠 **LEARNED PATTERNS:**
${learnedPatterns}

**STRUCTURED OUTPUT FORMATS:**
- JSON multi-file: {"files": {"/path/file.tsx": "content"}}
- Single file: \`\`\`tsx code fence

⛔ **NEVER GENERATE:** raw HTML documents, <script> tags, vanilla JS, CDN script tags.`;

    const research = await researchPromise;
    const researchContext = formatResearchContext(research);

    const normalizedMessages: AIMessage[] = messages.map(m => ({ role: m.role, content: m.content ?? '' }));
    const processedMessages = processMessages(normalizedMessages);

    const aiMessages = [
      {
        role: 'system',
        content: systemPrompt + surgicalEditCtx + researchContext + systemTypeContext + designProfileContext + systemsBuildContextText + elementsLibraryBlock + THINKING_INSTRUCTION,
      },
      ...processedMessages,
    ];

    console.log(`[ai-editor] Processing edit: surgicalEdit=${surgicalEdit}, templateAction=${templateAction ?? 'none'}, mode=${mode}`);

    const result: AIProviderResult = await callAIProviders(aiMessages);

    if (!result.ok) {
      const err = result as { ok: false; status: number; error: string; errorType: string };
      return new Response(
        JSON.stringify({ error: err.error, errorType: err.errorType }),
        { status: err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = stripConfigFilesFromOutput(result.content);

    if (savePattern && userPromptText) {
      saveLearnSession(supabaseUrl, supabaseKey, 'edit', userPromptText, content).catch(() => {});
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
