/**
 * Phase B — Transactional PatchPlan types.
 *
 * These types describe an AI-proposed structural change to the VFS
 * BEFORE it is applied. A PatchPlan is validated (Zod), forked into a
 * scratch VFS, dry-compiled, and only then committed via
 * VFSCommitService. See `.lovable/plan.md` Phase B for the lifecycle.
 *
 * Pure-additive — no consumers wired in this commit. The existing
 * `FilePatch` in `@/services/workspacePatchEngine` is a separate,
 * apply-time shape and is intentionally left untouched.
 */

// ----------------------------------------------------------------- intents

export type PatchIntent =
  | 'modify_component'
  | 'add_page'
  | 'wire_button'
  | 'update_style'
  | 'repair_error';

export type PatchRiskLevel = 'low' | 'medium' | 'high';

// ----------------------------------------------------------------- hunks

/**
 * Unified-diff hunk, mirrored after the shape consumed by
 * workspacePatchEngine when it applies edits. Kept minimal so the
 * scratch validator can reason about them without pulling in the
 * full engine.
 */
export interface UnifiedHunk {
  /** 1-indexed line where the hunk starts in the original file. */
  oldStart: number;
  /** Number of lines from the original file the hunk replaces. */
  oldLines: number;
  /** 1-indexed line where the hunk starts in the new file. */
  newStart: number;
  /** Number of lines in the new-file version of the hunk. */
  newLines: number;
  /** Raw diff lines including leading ` `, `+`, `-` markers. */
  lines: string[];
}

// ----------------------------------------------------------------- file ops

export type PatchPlanFilePatch =
  | { kind: 'create'; path: string; content: string }
  | { kind: 'replace'; path: string; content: string }
  | { kind: 'edit'; path: string; hunks: UnifiedHunk[] }
  | { kind: 'delete'; path: string };

// ----------------------------------------------------------------- side effects

/**
 * Topology change requested by the plan. Validated by
 * PageTopologyController before the scratch VFS is committed.
 */
export interface RoutePatch {
  op: 'add' | 'remove' | 'rename';
  pageId?: string;
  path: string;
  title?: string;
  newPath?: string;
}

/**
 * Intent binding change requested by the plan. Validated by
 * IntentReadinessController before commit.
 */
export interface IntentBindingPatch {
  op: 'add' | 'remove' | 'update';
  intent: string;
  slot?: string;
  targetPageId?: string;
  payload?: Record<string, unknown>;
}

// ----------------------------------------------------------------- plan

export interface PatchPlan {
  intent: PatchIntent;
  /** Files the plan expects to touch — used for blast-radius checks. */
  targetFiles: string[];
  /** Exported symbols the plan expects to keep/produce. */
  expectedSymbols: string[];
  routeChanges?: RoutePatch[];
  bindingChanges?: IntentBindingPatch[];
  edits: PatchPlanFilePatch[];
  riskLevel: PatchRiskLevel;
  /** Human-readable rationale, surfaced in the diff UI. */
  rationale: string;
  /** Stable hash of the originating prompt for dedupe + telemetry. */
  promptHash: string;
}
