import { describe, expect, it } from 'vitest';
import {
  buildLaneBVfsContext,
  planLaneBBatches,
  LANE_B_MAX_PAGES_PER_BATCH,
} from '@/services/laneBBatchPlanner';

const pages = (n: number) => Array.from({ length: n }, (_, i) => `/src/pages/Page${i}.tsx`);

describe('laneBBatchPlanner', () => {
  it('keeps a small site in a single turn', () => {
    const plan = planLaneBBatches({ pages: pages(2), basePayloadBytes: 20_000 });
    expect(plan.batches).toHaveLength(1);
    expect(plan.limitedBy).toBe('none');
  });

  it('splits a large site without hard-coding a batch size', () => {
    const plan = planLaneBBatches({ pages: pages(12), basePayloadBytes: 20_000 });
    expect(plan.pagesPerBatch).toBeGreaterThan(0);
    expect(plan.pagesPerBatch).toBeLessThanOrEqual(LANE_B_MAX_PAGES_PER_BATCH);
    expect(plan.batches.flat()).toHaveLength(12);
  });

  it('tightens batches when the shared context nearly fills the body budget', () => {
    const roomy = planLaneBBatches({ pages: pages(9), basePayloadBytes: 10_000 });
    const cramped = planLaneBBatches({ pages: pages(9), basePayloadBytes: 180_000 });
    expect(cramped.pagesPerBatch).toBeLessThanOrEqual(roomy.pagesPerBatch);
    expect(cramped.limitedBy).toBe('payload');
    expect(cramped.pagesPerBatch).toBe(1);
  });

  it('tightens batches when the wall-clock budget shrinks', () => {
    const plan = planLaneBBatches({
      pages: pages(9),
      basePayloadBytes: 10_000,
      wallClockBudgetMs: 50_000,
    });
    expect(plan.pagesPerBatch).toBe(1);
    expect(plan.limitedBy).toBe('wall-clock');
    expect(plan.batches).toHaveLength(9);
  });

  it('never drops or duplicates a page', () => {
    const input = pages(7);
    const plan = planLaneBBatches({ pages: input, basePayloadBytes: 30_000 });
    expect(plan.batches.flat().sort()).toEqual([...input].sort());
  });

  it('handles an empty page list', () => {
    expect(planLaneBBatches({ pages: [], basePayloadBytes: 0 }).batches).toEqual([]);
  });

  it('keeps the snapshot-owned UI contract in bounded Lane B context', () => {
    const files = {
      '/.unison/ui-manifest.json': '{"importRoot":"@/unison/ui"}',
      '/src/unison/ui/index.ts': "export * from './button';",
      '/src/pages/Home.tsx': 'x'.repeat(24_000),
    };

    const context = buildLaneBVfsContext(files);

    expect(context['/.unison/ui-manifest.json']).toBe(files['/.unison/ui-manifest.json']);
    expect(context['/src/unison/ui/index.ts']).toBe(files['/src/unison/ui/index.ts']);
  });
});
