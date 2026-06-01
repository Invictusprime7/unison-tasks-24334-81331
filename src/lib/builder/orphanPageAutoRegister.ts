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
}

export interface OrphanRegistration {
  filePath: string;
  title: string;
  route: string;
}

/**
 * Given the current sandpack file map and known registry pages, compute the
 * set of orphan AI page files that should be auto-registered.
 *
 * Rules:
 *  - Only `/src/pages/<Name>.tsx` files qualify (not nested funnels)
 *  - Skip files already referenced by a registry page's `filePath`
 *  - Skip files whose component basename matches an existing page title
 */
export function computeOrphanPageRegistrations(
  files: Record<string, string>,
  registryPages: OrphanRegistryPage[],
): OrphanRegistration[] {
  const knownFilePaths = new Set(
    registryPages.map((p) => p.filePath).filter(Boolean) as string[],
  );

  const orphans = Object.keys(files).filter((p) => {
    if (!/^\/src\/pages\/[^/]+\.tsx$/.test(p)) return false;
    if (p.includes('/pages/funnels/')) return false;
    if (knownFilePaths.has(p)) return false;
    const base = p.split('/').pop()!.replace(/\.tsx$/, '');
    const slug = base.replace(/Page$/, '').toLowerCase();
    const hasMatchingTitle = registryPages.some(
      (rp) => rp.title.toLowerCase().replace(/\s+/g, '') === slug,
    );
    return !hasMatchingTitle;
  });

  return orphans.map((filePath) => {
    const base = filePath
      .split('/')
      .pop()!
      .replace(/\.tsx$/, '')
      .replace(/Page$/, '');
    const title =
      base.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, (c) => c.toUpperCase()) ||
      'Page';
    const route =
      '/' + base.replace(/([A-Z])/g, '-$1').replace(/^-/, '').toLowerCase();
    return { filePath, title, route };
  });
}
