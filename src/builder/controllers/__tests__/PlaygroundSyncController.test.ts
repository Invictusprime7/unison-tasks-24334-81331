import { describe, it, expect, vi } from 'vitest';
import { PlaygroundSyncController } from '../PlaygroundSyncController';

vi.mock('@/services/playgroundHydrator', () => ({
  hydratePlaygroundFromVFS: vi.fn(() => ({
    pageRegistry: { pages: {}, funnels: {}, homePageId: null, version: 1 } as any,
    creatorData: {} as any,
    funnelAutoWired: false,
    stats: {
      pagesDetected: 0,
      productsExtracted: 0,
      servicesExtracted: 0,
      testimonialsExtracted: 0,
      faqsExtracted: 0,
      componentsExtracted: 0,
      funnelSteps: 0,
    },
  })),
  mergeHydrationResult: vi.fn((existing) => existing),
}));

vi.mock('@/services/playgroundCompiler', () => ({
  compilePlayground: vi.fn(() => ({
    vfsFiles: { '/src/App.tsx': '// router' },
    pageRegistry: { pages: {}, funnels: {}, homePageId: null, version: 1 },
    bindings: [],
    previewManifest: { routes: [], homeRoute: '/' },
  })),
}));

describe('PlaygroundSyncController', () => {
  it('starts with no cached hydration or compile result', () => {
    const c = new PlaygroundSyncController();
    expect(c.getLastHydration()).toBeNull();
    expect(c.getLastCompile()).toBeNull();
    expect(c.label).toBe('playground-sync');
  });

  it('caches hydration result and notifies subscribers', () => {
    const c = new PlaygroundSyncController();
    const listener = vi.fn();
    c.subscribe(listener);
    const result = c.hydrateFromVFS([], { '/src/App.tsx': '' });
    expect(result.stats.pagesDetected).toBe(0);
    expect(c.getLastHydration()).toBe(result);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('caches compile result and notifies subscribers', () => {
    const c = new PlaygroundSyncController();
    const listener = vi.fn();
    c.subscribe(listener);
    const state = {
      pageRegistry: { pages: {}, funnels: {}, homePageId: null, version: 0 },
    } as any;
    const result = c.compile(state);
    expect(result.vfsFiles['/src/App.tsx']).toContain('router');
    expect(c.getLastCompile()).toBe(result);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe returns an unsubscribe function', () => {
    const c = new PlaygroundSyncController();
    const listener = vi.fn();
    const unsubscribe = c.subscribe(listener);
    unsubscribe();
    c.hydrateFromVFS([], {});
    expect(listener).not.toHaveBeenCalled();
  });
});
