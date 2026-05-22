/**
 * VFSCommitService — Phase A7 (final seam) of the builder refactor.
 *
 * Headless façade over `commitToPipeline` — the single legal mutation
 * entry for the platform. This is the seam Phase B plugs into: every
 * structural commit (wizard launch, AI builder patch, playground edit,
 * republish, system restore) flows through one controller so the live
 * surface and any future scratch surface share the exact same write path.
 *
 * Phase A is pure extraction — no new logic. Consumers subscribe via
 * `useSyncExternalStore(controller.subscribe, controller.getState)`
 * inline (no custom hook files, per project rules).
 */

import {
  commitToPipeline,
  type CommitInput,
  type CommitResult,
  type CommitSource,
} from '@/platform/core';

export type { CommitInput, CommitResult, CommitSource };

export interface VFSCommitState {
  /** True while a commit is in flight. */
  isCommitting: boolean;
  /** Source of the most recent commit (null until first commit). */
  lastSource: CommitSource | null;
  /** Timestamp (ms) of the most recent commit. */
  lastCommittedAt: number | null;
  /** Last successful commit result (kept for diagnostics). */
  lastResult: CommitResult | null;
  /** Last commit error, if any. */
  lastError: Error | null;
  /** Paths written by the most recent low-level writeFiles call. */
  lastWriteFiles: string[];
  /** Timestamp (ms) of the most recent writeFiles call. */
  lastWriteAt: number | null;
}

type Listener = (state: VFSCommitState) => void;

const initialState: VFSCommitState = {
  isCommitting: false,
  lastSource: null,
  lastCommittedAt: null,
  lastResult: null,
  lastError: null,
  lastWriteFiles: [],
  lastWriteAt: null,
};

/** Low-level writer signature — matches `virtualFS.importFiles`. */
export type VFSWriter = (files: Record<string, string>) => void;

export interface WriteFilesOutcome {
  ok: boolean;
  filesWritten: string[];
  error?: string;
}

export interface VFSCommitServiceOptions {
  label?: string;
  /** Override commit fn (used by tests). */
  commitFn?: typeof commitToPipeline;
}

export class VFSCommitService {
  readonly label: string;
  private commitFn: typeof commitToPipeline;
  private state: VFSCommitState = initialState;
  private listeners = new Set<Listener>();

  constructor(opts: VFSCommitServiceOptions = {}) {
    this.label = opts.label ?? 'vfs-commit';
    this.commitFn = opts.commitFn ?? commitToPipeline;
  }

  // -------------------------------------------------------------- read I/O

  getState(): VFSCommitState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<VFSCommitState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }

  // -------------------------------------------------------------- commit

  /**
   * Run a commit through the canonical pipeline. Updates the controller
   * state slice (isCommitting / lastSource / lastResult / lastError)
   * and re-throws on failure so callers can show their own UI.
   */
  async commit(input: CommitInput, source: CommitSource): Promise<CommitResult> {
    this.set({ isCommitting: true, lastError: null });
    try {
      const result = await this.commitFn(input, source);
      this.set({
        isCommitting: false,
        lastSource: source,
        lastCommittedAt: Date.now(),
        lastResult: result,
        lastError: null,
      });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.set({ isCommitting: false, lastError: error });
      throw error;
    }
  }

  /** Clear cached result/error (e.g. when switching projects). */
  reset() {
    this.set({ ...initialState });
  }

  // --------------------------------------------------------- writeFiles (low-level)

  /**
   * Low-level write seam. Wraps a writer fn (typically `virtualFS.importFiles`)
   * so every direct VFS write is observable by the controller — without
   * forcing callers through the heavier `commitToPipeline` path.
   *
   * Use for AI patch apply, router writes, snapshot restore, and any other
   * site that previously called `virtualFS.importFiles` inline. Updates
   * `lastWriteFiles` / `lastWriteAt` / `lastSource` but does NOT touch
   * `lastResult` (that remains owned by `commit()`).
   */
  writeFiles(
    files: Record<string, string>,
    source: CommitSource,
    writer: VFSWriter,
  ): WriteFilesOutcome {
    const paths = Object.keys(files);
    if (paths.length === 0) {
      return { ok: true, filesWritten: [] };
    }
    try {
      writer(files);
      this.set({
        lastSource: source,
        lastWriteFiles: paths,
        lastWriteAt: Date.now(),
        lastError: null,
      });
      return { ok: true, filesWritten: paths };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.set({ lastError: error });
      return { ok: false, filesWritten: [], error: error.message };
    }
  }
}

/** Shared singleton for the live builder surface. */
export const liveVFSCommit = new VFSCommitService({ label: 'vfs-commit:live' });
