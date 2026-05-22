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
  it('drives the full lifecycle and surfaces a ready service on success', async () => {
    const applyFn = vi.fn().mockResolvedValue({ ok: true, result: { committed: true } });
    const regenerate = vi.fn();
    const { service, result } = await runTransactionalPatch({
      initialPlan: plan,
      vfsFiles: { '/src/a.tsx': 'old' },
      registry: {} as never,
      regenerate,
      applyFn,
    });

    expect(result.ok).toBe(true);
    expect(service.getState().phase).toBe('preview');
    expect(regenerate).not.toHaveBeenCalled();
    // Caller — not the runner — invokes apply.
    expect(applyFn).not.toHaveBeenCalled();

    // After UI clicks Apply, the wired applyFn is used.
    const outcome = await service.apply();
    expect(outcome.ok).toBe(true);
    expect(applyFn).toHaveBeenCalledOnce();
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
