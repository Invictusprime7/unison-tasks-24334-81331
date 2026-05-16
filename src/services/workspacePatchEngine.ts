/**
 * WorkspacePatchEngine — Turn AI proposals into reviewable, safe patches
 * 
 * Responsibilities:
 * - Parse AI diff/file proposals into structured patches
 * - Validate patch targets exist in VFS
 * - Apply hunks safely with rollback support
 * - Generate unified diff for UI display
 */

// ============================================================================
// Types
// ============================================================================

export type PatchOperation = 'create' | 'update' | 'delete' | 'rename';

export interface FilePatch {
  id: string;
  path: string;
  operation: PatchOperation;
  /** Unified diff string for display */
  diff?: string;
  /** Full new content (for create/update) */
  newContent?: string;
  /** Previous content (for rollback) */
  oldContent?: string;
  /** For rename operations */
  oldPath?: string;
  /** Why this change is needed */
  justification?: string;
  /** Patch status in review flow */
  status: 'pending' | 'accepted' | 'rejected' | 'applied' | 'failed';
  /** Lines added/removed */
  linesAdded: number;
  linesRemoved: number;
}

export interface PatchSet {
  id: string;
  patches: FilePatch[];
  source: 'debug-agent' | 'edit-mode' | 'security-review';
  description: string;
  timestamp: number;
  /** Overall status */
  status: 'pending' | 'partial' | 'applied' | 'rejected';
}

export interface PatchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Diff Utilities
// ============================================================================

function computeUnifiedDiff(oldContent: string | null, newContent: string | null, path: string): string {
  if (!oldContent && newContent) {
    const lines = newContent.split('\n');
    return [
      `--- /dev/null`,
      `+++ b/${path}`,
      `@@ -0,0 +1,${lines.length} @@`,
      ...lines.map(l => `+${l}`),
    ].join('\n');
  }
  if (oldContent && !newContent) {
    const lines = oldContent.split('\n');
    return [
      `--- a/${path}`,
      `+++ /dev/null`,
      `@@ -1,${lines.length} +0,0 @@`,
      ...lines.map(l => `-${l}`),
    ].join('\n');
  }
  if (!oldContent || !newContent) return '';

  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Simple line-by-line diff (not optimal but good enough for review)
  const hunks: string[] = [`--- a/${path}`, `+++ b/${path}`];
  let i = 0, j = 0;
  const contextSize = 3;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      i++; j++;
      continue;
    }
    // Found a difference — create a hunk
    const hunkStart = Math.max(0, i - contextSize);
    let hunkOldEnd = i, hunkNewEnd = j;
    // Scan forward to find end of changed region
    while (hunkOldEnd < oldLines.length || hunkNewEnd < newLines.length) {
      if (hunkOldEnd < oldLines.length && hunkNewEnd < newLines.length && oldLines[hunkOldEnd] === newLines[hunkNewEnd]) {
        // Check if we have enough context to end the hunk
        let matchCount = 0;
        while (hunkOldEnd + matchCount < oldLines.length && hunkNewEnd + matchCount < newLines.length &&
               oldLines[hunkOldEnd + matchCount] === newLines[hunkNewEnd + matchCount] && matchCount < contextSize * 2) {
          matchCount++;
        }
        if (matchCount >= contextSize * 2) break;
        hunkOldEnd += matchCount;
        hunkNewEnd += matchCount;
      } else {
        if (hunkOldEnd < oldLines.length) hunkOldEnd++;
        if (hunkNewEnd < newLines.length) hunkNewEnd++;
      }
    }
    const hunkOldEndCtx = Math.min(oldLines.length, hunkOldEnd + contextSize);
    const hunkNewEndCtx = Math.min(newLines.length, hunkNewEnd + contextSize);

    hunks.push(`@@ -${hunkStart + 1},${hunkOldEndCtx - hunkStart} +${Math.max(0, j - contextSize) + 1},${hunkNewEndCtx - Math.max(0, j - contextSize)} @@`);
    // Context before
    for (let c = hunkStart; c < i; c++) hunks.push(` ${oldLines[c]}`);
    // Changes
    for (let c = i; c < hunkOldEnd; c++) hunks.push(`-${oldLines[c]}`);
    for (let c = j; c < hunkNewEnd; c++) hunks.push(`+${newLines[c]}`);
    // Context after
    for (let c = hunkOldEnd; c < hunkOldEndCtx; c++) hunks.push(` ${oldLines[c]}`);

    i = hunkOldEndCtx;
    j = hunkNewEndCtx;
  }

  return hunks.length > 2 ? hunks.join('\n') : '(no changes)';
}

function countChanges(oldContent: string | null, newContent: string | null): { added: number; removed: number } {
  if (!oldContent && newContent) return { added: newContent.split('\n').length, removed: 0 };
  if (oldContent && !newContent) return { added: 0, removed: oldContent.split('\n').length };
  if (!oldContent || !newContent) return { added: 0, removed: 0 };

  const oldSet = new Set(oldContent.split('\n'));
  const newLines = newContent.split('\n');
  const newSet = new Set(newLines);

  let added = 0, removed = 0;
  for (const l of newLines) if (!oldSet.has(l)) added++;
  for (const l of oldContent.split('\n')) if (!newSet.has(l)) removed++;
  return { added, removed };
}

// ============================================================================
// Engine
// ============================================================================

let patchCounter = 0;

class WorkspacePatchEngineService {
  private patchSets: Map<string, PatchSet> = new Map();
  private listeners: Set<(patchSets: PatchSet[]) => void> = new Set();

  /** Create a patch set from AI-proposed file changes */
  createPatchSet(
    files: Record<string, string | null>,
    currentFiles: Record<string, string>,
    source: PatchSet['source'],
    description: string,
    justifications?: Record<string, string>,
  ): PatchSet {
    const patches: FilePatch[] = [];

    for (const [path, newContent] of Object.entries(files)) {
      const oldContent = currentFiles[path] ?? null;
      const operation: PatchOperation = newContent === null ? 'delete' : oldContent === null ? 'create' : 'update';
      const { added, removed } = countChanges(oldContent, newContent);

      patches.push({
        id: `patch-${++patchCounter}`,
        path,
        operation,
        diff: computeUnifiedDiff(oldContent, newContent, path),
        newContent: newContent ?? undefined,
        oldContent: oldContent ?? undefined,
        justification: justifications?.[path],
        status: 'pending',
        linesAdded: added,
        linesRemoved: removed,
      });
    }

    const patchSet: PatchSet = {
      id: `patchset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      patches,
      source,
      description,
      timestamp: Date.now(),
      status: 'pending',
    };

    this.patchSets.set(patchSet.id, patchSet);
    this.notify();
    return patchSet;
  }

  /** Validate a patch set against current VFS state */
  validate(patchSetId: string, currentFiles: Record<string, string>): PatchValidationResult {
    const ps = this.patchSets.get(patchSetId);
    if (!ps) return { valid: false, errors: ['Patch set not found'], warnings: [] };

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const p of ps.patches) {
      if (p.operation === 'update' && !currentFiles[p.path]) {
        errors.push(`Cannot update non-existent file: ${p.path}`);
      }
      if (p.operation === 'delete' && !currentFiles[p.path]) {
        warnings.push(`File already missing: ${p.path}`);
      }
      if (p.operation === 'create' && currentFiles[p.path]) {
        warnings.push(`File already exists (will overwrite): ${p.path}`);
      }
      // Block edits to protected files
      const protectedPaths = ['/index.html', '/index.tsx'];
      if (protectedPaths.includes(p.path) && p.operation !== 'update') {
        errors.push(`Cannot ${p.operation} protected file: ${p.path}`);
      }
      // Block ALL edits to auto-generated Unison canonical files — they
      // are deterministically regenerated from CreatorData and any patch
      // is overwritten on the next preview compile anyway.
      if (isUnisonProtectedPath(p.path)) {
        errors.push(
          `Cannot ${p.operation} auto-generated file: ${p.path}. ` +
            `Edit the Creator Playground catalog instead.`,
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /** Accept a single patch */
  acceptPatch(patchSetId: string, patchId: string): void {
    const ps = this.patchSets.get(patchSetId);
    if (!ps) return;
    const patch = ps.patches.find(p => p.id === patchId);
    if (patch) patch.status = 'accepted';
    this.updatePatchSetStatus(ps);
    this.notify();
  }

  /** Reject a single patch */
  rejectPatch(patchSetId: string, patchId: string): void {
    const ps = this.patchSets.get(patchSetId);
    if (!ps) return;
    const patch = ps.patches.find(p => p.id === patchId);
    if (patch) patch.status = 'rejected';
    this.updatePatchSetStatus(ps);
    this.notify();
  }

  /** Accept all patches in a set */
  acceptAll(patchSetId: string): void {
    const ps = this.patchSets.get(patchSetId);
    if (!ps) return;
    for (const p of ps.patches) if (p.status === 'pending') p.status = 'accepted';
    this.updatePatchSetStatus(ps);
    this.notify();
  }

  /** Get accepted patches as a file map ready for VFS import */
  getAcceptedFiles(patchSetId: string): Record<string, string> | null {
    const ps = this.patchSets.get(patchSetId);
    if (!ps) return null;
    const files: Record<string, string> = {};
    for (const p of ps.patches) {
      if (p.status === 'accepted' && p.newContent !== undefined) {
        files[p.path] = p.newContent;
      }
    }
    return Object.keys(files).length > 0 ? files : null;
  }

  /** Mark patches as applied */
  markApplied(patchSetId: string): void {
    const ps = this.patchSets.get(patchSetId);
    if (!ps) return;
    for (const p of ps.patches) {
      if (p.status === 'accepted') p.status = 'applied';
    }
    ps.status = 'applied';
    this.notify();
  }

  /** Get all patch sets */
  getPatchSets(): PatchSet[] {
    return Array.from(this.patchSets.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /** Get a specific patch set */
  getPatchSet(id: string): PatchSet | undefined {
    return this.patchSets.get(id);
  }

  /** Clear all patch sets */
  clear(): void {
    this.patchSets.clear();
    this.notify();
  }

  subscribe(listener: (patchSets: PatchSet[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updatePatchSetStatus(ps: PatchSet): void {
    const statuses = ps.patches.map(p => p.status);
    if (statuses.every(s => s === 'rejected')) ps.status = 'rejected';
    else if (statuses.every(s => s === 'applied')) ps.status = 'applied';
    else if (statuses.some(s => s === 'accepted' || s === 'applied')) ps.status = 'partial';
    else ps.status = 'pending';
  }

  private notify(): void {
    const sets = this.getPatchSets();
    for (const l of this.listeners) {
      try { l(sets); } catch (e) { console.error('[PatchEngine]', e); }
    }
  }
}

export const workspacePatchEngine = new WorkspacePatchEngineService();
