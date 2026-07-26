// supabase/functions/ai-code-assistant/envelopeRunLog.ts
//
// Milestone 4 — durable learning/replay log.
//
// Every builder turn that carried a BuilderRequestEnvelope persists the
// envelope together with the Milestone 3 verification verdict, scoped to the
// builder draft it belongs to. The row id is returned to the client so it can
// close the loop with the real apply outcome (applied / rejected / discarded).
//
// Persistence is strictly best-effort: a logging failure must never break a
// generation turn.

import { createClient } from "@supabase/supabase-js";

export interface EnvelopeRunContext {
  draftId?: string | null;
  projectId?: string | null;
  businessId?: string | null;
  prompt?: string | null;
}

export interface EnvelopeRunVerification {
  checked: boolean;
  passed: boolean;
  summary: string;
  unmetCriteria: string[];
  outOfScopeFiles: string[];
  blockingMisses: string[];
}

export interface RecordEnvelopeRunInput {
  userId?: string | null;
  runContext?: EnvelopeRunContext | null;
  envelope?: Record<string, unknown> | null;
  verification: EnvelopeRunVerification;
  repairAttempted: boolean;
  repairAccepted: boolean;
  touchedFiles: string[];
  modelUsed?: string | null;
  providerUsed?: string | null;
  mode?: string | null;
}

const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const strings = (v: unknown, max = 24): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : [];

/**
 * Insert one run record. Returns the row id, or null when logging was skipped
 * (no envelope, no identity) or failed.
 */
export async function recordEnvelopeRun(input: RecordEnvelopeRunInput): Promise<string | null> {
  try {
    const env = input.envelope;
    if (!env || typeof env !== "object") return null;
    if (!isUuid(input.userId)) return null;

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return null;

    const ctx = input.runContext ?? {};
    const supabase = createClient(url, key);

    const row = {
      user_id: input.userId,
      draft_id: isUuid(ctx.draftId) ? ctx.draftId : null,
      project_id: isUuid(ctx.projectId) ? ctx.projectId : null,
      business_id: isUuid(ctx.businessId) ? ctx.businessId : null,
      prompt: typeof ctx.prompt === "string" ? ctx.prompt.slice(0, 8_000) : null,
      envelope: env,
      envelope_source: typeof (env as { source?: unknown }).source === "string"
        ? (env as { source: string }).source
        : null,
      request_kinds: strings((env as { requestKinds?: unknown }).requestKinds),
      domains: strings((env as { domains?: unknown }).domains),
      confidence: typeof (env as { confidence?: unknown }).confidence === "number"
        ? (env as { confidence: number }).confidence
        : null,
      verification: {
        checked: input.verification.checked,
        passed: input.verification.passed,
        summary: input.verification.summary,
        unmetCriteria: input.verification.unmetCriteria.slice(0, 40),
        outOfScopeFiles: input.verification.outOfScopeFiles.slice(0, 40),
        blockingMisses: input.verification.blockingMisses.slice(0, 40),
      },
      verification_checked: input.verification.checked,
      verification_passed: input.verification.checked ? input.verification.passed : null,
      unmet_count: input.verification.unmetCriteria.length,
      out_of_scope_count: input.verification.outOfScopeFiles.length,
      blocking_count: input.verification.blockingMisses.length,
      repair_attempted: input.repairAttempted,
      repair_accepted: input.repairAccepted,
      touched_files: input.touchedFiles.slice(0, 100),
      model_used: input.modelUsed ?? null,
      provider_used: input.providerUsed ?? null,
      mode: input.mode ?? null,
      outcome: "proposed",
    };

    const { data, error } = await supabase
      .from("builder_envelope_runs")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      console.warn("[envelopeRunLog] insert failed:", error.message);
      return null;
    }
    return (data as { id?: string } | null)?.id ?? null;
  } catch (e) {
    console.warn("[envelopeRunLog] unexpected failure:", e);
    return null;
  }
}
