/**
 * Gates — first-class PreviewGate and PublishGate objects.
 *
 * PR5 promotes the boolean helpers (`isPreviewReady`, `isPublishReady`,
 * `getPublishBlockers`) into structured Gate objects that:
 *
 *   - return a typed verdict (ok + reasons + blockers)
 *   - identify themselves with a stable `name` for telemetry
 *   - expose `evaluate(contract)` and `assert(contract)` for callers
 *     that want to throw on failure (deploy pipelines, publish edge fn)
 *   - share a common `Gate<T>` interface so future gates (SecurityGate,
 *     AccessibilityGate, PerformanceGate) plug in without churn
 *
 * The legacy function helpers in contractCompiler.ts remain as thin
 * delegations so we don't break existing callers in a single PR.
 */

import type { CompiledContract } from './contractCompiler';
import {
  isPreviewReady as legacyIsPreviewReady,
  isPublishReady as legacyIsPublishReady,
  getPublishBlockers as legacyGetPublishBlockers,
  type PublishBlocker,
} from './contractCompiler';

// ============================================================================
// Generic Gate contract
// ============================================================================

export interface GateReason {
  code: string;
  message: string;
  /** Optional structured payload for UIs that want to render details. */
  meta?: Record<string, unknown>;
}

export interface GateVerdict {
  /** Did the contract pass this gate? */
  ok: boolean;
  /** Gate identity — useful for telemetry / UI grouping. */
  gate: string;
  /** When the verdict was computed. */
  evaluatedAt: string;
  /** Reasons the gate failed (empty when ok=true). */
  reasons: GateReason[];
}

export interface Gate<TInput> {
  readonly name: string;
  evaluate(input: TInput): GateVerdict;
  /** Throws GateFailedError when the gate fails. */
  assert(input: TInput): void;
}

export class GateFailedError extends Error {
  readonly verdict: GateVerdict;
  constructor(verdict: GateVerdict) {
    super(`[${verdict.gate}] failed: ${verdict.reasons.map(r => r.code).join(', ')}`);
    this.name = 'GateFailedError';
    this.verdict = verdict;
  }
}

function buildVerdict(gate: string, reasons: GateReason[]): GateVerdict {
  return {
    ok: reasons.length === 0,
    gate,
    evaluatedAt: new Date().toISOString(),
    reasons,
  };
}

function makeGate<T>(
  name: string,
  evaluator: (input: T) => GateReason[],
): Gate<T> {
  return {
    name,
    evaluate(input) {
      return buildVerdict(name, evaluator(input));
    },
    assert(input) {
      const verdict = buildVerdict(name, evaluator(input));
      if (!verdict.ok) throw new GateFailedError(verdict);
    },
  };
}

// ============================================================================
// PreviewGate — minimum bar to render a preview
// ============================================================================

export const PreviewGate: Gate<CompiledContract> = makeGate(
  'PreviewGate',
  (contract) => {
    const reasons: GateReason[] = [];

    if (!contract.validation.valid) {
      reasons.push({
        code: 'validation-invalid',
        message: `Contract has ${contract.validation.errors} validation error(s).`,
      });
    }
    if (!contract.provisioningReport.previewReady) {
      reasons.push({
        code: 'provisioning-not-preview-ready',
        message: 'Provisioning report is not preview-ready.',
      });
    }
    if (!contract.routePolicy.routes.some(r => r.path === '/')) {
      reasons.push({
        code: 'missing-home-route',
        message: 'Site is missing a root "/" route.',
      });
    }
    const hasPrimaryCta = contract.intentBindings.some(
      b => b.slotRole?.includes('primary-cta') || b.elementRole.includes('primary-cta'),
    );
    if (!hasPrimaryCta) {
      reasons.push({
        code: 'missing-primary-cta',
        message: 'No primary CTA binding found.',
      });
    }

    return reasons;
  },
);

// ============================================================================
// PublishGate — strictly tighter than PreviewGate
// ============================================================================

export const PublishGate: Gate<CompiledContract> = makeGate(
  'PublishGate',
  (contract) => {
    const blockers = legacyGetPublishBlockers(contract);
    return blockers.map((b: PublishBlocker) => ({
      code: b.code,
      message: b.message,
      meta: b.capabilityId ? { capabilityId: b.capabilityId } : undefined,
    }));
  },
);

// ============================================================================
// Registry — additional gates land here as the platform grows.
// ============================================================================

export const GATES = {
  preview: PreviewGate,
  publish: PublishGate,
} as const;

export type GateKey = keyof typeof GATES;

/**
 * Evaluate every registered gate; useful for status panels & telemetry.
 */
export function evaluateAllGates(contract: CompiledContract): Record<GateKey, GateVerdict> {
  return {
    preview: PreviewGate.evaluate(contract),
    publish: PublishGate.evaluate(contract),
  };
}

// ============================================================================
// Back-compat thin aliases — prefer the Gate API in new code.
// ============================================================================

/** @deprecated Use `PreviewGate.evaluate(contract).ok`. */
export const isPreviewReady = legacyIsPreviewReady;
/** @deprecated Use `PublishGate.evaluate(contract).ok`. */
export const isPublishReady = legacyIsPublishReady;
/** @deprecated Use `PublishGate.evaluate(contract).reasons`. */
export const getPublishBlockers = legacyGetPublishBlockers;
