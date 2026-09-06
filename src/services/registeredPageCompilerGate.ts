/**
 * M4 — Generated-page compiler gates.
 *
 * Structural validation of every REGISTERED page body accepted into the sealed
 * SiteBundleSnapshot. This is deliberately separate from presentation scoring:
 * everything reported here is a *blocking structural* defect that would surface
 * in the Sandpack runtime as a blank route, an unresolved module, or a React
 * hook-order crash.
 *
 * Syntax parsing and import-closure healing already run inside the preflight
 * pipeline; this gate is the final, mutation-free assertion pass.
 */
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import { GENERATED_UI_BARREL_EXPORTS } from '@/platform/core/generatedUiFoundation';

export interface PageCompilerViolation {
  filePath: string;
  kind: 'missing-body' | 'missing-default-export' | 'unsupported-ui-export' | 'hook-outside-component';
  detail: string;
}

export interface PageCompilerGateResult {
  ok: boolean;
  violations: PageCompilerViolation[];
  checkedFiles: string[];
}

const DEFAULT_EXPORT = /export\s+default\s+/;
const UNISON_UI_NAMED_IMPORT = /import\s*\{([^}]+)\}\s*from\s*['"]@\/unison\/ui['"]/g;
const HOOK_CALL = /\b(use[A-Z][A-Za-z0-9_]*)\s*\(/g;
const FUNCTION_HEAD = /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)|\b(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/g;

function normalize(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

interface FunctionScope {
  name: string;
  bodyStart: number;
  bodyEnd: number;
}

/** Index of the matching closer for the bracket at openIndex, or -1. */
function matchBracket(source: string, openIndex: number, open: string, close: string): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function matchBrace(source: string, openIndex: number): number {
  return matchBracket(source, openIndex, '{', '}');
}

/** First non-whitespace index at or after `from`. */
function skipWhitespace(source: string, from: number): number {
  let i = from;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  return i;
}

/** Collect function scopes with their real body ranges (brace-matched). */
function collectFunctionScopes(source: string): FunctionScope[] {
  const scopes: FunctionScope[] = [];
  FUNCTION_HEAD.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FUNCTION_HEAD.exec(source)) !== null) {
    const name = match[1] || match[2];
    if (!name) continue;
    const end = match.index + match[0].length;

    let bodyStart: number;
    if (match[2]) {
      // Arrow function: the head already consumed `=>`. A concise body (no
      // braces) has no scope range to track.
      bodyStart = skipWhitespace(source, end);
      if (source[bodyStart] !== '{') continue;
    } else {
      // Declaration: skip the parameter list before looking for the body, or a
      // destructured parameter object is mistaken for the function body.
      const parenStart = source.indexOf('(', end);
      if (parenStart === -1) continue;
      const parenEnd = matchBracket(source, parenStart, '(', ')');
      if (parenEnd === -1) continue;
      let cursor = skipWhitespace(source, parenEnd + 1);
      if (source[cursor] === ':') {
        // Return type annotation — the body brace follows it.
        cursor = source.indexOf('{', cursor);
        if (cursor === -1) continue;
      }
      if (source[cursor] !== '{') continue;
      bodyStart = cursor;
    }

    const bodyEnd = matchBrace(source, bodyStart);
    if (bodyEnd === -1) continue;
    scopes.push({ name, bodyStart, bodyEnd });
  }
  return scopes;
}

/**
 * Innermost function scope whose brace-matched body contains the offset.
 * Purely positional lookup — a helper arrow declared *before* a hook call no
 * longer shadows the component that actually encloses it.
 */
function enclosingFunctionName(scopes: readonly FunctionScope[], offset: number): string | null {
  let best: FunctionScope | null = null;
  for (const scope of scopes) {
    if (offset <= scope.bodyStart || offset >= scope.bodyEnd) continue;
    if (!best || scope.bodyStart > best.bodyStart) best = scope;
  }
  return best?.name ?? null;
}

function isReactScope(name: string | null): boolean {
  if (!name) return false;
  return /^[A-Z]/.test(name) || /^use[A-Z]/.test(name);
}


export function validateRegisteredPageCompilation(
  files: Record<string, string>,
  snapshot: SiteBundleSnapshot,
): PageCompilerGateResult {
  const violations: PageCompilerViolation[] = [];
  const checkedFiles: string[] = [];

  for (const page of Object.values(snapshot.pageRegistry.pages)) {
    const filePath = (page as { filePath?: string }).filePath;
    if (!filePath) continue;
    const normalized = normalize(filePath);
    const source = files[normalized] ?? files[filePath];

    if (!source || !source.trim()) {
      violations.push({
        filePath: normalized,
        kind: 'missing-body',
        detail: 'Registered page has no authored module in the sealed VFS.',
      });
      continue;
    }
    checkedFiles.push(normalized);

    if (!DEFAULT_EXPORT.test(source)) {
      violations.push({
        filePath: normalized,
        kind: 'missing-default-export',
        detail: 'Registered page must expose a default-exported React component.',
      });
    }

    UNISON_UI_NAMED_IMPORT.lastIndex = 0;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = UNISON_UI_NAMED_IMPORT.exec(source)) !== null) {
      const symbols = importMatch[1]
        .split(',')
        .map((entry) => entry.replace(/\btype\b/, '').split(/\bas\b/)[0].trim())
        .filter(Boolean);
      for (const symbol of symbols) {
        if (!GENERATED_UI_BARREL_EXPORTS.has(symbol)) {
          violations.push({
            filePath: normalized,
            kind: 'unsupported-ui-export',
            detail: `"${symbol}" is not exported by the @/unison/ui foundation barrel.`,
          });
        }
      }
    }

    const functionScopes = collectFunctionScopes(source);
    HOOK_CALL.lastIndex = 0;
    let hookMatch: RegExpExecArray | null;
    while ((hookMatch = HOOK_CALL.exec(source)) !== null) {
      // Skip hook *definitions* / imports, only calls matter.
      const before = source.slice(Math.max(0, hookMatch.index - 20), hookMatch.index);
      if (/\bfunction\s+$/.test(before) || /[.\w]$/.test(before)) continue;
      const scope = enclosingFunctionName(functionScopes, hookMatch.index);

      if (!isReactScope(scope)) {
        violations.push({
          filePath: normalized,
          kind: 'hook-outside-component',
          detail: `${hookMatch[1]}() is called outside a React component or custom hook${scope ? ` (in "${scope}")` : ' (module scope)'}.`,
        });
      }
    }
  }

  return { ok: violations.length === 0, violations, checkedFiles };
}

export function formatPageCompilerViolations(violations: readonly PageCompilerViolation[]): string {
  return violations
    .map((violation) => `${violation.filePath} [${violation.kind}]: ${violation.detail}`)
    .join(' | ');
}
