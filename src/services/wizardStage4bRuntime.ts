import {
  commitToPipeline,
  publishPipelineCommit,
  type CommitResult,
} from '@/platform/core';
import type { WizardSelections } from '@/types/playground';
import type { WizardMergeContext } from '@/services/wizardMergeContext';

export interface WizardLaneAWorkerRequest {
  requestId: string;
  selections: WizardSelections;
  existingVfsFiles: Record<string, string>;
  mergeContext: WizardMergeContext;
}

export type WizardLaneAWorkerResponse =
  | {
      requestId: string;
      ok: true;
      result: CommitResult;
    }
  | {
      requestId: string;
      ok: false;
      error: {
        name: string;
        message: string;
        stack?: string;
      };
    };

interface WizardLaneAWorkerLike {
  onmessage: ((event: MessageEvent<WizardLaneAWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WizardLaneAWorkerRequest): void;
  terminate(): void;
}

export interface RunWizardLaneAOptions {
  selections: WizardSelections;
  mergeContext: WizardMergeContext;
  existingVfsFiles?: Record<string, string>;
  signal?: AbortSignal;
  yieldToHost?: () => Promise<void>;
  workerFactory?: () => WizardLaneAWorkerLike;
  fallbackCommit?: (
    selections: WizardSelections,
    existingVfsFiles: Record<string, string>,
    mergeContext: WizardMergeContext,
  ) => CommitResult;
  now?: () => number;
}

export interface WizardLaneAResult {
  pipelineResult: CommitResult;
  execution: 'worker' | 'main-thread-fallback';
  durationMs: number;
}

class WizardLaneAWorkerBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WizardLaneAWorkerBootstrapError';
  }
}

function defaultWorkerFactory(): WizardLaneAWorkerLike {
  if (typeof Worker === 'undefined') {
    throw new WizardLaneAWorkerBootstrapError('Module workers are unavailable in this runtime.');
  }
  try {
    return new Worker(new URL('../workers/wizardStage4b.worker.ts', import.meta.url), {
      type: 'module',
      name: 'unison-wizard-lane-a',
    });
  } catch (error) {
    throw new WizardLaneAWorkerBootstrapError(
      error instanceof Error ? error.message : 'The Wizard Lane A worker could not start.',
    );
  }
}

function toAbortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new Error('Wizard Stage 4b was cancelled.');
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lane_a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function runLaneAWorker(
  worker: WizardLaneAWorkerLike,
  request: WizardLaneAWorkerRequest,
  signal?: AbortSignal,
): Promise<CommitResult> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      signal?.removeEventListener('abort', handleAbort);
      worker.terminate();
    };
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleAbort = () => settle(() => reject(toAbortError(signal!)));

    worker.onmessage = (event) => {
      const response = event.data;
      if (!response || response.requestId !== request.requestId) return;
      if (response.ok) {
        settle(() => resolve(response.result));
        return;
      }
      if (!('error' in response)) {
        settle(() => reject(new Error('Wizard Lane A returned an invalid worker response.')));
        return;
      }
      const error = new Error(response.error.message);
      error.name = response.error.name;
      if (response.error.stack) error.stack = response.error.stack;
      settle(() => reject(error));
    };
    worker.onerror = (event) => {
      event.preventDefault?.();
      settle(() => reject(new WizardLaneAWorkerBootstrapError(
        event.message || 'The Wizard Lane A worker could not start.',
      )));
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }
    signal?.addEventListener('abort', handleAbort, { once: true });

    try {
      worker.postMessage(request);
    } catch (error) {
      settle(() => reject(new WizardLaneAWorkerBootstrapError(
        error instanceof Error ? error.message : 'The Wizard Lane A request could not be sent.',
      )));
    }
  });
}

/**
 * Execute deterministic Wizard Lane A without blocking the launcher UI.
 * Pipeline/contract errors are returned directly; only worker bootstrap
 * failures use the compatibility fallback so a restrictive browser or CSP
 * cannot prevent a first-attempt launch.
 */
export async function runWizardLaneA({
  selections,
  mergeContext,
  existingVfsFiles = {},
  signal,
  yieldToHost = () => Promise.resolve(),
  workerFactory = defaultWorkerFactory,
  fallbackCommit = (fallbackSelections, fallbackFiles, fallbackMergeContext) => commitToPipeline(
    { selections: fallbackSelections, existingVfsFiles: fallbackFiles, mergeContext: fallbackMergeContext },
    'wizard-launch',
  ),
  now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
}: RunWizardLaneAOptions): Promise<WizardLaneAResult> {
  const startedAt = now();
  await yieldToHost();
  if (signal?.aborted) throw toAbortError(signal);

  console.info('[WizardLaneA] compile started', {
    pageCount: selections.requestedPages?.length ?? 0,
    templateId: selections.templateId ?? null,
    themePresetId: selections.themePresetId ?? null,
  });

  try {
    const worker = workerFactory();
    const pipelineResult = await runLaneAWorker(worker, {
      requestId: createRequestId(),
      selections,
      existingVfsFiles,
      mergeContext,
    }, signal);
    publishPipelineCommit(pipelineResult);
    const durationMs = Math.max(0, now() - startedAt);
    console.info('[WizardLaneA] compile completed', { execution: 'worker', durationMs });
    return { pipelineResult, execution: 'worker', durationMs };
  } catch (error) {
    if (!(error instanceof WizardLaneAWorkerBootstrapError)) throw error;
    console.warn('[WizardLaneA] worker unavailable; using compatibility fallback', {
      error: error.message,
    });
  }

  await yieldToHost();
  if (signal?.aborted) throw toAbortError(signal);
  const pipelineResult = fallbackCommit(selections, existingVfsFiles, mergeContext);
  const durationMs = Math.max(0, now() - startedAt);
  console.info('[WizardLaneA] compile completed', {
    execution: 'main-thread-fallback',
    durationMs,
  });
  return { pipelineResult, execution: 'main-thread-fallback', durationMs };
}
