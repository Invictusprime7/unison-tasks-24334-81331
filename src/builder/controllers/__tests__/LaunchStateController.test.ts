import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LaunchStateController } from '../LaunchStateController';
import type { CompiledContract } from '@/platform/core';

const evaluateMock = vi.fn();
vi.mock('@/platform/core', async () => {
  const actual = await vi.importActual<typeof import('@/platform/core')>(
    '@/platform/core',
  );
  return {
    ...actual,
    PublishGate: {
      name: 'PublishGate',
      evaluate: (c: CompiledContract) => evaluateMock(c),
      assert: () => {},
    },
  };
});

const deployMock = vi.fn();
vi.mock('@/services/deploymentService', () => ({
  deployToProvider: (req: unknown, onProgress?: unknown) =>
    deployMock(req, onProgress),
}));

beforeEach(() => {
  evaluateMock.mockReset();
  deployMock.mockReset();
});

describe('LaunchStateController', () => {
  it('starts with empty/blocked state', () => {
    const c = new LaunchStateController();
    const s = c.getState();
    expect(s.verdict).toBeNull();
    expect(s.canPublish).toBe(false);
    expect(s.blockers).toEqual([]);
    expect(s.status.isDeploying).toBe(false);
  });

  it('evaluate(null) clears verdict and notifies subscribers', () => {
    const c = new LaunchStateController();
    const spy = vi.fn();
    c.subscribe(spy);
    c.evaluate(null);
    expect(spy).toHaveBeenCalled();
    expect(c.getState().canPublish).toBe(false);
  });

  it('evaluate(contract) maps verdict reasons into blockers', () => {
    evaluateMock.mockReturnValue({
      ok: false,
      gate: 'PublishGate',
      evaluatedAt: 'now',
      reasons: [
        {
          code: 'CAPABILITY_STUB',
          message: 'Commerce not configured',
          meta: { capabilityId: 'commerce' },
        },
      ],
    });
    const c = new LaunchStateController();
    const v = c.evaluate({} as CompiledContract);
    expect(v?.ok).toBe(false);
    expect(c.getState().blockers).toEqual([
      {
        code: 'CAPABILITY_STUB',
        message: 'Commerce not configured',
        capabilityId: 'commerce',
      },
    ]);
    expect(c.getState().canPublish).toBe(false);
  });

  it('evaluate ok=true enables canPublish', () => {
    evaluateMock.mockReturnValue({
      ok: true,
      gate: 'PublishGate',
      evaluatedAt: 'now',
      reasons: [],
    });
    const c = new LaunchStateController();
    c.evaluate({} as CompiledContract);
    expect(c.getState().canPublish).toBe(true);
    expect(c.getState().blockers).toEqual([]);
  });

  it('deploy() forwards progress and caches successful result', async () => {
    deployMock.mockImplementation(async (_req, onProgress) => {
      onProgress?.({ isDeploying: true, progress: 50, message: 'half' });
      const result = {
        status: 'success' as const,
        provider: 'vercel',
        url: 'https://x',
      };
      onProgress?.({
        isDeploying: false,
        progress: 100,
        message: 'done',
        result,
      });
      return result;
    });

    const c = new LaunchStateController();
    const res = await c.deploy({
      provider: 'vercel',
      files: { 'index.html': '<html></html>' },
    });
    expect(res.status).toBe('success');
    expect(c.getState().lastResult?.url).toBe('https://x');
    expect(c.getState().status.progress).toBe(100);
  });

  it('resetStatus clears deploy progress', () => {
    const c = new LaunchStateController();
    c.resetStatus();
    expect(c.getState().status.isDeploying).toBe(false);
    expect(c.getState().status.progress).toBe(0);
  });
});
