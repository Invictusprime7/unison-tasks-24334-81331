import { describe, expect, it } from 'vitest';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';

describe('wizard VFS integrity', () => {
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
});