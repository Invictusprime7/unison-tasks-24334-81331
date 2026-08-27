import {
  runFullPreflight,
  type RunFullPreflightOptions,
  type RunFullPreflightResult,
} from '@/services/runFullPreflight';

export interface FullPreflightWorkerRequest {
  requestId: string;
  files: Record<string, string>;
  options: RunFullPreflightOptions;
}

export type FullPreflightWorkerResponse =
  | { requestId: string; ok: true; result: RunFullPreflightResult }
  | {
      requestId: string;
      ok: false;
      error: { name: string; message: string; stack?: string };
    };

export interface FullPreflightWorkerLike {
  onmessage: ((event: MessageEvent<FullPreflightWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: FullPreflightWorkerRequest): void;
  terminate(): void;
}

export interface RunFullPreflightRuntimeOptions {
  signal?: AbortSignal;
  workerFactory?: () => FullPreflightWorkerLike;
  /** Test/SSR compatibility only. Browser launch code must use the worker. */
  fallbackPreflight?: typeof runFullPreflight;
}

export class FullPreflightWorkerBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FullPreflightWorkerBootstrapError';
  }
}

function defaultWorkerFactory(): FullPreflightWorkerLike {
  if (typeof Worker === 'undefined') {
    throw new FullPreflightWorkerBootstrapError('Module workers are unavailable in this runtime.');
  }
  try {
    return new Worker(new URL('../workers/fullPreflight.worker.ts', import.meta.url), {
      type: 'module',
      name: 'unison-wizard-full-preflight',
    });
  } catch (error) {
    throw new FullPreflightWorkerBootstrapError(
      error instanceof Error ? error.message : 'The Wizard preflight worker could not start.',
    );
  }
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `preflight_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('Wizard final preflight was cancelled.');
}

function runWorker(
  worker: FullPreflightWorkerLike,
  request: FullPreflightWorkerRequest,
  signal?: AbortSignal,
): Promise<RunFullPreflightResult> {
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
    const handleAbort = () => settle(() => reject(abortError(signal!)));

    worker.onmessage = (event) => {
      const response = event.data;
      if (!response || response.requestId !== request.requestId) return;
      if (response.ok) {
        settle(() => resolve(response.result));
        return;
      }
      if (!('error' in response)) {
        settle(() => reject(new Error('Wizard preflight returned an invalid worker response.')));
        return;
      }
      const error = new Error(response.error.message);
      error.name = response.error.name;
      if (response.error.stack) error.stack = response.error.stack;
      settle(() => reject(error));
    };
    worker.onerror = (event) => {
      event.preventDefault?.();
      settle(() => reject(new FullPreflightWorkerBootstrapError(
        event.message || 'The Wizard preflight worker could not start.',
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
      settle(() => reject(new FullPreflightWorkerBootstrapError(
        error instanceof Error ? error.message : 'The Wizard preflight request could not be sent.',
      )));
    }
  });
}

export async function runFullPreflightRuntime(
  files: Record<string, string>,
  options: RunFullPreflightOptions,
  runtime: RunFullPreflightRuntimeOptions = {},
): Promise<RunFullPreflightResult> {
  try {
    return await runWorker((runtime.workerFactory ?? defaultWorkerFactory)(), {
      requestId: createRequestId(),
      files,
      options,
    }, runtime.signal);
  } catch (error) {
    if (!(error instanceof FullPreflightWorkerBootstrapError) || !runtime.fallbackPreflight) {
      throw error;
    }
    if (runtime.signal?.aborted) throw abortError(runtime.signal);
    return runtime.fallbackPreflight(files, options);
  }
}
