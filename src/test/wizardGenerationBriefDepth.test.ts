import { describe, expect, it } from 'vitest';
import { buildWizardGenerationBrief } from '@/services/wizardGenerationBrief';
import { createBuilderPage, createEmptyPageRegistry } from '@/types/pageRegistry';

function registryWithPages() {
  const registry = createEmptyPageRegistry();
  const home = createBuilderPage('home', 'Home', '/', 'home', {
    isHome: true, showInNav: true, navOrder: 0, filePath: '/src/pages/Home.tsx',
  });
  const about = createBuilderPage('about', 'About', '/about', 'about', {
    showInNav: true, navOrder: 1, filePath: '/src/pages/About.tsx',
  });
  const services = createBuilderPage('services', 'Services', '/services', 'custom', {
    showInNav: true, navOrder: 2, filePath: '/src/pages/Services.tsx',
  });
  registry.pages = { home, about, services };
  registry.homePageId = home.pageId;
  return registry;
}

const baseInput = {
  pageRegistry: registryWithPages(),
  vfsFiles: {} as Record<string, string>,
  themePresetId: 'midnight-editorial',
  industry: 'salon',
};

describe('wizard generation brief — depth + anti-repetition', () => {
  it('declares a page-depth floor for every route', () => {
    const brief = buildWizardGenerationBrief({ ...baseInput, seed: 'seed-a' });
    expect(brief.routes.length).toBe(3);
    for (const route of brief.routes) {
      expect(route.depth.minSections).toBeGreaterThanOrEqual(4);
      expect(route.depth.maxSections).toBeGreaterThan(route.depth.minSections);
      expect(route.signature.sectionOrder.length).toBeGreaterThanOrEqual(4);
      expect(route.signature.sectionOrder[route.signature.sectionOrder.length - 1]).toBe('cta');
    }
    expect(brief.routes.find((r) => r.role === 'home')?.depth.minSections).toBe(6);
  });

  it('gives each page its own rhythm so routes never read the same', () => {
    const brief = buildWizardGenerationBrief({ ...baseInput, seed: 'seed-a' });
    const orders = brief.routes.map((route) => route.signature.sectionOrder.join('>'));
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('is reproducible for the same seed and diverges for a new one', () => {
    const a = buildWizardGenerationBrief({ ...baseInput, seed: 'seed-a' });
    const b = buildWizardGenerationBrief({ ...baseInput, seed: 'seed-a' });
    const c = buildWizardGenerationBrief({ ...baseInput, seed: 'seed-z' });
    expect(JSON.stringify(a.routes)).toBe(JSON.stringify(b.routes));
    expect(JSON.stringify(a.routes)).not.toBe(JSON.stringify(c.routes));
  });
});
