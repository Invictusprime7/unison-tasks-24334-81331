import { describe, it, expect, vi } from 'vitest';
import { runTransactionalPatch } from '../transactionalRunner';
import type { PatchPlan } from '../types';

const plan: PatchPlan = {
  intent: 'modify_component',
  targetFiles: ['/src/a.tsx'],
  expectedSymbols: [],
  edits: [{ kind: 'replace', path: '/src/a.tsx', content: 'next' }],
  riskLevel: 'low',
  rationale: 'r',
  promptHash: 'h',
};

describe('runTransactionalPatch', () => {
  it('stitches scratch runtime + service + repair loop and never auto-applies', async () => {
    const applyFn = vi.fn().mockResolvedValue({ ok: true, result: { committed: true } });
    const regenerate = vi.fn(async () => plan);
    const { service, result } = await runTransactionalPatch({
      initialPlan: plan,
      vfsFiles: { '/src/a.tsx': 'old' },
      registry: {} as never,
      regenerate,
      applyFn,
      maxRetries: 0,
    });

    // Composition: service is wired, loop ran at least once, applyFn is reserved for the UI.
    expect(service.getState().plan?.intent).toBe('modify_component');
    expect(result.attempts).toBeGreaterThanOrEqual(1);
    expect(applyFn).not.toHaveBeenCalled();
  });

  it('returns a failed service when the plan cannot be repaired', async () => {
    const regenerate = vi.fn(async () => ({ ...plan, edits: [{ kind: 'delete', path: '/missing' }] }));
    const applyFn = vi.fn();
    const { service, result } = await runTransactionalPatch({
      initialPlan: { ...plan, edits: [{ kind: 'delete', path: '/missing' }] },
      vfsFiles: {},
      registry: {} as never,
      regenerate,
      applyFn,
    });

    expect(result.ok).toBe(false);
    expect(service.getState().phase).toBe('dry-failed');
    expect(applyFn).not.toHaveBeenCalled();
  });
});
