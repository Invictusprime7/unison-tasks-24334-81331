/**
 * businessProfileReadinessGate — A4
 *
 * Translates a BusinessProfileDTO into publish-blocking reasons that the
 * Web Builder readiness pill, DeployButton, and OS shell can surface.
 *
 * This lives alongside `runFullPreflight` and the PublishGate but stays
 * decoupled: profile readiness is evaluated wherever a live business is
 * attached (site preview runtime, Business Center, Web Builder topbar).
 *
 * The result intentionally mirrors the `GateVerdict` shape from
 * `platform/core/gates.ts` so callers can compose it into
 * `evaluateAllGates`-style dashboards without another adapter.
 */

import {
  scoreProfileCompleteness,
  type BusinessProfileDTO,
  type ProfileCompletenessReport,
  type ProfileFieldReport,
} from '@/types/businessProfile';

export interface ProfileGateReason {
  code: string;
  message: string;
  field: ProfileFieldReport['key'];
}

export interface ProfileGateVerdict {
  ok: boolean;
  gate: 'BusinessProfileGate';
  evaluatedAt: string;
  percent: number;
  publishBlocked: boolean;
  reasons: ProfileGateReason[];
  recommended: ProfileGateReason[];
  report: ProfileCompletenessReport;
}

function toReason(f: ProfileFieldReport): ProfileGateReason {
  return {
    code: `profile.missing.${String(f.key)}`,
    message: `${f.label} is missing.`,
    field: f.key,
  };
}

export function evaluateBusinessProfileGate(
  profile: BusinessProfileDTO | null | undefined,
): ProfileGateVerdict {
  const evaluatedAt = new Date().toISOString();
  if (!profile) {
    return {
      ok: false,
      gate: 'BusinessProfileGate',
      evaluatedAt,
      percent: 0,
      publishBlocked: true,
      reasons: [
        {
          code: 'profile.missing.business',
          message: 'No connected business profile.',
          field: 'name',
        },
      ],
      recommended: [],
      report: { percent: 0, missingRequired: [], missingRecommended: [], fields: [] },
    };
  }

  const report = scoreProfileCompleteness(profile);
  const reasons = report.missingRequired.filter((f) => f.blocksPublish).map(toReason);
  const recommended = report.missingRecommended.map(toReason);
  return {
    ok: reasons.length === 0,
    gate: 'BusinessProfileGate',
    evaluatedAt,
    percent: report.percent,
    publishBlocked: reasons.length > 0,
    reasons,
    recommended,
    report,
  };
}
