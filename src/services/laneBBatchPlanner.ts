/**
 * laneBBatchPlanner — dynamic Wizard Lane B request splitting.
 *
 * Lane B has TWO independent ceilings per edge request:
 *
 *   1. Transport/body size — the gateway silently drops bodies above ~200KB
 *      (see builderPayloadBudget.ts). Every page we ask for in one turn adds
 *      both request context and response tokens.
 *   2. Wall-clock — the edge runtime kills the isolate well before a
 *      many-page generation finishes, and the browser sees a dropped socket.
 *
 * Rather than a hard-coded "2 pages per batch", the planner sizes each batch
 * from the ACTUAL page count and the ACTUAL measured payload size, so a small
 * 3-page site goes out as a single turn while a heavy 12-page site is split
 * into as many turns as the two ceilings require.
 */

import { BUILDER_BODY_BUDGET_BYTES } from '@/services/builderPayloadBudget';

/** Fixed per-request overhead (classify, research, provider handshake). */
export const LANE_B_FIXED_OVERHEAD_MS = 18_000;
/** Observed generation cost of one full production-quality page. */
export const LANE_B_MS_PER_PAGE = 34_000;
/** Wall-clock we allow a single Lane B turn to consume before splitting. */
export const LANE_B_WALL_CLOCK_BUDGET_MS = 110_000;
/** Response bytes a generated page is expected to contribute. */
export const LANE_B_RESPONSE_BYTES_PER_PAGE = 9_000;
/** Never exceed this many pages in one turn regardless of the estimates. */
export const LANE_B_MAX_PAGES_PER_BATCH = 4;

export interface LaneBBatchPlanInput {
  /** Page file paths to generate, in canonical order. */
  pages: string[];
  /** Serialized size of the shared (non-page) request context, in bytes. */
  basePayloadBytes: number;
  /** Optional overrides (tests / tuning). */
  bodyBudgetBytes?: number;
  wallClockBudgetMs?: number;
  fixedOverheadMs?: number;
  msPerPage?: number;
  responseBytesPerPage?: number;
  maxPagesPerBatch?: number;
}

export interface LaneBBatchPlan {
  batches: string[][];
  /** Pages allowed per batch after applying both ceilings. */
  pagesPerBatch: number;
  /** Which ceiling decided the split. */
  limitedBy: 'none' | 'wall-clock' | 'payload' | 'cap';
  estimatedMsPerBatch: number;
  estimatedBytesPerBatch: number;
}

/**
 * Compute the batch plan. Always returns at least one batch containing at
 * least one page (a single page is never split further).
 */
export function planLaneBBatches(input: LaneBBatchPlanInput): LaneBBatchPlan {
  const {
    pages,
    basePayloadBytes,
    bodyBudgetBytes = BUILDER_BODY_BUDGET_BYTES,
    wallClockBudgetMs = LANE_B_WALL_CLOCK_BUDGET_MS,
    fixedOverheadMs = LANE_B_FIXED_OVERHEAD_MS,
    msPerPage = LANE_B_MS_PER_PAGE,
    responseBytesPerPage = LANE_B_RESPONSE_BYTES_PER_PAGE,
    maxPagesPerBatch = LANE_B_MAX_PAGES_PER_BATCH,
  } = input;

  const targets = pages.filter((page) => typeof page === 'string' && page.trim().length > 0);
  if (targets.length === 0) {
    return { batches: [], pagesPerBatch: 0, limitedBy: 'none', estimatedMsPerBatch: 0, estimatedBytesPerBatch: 0 };
  }

  // Ceiling 1: wall-clock.
  const timeAllowance = Math.max(0, wallClockBudgetMs - fixedOverheadMs);
  const byTime = Math.max(1, Math.floor(timeAllowance / Math.max(1, msPerPage)));

  // Ceiling 2: transport body size. The shared context rides along on every
  // turn, so only the headroom above it can carry page work.
  const bodyHeadroom = Math.max(0, bodyBudgetBytes - basePayloadBytes);
  const byBytes = Math.max(1, Math.floor(bodyHeadroom / Math.max(1, responseBytesPerPage)));

  const pagesPerBatch = Math.max(1, Math.min(byTime, byBytes, maxPagesPerBatch, targets.length));

  let limitedBy: LaneBBatchPlan['limitedBy'] = 'none';
  if (pagesPerBatch < targets.length) {
    const winner = Math.min(byTime, byBytes, maxPagesPerBatch);
    limitedBy = winner === byBytes && byBytes <= byTime && byBytes <= maxPagesPerBatch
      ? 'payload'
      : winner === byTime && byTime <= maxPagesPerBatch
        ? 'wall-clock'
        : 'cap';
  }

  const batches: string[][] = [];
  for (let i = 0; i < targets.length; i += pagesPerBatch) {
    batches.push(targets.slice(i, i + pagesPerBatch));
  }

  return {
    batches,
    pagesPerBatch,
    limitedBy,
    estimatedMsPerBatch: fixedOverheadMs + pagesPerBatch * msPerPage,
    estimatedBytesPerBatch: basePayloadBytes + pagesPerBatch * responseBytesPerPage,
  };
}

/** Serialized byte size of an arbitrary request context object. */
export function measurePayloadBytes(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    return json ? new TextEncoder().encode(json).length : 0;
  } catch {
    return BUILDER_BODY_BUDGET_BYTES;
  }
}
