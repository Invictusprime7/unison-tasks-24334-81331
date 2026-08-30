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

  it('closes the local import contract before sealing the artifact', () => {
    expect(launcherSource).toContain('const preSealUnresolvedImports = findUnresolvedLocalImports(wiredVfsFiles);');
    // Unresolved modules are a hard failure, not another degradation toast.
    expect(launcherSource).not.toContain("'lane_b.unresolved_module'");
  });

  it('never substitutes Stage 4b page bodies for failed AI authorship', () => {
    expect(launcherSource).not.toContain('seedGenerationResult');
    expect(launcherSource).not.toContain("'enrich.pages_from_seed'");
    expect(launcherSource).toContain('Lane B failed to author registered pages');
  });

  it('recovers missing companion modules with an AI completion turn', () => {
    expect(launcherSource).toContain('LANE B MODULE CLOSURE TURN');
    expect(launcherSource).toContain('const authorMissingModules = async (');
  });

  it('injects the module inventory into Lane B turns', () => {
    expect(launcherSource).toContain('buildModuleInventoryDirective({');
    expect(launcherSource).not.toContain('Return ONLY this file in the WizardSeed multi-file JSON contract.');
  });
});

describe('module inventory directive', () => {
  it('lists existing modules, states the import contract and keeps styling universal', () => {
    const directive = buildModuleInventoryDirective({
      files: {
        '/src/pages/Home.tsx': 'export default function Home() { return null; }',
        '/src/pages/components/Hero.tsx': 'export const Hero = () => null;',
        '/src/index.css': ':root{}',
      },
      targetPaths: ['/src/pages/About.tsx'],
      aliasImports: ['@/unison/ui/button'],
    });

    expect(directive).toContain('/src/pages/components/Hero.tsx');
    expect(directive).toContain('Hero');
    expect(directive).not.toContain('/src/index.css');
    expect(directive).toContain('@/unison/ui/button');
    expect(directive).toContain('SAME response');
    expect(directive).toMatch(/available for EVERY industry/i);
  });

  it('is industry-neutral: the same modules are offered regardless of industry', () => {
    const files = { '/src/pages/components/Gallery.tsx': 'export const Gallery = () => null;' };
    expect(buildModuleInventoryDirective({ files })).toEqual(
      buildModuleInventoryDirective({ files }),
    );
  });
});
