/**
 * Client-side builder for the server-proven publish attestation (Track 5).
 *
 * Pairs with `supabase/functions/_shared/publishAttestation.ts`. The fingerprint
 * algorithm MUST stay in lockstep with the server implementation.
 */

import type { CompiledContract, SiteBundleSnapshot } from '@/platform/core';
import { PreviewGate, PublishGate } from '@/platform/core';
import {
  resolveVerticalLaunchContract,
  type VerticalLaunchContract,
} from '@/services/verticalLaunchContract';
import type { BusinessSystemType } from '@/data/templates/types';

export interface PublishAttestationGateReason {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface PublishAttestationCapability {
  capabilityId: string;
  capabilityName?: string;
  status: string;
  critical?: boolean;
}

export interface PublishAttestationRowCountAssertion {
  table: string;
  min: number;
  observed: number;
  reason: string;
}

export interface PublishAttestationVerticalReadiness {
  systemId: string;
  requiredCapabilities: string[];
  minCanonicalPages: number;
  canonicalPageCount: number;
  minBoundIntents: number;
  boundIntentCount: number;
  rowCountAssertions: PublishAttestationRowCountAssertion[];
}

export interface PublishAttestation {
  version: 1;
  evaluatedAt: string;
  gates: {
    preview: { ok: boolean; reasons: PublishAttestationGateReason[] };
    publish: { ok: boolean; reasons: PublishAttestationGateReason[] };
  };
  capabilities: PublishAttestationCapability[];
  filesFingerprint: string;
  fileCount: number;
  verticalReadiness?: PublishAttestationVerticalReadiness;
}

const BUSINESS_CRITICAL = new Set([
  'commerce',
  'auth',
  'booking',
  'lead-capture',
  'quoting',
  'donation',
  'payments',
]);

async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeFilesFingerprint(
  files: Record<string, string>,
): Promise<{ fingerprint: string; fileCount: number }> {
  const entries: Array<[string, string]> = [];
  for (const [rawPath, content] of Object.entries(files)) {
    const path = rawPath.replace(/^\/+/, '');
    const sha1 = await sha1Hex(content);
    entries.push([path, sha1]);
  }
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const canonical = entries.map(([p, s]) => `${p}\0${s}`).join('\n');
  const fingerprint = await sha256Hex(canonical);
  return { fingerprint, fileCount: entries.length };
}

export interface BuildPublishAttestationOptions {
  /**
   * Track 6 — when supplied, the attestation includes per-vertical readiness
   * fixtures so the server can enforce required capabilities, minimum
   * canonical pages, minimum bound intents, and row-count assertions.
   */
  verticalContract?: VerticalLaunchContract | null;
  /**
   * Observed row counts keyed by table name. Tables referenced in the vertical
   * contract's `rowCountAssertions` that are missing from this map are
   * recorded as `observed: 0` (which will fail any `min > 0` assertion).
   */
  rowCounts?: Record<string, number>;
}

export async function buildPublishAttestation(
  contract: CompiledContract,
  files: Record<string, string>,
  options: BuildPublishAttestationOptions = {},
): Promise<PublishAttestation> {
  const preview = PreviewGate.evaluate(contract);
  const publish = PublishGate.evaluate(contract);
  const { fingerprint, fileCount } = await computeFilesFingerprint(files);

  const capabilities: PublishAttestationCapability[] =
    contract.provisioningReport.capabilities.map((cap) => ({
      capabilityId: cap.capabilityId,
      capabilityName: cap.capabilityName,
      status: cap.status,
      critical: BUSINESS_CRITICAL.has(cap.capabilityId),
    }));

  let verticalReadiness: PublishAttestationVerticalReadiness | undefined;
  const vc = options.verticalContract;
  if (vc && vc.systemType) {
    const rowCounts = options.rowCounts ?? {};
    verticalReadiness = {
      systemId: vc.systemType,
      requiredCapabilities: [...vc.requiredCapabilities],
      minCanonicalPages: vc.readinessFixtures.minCanonicalPages,
      canonicalPageCount: contract.pages.length,
      minBoundIntents: vc.readinessFixtures.minBoundIntents,
      boundIntentCount: contract.intentBindings.filter((b) => b.readiness !== 'blocked').length,
      rowCountAssertions: vc.readinessFixtures.rowCountAssertions.map((a) => ({
        table: a.table,
        min: a.min,
        observed: rowCounts[a.table] ?? 0,
        reason: a.reason,
      })),
    };
  }

  return {
    version: 1,
    evaluatedAt: new Date().toISOString(),
    gates: {
      preview: {
        ok: preview.ok,
        reasons: preview.reasons.map((r) => ({ code: r.code, message: r.message, meta: r.meta })),
      },
      publish: {
        ok: publish.ok,
        reasons: publish.reasons.map((r) => ({ code: r.code, message: r.message, meta: r.meta })),
      },
    },
    capabilities,
    filesFingerprint: fingerprint,
    fileCount,
    verticalReadiness,
  };
}

// ============================================================================
// Snapshot-driven entrypoint — single source of truth.
//
// Downstream surfaces (DeployButton, deploymentService, Readiness Center)
// should prefer this over `buildPublishAttestation` so the vertical contract,
// systemId, file map, and contract-derived counts all resolve from
// `SiteBundleSnapshot` rather than from caller-supplied UI state.
// ============================================================================

export interface BuildPublishAttestationFromSnapshotOptions {
  /**
   * Observed row counts by table. Optional — when omitted, any
   * `rowCountAssertions.min > 0` will fail (which is the correct default
   * because the snapshot itself does not author live database rows).
   */
  rowCounts?: Record<string, number>;
  /**
   * Override the file map used for fingerprinting. Defaults to
   * `snapshot.vfsFiles`. Use this when the caller has a post-build/deploy
   * file map (e.g. `canonicalBuildArtifacts.deployFiles`) that differs from
   * the raw snapshot VFS.
   */
  files?: Record<string, string>;
}

export async function buildPublishAttestationFromSnapshot(
  snapshot: SiteBundleSnapshot,
  contract: CompiledContract,
  options: BuildPublishAttestationFromSnapshotOptions = {},
): Promise<PublishAttestation> {
  const systemId = (snapshot.meta?.systemId ?? null) as BusinessSystemType | null;
  const verticalContract: VerticalLaunchContract | null = systemId
    ? resolveVerticalLaunchContract(systemId)
    : null;
  const files = options.files ?? snapshot.vfsFiles ?? {};
  return buildPublishAttestation(contract, files, {
    verticalContract,
    rowCounts: options.rowCounts,
  });
}
