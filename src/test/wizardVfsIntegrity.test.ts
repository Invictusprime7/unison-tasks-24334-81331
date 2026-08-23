import { describe, expect, it } from 'vitest';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import {
  PUBLISHED_RUNTIME_METADATA_PATH,
  PUBLISHED_RUNTIME_MODULE_PATH,
} from '@/services/publishedRuntimeModule';

describe('wizard VFS integrity', () => {
  it('restores the published runtime module from its persisted contract before strict import closure', () => {
    const runtime = {
      version: '1.0',
      runtimeVersion: '1.0',
      siteId: 'site-runtime-recovery',
      businessId: 'business-runtime-recovery',
      projectId: 'project-runtime-recovery',
      snapshotId: 'snap-runtime-recovery',
      endpoint: 'https://runtime.example/read',
      runtimeEndpoint: 'https://runtime.example/runtime',
      formEndpoint: 'https://runtime.example/forms',
      controllerEndpoints: {},
    };
    const prepared = prepareSandpackFiles({
      '/src/App.tsx': "import { useSectionData } from './components/catalogHydration'; export default function App() { useSectionData('featured'); return <main>Catalog</main>; }",
      '/src/components/catalogHydration.ts': "import { PUBLISHED_RUNTIME_CONFIG } from '../unison/publishedRuntime'; export const useSectionData = (_id: string) => PUBLISHED_RUNTIME_CONFIG.siteId;",
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap-runtime-recovery',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
      [PUBLISHED_RUNTIME_METADATA_PATH]: JSON.stringify(runtime),
    });

    expect(prepared['/unison/publishedRuntime.ts']).toContain('PUBLISHED_RUNTIME_CONFIG');
    expect(prepared['/unison/publishedRuntime.ts']).toContain('site-runtime-recovery');
    expect(prepared[PUBLISHED_RUNTIME_MODULE_PATH]).toBeUndefined();
  });

  it('still fails closed when both the published runtime module and contract are missing', () => {
    expect(() => prepareSandpackFiles({
      '/src/App.tsx': "import { useSectionData } from './components/catalogHydration'; export default function App() { useSectionData('featured'); return <main>Catalog</main>; }",
      '/src/components/catalogHydration.ts': "import { PUBLISHED_RUNTIME_CONFIG } from '../unison/publishedRuntime'; export const useSectionData = (_id: string) => PUBLISHED_RUNTIME_CONFIG.siteId;",
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap-runtime-missing',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
    })).toThrow(/missing local module.*publishedRuntime/i);
  });

  it('restores canonical shared wizard chrome instead of synthesizing empty modules', () => {
    const files = {
      '/src/App.tsx': [
        "import Home from './pages/Home';",
        'export default function App() { return <Home />; }',
      ].join('\n'),
      '/src/pages/Home.tsx': [
        "import SiteNavbar from '../sections/SiteNavbar';",
        'export default function Home() {',
        '  return <main><SiteNavbar /><section>Rich home content</section></main>;',
        '}',
      ].join('\n'),
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap_integrity',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
    };

    const prepared = prepareSandpackFiles(files);

    expect(prepared['/sections/SiteNavbar.tsx']).toContain('export default SiteNavbar');
    expect(prepared['/sections/SiteNavbar.tsx']).toContain('aria-label="Primary navigation"');
  });

  it('does not mistake DOM generics in the interaction runtime for JSX components', () => {
    const files = {
      '/src/App.tsx': "import Runtime from './components/UnisonInteractionRuntime'; export default function App() { return <Runtime />; }",
      '/src/components/UnisonInteractionRuntime.tsx': [
        "import { useEffect } from 'react';",
        'export default function Runtime() {',
        '  useEffect(() => { document.querySelectorAll<HTMLElement>(\'button\'); }, []);',
        '  return null;',
        '}',
      ].join('\n'),
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap_interactions',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
    };

    const prepared = prepareSandpackFiles(files);

    expect(prepared['/components/UnisonInteractionRuntime.tsx']).not.toContain("from './components/HTMLElement'");
    expect(prepared['/components/HTMLElement.tsx']).toBeUndefined();
  });

  it('continues to block arbitrary missing imports in wizard VFS files', () => {
    const files = {
      '/src/App.tsx': "import MissingPortfolioGrid from './components/MissingPortfolioGrid'; export default function App() { return <MissingPortfolioGrid />; }",
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap_strict',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
    };

    expect(() => prepareSandpackFiles(files)).toThrow(/missing local module.*MissingPortfolioGrid/i);
  });

  it('rejects conflicting canonical and root aliases instead of overwriting by iteration order', () => {
    expect(() => prepareSandpackFiles({
      '/src/App.tsx': 'export default function App() { return <main>Canonical app</main>; }',
      '/App.tsx': 'export default function App() { return <main>Shadow app</main>; }',
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
    })).toThrow(/both map to Sandpack module "\/App\.tsx"/i);
  });

  it('deduplicates identical canonical and root aliases safely', () => {
    const app = 'export default function App() { return <main>Same app</main>; }';
    const prepared = prepareSandpackFiles({
      '/src/App.tsx': app,
      '/App.tsx': app,
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
    });

    expect(prepared['/App.tsx']).toContain('Same app');
  });

  it('rejects unbound JSX components before the runtime can render placeholder labels', () => {
    const files = {
      '/src/App.tsx': 'export default function App() { return <main><MissingPortfolioGrid /></main>; }',
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap_unbound_jsx',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
    };

    expect(() => prepareSandpackFiles(files)).toThrow(/missing local module.*MissingPortfolioGrid/i);

    const valid = prepareSandpackFiles({
      '/src/App.tsx': 'export default function App() { return <main>Complete component contract</main>; }',
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap_valid_jsx',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
    });

    expect(valid['/index.tsx']).toContain('React runtime patch disabled');
    expect(valid['/index.tsx']).not.toContain('⚠ missing component');
  });

  it('reuses a prepared result across the launcher strict gate and Preview mount without cross-call mutation leaking', () => {
    const files = {
      '/src/App.tsx': "export default function App() { return <main>Cache reuse check</main>; }",
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap_cache_reuse',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
    };

    // Launcher strict gate: validates and discards its own output.
    const strictResult = prepareSandpackFiles(files, { strict: true, entryPoint: '/src/App.tsx' });
    strictResult['/launch-metadata.json'] = 'mutated by the discarding caller';

    // Preview mount: same files, no strict flag — must share the cached
    // computation (same content) and must NOT see the strict caller's mutation.
    const previewResult = prepareSandpackFiles(files, { entryPoint: '/src/App.tsx' });

    expect(previewResult['/App.tsx']).toContain('Cache reuse check');
    expect(previewResult['/launch-metadata.json']).toBeUndefined();
  });

  it('resolves aliases, absolute src paths, re-exports, and JSON modules after flattening', () => {
    const files = {
      '/src/App.tsx': [
        "import Home from '@/pages/Home';",
        "import settings from '/src/data/settings.json';",
        "export { Card } from '@/components/Card';",
        'export default function App() { return <Home title={settings.title} />; }',
      ].join('\n'),
      '/src/pages/Home.tsx': [
        "import { Card } from '/src/components/Card';",
        'export default function Home({ title }: { title: string }) { return <Card>{title}</Card>; }',
      ].join('\n'),
      '/src/components/Card.tsx': 'export function Card({ children }: { children: React.ReactNode }) { return <section>{children}</section>; }',
      '/src/data/settings.json': JSON.stringify({ title: 'Resolved preview' }),
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
      '/.unison/wizard-seed.json': JSON.stringify({ source: 'system-launcher' }),
      '/.unison/site-bundle-snapshot.json': JSON.stringify({
        snapshotId: 'snap_module_resolution',
        pageRegistry: { pages: {} },
        vfsFiles: {},
        meta: { source: 'wizard' },
      }),
    };

    const prepared = prepareSandpackFiles(files);

    expect(prepared['/data/settings.json']).toContain('Resolved preview');
    expect(prepared['/App.tsx']).toContain("from './pages/Home'");
    expect(prepared['/App.tsx']).toContain("from './components/Card'");
    expect(prepared['/App.tsx']).not.toContain('@/');
    expect(prepared['/pages/Home.tsx']).toContain("from '../components/Card'");
    expect(prepared['/pages/Home.tsx']).not.toContain('/src/');
  });
});