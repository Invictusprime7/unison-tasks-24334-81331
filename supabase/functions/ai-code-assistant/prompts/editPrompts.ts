/**
 * Edit Mode & Surgical Edit Prompt Builders
 * Extracted from index.ts — no contract changes.
 */

// ── Template action context ──────────────────────────────────────────────────

export function buildTemplateActionContext(templateAction?: string): string {
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
`;
}

// ── Edit mode context ────────────────────────────────────────────────────────

export function buildEditModeContext(
  editMode: boolean,
  currentCode: string | undefined,
  templateStructure: string,
  templateActionContext: string,
): string {
  if (!editMode || !currentCode) return '';
  
  const maxCodeLength = 50_000;
  
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

`;
}

// ── Surgical edit reinforcement ──────────────────────────────────────────────

export function buildSurgicalEditReinforcement(surgicalEdit: boolean, vfsFilesContext: string): string {
  if (!surgicalEdit) return '';
  
  return `

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
`;
}
