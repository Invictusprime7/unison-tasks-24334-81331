import { describe, expect, it } from 'vitest';
import {
  assertPreviewSmokeSafe,
  runPreviewSmokeGate,
  summarizePreviewSmoke,
} from '@/services/previewSmokeGate';
import { runCompileSafeAcceptance } from '@/services/compileSafeGate';

const ENTRY = [
  "import { createRoot } from 'react-dom/client';",
  "import App from './App';",
  "createRoot(document.getElementById('root')).render(<App />);",
].join('\n');

function bundle(extra: Record<string, string>): Record<string, string> {
  return { '/index.tsx': ENTRY, ...extra };
}

describe('preview smoke gate (Phase 11)', () => {
  it('accepts a complete multi-page bundle and reports the reachable graph', () => {
    const result = runPreviewSmokeGate(
      bundle({
        '/App.tsx': [
          "import Home from './pages/Home';",
          "import About from './pages/About';",
          'export default function App() { return <><Home /><About /></>; }',
        ].join('\n'),
        '/pages/Home.tsx': 'export default function Home() { return <main>Home</main>; }',
        '/pages/About.tsx': 'export default function About() { return <main>About</main>; }',
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.entryPoint).toBe('/index.tsx');
    expect(result.reachable).toContain('/pages/About.tsx');
    expect(summarizePreviewSmoke(result.diagnostics)).toBe('clean');
  });

  it('blocks a bundle with no entry point', () => {
    const result = runPreviewSmokeGate({ '/App.tsx': 'export default function App() { return null; }' });
    expect(result.ok).toBe(false);
    expect(result.blocking[0].code).toBe('MISSING_ENTRY');
  });

  it('flags a missing route component as a route failure, not a generic module error', () => {
    const result = runPreviewSmokeGate(
      bundle({
        '/App.tsx': [
          "import Home from './pages/Home';",
          "import Pricing from './pages/Pricing';",
          'export default function App() { return <><Home /><Pricing /></>; }',
        ].join('\n'),
        '/pages/Home.tsx': 'export default function Home() { return <main>Home</main>; }',
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.blocking[0].code).toBe('MISSING_ROUTE_COMPONENT');
    expect(result.blocking[0].specifier).toBe('./pages/Pricing');
  });

  it('flags an unresolved local module in a non-route module', () => {
    const result = runPreviewSmokeGate(
      bundle({
        '/App.tsx': "import { theme } from './lib/theme';\nexport default function App() { return <div>{theme}</div>; }",
      }),
    );
    expect(result.blocking.map((d) => d.code)).toContain('UNRESOLVED_MODULE');
  });

  it('flags a default import of a module that only has named exports', () => {
    const result = runPreviewSmokeGate(
      bundle({
        '/App.tsx': "import Hero from './components/Hero';\nexport default function App() { return <Hero />; }",
        '/components/Hero.tsx': 'export function Hero() { return <section>Hero</section>; }',
      }),
    );
    expect(result.blocking.map((d) => d.code)).toContain('MISSING_DEFAULT_EXPORT');
  });

  it('flags a missing named component export in the reachable graph', () => {
    const result = runPreviewSmokeGate(
      bundle({
        '/App.tsx': "import { Hero } from './components/Hero';\nexport default function App() { return <Hero />; }",
        '/components/Hero.tsx': 'export const Banner = () => <section />;',
      }),
    );
    expect(result.blocking.map((d) => d.code)).toContain('INVALID_JSX_COMPONENT_CONTRACT');
  });

  it('flags a top-level throw that would crash the bundle on import', () => {
    const result = runPreviewSmokeGate(
      bundle({
        '/App.tsx': "import './boot';\nexport default function App() { return <div>ok</div>; }",
        '/boot.ts': "throw new Error('missing runtime config');",
      }),
    );
    expect(result.blocking.map((d) => d.code)).toContain('TOP_LEVEL_THROW');
  });

  it('ignores throws inside function bodies', () => {
    const result = runPreviewSmokeGate(
      bundle({
        '/App.tsx': "import { boot } from './boot';\nexport default function App() { return <div>{String(boot)}</div>; }",
        '/boot.ts': 'export function boot() {\n  throw new Error("only at call time");\n}',
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('does not inspect modules unreachable from the entry point', () => {
    const result = runPreviewSmokeGate(
      bundle({
        '/App.tsx': 'export default function App() { return <div>ok</div>; }',
        '/orphan.tsx': "import Nope from './does-not-exist';\nexport default Nope;",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('throws a PreviewPipelineError with provenance when it rejects', () => {
    expect(() =>
      assertPreviewSmokeSafe(
        bundle({ '/App.tsx': "import Home from './pages/Home';\nexport default Home;" }),
        'Preview smoke gate',
      ),
    ).toThrowError(/preview smoke gate rejected the bundle/i);
  });
});

describe('Phase 12 regression matrix', () => {
  it('malformed JSX never reaches the preview gate', () => {
    const result = runCompileSafeAcceptance({
      '/src/pages/Bad.tsx': 'export default function Bad() { return (<section><div></section>); }',
    });
    expect(result.accepted).toBe(false);
    expect(result.blocking.some((d) => d.diagnosticCode === 'PARSE_ERROR')).toBe(true);
  });

  it('export mismatch is reported against the importing file', () => {
    const result = runCompileSafeAcceptance({
      '/src/pages/Home.tsx': "import { Hero } from './Hero';\nexport default function Home() { return <Hero />; }",
      '/src/pages/Hero.tsx': 'export default function Hero() { return <section>Hero</section>; }',
    });
    const mismatch = result.diagnostics.find((d) => d.diagnosticCode === 'EXPORT_MISMATCH');
    expect(mismatch?.pagePath).toBe('/src/pages/Home.tsx');
    expect(result.accepted).toBe(false);
  });

  it('cross-page candidate dependency committed in the same transaction passes both gates', () => {
    const candidate = {
      '/src/pages/Pricing.tsx': [
        "import PricingGrid from '../components/PricingGrid';",
        'export default function Pricing() { return <main><PricingGrid /></main>; }',
      ].join('\n'),
      '/src/components/PricingGrid.tsx':
        'export default function PricingGrid() { return <div>grid</div>; }',
    };
    expect(runCompileSafeAcceptance(candidate).accepted).toBe(true);

    const preview = runPreviewSmokeGate({
      '/index.tsx': "import App from './App';\nexport default App;",
      '/App.tsx': "import Pricing from './pages/Pricing';\nexport default function App() { return <Pricing />; }",
      '/pages/Pricing.tsx': candidate['/src/pages/Pricing.tsx'],
      '/components/PricingGrid.tsx': candidate['/src/components/PricingGrid.tsx'],
    });
    expect(preview.ok).toBe(true);
  });
});
