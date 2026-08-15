/**
 * The launcher's strict pre-persist JSX-import-contract check
 * (prepareSandpackFiles(strict:true)) has no internal yield points. For
 * pathological/AI-drifted content this can run long enough to hard-freeze
 * the tab — a 90s stage timeout can't preempt a single unbroken synchronous
 * call. Running it in a Worker keeps the coverage without risking the main
 * thread, mirroring wizardStage4bRuntime's worker-with-fallback pattern.
 */
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';

export interface StrictImportContractWorkerRequest {
  requestId: string;
  files: Record<string, string>;
  entryPoint?: string;
  themePresetId?: string | null;
}

export type StrictImportContractWorkerResponse =
  | { requestId: string; ok: true }
  | {
      requestId: string;
      ok: false;
      error: { name: string; message: string; stack?: string };
    };

interface StrictImportContractWorkerLike {
  onmessage: ((event: MessageEvent<StrictImportContractWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: StrictImportContractWorkerRequest): void;
  terminate(): void;
}

export interface RunStrictImportContractCheckOptions {
  files: Record<string, string>;
  entryPoint?: string;
  themePresetId?: string | null;
  signal?: AbortSignal;
  workerFactory?: () => StrictImportContractWorkerLike;
  fallbackCheck?: (
    files: Record<string, string>,
    entryPoint?: string,
    themePresetId?: string | null,
  ) => void;
}

class StrictImportContractWorkerBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StrictImportContractWorkerBootstrapError';
  }
}

function defaultWorkerFactory(): StrictImportContractWorkerLike {
  if (typeof Worker === 'undefined') {
    throw new StrictImportContractWorkerBootstrapError('Module workers are unavailable in this runtime.');
  }
  try {
    return new Worker(new URL('../workers/strictImportContract.worker.ts', import.meta.url), {
      type: 'module',
      name: 'unison-strict-import-contract',
    });
  } catch (error) {
    throw new StrictImportContractWorkerBootstrapError(
      error instanceof Error ? error.message : 'The strict import-contract worker could not start.',
    );
  }
}

function toAbortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new Error('Strict import-contract check was cancelled.');
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `strict_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function runInWorker(
  worker: StrictImportContractWorkerLike,
  request: StrictImportContractWorkerRequest,
  signal?: AbortSignal,
): Promise<void> {
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
        settle(resolve);
        return;
      }
      if (!('error' in response)) {
        settle(() => reject(new Error('Strict import-contract worker returned an invalid response.')));
        return;
      }
      const error = new Error(response.error.message);
      error.name = response.error.name;
      if (response.error.stack) error.stack = response.error.stack;
      settle(() => reject(error));
    };
    worker.onerror = (event) => {
      event.preventDefault?.();
      settle(() => reject(new StrictImportContractWorkerBootstrapError(
        event.message || 'The strict import-contract worker could not start.',
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
      settle(() => reject(new StrictImportContractWorkerBootstrapError(
        error instanceof Error ? error.message : 'The strict import-contract request could not be sent.',
      )));
    }
  });
}

/**
 * Runs the same strict prepareSandpackFiles(strict:true) validation off the
 * main thread. Throws (does not resolve) on a contract violation, matching
 * the synchronous check's throw-based contract. Falls back to running on the
 * main thread only if the worker itself fails to bootstrap (e.g. a
 * restrictive CSP) — never silently skips the check.
 */
export async function runStrictImportContractCheck({
  files,
  entryPoint,
  themePresetId,
  signal,
  workerFactory = defaultWorkerFactory,
  fallbackCheck = (fallbackFiles, fallbackEntryPoint, fallbackThemePresetId) => {
    prepareSandpackFiles(fallbackFiles, {
      entryPoint: fallbackEntryPoint,
      themePresetId: fallbackThemePresetId,
      strict: true,
    });
  },
}: RunStrictImportContractCheckOptions): Promise<void> {
  try {
    const worker = workerFactory();
    await runInWorker(worker, {
      requestId: createRequestId(),
      files,
      entryPoint,
      themePresetId,
    }, signal);
    return;
  } catch (error) {
    if (!(error instanceof StrictImportContractWorkerBootstrapError)) throw error;
    console.warn('[strictImportContractRuntime] worker unavailable; using compatibility fallback', {
      error: error.message,
    });
  }

  if (signal?.aborted) throw toAbortError(signal);
  fallbackCheck(files, entryPoint, themePresetId);
}
