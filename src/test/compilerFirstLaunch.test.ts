import { describe, it, expect } from 'vitest';
import { mergeGeneratedVfsWithCanonicalSnapshot } from '@/services/canonicalLaunchVfs';
import { findUnresolvedLocalImports } from '@/services/laneBCompanionModules';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';

function snapshotWithPages(pages: Record<string, string>): SiteBundleSnapshot {
  const registryPages: Record<string, unknown> = {};
  const vfsFiles: Record<string, string> = {
    '/src/App.tsx': 'export default function App() { return null; }',
  };
  Object.entries(pages).forEach(([route, filePath], index) => {
    registryPages[`page_${index}`] = {
      pageId: `page_${index}`,
      title: route,
      path: route,
      filePath,
      isHome: route === '/',
    };
    vfsFiles[filePath] = `export default function Page() { return <main>${route}</main>; }`;
  });
  return {
    pageRegistry: { pages: registryPages, homePageId: 'page_0', version: 1 },
    vfsFiles,
    routerFile: { path: '/src/App.tsx', content: vfsFiles['/src/App.tsx'] },
    manifest: { routes: [], nav: [] },
    routes: Object.keys(pages),
    businessName: 'Salon Premium',
  } as unknown as SiteBundleSnapshot;
}

describe('compiler-first launch authority', () => {
  const routes = {
    '/': '/src/pages/Home.tsx',
    '/services': '/src/pages/Services.tsx',
    '/gallery': '/src/pages/Gallery.tsx',
    '/contact': '/src/pages/Contact.tsx',
  };

  it('keeps every wizard-selected page even when AI output is malformed', () => {
    const snapshot = snapshotWithPages(routes);
    const malformedAi = {
      '/src/pages/Services.tsx': 'export default function Services( { return <div>',
    };

    const merged = mergeGeneratedVfsWithCanonicalSnapshot(
      malformedAi,
      snapshot.vfsFiles,
      snapshot,
      'compiler',
    );

    for (const filePath of Object.values(routes)) {
      expect(merged[filePath]).toBe(snapshot.vfsFiles[filePath]);
    }
    expect(findUnresolvedLocalImports(merged)).toEqual([]);
  });

  it('lets the legacy path keep AI ownership of registered pages', () => {
    const snapshot = snapshotWithPages(routes);
    const generated = {
      '/src/pages/Services.tsx': 'export default function Services() { return <section>AI</section>; }',
    };
    const merged = mergeGeneratedVfsWithCanonicalSnapshot(
      generated,
      snapshot.vfsFiles,
      snapshot,
      'legacy-lane-b',
    );
    expect(merged['/src/pages/Services.tsx']).toContain('AI');
  });
});
