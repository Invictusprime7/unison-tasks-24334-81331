import { describe, expect, it, vi } from 'vitest';
import {
  runFullPreflightRuntime,
  type FullPreflightWorkerLike,
} from '@/services/runFullPreflightRuntime';
import type { RunFullPreflightResult } from '@/services/runFullPreflight';
import { runFullPreflight } from '@/services/runFullPreflight';

function fakeResult(): RunFullPreflightResult {
  return runFullPreflight({
    '/src/App.tsx': 'export default function App(){ return <main />; }',
  });
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
    })).resolves.toMatchObject({
      ...result,
      runtime: { execution: 'worker' },
    });
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('terminates a silent worker at the runtime deadline and uses the compatibility fallback', async () => {
    vi.useFakeTimers();
    const fallbackResult = fakeResult();
    const terminate = vi.fn();
    const fallbackPreflight = vi.fn(() => fallbackResult);
    const worker: FullPreflightWorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage: vi.fn(),
      terminate,
    };

    const pending = runFullPreflightRuntime({}, {}, {
      workerFactory: () => worker,
      workerTimeoutMs: 50,
      fallbackPreflight,
    });
    await vi.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toMatchObject({
      ...fallbackResult,
      runtime: {
        execution: 'compatibility-fallback',
        reason: expect.stringContaining('did not respond within 50ms'),
      },
    });
    expect(terminate).toHaveBeenCalledOnce();
    expect(fallbackPreflight).toHaveBeenCalledOnce();
    vi.useRealTimers();
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

  it('revalidates the whole candidate after compiler-guided repair', async () => {
    const workers: FullPreflightWorkerLike[] = [];
    const workerFactory = (): FullPreflightWorkerLike => {
      const worker: FullPreflightWorkerLike = {
        onmessage: null,
        onerror: null,
        terminate: vi.fn(),
        postMessage: vi.fn((request) => {
          const result = runFullPreflight(request.files, request.options);
          queueMicrotask(() => worker.onmessage?.({
            data: { requestId: request.requestId, ok: true, result },
          } as MessageEvent));
        }),
      };
      workers.push(worker);
      return worker;
    };
    const repair = vi.fn(async () => (
      'export default function Home() { return <main>Repaired</main>; }'
    ));

    const result = await runFullPreflightRuntime({
      '/src/pages/Home.tsx': [
        "import Widget from 'some-hallucinated-package';",
        'export default function Home() { return <Widget />; }',
      ].join('\n'),
    }, { sourceLane: 'lane-b' }, {
      workerFactory,
      repair,
      maxRepairAttempts: 2,
    });

    expect(repair).toHaveBeenCalledOnce();
    expect(workers).toHaveLength(2);
    expect(result.stages.compileSafe.status).toBe('accepted');
    expect(result.runtime?.repairAttempts).toBe(1);
    expect(result.files['/src/pages/Home.tsx']).toContain('Repaired');
  });
});
