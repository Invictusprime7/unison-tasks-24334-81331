/**
 * Module-closure repair — Phase 3C + Phase 4 of the compile-safe hardening
 * contract.
 *
 * Generated pages sometimes import a companion module that was never authored
 * (`./components/GalleryCategory`), or that exists under a different casing /
 * directory than the import states. Until now the launcher only *detected*
 * this (degrade) and Sandpack prep became the first system to refuse it, which
 * halts the preview pipeline.
 *
 * This module closes that gap with a deterministic-first repair sequence:
 *
 *   1. Path-variant recovery  — the module exists, the specifier is wrong.
 *   2. Unused-binding removal — the import is dead code.
 *   3. Bounded AI repair      — the module is genuinely missing; the AI may
 *      author it (or inline it) but the deterministic gate — never the AI —
 *      decides whether the repair succeeded.
 *
 * Hard rules: never simplify, flatten or restyle a page, never strip Unison
 * semantic metadata, never rename generated components.
 */

import {
  findUnresolvedLocalImports,
  normalizeVfsPath,
  type UnresolvedLocalImport,
} from './laneBCompanionModules';
import { parseGeneratedSource } from './aiSitePreflightRepair';
import { supabase } from '@/integrations/supabase/client';
import { extractCleanCode } from '@/utils/aiCodeCleaner';

export interface ModuleClosureRepairResult {
  files: Record<string, string>;
  /** `file → specifier` rewrites applied. */
  rewritten: string[];
  /** Dead imports removed. */
  dropped: string[];
  remaining: UnresolvedLocalImport[];
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

function localsOf(statement: string): string[] {
  const clause = statement.replace(/^\s*import\s+/, '').replace(/\s+from\s+[\s\S]*$/, '').trim();
  if (!clause || clause.startsWith("'") || clause.startsWith('"')) return [];
  const out: string[] = [];
  const named = clause.match(/\{([\s\S]*?)\}/)?.[1];
  const head = clause.replace(/\{[\s\S]*?\}/, '').replace(/,\s*$/, '').trim();
  if (head.startsWith('* as ')) out.push(head.slice(5).trim());
  else if (head) out.push(head);
  if (named) {
    for (const part of named.split(',').map((p) => p.trim()).filter(Boolean)) {
      const body = part.replace(/^type\s+/, '');
      const [imported, alias] = body.split(/\s+as\s+/).map((p) => p.trim());
      out.push(alias || imported);
    }
  }
  return out.filter(Boolean);
}

/**
 * Deterministic pass. Rewrites recoverable specifiers and removes dead imports.
 * Never invents a module and never touches JSX.
 */
export function repairUnresolvedLocalImports(
  inputFiles: Record<string, string>,
): ModuleClosureRepairResult {
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(inputFiles || {})) {
    if (typeof content === 'string') files[normalizeVfsPath(path)] = content;
  }

  const rewritten: string[] = [];
  const dropped: string[] = [];

  const unresolved = findUnresolvedLocalImports(files);
  if (unresolved.length === 0) return { files, rewritten, dropped, remaining: [] };

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
    const matches = byBase.get(baseNameOf(item.importPath).toLowerCase()) || [];
    const target =
      matches.find((p) => dirOf(p) === dirOf(normalizeVfsPath(`${dirOf(item.filePath)}/${item.importPath}`))) ||
      matches.find((p) => p.startsWith(`${dirOf(item.filePath)}/`)) ||
      matches[0];

    if (target && target !== item.filePath) {
      const spec = relativeSpecifier(item.filePath, target);
      files[item.filePath] = source.split(`'${item.importPath}'`).join(`'${spec}'`)
        .split(`"${item.importPath}"`).join(`"${spec}"`);
      rewritten.push(`${item.filePath} → "${item.importPath}" ⇒ "${spec}"`);
      continue;
    }

    // 2. Dead-import removal — nothing the page renders depends on it.
    let next = source;
    let removedAll = true;
    for (const statement of statements) {
      const body = next.split(statement).join('');
      const locals = localsOf(statement);
      const used = locals.some((local) =>
        new RegExp(`(?<![.\\w$])${local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(body),
      );
      if (used) {
        removedAll = false;
        continue;
      }
      next = next.replace(`${statement}\n`, '').replace(statement, '');
    }
    if (next !== source && removedAll) {
      const check = parseGeneratedSource(next);
      if (check.ok) {
        files[item.filePath] = next;
        dropped.push(`${item.filePath} → "${item.importPath}"`);
      }
    }
  }

  return { files, rewritten, dropped, remaining: findUnresolvedLocalImports(files) };
}

// ───────────────────────────────────────────── bounded AI closure repair

const REPAIR_CONTRACT = `Repair the implementation defect without redesigning, simplifying, flattening, or replacing the generated page. Preserve visual composition, sections, content hierarchy, responsive behavior, animation intent, component boundaries, semantic metadata (data-ut-*, data-unison-*, ids) and all copy.`;

export interface AIModuleClosureOptions {
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
  const deterministic = repairUnresolvedLocalImports(inputFiles);
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
    dropped: deterministic.dropped,
    remaining,
    attempts,
  };
}
