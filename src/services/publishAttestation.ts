/**
 * Client-side builder for the server-proven publish attestation (Track 5).
 *
 * Pairs with `supabase/functions/_shared/publishAttestation.ts`. The fingerprint
 * algorithm MUST stay in lockstep with the server implementation.
 */

import type { CompiledContract } from '@/platform/core';
import { PreviewGate, PublishGate } from '@/platform/core';

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

export async function buildPublishAttestation(
  contract: CompiledContract,
  files: Record<string, string>,
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
  };
}
