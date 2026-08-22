/**
 * Snapshot page-coverage repair.
 *
 * Existing drafts can reach the builder with a SiteBundleSnapshot whose
 * PageRegistry references a page file that is absent from the handoff/committed
 * VFS map (e.g. `/src/pages/Home.tsx`). `assertNoMinimalFallbackPreview` then
 * refuses to render, which strands the draft.
 *
 * Repair happens in two escalating passes:
 *   1. Local: recover the page source from path variants already present in the
 *      file map (flattened `/pages/...`, casing drift, `Page/index.tsx`) or from
 *      the snapshot's own embedded `vfsFiles`.
 *   2. Durable: scan recent `site_revisions` rows for the draft/project and
 *      lift the missing page source from the newest revision that still has it.
 *
 * Nothing here fabricates a page body — a repair only ever reuses previously
 * authored canonical source, so the minimal-fallback guard stays meaningful.
 */

import { supabase } from '@/integrations/supabase/client';

export interface PageCoverageRepairResult {
  files: Record<string, string>;
  repaired: string[];
  stillMissing: string[];
  changed: boolean;
}

function normalizePagePath(filePath: string): string {
  const absolute = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return /^\/(pages|components|styles)\//.test(absolute) ? `/src${absolute}` : absolute;
}

/** Registered page file paths declared by a SiteBundleSnapshot. */
export function listRegisteredPagePaths(snapshot: unknown): string[] {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return [];
  const registry = (snapshot as { pageRegistry?: { pages?: Record<string, unknown> } }).pageRegistry;
  const pages = registry?.pages;
  if (!pages || typeof pages !== 'object') return [];
  const out: string[] = [];
  for (const page of Object.values(pages)) {
    const filePath = (page as { filePath?: unknown })?.filePath;
    if (typeof filePath === 'string' && filePath.trim()) out.push(normalizePagePath(filePath.trim()));
  }
  return Array.from(new Set(out));
}

function readFileVariant(files: Record<string, string>, normalized: string): string | undefined {
  const flattened = normalized.replace(/^\/src\//, '/');
  const withoutExt = normalized.replace(/\.(tsx|ts|jsx|js)$/i, '');
  const candidates = [
    normalized,
    normalized.slice(1),
    flattened,
    flattened.slice(1),
    `${withoutExt}/index.tsx`,
    `${withoutExt}/index.jsx`,
    ...['tsx', 'ts', 'jsx', 'js'].map((ext) => `${withoutExt}.${ext}`),
  ];
  for (const candidate of candidates) {
    const value = files[candidate];
    if (typeof value === 'string' && value.trim()) return value;
  }
  // Last resort: case-insensitive basename match inside a pages directory.
  const target = normalized.toLowerCase();
  for (const [path, value] of Object.entries(files)) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const candidate = normalizePagePath(path).toLowerCase();
    if (candidate === target) return value;
  }
  return undefined;
}

/** Which registered pages have no usable source in `files`. */
export function findMissingRegisteredPages(
  files: Record<string, string>,
  snapshot: unknown,
): string[] {
  return listRegisteredPagePaths(snapshot).filter((path) => !readFileVariant(files, path));
}

function readSnapshotVfs(snapshot: unknown): Record<string, string> {
  const vfs = (snapshot as { vfsFiles?: unknown } | null)?.vfsFiles;
  if (!vfs || typeof vfs !== 'object' || Array.isArray(vfs)) return {};
  return vfs as Record<string, string>;
}

/**
 * Pass 1 — synchronous, no network. Recovers missing registered pages from path
 * variants in the live map or from the snapshot's embedded VFS.
 */
export function repairSnapshotPageCoverageLocally(
  files: Record<string, string>,
  snapshot: unknown,
): PageCoverageRepairResult {
  const missing = findMissingRegisteredPages(files, snapshot);
  if (missing.length === 0) {
    return { files, repaired: [], stillMissing: [], changed: false };
  }

  const snapshotVfs = readSnapshotVfs(snapshot);
  const next = { ...files };
  const repaired: string[] = [];
  const stillMissing: string[] = [];

  for (const path of missing) {
    const source = readFileVariant(next, path) ?? readFileVariant(snapshotVfs, path);
    if (source && source.trim()) {
      next[path] = source;
      repaired.push(path);
    } else {
      stillMissing.push(path);
    }
  }

  return { files: repaired.length ? next : files, repaired, stillMissing, changed: repaired.length > 0 };
}

/**
 * Pass 2 — durable. Scans recent site_revisions for the draft (falling back to
 * the project) and lifts each still-missing page from the newest row that has
 * real source for it.
 */
export async function repairSnapshotPageCoverageFromRevisions(args: {
  files: Record<string, string>;
  snapshot: unknown;
  projectId?: string | null;
  draftId?: string | null;
  limit?: number;
}): Promise<PageCoverageRepairResult> {
  const local = repairSnapshotPageCoverageLocally(args.files, args.snapshot);
  if (local.stillMissing.length === 0) return local;
  if (!args.projectId && !args.draftId) return local;

  let query = supabase
    .from('site_revisions')
    .select('id,vfs_files,site_bundle_snapshot,created_at')
    .order('created_at', { ascending: false })
    .limit(args.limit ?? 40);
  if (args.draftId) query = query.eq('draft_id', args.draftId);
  else if (args.projectId) query = query.eq('project_id', args.projectId);

  const { data, error } = await query;
  if (error || !Array.isArray(data) || data.length === 0) return local;

  const next = { ...local.files };
  const repaired = [...local.repaired];
  const stillMissing: string[] = [];

  for (const path of local.stillMissing) {
    let found: string | undefined;
    for (const row of data as Array<Record<string, unknown>>) {
      const revisionFiles = (row.vfs_files ?? {}) as Record<string, string>;
      found = readFileVariant(revisionFiles, path)
        ?? readFileVariant(readSnapshotVfs(row.site_bundle_snapshot), path);
      if (found && found.trim()) break;
    }
    if (found && found.trim()) {
      next[path] = found;
      repaired.push(path);
    } else {
      stillMissing.push(path);
    }
  }

  return {
    files: repaired.length ? next : local.files,
    repaired,
    stillMissing,
    changed: repaired.length > 0,
  };
}
