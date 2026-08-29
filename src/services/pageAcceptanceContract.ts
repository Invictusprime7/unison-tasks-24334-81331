/**
 * pageAcceptanceContract — generation-time page correctness gate.
 *
 * The launcher used to prove correctness at the END of the pipeline
 * (module-closure ladder, companion synthesis, Sandpack export synthesis).
 * Each of those layers exists to rescue a page the generator already got
 * wrong. This contract moves the proof UPSTREAM: a page is only accepted
 * from Lane B when it compiles and closes its own imports/exports while the
 * AI brain is still in the loop to regenerate it.
 *
 * What it checks, per page, over the page's authored module subgraph:
 *   1. Babel parse of every authored file          → PAGE_SYNTAX_ERROR
 *   2. Every local import resolves                 → PAGE_UNRESOLVED_IMPORT
 *   3. Every JSX binding matches a real export     → PAGE_JSX_CONTRACT
 *   4. The page module default-exports a component → PAGE_MISSING_DEFAULT_EXPORT
 *
 * Read-only: the input file map is never mutated. Repair is the caller's job
 * (regenerate with the diagnostics inlined); rescue synthesis downstream is
 * the logged last resort.
 */

import { parseImportStatements, resolveCandidateModule } from './compileSafeGate';
import { parseGeneratedSource } from './aiSitePreflightRepair';
import { analyzeComponentContracts } from './componentContractAnalyzer';
import { hasExplicitModuleExtension } from './laneBCompanionModules';

export type PageAcceptanceCode =
  | 'PAGE_MISSING_MODULE'
  | 'PAGE_SYNTAX_ERROR'
  | 'PAGE_UNRESOLVED_IMPORT'
  | 'PAGE_JSX_CONTRACT'
  | 'PAGE_MISSING_DEFAULT_EXPORT';

export interface PageAcceptanceDiagnostic {
  path: string;
  code: PageAcceptanceCode;
  message: string;
  specifier?: string;
  line?: number;
}

export interface PageAcceptanceResult {
  ok: boolean;
  pagePath: string;
  /** Authored files statically reachable from the page (page included). */
  reachable: string[];
  diagnostics: PageAcceptanceDiagnostic[];
}

const CODE_FILE = /\.(tsx|jsx|ts|js|mjs|cjs)$/;
const ASSET_OR_STYLE = /\.(css|scss|less|svg|png|jpe?g|webp|gif|avif|json)$/i;

function normalizePath(path: string): string {
  return `/${path.replace(/\\/g, '/').replace(/^\/+/, '')}`.replace(/\/+/g, '/');
}

function isLocalSpecifier(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('@/');
}

function hasDefaultExport(source: string): boolean {
  return /export\s+default\b/.test(source) || /export\s*\{[^}]*\bdefault\b[^}]*\}/.test(source);
}

/**
 * Check one page and the authored modules it imports.
 *
 * @param files       Merged file map used for resolution (authored output
 *                    overlaid on the canonical scaffold).
 * @param pagePath    The page module under acceptance.
 * @param authoredPaths Paths the generator authored this turn. Reachability
 *                    and diagnostics are restricted to this set; imports that
 *                    resolve into canonical scaffold files are trusted.
 */
export function checkPageAcceptance(
  files: Record<string, string>,
  pagePath: string,
  authoredPaths?: Iterable<string>,
): PageAcceptanceResult {
  const normalizedPage = normalizePath(pagePath);
  const normalizedFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(files || {})) {
    if (typeof content === 'string') normalizedFiles[normalizePath(path)] = content;
  }
  const allPaths = new Set(Object.keys(normalizedFiles));
  const authored = new Set(
    authoredPaths
      ? Array.from(authoredPaths, normalizePath)
      : Object.keys(normalizedFiles),
  );

  const diagnostics: PageAcceptanceDiagnostic[] = [];
  const pageSource = normalizedFiles[normalizedPage];
  if (typeof pageSource !== 'string' || !pageSource.trim()) {
    diagnostics.push({
      path: normalizedPage,
      code: 'PAGE_MISSING_MODULE',
      message: `page module ${normalizedPage} is not present in the generated output`,
    });
    return { ok: false, pagePath: normalizedPage, reachable: [], diagnostics };
  }

  // ── 1. Walk the authored subgraph reachable from the page ──────────────
  const reachable: string[] = [];
  const seen = new Set<string>([normalizedPage]);
  const queue: string[] = [normalizedPage];
  const importsByFile = new Map<string, ReturnType<typeof parseImportStatements>>();

  while (queue.length > 0) {
    const current = queue.shift() as string;
    const source = normalizedFiles[current];
    if (typeof source !== 'string' || !CODE_FILE.test(current)) continue;
    reachable.push(current);

    const imports = parseImportStatements(source);
    importsByFile.set(current, imports);
    for (const imported of imports) {
      if (!isLocalSpecifier(imported.source) || ASSET_OR_STYLE.test(imported.source)) continue;
      if (imported.typeOnly) continue;
      const resolved = resolveCandidateModule(current, imported.source, allPaths);
      if (!resolved) {
        diagnostics.push({
          path: current,
          code: 'PAGE_UNRESOLVED_IMPORT',
          specifier: imported.source,
          message: `${current} imports '${imported.source}', which was not authored and does not exist in the project`,
        });
        continue;
      }
      if (!seen.has(resolved) && authored.has(resolved) && CODE_FILE.test(resolved)) {
        seen.add(resolved);
        queue.push(resolved);
      }
    }
  }

  // ── 2. Parse every authored file in the subgraph ───────────────────────
  for (const path of reachable) {
    if (!hasExplicitModuleExtension(path) || !CODE_FILE.test(path)) continue;
    const parsed = parseGeneratedSource(normalizedFiles[path]);
    if (parsed.ok === false) {
      const failureLine = parsed.line;
      const failureColumn = parsed.column;
      diagnostics.push({
        path,
        code: 'PAGE_SYNTAX_ERROR',
        line: failureLine,
        message: `${path} does not parse${failureLine ? ` (line ${failureLine}${failureColumn ? `:${failureColumn}` : ''})` : ''}: ${parsed.error}`,
      });
    }
  }

  // ── 3. Validate JSX bindings against real exports in the subgraph ──────
  const contractResult = analyzeComponentContracts(normalizedFiles, {
    importerPaths: new Set(reachable.filter((path) => /\.(tsx|jsx)$/.test(path))),
  });
  for (const contract of contractResult.diagnostics) {
    diagnostics.push({
      path: contract.importerPath,
      code: 'PAGE_JSX_CONTRACT',
      specifier: contract.specifier,
      message: contract.message,
    });
  }

  // ── 4. The page itself must default-export its component ───────────────
  if (!hasDefaultExport(pageSource)) {
    diagnostics.push({
      path: normalizedPage,
      code: 'PAGE_MISSING_DEFAULT_EXPORT',
      message: `${normalizedPage} has no default export; the router renders pages via default import`,
    });
  }

  return { ok: diagnostics.length === 0, pagePath: normalizedPage, reachable, diagnostics };
}

/** Compact single-line reason suitable for the Lane B retry prompt ledger. */
export function formatPageAcceptanceFailure(result: PageAcceptanceResult): string {
  const first = result.diagnostics[0];
  const count = result.diagnostics.length;
  const suffix = count > 1 ? ` (+${count - 1} more)` : '';
  return first ? `${first.message}${suffix}` : `page ${result.pagePath} failed acceptance`;
}

/**
 * Prompt directive telling the model how to satisfy the contract on retry.
 * Inlined verbatim into the Lane B completion prompt when acceptance failed.
 */
export function buildPageAcceptanceRepairDirective(result: PageAcceptanceResult): string {
  const unresolved = result.diagnostics.filter((d) => d.code === 'PAGE_UNRESOLVED_IMPORT');
  const contract = result.diagnostics.filter((d) => d.code === 'PAGE_JSX_CONTRACT');
  const lines: string[] = ['PAGE CONTRACT REPAIR REQUIRED:'];
  if (unresolved.length > 0) {
    lines.push(
      `Your page imports modules that were not emitted: ${unresolved
        .map((d) => `'${d.specifier}' (imported by ${d.path})`)
        .join(', ')}. Emit EVERY module your page imports under its exact imported path in the same "files" object, or remove the import.`,
    );
  }
  if (contract.length > 0) {
    lines.push(
      `JSX import/export mismatches: ${contract
        .slice(0, 3)
        .map((d) => d.message)
        .join(' | ')}. Match the import style to the target module's actual exports (default vs named).`,
    );
  }
  if (result.diagnostics.some((d) => d.code === 'PAGE_MISSING_DEFAULT_EXPORT')) {
    lines.push('The page file must end with a default export of its component.');
  }
  return lines.join('\n');
}
