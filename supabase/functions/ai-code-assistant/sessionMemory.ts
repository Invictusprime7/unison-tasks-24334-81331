/**
 * Session Memory — OpenClaude-style compact memory for Lane B (in-builder edits).
 * NOT used for Wizard fast path (Lane A).
 */

export interface BuilderSessionMemory {
  userGoal?: string;
  businessType?: string;
  templateName?: string;
  aesthetic?: string;
  activeFiles?: string[];
  unresolvedIssues?: string[];
  recentChanges?: string[];
}

/**
 * Build a compact session memory summary from request fields.
 * Designed to be lightweight — no DB calls, no persistence.
 */
export function buildSessionMemory(opts: {
  userPromptText: string;
  systemType?: string;
  source?: string;
  templateName?: string;
  aesthetic?: string;
  vfsFiles?: Record<string, string>;
}): BuilderSessionMemory {
  return {
    userGoal: opts.userPromptText.slice(0, 600) || undefined,
    businessType: opts.systemType ?? opts.source ?? undefined,
    templateName: opts.templateName ?? undefined,
    aesthetic: opts.aesthetic ?? undefined,
    activeFiles: opts.vfsFiles ? Object.keys(opts.vfsFiles).slice(0, 20) : undefined,
  };
}

/**
 * Format session memory into a compact prompt block.
 * Returns empty string if memory has no meaningful content.
 */
export function formatSessionMemoryBlock(memory?: BuilderSessionMemory): string {
  if (!memory) return '';

  const lines: string[] = [];
  if (memory.businessType) lines.push(`Business: ${memory.businessType}`);
  if (memory.templateName) lines.push(`Template: ${memory.templateName}`);
  if (memory.aesthetic) lines.push(`Aesthetic: ${memory.aesthetic}`);
  if (memory.activeFiles?.length) lines.push(`Active files: ${memory.activeFiles.join(', ')}`);
  if (memory.unresolvedIssues?.length) lines.push(`Open issues: ${memory.unresolvedIssues.join(' | ')}`);

  return lines.length ? `\n[SESSION CONTEXT]\n${lines.join('\n')}\n` : '';
}
