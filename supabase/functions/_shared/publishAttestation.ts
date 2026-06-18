/**
 * Server-side publish attestation verification.
 *
 * Closure of "Track 5 — server-proven publish contract": the client supplies a
 * compact `PublishAttestation` derived from PublishGate.evaluate(contract).
 * The edge function refuses to publish unless:
 *
 *   1. The attestation declares the publish gate passed (no blockers).
 *   2. No business-critical capability is reported as `missing` or `stub`.
 *   3. The fingerprint of the files in the request matches the fingerprint
 *      the client signed into the attestation. This prevents a malicious or
 *      buggy client from re-using a passing attestation with a different,
 *      half-broken bundle.
 *
 * Keep this module dependency-free — it runs inside Deno edge runtime.
 */

export type AttestationGateReason = {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
};

export type AttestationCapabilityReport = {
  capabilityId: string;
  capabilityName?: string;
  status: 'ready' | 'stub' | 'missing' | 'unknown' | string;
  critical?: boolean;
};

export type AttestationRowCountAssertion = {
  table: string;
  min: number;
  observed: number;
  reason: string;
};

export type AttestationVerticalReadiness = {
  systemId: string;
  requiredCapabilities: string[];
  minCanonicalPages: number;
  canonicalPageCount: number;
  minBoundIntents: number;
  boundIntentCount: number;
  rowCountAssertions: AttestationRowCountAssertion[];
};

export type PublishAttestation = {
  /** Schema version — bump when the contract layout changes. */
  version: 1;
  /** ISO timestamp when the client built this attestation. */
  evaluatedAt: string;
  /** Gate verdicts as evaluated by the client. */
  gates: {
    preview: { ok: boolean; reasons: AttestationGateReason[] };
    publish: { ok: boolean; reasons: AttestationGateReason[] };
  };
  /** Capability readiness snapshot (only critical ones are required). */
  capabilities: AttestationCapabilityReport[];
  /**
   * Sha-256 of the canonical "path\0sha1" list of files being published.
   * Computed by the client; verified by the server against the actual payload.
   */
  filesFingerprint: string;
  /** Number of files attested. */
  fileCount: number;
  /**
   * Track 6 — per-vertical readiness fixture results. When present, the
   * server enforces required capabilities, minimum canonical page count,
   * minimum bound intent count, and row count assertions before publish.
   */
  verticalReadiness?: AttestationVerticalReadiness;
};

export type AttestationVerification =
  | { ok: true; attestation: PublishAttestation }
  | { ok: false; code: string; message: string; details?: unknown };

const BUSINESS_CRITICAL_CAPABILITIES = new Set([
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

/**
 * Canonical fingerprint of a file map. MUST match the client implementation
 * in `src/services/publishAttestation.ts`.
 *
 * Algorithm:
 *   1. Normalize each path (strip leading slashes).
 *   2. Compute sha-1 of file content.
 *   3. Sort by path ascending.
 *   4. Join "<path>\0<sha1>" with "\n" and sha-256 the result.
 */
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

function isReasonArray(value: unknown): value is AttestationGateReason[] {
  return Array.isArray(value) && value.every(
    (r) => r && typeof r === 'object' && typeof (r as AttestationGateReason).code === 'string',
  );
}

function parseVerticalReadiness(raw: unknown): AttestationVerticalReadiness | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.systemId !== 'string') return null;
  if (!Array.isArray(v.requiredCapabilities)) return null;
  if (typeof v.minCanonicalPages !== 'number' || typeof v.canonicalPageCount !== 'number') return null;
  if (typeof v.minBoundIntents !== 'number' || typeof v.boundIntentCount !== 'number') return null;
  const rcaRaw = Array.isArray(v.rowCountAssertions) ? v.rowCountAssertions : [];
  const rowCountAssertions: AttestationRowCountAssertion[] = [];
  for (const item of rcaRaw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.table !== 'string' || typeof r.min !== 'number' || typeof r.observed !== 'number') continue;
    rowCountAssertions.push({
      table: r.table,
      min: r.min,
      observed: r.observed,
      reason: typeof r.reason === 'string' ? r.reason : '',
    });
  }
  return {
    systemId: v.systemId,
    requiredCapabilities: (v.requiredCapabilities as unknown[]).filter((x): x is string => typeof x === 'string'),
    minCanonicalPages: v.minCanonicalPages,
    canonicalPageCount: v.canonicalPageCount,
    minBoundIntents: v.minBoundIntents,
    boundIntentCount: v.boundIntentCount,
    rowCountAssertions,
  };
}

function parseAttestation(raw: unknown): PublishAttestation | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  if (a.version !== 1) return null;
  const gates = a.gates as Record<string, unknown> | undefined;
  if (!gates || typeof gates !== 'object') return null;
  const preview = gates.preview as { ok?: unknown; reasons?: unknown } | undefined;
  const publish = gates.publish as { ok?: unknown; reasons?: unknown } | undefined;
  if (!preview || !publish) return null;
  if (typeof preview.ok !== 'boolean' || typeof publish.ok !== 'boolean') return null;
  if (!isReasonArray(preview.reasons) || !isReasonArray(publish.reasons)) return null;
  if (typeof a.filesFingerprint !== 'string' || a.filesFingerprint.length < 16) return null;
  if (typeof a.fileCount !== 'number' || a.fileCount < 0) return null;
  if (!Array.isArray(a.capabilities)) return null;
  if (typeof a.evaluatedAt !== 'string') return null;
  const verticalReadiness = a.verticalReadiness !== undefined
    ? parseVerticalReadiness(a.verticalReadiness) ?? undefined
    : undefined;
  return {
    version: 1,
    evaluatedAt: a.evaluatedAt,
    gates: {
      preview: { ok: preview.ok, reasons: preview.reasons as AttestationGateReason[] },
      publish: { ok: publish.ok, reasons: publish.reasons as AttestationGateReason[] },
    },
    capabilities: a.capabilities as AttestationCapabilityReport[],
    filesFingerprint: a.filesFingerprint,
    fileCount: a.fileCount,
    verticalReadiness,
  };
}

/**
 * Verify an attestation against the actual files about to be published.
 * Returns ok=true only when every server-side check passes.
 */
export async function verifyPublishAttestation(
  rawAttestation: unknown,
  files: Record<string, string>,
): Promise<AttestationVerification> {
  const attestation = parseAttestation(rawAttestation);
  if (!attestation) {
    return {
      ok: false,
      code: 'attestation-malformed',
      message: 'Publish attestation is missing or malformed.',
    };
  }

  if (!attestation.gates.publish.ok) {
    return {
      ok: false,
      code: 'publish-gate-failed',
      message: 'Client PublishGate did not pass — refusing to publish.',
      details: attestation.gates.publish.reasons,
    };
  }

  if (!attestation.gates.preview.ok) {
    return {
      ok: false,
      code: 'preview-gate-failed',
      message: 'Client PreviewGate did not pass — refusing to publish.',
      details: attestation.gates.preview.reasons,
    };
  }

  // Defense-in-depth: re-check business-critical capabilities server-side.
  const criticalIssues: AttestationCapabilityReport[] = [];
  for (const cap of attestation.capabilities) {
    const isCritical = cap.critical === true || BUSINESS_CRITICAL_CAPABILITIES.has(cap.capabilityId);
    if (!isCritical) continue;
    if (cap.status === 'stub' || cap.status === 'missing') {
      criticalIssues.push(cap);
    }
  }
  if (criticalIssues.length > 0) {
    return {
      ok: false,
      code: 'critical-capability-not-ready',
      message: `Refusing to publish: ${criticalIssues.length} critical capability(ies) are stubbed or missing.`,
      details: criticalIssues,
    };
  }

  // Fingerprint check — the files being published must be the ones attested.
  const { fingerprint, fileCount } = await computeFilesFingerprint(files);
  if (fingerprint !== attestation.filesFingerprint) {
    return {
      ok: false,
      code: 'fingerprint-mismatch',
      message: 'Files in this request do not match the attested bundle fingerprint.',
      details: {
        expected: attestation.filesFingerprint,
        computed: fingerprint,
        expectedFileCount: attestation.fileCount,
        actualFileCount: fileCount,
      },
    };
  }

  return { ok: true, attestation };
}
