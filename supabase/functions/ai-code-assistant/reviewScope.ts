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

/**
 * Check whether an AI-generated patch stays within the allowed scope
 * for a scoped edit (surgical, behavioral, single-file, etc.).
 */
export function checkEditScope(opts: {
  patchFiles: Record<string, string>;
  targetFile?: string | null;
  taskType: string;
  existingFiles?: string[];
}): ScopeCheckResult {
  const { patchFiles, targetFile, taskType, existingFiles = [] } = opts;

  // Only enforce scope for scoped edit task types
  const SCOPED_TASKS = [
    "surgical_edit",
    "behavioral_edit",
    "single_file_edit",
  ];

  if (!SCOPED_TASKS.includes(taskType)) {
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

  return { inScope: true, reason: null, outOfScopeFiles: [], blockAutoApply: false };
}
