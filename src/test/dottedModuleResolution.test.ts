import { describe, it, expect } from 'vitest';
import { findUnresolvedLocalImports } from '@/services/laneBCompanionModules';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';

const SECTION_MAP_PAGE = [
  "import { SECTION_MAP } from './Home.sections';",
  'export default function Home() { return <main>{Object.keys(SECTION_MAP).length}</main>; }',
].join('\n');

describe('dotted module names resolve against their real file', () => {
  it('treats "./Home.sections" as a module name, not an extension', () => {
    expect(
      findUnresolvedLocalImports({
        '/src/pages/Home.tsx': SECTION_MAP_PAGE,
        '/src/pages/Home.sections.ts': 'export const SECTION_MAP = {};',
      }),
    ).toEqual([]);
  });

  it('still reports genuinely missing dotted modules', () => {
    expect(
      findUnresolvedLocalImports({ '/src/pages/Home.tsx': SECTION_MAP_PAGE }),
    ).toEqual([{ filePath: '/src/pages/Home.tsx', importPath: './Home.sections' }]);
  });

  it('does not fail wizard preview prep for section-map imports', () => {
    const files = {
      '/src/App.tsx': "import Home from './pages/Home'; export default function App() { return <Home />; }",
      '/src/pages/Home.tsx': SECTION_MAP_PAGE,
      '/src/pages/Home.sections.ts': 'export const SECTION_MAP = {};',
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap_dotted',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
    };
    expect(() => prepareSandpackFiles(files)).not.toThrow();
  });
});
