/**
 * AIEditHistoryMenu — Compact cascade in the WebBuilder top toolbar that lists
 * recent AI edit snapshots with revert / reapply actions.
 *
 * Snapshots are read live from `aiHistoryStore` (localStorage backed), so the
 * menu reflects edits made by the AI panel and Debug agent in real time.
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { History, RotateCcw, RotateCw, FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listSnapshots,
  subscribeAIHistory,
  type EditSnapshot,
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
        className="w-80 max-h-[60vh] overflow-y-auto bg-[#0d0d18] border-cyan-500/30 text-cyan-100"
      >
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-cyan-300/70">
          AI Edit History
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-cyan-500/20" />
        {snapshots.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-cyan-200/50">
            No AI edits yet. Apply a change to start the cascade.
          </div>
        ) : (
          snapshots.map((snap) => (
            <div
              key={snap.id}
              className="px-2 py-2 border-b border-cyan-500/10 last:border-b-0 hover:bg-cyan-500/5"
            >
              <div className="flex items-start gap-2">
                <FileCode2 className="w-3.5 h-3.5 mt-0.5 text-fuchsia-400/80 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" title={snap.label}>
                    {snap.label}
                  </div>
                  <div className="text-[10px] text-cyan-200/60 flex items-center gap-2">
                    <span>{formatRelative(snap.timestamp)}</span>
                    <span className="text-fuchsia-300/70">· {snap.source}</span>
                    {snap.changedPaths && snap.changedPaths.length > 0 && (
                      <span title={snap.changedPaths.join('\n')}>
                        · {snap.changedPaths.length} file{snap.changedPaths.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-1.5 pl-5">
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); onRevert(snap); }}
                  className="flex-1 text-[11px] gap-1.5 text-amber-300 focus:text-amber-200 focus:bg-amber-500/15 rounded-md"
                >
                  <RotateCcw className="w-3 h-3" />
                  Revert
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); onReapply(snap); }}
                  className="flex-1 text-[11px] gap-1.5 text-lime-300 focus:text-lime-200 focus:bg-lime-500/15 rounded-md"
                >
                  <RotateCw className="w-3 h-3" />
                  Reapply
                </DropdownMenuItem>
              </div>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AIEditHistoryMenu;
