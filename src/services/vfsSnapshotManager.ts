/**
 * VFS Snapshot Manager — File-level undo/redo and AI edit diff preview
 * 
 * Provides:
 * - Snapshot creation before AI edits (automatic or manual)
 * - File-level diff computation between snapshots
 * - Undo/redo stack with configurable depth
 * - Snapshot metadata (label, source, timestamp)
 * - Diff summary for UI display
 */

// ============================================================================
// Types
// ============================================================================

export interface VFSSnapshot {
  id: string;
  label: string;
  files: Record<string, string>;
  timestamp: number;
  source: 'manual' | 'ai' | 'import' | 'auto';
  metadata?: Record<string, unknown>;
}

export interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'unchanged';
  oldContent: string | null;
  newContent: string | null;
  addedLines: number;
  removedLines: number;
  /** Hunks for inline diff display */
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffSummary {
  totalFiles: number;
  added: number;
  modified: number;
  deleted: number;
  unchanged: number;
  totalAddedLines: number;
  totalRemovedLines: number;
  diffs: FileDiff[];
}

// ============================================================================
// Snapshot Manager
// ============================================================================

export class VFSSnapshotManager {
  private undoStack: VFSSnapshot[] = [];
  private redoStack: VFSSnapshot[] = [];
  private maxSnapshots: number;
  private idCounter = 0;

  constructor(maxSnapshots = 50) {
    this.maxSnapshots = maxSnapshots;
  }

  // --- Snapshot Operations ---

  /** Create a snapshot of the current VFS state */
  createSnapshot(
    files: Record<string, string>,
    label: string,
    source: VFSSnapshot['source'] = 'manual',
    metadata?: Record<string, unknown>
  ): VFSSnapshot {
    const snapshot: VFSSnapshot = {
      id: `snap_${++this.idCounter}_${Date.now()}`,
      label,
      files: { ...files },
      timestamp: Date.now(),
      source,
      metadata,
    };

    this.undoStack.push(snapshot);
    // Clear redo stack when new snapshot is created
    this.redoStack = [];

    // Trim if over max
    if (this.undoStack.length > this.maxSnapshots) {
      this.undoStack = this.undoStack.slice(-this.maxSnapshots);
    }

    return snapshot;
  }

  /** Get the current (latest) snapshot */
  getCurrentSnapshot(): VFSSnapshot | null {
    return this.undoStack[this.undoStack.length - 1] || null;
  }

  /** Pop the last snapshot for undo */
  undo(): VFSSnapshot | null {
    const current = this.undoStack.pop();
    if (!current) return null;
    this.redoStack.push(current);
    return this.undoStack[this.undoStack.length - 1] || null;
  }

  /** Push a snapshot back for redo */
  redo(): VFSSnapshot | null {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return null;
    this.undoStack.push(snapshot);
    return snapshot;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1; // Need at least 2 to undo
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoCount(): number {
    return Math.max(0, this.undoStack.length - 1);
  }

  get redoCount(): number {
    return this.redoStack.length;
  }

  /** List all snapshots (newest first) */
  listSnapshots(): VFSSnapshot[] {
    return [...this.undoStack].reverse();
  }

  /** Get a specific snapshot by ID */
  getSnapshot(id: string): VFSSnapshot | null {
    return this.undoStack.find(s => s.id === id) || 
           this.redoStack.find(s => s.id === id) || 
           null;
  }

  /** Clear all snapshots */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  // --- Diff Operations ---

  /** Compute diff between two file maps */
  static computeDiff(
    oldFiles: Record<string, string>,
    newFiles: Record<string, string>
  ): DiffSummary {
    const allPaths = new Set([...Object.keys(oldFiles), ...Object.keys(newFiles)]);
    const diffs: FileDiff[] = [];
    let added = 0, modified = 0, deleted = 0, unchanged = 0;
    let totalAddedLines = 0, totalRemovedLines = 0;

    for (const path of allPaths) {
      const oldContent = oldFiles[path] ?? null;
      const newContent = newFiles[path] ?? null;

      if (oldContent === null && newContent !== null) {
        // Added
        const addedLines = newContent.split('\n').length;
        diffs.push({
          path,
          status: 'added',
          oldContent: null,
          newContent,
          addedLines,
          removedLines: 0,
          hunks: [{
            oldStart: 0, oldLines: 0,
            newStart: 1, newLines: addedLines,
            lines: newContent.split('\n').map((line, i) => ({
              type: 'add' as const,
              content: line,
              newLineNumber: i + 1,
            })),
          }],
        });
        added++;
        totalAddedLines += addedLines;
      } else if (oldContent !== null && newContent === null) {
        // Deleted
        const removedLines = oldContent.split('\n').length;
        diffs.push({
          path,
          status: 'deleted',
          oldContent,
          newContent: null,
          addedLines: 0,
          removedLines,
          hunks: [{
            oldStart: 1, oldLines: removedLines,
            newStart: 0, newLines: 0,
            lines: oldContent.split('\n').map((line, i) => ({
              type: 'remove' as const,
              content: line,
              oldLineNumber: i + 1,
            })),
          }],
        });
        deleted++;
        totalRemovedLines += removedLines;
      } else if (oldContent !== newContent) {
        // Modified
        const hunks = computeLineHunks(oldContent!, newContent!);
        const addedLines = hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'add').length, 0);
        const removedLines = hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'remove').length, 0);
        diffs.push({
          path,
          status: 'modified',
          oldContent,
          newContent,
          addedLines,
          removedLines,
          hunks,
        });
        modified++;
        totalAddedLines += addedLines;
        totalRemovedLines += removedLines;
      } else {
        unchanged++;
      }
    }

    // Sort: modified first, then added, then deleted
    diffs.sort((a, b) => {
      const order = { modified: 0, added: 1, deleted: 2, unchanged: 3 };
      return order[a.status] - order[b.status];
    });

    return {
      totalFiles: allPaths.size,
      added,
      modified,
      deleted,
      unchanged,
      totalAddedLines,
      totalRemovedLines,
      diffs,
    };
  }

  /** Compute diff between current state and a specific snapshot */
  diffFromSnapshot(
    snapshotId: string,
    currentFiles: Record<string, string>
  ): DiffSummary | null {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) return null;
    return VFSSnapshotManager.computeDiff(snapshot.files, currentFiles);
  }

  /** Compute diff between current and previous snapshot */
  diffFromPrevious(currentFiles: Record<string, string>): DiffSummary | null {
    const prev = this.undoStack.length >= 2
      ? this.undoStack[this.undoStack.length - 2]
      : null;
    if (!prev) return null;
    return VFSSnapshotManager.computeDiff(prev.files, currentFiles);
  }
}

// ============================================================================
// Line-Level Diff (Myers-like simplified)
// ============================================================================

function computeLineHunks(oldText: string, newText: string): DiffHunk[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Simple LCS-based diff
  const { lcs, oldIndices, newIndices } = computeLCS(oldLines, newLines);

  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  const CONTEXT_LINES = 3;

  function ensureHunk(oldStart: number, newStart: number): DiffHunk {
    if (!currentHunk) {
      currentHunk = {
        oldStart: Math.max(1, oldStart - CONTEXT_LINES),
        oldLines: 0,
        newStart: Math.max(1, newStart - CONTEXT_LINES),
        newLines: 0,
        lines: [],
      };
      hunks.push(currentHunk);
    }
    return currentHunk;
  }

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx === oldIndices[lcsIdx] && newIdx === newIndices[lcsIdx]) {
      // Context line (matching)
      if (currentHunk) {
        currentHunk.lines.push({
          type: 'context',
          content: oldLines[oldIdx],
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
        });
        currentHunk.oldLines++;
        currentHunk.newLines++;
      }
      oldIdx++;
      newIdx++;
      lcsIdx++;
    } else {
      // Removed lines from old
      while (oldIdx < oldLines.length && (lcsIdx >= lcs.length || oldIdx < oldIndices[lcsIdx])) {
        const hunk = ensureHunk(oldIdx + 1, newIdx + 1);
        hunk.lines.push({
          type: 'remove',
          content: oldLines[oldIdx],
          oldLineNumber: oldIdx + 1,
        });
        hunk.oldLines++;
        oldIdx++;
      }
      // Added lines to new
      while (newIdx < newLines.length && (lcsIdx >= lcs.length || newIdx < newIndices[lcsIdx])) {
        const hunk = ensureHunk(oldIdx + 1, newIdx + 1);
        hunk.lines.push({
          type: 'add',
          content: newLines[newIdx],
          newLineNumber: newIdx + 1,
        });
        hunk.newLines++;
        newIdx++;
      }

      // Close hunk if we're back on a match
      if (lcsIdx < lcs.length && oldIdx === oldIndices[lcsIdx]) {
        currentHunk = null;
      }
    }
  }

  return hunks;
}

function computeLCS(a: string[], b: string[]): { lcs: string[]; oldIndices: number[]; newIndices: number[] } {
  const m = a.length;
  const n = b.length;

  // For large files, use a simplified approach
  if (m * n > 1_000_000) {
    return simplifiedLCS(a, b);
  }

  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack
  const lcs: string[] = [];
  const oldIndices: number[] = [];
  const newIndices: number[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      oldIndices.unshift(i - 1);
      newIndices.unshift(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return { lcs, oldIndices, newIndices };
}

function simplifiedLCS(a: string[], b: string[]): { lcs: string[]; oldIndices: number[]; newIndices: number[] } {
  // Hash-based matching for large files
  const bMap = new Map<string, number[]>();
  for (let j = 0; j < b.length; j++) {
    const line = b[j];
    if (!bMap.has(line)) bMap.set(line, []);
    bMap.get(line)!.push(j);
  }

  const lcs: string[] = [];
  const oldIndices: number[] = [];
  const newIndices: number[] = [];
  let lastJ = -1;

  for (let i = 0; i < a.length; i++) {
    const candidates = bMap.get(a[i]);
    if (!candidates) continue;
    const nextJ = candidates.find(j => j > lastJ);
    if (nextJ !== undefined) {
      lcs.push(a[i]);
      oldIndices.push(i);
      newIndices.push(nextJ);
      lastJ = nextJ;
    }
  }

  return { lcs, oldIndices, newIndices };
}

// ============================================================================
// Singleton
// ============================================================================

export const vfsSnapshotManager = new VFSSnapshotManager();
