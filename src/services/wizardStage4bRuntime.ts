import {
  commitToPipeline,
  publishPipelineCommit,
  type CommitResult,
} from '@/platform/core';
import type { WizardSelections } from '@/types/playground';
import type { WizardMergeContext } from '@/services/wizardMergeContext';

export interface WizardStage4bWorkerRequest {
  requestId: string;
  selections: WizardSelections;
  existingVfsFiles: Record<string, string>;
  mergeContext: WizardMergeContext;
}

export type WizardStage4bWorkerResponse =
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

interface WizardStage4bWorkerLike {
  onmessage: ((event: MessageEvent<WizardStage4bWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WizardStage4bWorkerRequest): void;
  terminate(): void;
}

export interface RunWizardStage4bOptions {
  selections: WizardSelections;
  mergeContext: WizardMergeContext;
  existingVfsFiles?: Record<string, string>;
  signal?: AbortSignal;
  yieldToHost?: () => Promise<void>;
  workerFactory?: () => WizardStage4bWorkerLike;
  fallbackCommit?: (
    selections: WizardSelections,
    existingVfsFiles: Record<string, string>,
    mergeContext: WizardMergeContext,
  ) => CommitResult;
  now?: () => number;
}

export interface WizardStage4bResult {
  pipelineResult: CommitResult;
  execution: 'worker' | 'main-thread-fallback';
  durationMs: number;
}

class WizardStage4bWorkerBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WizardStage4bWorkerBootstrapError';
  }
}

function defaultWorkerFactory(): WizardStage4bWorkerLike {
  if (typeof Worker === 'undefined') {
    throw new WizardStage4bWorkerBootstrapError('Module workers are unavailable in this runtime.');
  }
  try {
    return new Worker(new URL('../workers/wizardStage4b.worker.ts', import.meta.url), {
      type: 'module',
      name: 'unison-wizard-stage-4b',
    });
  } catch (error) {
    throw new WizardStage4bWorkerBootstrapError(
      error instanceof Error ? error.message : 'The Wizard Stage 4b worker could not start.',
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
  return `stage4b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function runStage4bWorker(
  worker: WizardStage4bWorkerLike,
  request: WizardStage4bWorkerRequest,
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
        settle(() => reject(new Error('Wizard Stage 4b returned an invalid worker response.')));
        return;
      }
      const error = new Error(response.error.message);
      error.name = response.error.name;
      if (response.error.stack) error.stack = response.error.stack;
      settle(() => reject(error));
    };
    worker.onerror = (event) => {
      event.preventDefault?.();
      settle(() => reject(new WizardStage4bWorkerBootstrapError(
        event.message || 'The Wizard Stage 4b worker could not start.',
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
      settle(() => reject(new WizardStage4bWorkerBootstrapError(
        error instanceof Error ? error.message : 'The Wizard Stage 4b request could not be sent.',
      )));
    }
  });
}

/**
 * Execute deterministic Wizard Stage 4b without blocking the launcher UI.
 * Pipeline/contract errors are returned directly; only worker bootstrap
 * failures use the compatibility fallback so a restrictive browser or CSP
 * cannot prevent a first-attempt launch.
 */
export async function runWizardStage4b({
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
}: RunWizardStage4bOptions): Promise<WizardStage4bResult> {
  const startedAt = now();
  await yieldToHost();
  if (signal?.aborted) throw toAbortError(signal);

  console.info('[WizardStage4b] compile started', {
    pageCount: selections.requestedPages?.length ?? 0,
    templateId: selections.templateId ?? null,
    themePresetId: selections.themePresetId ?? null,
  });

  try {
    const worker = workerFactory();
    const pipelineResult = await runStage4bWorker(worker, {
      requestId: createRequestId(),
      selections,
      existingVfsFiles,
      mergeContext,
    }, signal);
    publishPipelineCommit(pipelineResult);
    const durationMs = Math.max(0, now() - startedAt);
    console.info('[WizardStage4b] compile completed', { execution: 'worker', durationMs });
    return { pipelineResult, execution: 'worker', durationMs };
  } catch (error) {
    if (!(error instanceof WizardStage4bWorkerBootstrapError)) throw error;
    console.warn('[WizardStage4b] worker unavailable; using compatibility fallback', {
      error: error.message,
    });
  }

  await yieldToHost();
  if (signal?.aborted) throw toAbortError(signal);
  const pipelineResult = fallbackCommit(selections, existingVfsFiles, mergeContext);
  const durationMs = Math.max(0, now() - startedAt);
  console.info('[WizardStage4b] compile completed', {
    execution: 'main-thread-fallback',
    durationMs,
  });
  return { pipelineResult, execution: 'main-thread-fallback', durationMs };
}
