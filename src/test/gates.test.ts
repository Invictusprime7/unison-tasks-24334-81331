/**
 * PR5 — Gate object regression tests.
 *
 * Verifies that the first-class PreviewGate / PublishGate produce structured
 * verdicts with the same semantics as the legacy boolean helpers, and that
 * GateFailedError surfaces the right metadata.
 */

import { describe, it, expect } from 'vitest';
import { PreviewGate, PublishGate, GateFailedError, evaluateAllGates } from '@/platform/core';
import type { CompiledContract } from '@/platform/core/contractCompiler';

function makeContract(overrides: Partial<CompiledContract> = {}): CompiledContract {
  const base = {
    validation: { valid: true, issues: [], errors: 0, warnings: 0, infos: 0 },
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
    routePolicy: { routes: [{ path: '/', pageId: 'home' }] },
    slotBindingPolicy: { unresolved: [], resolved: [] },
    provisioningReport: {
      previewReady: true,
      productionReady: true,
      capabilities: [],
    },
    pages: [],
    capabilities: [],
  } as unknown as CompiledContract;
  return { ...base, ...overrides };
}

describe('PreviewGate (first-class object)', () => {
  it('passes on a healthy contract', () => {
    const v = PreviewGate.evaluate(makeContract());
    expect(v.ok).toBe(true);
    expect(v.gate).toBe('PreviewGate');
    expect(v.reasons).toHaveLength(0);
    expect(typeof v.evaluatedAt).toBe('string');
  });

  it('fails when home route is missing', () => {
    const v = PreviewGate.evaluate(makeContract({
      routePolicy: { routes: [{ path: '/about', pageId: 'about' }] } as never,
    }));
    expect(v.ok).toBe(false);
    expect(v.reasons.some(r => r.code === 'missing-home-route')).toBe(true);
  });

  it('assert() throws GateFailedError when invalid', () => {
    const bad = makeContract({
      validation: { valid: false, issues: [], errors: 2, warnings: 0, infos: 0 },
    });
    expect(() => PreviewGate.assert(bad)).toThrow(GateFailedError);
  });
});

describe('PublishGate (strictly tighter than PreviewGate)', () => {
  it('passes on a healthy contract', () => {
    expect(PublishGate.evaluate(makeContract()).ok).toBe(true);
  });

  it('blocks when preview is not ready', () => {
    const v = PublishGate.evaluate(makeContract({
      provisioningReport: { previewReady: false, productionReady: true, capabilities: [] } as never,
    }));
    expect(v.ok).toBe(false);
    expect(v.reasons.some(r => r.code === 'preview-not-ready')).toBe(true);
  });

  it('blocks on a stubbed business-critical capability', () => {
    const c = makeContract({
      provisioningReport: {
        previewReady: true,
        productionReady: false,
        capabilities: [
          {
            capabilityId: 'commerce',
            capabilityName: 'Commerce',
            status: 'stub',
            checks: [],
          } as never,
        ],
      } as never,
    });
    const v = PublishGate.evaluate(c);
    expect(v.ok).toBe(false);
    expect(v.reasons.some(r => r.code === 'critical-capability-stub')).toBe(true);
    expect(v.reasons.find(r => r.code === 'critical-capability-stub')?.meta?.capabilityId).toBe('commerce');
  });
});

describe('evaluateAllGates', () => {
  it('returns verdicts for every registered gate', () => {
    const all = evaluateAllGates(makeContract());
    expect(all.preview.ok).toBe(true);
    expect(all.publish.ok).toBe(true);
    expect(all.preview.gate).toBe('PreviewGate');
    expect(all.publish.gate).toBe('PublishGate');
  });
});
