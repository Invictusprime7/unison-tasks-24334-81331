import { describe, expect, it, vi } from 'vitest';
import { runStrictImportContractCheck } from '@/services/strictImportContractRuntime';

describe('strict import-contract runtime', () => {
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
      files: { '/App.tsx': 'x' },
      entryPoint: '/App.tsx',
      themePresetId: 'modern',
      workerFactory: () => worker,
      fallbackCheck,
    });

    expect(fallbackCheck).toHaveBeenCalledWith({ '/App.tsx': 'x' }, '/App.tsx', 'modern');
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
    expect(terminate).toHaveBeenCalledOnce();
  });
});
