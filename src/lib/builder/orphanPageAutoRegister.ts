/**
 * orphanPageAutoRegister — detects AI-authored page .tsx files that exist
 * in the VFS but aren't in the Playground PageRegistry, and registers them.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 17. Pure helper:
 * scans the file map + registry pages, returns the list of orphans to
 * register. Caller invokes `addPage` for each (kept side-effectful in caller
 * to preserve registry semantics + logging).
 */

export interface OrphanRegistryPage {
  filePath?: string | null;
  title: string;
  path?: string | null;
}

export interface OrphanRegistration {
  filePath: string;
  title: string;
  route: string;
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().trim();

/**
 * Given the current sandpack file map and known registry pages, compute the
 * set of orphan AI page files that should be auto-registered.
 *
 * Rules (all comparisons are case-insensitive to avoid duplicate routes from
 * casing drift between launcher output and AI-authored files):
 *  - Only `/src/pages/<Name>.tsx` files qualify (not nested funnels)
 *  - Skip files already referenced by a registry page's `filePath`
 *  - Skip files whose derived route already exists in the registry
 *  - Skip files whose component basename matches an existing page title
 */
export function computeOrphanPageRegistrations(
  files: Record<string, string>,
  registryPages: OrphanRegistryPage[],
): OrphanRegistration[] {
  const knownFilePaths = new Set(
    registryPages
      .map((p) => norm(p.filePath))
      .filter(Boolean),
  );
  const knownRoutes = new Set(
    registryPages.map((p) => norm(p.path)).filter(Boolean),
  );
  const knownTitleSlugs = new Set(
    registryPages.map((p) => norm(p.title).replace(/\s+/g, '')).filter(Boolean),
  );

  // Dedup orphans against each other too (e.g. About.tsx + about.tsx)
  const seenRoutes = new Set<string>();
  const seenFilePaths = new Set<string>();

  const out: OrphanRegistration[] = [];

  for (const filePath of Object.keys(files)) {
    if (!/^\/src\/pages\/[^/]+\.tsx$/.test(filePath)) continue;
    if (filePath.includes('/pages/funnels/')) continue;
    const fpKey = norm(filePath);
    if (knownFilePaths.has(fpKey) || seenFilePaths.has(fpKey)) continue;

    const base = filePath.split('/').pop()!.replace(/\.tsx$/, '');
    const slug = base.replace(/Page$/, '').toLowerCase();
    if (knownTitleSlugs.has(slug)) continue;

    const title =
      base
        .replace(/Page$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Page';
    const route =
      '/' +
      base
        .replace(/Page$/, '')
        .replace(/([A-Z])/g, '-$1')
        .replace(/^-/, '')
        .toLowerCase();
    const routeKey = norm(route);
    if (knownRoutes.has(routeKey) || seenRoutes.has(routeKey)) continue;

    seenRoutes.add(routeKey);
    seenFilePaths.add(fpKey);
    out.push({ filePath, title, route });
  }

  return out;
}
