/**
 * Builder Lane Prompt Builders
 * Specialized prompt assembly for Lane B (in-builder editing).
 * Each function returns a complete system prompt for a specific task type.
 * 
 * Key difference from Lane A: these prompts include session memory,
 * diagnostics context, and task-specific preambles for smarter edits.
 */

/**
 * Build the edit assistant system prompt — for surgical, single-file, and multi-file edits.
 */
export function buildEditAssistantPrompt(opts: {
  basePrompt: string;
  memoryBlock: string;
  compactedFilesBlock: string;
  surgicalReinforcement: string;
  researchContext: string;
  designContext: string;
  blueprintContext: string;
  elementsLibrary: string;
  thinkingInstruction: string;
  behavioralContext?: string;
}): string {
  const editPreamble = `
[EDIT MODE — PRECISION PRIORITY]
You are modifying an existing live project. Follow these priorities:
1. Apply ONLY the changes the user requested — nothing more
2. Preserve all existing imports, hooks, state, and component structure
3. If session context shows broken imports or recent errors, address those first
4. For multi-file edits, output JSON: {"files": {"path": "content"}}
5. For single-file edits, output a \`\`\`tsx code fence with the complete file
6. NEVER remove sections, components, or functionality unless explicitly asked
`;

  const behavioralBlock = opts.behavioralContext ? `
[🧠 BEHAVIORAL EDIT MODE — FUNCTIONAL CHANGES AUTHORIZED]
You have full authority to add, modify, or rewire component BEHAVIOR and FUNCTIONALITY.
This includes: adding useState, useEffect, useCallback, useRef hooks; creating event handlers
(onClick, onSubmit, onChange, onKeyDown); adding conditional rendering based on state;
creating helper functions inside components; wiring elements to open modals, toggles,
drawers, tooltips, or any interactive UI pattern.

BEHAVIORAL AWARENESS (live preview snapshot):
${opts.behavioralContext}

BEHAVIORAL EDIT RULES:
1. READ the behavior map above to understand what interactive elements exist and what they currently do
2. Identify the TARGET element(s) the user is referring to from the behavior map
3. Find the SOURCE FILE for the target element (listed in the map)
4. Add the minimum hooks/state/handlers needed to achieve the requested behavior
5. If the element already has handlers, EXTEND them — don't replace unless asked
6. If you need new state (e.g., isOpen, messages[], inputValue), use React useState
7. If you need side effects (e.g., fetch data, listen for events), use useEffect
8. For complex interactions (chat widget, cart drawer, modals), create the UI inline
   in the same component using conditional rendering with state toggles
9. Wire the trigger element with an onClick/onSubmit that toggles the state
10. Preserve ALL existing visual styling — behavioral edits change LOGIC, not APPEARANCE
    (unless the new behavior requires new UI elements, which should match existing theme)
11. Use data-ut-intent attributes when the behavior maps to a known system intent
12. For new interactive sub-components (e.g., chat panel), render them conditionally
    within the existing component tree — do NOT create separate files unless
    the component would exceed ~200 lines

EXAMPLES OF BEHAVIORAL EDITS:
- "Make the chat bubble open a chat widget" → Add isOpen state + onClick toggle + render chat panel
- "Add a click counter to this button" → Add count state + onClick increment + display count
- "Make this form submit to the backend" → Add onSubmit handler + fetch call + loading/success state
- "Add a dark mode toggle" → Add isDark state + toggle handler + apply class conditionally
- "Make this accordion collapsible" → Add openIndex state + onClick toggle + conditional rendering
` : '';

  return opts.basePrompt
    + editPreamble
    + behavioralBlock
    + opts.surgicalReinforcement
    + opts.memoryBlock
    + opts.compactedFilesBlock
    + opts.researchContext
    + opts.designContext
    + opts.blueprintContext
    + opts.elementsLibrary
    + opts.thinkingInstruction;
}

/**
 * Build the debug assistant system prompt — for error fixing and diagnostics.
 */
export function buildDebugAssistantPrompt(opts: {
  basePrompt: string;
  memoryBlock: string;
  compactedFilesBlock: string;
  thinkingInstruction: string;
}): string {
  const debugPreamble = `
[DEBUG MODE — DIAGNOSTIC PRIORITY]
The user is reporting a bug or error. Your approach:

1. DIAGNOSE: Identify the root cause from the error message, stack trace, and code context
2. LOCATE: Find the exact file(s) and line(s) causing the issue
3. FIX: Provide a targeted fix — modify ONLY the file(s) that contain the bug
4. VERIFY: Explain what was wrong and why the fix resolves it

COMMON PATTERNS TO CHECK:
- Import paths: verify the imported module exists in the project files
- Type mismatches: check interfaces/types match usage
- Missing dependencies: check if a component/hook is used but not imported
- Null/undefined access: check for optional chaining needs
- State updates: check for stale closures in useEffect/useCallback
- CSS class conflicts: check for Tailwind class contradictions

CRITICAL RULES:
- Do NOT refactor unrelated code
- Do NOT add new features alongside the fix
- Do NOT change styling unless it's the source of the bug
- Output the fixed file(s) in JSON format: {"files": {"path": "content"}}
- If the error is in the session context diagnostics, prioritize that
`;

  return opts.basePrompt
    + debugPreamble
    + opts.memoryBlock
    + opts.compactedFilesBlock
    + opts.thinkingInstruction;
}

/**
 * Build the general builder assistant prompt — for open-ended builder questions.
 */
export function buildGeneralBuilderPrompt(opts: {
  basePrompt: string;
  memoryBlock: string;
  compactedFilesBlock: string;
  researchContext: string;
  industryPageContext: string;
  designContext: string;
  blueprintContext: string;
  elementsLibrary: string;
  thinkingInstruction: string;
  imageContext: string;
}): string {
  const generalPreamble = `
[BUILDER ASSISTANT MODE]
You are helping the user build and improve their web application.
- If session context shows recent errors or broken imports, mention them proactively
- Prefer actionable code output over explanations
- For new features: output complete, working React/TSX components
- For questions: be concise, then offer to implement
- Match the existing project's design system and patterns
`;

  return opts.basePrompt
    + generalPreamble
    + opts.memoryBlock
    + opts.compactedFilesBlock
    + opts.researchContext
    + opts.industryPageContext
    + opts.designContext
    + opts.blueprintContext
    + opts.elementsLibrary
    + opts.thinkingInstruction
    + opts.imageContext;
}
