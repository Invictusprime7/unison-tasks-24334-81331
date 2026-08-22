import { describe, expect, it, vi } from 'vitest';
import { runStrictImportContractCheck, runPrepareSandpackFilesOffThread } from '@/services/strictImportContractRuntime';

describe('strict import-contract runtime', () => {
  it('reuses a prior call\'s result for a matching (files, entryPoint, themePresetId) key without touching the worker again', async () => {
    const files = { '/App.tsx': 'export default function App(){ return null; }' };
    const preparedFiles = { '/App.tsx': 'export default function App(){ return null; }', '/index.tsx': 'shim' };
    const postMessage = vi.fn((request: { requestId: string }) => {
      queueMicrotask(() => worker.onmessage?.({
        data: { requestId: request.requestId, ok: true, files: preparedFiles },
      } as MessageEvent));
    });
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage,
      terminate: vi.fn(),
    };

    // First call: the launcher's strict check (worker computes and the
    // result gets cached even though this wrapper discards its own copy).
    await runStrictImportContractCheck({
      files,
      entryPoint: '/App.tsx',
      themePresetId: 'modern-cache-test',
      workerFactory: () => worker,
    });
    expect(postMessage).toHaveBeenCalledOnce();

    // Second call: Preview's compile, same content/entryPoint/themePresetId.
    // Must hit the cache — no second worker created/used.
    const secondWorkerFactory = vi.fn(() => worker);
    const result = await runPrepareSandpackFilesOffThread({
      files,
      entryPoint: '/App.tsx',
      themePresetId: 'modern-cache-test',
      workerFactory: secondWorkerFactory,
    });

    expect(secondWorkerFactory).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledOnce();
    expect(result).toEqual(preparedFiles);
  });

  it('threads aesthetic through the worker and isolates differently styled cache entries', async () => {
    const files = { '/App.tsx': 'export default function App(){ return null; }' };
    const requests: Array<{ requestId: string; aesthetic?: string | null }> = [];
    const workerFactory = vi.fn(() => {
      const worker = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: ErrorEvent) => void) | null,
        postMessage: vi.fn((request: { requestId: string; aesthetic?: string | null }) => {
          requests.push(request);
          queueMicrotask(() => worker.onmessage?.({
            data: { requestId: request.requestId, ok: true, files: { '/App.tsx': request.aesthetic || 'none' } },
          } as MessageEvent));
        }),
        terminate: vi.fn(),
      };
      return worker;
    });

    const editorial = await runPrepareSandpackFilesOffThread({ files, aesthetic: 'editorial', workerFactory });
    const organic = await runPrepareSandpackFilesOffThread({ files, aesthetic: 'organic', workerFactory });

    expect(requests.map((request) => request.aesthetic)).toEqual(['editorial', 'organic']);
    expect(editorial['/App.tsx']).toBe('editorial');
    expect(organic['/App.tsx']).toBe('organic');
  });

  it('resolves when the worker reports no violations', async () => {
    const terminate = vi.fn();
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage: vi.fn((request: { requestId: string }) => {
        queueMicrotask(() => worker.onmessage?.({
          data: { requestId: request.requestId, ok: true },
        } as MessageEvent));
      }),
      terminate,
    };

    await expect(runStrictImportContractCheck({
      files: { '/App.tsx': 'export default function App(){ return null; }' },
      entryPoint: '/App.tsx',
      workerFactory: () => worker,
    })).resolves.toBeUndefined();
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('throws the worker-reported violation instead of silently continuing', async () => {
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage: vi.fn((request: { requestId: string }) => {
        queueMicrotask(() => worker.onmessage?.({
          data: {
            requestId: request.requestId,
            ok: false,
            error: { name: 'Error', message: 'Home.tsx imports JSX component "MissingHero"' },
          },
        } as MessageEvent));
      }),
      terminate: vi.fn(),
    };

    await expect(runStrictImportContractCheck({
      files: { '/App.tsx': 'x' },
      workerFactory: () => worker,
    })).rejects.toThrow('MissingHero');
  });

  it('falls back to the main thread (and still enforces the check) when the worker cannot start', async () => {
    const fallbackCheck = vi.fn();
    const files = {
      '/src/App.tsx': 'export default function App(){ return <main>Fallback compile</main>; }',
      '/src/index.css': '@tailwind base; @tailwind components; @tailwind utilities;',
    };
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

    await runStrictImportContractCheck({
      files,
      entryPoint: '/src/App.tsx',
      themePresetId: 'modern',
      workerFactory: () => worker,
      fallbackCheck,
    });

    expect(fallbackCheck).toHaveBeenCalledWith(files, '/src/App.tsx', 'modern');

    const previewWorkerFactory = vi.fn(() => worker);
    const cachedPreview = await runPrepareSandpackFilesOffThread({
      files,
      entryPoint: '/src/App.tsx',
      themePresetId: 'modern',
      workerFactory: previewWorkerFactory,
    });

    expect(previewWorkerFactory).not.toHaveBeenCalled();
    expect(cachedPreview['/App.tsx']).toContain('Fallback compile');
    expect(cachedPreview['/index.tsx']).toBeDefined();
    expect(cachedPreview['/src/App.tsx']).toBeUndefined();
  });

  it('terminates the worker and rejects when the caller aborts before it responds', async () => {
    const controller = new AbortController();
    const terminate = vi.fn();
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage: vi.fn(),
      terminate,
    };

    const pending = runStrictImportContractCheck({
      files: { '/App.tsx': 'x' },
      signal: controller.signal,
      workerFactory: () => worker,
    });
    await Promise.resolve();
    controller.abort(new Error('stage timed out'));

    await expect(pending).rejects.toThrow('stage timed out');
    // Caller cancellation no longer owns/terminates the shared keyed worker;
    // another preview caller may still be awaiting the same computation.
    expect(terminate).not.toHaveBeenCalled();
  });

  it('lets one caller cancel without rejecting another caller sharing the same computation', async () => {
    const controller = new AbortController();
    const preparedFiles = { '/App.tsx': 'prepared' };
    let requestId = '';
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage: vi.fn((request: { requestId: string }) => { requestId = request.requestId; }),
      terminate: vi.fn(),
    };
    const files = { '/App.tsx': 'shared-abort-test' };

    const cancelled = runPrepareSandpackFilesOffThread({
      files,
      signal: controller.signal,
      workerFactory: () => worker,
    });
    const surviving = runPrepareSandpackFilesOffThread({
      files,
      workerFactory: () => worker,
    });
    controller.abort(new Error('launcher unmounted'));
    worker.onmessage?.({
      data: { requestId, ok: true, files: preparedFiles },
    } as MessageEvent);

    await expect(cancelled).rejects.toThrow('launcher unmounted');
    await expect(surviving).resolves.toEqual(preparedFiles);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
