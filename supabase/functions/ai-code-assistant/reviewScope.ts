/**
 * Review Scope — enforces file-scoping for surgical/behavioral edits.
 * 
 * Ensures AI output only touches the resolved target file(s) and does not
 * silently regenerate the entire project.
 */

export interface ScopeCheckResult {
  /** Whether the patch stays within scope */
  inScope: boolean;
  /** Human-readable reason if out of scope */
  reason: string | null;
  /** Files that are outside the allowed scope */
  outOfScopeFiles: string[];
  /** Whether auto-apply should be blocked */
  blockAutoApply: boolean;
}

function normalizeVfsPath(p: string): string {
  return p.startsWith("/") ? p : `/${p}`;
}

export interface EditScopeInput {
  scopeType?: "element" | "block" | "section" | "page";
  componentPath?: string;
  editableRange?: { startLine?: number; endLine?: number };
  lockedBindings?: string[];
  riskLevel?: "low" | "medium" | "high";
}

/**
 * Check whether an AI-generated patch stays within the allowed scope
 * for a scoped edit (surgical, behavioral, single-file, etc.).
 */
export function checkEditScope(opts: {
  patchFiles: Record<string, string>;
  targetFile?: string | null;
  taskType: string;
  existingFiles?: string[];
  editScope?: EditScopeInput | null;
  originalFiles?: Record<string, string>;
}): ScopeCheckResult {
  const { patchFiles, taskType, existingFiles = [], editScope, originalFiles = {} } = opts;
  // editScope.componentPath overrides targetFile when present
  const targetFile = editScope?.componentPath || opts.targetFile;

  // Only enforce scope for scoped edit task types — or whenever an
  // explicit editScope was supplied by the floating preview toolbar.
  const SCOPED_TASKS = [
    "surgical_edit",
    "behavioral_edit",
    "single_file_edit",
  ];

  if (!editScope && !SCOPED_TASKS.includes(taskType)) {
    return { inScope: true, reason: null, outOfScopeFiles: [], blockAutoApply: false };
  }

  const patchPaths = Object.keys(patchFiles).map(normalizeVfsPath);

  // Rule 1: If we have a resolved target file, patch MUST include it
  if (targetFile) {
    const normTarget = normalizeVfsPath(targetFile);
    if (!patchPaths.includes(normTarget)) {
      return {
        inScope: false,
        reason: `Scoped edit resolved to ${normTarget} but AI did not update that file.`,
        outOfScopeFiles: patchPaths,
        blockAutoApply: true,
      };
    }
  }

  // Rule 2: Scoped edits should not touch more than 3 files
  const MAX_SCOPED_FILES = 3;
  if (patchPaths.length > MAX_SCOPED_FILES) {
    return {
      inScope: false,
      reason: `Scoped edit produced ${patchPaths.length} files (max ${MAX_SCOPED_FILES}) — likely a full regeneration.`,
      outOfScopeFiles: patchPaths.slice(MAX_SCOPED_FILES),
      blockAutoApply: true,
    };
  }

  // Rule 3: Scoped edits should not create brand-new files that don't already exist
  // (allowance: 1 new file for extracted components)
  const newFiles = patchPaths.filter(
    (p) => !existingFiles.map(normalizeVfsPath).includes(p)
  );
  if (newFiles.length > 1) {
    return {
      inScope: false,
      reason: `Scoped edit created ${newFiles.length} new files — expected at most 1.`,
      outOfScopeFiles: newFiles,
      blockAutoApply: true,
    };
  }

  // Rule 4: If target file exists, check that AI didn't replace it with a stub
  if (targetFile) {
    const normTarget = normalizeVfsPath(targetFile);
    const originalKey = Object.keys(patchFiles).find(
      (k) => normalizeVfsPath(k) === normTarget
    );
    if (originalKey) {
      const content = patchFiles[originalKey];
      if (content.length < 100) {
        return {
          inScope: false,
          reason: `Target file ${normTarget} reduced to ${content.length} chars — likely a stub.`,
          outOfScopeFiles: [],
          blockAutoApply: true,
        };
      }
    }
  }

  // ── editScope-specific enforcement (preview floating toolbar) ──────────
  if (editScope && targetFile) {
    const normTarget = normalizeVfsPath(targetFile);
    const newKey = Object.keys(patchFiles).find((k) => normalizeVfsPath(k) === normTarget);
    const origKey = Object.keys(originalFiles).find((k) => normalizeVfsPath(k) === normTarget);
    const newContent = newKey ? patchFiles[newKey] : null;
    const origContent = origKey ? originalFiles[origKey] : null;

    // Locked bindings must survive the edit
    if (newContent && origContent && editScope.lockedBindings?.length) {
      const missing = editScope.lockedBindings.filter((b) => {
        const needle = `data-ut-intent="${b}"`;
        return origContent.includes(needle) && !newContent.includes(needle);
      });
      if (missing.length) {
        return {
          inScope: false,
          reason: `Edit removed locked intent bindings: ${missing.join(", ")}`,
          outOfScopeFiles: [normTarget],
          blockAutoApply: true,
        };
      }
    }

    // editableRange: lines outside the range must be byte-identical
    const range = editScope.editableRange;
    if (newContent && origContent && range && typeof range.startLine === "number" && typeof range.endLine === "number") {
      const origLines = origContent.split("\n");
      const newLines = newContent.split("\n");
      const before = origLines.slice(0, Math.max(0, range.startLine - 1)).join("\n");
      const after = origLines.slice(range.endLine).join("\n");
      const newBefore = newLines.slice(0, Math.max(0, range.startLine - 1)).join("\n");
      // We can't pin the exact end-line in the new file (line count may shift),
      // but we can require the prefix above startLine to match exactly.
      if (before !== newBefore) {
        return {
          inScope: false,
          reason: `Edit modified lines above editableRange.startLine (${range.startLine}).`,
          outOfScopeFiles: [normTarget],
          blockAutoApply: true,
        };
      }
      // Best-effort suffix match: align tail by length of `after`
      const tailLen = after.length;
      const newTail = newContent.slice(newContent.length - tailLen);
      if (tailLen > 0 && newTail !== after) {
        return {
          inScope: false,
          reason: `Edit modified content below editableRange.endLine (${range.endLine}).`,
          outOfScopeFiles: [normTarget],
          blockAutoApply: true,
        };
      }
    }
  }

  return { inScope: true, reason: null, outOfScopeFiles: [], blockAutoApply: false };
}
