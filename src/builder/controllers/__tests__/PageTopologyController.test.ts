import { describe, expect, it, vi } from 'vitest';
import { PageTopologyController } from '../PageTopologyController';
import type { PageRegistry } from '@/types/pageRegistry';

function makeRegistry(): PageRegistry {
  return {
    version: 1,
    pages: {
      home: {
        pageId: 'home',
        label: 'Home',
        path: '/',
        slug: 'home',
        isHome: true,
        filePath: '/src/pages/Home.tsx',
        showInNav: true,
        navOrder: 0,
        pageType: 'home',
      } as any,
    },
    funnels: {},
    order: ['home'],
  } as unknown as PageRegistry;
}

describe('PageTopologyController', () => {
  it('starts with no registry by default', () => {
    const c = new PageTopologyController();
    expect(c.getRegistry()).toBeNull();
  });

  it('setRegistry notifies subscribers', () => {
    const c = new PageTopologyController();
    const fn = vi.fn();
    c.subscribe(fn);
    const reg = makeRegistry();
    c.setRegistry(reg);
    expect(fn).toHaveBeenCalledWith(reg);
    expect(c.getRegistry()).toBe(reg);
  });

  it('applyChange throws when no registry is set', () => {
    const c = new PageTopologyController();
    expect(() =>
      c.applyChange({ type: 'add_page', title: 'X' }, {}, 'Acme'),
    ).toThrow(/without a registry/);
  });

  it('applyChange commits a valid add_page and bumps version', () => {
    const c = new PageTopologyController({ initialRegistry: makeRegistry() });
    const before = c.getRegistry()!.version;
    const result = c.applyChange(
      { type: 'add_page', title: 'About', route: '/about' },
      {},
      'Acme',
    );
    expect(result.updatedRegistry.version).toBe(before + 1);
    expect(c.getRegistry()!.version).toBe(before + 1);
    expect(result.newPageId).toBeTruthy();
  });

  it('deriveRouteFromLabel slugifies labels', () => {
    const c = new PageTopologyController();
    expect(c.deriveRouteFromLabel('About Us')).toBe('/about-us');
  });
});
