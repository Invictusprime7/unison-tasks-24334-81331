/**
 * The launcher's strict pre-persist JSX-import-contract check and the Web
 * Builder's Preview-mount compile both ultimately call
 * prepareSandpackFiles(), which has no internal yield points. For
 * pathological/AI-drifted or simply large multi-page sites this can run
 * long enough to hard-freeze the tab — a stage timeout can't preempt a
 * single unbroken synchronous call, and the browser can't repaint or
 * process input until it returns. Running it in a Worker keeps the same
 * coverage/output without risking the main thread, mirroring
 * wizardStage4bRuntime's worker-with-fallback pattern. A small main-thread
 * cache (keyed like prepareSandpackFiles' own internal one) lets the second
 * caller in the same launch — Preview mounting moments after the launcher's
 * own check — reuse the first caller's result instead of recomputing.
 */
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';

export interface StrictImportContractWorkerRequest {
  requestId: string;
  files: Record<string, string>;
  entryPoint?: string;
  themePresetId?: string | null;
  aesthetic?: string | null;
}

export type StrictImportContractWorkerResponse =
  | { requestId: string; ok: true; files: Record<string, string> }
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

export interface RunPrepareSandpackFilesOffThreadOptions {
  files: Record<string, string>;
  entryPoint?: string;
  themePresetId?: string | null;
  aesthetic?: string | null;
  signal?: AbortSignal;
  workerFactory?: () => StrictImportContractWorkerLike;
  fallbackCompute?: (
    files: Record<string, string>,
    entryPoint?: string,
    themePresetId?: string | null,
  ) => Record<string, string>;
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

// ─────────────────────────────────────────────────── cross-call result cache
//
// prepareSandpackFiles() has its own content-hash cache, but that only helps
// callers on the SAME thread — offloading one caller to a Worker (a separate
// JS realm) means the launcher's check and the Web Builder's Preview-mount
// compile can no longer warm each other's cache. Re-implement the same
// hashing scheme here, at the call boundary shared by every caller of this
// module, so that benefit survives regardless of which side (worker or
// main-thread fallback) actually computed a given result.
const PREPARED_FILES_CACHE_LIMIT = 20;
const STRICT_IMPORT_WORKER_MIN_TIMEOUT_MS = 60_000;
const STRICT_IMPORT_WORKER_MAX_TIMEOUT_MS = 180_000;
const preparedFilesCache = new Map<string, Record<string, string>>();
const preparedFilesInFlight = new Map<string, Promise<Record<string, string>>>();

/**
 * The import-contract pass scales with both module count and source size.
 * A fixed 30s watchdog killed healthy generated projects (the current
 * 126-file Wizard artifact takes about 62s on a cold worker), then cached the
 * rejection for every Preview caller sharing that job. Give larger artifacts
 * a proportional budget while retaining a bounded watchdog for dead workers.
 */
function workerTimeoutFor(files: Record<string, string>): number {
  const paths = Object.keys(files);
  const sourceCharacters = paths.reduce((total, path) => total + (files[path]?.length ?? 0), 0);
  const estimatedMs = 45_000 + paths.length * 500 + sourceCharacters * 0.05;
  return Math.min(
    STRICT_IMPORT_WORKER_MAX_TIMEOUT_MS,
    Math.max(STRICT_IMPORT_WORKER_MIN_TIMEOUT_MS, Math.ceil(estimatedMs)),
  );
}

function hashFilesRecord(files: Record<string, string>): string {
  let h = 0x811c9dc5;
  for (const path of Object.keys(files).sort()) {
    const entry = `${path}\u0000${files[path]}\u0000`;
    for (let i = 0; i < entry.length; i++) {
      h ^= entry.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return (h >>> 0).toString(36);
}

function cacheKeyFor(
  files: Record<string, string>,
  entryPoint: string | undefined,
  themePresetId: string | null | undefined,
  aesthetic: string | null | undefined,
): string {
  return `${hashFilesRecord(files)}::${entryPoint || ''}::${themePresetId || ''}::${aesthetic || ''}`;
}

function storeInCache(key: string, files: Record<string, string>): void {
  if (preparedFilesCache.size >= PREPARED_FILES_CACHE_LIMIT) preparedFilesCache.clear();
  preparedFilesCache.set(key, files);
}

function awaitWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(toAbortError(signal));
  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => reject(toAbortError(signal));
    signal.addEventListener('abort', handleAbort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      },
    );
  });
}

function runInWorker(
  worker: StrictImportContractWorkerLike,
  request: StrictImportContractWorkerRequest,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const responseTimeoutMs = workerTimeoutFor(request.files);
    const responseTimeout = setTimeout(() => {
      settle(() => reject(new Error(
        `Strict import-contract worker did not respond within ${Math.round(responseTimeoutMs / 1000)} seconds.`,
      )));
    }, responseTimeoutMs);
    const cleanup = () => {
      clearTimeout(responseTimeout);
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
    const handleAbort = () => {
      if (!signal) return;
      settle(() => reject(toAbortError(signal)));
    };

    worker.onmessage = (event) => {
      const response = event.data;
      if (!response || response.requestId !== request.requestId) return;
      if (response.ok) {
        settle(() => resolve(response.files));
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
 * Runs prepareSandpackFiles(strict:true) off the main thread purely for its
 * throw-on-violation side effect, discarding the computed files. Falls back
 * to running on the main thread only if the worker itself fails to
 * bootstrap (e.g. a restrictive CSP) — never silently skips the check.
 */
export async function runStrictImportContractCheck({
  files,
  entryPoint,
  themePresetId,
  signal,
  workerFactory,
  fallbackCheck,
}: RunStrictImportContractCheckOptions): Promise<void> {
  await runPrepareSandpackFilesOffThread({
    files,
    entryPoint,
    themePresetId,
    signal,
    workerFactory,
    fallbackCompute: (fallbackFiles, fallbackEntryPoint, fallbackThemePresetId) => {
      fallbackCheck?.(fallbackFiles, fallbackEntryPoint, fallbackThemePresetId);
      // The result is shared with the Builder's immediately-following preview
      // compile. Cache the actual Sandpack overlay, never the raw /src VFS.
      // Returning fallbackFiles here poisoned the shared cache whenever module
      // workers were blocked, so Preview received unresolved /src modules and
      // rendered nothing after an otherwise successful Wizard finalization.
      return prepareSandpackFiles(fallbackFiles, {
        entryPoint: fallbackEntryPoint,
        themePresetId: fallbackThemePresetId,
        strict: true,
      });
    },
  });
}

/**
 * Runs the full prepareSandpackFiles() compile off the main thread and
 * returns the resulting Sandpack-ready files — for callers (Preview mount)
 * that need the actual output, not just the validation side effect. Shares
 * a cache with runStrictImportContractCheck so a Preview compile moments
 * after the launcher's own check is typically instant.
 */
export async function runPrepareSandpackFilesOffThread({
  files,
  entryPoint,
  themePresetId,
  aesthetic,
  signal,
  workerFactory = defaultWorkerFactory,
  fallbackCompute = (fallbackFiles, fallbackEntryPoint, fallbackThemePresetId) => prepareSandpackFiles(fallbackFiles, {
    entryPoint: fallbackEntryPoint,
    themePresetId: fallbackThemePresetId,
    aesthetic: aesthetic || undefined,
  }),
}: RunPrepareSandpackFilesOffThreadOptions): Promise<Record<string, string>> {
  const cacheKey = cacheKeyFor(files, entryPoint, themePresetId, aesthetic);
  const cached = preparedFilesCache.get(cacheKey);
  if (cached) return { ...cached };
  let computation = preparedFilesInFlight.get(cacheKey);
  if (!computation) {
    computation = (async () => {
      try {
        const worker = workerFactory();
        // The computation is shared by cache key, so it must not be owned by
        // the first caller's AbortSignal. Each caller independently races the
        // shared promise through awaitWithSignal below; a launcher unmount can
        // no longer cancel the Builder preview that is reusing the same job.
        const result = await runInWorker(worker, {
          requestId: createRequestId(),
          files,
          entryPoint,
          themePresetId,
          aesthetic,
        });
        storeInCache(cacheKey, result);
        return result;
      } catch (error) {
        if (!(error instanceof StrictImportContractWorkerBootstrapError)) throw error;
        console.warn('[strictImportContractRuntime] worker unavailable; using compatibility fallback', {
          error: error.message,
        });
      }

      const result = fallbackCompute(files, entryPoint, themePresetId);
      storeInCache(cacheKey, result);
      return result;
    })().finally(() => {
      preparedFilesInFlight.delete(cacheKey);
    });
    preparedFilesInFlight.set(cacheKey, computation);
  }
  const result = await awaitWithSignal(computation, signal);
  return { ...result };
}

