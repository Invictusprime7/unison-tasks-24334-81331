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

function hasCodeDumpToken(content: string): boolean {
  return /\b(import\s+React|export\s+default|function\s+App|ReactDOM\.createRoot|className=|dangerouslySetInnerHTML)\b/.test(content) ||
    /<!DOCTYPE\s+html|<html[\s>]|```(?:tsx|jsx|ts|js|html|css)?/i.test(content) ||
    /["']files["']\s*:\s*\{/.test(content);
}

function looksLikeSerializedFilesPayload(content: string): boolean {
  const trimmed = content.trim();
  return (
    /^\{[\s\S]*["']files["']\s*:\s*\{/.test(trimmed) ||
    /^```json\s*\n?\{[\s\S]*["']files["']\s*:\s*\{/i.test(trimmed)
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findCodeDumpVariables(content: string): string[] {
  const variables = new Set<string>();
  const assignmentRegex =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*(`[\s\S]*?`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;

  let match: RegExpExecArray | null;
  while ((match = assignmentRegex.exec(content)) !== null) {
    if (hasCodeDumpToken(match[2] || '')) {
      variables.add(match[1]);
    }
  }

  return Array.from(variables);
}

function rendersCodeDumpVariable(content: string, variableName: string): boolean {
  const name = escapeRegex(variableName);
  const codeElementPattern = new RegExp(
    `<(?:pre|code|textarea)\\b[^>]*>[\\s\\S]{0,6000}\\{\\s*${name}\\s*\\}[\\s\\S]{0,6000}<\\/(?:pre|code|textarea)>`,
    'i',
  );
  if (codeElementPattern.test(content)) return true;

  const codeClassPattern = new RegExp(
    `<[A-Za-z][\\w.:-]*\\b[^>]*className\\s*=\\s*["'][^"']*(?:whitespace-pre|font-mono|language-|syntax|highlight)[^"']*["'][^>]*>[\\s\\S]{0,6000}\\{\\s*${name}\\s*\\}[\\s\\S]{0,6000}<\\/`,
    'i',
  );
  return codeClassPattern.test(content);
}

function rendersInlineCodeDumpLiteral(content: string): boolean {
  const renderedBlocks = content.match(
    /<(?:pre|code|textarea)\b[^>]*>[\s\S]{0,8000}<\/(?:pre|code|textarea)>/gi,
  ) || [];

  return renderedBlocks.some((block) => {
    const literalMatch = block.match(/\{\s*(`[\s\S]*?`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\}/);
    return Boolean(literalMatch && hasCodeDumpToken(literalMatch[1] || ''));
  });
}

/**
 * Production preview guard: returns a reason when generated source is likely
 * to render raw code/JSON strings instead of a website UI.
 */
export function getPreviewCodeLeakReason(content: string, path = 'generated file'): string | null {
  if (!content || typeof content !== 'string') return null;

  const trimmed = content.trim();
  if (looksLikeSerializedFilesPayload(trimmed)) {
    return `${path} is a serialized files payload, not renderable source.`;
  }

  if (/^```[\w-]*\s*\n/.test(trimmed) || /\n```\s*$/.test(trimmed)) {
    return `${path} still contains markdown code fences.`;
  }

  const codeDumpVariables = findCodeDumpVariables(trimmed);
  const rendersCodeDump = codeDumpVariables.some((variableName) =>
    rendersCodeDumpVariable(trimmed, variableName),
  ) || rendersInlineCodeDumpLiteral(trimmed);

  if (rendersCodeDump) {
    return `${path} appears to render source code or JSON as page content.`;
  }

  return null;
}
