/**
 * Compile-Safe Acceptance Boundary
 * --------------------------------
 *
 * Deterministic membrane that sits between AI generation (Lane A → Lane B →
 * Stage 4b) and canonical runtime state (SiteBundleSnapshot → VFS → Sandpack).
 *
 * This is NOT a second pipeline: it is a stage library consumed by the single
 * canonical acceptance entry point (`runFullPreflight`), which is what
 * `VFSCommitService` already runs before a commit becomes canonical.
 *
 * Responsibilities (deterministic only — no generation, no redesign):
 *   A. Parse validation           (@babel/standalone, same parser as preview)
 *   B. Import normalization       (merge duplicate/compatible imports)
 *   C. React/hook import closure  (hooks used but never imported)
 *   D. External dependency check  (SANDPACK_DEPENDENCIES is the only truth)
 *   E. Candidate module resolution (bundle-wide, not just committed VFS)
 *   F. Export contract check      (named import vs. module's real exports)
 *
 * Every defect it cannot safely repair is emitted as a structured
 * `CompileDiagnostic` so the caller can (a) run a bounded AI repair loop and
 * (b) attribute the failure to a lane/stage. The gate — never the AI — decides
 * whether a repair succeeded.
 *
 * Hard rules:
 *   - Never redesign, flatten or simplify generated code.
 *   - Never strip Unison semantic metadata (data-ut-*, data-unison-*, ids).
 *   - Never rename generated components.
 */

import { isSandpackAllowedImport } from '@/utils/sandpackDependencies';
import { parseGeneratedSource } from './aiSitePreflightRepair';

// ────────────────────────────────────────────────────────────── diagnostics

export type CompileValidationStage =
  | 'parse'
  | 'import-normalization'
  | 'react-runtime'
  | 'dependency-resolution'
  | 'module-resolution'
  | 'export-contract';

export type CompileDiagnosticCode =
  | 'PARSE_ERROR'
  | 'IMPORT_COLLISION'
  | 'MISSING_HOOK_IMPORT'
  | 'UNSUPPORTED_DEPENDENCY'
  | 'UNRESOLVED_MODULE'
  | 'EXPORT_MISMATCH';

export interface CompileDiagnostic {
  /** VFS path of the offending artifact. */
  pagePath: string;
  /** Where in the Unison pipeline the artifact came from. */
  pipelineStage: 'generation' | 'stage-4b' | 'acceptance';
  sourceLane: 'lane-a' | 'lane-b' | 'stage-4b' | 'unknown';
  validationStage: CompileValidationStage;
  diagnosticCode: CompileDiagnosticCode;
  severity: 'error' | 'warning';
  message: string;
  line?: number;
  column?: number;
  repairAttempt: number;
  resolved: boolean;
}

export interface CompileSafeOptions {
  /** Lane attribution for diagnostics. */
  sourceLane?: CompileDiagnostic['sourceLane'];
  pipelineStage?: CompileDiagnostic['pipelineStage'];
  /** Current repair attempt index (0 = first deterministic pass). */
  repairAttempt?: number;
}

export interface CompileSafeResult {
  files: Record<string, string>;
  diagnostics: CompileDiagnostic[];
  /** Diagnostics with severity 'error' that survived deterministic repair. */
  blocking: CompileDiagnostic[];
  accepted: boolean;
  repaired: string[];
}

const CODE_FILE = /\.(tsx|jsx|ts|js|mjs|cjs)$/;
const JSX_FILE = /\.(tsx|jsx)$/;

function isCodeFile(path: string): boolean {
  return CODE_FILE.test(path);
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ────────────────────────────────────────────────── import statement parsing

interface ParsedImport {
  raw: string;
  index: number;
  source: string;
  typeOnly: boolean;
  defaultName?: string;
  namespaceName?: string;
  /** imported → local */
  named: Array<{ imported: string; local: string; typeOnly: boolean }>;
  /** `import './x.css'` */
  sideEffectOnly: boolean;
}

const IMPORT_RE =
  /^[ \t]*import\s+(?:(type)\s+)?(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"];?[ \t]*$/gm;

export function parseImportStatements(code: string): ParsedImport[] {
  const out: ParsedImport[] = [];
  IMPORT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMPORT_RE.exec(code)) !== null) {
    const [raw, typeKeyword, clause, source] = m;
    const parsed: ParsedImport = {
      raw,
      index: m.index,
      source,
      typeOnly: Boolean(typeKeyword),
      named: [],
      sideEffectOnly: !clause,
    };
    if (clause) {
      const namedMatch = clause.match(/\{([\s\S]*?)\}/);
      const head = clause.replace(/\{[\s\S]*?\}/, '').replace(/,\s*$/, '').trim();
      if (head.startsWith('* as ')) {
        parsed.namespaceName = head.slice(5).trim();
      } else if (head) {
        parsed.defaultName = head.replace(/,$/, '').trim();
      }
      if (namedMatch) {
        for (const part of namedMatch[1].split(',').map((p) => p.trim()).filter(Boolean)) {
          const isType = /^type\s+/.test(part);
          const body = part.replace(/^type\s+/, '');
          const [imported, alias] = body.split(/\s+as\s+/).map((p) => p.trim());
          if (!imported) continue;
          parsed.named.push({ imported, local: alias || imported, typeOnly: isType });
        }
      }
    }
    out.push(parsed);
  }
  return out;
}

function renderImport(parsed: {
  source: string;
  typeOnly: boolean;
  defaultName?: string;
  namespaceName?: string;
  named: Array<{ imported: string; local: string; typeOnly: boolean }>;
}): string {
  const head: string[] = [];
  if (parsed.defaultName) head.push(parsed.defaultName);
  if (parsed.namespaceName) head.push(`* as ${parsed.namespaceName}`);
  if (parsed.named.length > 0) {
    const specs = parsed.named
      .map((n) => {
        const base = n.imported === n.local ? n.imported : `${n.imported} as ${n.local}`;
        return n.typeOnly && !parsed.typeOnly ? `type ${base}` : base;
      })
      .join(', ');
    head.push(`{ ${specs} }`);
  }
  const prefix = parsed.typeOnly ? 'import type ' : 'import ';
  if (head.length === 0) return `import '${parsed.source}';`;
  return `${prefix}${head.join(', ')} from '${parsed.source}';`;
}

// ──────────────────────────────────────────────── B. import normalization

/**
 * Merge duplicate imports from the same module into one canonical declaration.
 *
 *   import { MapPin } from 'lucide-react';
 *   import { Phone, MapPin } from 'lucide-react';
 *     → import { MapPin, Phone } from 'lucide-react';
 *
 *   import React from 'react';
 *   import React, { useState } from 'react';
 *     → import React, { useState } from 'react';
 *
 * Collisions (two different default names, or the same local bound to two
 * different imported symbols) are reported instead of being rewritten.
 */
export function normalizeGeneratedImports(code: string): {
  code: string;
  changed: boolean;
  collisions: string[];
} {
  const imports = parseImportStatements(code);
  if (imports.length < 2) return { code, changed: false, collisions: [] };

  const collisions: string[] = [];
  // Group by (source, typeOnly) so `import type` stays separate from values.
  const groups = new Map<string, ParsedImport[]>();
  for (const imp of imports) {
    if (imp.sideEffectOnly) continue;
    const key = `${imp.typeOnly ? 'type:' : 'value:'}${imp.source}`;
    const list = groups.get(key);
    if (list) list.push(imp);
    else groups.set(key, [imp]);
  }

  let next = code;
  let changed = false;

  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const first = list[0];
    const merged = {
      source: first.source,
      typeOnly: first.typeOnly,
      defaultName: undefined as string | undefined,
      namespaceName: undefined as string | undefined,
      named: [] as Array<{ imported: string; local: string; typeOnly: boolean }>,
    };
    const seenLocal = new Map<string, string>();
    let collided = false;

    for (const imp of list) {
      if (imp.defaultName) {
        if (merged.defaultName && merged.defaultName !== imp.defaultName) {
          collisions.push(
            `two default imports from '${imp.source}': ${merged.defaultName} / ${imp.defaultName}`,
          );
          collided = true;
        } else merged.defaultName = imp.defaultName;
      }
      if (imp.namespaceName) {
        if (merged.namespaceName && merged.namespaceName !== imp.namespaceName) {
          collisions.push(`two namespace imports from '${imp.source}'`);
          collided = true;
        } else merged.namespaceName = imp.namespaceName;
      }
      for (const spec of imp.named) {
        const prior = seenLocal.get(spec.local);
        if (prior && prior !== spec.imported) {
          collisions.push(
            `local '${spec.local}' bound to '${prior}' and '${spec.imported}' from '${imp.source}'`,
          );
          collided = true;
          continue;
        }
        if (prior) continue;
        seenLocal.set(spec.local, spec.imported);
        merged.named.push(spec);
      }
    }

    if (collided) continue;
    // A namespace import cannot be merged with named specifiers in one
    // statement; leave those alone rather than emitting invalid syntax.
    if (merged.namespaceName && (merged.named.length > 0 || merged.defaultName)) continue;

    const replacement = renderImport(merged);
    // Replace the first occurrence with the merged form, drop the rest.
    let replacedFirst = false;
    for (const imp of list) {
      const at = next.indexOf(imp.raw);
      if (at === -1) continue;
      if (!replacedFirst) {
        next = `${next.slice(0, at)}${replacement}${next.slice(at + imp.raw.length)}`;
        replacedFirst = true;
      } else {
        const before = next.slice(0, at);
        let after = next.slice(at + imp.raw.length);
        if (after.startsWith('\n')) after = after.slice(1);
        next = `${before}${after}`;
      }
      changed = true;
    }
  }

  return { code: next, changed, collisions };
}

// ────────────────────────────────────────────── C. React runtime closure

const REACT_HOOKS = [
  'useState',
  'useEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useContext',
  'useReducer',
  'useLayoutEffect',
  'useId',
  'useTransition',
  'useDeferredValue',
  'useImperativeHandle',
  'useSyncExternalStore',
] as const;

function hasLocalBinding(code: string, name: string): boolean {
  const n = escapeRe(name);
  return new RegExp(
    `(?:^|\\n)\\s*(?:export\\s+)?(?:const|let|var|function|class)\\s+${n}\\b`,
  ).test(code);
}

function isImported(imports: ParsedImport[], name: string): boolean {
  return imports.some(
    (imp) =>
      imp.defaultName === name ||
      imp.namespaceName === name ||
      imp.named.some((s) => s.local === name),
  );
}

/**
 * Add missing React hook imports. Deterministic and non-destructive: only
 * touches the `react` import declaration, never the component body.
 */
export function ensureReactRuntimeImports(code: string): { code: string; added: string[] } {
  const imports = parseImportStatements(code);
  const namespaceReact = imports.find((i) => i.source === 'react' && i.namespaceName);
  const added: string[] = [];

  const missing: string[] = [];
  for (const hook of REACT_HOOKS) {
    if (!new RegExp(`(?<![.\\w])${hook}\\s*[(<]`).test(code)) continue;
    if (isImported(imports, hook)) continue;
    if (hasLocalBinding(code, hook)) continue;
    // `React.useState(...)` is already namespaced.
    if (namespaceReact && new RegExp(`${escapeRe(namespaceReact.namespaceName!)}\\.${hook}\\b`).test(code)) continue;
    if (/\bReact\./.test(code) && new RegExp(`React\\.${hook}\\b`).test(code)) continue;
    missing.push(hook);
  }

  if (missing.length === 0) return { code, added };

  const reactValueImport = imports.find((i) => i.source === 'react' && !i.typeOnly && !i.namespaceName);
  if (reactValueImport) {
    const merged = {
      source: 'react',
      typeOnly: false,
      defaultName: reactValueImport.defaultName,
      namespaceName: undefined,
      named: [
        ...reactValueImport.named,
        ...missing.map((hook) => ({ imported: hook, local: hook, typeOnly: false })),
      ],
    };
    added.push(...missing);
    return { code: code.replace(reactValueImport.raw, renderImport(merged)), added };
  }

  const statement = `import { ${missing.join(', ')} } from 'react';`;
  added.push(...missing);
  // Insert after the final existing import so directives/comments survive.
  const last = imports[imports.length - 1];
  if (last) {
    const at = code.indexOf(last.raw);
    if (at !== -1) {
      const end = at + last.raw.length;
      return { code: `${code.slice(0, end)}\n${statement}${code.slice(end)}`, added };
    }
  }
  return { code: `${statement}\n${code}`, added };
}

// ──────────────────────────────────── E. candidate module resolution helpers

const RESOLVE_EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json', '.css'];

function normalizePathSegments(path: string): string {
  const parts: string[] = [];
  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  return `/${parts.join('/')}`;
}

/** Resolve a relative or `@/` aliased specifier against the candidate file set. */
export function resolveCandidateModule(
  fromPath: string,
  specifier: string,
  candidatePaths: Set<string>,
): string | null {
  let base: string;
  if (specifier.startsWith('@/')) {
    base = normalizePathSegments(`/src/${specifier.slice(2)}`);
  } else if (specifier.startsWith('/')) {
    base = normalizePathSegments(specifier);
  } else {
    const dir = fromPath.slice(0, fromPath.lastIndexOf('/'));
    base = normalizePathSegments(`${dir}/${specifier}`);
  }

  const candidates: string[] = [];
  for (const ext of RESOLVE_EXTENSIONS) candidates.push(`${base}${ext}`);
  for (const ext of RESOLVE_EXTENSIONS.slice(1)) candidates.push(`${base}/index${ext}`);
  // Tolerate a candidate set stored without the /src prefix (flattened preview).
  for (const candidate of [...candidates]) {
    if (candidate.startsWith('/src/')) candidates.push(candidate.slice(4));
    else candidates.push(`/src${candidate}`);
  }

  for (const candidate of candidates) {
    if (candidatePaths.has(candidate)) return candidate;
  }
  return null;
}

function moduleExportsOf(source: string): { named: Set<string>; hasStar: boolean; hasDefault: boolean } {
  const named = new Set<string>();
  let hasStar = false;
  let hasDefault = /export\s+default\b/.test(source);

  for (const m of source.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
    named.add(m[1]);
  }
  for (const m of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',').map((p) => p.trim()).filter(Boolean)) {
      const body = part.replace(/^type\s+/, '');
      const [imported, alias] = body.split(/\s+as\s+/).map((p) => p.trim());
      const exported = alias || imported;
      if (exported === 'default') hasDefault = true;
      else named.add(exported);
    }
  }
  if (/export\s+\*\s+from/.test(source)) hasStar = true;
  for (const m of source.matchAll(/export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/g)) named.add(m[1]);

  return { named, hasStar, hasDefault };
}

// ──────────────────────────────────────────────────────────── the gate

/**
 * Run the full deterministic acceptance sequence over a candidate file set.
 *
 * The whole candidate bundle is validated together, so a page importing a
 * component generated in the same wizard transaction resolves correctly even
 * though neither file is committed to the VFS yet.
 */
export function runCompileSafeAcceptance(
  inputFiles: Record<string, string>,
  options: CompileSafeOptions = {},
): CompileSafeResult {
  const sourceLane = options.sourceLane ?? 'unknown';
  const pipelineStage = options.pipelineStage ?? 'acceptance';
  const repairAttempt = options.repairAttempt ?? 0;

  const files: Record<string, string> = { ...inputFiles };
  const diagnostics: CompileDiagnostic[] = [];
  const repaired = new Set<string>();

  const diag = (
    pagePath: string,
    validationStage: CompileValidationStage,
    diagnosticCode: CompileDiagnosticCode,
    message: string,
    severity: CompileDiagnostic['severity'] = 'error',
    position?: { line?: number; column?: number },
  ) => {
    diagnostics.push({
      pagePath,
      pipelineStage,
      sourceLane,
      validationStage,
      diagnosticCode,
      severity,
      message,
      line: position?.line,
      column: position?.column,
      repairAttempt,
      resolved: false,
    });
  };

  // ── B + C: deterministic per-file hygiene (safe, never destructive)
  for (const [path, source] of Object.entries(files)) {
    if (typeof source !== 'string' || !isCodeFile(path)) continue;
    let next = source;

    const normalized = normalizeGeneratedImports(next);
    if (normalized.changed) next = normalized.code;
    for (const collision of normalized.collisions) {
      diag(path, 'import-normalization', 'IMPORT_COLLISION', collision);
    }

    if (JSX_FILE.test(path)) {
      const hooks = ensureReactRuntimeImports(next);
      if (hooks.added.length > 0) {
        // Only accept the rewrite if it still parses.
        const check = parseGeneratedSource(hooks.code);
        if (check.ok) next = hooks.code;
        else {
          diag(
            path,
            'react-runtime',
            'MISSING_HOOK_IMPORT',
            `hooks used without import: ${hooks.added.join(', ')}`,
          );
        }
      }
    }

    if (next !== source) {
      files[path] = next;
      repaired.add(path);
    }
  }

  // ── A: parse validation (identical parser assumptions as the preview)
  for (const [path, source] of Object.entries(files)) {
    if (typeof source !== 'string' || !isCodeFile(path)) continue;
    const result = parseGeneratedSource(source);
    if (result.ok === false) {
      diag(path, 'parse', 'PARSE_ERROR', result.error, 'error', {
        line: result.line,
        column: result.column,
      });
    }
  }

  // ── D + E + F: bundle-level resolution against the candidate file set
  const candidatePaths = new Set(Object.keys(files));

  for (const [path, source] of Object.entries(files)) {
    if (typeof source !== 'string' || !isCodeFile(path)) continue;
    let next = source;
    const imports = parseImportStatements(next);

    for (const imp of imports) {
      const spec = imp.source;
      const isRelative = spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/');

      if (!isRelative) {
        // D. external dependency must exist in the Sandpack manifest.
        if (isSandpackAllowedImport(spec)) continue;
        const locals = [
          imp.defaultName,
          imp.namespaceName,
          ...imp.named.map((n) => n.local),
        ].filter(Boolean) as string[];
        const referenced = locals.some((local) =>
          new RegExp(`(?<![.\\w])${escapeRe(local)}\\b`).test(next.replace(imp.raw, '')),
        );
        if (!referenced) {
          // Safe deterministic repair: an unused hallucinated import.
          next = next.replace(`${imp.raw}\n`, '').replace(imp.raw, '');
          repaired.add(path);
          continue;
        }
        diag(
          path,
          'dependency-resolution',
          'UNSUPPORTED_DEPENDENCY',
          `import from '${spec}' is not available in the preview runtime`,
        );
        continue;
      }

      // E. candidate-relative resolution (bundle-wide).
      const target = resolveCandidateModule(path, spec, candidatePaths);
      if (!target) {
        diag(
          path,
          'module-resolution',
          'UNRESOLVED_MODULE',
          `cannot resolve '${spec}' within the candidate bundle`,
        );
        continue;
      }

      // F. export contract.
      const targetSource = files[target];
      if (typeof targetSource !== 'string' || !isCodeFile(target)) continue;
      const exportsOf = moduleExportsOf(targetSource);
      if (exportsOf.hasStar) continue;
      if (imp.defaultName && !exportsOf.hasDefault) {
        diag(
          path,
          'export-contract',
          'EXPORT_MISMATCH',
          `'${target}' has no default export (imported as ${imp.defaultName})`,
          'warning',
        );
      }
      for (const spec2 of imp.named) {
        if (!exportsOf.named.has(spec2.imported)) {
          diag(
            path,
            'export-contract',
            'EXPORT_MISMATCH',
            `'${target}' does not export '${spec2.imported}'`,
            'warning',
          );
        }
      }
    }

    if (next !== source) files[path] = next;
  }

  const blocking = diagnostics.filter((d) => d.severity === 'error');

  return {
    files,
    diagnostics,
    blocking,
    accepted: blocking.length === 0,
    repaired: [...repaired],
  };
}

// ─────────────────────────────────────────────── bounded AI repair loop

export interface CompileRepairRequest {
  pagePath: string;
  source: string;
  diagnostics: CompileDiagnostic[];
  availableDependencies: string[];
  candidateModulePaths: string[];
  attempt: number;
}

export type CompileRepairFn = (request: CompileRepairRequest) => Promise<string | null>;

export interface CompileSafeAcceptanceOptions extends CompileSafeOptions {
  repair?: CompileRepairFn;
  maxRepairAttempts?: number;
}

/**
 * Deterministic validation → bounded AI repair → deterministic revalidation.
 *
 * The AI never decides acceptance: a repaired file is only kept when the
 * deterministic gate re-validates it, and the whole candidate bundle is
 * re-run after every accepted repair so cross-file effects are caught.
 */
export async function acceptGeneratedBundle(
  inputFiles: Record<string, string>,
  options: CompileSafeAcceptanceOptions = {},
): Promise<CompileSafeResult & { attempts: number }> {
  const maxAttempts = Math.max(0, Math.min(3, options.maxRepairAttempts ?? 2));
  let attempt = 0;
  let result = runCompileSafeAcceptance(inputFiles, { ...options, repairAttempt: 0 });

  if (!options.repair) return { ...result, attempts: 0 };

  const dependencyList = [...new Set(Object.keys(inputFiles).length ? [] : [])];

  while (!result.accepted && attempt < maxAttempts) {
    attempt += 1;
    const byFile = new Map<string, CompileDiagnostic[]>();
    for (const d of result.blocking) {
      const list = byFile.get(d.pagePath);
      if (list) list.push(d);
      else byFile.set(d.pagePath, [d]);
    }

    const nextFiles = { ...result.files };
    let anyRepair = false;

    for (const [pagePath, diags] of byFile) {
      const source = nextFiles[pagePath];
      if (typeof source !== 'string') continue;
      let candidate: string | null = null;
      try {
        candidate = await options.repair({
          pagePath,
          source,
          diagnostics: diags,
          availableDependencies: dependencyList,
          candidateModulePaths: Object.keys(nextFiles),
          attempt,
        });
      } catch (err) {
        console.warn('[compileSafeGate] repair call threw', pagePath, err);
      }
      if (!candidate || candidate === source) continue;
      // The compiler — not the model — decides whether the repair worked.
      const verdict = runCompileSafeAcceptance(
        { ...nextFiles, [pagePath]: candidate },
        { ...options, repairAttempt: attempt },
      );
      const stillBroken = verdict.blocking.some((d) => d.pagePath === pagePath);
      if (stillBroken) continue;
      nextFiles[pagePath] = candidate;
      anyRepair = true;
    }

    if (!anyRepair) break;
    result = runCompileSafeAcceptance(nextFiles, { ...options, repairAttempt: attempt });
  }

  return { ...result, attempts: attempt };
}

/** Compact, log-safe summary — never dumps generated source. */
export function summarizeCompileDiagnostics(diagnostics: CompileDiagnostic[]): string {
  if (diagnostics.length === 0) return 'clean';
  const counts = new Map<string, number>();
  for (const d of diagnostics) {
    counts.set(d.diagnosticCode, (counts.get(d.diagnosticCode) ?? 0) + 1);
  }
  return [...counts.entries()].map(([code, n]) => `${code}×${n}`).join(', ');
}
