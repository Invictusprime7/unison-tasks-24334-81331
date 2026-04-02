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

  return opts.basePrompt
    + editPreamble
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
