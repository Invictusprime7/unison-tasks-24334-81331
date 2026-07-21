import { describe, expect, it } from 'vitest';
import { syncTopologyAndRouter } from '@/services/pageTopologyOrchestrator';
import { buildCanonicalWizardSharedChromeModules } from '@/services/wizardSharedChrome';
import { createBuilderPage, createEmptyPageRegistry } from '@/types/pageRegistry';

describe('page topology shared chrome sync', () => {
  it('rebuilds navbar, footer, and router atomically after registry changes', () => {
    const registry = createEmptyPageRegistry();
    const home = createBuilderPage('home', 'Home', '/', 'home', {
      isHome: true,
      showInNav: true,
      navOrder: 0,
      filePath: '/src/pages/Home.tsx',
    });
    registry.pages = { home };
    registry.homePageId = home.pageId;

    const initialFiles = {
      '/src/pages/Home.tsx': 'export default function Home(){ return <main>Home</main>; }',
      ...buildCanonicalWizardSharedChromeModules(registry, 'Acme Studio'),
    };

    const contact = createBuilderPage('contact', 'Contact', '/contact', 'contact', {
      showInNav: true,
      navOrder: 1,
      filePath: '/src/pages/Contact.tsx',
    });
    const updatedRegistry = {
      ...registry,
      version: registry.version + 1,
      pages: { ...registry.pages, contact },
    };
    const result = syncTopologyAndRouter(updatedRegistry, {
      ...initialFiles,
      '/src/pages/Contact.tsx': 'export default function Contact(){ return <main>Contact</main>; }',
    }, 'Acme Studio');

    expect(result.filesToImport['/src/sections/SiteNavbar.tsx']).toContain('"path": "/contact"');
    expect(result.filesToImport['/src/sections/SiteFooter.tsx']).toContain('"path": "/contact"');
    expect(result.routerCode).toContain('path="/contact"');
    expect(result.routerCode.match(/<SiteNavbar \/>/g)).toHaveLength(1);
    expect(result.routerCode.match(/<SiteFooter \/>/g)).toHaveLength(1);
  });
});
