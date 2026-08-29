/**
 * Module-closure resolution — the ONLY deterministic answer to "module X does
 * not resolve", and it is deliberately narrow.
 *
 * Acceptance now happens once, at generation time (see
 * `src/services/pageAcceptanceContract.ts`). A page that cannot close its own
 * import graph is regenerated and, failing that, dropped whole. Nothing
 * downstream may invent a module, delete an import, or otherwise author code
 * the generator never produced — that is exactly how fragments were left
 * behind.
 *
 * What survives here is pure normalization:
 *
 *   1. resolve  — specifier drift (wrong directory / casing / extension) onto
 *                 a module that genuinely exists in the bundle.
 *   2. recover  — restore the canonical Stage 4b body for that exact module.
 *
 * Anything else is reported as `remaining` for the caller that owns the
 * generation decision.
 */

import {
  findUnresolvedLocalImports,
  isLaneAAuthorityPath,
  normalizeVfsPath,
  type UnresolvedLocalImport,
} from './laneBCompanionModules';

import { parseGeneratedSource } from './aiSitePreflightRepair';
import { supabase } from '@/integrations/supabase/client';
import { extractCleanCode } from '@/utils/aiCodeCleaner';
import { normalizeCanonicalVfsPath } from '@/utils/canonicalVfsPath';

export interface ModuleClosureRepairResult {
  files: Record<string, string>;
  /** `file → specifier` rewrites applied (rung 1: resolve). */
  rewritten: string[];
  /** Modules restored from the canonical snapshot (rung 2: recover). */
  recovered: string[];
  remaining: UnresolvedLocalImport[];
}

export interface ModuleClosureRepairOptions {
  /**
   * Canonical (Stage 4b composed) bodies keyed by VFS path. Rung 2 restores a
   * missing module from here.
   */
  canonicalFiles?: Record<string, string>;
}


const MODULE_EXTENSION_CANDIDATES = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

/** Absolute path a relative specifier points at, without extension resolution. */
function absoluteSpecifierPath(importerPath: string, specifier: string): string {
  return normalizeCanonicalVfsPath(`${dirOf(importerPath)}/${specifier}`);
}

function findCanonicalBody(
  canonicalFiles: Record<string, string> | undefined,
  absolutePath: string,
): { path: string; content: string } | null {
  if (!canonicalFiles) return null;
  const normalized: Record<string, string> = {};
  for (const [path, content] of Object.entries(canonicalFiles)) {
    if (typeof content === 'string') normalized[normalizeCanonicalVfsPath(path)] = content;
  }
  for (const suffix of MODULE_EXTENSION_CANDIDATES) {
    const candidate = `${absolutePath}${suffix}`;
    const content = normalized[candidate];
    if (typeof content === 'string' && content.trim().length > 0) {
      return { path: candidate, content };
    }
  }
  return null;
}

function dirOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/')) || '';
}

function baseNameOf(specifier: string): string {
  const last = specifier.split('/').pop() || specifier;
  return last.replace(/\.(tsx|jsx|ts|js)$/i, '');
}

function relativeSpecifier(fromPath: string, targetPath: string): string {
  const from = dirOf(fromPath).split('/').filter(Boolean);
  const to = targetPath.replace(/\.(tsx|jsx|ts|js)$/i, '').split('/').filter(Boolean);
  let i = 0;
  while (i < from.length && i < to.length && from[i] === to[i]) i++;
  const up = from.length - i;
  const rest = to.slice(i);
  const prefix = up === 0 ? './' : '../'.repeat(up);
  return `${prefix}${rest.join('/')}`;
}

/** Locals bound by an import statement for `specifier` inside `source`. */
function importStatementsFor(source: string, specifier: string): string[] {
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `^[ \\t]*import\\s+(?:[\\s\\S]*?\\s+from\\s+)?['"]${escaped}['"];?[ \\t]*$`,
    'gm',
  );
  return source.match(re) || [];
}

/**
 * Deterministic normalization for "module X does not resolve".
 *
 *   1. resolve — specifier drift (wrong directory / casing / extension)
 *   2. recover — restore the canonical Stage 4b body for that module
 *
 * Nothing is synthesized and no import is removed. Whatever is still
 * unresolved is returned in `remaining` so the generation-time acceptance
 * contract — the only authority — can regenerate or drop the page.
 */

export function repairUnresolvedLocalImports(
  inputFiles: Record<string, string>,
  options: ModuleClosureRepairOptions = {},
): ModuleClosureRepairResult {
  const files: Record<string, string> = {};
  const canonicalAuthority = new Set<string>();
  for (const [path, content] of Object.entries(inputFiles || {})) {
    if (typeof content !== 'string') continue;
    const canonicalPath = normalizeCanonicalVfsPath(path);
    const isAlreadyCanonical = normalizeVfsPath(path) === canonicalPath;
    // Repair and handoff must reason over the same path space. If a legacy
    // bare path and its canonical /src path collide, preserve the explicitly
    // canonical source instead of certifying a graph that handoff later rejects.
    if (files[canonicalPath] !== undefined && canonicalAuthority.has(canonicalPath) && !isAlreadyCanonical) {
      continue;
    }
    files[canonicalPath] = content;
    if (isAlreadyCanonical) canonicalAuthority.add(canonicalPath);
  }

  const rewritten: string[] = [];
  const recovered: string[] = [];

  const unresolved = findUnresolvedLocalImports(files);
  if (unresolved.length === 0) {
    return { files, rewritten, recovered, remaining: [] };
  }


  // basename (lowercased) → real module paths
  const byBase = new Map<string, string[]>();
  for (const path of Object.keys(files)) {
    if (!/\.(tsx|jsx|ts|js)$/i.test(path)) continue;
    const key = baseNameOf(path).toLowerCase();
    const list = byBase.get(key);
    if (list) list.push(path);
    else byBase.set(key, [path]);
  }

  for (const item of unresolved) {
    const source = files[item.filePath];
    if (typeof source !== 'string') continue;
    const statements = importStatementsFor(source, item.importPath);
    if (statements.length === 0) continue;

    // 1. Path-variant recovery — the module exists somewhere in the bundle.
    //
    // This must stay conservative: matching on basename alone lets
    // `./components/Gallery` resolve onto the ROUTE page `/src/pages/Gallery.tsx`,
    // which rewires the bundle into self-imports and breaks Sandpack module
    // resolution for the whole site. A candidate is only accepted when the
    // specifier's full tail (`components/Gallery`) matches the candidate path,
    // or when a single-segment specifier has exactly one basename match that is
    // not the importing file itself.
    const specTail = item.importPath
      .replace(/^(?:\.\.?\/)+/, '')
      .replace(/\.(tsx|jsx|ts|js)$/i, '')
      .toLowerCase();
    const isNestedSpecifier = specTail.includes('/');
    const matches = (byBase.get(baseNameOf(item.importPath).toLowerCase()) || []).filter(
      (p) => p !== item.filePath && !isLaneAAuthorityPath(p),
    );
    const withoutExt = (p: string) => p.replace(/\.(tsx|jsx|ts|js)$/i, '').toLowerCase();
    const tailMatches = matches.filter(
      (p) => withoutExt(p) === `/${specTail}` || withoutExt(p).endsWith(`/${specTail}`),
    );
    const target = isNestedSpecifier
      ? tailMatches.find(
          (p) => dirOf(p) === dirOf(normalizeVfsPath(`${dirOf(item.filePath)}/${item.importPath}`)),
        ) ||
        tailMatches.find((p) => p.startsWith(`${dirOf(item.filePath)}/`)) ||
        tailMatches[0]
      : tailMatches[0] || (matches.length === 1 ? matches[0] : undefined);

    if (target) {
      const spec = relativeSpecifier(item.filePath, target);
      files[item.filePath] = source.split(`'${item.importPath}'`).join(`'${spec}'`)
        .split(`"${item.importPath}"`).join(`"${spec}"`);
      rewritten.push(`${item.filePath} → "${item.importPath}" ⇒ "${spec}"`);
      continue;
    }


    const absolutePath = absoluteSpecifierPath(item.filePath, item.importPath);

    // 2. Recover — the canonical Stage 4b snapshot still holds this body.
    const canonical = findCanonicalBody(options.canonicalFiles, absolutePath);
    if (canonical) {
      const writePath = /\.(tsx|jsx|ts|js)$/i.test(canonical.path)
        ? canonical.path
        : `${canonical.path}.tsx`;
      files[writePath] = canonical.content;
      recovered.push(`${item.filePath} → "${item.importPath}" ⇐ ${writePath}`);
      continue;
    }

    // Anything past rung 2 is a generation defect, not a projection problem.
    // It stays in `remaining` for the acceptance contract to act on.
  }

  return {
    files,
    rewritten,
    recovered,
    remaining: findUnresolvedLocalImports(files),

  };
}

// ───────────────────────────────────────────── bounded AI closure repair

const REPAIR_CONTRACT = `Repair the implementation defect without redesigning, simplifying, flattening, or replacing the generated page. Preserve visual composition, sections, content hierarchy, responsive behavior, animation intent, component boundaries, semantic metadata (data-ut-*, data-unison-*, ids) and all copy.`;

export interface AIModuleClosureOptions extends ModuleClosureRepairOptions {
  maxAttempts?: number;
  signal?: AbortSignal;
}

/**
 * Ask the AI to close a page's module contract, then prove the repair with the
 * deterministic parser + import-closure check. A repair that does not validate
 * is discarded — the AI never decides acceptance.
 */
export async function repairModuleClosureWithAI(
  inputFiles: Record<string, string>,
  options: AIModuleClosureOptions = {},
): Promise<ModuleClosureRepairResult & { attempts: number }> {
  const maxAttempts = Math.max(1, Math.min(3, options.maxAttempts ?? 2));
  const deterministic = repairUnresolvedLocalImports(inputFiles, {
    canonicalFiles: options.canonicalFiles,
  });
  const files = { ...deterministic.files };
  const repairedPaths: string[] = [];
  let attempts = 0;

  let remaining = deterministic.remaining;
  const byFile = new Map<string, UnresolvedLocalImport[]>();
  for (const item of remaining) {
    const list = byFile.get(item.filePath);
    if (list) list.push(item);
    else byFile.set(item.filePath, [item]);
  }

  for (const [filePath, items] of byFile) {
    const original = files[filePath];
    if (typeof original !== 'string') continue;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attempts += 1;
      let candidate: string | null = null;
      try {
        const { data, error } = await supabase.functions.invoke('ai-code-assistant', {
          body: {
            mode: 'code',
            editMode: true,
            messages: [
              {
                role: 'system',
                content:
                  'You are a deterministic TSX repair tool for a React 18 + TypeScript + Tailwind preview runtime. ' +
                  REPAIR_CONTRACT +
                  ' Return ONLY the full repaired file contents, no prose, no markdown fences.',
              },
              {
                role: 'user',
                content: [
                  `File: ${filePath}`,
                  `Defect: these relative imports do not resolve in the site bundle: ${items
                    .map((i) => `"${i.importPath}"`)
                    .join(', ')}.`,
                  'Fix by defining the missing component(s) inside this same file (keeping the exact same JSX usage, props and markup) or by removing only the unusable import while preserving the rendered output.',
                  'Allowed package imports: react, lucide-react, framer-motion, recharts.',
                  'Current file:',
                  original,
                ].join('\n\n'),
              },
            ],
          },
        });
        if (error) throw new Error(error.message);
        const content =
          (data as { content?: string; code?: string } | null)?.content ||
          (data as { code?: string } | null)?.code ||
          '';
        candidate = content ? extractCleanCode(content) : null;
      } catch (err) {
        console.warn('[moduleClosureRepair] AI repair call failed', filePath, err);
        break;
      }

      if (!candidate || candidate.trim().length < 40) continue;

      // Deterministic acceptance: must parse AND close its import contract.
      const parsed = parseGeneratedSource(candidate);
      if (!parsed.ok) continue;
      const probe = { ...files, [filePath]: candidate };
      if (findUnresolvedLocalImports(probe, [filePath]).length > 0) continue;

      files[filePath] = candidate;
      repairedPaths.push(filePath);
      break;
    }
  }

  remaining = findUnresolvedLocalImports(files);
  return {
    files,
    rewritten: [...deterministic.rewritten, ...repairedPaths.map((p) => `${p} (ai-repair)`)],
    recovered: deterministic.recovered,
    remaining,
    attempts,
  };
}

