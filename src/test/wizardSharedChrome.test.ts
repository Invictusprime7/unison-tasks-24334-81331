import { describe, expect, it } from 'vitest';
import {
  buildCanonicalWizardSharedChromeModules,
  getCanonicalWizardSharedChrome,
  getMissingCanonicalChromeRoutes,
} from '@/services/wizardSharedChrome';
import { createBuilderPage, createEmptyPageRegistry } from '@/types/pageRegistry';

describe('canonical wizard shared chrome', () => {
  it('restores the approved shared modules regardless of source path prefix', () => {
    expect(getCanonicalWizardSharedChrome('/src/sections/SiteNavbar.tsx'))
      .toContain('export default SiteNavbar');
    expect(getCanonicalWizardSharedChrome('/sections/SiteFooter.tsx'))
      .toContain('export default SiteFooter');
  });

  it('does not allow arbitrary shared modules to bypass the syntax gate', () => {
    expect(getCanonicalWizardSharedChrome('/src/sections/PromoBanner.tsx')).toBeNull();
    expect(getCanonicalWizardSharedChrome('/src/components/Runtime.tsx')).toBeNull();
  });

  it('derives navbar and footer links from every visible PageRegistry route', () => {
    const registry = createEmptyPageRegistry();
    const home = createBuilderPage('home', 'Home', '/', 'home', {
      isHome: true,
      showInNav: true,
      navOrder: 0,
      filePath: '/src/pages/Home.tsx',
    });
    const about = createBuilderPage('about', 'Our Story', '/about', 'about', {
      showInNav: true,
      navOrder: 1,
      filePath: '/src/pages/About.tsx',
    });
    const checkout = createBuilderPage('checkout', 'Checkout', '/checkout', 'checkout', {
      showInNav: false,
      navOrder: 2,
      filePath: '/src/pages/Checkout.tsx',
    });
    registry.pages = { home, about, checkout };
    registry.homePageId = home.pageId;

    const files = buildCanonicalWizardSharedChromeModules(registry, 'North Pier Studio');
    const navbar = files['/src/sections/SiteNavbar.tsx'];
    const footer = files['/src/sections/SiteFooter.tsx'];

    for (const source of [navbar, footer]) {
      expect(source).toContain('North Pier Studio');
      expect(source).toContain('"path": "/"');
      expect(source).toContain('"path": "/about"');
      expect(source).not.toContain('"path": "/checkout"');
      expect(source).toContain('data-ut-path={item.path}');
    }
    expect(getMissingCanonicalChromeRoutes(files, registry)).toEqual([]);
  });
});
