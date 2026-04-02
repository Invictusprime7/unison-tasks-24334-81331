/**
 * Apply State — operational state tracking for Lane B session memory.
 * 
 * Unlike session memory (which tracks context), apply state tracks
 * what the assistant DID and what happened after.
 * 
 * This is per-request ephemeral state, not persisted to DB.
 */

export type ApplyStatus = "proposed" | "applied" | "rejected" | "failed" | "partial";

export interface ApplyState {
  /** The type of action the AI performed */
  lastActionType?: "patch" | "create" | "debug" | "explain" | "suggest" | "restyle" | "multi_patch";
  /** Files the AI touched in its last response */
  lastTouchedFiles?: string[];
  /** Whether the patch was applied, rejected, or failed */
  lastApplyStatus?: ApplyStatus;
  /** Last preview error after applying */
  lastPreviewError?: string;
  /** Imports that broke after applying */
  lastBrokenImports?: string[];
  /** Human-readable summary of the last patch */
  lastPatchSummary?: string;
  /** Number of files in the last patch */
  lastPatchFileCount?: number;
  /** Whether the last patch required approval */
  lastRequiredApproval?: boolean;
  /** Warnings from the review pass */
  lastReviewWarnings?: string[];
}

/**
 * Build apply state from a completed review + response.
 */
export function buildApplyState(opts: {
  actionType?: string;
  touchedFiles?: string[];
  applyStatus: ApplyStatus;
  previewError?: string;
  brokenImports?: string[];
  patchSummary?: string;
  requiredApproval?: boolean;
  reviewWarnings?: string[];
}): ApplyState {
  return {
    lastActionType: opts.actionType as ApplyState["lastActionType"],
    lastTouchedFiles: opts.touchedFiles?.slice(0, 20),
    lastApplyStatus: opts.applyStatus,
    lastPreviewError: opts.previewError?.slice(0, 500),
    lastBrokenImports: opts.brokenImports?.slice(0, 10),
    lastPatchSummary: opts.patchSummary?.slice(0, 300),
    lastPatchFileCount: opts.touchedFiles?.length,
    lastRequiredApproval: opts.requiredApproval,
    lastReviewWarnings: opts.reviewWarnings?.slice(0, 5),
  };
}

/**
 * Format apply state into a compact prompt block for session memory injection.
 */
export function formatApplyStateBlock(state?: ApplyState): string {
  if (!state) return "";

  const lines: string[] = [];

  if (state.lastActionType) {
    lines.push(`Last action: ${state.lastActionType} (${state.lastApplyStatus || "unknown"})`);
  }
  if (state.lastPatchSummary) {
    lines.push(`Summary: ${state.lastPatchSummary}`);
  }
  if (state.lastTouchedFiles?.length) {
    lines.push(`Touched: ${state.lastTouchedFiles.join(", ")}`);
  }
  if (state.lastPreviewError) {
    lines.push(`⚠️ Post-apply error: ${state.lastPreviewError}`);
  }
  if (state.lastBrokenImports?.length) {
    lines.push(`🔴 Broken after apply: ${state.lastBrokenImports.join(", ")}`);
  }
  if (state.lastReviewWarnings?.length) {
    lines.push(`Review warnings: ${state.lastReviewWarnings.join(" | ")}`);
  }

  return lines.length ? `\n[APPLY STATE]\n${lines.join("\n")}\n` : "";
}
