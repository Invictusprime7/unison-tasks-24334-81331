/**
 * Contract Guard tests — silent-retry-then-surface behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { runWithContractGuard, validateDiff } from '@/platform/core';
import type { CompiledContract } from '@/contracts/contractCompiler';

function contract(opts: { ok?: boolean; pages?: string[]; caps?: string[] } = {}): CompiledContract {
  const { ok = true, pages = ['/'], caps = [] } = opts;
  return {
    validation: { valid: ok, issues: [], errors: ok ? 0 : 1, warnings: 0, infos: 0 },
    canonicalIntents: ['nav.goto'],
    requiredTables: [],
    requiredWorkflows: [],
    intentBindings: [
      {
        bindingKey: 'home:hero:primary-cta',
        slotRole: 'primary-cta',
        elementRole: 'primary-cta',
        intent: 'nav.goto',
        target: { kind: 'route', value: '/' },
        payloadSchema: {},
        readiness: 'ready',
        section: 'hero',
        page: 'home',
      },
    ],
    routePolicy: { routes: pages.map((p) => ({ path: p, pageId: p })) },
    slotBindingPolicy: { unresolved: [], resolved: [] },
    provisioningReport: {
      previewReady: ok,
      productionReady: ok,
      capabilities: caps.map((id) => ({
        capabilityId: id,
        capabilityName: id,
        status: 'provisioned',
        checks: [],
      })),
    },
    pages: pages.map((p) => ({ path: p })),
    capabilities: [],
  } as unknown as CompiledContract;
}

describe('validateDiff', () => {
  it('passes when nothing regresses', () => {
    const before = contract();
    const after = contract();
    const r = validateDiff(before, after);
    expect(r.ok).toBe(true);
    expect(r.removedPageIds).toHaveLength(0);
    expect(r.removedCapabilities).toHaveLength(0);
  });

  it('flags removed pages as regressions', () => {
    const before = contract({ pages: ['/', '/about'] });
    const after = contract({ pages: ['/'] });
    const r = validateDiff(before, after);
    expect(r.ok).toBe(false);
    expect(r.removedPageIds).toContain('/about');
  });

  it('flags removed capabilities as regressions', () => {
    const before = contract({ caps: ['commerce'] });
    const after = contract({ caps: [] });
    const r = validateDiff(before, after);
    expect(r.ok).toBe(false);
    expect(r.removedCapabilities).toContain('commerce');
  });
});

describe('runWithContractGuard', () => {
  it('accepts a clean first attempt', async () => {
    const before = contract();
    const propose = vi.fn().mockResolvedValue({ patch: 'p1', candidate: contract() });
    const out = await runWithContractGuard({ before, propose });
    expect(out.accepted).toBe(true);
    expect(propose).toHaveBeenCalledTimes(1);
  });

  it('retries silently then surfaces structured rejection', async () => {
    const before = contract({ pages: ['/', '/about'] });
    // Every attempt drops /about — guard should retry then surface.
    const propose = vi.fn().mockResolvedValue({
      patch: 'bad',
      candidate: contract({ pages: ['/'] }),
    });
    const onRejection = vi.fn();
    const out = await runWithContractGuard({
      before,
      propose,
      maxRetries: 2,
      onRejection,
    });
    expect(out.accepted).toBe(false);
    expect(propose).toHaveBeenCalledTimes(3); // 1 + 2 retries
    if (!out.accepted) {
      expect(out.rejections).toHaveLength(3);
      expect(out.lastDiff.removedPageIds).toContain('/about');
      expect(out.rejections[1].promptAddendum).toContain('Do NOT remove these pages');
    }
    expect(onRejection).toHaveBeenCalledTimes(3);
  });

  it('feeds prior rejection back to the proposer', async () => {
    const before = contract({ pages: ['/', '/about'] });
    let seenFeedback = false;
    const propose = vi.fn().mockImplementation(async ({ feedback }) => {
      if (feedback) seenFeedback = true;
      return { patch: 'p', candidate: contract({ pages: ['/'] }) };
    });
    await runWithContractGuard({ before, propose, maxRetries: 1 });
    expect(seenFeedback).toBe(true);
  });
});
