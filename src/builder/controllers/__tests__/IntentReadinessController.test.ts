import { describe, expect, it, vi } from 'vitest';
import { IntentReadinessController } from '../IntentReadinessController';
import type { PlaygroundIntentReadinessReport } from '@/types/playground';

vi.mock('@/services/intentReadinessService', () => ({
  buildIntentReadinessReport: vi.fn(() => makeReport()),
}));

function makeReport(): PlaygroundIntentReadinessReport {
  return {
    readiness: {
      a: {
        bindingId: 'a',
        previewStatus: 'ready',
        publishStatus: 'ready',
        requiredCapabilities: [],
        missingDependencies: [],
        fixHints: [],
        dependencies: [],
        targetSummary: 'A',
      },
      b: {
        bindingId: 'b',
        previewStatus: 'partial',
        publishStatus: 'blocked',
        requiredCapabilities: [],
        missingDependencies: ['payments'],
        fixHints: ['Connect Stripe'],
        dependencies: [],
        targetSummary: 'B',
      },
    },
  } as unknown as PlaygroundIntentReadinessReport;
}

describe('IntentReadinessController', () => {
  it('returns empty summary when no report is set', () => {
    const c = new IntentReadinessController();
    const s = c.summarize();
    expect(s.total).toBe(0);
    expect(s.isPreviewReady).toBe(true);
    expect(s.isPublishReady).toBe(true);
  });

  it('recompute caches the report and notifies subscribers', () => {
    const c = new IntentReadinessController();
    const fn = vi.fn();
    c.subscribe(fn);
    const report = c.recompute({} as any);
    expect(fn).toHaveBeenCalledWith(report);
    expect(c.getReport()).toBe(report);
  });

  it('summarize folds preview/publish status correctly', () => {
    const c = new IntentReadinessController();
    c.setReport(makeReport());
    const s = c.summarize();
    expect(s.total).toBe(2);
    expect(s.previewReady).toBe(1);
    expect(s.publishReady).toBe(1);
    expect(s.worstPreview).toBe('partial');
    expect(s.worstPublish).toBe('blocked');
    expect(s.isPreviewReady).toBe(true);   // partial still allows preview
    expect(s.isPublishReady).toBe(false);  // blocked blocks publish
  });
});
