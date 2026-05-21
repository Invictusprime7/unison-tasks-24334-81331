/**
 * Pipeline Guard — runtime enforcement of the commitToPipeline contract.
 *
 * In DEV: any direct call to executeCanonicalPipeline / recompileFromPlayground
 * that does not happen inside an active commit context will:
 *   - increment window.__unisonPipelineStats.bypasses
 *   - throw with a precise stack so the offender is obvious
 *
 * In PROD: silently increments the counter (CI lint is the hard wall).
 *
 * commitToPipeline brackets every dispatch with beginCommitContext /
 * endCommitContext so its own internal calls are always allowed.
 */

let depth = 0;

export function beginCommitContext(): void {
  depth += 1;
}

export function endCommitContext(): void {
  depth = Math.max(0, depth - 1);
}

export function isInsideCommitContext(): boolean {
  return depth > 0;
}

interface PipelineStats {
  commits: number;
  bypasses: number;
}

function getStats(): PipelineStats | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __unisonPipelineStats?: PipelineStats };
  if (!w.__unisonPipelineStats) {
    w.__unisonPipelineStats = { commits: 0, bypasses: 0 };
  }
  return w.__unisonPipelineStats;
}

/**
 * Called by raw pipeline entry points before they do any work.
 * Throws in DEV when invoked outside a commitToPipeline context.
 */
export function assertWithinCommit(entryPoint: string): void {
  if (depth > 0) return;
  const stats = getStats();
  if (stats) stats.bypasses += 1;

  const message =
    `[pipeline-guard] ${entryPoint} was called outside commitToPipeline(). ` +
    `Route this mutation through commitToPipeline(input, source) from '@/platform/core'. ` +
    `See PR4 (lint-pipeline-bypass).`;

  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

  if (isDev) {
    throw new Error(message);
  }
  // In prod we never crash the user — the CI lint should have blocked the merge.
  console.warn(message);
}
