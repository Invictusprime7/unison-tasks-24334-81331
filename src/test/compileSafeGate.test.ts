import { describe, expect, it } from 'vitest';
import {
  acceptGeneratedBundle,
  ensureReactRuntimeImports,
  normalizeGeneratedImports,
  resolveCandidateModule,
  runCompileSafeAcceptance,
  validateBundleTopology,
  hasFatalCompileErrors,
} from '@/services/compileSafeGate';

describe('compile-safe acceptance gate', () => {
  it('merges duplicate imports from the same module', () => {
    const code = [
      "import { MapPin } from 'lucide-react';",
      "import { Phone, MapPin } from 'lucide-react';",
      'export default function Page() { return <div><MapPin /><Phone /></div>; }',
    ].join('\n');

    const result = normalizeGeneratedImports(code);
    expect(result.changed).toBe(true);
    expect(result.code.match(/from 'lucide-react'/g)).toHaveLength(1);
    expect(result.code).toContain('MapPin');
    expect(result.code).toContain('Phone');
  });

  it('merges a default import with a later named import', () => {
    const code = [
      "import React from 'react';",
      "import { useState } from 'react';",
      'export default function Page() { const [a] = useState(0); return <div>{a}</div>; }',
    ].join('\n');

    const merged = normalizeGeneratedImports(code).code;
    expect(merged.match(/from 'react'/g)).toHaveLength(1);
    expect(merged).toContain("import React, { useState } from 'react';");
  });

  it('closes missing React hook imports without touching the body', () => {
    const code = [
      'export default function Page() {',
      '  const [open, setOpen] = useState(false);',
      '  useEffect(() => { setOpen(true); }, []);',
      '  return <div data-ut-intent="nav.goto">{String(open)}</div>;',
      '}',
    ].join('\n');

    const { code: next, added } = ensureReactRuntimeImports(code);
    expect(added).toEqual(['useState', 'useEffect']);
    expect(next).toContain("import { useState, useEffect } from 'react';");
    expect(next).toContain('data-ut-intent="nav.goto"');
  });

  it('does not add hook imports when React namespace is used', () => {
    const code = [
      "import * as React from 'react';",
      'export default function Page() { const [a] = React.useState(0); return <p>{a}</p>; }',
    ].join('\n');
    expect(ensureReactRuntimeImports(code).added).toEqual([]);
  });

  it('resolves candidate modules generated in the same transaction', () => {
    const candidates = new Set(['/src/pages/Home.tsx', '/src/pages/Home.sections.tsx']);
    expect(
      resolveCandidateModule('/src/pages/Home.tsx', './Home.sections', candidates),
    ).toBe('/src/pages/Home.sections.tsx');
    expect(resolveCandidateModule('/src/pages/Home.tsx', '@/pages/Home', candidates)).toBe(
      '/src/pages/Home.tsx',
    );
  });

  it('blocks unresolved relative imports with structured diagnostics', () => {
    const result = runCompileSafeAcceptance({
      '/src/pages/Home.tsx': [
        "import Hero from './sections/Hero';",
        'export default function Home() { return <Hero />; }',
      ].join('\n'),
    }, { sourceLane: 'lane-b' });

    expect(result.accepted).toBe(false);
    const diagnostic = result.blocking[0];
    expect(diagnostic.diagnosticCode).toBe('UNRESOLVED_MODULE');
    expect(diagnostic.validationStage).toBe('module-resolution');
    expect(diagnostic.sourceLane).toBe('lane-b');
    expect(diagnostic.pagePath).toBe('/src/pages/Home.tsx');
  });

  it('accepts a bundle whose imports resolve within the candidate set', () => {
    const result = runCompileSafeAcceptance({
      '/src/pages/Home.tsx': [
        "import Hero from './sections/Hero';",
        'export default function Home() { return <Hero />; }',
      ].join('\n'),
      '/src/pages/sections/Hero.tsx': 'export default function Hero() { return <section>Hero</section>; }',
    });

    expect(result.blocking).toEqual([]);
    expect(result.accepted).toBe(true);
  });

  it('drops unused hallucinated dependencies and blocks used ones', () => {
    const result = runCompileSafeAcceptance({
      '/src/pages/A.tsx': [
        "import { Unused } from '@some/hallucinated-ui';",
        'export default function A() { return <div>A</div>; }',
      ].join('\n'),
      '/src/pages/B.tsx': [
        "import { Chart } from 'react-fancy-charts';",
        'export default function B() { return <Chart />; }',
      ].join('\n'),
    });

    expect(result.files['/src/pages/A.tsx']).not.toContain('hallucinated-ui');
    const blocked = result.blocking.filter((d) => d.diagnosticCode === 'UNSUPPORTED_DEPENDENCY');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].pagePath).toBe('/src/pages/B.tsx');
  });

  it('reports parse failures with line/column provenance', () => {
    const result = runCompileSafeAcceptance({
      '/src/pages/Broken.tsx': 'export default function Broken() { return <div>; }',
    });
    const parseDiag = result.blocking.find((d) => d.diagnosticCode === 'PARSE_ERROR');
    expect(parseDiag).toBeDefined();
    expect(parseDiag?.pagePath).toBe('/src/pages/Broken.tsx');
  });

  it('keeps an AI repair only when the deterministic gate re-validates it', async () => {
    const files = {
      '/src/pages/Home.tsx': 'export default function Home() { return <div>; }',
    };

    const rejected = await acceptGeneratedBundle(files, {
      maxRepairAttempts: 1,
      repair: async () => 'export default function Home() { return <div>; }  // still broken',
    });
    expect(rejected.accepted).toBe(false);

    const accepted = await acceptGeneratedBundle(files, {
      maxRepairAttempts: 1,
      repair: async () => 'export default function Home() { return <div>ok</div>; }',
    });
    expect(accepted.accepted).toBe(true);
    expect(accepted.files['/src/pages/Home.tsx']).toContain('ok');
  });

  it('does not run runtime dependency checks over build tooling config files', () => {
    const result = runCompileSafeAcceptance({
      '/vite.config.ts': [
        "import { defineConfig } from 'vite';",
        "import react from '@vitejs/plugin-react-swc';",
        "import path from 'path';",
        'export default defineConfig({ plugins: [react()], resolve: { alias: { "@": path.resolve("./src") } } });',
      ].join('\n'),
      '/tailwind.config.ts': "import animate from 'tailwindcss-animate';\nexport default { plugins: [animate] };",
      '/src/pages/Home.tsx': 'export default function Home() { return <main>Home</main>; }',
    });

    expect(result.blocking).toEqual([]);
    expect(result.accepted).toBe(true);
  });
});

describe('bundle-level topology gate (Phase 10)', () => {
  it('blocks a snapshot page whose file is absent from the candidate bundle', () => {
    const diagnostics = validateBundleTopology(
      { '/src/pages/Home.tsx': 'export default function Home() { return <main>H</main>; }' },
      {
        pageRegistry: {
          homePageId: 'home',
          pages: {
            home: { pageId: 'home', slug: 'home', filePath: '/src/pages/Home.tsx' },
            about: { pageId: 'about', slug: 'about', filePath: '/src/pages/About.tsx' },
          },
        },
      },
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].diagnosticCode).toBe('MISSING_TOPOLOGY_FILE');
    expect(diagnostics[0].pagePath).toBe('/src/pages/About.tsx');
    expect(diagnostics[0].validationStage).toBe('bundle-topology');
  });

  it('blocks a router route target that was never generated', () => {
    const diagnostics = validateBundleTopology(
      {
        '/src/App.tsx': "import Home from './pages/Home.tsx';\nimport About from './pages/About.tsx';\nexport default function App() { return <Home />; }",
        '/src/pages/Home.tsx': 'export default function Home() { return <main>H</main>; }',
      },
      { routerFile: { path: '/src/App.tsx' }, pageRegistry: { pages: {} } },
    );
    expect(diagnostics.map((d) => d.diagnosticCode)).toContain('MISSING_ROUTE_TARGET');
  });

  it('accepts a complete topology and treats warnings as non-fatal', () => {
    const files = {
      '/src/App.tsx': "import Home from './pages/Home.tsx';\nexport default function App() { return <Home />; }",
      '/src/pages/Home.tsx': 'export default function Home() { return <main>H</main>; }',
    };
    const diagnostics = validateBundleTopology(files, {
      routerFile: { path: '/src/App.tsx' },
      pageRegistry: { homePageId: 'home', pages: { home: { pageId: 'home', filePath: '/src/pages/Home.tsx' } } },
    });
    expect(diagnostics).toEqual([]);
    expect(hasFatalCompileErrors(runCompileSafeAcceptance(files).diagnostics)).toBe(false);
  });

  it('flags duplicate module-scope declarations without rewriting them', () => {
    const result = runCompileSafeAcceptance({
      '/src/pages/Dup.tsx': [
        'function Hero() { return <div>a</div>; }',
        'function Hero() { return <div>b</div>; }',
        'export default function Dup() { return <Hero />; }',
      ].join('\n'),
    });
    const dup = result.diagnostics.find((d) => d.diagnosticCode === 'DUPLICATE_DECLARATION');
    expect(dup?.message).toContain('Hero');
    expect(dup?.pagePath).toBe('/src/pages/Dup.tsx');
    expect(result.files['/src/pages/Dup.tsx']).toContain('function Hero()');
  });

  it('treats a parse failure as fatal for commit acceptance', () => {
    const result = runCompileSafeAcceptance({
      '/src/pages/Broken.tsx': 'export default function Broken() { return <div>; }',
    });
    expect(hasFatalCompileErrors(result.diagnostics)).toBe(true);
  });
});
