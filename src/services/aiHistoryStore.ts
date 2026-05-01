/**
 * aiHistoryStore — Persistent AI prompt + edit history per project.
 *
 * Responsibilities (frontend-only):
 *  1. Persist AI chat messages so a Preview/page refresh never loses prompt
 *     history or AI replies for the active project.
 *  2. Persist a small cascade of VFS edit snapshots so users can revert or
 *     re-apply prior AI edits from the WebBuilder toolbar.
 *
 * Storage strategy:
 *  - Primary: `localStorage` keyed by projectId — instant hydrate on mount.
 *  - Secondary (best-effort): `builder_drafts.metadata.aiHistory` via the
 *    Supabase client when authenticated, debounced. Local always wins on
 *    hydrate to avoid flicker; Supabase acts as cross-device backup.
 *
 * Keys:
 *  - localStorage: `unison.aiHistory.<projectId>` → { messages, snapshots }
 *  - For preview / unsaved drafts (no projectId), uses `__draft__`.
 */

import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Types — kept loose so the panel can store its richer Message shape verbatim
// ---------------------------------------------------------------------------

export interface PersistedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** ISO string — Date instances aren't JSON-safe */
  timestamp: string;
  thinking?: unknown;
  claudeReasoning?: string;
  code?: string;
  edits?: unknown;
  meta?: unknown;
  taskPlan?: unknown;
  // streaming flag intentionally dropped on persist
}

export type FileChangeKind = 'created' | 'modified' | 'deleted';

export interface FileChangeStat {
  path: string;
  kind: FileChangeKind;
  /** Lines added (after - common) */
  added: number;
  /** Lines removed (before - common) */
  removed: number;
  /** Total line count after the change (0 if deleted) */
  afterLines: number;
}

export interface EditSnapshotMeta {
  /** Original user prompt that triggered the edit */
  prompt?: string;
  /** AI model that produced the change (e.g. "google/gemini-2.5-flash") */
  model?: string;
  /** Short human summary written by AI (review summary, action type, etc.) */
  summary?: string;
  /** Action type reported by the gateway, e.g. 'surgical-edit' | 'multi-file' */
  actionType?: string;
  /** Origin sub-channel within source — e.g. 'multi-file', 'single-file', 'debug-fix' */
  origin?: string;
  /** Whether the gateway flagged this change for review */
  requiresApproval?: boolean;
  /** Warnings reported by the gateway / review pass */
  warnings?: Array<{ severity?: string; message?: string }>;
}

export interface EditSnapshot {
  id: string;
  /** Short label e.g. "AI: add hero CTA" or first 60 chars of the prompt */
  label: string;
  /** ISO string */
  timestamp: string;
  /** Source of the change */
  source: 'ai' | 'debug' | 'manual';
  /** VFS file map BEFORE the change (so we can revert) */
  before: Record<string, string>;
  /** VFS file map AFTER the change (so we can reapply) */
  after: Record<string, string>;
  /** Optional list of changed paths for compact UI display */
  changedPaths?: string[];
  /** Per-file diff stats for richer history UI */
  fileStats?: FileChangeStat[];
  /** Aggregate line additions/removals across all changed files */
  totals?: { added: number; removed: number; created: number; modified: number; deleted: number };
  /** Rich metadata from the AI invocation */
  meta?: EditSnapshotMeta;
}

export interface AIHistoryRecord {
  messages: PersistedMessage[];
  snapshots: EditSnapshot[];
  /** Schema version for forward-compat migrations */
  v: 1;
}

const EMPTY: AIHistoryRecord = { messages: [], snapshots: [], v: 1 };

const MAX_MESSAGES = 200;
const MAX_SNAPSHOTS = 25;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function lsKey(projectId: string | null | undefined): string {
  return `unison.aiHistory.${projectId || '__draft__'}`;
}

function safeParse(raw: string | null): AIHistoryRecord {
  if (!raw) return { ...EMPTY };
  try {
    const parsed = JSON.parse(raw) as Partial<AIHistoryRecord>;
    return {
      v: 1,
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_MESSAGES) : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots.slice(-MAX_SNAPSHOTS) : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function readLocal(projectId: string | null | undefined): AIHistoryRecord {
  if (typeof window === 'undefined') return { ...EMPTY };
  try {
    return safeParse(window.localStorage.getItem(lsKey(projectId)));
  } catch {
    return { ...EMPTY };
  }
}

function writeLocal(projectId: string | null | undefined, record: AIHistoryRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(lsKey(projectId), JSON.stringify(record));
  } catch (err) {
    // localStorage full — drop oldest snapshots until it fits
    try {
      const trimmed: AIHistoryRecord = {
        ...record,
        snapshots: record.snapshots.slice(-5),
        messages: record.messages.slice(-50),
      };
      window.localStorage.setItem(lsKey(projectId), JSON.stringify(trimmed));
    } catch {
      // give up silently
    }
  }
}

// ---------------------------------------------------------------------------
// Pub/sub
// ---------------------------------------------------------------------------

type Listener = (record: AIHistoryRecord) => void;
const listeners = new Map<string, Set<Listener>>();

function emit(projectId: string | null | undefined, record: AIHistoryRecord) {
  const set = listeners.get(lsKey(projectId));
  if (!set) return;
  for (const fn of set) {
    try { fn(record); } catch { /* ignore */ }
  }
}

export function subscribeAIHistory(
  projectId: string | null | undefined,
  fn: Listener,
): () => void {
  const key = lsKey(projectId);
  let set = listeners.get(key);
  if (!set) { set = new Set(); listeners.set(key, set); }
  set.add(fn);
  return () => { set!.delete(fn); };
}

// ---------------------------------------------------------------------------
// Supabase mirror (best-effort, debounced)
// ---------------------------------------------------------------------------

const remoteTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function mirrorToSupabase(projectId: string, record: AIHistoryRecord): Promise<void> {
  try {
    const { data: drafts, error: selErr } = await supabase
      .from('builder_drafts')
      .select('id, metadata')
      .eq('project_id', projectId)
      .limit(1);
    if (selErr || !drafts?.length) return;
    const row = drafts[0];
    const meta = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>;
    // Don't write the full file blobs to Supabase — keep them local-only to
    // avoid bloating the row. Persist messages + snapshot metadata.
    const trimmedSnapshots = record.snapshots.map((s) => ({
      id: s.id,
      label: s.label,
      timestamp: s.timestamp,
      source: s.source,
      changedPaths: s.changedPaths,
    }));
    const nextMeta = {
      ...meta,
      aiHistory: {
        v: 1,
        messages: record.messages.slice(-50),
        snapshots: trimmedSnapshots,
        updatedAt: new Date().toISOString(),
      },
    };
    await supabase
      .from('builder_drafts')
      // Cast through unknown — Supabase generated Json type is structurally
      // recursive and rejects our domain shapes even though they're JSON-safe.
      .update({ metadata: nextMeta as unknown as never })
      .eq('id', row.id);
  } catch {
    // best-effort only
  }
}

function scheduleRemoteMirror(projectId: string | null | undefined, record: AIHistoryRecord) {
  if (!projectId) return;
  const key = lsKey(projectId);
  const existing = remoteTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    remoteTimers.delete(key);
    void mirrorToSupabase(projectId, record);
  }, 1500);
  remoteTimers.set(key, timer);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function loadAIHistory(projectId: string | null | undefined): AIHistoryRecord {
  return readLocal(projectId);
}

export function setMessages(
  projectId: string | null | undefined,
  messages: PersistedMessage[],
): void {
  const current = readLocal(projectId);
  const next: AIHistoryRecord = {
    ...current,
    messages: messages.slice(-MAX_MESSAGES),
  };
  writeLocal(projectId, next);
  emit(projectId, next);
  scheduleRemoteMirror(projectId, next);
}

export function pushSnapshot(
  projectId: string | null | undefined,
  snapshot: Omit<EditSnapshot, 'id' | 'timestamp' | 'fileStats' | 'totals'> & {
    timestamp?: string;
    id?: string;
    fileStats?: FileChangeStat[];
    totals?: EditSnapshot['totals'];
  },
): EditSnapshot {
  const current = readLocal(projectId);
  const fileStats = snapshot.fileStats ?? computeFileStats(snapshot.before, snapshot.after);
  const totals = snapshot.totals ?? aggregateTotals(fileStats);
  const full: EditSnapshot = {
    id: snapshot.id || `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: snapshot.timestamp || new Date().toISOString(),
    label: snapshot.label,
    source: snapshot.source,
    before: snapshot.before,
    after: snapshot.after,
    changedPaths: snapshot.changedPaths ?? fileStats.map((f) => f.path),
    fileStats,
    totals,
    meta: snapshot.meta,
  };
  const next: AIHistoryRecord = {
    ...current,
    snapshots: [...current.snapshots, full].slice(-MAX_SNAPSHOTS),
  };
  writeLocal(projectId, next);
  emit(projectId, next);
  scheduleRemoteMirror(projectId, next);
  return full;
}

export function listSnapshots(projectId: string | null | undefined): EditSnapshot[] {
  return [...readLocal(projectId).snapshots].reverse(); // newest first
}

export function getSnapshot(
  projectId: string | null | undefined,
  id: string,
): EditSnapshot | null {
  return readLocal(projectId).snapshots.find((s) => s.id === id) || null;
}

export function clearAIHistory(projectId: string | null | undefined): void {
  writeLocal(projectId, { ...EMPTY });
  emit(projectId, { ...EMPTY });
  scheduleRemoteMirror(projectId, { ...EMPTY });
}

/** Compute the changed-paths list between two file maps (for snapshot UI). */
export function diffChangedPaths(
  before: Record<string, string>,
  after: Record<string, string>,
): string[] {
  const paths = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const p of paths) {
    if (before[p] !== after[p]) changed.push(p);
  }
  return changed.sort();
}

/**
 * Compute per-file change kind + line-level add/remove counts.
 * Uses a lightweight LCS-free heuristic: counts unique lines on each side
 * that don't appear in a Set of the other side. Good enough for UI stats
 * without pulling in a diff library.
 */
export function computeFileStats(
  before: Record<string, string>,
  after: Record<string, string>,
): FileChangeStat[] {
  const paths = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  const stats: FileChangeStat[] = [];
  for (const path of paths) {
    const a = before[path];
    const b = after[path];
    if (a === b) continue;
    let kind: FileChangeKind;
    if (a == null) kind = 'created';
    else if (b == null) kind = 'deleted';
    else kind = 'modified';
    const beforeLines = a ? a.split('\n') : [];
    const afterLines = b ? b.split('\n') : [];
    let added = 0;
    let removed = 0;
    if (kind === 'created') {
      added = afterLines.length;
    } else if (kind === 'deleted') {
      removed = beforeLines.length;
    } else {
      const beforeSet = new Set(beforeLines);
      const afterSet = new Set(afterLines);
      for (const line of afterLines) if (!beforeSet.has(line)) added++;
      for (const line of beforeLines) if (!afterSet.has(line)) removed++;
    }
    stats.push({ path, kind, added, removed, afterLines: afterLines.length });
  }
  return stats.sort((x, y) => x.path.localeCompare(y.path));
}

function aggregateTotals(stats: FileChangeStat[]): EditSnapshot['totals'] {
  const totals = { added: 0, removed: 0, created: 0, modified: 0, deleted: 0 };
  for (const s of stats) {
    totals.added += s.added;
    totals.removed += s.removed;
    totals[s.kind]++;
  }
  return totals;
}
