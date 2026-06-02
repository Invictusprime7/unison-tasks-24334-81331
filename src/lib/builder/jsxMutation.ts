/**
 * JSX source mutation primitives extracted from WebBuilder.tsx (C0).
 * Pure parsing — no React, no DOM. Behavior identical to in-file originals.
 */

/**
 * Extract the JSX return body from a React component.
 * Handles both `return (...)` and arrow `=> (...)` patterns.
 *
 * Returns the inner JSX, the prefix up to and including the opening paren,
 * and the suffix starting at the closing paren — so callers can splice safely.
 */
export function extractJsxReturnBody(
  code: string,
): { jsx: string; before: string; after: string } | null {
  let returnIdx = code.search(/return\s*\(/);
  if (returnIdx === -1) {
    returnIdx = code.search(/=>\s*\(/);
  }
  if (returnIdx === -1) return null;

  const parenStart = code.indexOf('(', returnIdx);
  let depth = 0;
  let parenEnd = -1;
  let inString: string | null = null;
  let escaped = false;
  for (let i = parenStart; i < code.length; i++) {
    const ch = code[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) { parenEnd = i; break; }
    }
  }
  if (parenEnd === -1) return null;

  const jsx = code.slice(parenStart + 1, parenEnd).trim();
  const before = code.slice(0, parenStart + 1);
  const after = code.slice(parenEnd);
  return { jsx, before, after };
}
