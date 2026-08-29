import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  scopeLaneBBatchFiles,
  findUnresolvedLocalImports,
  isLaneAAuthorityPath,
} from '@/services/laneBCompanionModules';

describe('Lane B companion modules', () => {
  it('keeps a companion module authored alongside a requested page', () => {
    const { pages, companions } = scopeLaneBBatchFiles(
      {
        '/src/pages/Gallery.tsx': 'import GalleryItem from "./components/GalleryItem";\nexport default () => <GalleryItem />;',
        'src/pages/components/GalleryItem.tsx': 'export default () => null;',
      },
      ['/src/pages/Gallery.tsx'],
    );

    expect(Object.keys(pages)).toEqual(['/src/pages/Gallery.tsx']);
    expect(companions['/src/pages/components/GalleryItem.tsx']).toContain('export default');
  });

  it('never lets Lane B overwrite Lane A authority files', () => {
    const { pages, companions } = scopeLaneBBatchFiles(
      {
        '/src/pages/Home.tsx': 'export default () => null;',
        '/src/App.tsx': 'export default () => null;',
        '/src/index.css': ':root{}',
        '/src/main.tsx': 'render()',
        '/src/unison/ui/button.tsx': 'export const Button = () => null;',
      },
      ['/src/pages/Home.tsx'],
    );

    expect(Object.keys(pages)).toEqual(['/src/pages/Home.tsx']);
    expect(Object.keys(companions)).toEqual([]);
    expect(isLaneAAuthorityPath('/src/App.tsx')).toBe(true);
    expect(isLaneAAuthorityPath('/src/pages/components/Card.tsx')).toBe(false);
  });

  it('detects a page whose companion module is missing', () => {
    const unresolved = findUnresolvedLocalImports({
      '/src/pages/Gallery.tsx': 'import GalleryItem from "./components/GalleryItem";',
    });

    expect(unresolved).toEqual([
      { filePath: '/src/pages/Gallery.tsx', importPath: './components/GalleryItem' },
    ]);
  });

  it('resolves imports through extensions, index files and stylesheets', () => {
    const unresolved = findUnresolvedLocalImports({
      '/src/pages/Gallery.tsx': [
        'import "./gallery.css";',
        'import GalleryItem from "./components/GalleryItem";',
        'import { helpers } from "../lib/helpers";',
      ].join('\n'),
      '/src/pages/components/GalleryItem.tsx': 'export default () => null;',
      '/src/lib/helpers/index.ts': 'export const helpers = {};',
    });

    expect(unresolved).toEqual([]);
  });
});

describe('SystemLauncher Lane B merge wiring', () => {
  const launcherSource = readFileSync(
    resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
    'utf8',
  );

  it('scopes Lane B batches through the companion-aware helper', () => {
    expect(launcherSource).toContain('scopeLaneBBatchFiles(');
    // The old strict page-path filter dropped companion modules.
    expect(launcherSource).not.toContain('.filter(([path]) => requestedPaths.has(path))');
  });

  it('reports, but never repairs, a residual import gap at the handoff boundary', () => {
    expect(launcherSource).toContain('const unresolved = findUnresolvedLocalImports(artifacts.files);');
    expect(launcherSource).toContain('acceptance bypassed — unresolved local imports');
    expect(launcherSource).not.toContain('repairUnresolvedLocalImports(artifacts.files)');
  });
});
