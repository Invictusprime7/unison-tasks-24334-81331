/**
 * Contract Gate regression tests.
 *
 * Locks the semantics of `isPreviewReady` and `isPublishReady` so future
 * refactors cannot accidentally relax the publish gate (Closure B precursor).
 */

import { describe, it, expect } from 'vitest';
import {
  isPreviewReady,
  isPublishReady,
  getPublishBlockers,
  type CompiledContract,
} from '@/contracts/contractCompiler';

function makeContract(overrides: Partial<CompiledContract> = {}): CompiledContract {
  const base: CompiledContract = {
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
      } as never,
    ],
    routePolicy: {
      routes: [{ path: '/', pageId: 'home' } as never],
    } as never,
    slotBindingPolicy: { unresolved: [], resolved: [] } as never,
    provisioningReport: {
      previewReady: true,
      productionReady: true,
      capabilities: [],
    } as never,
    pages: [],
    capabilities: [],
  } as unknown as CompiledContract;

  return { ...base, ...overrides };
}

describe('contract gate — isPreviewReady', () => {
  it('passes a fully-valid contract', () => {
    expect(isPreviewReady(makeContract())).toBe(true);
  });

  it('fails when validation is invalid', () => {
    const c = makeContract({
      validation: { valid: false, issues: [], errors: 1, warnings: 0, infos: 0 },
    });
    expect(isPreviewReady(c)).toBe(false);
  });

  it('fails when provisioningReport.previewReady is false', () => {
    const c = makeContract({
      provisioningReport: { previewReady: false, productionReady: false, capabilities: [] } as never,
    });
    expect(isPreviewReady(c)).toBe(false);
  });

  it('fails when no root route exists', () => {
    const c = makeContract({ routePolicy: { routes: [] } as never });
    expect(isPreviewReady(c)).toBe(false);
  });

  it('fails when no primary-cta binding exists', () => {
    const c = makeContract({ intentBindings: [] });
    expect(isPreviewReady(c)).toBe(false);
  });
});

describe('contract gate — isPublishReady (must be stricter than preview)', () => {
  it('passes a fully-valid + production-ready contract', () => {
    expect(isPublishReady(makeContract())).toBe(true);
  });

  it('fails if preview gate fails (transitive)', () => {
    const c = makeContract({
      validation: { valid: false, issues: [], errors: 1, warnings: 0, infos: 0 },
    });
    expect(isPublishReady(c)).toBe(false);
  });

  it('fails when provisioningReport.productionReady is false (stub allowed for preview only)', () => {
    const c = makeContract({
      provisioningReport: { previewReady: true, productionReady: false, capabilities: [] } as never,
    });
    expect(isPreviewReady(c)).toBe(true);
    expect(isPublishReady(c)).toBe(false);
  });

  it('fails when slotBindingPolicy has unresolved entries', () => {
    const c = makeContract({
      slotBindingPolicy: {
        unresolved: [{ section: 'hero', slot: 'primary-cta' }],
        resolved: [],
      } as never,
    });
    expect(isPublishReady(c)).toBe(false);
  });

  it('fails when any intent binding is blocked', () => {
    const c = makeContract({
      intentBindings: [
        {
          bindingKey: 'home:hero:primary-cta',
          slotRole: 'primary-cta',
          elementRole: 'primary-cta',
          intent: 'nav.goto',
          target: { kind: 'route', value: '/' },
          payloadSchema: {},
          readiness: 'blocked',
          section: 'hero',
          page: 'home',
        } as never,
      ],
    });
    expect(isPublishReady(c)).toBe(false);
  });
});

describe('contract gate — business-critical capability hardening (Closure B)', () => {
  it('blocks publish when a critical capability (commerce) is stubbed, even if previewReady', () => {
    const c = makeContract({
      provisioningReport: {
        previewReady: true,
        productionReady: true,
        capabilities: [
          {
            capabilityId: 'commerce',
            capabilityName: 'Commerce',
            status: 'stub',
            checks: [],
          },
        ],
      } as never,
    });
    expect(isPreviewReady(c)).toBe(true);
    expect(isPublishReady(c)).toBe(false);
    const blockers = getPublishBlockers(c);
    expect(blockers.some(b => b.code === 'critical-capability-stub' && b.capabilityId === 'commerce')).toBe(true);
  });

  it('blocks publish when a critical capability (auth) is missing', () => {
    const c = makeContract({
      provisioningReport: {
        previewReady: true,
        productionReady: true,
        capabilities: [
          {
            capabilityId: 'auth',
            capabilityName: 'Authentication',
            status: 'missing',
            checks: [],
          },
        ],
      } as never,
    });
    expect(isPublishReady(c)).toBe(false);
    expect(getPublishBlockers(c).some(b => b.code === 'critical-capability-missing')).toBe(true);
  });

  it('blocks publish when a critical workflow check is not provisioned', () => {
    const c = makeContract({
      provisioningReport: {
        previewReady: true,
        productionReady: true,
        capabilities: [
          {
            capabilityId: 'booking',
            capabilityName: 'Booking',
            status: 'provisioned',
            checks: [
              { check: 'workflow', label: 'Booking confirmation email', status: 'stub' },
            ],
          },
        ],
      } as never,
    });
    expect(isPublishReady(c)).toBe(false);
    expect(getPublishBlockers(c).some(b => b.code === 'critical-workflow-not-provisioned')).toBe(true);
  });

  it('does NOT block publish when a non-critical capability (newsletter) is stubbed', () => {
    const c = makeContract({
      provisioningReport: {
        previewReady: true,
        productionReady: true,
        capabilities: [
          {
            capabilityId: 'newsletter',
            capabilityName: 'Newsletter',
            status: 'stub',
            checks: [],
          },
        ],
      } as never,
    });
    expect(isPublishReady(c)).toBe(true);
  });

  it('returns empty blockers array for a fully publish-ready contract', () => {
    expect(getPublishBlockers(makeContract())).toEqual([]);
  });
});
