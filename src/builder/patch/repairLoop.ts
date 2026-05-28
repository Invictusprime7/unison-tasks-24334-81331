/**
 * Repair Loop — Phase B4.
 *
 * Wraps `AIPatchTransactionService` with a bounded retry loop:
 *
 *   attempt 0 → original plan
 *   retry  1  → same model, prompt augmented with dry-run errors
 *   retry  2  → escalate to Gemini Pro
 *
 * Hard cap: 2 retries (3 total attempts). The loop never applies — it
 * only drives `propose → dryRun` until a `preview` phase is reached or
 * the cap is exhausted. The caller decides whether to `apply()` or
 * `discard()` the final state.
 *
 * Pure-additive: no live consumers wired. The `regenerateFn` seam is
 * what Phase B5/wiring step will bind to the real Lane B model call.
 */

import type {
  AIPatchTransactionService,
  AIPatchTransactionState,
  DryRunOutcome,
} from './AIPatchTransactionService';
import type { PatchPlan } from './types';

// ----------------------------------------------------------- model policy

/** Default model used for the original attempt + retry 1. */
export const DEFAULT_REPAIR_MODEL = 'google/gemini-2.5-flash';

/** Escalation model used for retry 2. */
export const ESCALATION_MODEL = 'google/gemini-2.5-pro';

/** Hard cap on retries (NOT counting the original attempt). */
export const MAX_REPAIR_RETRIES = 2;

export function modelForAttempt(attempt: number, baseModel = DEFAULT_REPAIR_MODEL): string {
  if (attempt >= 2) return ESCALATION_MODEL;
  return baseModel;
}

// ------------------------------------------------------------------ types

export interface RepairContext {
  /** Zero-indexed attempt number. 0 = original, 1 = first retry, etc. */
  attempt: number;
  /** Model the regenerator should target for this attempt. */
  model: string;
  /** Previous plan that failed dry-run (only present when attempt > 0). */
  previousPlan: PatchPlan | null;
  /** Dry-run errors that triggered this retry. */
  errors: string[];
}

/**
 * Regenerator seam — given a repair context, produce the next plan
 * payload (raw, unvalidated). The transaction service runs Zod
 * validation on the returned value. Returning `null` aborts the loop.
 */
export type RegenerateFn = (ctx: RepairContext) => Promise<unknown | null>;

export interface RepairLoopOptions {
  service: AIPatchTransactionService;
  regenerate: RegenerateFn;
  /** Override the base model for attempt 0/1. */
  baseModel?: string;
  /** Override the retry cap. Hard upper bound is MAX_REPAIR_RETRIES. */
  maxRetries?: number;
  /** Optional progress hook for telemetry / UI. */
  onAttempt?: (info: RepairAttemptInfo) => void;
}

export interface RepairAttemptInfo {
  attempt: number;
  model: string;
  phase: AIPatchTransactionState['phase'];
  dryRun: DryRunOutcome | null;
  validationErrors: string[];
}

export interface RepairLoopResult {
  /** Final phase reached by the service. */
  finalPhase: AIPatchTransactionState['phase'];
  /** True iff the loop exited in 'preview' (ready for apply). */
  ok: boolean;
  /** Total attempts performed (1 = original only, up to 1 + maxRetries). */
  attempts: number;
  /** Per-attempt log. */
  history: RepairAttemptInfo[];
  /** Last error list (validation + dry-run combined). */
  errors: string[];
}

// ------------------------------------------------------------------ loop

/**
 * Run the repair loop. Caller supplies the original plan payload; the
 * service validates + dry-runs it. On failure, `regenerate` is invoked
 * with the failure context to produce the next attempt.
 *
 * The loop NEVER calls `service.apply()` — that's a deliberate split
 * so the caller can show a diff UI before committing.
 */
export async function runRepairLoop(
  initialPlan: unknown,
  opts: RepairLoopOptions,
): Promise<RepairLoopResult> {
  const cap = Math.min(opts.maxRetries ?? MAX_REPAIR_RETRIES, MAX_REPAIR_RETRIES);
  const baseModel = opts.baseModel ?? DEFAULT_REPAIR_MODEL;
  const history: RepairAttemptInfo[] = [];

  let payload: unknown = initialPlan;
  let attempt = 0;
  let previousPlan: PatchPlan | null = null;

  while (true) {
    const model = modelForAttempt(attempt, baseModel);

    // 1. Propose (validates schema + intent scope).
    const proposed = opts.service.propose(payload);

    // 2. If validation rejected, treat it like a dry-run failure for retry purposes.
    if (proposed.phase === 'rejected') {
      const info: RepairAttemptInfo = {
        attempt,
        model,
        phase: 'rejected',
        dryRun: null,
        validationErrors: proposed.validationErrors,
      };
      history.push(info);
      opts.onAttempt?.(info);

      if (attempt >= cap) {
        return finalize(opts.service.getState(), history);
      }
      const next = await regenerateOrAbort(opts.regenerate, {
        attempt: attempt + 1,
        model: modelForAttempt(attempt + 1, baseModel),
        previousPlan,
        errors: proposed.validationErrors,
      });
      if (next === null) return finalize(opts.service.getState(), history);
      payload = next;
      attempt += 1;
      continue;
    }

    // 3. Dry-run the proposed plan.
    const outcome = await opts.service.dryRun();
    const state = opts.service.getState();
    previousPlan = state.plan;

    const info: RepairAttemptInfo = {
      attempt,
      model,
      phase: state.phase,
      dryRun: outcome,
      validationErrors: state.validationErrors,
    };
    history.push(info);
    opts.onAttempt?.(info);

    if (outcome.ok) {
      return finalize(state, history);
    }

    if (attempt >= cap) {
      return finalize(state, history);
    }

    // 4. Ask caller to regenerate for next attempt.
    const next = await regenerateOrAbort(opts.regenerate, {
      attempt: attempt + 1,
      model: modelForAttempt(attempt + 1, baseModel),
      previousPlan,
      errors: outcome.errors ?? [],
    });
    if (next === null) return finalize(state, history);
    payload = next;
    attempt += 1;
  }
}

// ------------------------------------------------------------ internals

async function regenerateOrAbort(
  regenerate: RegenerateFn,
  ctx: RepairContext,
): Promise<unknown | null> {
  try {
    return await regenerate(ctx);
  } catch {
    return null;
  }
}

function finalize(
  state: AIPatchTransactionState,
  history: RepairAttemptInfo[],
): RepairLoopResult {
  const last = history[history.length - 1];
  const errors = [
    ...(last?.validationErrors ?? []),
    ...(last?.dryRun?.errors ?? []),
  ];
  return {
    finalPhase: state.phase,
    ok: state.phase === 'preview',
    attempts: history.length,
    history,
    errors,
  };
}
