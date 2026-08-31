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

/** Name of the enclosing function declaration for a given source offset. */
function enclosingFunctionName(source: string, offset: number): string | null {
  FUNCTION_HEAD.lastIndex = 0;
  let name: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = FUNCTION_HEAD.exec(source)) !== null) {
    if (match.index > offset) break;
    name = match[1] || match[2] || null;
  }
  return name;
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

    HOOK_CALL.lastIndex = 0;
    let hookMatch: RegExpExecArray | null;
    while ((hookMatch = HOOK_CALL.exec(source)) !== null) {
      // Skip hook *definitions* / imports, only calls matter.
      const before = source.slice(Math.max(0, hookMatch.index - 20), hookMatch.index);
      if (/\bfunction\s+$/.test(before) || /[.\w]$/.test(before)) continue;
      const scope = enclosingFunctionName(source, hookMatch.index);
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
