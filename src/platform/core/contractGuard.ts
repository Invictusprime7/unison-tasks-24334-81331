/**
 * Contract Guard — silent-retry-then-surface enforcement for AI Builder patches.
 *
 * Pipeline shape:
 *   propose() → compile → validateDiff → { ok | retry-with-feedback | surface }
 *
 * Layers (Wizard, AI Builder, Playground) call `runWithContractGuard` instead
 * of applying a patch directly. The orchestrator:
 *
 *   1. Runs the proposer (AI completion, deterministic edit, etc.) to produce
 *      a candidate `after` contract.
 *   2. Diffs it against the `before` contract via `validateDiff`.
 *   3. On a violation, calls the proposer again with the violation report
 *      appended as feedback. Repeats up to `maxRetries` (default 2).
 *   4. If still failing, returns a structured rejection so the caller can
 *      surface "I tried X but it would break Y — here's an alternative."
 *
 * This is the only enforcement point for the Contracts > Schemas hierarchy
 * at AI patch time.
 */

import type { CompiledContract, ValidationIssue } from './contractCompiler';
import { isPreviewReady, getPublishBlockers } from './contractCompiler';

// ============================================================================
// validateDiff
// ============================================================================

export interface ContractDiffReport {
  /** No regressions vs the previous contract AND new contract is preview-ready. */
  ok: boolean;
  /** Issues introduced by the patch (errors + warnings escalated to errors). */
  introduced: ValidationIssue[];
  /** Capabilities removed by the patch (regression — never silent). */
  removedCapabilities: string[];
  /** Pages removed by the patch (structural regression). */
  removedPageIds: string[];
  /** Pre-existing issues that were resolved (informational). */
  resolved: ValidationIssue[];
  /** Publish blockers introduced by the patch. */
  newPublishBlockers: ReturnType<typeof getPublishBlockers>;
  /** Human-readable summary for AI feedback / UI surfacing. */
  summary: string;
}

/**
 * Compare two compiled contracts and report regressions introduced by the
 * later one. The Contract Compiler already produces `validation.issues`; this
 * function computes the *delta* and the structural regressions.
 */
export function validateDiff(
  before: CompiledContract | null,
  after: CompiledContract,
): ContractDiffReport {
  const beforeIssues = before?.validation.issues ?? [];
  const afterIssues = after.validation.issues;

  const beforeKey = (i: ValidationIssue) => `${i.code}:${i.message}`;
  const beforeSet = new Set(beforeIssues.map(beforeKey));
  const afterSet = new Set(afterIssues.map(beforeKey));

  const introduced = afterIssues.filter(i => !beforeSet.has(beforeKey(i)));
  const resolved = beforeIssues.filter(i => !afterSet.has(beforeKey(i)));

  const beforeCaps = new Set(before?.capabilities ?? []);
  const afterCaps = new Set(after.capabilities);
  const removedCapabilities: string[] = [];
  for (const c of beforeCaps) if (!afterCaps.has(c)) removedCapabilities.push(c);

  const beforePageIds = new Set((before?.pages ?? []).map(p => p.id));
  const afterPageIds = new Set(after.pages.map(p => p.id));
  const removedPageIds: string[] = [];
  for (const id of beforePageIds) if (!afterPageIds.has(id)) removedPageIds.push(id);

  const beforeBlockerCodes = new Set(
    (before ? getPublishBlockers(before) : []).map(b => `${b.code}:${b.message}`),
  );
  const newPublishBlockers = getPublishBlockers(after).filter(
    b => !beforeBlockerCodes.has(`${b.code}:${b.message}`),
  );

  const previewReady = isPreviewReady(after);
  const hardErrors = introduced.filter(i => i.severity === 'error');

  const ok =
    previewReady &&
    hardErrors.length === 0 &&
    removedCapabilities.length === 0 &&
    removedPageIds.length === 0;

  const parts: string[] = [];
  if (hardErrors.length) parts.push(`${hardErrors.length} new error(s)`);
  if (removedCapabilities.length)
    parts.push(`removed capabilities: ${removedCapabilities.join(', ')}`);
  if (removedPageIds.length)
    parts.push(`removed pages: ${removedPageIds.join(', ')}`);
  if (newPublishBlockers.length)
    parts.push(`${newPublishBlockers.length} new publish blocker(s)`);
  if (!previewReady) parts.push('preview gate failing');
  const summary = parts.length ? parts.join('; ') : 'no regressions';

  return {
    ok,
    introduced,
    removedCapabilities,
    removedPageIds,
    resolved,
    newPublishBlockers,
    summary,
  };
}

// ============================================================================
// runWithContractGuard — silent retry, then surface.
// ============================================================================

export interface ContractGuardFeedback {
  attempt: number;
  diff: ContractDiffReport;
  /** Pre-formatted message suitable for prepending to the next AI prompt. */
  promptAddendum: string;
}

export interface ContractProposerInput<TPatch> {
  /** First attempt = undefined. Subsequent attempts include prior rejection. */
  feedback?: ContractGuardFeedback;
  attempt: number;
}

export interface ContractProposerResult<TPatch> {
  patch: TPatch;
  /** The compiled contract that would result if `patch` is applied. */
  candidate: CompiledContract;
}

export type ContractProposer<TPatch> = (
  input: ContractProposerInput<TPatch>,
) => Promise<ContractProposerResult<TPatch>>;

export interface RunWithContractGuardOptions<TPatch> {
  /** The contract before the patch — null for first-build. */
  before: CompiledContract | null;
  /** Async function that produces a candidate patch + compiled contract. */
  propose: ContractProposer<TPatch>;
  /** Max silent retries before surfacing rejection. Defaults to 2. */
  maxRetries?: number;
  /** Optional hook called on every rejection (telemetry / Debug Agent). */
  onRejection?: (feedback: ContractGuardFeedback) => void;
}

export type ContractGuardOutcome<TPatch> =
  | {
      accepted: true;
      patch: TPatch;
      contract: CompiledContract;
      attempts: number;
      diff: ContractDiffReport;
    }
  | {
      accepted: false;
      reason: 'contract-violation';
      attempts: number;
      lastDiff: ContractDiffReport;
      /** All rejected attempts, in order, for UI surfacing. */
      rejections: ContractGuardFeedback[];
      /** Last candidate (rejected). Useful for "here's what I tried" UI. */
      lastCandidate: { patch: TPatch; contract: CompiledContract };
    };

/**
 * Run a proposer through the Contract Guard. Silent-retry-then-surface:
 *
 *   - First attempt accepted → return immediately.
 *   - Rejected → call proposer again with the violation as feedback.
 *   - After `maxRetries` rejections → surface a structured rejection.
 */
export async function runWithContractGuard<TPatch>(
  opts: RunWithContractGuardOptions<TPatch>,
): Promise<ContractGuardOutcome<TPatch>> {
  const { before, propose, onRejection } = opts;
  const maxRetries = opts.maxRetries ?? 2;

  const rejections: ContractGuardFeedback[] = [];
  let lastFeedback: ContractGuardFeedback | undefined;
  let lastCandidate: { patch: TPatch; contract: CompiledContract } | undefined;

  // Total attempts = first try + maxRetries retries.
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const { patch, candidate } = await propose({
      feedback: lastFeedback,
      attempt,
    });
    lastCandidate = { patch, contract: candidate };

    const diff = validateDiff(before, candidate);
    if (diff.ok) {
      return {
        accepted: true,
        patch,
        contract: candidate,
        attempts: attempt,
        diff,
      };
    }

    const feedback: ContractGuardFeedback = {
      attempt,
      diff,
      promptAddendum: formatPromptAddendum(diff, attempt),
    };
    rejections.push(feedback);
    lastFeedback = feedback;
    onRejection?.(feedback);
  }

  return {
    accepted: false,
    reason: 'contract-violation',
    attempts: rejections.length,
    lastDiff: rejections[rejections.length - 1].diff,
    rejections,
    lastCandidate: lastCandidate!,
  };
}

// ============================================================================
// Prompt formatting (AI feedback)
// ============================================================================

function formatPromptAddendum(diff: ContractDiffReport, attempt: number): string {
  const lines: string[] = [];
  lines.push(
    `Your previous attempt (#${attempt}) was rejected by the Contract Guard: ${diff.summary}.`,
  );
  if (diff.introduced.length) {
    lines.push('New issues introduced:');
    for (const i of diff.introduced.slice(0, 8)) {
      lines.push(`  - [${i.severity}/${i.code}] ${i.message}`);
    }
  }
  if (diff.removedCapabilities.length) {
    lines.push(
      `Do NOT remove these capabilities: ${diff.removedCapabilities.join(', ')}.`,
    );
  }
  if (diff.removedPageIds.length) {
    lines.push(
      `Do NOT remove these pages: ${diff.removedPageIds.join(', ')}.`,
    );
  }
  if (diff.newPublishBlockers.length) {
    lines.push('Patch must not introduce publish blockers:');
    for (const b of diff.newPublishBlockers.slice(0, 5)) {
      lines.push(`  - [${b.code}] ${b.message}`);
    }
  }
  lines.push('Produce a revised patch that preserves the existing contract.');
  return lines.join('\n');
}
