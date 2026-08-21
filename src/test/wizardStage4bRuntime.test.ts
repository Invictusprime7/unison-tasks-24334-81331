import { describe, expect, it, vi } from 'vitest';
import { onPipelineCommit, type CommitResult } from '@/platform/core';
import { runWizardStage4b } from '@/services/wizardStage4bRuntime';
import type { WizardSelections } from '@/types/playground';
import { createWizardMergeContext } from '@/services/wizardMergeContext';

const selections = {
  businessName: 'Northstar Dental',
  businessModel: 'service',
  industryOverlay: 'dental',
  systemType: 'appointment_booking',
  primaryGoal: 'book_appointments',
  secondaryGoals: [],
  needsBooking: true,
  sellsProducts: false,
  wantsLeadCapture: true,
  themePresetId: 'clean-medical',
  themeTokens: {} as WizardSelections['themeTokens'],
  requestedPages: ['home', 'services', 'contact'],
} as unknown as WizardSelections;
const mergeContext = createWizardMergeContext({
  industry: 'dental',
  themePresetId: 'clean-medical',
  themeTokens: selections.themeTokens,
});

function fakeCommitResult(): CommitResult {
  return {
    source: 'wizard-launch',
    committedAt: '2026-08-13T00:00:00.000Z',
  } as CommitResult;
}

describe('Wizard Stage 4b runtime', () => {
  it('runs compilation in a worker and republishes the canonical commit on the main bus', async () => {
    const result = fakeCommitResult();
    const terminate = vi.fn();
    const seen: string[] = [];
    const off = onPipelineCommit((commit) => seen.push(commit.source));
    let clock = 100;

    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage: vi.fn((request: { requestId: string }) => {
        clock = 125;
        queueMicrotask(() => worker.onmessage?.({
          data: { requestId: request.requestId, ok: true, result },
        } as MessageEvent));
      }),
      terminate,
    };

    try {
      const stage4b = await runWizardStage4b({
        selections,
        mergeContext,
        workerFactory: () => worker,
        now: () => clock,
      });

      expect(stage4b).toMatchObject({
        pipelineResult: result,
        execution: 'worker',
        durationMs: 25,
      });
      expect(terminate).toHaveBeenCalledOnce();
      expect(seen).toEqual(['wizard-launch']);
    } finally {
      off();
    }
  });

  it('surfaces compiler contract failures without retrying on the main thread', async () => {
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage: vi.fn((request: { requestId: string }) => {
        queueMicrotask(() => worker.onmessage?.({
          data: {
            requestId: request.requestId,
            ok: false,
            error: { name: 'Error', message: 'Stage 4b theme contract failed' },
          },
        } as MessageEvent));
      }),
      terminate: vi.fn(),
    };

    await expect(runWizardStage4b({
      selections,
      mergeContext,
      workerFactory: () => worker,
    })).rejects.toThrow('Stage 4b theme contract failed');
  });

  it('preserves first-attempt launch when the browser blocks worker startup', async () => {
    const result = fakeCommitResult();
    const fallbackCommit = vi.fn(() => result);
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage: vi.fn(() => {
        queueMicrotask(() => worker.onerror?.({
          message: 'worker-src blocked by policy',
          preventDefault: vi.fn(),
        } as unknown as ErrorEvent));
      }),
      terminate: vi.fn(),
    };

    const stage4b = await runWizardStage4b({
      selections,
      mergeContext,
      workerFactory: () => worker,
      fallbackCommit,
    });

    expect(stage4b.execution).toBe('main-thread-fallback');
    expect(stage4b.pipelineResult).toBe(result);
    expect(fallbackCommit).toHaveBeenCalledOnce();
  });

  it('terminates pending compilation when the shared launch deadline aborts', async () => {
    const controller = new AbortController();
    const terminate = vi.fn();
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage: vi.fn(),
      terminate,
    };

    const pending = runWizardStage4b({
      selections,
      mergeContext,
      signal: controller.signal,
      workerFactory: () => worker,
    });
    await Promise.resolve();
    controller.abort(new Error('launch deadline reached'));

    await expect(pending).rejects.toThrow('launch deadline reached');
    expect(terminate).toHaveBeenCalledOnce();
  });
});
