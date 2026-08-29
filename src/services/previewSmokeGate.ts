/**
 * Phase 11 — Preview smoke gate.
 *
 * Last deterministic checkpoint before Sandpack receives a bundle:
 *
 *   compile-safe candidate
 *   → snapshot-safe candidate
 *   → VFS-safe candidate
 *   → preview-safe candidate      ← this module
 *   → Sandpack
 *
 * It runs over the *compiled* Sandpack file map (already flattened by
 * sandpackFilePrep) and statically walks the real entry graph. It never
 * synthesizes modules, never rewrites source, and never spins up a second
 * browser runtime — it only proves that what we are about to mount can boot.
 *
 * Detected classes:
 *   - missing entry point                 (boot failure)
 *   - unresolved local module in graph    (module resolution error)
 *   - missing route component module      (missing route component)
 *   - default-import of a module with no default export (React render failure)
 *   - top-level `throw` in a reachable module (top-level execution exception)
 */

import { parseImportStatements, resolveCandidateModule } from './compileSafeGate';
import { PreviewPipelineError } from './previewPipelineError';
import { analyzeComponentContracts } from './componentContractAnalyzer';

export type PreviewSmokeCode =
  | 'MISSING_ENTRY'
  | 'UNRESOLVED_MODULE'
  | 'MISSING_ROUTE_COMPONENT'
  | 'MISSING_DEFAULT_EXPORT'
  | 'INVALID_JSX_COMPONENT_CONTRACT'
  | 'TOP_LEVEL_THROW';

export interface PreviewSmokeDiagnostic {
  path: string;
  code: PreviewSmokeCode;
  message: string;
  specifier?: string;
  severity: 'error' | 'warning';
}

export interface PreviewSmokeResult {
  ok: boolean;
  entryPoint: string | null;
  /** Modules statically reachable from the entry point. */
  reachable: string[];
  diagnostics: PreviewSmokeDiagnostic[];
  blocking: PreviewSmokeDiagnostic[];
}

const DEFAULT_ENTRY_POINTS = ['/index.tsx', '/index.jsx', '/index.ts', '/index.js', '/src/main.tsx'];

const CODE_FILE = /\.(tsx|jsx|ts|js|mjs|cjs)$/;

function isLocalSpecifier(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('@/');
}

function hasDefaultExport(source: string): boolean {
  if (/export\s+default\b/.test(source)) return true;
  if (/export\s*\{[^}]*\bdefault\b[^}]*\}/.test(source)) return true;
  if (/module\.exports\s*=/.test(source)) return true;
  return false;
}

/** `throw` statements at module scope crash the whole bundle on import. */
function findTopLevelThrow(source: string): boolean {
  let depth = 0;
  let inBlockComment = false;
  for (const rawLine of source.split('\n')) {
    let line = rawLine;
    if (inBlockComment) {
      const end = line.indexOf('*/');
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    const blockStart = line.indexOf('/*');
    if (blockStart !== -1 && line.indexOf('*/', blockStart) === -1) {
      line = line.slice(0, blockStart);
      inBlockComment = true;
    }
    const code = line.replace(/\/\/.*$/, '');
    if (depth === 0 && /^\s*throw\s+/.test(code)) return true;
    for (const ch of code) {
      if (ch === '{' || ch === '(' || ch === '[') depth++;
      else if (ch === '}' || ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    }
  }
  return false;
}

function looksLikeRouteHost(path: string): boolean {
  return /\/App\.(t|j)sx?$/.test(path) || /\/pages\//.test(path);
}

/** A route target is a component module (PascalCase basename or /pages/ path). */
function looksLikeRouteTarget(specifier: string): boolean {
  if (/\/pages?\//.test(specifier)) return true;
  const base = specifier.split('/').pop() ?? '';
  return /^[A-Z][A-Za-z0-9]*(\.(t|j)sx?)?$/.test(base);
}

/**
 * Statically boot-check the compiled preview bundle.
 * Read-only: the returned file map is the input, untouched.
 */
export function runPreviewSmokeGate(
  files: Record<string, string>,
  options: { entryPoints?: string[] } = {},
): PreviewSmokeResult {
  const diagnostics: PreviewSmokeDiagnostic[] = [];
  const paths = new Set(Object.keys(files));
  const entryCandidates = options.entryPoints ?? DEFAULT_ENTRY_POINTS;
  const entryPoint = entryCandidates.find((candidate) => paths.has(candidate)) ?? null;

  if (!entryPoint) {
    diagnostics.push({
      path: entryCandidates[0] ?? '/index.tsx',
      code: 'MISSING_ENTRY',
      message: `preview bundle has no entry point (looked for ${entryCandidates.join(', ')})`,
      severity: 'error',
    });
    return { ok: false, entryPoint: null, reachable: [], diagnostics, blocking: diagnostics };
  }

  const reachable: string[] = [];
  const seen = new Set<string>([entryPoint]);
  const queue: string[] = [entryPoint];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    const source = files[current];
    if (typeof source !== 'string') continue;
    reachable.push(current);
    if (!CODE_FILE.test(current)) continue;

    if (findTopLevelThrow(source)) {
      diagnostics.push({
        path: current,
        code: 'TOP_LEVEL_THROW',
        message: 'module throws at top level and will crash the preview on import',
        severity: 'error',
      });
    }

    for (const imported of parseImportStatements(source)) {
      const specifier = imported.source;
      if (!isLocalSpecifier(specifier)) continue;

      const resolved = resolveCandidateModule(current, specifier, paths);
      if (!resolved) {
        const routeLike = looksLikeRouteHost(current) && looksLikeRouteTarget(specifier);
        diagnostics.push({
          path: current,
          code: routeLike ? 'MISSING_ROUTE_COMPONENT' : 'UNRESOLVED_MODULE',
          message: routeLike
            ? `route module '${specifier}' is not present in the preview bundle`
            : `local module '${specifier}' is not present in the preview bundle`,
          specifier,
          severity: 'error',
        });
        continue;
      }

      const target = files[resolved];
      if (
        typeof target === 'string' &&
        CODE_FILE.test(resolved) &&
        Boolean(imported.defaultName) &&
        !imported.typeOnly &&
        !hasDefaultExport(target)
      ) {
        diagnostics.push({
          path: current,
          code: 'MISSING_DEFAULT_EXPORT',
          message: `'${specifier}' is default-imported but exports no default binding`,
          specifier,
          severity: 'error',
        });
      }

      if (!seen.has(resolved)) {
        seen.add(resolved);
        queue.push(resolved);
      }
    }
  }

  // Component-contract findings are advisory only. Generated UI facades
  // (icons/button/motion/radix) legitimately forward values static analysis
  // cannot prove, so they must never block a preview that otherwise boots.
  const reachableSet = new Set(reachable);
  const componentContracts = analyzeComponentContracts(files, { importerPaths: reachableSet });
  for (const contract of componentContracts.diagnostics) {
    diagnostics.push({
      path: contract.importerPath,
      code: 'INVALID_JSX_COMPONENT_CONTRACT',
      message: contract.message,
      specifier: contract.specifier,
      severity: 'warning',
    });
  }


  const blocking = diagnostics.filter((d) => d.severity === 'error');
  return { ok: blocking.length === 0, entryPoint, reachable, diagnostics, blocking };
}

/** Compact log-safe summary — never dumps generated source. */
export function summarizePreviewSmoke(diagnostics: PreviewSmokeDiagnostic[]): string {
  if (diagnostics.length === 0) return 'clean';
  const counts = new Map<PreviewSmokeCode, number>();
  for (const d of diagnostics) counts.set(d.code, (counts.get(d.code) ?? 0) + 1);
  return [...counts.entries()].map(([code, n]) => `${code}×${n}`).join(', ');
}

/**
 * Throwing form used by the preview compiler. Surfaces the failure through the
 * existing PreviewRuntimeError panel instead of letting Sandpack be the first
 * system to notice.
 */
export function assertPreviewSmokeSafe(
  files: Record<string, string>,
  context: string,
  options: { entryPoints?: string[] } = {},
): PreviewSmokeResult {
  const result = runPreviewSmokeGate(files, options);
  if (result.ok) return result;

  const detail = result.blocking
    .slice(0, 8)
    .map((d) => `${d.path}: ${d.message}`)
    .join('; ');

  throw new PreviewPipelineError(
    'sandpack',
    `${context}: preview smoke gate rejected the bundle (${summarizePreviewSmoke(result.blocking)}) — ${detail}`,
    {
      blockedFiles: [...new Set(result.blocking.map((d) => d.path))],
      diagnostics: result.blocking.map((d) => ({
        path: d.path,
        error: `${d.code}: ${d.message}`,
        repairPasses: [],
      })),
      recoverableByRelaunch: true,
    },
  );
}
