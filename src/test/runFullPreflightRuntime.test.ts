import { describe, expect, it, vi } from 'vitest';
import {
  runFullPreflightRuntime,
  type FullPreflightWorkerLike,
} from '@/services/runFullPreflightRuntime';
import type { RunFullPreflightResult } from '@/services/runFullPreflight';

function fakeResult(): RunFullPreflightResult {
  return {
    files: { '/src/App.tsx': 'export default function App(){ return <main />; }' },
  } as unknown as RunFullPreflightResult;
}

describe('runFullPreflightRuntime', () => {
  it('runs final preflight in a worker and terminates it after completion', async () => {
    const result = fakeResult();
    const terminate = vi.fn();
    const worker: FullPreflightWorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage: vi.fn((request) => {
        queueMicrotask(() => worker.onmessage?.({
          data: { requestId: request.requestId, ok: true, result },
        } as MessageEvent));
      }),
      terminate,
    };

    await expect(runFullPreflightRuntime({}, {}, {
      workerFactory: () => worker,
    })).resolves.toBe(result);
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('terminates a never-settling preflight when the launch watchdog aborts', async () => {
    const controller = new AbortController();
    const terminate = vi.fn();
    const worker: FullPreflightWorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage: vi.fn(),
      terminate,
    };

    const pending = runFullPreflightRuntime({}, {}, {
      signal: controller.signal,
      workerFactory: () => worker,
    });
    controller.abort(new Error('final preflight deadline reached'));

    await expect(pending).rejects.toThrow('final preflight deadline reached');
    expect(terminate).toHaveBeenCalledOnce();
  });
});
