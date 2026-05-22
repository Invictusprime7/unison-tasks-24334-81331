import { describe, it, expect, vi } from 'vitest';
import { AIPatchTransactionService } from '../AIPatchTransactionService';
import {
  DEFAULT_REPAIR_MODEL,
  ESCALATION_MODEL,
  MAX_REPAIR_RETRIES,
  modelForAttempt,
  runRepairLoop,
} from '../repairLoop';
import type { PatchPlan } from '../types';

const validPlan = (rationale = 'r'): PatchPlan => ({
  intent: 'modify_component',
  targetFiles: ['/src/a.tsx'],
  expectedSymbols: [],
  edits: [{ kind: 'replace', path: '/src/a.tsx', content: rationale }],
  riskLevel: 'low',
  rationale,
  promptHash: 'h',
});

describe('modelForAttempt', () => {
  it('uses base model for attempt 0 and 1, escalates at 2', () => {
    expect(modelForAttempt(0)).toBe(DEFAULT_REPAIR_MODEL);
    expect(modelForAttempt(1)).toBe(DEFAULT_REPAIR_MODEL);
    expect(modelForAttempt(2)).toBe(ESCALATION_MODEL);
  });

  it('honors a custom base model for non-escalated attempts', () => {
    expect(modelForAttempt(0, 'custom')).toBe('custom');
    expect(modelForAttempt(2, 'custom')).toBe(ESCALATION_MODEL);
  });
});

describe('runRepairLoop', () => {
  it('exits on first attempt when dry-run succeeds', async () => {
    const service = new AIPatchTransactionService({ dryRunFn: async () => ({ ok: true }) });
    const regenerate = vi.fn();
    const result = await runRepairLoop(validPlan(), { service, regenerate });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(regenerate).not.toHaveBeenCalled();
    expect(result.history[0].model).toBe(DEFAULT_REPAIR_MODEL);
  });

  it('retries with same model on attempt 1, escalates on attempt 2', async () => {
    const dryRunFn = vi.fn().mockResolvedValue({ ok: false, errors: ['boom'] });
    const service = new AIPatchTransactionService({ dryRunFn });
    const regenerate = vi.fn(async () => validPlan('retry'));

    const result = await runRepairLoop(validPlan(), { service, regenerate });

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(1 + MAX_REPAIR_RETRIES);
    expect(regenerate).toHaveBeenCalledTimes(MAX_REPAIR_RETRIES);
    expect(regenerate.mock.calls[0][0].model).toBe(DEFAULT_REPAIR_MODEL);
    expect(regenerate.mock.calls[1][0].model).toBe(ESCALATION_MODEL);
    expect(result.history.map((h) => h.model)).toEqual([
      DEFAULT_REPAIR_MODEL,
      DEFAULT_REPAIR_MODEL,
      ESCALATION_MODEL,
    ]);
    expect(result.errors).toContain('boom');
  });

  it('stops as soon as a retry succeeds', async () => {
    const dryRunFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, errors: ['x'] })
      .mockResolvedValueOnce({ ok: true });
    const service = new AIPatchTransactionService({ dryRunFn });
    const regenerate = vi.fn(async () => validPlan('retry'));

    const result = await runRepairLoop(validPlan(), { service, regenerate });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it('feeds dry-run errors + previousPlan into the regenerator', async () => {
    const dryRunFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, errors: ['need import'] })
      .mockResolvedValueOnce({ ok: true });
    const service = new AIPatchTransactionService({ dryRunFn });
    const regenerate = vi.fn(async () => validPlan('retry'));

    await runRepairLoop(validPlan('initial'), { service, regenerate });
    const ctx = regenerate.mock.calls[0][0];
    expect(ctx.attempt).toBe(1);
    expect(ctx.errors).toEqual(['need import']);
    expect(ctx.previousPlan?.rationale).toBe('initial');
  });

  it('treats validation rejection as a retryable failure', async () => {
    const dryRunFn = vi.fn().mockResolvedValue({ ok: true });
    const service = new AIPatchTransactionService({ dryRunFn });
    // First payload is invalid (missing required fields), second is valid.
    const regenerate = vi.fn(async () => validPlan('fixed'));

    const result = await runRepairLoop({ intent: 'modify_component' }, { service, regenerate });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBeGreaterThanOrEqual(2);
    expect(result.history[0].phase).toBe('rejected');
    expect(result.history[0].validationErrors.length).toBeGreaterThan(0);
  });

  it('aborts when regenerate returns null', async () => {
    const service = new AIPatchTransactionService({
      dryRunFn: async () => ({ ok: false, errors: ['x'] }),
    });
    const regenerate = vi.fn(async () => null);

    const result = await runRepairLoop(validPlan(), { service, regenerate });
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(1);
    expect(regenerate).toHaveBeenCalledOnce();
  });

  it('aborts gracefully when regenerate throws', async () => {
    const service = new AIPatchTransactionService({
      dryRunFn: async () => ({ ok: false, errors: ['x'] }),
    });
    const regenerate = vi.fn(async () => {
      throw new Error('llm down');
    });

    const result = await runRepairLoop(validPlan(), { service, regenerate });
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(1);
  });

  it('invokes onAttempt for every attempt', async () => {
    const dryRunFn = vi.fn().mockResolvedValue({ ok: false, errors: ['x'] });
    const service = new AIPatchTransactionService({ dryRunFn });
    const regenerate = vi.fn(async () => validPlan('retry'));
    const onAttempt = vi.fn();

    await runRepairLoop(validPlan(), { service, regenerate, onAttempt });
    expect(onAttempt).toHaveBeenCalledTimes(1 + MAX_REPAIR_RETRIES);
  });

  it('caps retries at MAX_REPAIR_RETRIES even if a higher value is requested', async () => {
    const dryRunFn = vi.fn().mockResolvedValue({ ok: false, errors: ['x'] });
    const service = new AIPatchTransactionService({ dryRunFn });
    const regenerate = vi.fn(async () => validPlan('retry'));

    const result = await runRepairLoop(validPlan(), {
      service,
      regenerate,
      maxRetries: 99,
    });
    expect(result.attempts).toBe(1 + MAX_REPAIR_RETRIES);
  });
});
