import { describe, expect, it, vi } from 'vitest';
import { PreviewRuntimeController } from '../PreviewRuntimeController';
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
        kind: 'page',
      } as any,
      about: {
        pageId: 'about',
        label: 'About',
        path: '/about',
        slug: 'about',
        isHome: false,
        filePath: '/src/pages/About.tsx',
        kind: 'page',
      } as any,
    },
    order: ['home', 'about'],
  } as unknown as PageRegistry;
}

describe('PreviewRuntimeController', () => {
  it('initializes with default live mode and empty pending set', () => {
    const c = new PreviewRuntimeController();
    expect(c.mode).toBe('live');
    expect(c.getState().pendingGenerations.size).toBe(0);
    expect(c.getState().activeRoute).toBe('/');
  });

  it('hydrates from registry and exposes available routes', () => {
    const c = new PreviewRuntimeController();
    c.hydrateFromRegistry(makeRegistry());
    expect(c.getState().activePageId).toBe('home');
    expect(c.getState().availableRoutes).toEqual(['/', '/about']);
  });

  it('navigateTo emits new route', () => {
    const c = new PreviewRuntimeController();
    const seen: string[] = [];
    c.subscribe(s => seen.push(s.activeRoute));
    c.navigateTo(makeRegistry(), 'about');
    expect(c.getState().activeRoute).toBe('/about');
    expect(seen[seen.length - 1]).toBe('/about');
  });

  it('tracks pending generations idempotently', () => {
    const c = new PreviewRuntimeController();
    const fn = vi.fn();
    c.subscribe(fn);
    c.markGenerationPending('about');
    c.markGenerationPending('about'); // no-op
    c.markGenerationComplete('about');
    expect(fn).toHaveBeenCalledTimes(2); // pending + complete
    expect(c.getState().pendingGenerations.size).toBe(0);
  });

  it('forScratch returns a sibling in scratch mode', () => {
    const s = PreviewRuntimeController.forScratch('patch-1');
    expect(s.mode).toBe('scratch');
    expect(s.label).toContain('patch-1');
  });



  it('applyRouterCode imports payload and bumps lastRouterUpdate', async () => {
    const c = new PreviewRuntimeController();
    const before = c.getState().lastRouterUpdate;
    await new Promise(r => setTimeout(r, 2));
    const imp = vi.fn();
    const wrote = c.applyRouterCode(imp, '/src/App.tsx', 'export default () => null;', { '/src/extra.tsx': 'x' });
    expect(wrote).toBe(true);
    expect(imp).toHaveBeenCalledWith({
      '/src/extra.tsx': 'x',
      '/src/App.tsx': 'export default () => null;',
    });
    expect(c.getState().lastRouterUpdate).toBeGreaterThan(before);
  });

  it('applyRouterCode is a no-op when nothing to write', () => {
    const c = new PreviewRuntimeController();
    const imp = vi.fn();
    const wrote = c.applyRouterCode(imp, '/src/App.tsx', '', undefined);
    expect(wrote).toBe(false);
    expect(imp).not.toHaveBeenCalled();
  });

  it('markReloaded bumps lastRouterUpdate', async () => {
    const c = new PreviewRuntimeController();
    const before = c.getState().lastRouterUpdate;
    await new Promise(r => setTimeout(r, 2));
    c.markReloaded();
    expect(c.getState().lastRouterUpdate).toBeGreaterThan(before);
  });
});

