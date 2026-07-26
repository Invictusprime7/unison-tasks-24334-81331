/**
 * builderEnvelopeRuns — Milestone 4 of the Builder Intelligence Pipeline.
 *
 * Every AI Builder turn persists its interpreted `BuilderRequestEnvelope` plus
 * the Milestone 3 verification verdict server-side (see the edge function
 * `ai-code-assistant/envelopeRunLog.ts`). This client module closes the loop:
 *
 *  - `recordRunOutcome`  — stamps the real apply outcome onto the run row.
 *  - `listBuilderRuns`   — draft-scoped history for learning / inspection.
 *  - `getBuilderRun`     — single run for replay.
 *  - `buildReplayEnvelope` — reconstructs the envelope for a replayed turn.
 *
 * Every call is best-effort and never throws: telemetry must not break the
 * builder.
 */

import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/types/builderIdentity';
import { normalizeEnvelope, type BuilderRequestEnvelope } from '@/types/builderRequestEnvelope';

export type BuilderRunOutcome =
  | 'proposed'
  | 'applied'
  | 'rejected'
  | 'discarded'
  | 'failed';

export interface BuilderEnvelopeRun {
  id: string;
  draftId: string | null;
  projectId: string | null;
  prompt: string | null;
  envelope: BuilderRequestEnvelope | null;
  envelopeSource: string | null;
  requestKinds: string[];
  domains: string[];
  confidence: number | null;
  verification: {
    checked: boolean;
    passed: boolean;
    summary: string;
    unmetCriteria: string[];
    outOfScopeFiles: string[];
    blockingMisses: string[];
  } | null;
  repairAttempted: boolean;
  repairAccepted: boolean;
  touchedFiles: string[];
  modelUsed: string | null;
  mode: string | null;
  outcome: BuilderRunOutcome;
  createdAt: string;
}

const db = supabase as unknown as {
  from: (t: string) => any;
};

/** Extract the run id the edge function returned for this turn (if any). */
export function envelopeRunIdFromResponse(data: unknown): string | null {
  const id = (data as { envelopeRunId?: unknown } | null)?.envelopeRunId;
  return isUuid(id) ? id : null;
}

/**
 * Stamp the real outcome of a proposed run. Called after the client applies,
 * rejects, or fails to apply the AI patch.
 */
export async function recordRunOutcome(
  runId: string | null | undefined,
  outcome: BuilderRunOutcome,
  detail?: {
    appliedPaths?: string[];
    error?: string;
    note?: string;
  },
): Promise<void> {
  if (!isUuid(runId)) return;
  try {
    const { error } = await db
      .from('builder_envelope_runs')
      .update({
        outcome,
        outcome_detail: detail
          ? {
              appliedPaths: (detail.appliedPaths ?? []).slice(0, 100),
              error: detail.error?.slice(0, 1_000) ?? null,
              note: detail.note?.slice(0, 500) ?? null,
              at: new Date().toISOString(),
            }
          : null,
      })
      .eq('id', runId);
    if (error) console.warn('[builderEnvelopeRuns] outcome update failed', error.message);
  } catch (e) {
    console.warn('[builderEnvelopeRuns] outcome update threw', e);
  }
}

function mapRow(row: Record<string, unknown>): BuilderEnvelopeRun {
  const v = (row.verification ?? null) as BuilderEnvelopeRun['verification'];
  return {
    id: String(row.id),
    draftId: (row.draft_id as string) ?? null,
    projectId: (row.project_id as string) ?? null,
    prompt: (row.prompt as string) ?? null,
    envelope: row.envelope && typeof row.envelope === 'object'
      ? normalizeEnvelope(row.envelope as Record<string, unknown>)
      : null,
    envelopeSource: (row.envelope_source as string) ?? null,
    requestKinds: Array.isArray(row.request_kinds) ? (row.request_kinds as string[]) : [],
    domains: Array.isArray(row.domains) ? (row.domains as string[]) : [],
    confidence: typeof row.confidence === 'number' ? row.confidence : null,
    verification: v,
    repairAttempted: Boolean(row.repair_attempted),
    repairAccepted: Boolean(row.repair_accepted),
    touchedFiles: Array.isArray(row.touched_files) ? (row.touched_files as string[]) : [],
    modelUsed: (row.model_used as string) ?? null,
    mode: (row.mode as string) ?? null,
    outcome: ((row.outcome as BuilderRunOutcome) ?? 'proposed'),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

/** Draft-scoped run history, newest first. */
export async function listBuilderRuns(
  draftId: string | null | undefined,
  limit = 30,
): Promise<BuilderEnvelopeRun[]> {
  if (!isUuid(draftId)) return [];
  try {
    const { data, error } = await db
      .from('builder_envelope_runs')
      .select('*')
      .eq('draft_id', draftId)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 200));
    if (error) {
      console.warn('[builderEnvelopeRuns] list failed', error.message);
      return [];
    }
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapRow);
  } catch (e) {
    console.warn('[builderEnvelopeRuns] list threw', e);
    return [];
  }
}

/** Single run — used for replay and for inspecting a past verdict. */
export async function getBuilderRun(runId: string | null | undefined): Promise<BuilderEnvelopeRun | null> {
  if (!isUuid(runId)) return null;
  try {
    const { data, error } = await db
      .from('builder_envelope_runs')
      .select('*')
      .eq('id', runId)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Rebuild a replay-ready envelope from a stored run. The replayed envelope is
 * marked `source: 'replay'` so downstream routing can tell it apart from a
 * fresh interpretation.
 */
export function buildReplayEnvelope(run: BuilderEnvelopeRun): BuilderRequestEnvelope | null {
  if (!run.envelope) return null;
  return normalizeEnvelope({ ...run.envelope, source: 'replay' } as Record<string, unknown>);
}

/**
 * Aggregate learning signal for a draft: how often the interpreter's envelope
 * actually produced an applied, verification-passing change.
 */
export function summarizeRuns(runs: BuilderEnvelopeRun[]): {
  total: number;
  applied: number;
  verified: number;
  repaired: number;
  weakDomains: string[];
} {
  const total = runs.length;
  const applied = runs.filter((r) => r.outcome === 'applied').length;
  const verified = runs.filter((r) => r.verification?.checked && r.verification.passed).length;
  const repaired = runs.filter((r) => r.repairAccepted).length;

  const failuresByDomain = new Map<string, number>();
  for (const run of runs) {
    if (run.verification?.checked && run.verification.passed) continue;
    for (const domain of run.domains) {
      failuresByDomain.set(domain, (failuresByDomain.get(domain) ?? 0) + 1);
    }
  }
  const weakDomains = [...failuresByDomain.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([d]) => d);

  return { total, applied, verified, repaired, weakDomains };
}
