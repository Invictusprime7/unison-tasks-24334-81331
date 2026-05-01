/**
 * AIEditHistoryMenu — Rich cascade in the WebBuilder top toolbar that lists
 * recent AI edit snapshots with prompt, model, per-file change stats, and
 * revert / reapply actions.
 *
 * Snapshots are read live from `aiHistoryStore` (localStorage backed), so the
 * menu reflects edits made by the AI panel and Debug agent in real time.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  History,
  RotateCcw,
  RotateCw,
  FileCode2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Bug,
  User as UserIcon,
  Plus,
  Minus,
  FilePlus2,
  FileMinus2,
  FileEdit,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listSnapshots,
  subscribeAIHistory,
  type EditSnapshot,
  type FileChangeStat,
} from '@/services/aiHistoryStore';

interface AIEditHistoryMenuProps {
  projectId?: string | null;
  /** Apply a snapshot's "before" state — i.e. revert the AI change. */
  onRevert: (snapshot: EditSnapshot) => void;
  /** Apply a snapshot's "after" state — i.e. reapply a previously made edit. */
  onReapply: (snapshot: EditSnapshot) => void;
  className?: string;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function formatAbsolute(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function shortModel(model?: string): string | null {
  if (!model) return null;
  // "google/gemini-2.5-flash" → "gemini-2.5-flash"
  const slash = model.lastIndexOf('/');
  return slash >= 0 ? model.slice(slash + 1) : model;
}

function SourceIcon({ source }: { source: EditSnapshot['source'] }) {
  if (source === 'debug') return <Bug className="w-3 h-3 text-amber-300" />;
  if (source === 'manual') return <UserIcon className="w-3 h-3 text-cyan-300" />;
  return <Sparkles className="w-3 h-3 text-fuchsia-300" />;
}

function FileKindIcon({ kind }: { kind: FileChangeStat['kind'] }) {
  if (kind === 'created') return <FilePlus2 className="w-3 h-3 text-lime-400" />;
  if (kind === 'deleted') return <FileMinus2 className="w-3 h-3 text-red-400" />;
  return <FileEdit className="w-3 h-3 text-cyan-300" />;
}

const SnapshotRow: React.FC<{
  snap: EditSnapshot;
  onRevert: (s: EditSnapshot) => void;
  onReapply: (s: EditSnapshot) => void;
}> = ({ snap, onRevert, onReapply }) => {
  const [expanded, setExpanded] = useState(false);
  const stats = snap.fileStats ?? [];
  const totals = snap.totals ?? { added: 0, removed: 0, created: 0, modified: 0, deleted: 0 };
  const fileCount = stats.length || snap.changedPaths?.length || 0;
  const model = shortModel(snap.meta?.model);
  const prompt = snap.meta?.prompt;
  const summary = snap.meta?.summary;
  const warnings = snap.meta?.warnings ?? [];
  const hasWarnings = warnings.some((w) => w?.severity === 'error' || w?.severity === 'warning');

  return (
    <div className="px-2 py-2 border-b border-cyan-500/10 last:border-b-0 hover:bg-cyan-500/5 transition-colors">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2 text-left"
      >
        <span className="mt-0.5 flex-shrink-0">
          <SourceIcon source={snap.source} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate text-cyan-100" title={snap.label}>
              {snap.label}
            </span>
            {hasWarnings && (
              <AlertTriangle
                className="w-3 h-3 text-amber-400 flex-shrink-0"
                aria-label="Flagged for review"
              />
            )}
          </div>
          <div className="text-[10px] text-cyan-200/60 flex items-center gap-1.5 flex-wrap mt-0.5">
            <span title={formatAbsolute(snap.timestamp)}>{formatRelative(snap.timestamp)}</span>
            <span className="text-cyan-500/40">·</span>
            <span className="text-fuchsia-300/80 capitalize">{snap.source}</span>
            {model && (
              <>
                <span className="text-cyan-500/40">·</span>
                <span className="inline-flex items-center gap-0.5 text-violet-300/90" title={snap.meta?.model}>
                  <Cpu className="w-2.5 h-2.5" />
                  {model}
                </span>
              </>
            )}
            {fileCount > 0 && (
              <>
                <span className="text-cyan-500/40">·</span>
                <span className="text-cyan-200/80">
                  {fileCount} file{fileCount > 1 ? 's' : ''}
                </span>
              </>
            )}
            {(totals.added > 0 || totals.removed > 0) && (
              <>
                <span className="text-cyan-500/40">·</span>
                <span className="inline-flex items-center gap-1">
                  {totals.added > 0 && (
                    <span className="inline-flex items-center text-lime-400">
                      <Plus className="w-2.5 h-2.5" />
                      {totals.added}
                    </span>
                  )}
                  {totals.removed > 0 && (
                    <span className="inline-flex items-center text-red-400">
                      <Minus className="w-2.5 h-2.5" />
                      {totals.removed}
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
        <span className="mt-0.5 flex-shrink-0 text-cyan-300/60">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 ml-5 space-y-2">
          {prompt && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-cyan-300/60 mb-0.5">
                Prompt
              </div>
              <div className="text-[11px] text-cyan-100/90 italic bg-cyan-500/5 border border-cyan-500/15 rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                "{prompt}"
              </div>
            </div>
          )}

          {summary && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-cyan-300/60 mb-0.5">
                AI Summary
              </div>
              <div className="text-[11px] text-cyan-100/85 bg-fuchsia-500/5 border border-fuchsia-500/15 rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                {summary}
              </div>
            </div>
          )}

          {snap.meta?.actionType && (
            <div className="text-[10px] text-cyan-200/60">
              <span className="text-cyan-300/60">Action:</span>{' '}
              <span className="text-cyan-100/80 font-mono">{snap.meta.actionType}</span>
              {snap.meta.origin && (
                <>
                  <span className="text-cyan-500/40 mx-1">·</span>
                  <span className="text-cyan-300/60">Origin:</span>{' '}
                  <span className="text-cyan-100/80 font-mono">{snap.meta.origin}</span>
                </>
              )}
            </div>
          )}

          {warnings.length > 0 && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-amber-300/70 mb-0.5">
                Warnings
              </div>
              <ul className="space-y-0.5">
                {warnings.slice(0, 5).map((w, i) => (
                  <li
                    key={i}
                    className="text-[10px] text-amber-200/80 flex items-start gap-1"
                  >
                    <AlertTriangle className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{w?.message || 'Unknown warning'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.length > 0 && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-cyan-300/60 mb-1">
                Files Changed
              </div>
              <ul className="space-y-0.5">
                {stats.map((f) => (
                  <li
                    key={f.path}
                    className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-100/80"
                    title={f.path}
                  >
                    <FileKindIcon kind={f.kind} />
                    <span className="truncate flex-1">{f.path}</span>
                    {f.added > 0 && (
                      <span className="text-lime-400 inline-flex items-center">
                        <Plus className="w-2.5 h-2.5" />
                        {f.added}
                      </span>
                    )}
                    {f.removed > 0 && (
                      <span className="text-red-400 inline-flex items-center">
                        <Minus className="w-2.5 h-2.5" />
                        {f.removed}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRevert(snap); }}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1 px-2 rounded-md bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-colors border border-amber-500/20"
            >
              <RotateCcw className="w-3 h-3" />
              Revert
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReapply(snap); }}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1 px-2 rounded-md bg-lime-500/10 text-lime-300 hover:bg-lime-500/20 hover:text-lime-200 transition-colors border border-lime-500/20"
            >
              <RotateCw className="w-3 h-3" />
              Reapply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AIEditHistoryMenu: React.FC<AIEditHistoryMenuProps> = ({
  projectId,
  onRevert,
  onReapply,
  className,
}) => {
  const [snapshots, setSnapshots] = useState<EditSnapshot[]>(() => listSnapshots(projectId));

  useEffect(() => {
    setSnapshots(listSnapshots(projectId));
    const unsub = subscribeAIHistory(projectId, (rec) => {
      setSnapshots([...rec.snapshots].reverse());
    });
    return unsub;
  }, [projectId]);

  const count = snapshots.length;
  const aggregate = useMemo(() => {
    let added = 0;
    let removed = 0;
    let files = 0;
    for (const s of snapshots) {
      added += s.totals?.added ?? 0;
      removed += s.totals?.removed ?? 0;
      files += s.fileStats?.length ?? s.changedPaths?.length ?? 0;
    }
    return { added, removed, files };
  }, [snapshots]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2.5 rounded-lg text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-500/15 transition-all duration-200',
            className,
          )}
          title="AI edit history"
        >
          <History className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">History</span>
          {count > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] rounded-full bg-cyan-500/20 text-cyan-200">
              {count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[420px] max-h-[70vh] overflow-y-auto bg-[#0d0d18] border-cyan-500/30 text-cyan-100"
      >
        <DropdownMenuLabel className="flex items-center justify-between text-[11px] uppercase tracking-wider text-cyan-300/70">
          <span>AI Edit History</span>
          {count > 0 && (
            <span className="normal-case tracking-normal text-[10px] text-cyan-300/60 font-normal flex items-center gap-1.5">
              <span>{count} edits</span>
              {aggregate.added > 0 && (
                <span className="text-lime-400 inline-flex items-center">
                  <Plus className="w-2.5 h-2.5" />{aggregate.added}
                </span>
              )}
              {aggregate.removed > 0 && (
                <span className="text-red-400 inline-flex items-center">
                  <Minus className="w-2.5 h-2.5" />{aggregate.removed}
                </span>
              )}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-cyan-500/20" />
        {snapshots.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-cyan-200/50">
            <FileCode2 className="w-5 h-5 mx-auto mb-2 opacity-40" />
            No AI edits yet. Apply a change to start the cascade.
          </div>
        ) : (
          snapshots.map((snap) => (
            <SnapshotRow
              key={snap.id}
              snap={snap}
              onRevert={onRevert}
              onReapply={onReapply}
            />
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AIEditHistoryMenu;
