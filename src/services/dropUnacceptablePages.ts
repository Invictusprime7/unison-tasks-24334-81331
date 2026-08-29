/**
 * Atomic page removal — the only sanctioned answer to "this selected page could
 * not be generated correctly".
 *
 * Acceptance happens exactly once, at generation time
 * (`src/services/pageAcceptanceContract.ts`). When a page still fails after its
 * regeneration attempts, the pipeline must not ship a fragment of it: no stub,
 * no synthesized companion, no downstream rescue. The page leaves the site
 * whole — registry, router, routes, nav manifest, composition and VFS — so the
 * sealed snapshot stays internally consistent and nothing downstream has to
 * "handle" a half-present page.
 *
 * Home is never droppable: a site without its home route is not a site, and the
 * launch must fail loudly instead.
 */

import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import { generateCanonicalRouterForFiles } from '@/utils/topologyRouterGenerator';
import { normalizeCanonicalVfsPath } from '@/utils/canonicalVfsPath';
import { findUnresolvedLocalImports } from './laneBCompanionModules';

export interface DroppedPageReport {
  /** Canonical VFS path of the removed page module. */
  filePath: string;
  /** Route the page occupied before removal. */
  route: string;
  title: string;
  /** Human-readable acceptance failure that caused the drop. */
  reason: string;
  /** Companion modules removed with the page (unreachable afterwards). */
  removedModules: string[];
}

export interface DropUnacceptablePagesResult {
  snapshot: SiteBundleSnapshot;
  files: Record<string, string>;
  dropped: DroppedPageReport[];
}

const norm = (path: string) => normalizeCanonicalVfsPath(path.startsWith('/') ? path : `/${path}`);

/** Every relative-import target reachable from `entry`, transitively. */
function reachableModules(files: Record<string, string>, entry: string): Set<string> {
  const known = new Map(Object.keys(files).map((path) => [norm(path), path]));
  const seen = new Set<string>();
  const queue = [norm(entry)];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const source = files[known.get(current) || current];
    if (typeof source !== 'string') continue;

    const importRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(source)) !== null) {
      const dir = current.slice(0, current.lastIndexOf('/'));
      const segments = `${dir}/${match[1]}`.split('/');
      const resolvedSegments: string[] = [];
      for (const segment of segments) {
        if (segment === '.' || segment === '') continue;
        if (segment === '..') resolvedSegments.pop();
        else resolvedSegments.push(segment);
      }
      const base = `/${resolvedSegments.join('/')}`;
      const candidate = [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]
        .map(norm)
        .find((option) => known.has(option));
      if (candidate) queue.push(candidate);
    }
  }

  seen.delete(norm(entry));
  return seen;
}

export interface PageDropRequest {
  filePath: string;
  reason: string;
}

/**
 * Remove the requested pages from every canonical surface at once and return a
 * consistent snapshot plus the merged VFS the launcher should seal.
 */
export function dropUnacceptablePages(
  snapshot: SiteBundleSnapshot,
  files: Record<string, string>,
  requests: PageDropRequest[],
): DropUnacceptablePagesResult {
  if (requests.length === 0) return { snapshot, files, dropped: [] };

  const nextFiles: Record<string, string> = { ...files };
  const pages: Record<string, SiteBundleSnapshot['pageRegistry']['pages'][string]> = { ...snapshot.pageRegistry.pages };
  const homePageId = snapshot.pageRegistry.homePageId;
  const dropped: DroppedPageReport[] = [];
  const droppedRoutes = new Set<string>();

  for (const request of requests) {
    const target = norm(request.filePath);
    const entry = Object.entries(pages).find(([, page]) => {
      const filePath = page?.filePath;
      return Boolean(filePath) && norm(filePath!) === target;
    });
    if (!entry) continue;
    const [pageId, page] = entry;
    if (pageId === homePageId || page.isHome === true) {
      throw new Error(
        `Home page ${target} failed the generation acceptance contract and cannot be dropped: ${request.reason}`,
      );
    }

    const reachable = reachableModules(nextFiles, target);

    delete pages[pageId];
    for (const variant of [target, target.slice(1), request.filePath]) {
      delete nextFiles[variant];
    }

    // Only remove companions that nothing else still imports.
    const removedModules: string[] = [];
    for (const modulePath of reachable) {
      const remaining = { ...nextFiles };
      delete remaining[modulePath];
      delete remaining[modulePath.slice(1)];
      const breaks = findUnresolvedLocalImports(remaining).length
        > findUnresolvedLocalImports(nextFiles).length;
      if (breaks) continue;
      delete nextFiles[modulePath];
      delete nextFiles[modulePath.slice(1)];
      removedModules.push(modulePath);
    }

    const route = page.path || '';
    if (route) droppedRoutes.add(route);
    dropped.push({
      filePath: target,
      route,
      title: page.title || target,
      reason: request.reason,
      removedModules,
    });
  }

  if (dropped.length === 0) return { snapshot, files, dropped: [] };

  const pageRegistry = {
    ...snapshot.pageRegistry,
    pages,
    version: (snapshot.pageRegistry.version || 1) + 1,
  };

  const routerContent = generateCanonicalRouterForFiles(
    pageRegistry,
    nextFiles,
    snapshot.businessName,
  );
  nextFiles[snapshot.routerFile.path] = routerContent;

  const nextSnapshot: SiteBundleSnapshot = {
    ...snapshot,
    pageRegistry,
    vfsFiles: nextFiles,
    routerFile: { ...snapshot.routerFile, content: routerContent },
    manifest: {
      ...snapshot.manifest,
      routes: snapshot.manifest.routes.filter((route) => !droppedRoutes.has(route.path)),
      nav: snapshot.manifest.nav.filter((item) => !droppedRoutes.has(item.path)),
    },
    routes: (snapshot.routes || []).filter((route) => !droppedRoutes.has(route)),
  };

  return { snapshot: nextSnapshot, files: nextFiles, dropped };
}

export function describeDroppedPages(dropped: DroppedPageReport[]): string {
  return dropped
    .map((page) => `${page.title} (${page.route || page.filePath}): ${page.reason}`)
    .join(' | ');
}
