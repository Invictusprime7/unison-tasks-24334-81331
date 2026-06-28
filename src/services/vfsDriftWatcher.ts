/**
 * Move F #3 — VFS Drift Watcher
 *
 * Compares the hash of the currently-hydrated VFS against the
 * `vfs_hash` recorded on the latest `site_revisions` row. Used by the
 * WebBuilder hydration path and the Ledger status surface to flag
 * out-of-band edits (sessionStorage drift, hot-reload skew, manual
 * patches that bypassed `commitMutation`).
 */

import {
  hashVfsFiles,
  loadLatestRevisionForProject,
  type LoadedRevision,
} from '@/services/vfsCommitService';

export interface DriftReport {
  /** True when the hydrated VFS hash matches the latest ledger row. */
  inSync: boolean;
  /** SHA-256 of the in-memory VFS at evaluation time. */
  liveHash: string;
  /** Hash stored on the most recent committed revision (null if missing). */
  ledgerHash: string | null;
  /** The compared ledger revision (null when no revisions exist yet). */
  revision: LoadedRevision | null;
  /** 'no-ledger' | 'no-hash' | 'match' | 'drift'. */
  reason: 'no-ledger' | 'no-hash' | 'match' | 'drift';
}

export async function evaluateDrift(args: {
  projectId: string;
  vfsFiles: Record<string, string>;
}): Promise<DriftReport> {
  const [liveHash, revision] = await Promise.all([
    hashVfsFiles(args.vfsFiles),
    loadLatestRevisionForProject(args.projectId),
  ]);

  if (!revision) {
    return { inSync: true, liveHash, ledgerHash: null, revision: null, reason: 'no-ledger' };
  }
  if (!revision.vfsHash) {
    return { inSync: true, liveHash, ledgerHash: null, revision, reason: 'no-hash' };
  }
  const inSync = revision.vfsHash === liveHash;
  return {
    inSync,
    liveHash,
    ledgerHash: revision.vfsHash,
    revision,
    reason: inSync ? 'match' : 'drift',
  };
}
