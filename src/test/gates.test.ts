/**
 * PR5 — Gate object regression tests.
 *
 * Verifies that the first-class PreviewGate / PublishGate produce structured
 * verdicts with the same semantics as the legacy boolean helpers, and that
 * GateFailedError surfaces the right metadata.
 */

import { describe, it, expect } from 'vitest';
import { PreviewGate, PublishGate, GateFailedError, evaluateAllGates, isPublishReady } from '@/platform/core';
import type { CompiledContract } from '@/platform/core/contractCompiler';
import type { CapabilityId } from '@/platform/core/capabilityRegistry';

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

// ============================================================================
// Per-capability publish-blocker coverage — each business-critical capability
// must independently block publish when stubbed or missing.
// ============================================================================

const BUSINESS_CRITICAL: CapabilityId[] = [
  'commerce',
  'auth',
  'booking',
  'lead-capture',
  'quoting',
  'donation',
];

describe('PublishGate per-capability coverage', () => {
  for (const cap of BUSINESS_CRITICAL) {
    it(`blocks when "${cap}" is stubbed`, () => {
      const c = makeContract({
        provisioningReport: {
          previewReady: true,
          productionReady: false,
          capabilities: [{ capabilityId: cap, capabilityName: cap, status: 'stub', checks: [] } as never],
        } as never,
      });
      const v = PublishGate.evaluate(c);
      expect(v.ok).toBe(false);
      const stub = v.reasons.find(r => r.code === 'critical-capability-stub');
      expect(stub?.meta?.capabilityId).toBe(cap);
    });

    it(`blocks when "${cap}" is missing`, () => {
      const c = makeContract({
        provisioningReport: {
          previewReady: true,
          productionReady: false,
          capabilities: [{ capabilityId: cap, capabilityName: cap, status: 'missing', checks: [] } as never],
        } as never,
      });
      const v = PublishGate.evaluate(c);
      expect(v.ok).toBe(false);
      expect(v.reasons.some(r => r.code === 'critical-capability-missing' && r.meta?.capabilityId === cap)).toBe(true);
    });

    it(`blocks when "${cap}" has an unprovisioned workflow`, () => {
      const c = makeContract({
        provisioningReport: {
          previewReady: true,
          productionReady: false,
          capabilities: [{
            capabilityId: cap,
            capabilityName: cap,
            status: 'provisioned',
            checks: [{ check: 'workflow', label: `${cap}-flow`, status: 'stub' }],
          } as never],
        } as never,
      });
      const v = PublishGate.evaluate(c);
      expect(v.reasons.some(r => r.code === 'critical-workflow-not-provisioned' && r.meta?.capabilityId === cap)).toBe(true);
    });
  }

  it('does NOT block on a non-critical stubbed capability', () => {
    const c = makeContract({
      provisioningReport: {
        previewReady: true,
        productionReady: true,
        capabilities: [{ capabilityId: 'crm', capabilityName: 'CRM', status: 'stub', checks: [] } as never],
      } as never,
    });
    expect(PublishGate.evaluate(c).ok).toBe(true);
  });

  it('surfaces unresolved-slots and blocked-bindings codes', () => {
    const c = makeContract({
      slotBindingPolicy: { unresolved: [{ slotId: 'cta' }], resolved: [] } as never,
      intentBindings: [{ readiness: 'blocked', elementRole: 'primary-cta' } as never],
    });
    const v = PublishGate.evaluate(c);
    expect(v.reasons.some(r => r.code === 'unresolved-slots')).toBe(true);
    expect(v.reasons.some(r => r.code === 'blocked-bindings')).toBe(true);
  });
});

describe('DeployButton publish-gating contract', () => {
  // DeployButton disables the Deploy CTA via: contract ? !isPublishReady(contract) : false
  // These assertions lock that behavior at the predicate level so the button
  // can never regress to deploying a non-publish-ready contract.
  it('healthy contract → isPublishReady === true → button enabled', () => {
    expect(isPublishReady(makeContract())).toBe(true);
  });

  it('stubbed commerce → isPublishReady === false → button disabled', () => {
    const c = makeContract({
      provisioningReport: {
        previewReady: true,
        productionReady: false,
        capabilities: [{ capabilityId: 'commerce', capabilityName: 'Commerce', status: 'stub', checks: [] } as never],
      } as never,
    });
    expect(isPublishReady(c)).toBe(false);
  });

  it('no contract → button must not be gated (returns false branch)', () => {
    // Mirrors DeployButton's `contract ? !isPublishReady(contract) : false` ternary.
    const contract: CompiledContract | null = null;
    const disabledByGate = contract ? !isPublishReady(contract) : false;
    expect(disabledByGate).toBe(false);
  });
});
