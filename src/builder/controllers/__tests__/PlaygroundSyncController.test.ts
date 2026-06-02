import { describe, expect, it, vi } from 'vitest';
import { PlaygroundSyncController } from '../PlaygroundSyncController';
import type { PlaygroundState } from '@/types/playground';

vi.mock('@/services/playgroundHydrator', () => ({
  hydratePlaygroundFromVFS: vi.fn(() => ({
    pageRegistry: { version: 1, pages: {}, funnels: {}, order: [] },
    creatorData: { products: [], services: [], testimonials: [], faqs: [], components: [] },
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
}));

vi.mock('@/services/playgroundCompiler', () => ({
  compilePlayground: vi.fn(() => ({
    vfsFiles: { '/src/App.tsx': '// compiled' },
    routerCode: '',
    diagnostics: [],
  })),
}));

function makeState(): PlaygroundState {
  return {
    pageRegistry: { version: 1, pages: {}, funnels: {}, order: [] },
    creatorData: { products: [], services: [], testimonials: [], faqs: [], components: [] },
  } as unknown as PlaygroundState;
}

describe('PlaygroundSyncController', () => {
  it('starts with null state and no cached results', () => {
    const c = new PlaygroundSyncController();
    expect(c.getState()).toBeNull();
    expect(c.getLastHydration()).toBeNull();
    expect(c.getLastCompile()).toBeNull();
  });

  it('setState notifies subscribers', () => {
    const c = new PlaygroundSyncController();
    const fn = vi.fn();
    c.subscribe(fn);
    const s = makeState();
    c.setState(s);
    expect(fn).toHaveBeenCalledWith(s);
  });

  it('hydrateFromVFS caches result and commits into existing state', () => {
    const c = new PlaygroundSyncController({ initialState: makeState() });
    const result = c.hydrateFromVFS([], { '/src/App.tsx': '' });
    expect(result.stats.pagesDetected).toBe(0);
    expect(c.getLastHydration()).toBe(result);
    expect(c.getState()?.pageRegistry).toBe(result.pageRegistry);
  });

  it('hydrateFromVFS with commit:false does not touch state', () => {
    const s = makeState();
    const c = new PlaygroundSyncController({ initialState: s });
    c.hydrateFromVFS([], {}, { commit: false });
    expect(c.getState()).toBe(s);
  });

  it('compile throws when no state is set', () => {
    const c = new PlaygroundSyncController();
    expect(() => c.compile({})).toThrow(/without a PlaygroundState/);
  });

  it('compile uses override state and caches result', () => {
    const c = new PlaygroundSyncController();
    const result = c.compile({}, 'Acme', undefined, makeState());
    expect(result.vfsFiles['/src/App.tsx']).toBe('// compiled');
    expect(c.getLastCompile()).toBe(result);
  });
});
