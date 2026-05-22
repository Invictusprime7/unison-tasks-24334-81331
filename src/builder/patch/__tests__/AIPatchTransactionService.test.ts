import { describe, it, expect, vi } from 'vitest';
import {
  AIPatchTransactionService,
  isTransactionalIntent,
  TRANSACTIONAL_INTENTS,
} from '../AIPatchTransactionService';
import type { PatchPlan } from '../types';

const validPlan: PatchPlan = {
  intent: 'modify_component',
  targetFiles: ['/src/components/Hero.tsx'],
  expectedSymbols: ['Hero'],
  edits: [{ kind: 'replace', path: '/src/components/Hero.tsx', content: 'export const Hero = () => null;' }],
  riskLevel: 'low',
  rationale: 'shorten hero',
  promptHash: 'abc123',
};

describe('AIPatchTransactionService — scope', () => {
  it('limits transactional intents to modify_component + repair_error', () => {
    expect([...TRANSACTIONAL_INTENTS].sort()).toEqual(['modify_component', 'repair_error']);
    expect(isTransactionalIntent('modify_component')).toBe(true);
    expect(isTransactionalIntent('repair_error')).toBe(true);
    expect(isTransactionalIntent('add_page')).toBe(false);
    expect(isTransactionalIntent('wire_button')).toBe(false);
    expect(isTransactionalIntent('update_style')).toBe(false);
  });
});

describe('AIPatchTransactionService — propose', () => {
  it('rejects malformed plans with structured errors', () => {
    const svc = new AIPatchTransactionService();
    const s = svc.propose({ intent: 'modify_component' });
    expect(s.phase).toBe('rejected');
    expect(s.plan).toBeNull();
    expect(s.validationErrors.length).toBeGreaterThan(0);
  });

  it('rejects out-of-scope intents in Phase B2', () => {
    const svc = new AIPatchTransactionService();
    const s = svc.propose({ ...validPlan, intent: 'add_page' });
    expect(s.phase).toBe('rejected');
    expect(s.validationErrors[0]).toMatch(/not transactional/);
  });

  it('accepts well-formed in-scope plans', () => {
    const svc = new AIPatchTransactionService();
    const s = svc.propose(validPlan);
    expect(s.phase).toBe('ready');
    expect(s.plan?.intent).toBe('modify_component');
    expect(s.validationErrors).toEqual([]);
  });
});

describe('AIPatchTransactionService — dryRun', () => {
  it('throws if called before propose', async () => {
    const svc = new AIPatchTransactionService();
    await expect(svc.dryRun()).rejects.toThrow(/invalid phase/);
  });

  it('transitions to preview when dry-run succeeds', async () => {
    const dryRunFn = vi.fn().mockResolvedValue({ ok: true, artifact: { files: 1 } });
    const svc = new AIPatchTransactionService({ dryRunFn });
    svc.propose(validPlan);
    const outcome = await svc.dryRun();
    expect(outcome.ok).toBe(true);
    expect(svc.getState().phase).toBe('preview');
    expect(dryRunFn).toHaveBeenCalledOnce();
  });

  it('transitions to dry-failed when dry-run reports errors', async () => {
    const dryRunFn = vi.fn().mockResolvedValue({ ok: false, errors: ['boom'] });
    const svc = new AIPatchTransactionService({ dryRunFn });
    svc.propose(validPlan);
    await svc.dryRun();
    expect(svc.getState().phase).toBe('dry-failed');
    expect(svc.getState().dryRun?.errors).toEqual(['boom']);
  });

  it('captures thrown errors as a failed dry-run outcome', async () => {
    const dryRunFn = vi.fn().mockRejectedValue(new Error('compile crashed'));
    const svc = new AIPatchTransactionService({ dryRunFn });
    svc.propose(validPlan);
    const outcome = await svc.dryRun();
    expect(outcome.ok).toBe(false);
    expect(outcome.errors?.[0]).toMatch(/compile crashed/);
    expect(svc.getState().phase).toBe('dry-failed');
  });

  it('allows retry from dry-failed', async () => {
    const dryRunFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, errors: ['x'] })
      .mockResolvedValueOnce({ ok: true });
    const svc = new AIPatchTransactionService({ dryRunFn });
    svc.propose(validPlan);
    await svc.dryRun();
    expect(svc.getState().phase).toBe('dry-failed');
    await svc.dryRun();
    expect(svc.getState().phase).toBe('preview');
  });
});

describe('AIPatchTransactionService — apply', () => {
  it('throws if called before a successful dry-run', async () => {
    const svc = new AIPatchTransactionService();
    svc.propose(validPlan);
    await expect(svc.apply()).rejects.toThrow(/invalid phase/);
  });

  it('commits via applyFn and transitions to applied', async () => {
    const dryRunFn = vi.fn().mockResolvedValue({ ok: true });
    const applyFn = vi.fn().mockResolvedValue({ ok: true, result: { committed: true } });
    const svc = new AIPatchTransactionService({ dryRunFn, applyFn });
    svc.propose(validPlan);
    await svc.dryRun();
    const outcome = await svc.apply();
    expect(outcome.ok).toBe(true);
    expect(svc.getState().phase).toBe('applied');
    expect(applyFn).toHaveBeenCalledOnce();
  });

  it('transitions to failed when applyFn returns ok=false', async () => {
    const dryRunFn = vi.fn().mockResolvedValue({ ok: true });
    const applyFn = vi.fn().mockResolvedValue({ ok: false, error: 'commit blocked' });
    const svc = new AIPatchTransactionService({ dryRunFn, applyFn });
    svc.propose(validPlan);
    await svc.dryRun();
    await svc.apply();
    expect(svc.getState().phase).toBe('failed');
    expect(svc.getState().apply?.error).toBe('commit blocked');
  });
});

describe('AIPatchTransactionService — discard / reset', () => {
  it('discard clears the plan and marks discarded', async () => {
    const svc = new AIPatchTransactionService({ dryRunFn: async () => ({ ok: true }) });
    svc.propose(validPlan);
    await svc.dryRun();
    svc.discard();
    expect(svc.getState().phase).toBe('discarded');
    expect(svc.getState().plan).toBeNull();
  });

  it('reset returns to idle', () => {
    const svc = new AIPatchTransactionService();
    svc.propose(validPlan);
    svc.reset();
    expect(svc.getState().phase).toBe('idle');
    expect(svc.getState().plan).toBeNull();
  });

  it('notifies subscribers on state changes', () => {
    const svc = new AIPatchTransactionService();
    const listener = vi.fn();
    const unsubscribe = svc.subscribe(listener);
    svc.propose(validPlan);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
