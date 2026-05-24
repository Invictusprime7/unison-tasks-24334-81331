/**
 * AI patch validation guards extracted from AIBuilderPanel.tsx (C0).
 * Pure functions — no React, no toast/IO. Behavior preserved verbatim.
 */

export interface ScopedEditAutoApplyOptions {
  files: Record<string, string>;
  resolvedTargetFile: string | null;
  existingFileKeys: string[];
}

/**
 * Client-side scope guard — returns a human-readable reason to block auto-apply
 * if a scoped edit touches unauthorized files or creates too many new files.
 * Returns `null` when the patch is safe to auto-apply.
 */
export function getScopedEditAutoApplyBlockReason(
  opts: ScopedEditAutoApplyOptions,
): string | null {
  const normalizePath = (p: string) => (p.startsWith('/') ? p : `/${p}`);
  const paths = Object.keys(opts.files).map(normalizePath);

  if (opts.resolvedTargetFile) {
    const normTarget = normalizePath(opts.resolvedTargetFile);
    const existingNorm = opts.existingFileKeys.map(normalizePath);
    const targetExists = existingNorm.includes(normTarget);
    // Only hard-block when the resolved target actually exists in the VFS.
    // If it doesn't exist, the resolver was speculative (e.g. a page that
    // hasn't been scaffolded yet) — let the AI create/choose the right file.
    if (targetExists && !paths.includes(normTarget)) {
      return `Scoped edit did not update the resolved target file (${normTarget}).`;
    }
  }

  if (paths.length > 3) {
    return `Scoped edit produced ${paths.length} files — likely a full regeneration.`;
  }

  const existingNorm = opts.existingFileKeys.map(normalizePath);
  const newFiles = paths.filter((p) => !existingNorm.includes(p));
  if (newFiles.length > 1) {
    return `Scoped edit created ${newFiles.length} new files — expected at most 1.`;
  }

  return null;
}

/**
 * Heuristic: does the string look like actual source code (not AI prose)?
 * Mirrors the inline check previously embedded in AIBuilderPanel auto-apply.
 *
 * Note: a separate `looksLikeCode` exists in `@/utils/aiCodeCleaner` used by
 * WebBuilder. This variant is permissive about raw HTML documents because the
 * AI panel may emit a full `<!DOCTYPE html>` payload that gets wrapped later.
 */
export function looksLikeGeneratedCode(content: string): boolean {
  return (
    content.includes('import ') ||
    content.includes('export ') ||
    content.includes('function ') ||
    content.includes('dangerouslySetInnerHTML') ||
    content.includes('return (') ||
    /^\s*<!DOCTYPE/i.test(content) ||
    /^\s*<html[\s>]/i.test(content)
  );
}

/**
 * Heuristic: does the first ~300 chars sound like AI reasoning prose?
 */
export function looksLikeAIProse(content: string): boolean {
  return /\b(I will|I need to|I'll|Let me|inspired|simplified|Here's my|I'm going to)\b/i.test(
    content.slice(0, 300),
  );
}
