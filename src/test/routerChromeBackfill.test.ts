import { describe, it, expect } from 'vitest';
import { generateCanonicalRouter } from '@/utils/topologyRouterGenerator';
import type { PageRegistry } from '@/types/pageRegistry';

const registry = {
  pages: {
    home: {
      id: 'home',
      name: 'Home',
      path: '/',
      filePath: '/src/pages/Home.tsx',
      isHome: true,
      navOrder: 0,
    },
    about: {
      id: 'about',
      name: 'About',
      path: '/about',
      filePath: '/src/pages/About.tsx',
      isHome: false,
      navOrder: 1,
    },
  },
} as unknown as PageRegistry;

describe('router-level chrome backfill', () => {
  it('wraps only routes that are missing chrome', () => {
    const code = generateCanonicalRouter(registry, 'Acme', {
      withSharedChrome: false,
      chromeByRoute: { '/': { header: true, footer: true } },
    });

    expect(code).toContain("import { PageChromeHeader, PageChromeFooter } from './components/PageChrome.tsx';");
    expect(code).toContain('<><PageChromeHeader /><Home /><PageChromeFooter /></>');
    expect(code).toContain('element={<About />}');
    expect(code).not.toMatch(/Body/);
  });

  it('emits a plain router when no page needs chrome', () => {
    const code = generateCanonicalRouter(registry, 'Acme', { withSharedChrome: false, chromeByRoute: {} });
    expect(code).not.toContain('PageChrome');
    expect(code).toContain('element={<Home />}');
  });

  it('supports partial chrome (footer only)', () => {
    const code = generateCanonicalRouter(registry, 'Acme', {
      withSharedChrome: false,
      chromeByRoute: { '/about': { header: false, footer: true } },
    });
    expect(code).toContain('<><About /><PageChromeFooter /></>');
    expect(code).toContain('element={<Home />}');
  });
});
