/**
 * Builder Lane Prompt Builders
 * Specialized prompt assembly for Lane B (in-builder editing).
 * Each function returns a complete system prompt for a specific task type.
 */

import type { BuilderSessionMemory } from "../sessionMemory.ts";

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
  return opts.basePrompt
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
The user is reporting a bug or error. Your first priority is:
1. Identify the root cause from the error message and code context
2. Explain the issue concisely
3. Provide a targeted fix — modify ONLY the file(s) that contain the bug
4. If the error is in an import path, verify it exists in the project files
5. If the error is a type mismatch, check the interfaces/types in context

Do NOT refactor unrelated code. Do NOT add new features. Fix the specific issue.
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
  return opts.basePrompt
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
