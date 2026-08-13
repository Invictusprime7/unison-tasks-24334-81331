/**
 * aiHistoryStore — Persistent AI prompt + edit history per BUILDER DRAFT.
 *
 * IMPORTANT (2026-06-22 hardening): conversations are scoped strictly to the
 * active `builder_drafts.id`, never to the abstract project id. Two drafts of
 * the same project must NEVER share AI conversation history.
 *
 * Storage strategy:
 *  - Primary: `localStorage` keyed by draft id — instant hydrate on mount.
 *  - Secondary (best-effort): `builder_drafts.metadata.aiHistory` via the
 *    Supabase client when authenticated, debounced and looked up by draft id.
 *
 * Keys:
 *  - localStorage: `unison.aiHistory.draft.<draftId>` → { messages, snapshots }
 *  - When no draft id is bound yet, the sentinel `__unscoped__` is used.
 *    Callers SHOULD treat unscoped history as ephemeral.
 *  - Legacy keys (`unison.aiHistory.<projectId>` / old `__draft__` sentinel)
 *    are ignored and purged on first read below, so prior cross-project
 *    bleed cannot reappear after this rollout.
 */

import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/types/builderIdentity';

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

function lsKey(draftId: string | null | undefined): string {
  return `unison.aiHistory.draft.${draftId || '__unscoped__'}`;
}

// One-time purge of legacy keys (project-id-scoped or old `__draft__`
// sentinel). Runs once per page load; prevents pre-2026-06-22 cross-draft
// bleed from re-hydrating into a new draft.
let legacyPurged = false;
function purgeLegacyKeysOnce(): void {
  if (legacyPurged || typeof window === 'undefined') return;
  legacyPurged = true;
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      // Legacy: `unison.aiHistory.<X>` where X is NOT prefixed by `draft.`
      if (k.startsWith('unison.aiHistory.') && !k.startsWith('unison.aiHistory.draft.')) {
        toDelete.push(k);
      }
    }
    for (const k of toDelete) window.localStorage.removeItem(k);
  } catch {
    /* best-effort */
  }
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

function readLocal(draftId: string | null | undefined): AIHistoryRecord {
  if (typeof window === 'undefined') return { ...EMPTY };
  purgeLegacyKeysOnce();
  try {
    return safeParse(window.localStorage.getItem(lsKey(draftId)));
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
// Public API
// ---------------------------------------------------------------------------

export function loadAIHistory(draftId: string | null | undefined): AIHistoryRecord {
  return readLocal(draftId);
}

/**
 * Hydrate local AI history from Supabase mirror for cross-device continuity.
 * Keyed strictly by builder_drafts.id — never by project_id.
 */
export async function hydrateAIHistoryFromSupabase(
  draftId: string | null | undefined,
): Promise<AIHistoryRecord> {
  const local = readLocal(draftId);
  if (!isUuid(draftId)) {
    return local;
  }

  try {
    const { data: row, error } = await supabase
      .from('builder_drafts')
      .select('metadata')
      .eq('id', draftId)
      .maybeSingle();

    if (error || !row) {
      return local;
    }

    const metadata = row?.metadata;
    const aiHistory =
      metadata && typeof metadata === 'object'
        ? (metadata as Record<string, unknown>).aiHistory
        : null;
    const remoteMessagesRaw =
      aiHistory && typeof aiHistory === 'object'
        ? (aiHistory as Record<string, unknown>).messages
        : null;

    if (!Array.isArray(remoteMessagesRaw)) {
      return local;
    }

    const remoteMessages = remoteMessagesRaw
      .filter((item): item is PersistedMessage => {
        if (!item || typeof item !== 'object') return false;
        const rec = item as Record<string, unknown>;
        return (
          typeof rec.id === 'string' &&
          (rec.role === 'user' || rec.role === 'assistant' || rec.role === 'system') &&
          typeof rec.content === 'string' &&
          typeof rec.timestamp === 'string'
        );
      })
      .slice(-MAX_MESSAGES);

    const mergedById = new Map<string, PersistedMessage>();
    for (const msg of local.messages) mergedById.set(msg.id, msg);
    for (const msg of remoteMessages) {
      const existing = mergedById.get(msg.id);
      if (!existing) {
        mergedById.set(msg.id, msg);
        continue;
      }

      const existingTs = Date.parse(existing.timestamp || '') || 0;
      const nextTs = Date.parse(msg.timestamp || '') || 0;
      if (nextTs > existingTs) {
        mergedById.set(msg.id, msg);
      }
    }

    const mergedMessages = Array.from(mergedById.values())
      .sort((a, b) => (Date.parse(a.timestamp || '') || 0) - (Date.parse(b.timestamp || '') || 0))
      .slice(-MAX_MESSAGES);

    // Merge remote snapshot metadata (labels/stats/paths). Remote mirror
    // intentionally omits `before`/`after` file blobs to keep row size sane,
    // so we synthesize empty maps for remote-only entries — the History menu
    // still lists them; full revert requires a locally-cached snapshot.
    const remoteSnapshotsRaw =
      aiHistory && typeof aiHistory === 'object'
        ? (aiHistory as Record<string, unknown>).snapshots
        : null;

    const mergedSnapshotsById = new Map<string, EditSnapshot>();
    for (const snap of local.snapshots) mergedSnapshotsById.set(snap.id, snap);
    if (Array.isArray(remoteSnapshotsRaw)) {
      for (const raw of remoteSnapshotsRaw) {
        if (!raw || typeof raw !== 'object') continue;
        const rec = raw as Record<string, unknown>;
        const id = typeof rec.id === 'string' ? rec.id : null;
        if (!id || mergedSnapshotsById.has(id)) continue;
        mergedSnapshotsById.set(id, {
          id,
          label: typeof rec.label === 'string' ? rec.label : 'AI edit',
          timestamp: typeof rec.timestamp === 'string' ? rec.timestamp : new Date(0).toISOString(),
          source: (rec.source === 'debug' || rec.source === 'manual' ? rec.source : 'ai') as EditSnapshot['source'],
          before: {},
          after: {},
          changedPaths: Array.isArray(rec.changedPaths) ? (rec.changedPaths as string[]) : [],
          fileStats: Array.isArray(rec.fileStats) ? (rec.fileStats as FileChangeStat[]) : [],
          totals: (rec.totals && typeof rec.totals === 'object'
            ? (rec.totals as EditSnapshot['totals'])
            : { added: 0, removed: 0, created: 0, modified: 0, deleted: 0 }),
          meta: (rec.meta && typeof rec.meta === 'object') ? (rec.meta as EditSnapshotMeta) : undefined,
        });
      }
    }

    const mergedSnapshots = Array.from(mergedSnapshotsById.values())
      .sort((a, b) => (Date.parse(a.timestamp || '') || 0) - (Date.parse(b.timestamp || '') || 0))
      .slice(-MAX_SNAPSHOTS);

    const next: AIHistoryRecord = {
      ...local,
      messages: mergedMessages,
      snapshots: mergedSnapshots,
    };

    writeLocal(draftId, next);
    emit(draftId, next);
    return next;
  } catch {
    return local;
  }
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
