/**
 * Phase 0B — Zero-bypass mutation instrumentation.
 *
 * Every canonical mutation outcome is recorded here from the single legal
 * writer (`VFSCommitService.finalize`). Every surface that adopts a canonical
 * VFS into working state records the adoption. A bypass is then provable, not
 * a matter of code review: an adoption whose file map was never accepted by
 * `commitMutation` has no matching accepted entry.
 *
 * The ledger is process-local and bounded. It powers tests, the builder
 * diagnostics surface, and CI certification — it never gates a mutation.
 */

import type { PatchSource } from '@/types/patchPlan';

export type MutationOutcome = 'committed' | 'rejected' | 'threw';

export interface MutationLedgerEntry {
  kind: 'commit' | 'adoption';
  source: PatchSource | string;
  outcome?: MutationOutcome;
  vfsHash: string | null;
  revisionId: string | null;
  draftId: string | null;
  dryRun: boolean;
  at: string;
  /** Set on adoptions that are hydration/import-only, never authoring. */
  exemptReason?: string;
}

export interface MutationLedgerReport {
  entries: MutationLedgerEntry[];
  countsBySource: Record<string, { committed: number; rejected: number; threw: number; adopted: number }>;
  /** Adoptions with no accepted commit for the same file-map hash. */
  bypasses: MutationLedgerEntry[];
}

const MAX_ENTRIES = 500;
const entries: MutationLedgerEntry[] = [];
const acceptedHashes = new Set<string>();

function push(entry: MutationLedgerEntry): void {
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
}

export function recordCommitOutcome(input: {
  source: PatchSource | string;
  outcome: MutationOutcome;
  vfsHash?: string | null;
  revisionId?: string | null;
  draftId?: string | null;
  dryRun?: boolean;
}): void {
  const vfsHash = input.vfsHash ?? null;
  if (input.outcome === 'committed' && vfsHash) acceptedHashes.add(vfsHash);
  push({
    kind: 'commit',
    source: input.source,
    outcome: input.outcome,
    vfsHash,
    revisionId: input.revisionId ?? null,
    draftId: input.draftId ?? null,
    dryRun: input.dryRun === true,
    at: new Date().toISOString(),
  });
}

/**
 * Record that a surface pushed a canonical file map into working VFS.
 * `exemptReason` marks hydration/import-only adoptions (revision reload, ZIP
 * import, rollback of a rejected edit) that legitimately have no new commit.
 */
export function recordCanonicalVfsAdoption(input: {
  source: PatchSource | string;
  vfsHash?: string | null;
  revisionId?: string | null;
  draftId?: string | null;
  exemptReason?: string;
}): void {
  push({
    kind: 'adoption',
    source: input.source,
    vfsHash: input.vfsHash ?? null,
    revisionId: input.revisionId ?? null,
    draftId: input.draftId ?? null,
    dryRun: false,
    at: new Date().toISOString(),
    exemptReason: input.exemptReason,
  });
}

export function getMutationLedger(): MutationLedgerReport {
  const countsBySource: MutationLedgerReport['countsBySource'] = {};
  const bypasses: MutationLedgerEntry[] = [];

  for (const entry of entries) {
    const bucket = (countsBySource[String(entry.source)] ??= {
      committed: 0,
      rejected: 0,
      threw: 0,
      adopted: 0,
    });
    if (entry.kind === 'adoption') {
      bucket.adopted += 1;
      if (!entry.exemptReason && (!entry.vfsHash || !acceptedHashes.has(entry.vfsHash))) {
        bypasses.push(entry);
      }
      continue;
    }
    if (entry.outcome) bucket[entry.outcome] += 1;
  }

  return { entries: [...entries], countsBySource, bypasses };
}

export function resetMutationLedger(): void {
  entries.length = 0;
  acceptedHashes.clear();
}
