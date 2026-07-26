/**
 * LayoutSnapshotCard — pre-publish visual snapshots of the wizard's pages.
 *
 * Draws a wireframe of every page's layout blocks (grid tracks, flex rows,
 * stacked sections) straight from the VFS source, and flags the structures
 * that render "left-glued" or fragmented in the live preview.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  auditPageLayouts,
  summarizeLayoutSnapshots,
  type PageLayoutSnapshot,
} from '@/services/layoutSnapshotAudit';

interface Props {
  vfsFiles?: Record<string, string> | null;
  className?: string;
}

function Wireframe({ snapshot }: { snapshot: PageLayoutSnapshot }) {
  const blocks = snapshot.blocks.slice(0, 6);
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/30 p-1.5">
      {blocks.length === 0 && (
        <div className="h-3 rounded-sm bg-muted-foreground/20" />
      )}
      {blocks.map((block, index) => {
        const tracks = block.mode === 'grid' ? Math.min(block.columns, 4) : block.mode === 'flex-row' ? 3 : 1;
        return (
          <div key={`${block.line}-${index}`} className="flex gap-1">
            {Array.from({ length: tracks }).map((_, track) => (
              <div
                key={track}
                className={cn(
                  'h-3 flex-1 rounded-sm',
                  snapshot.hasBlockingIssue && track === 0 && tracks > 1
                    ? 'bg-destructive/50'
                    : 'bg-primary/30',
                )}
              />
            ))}
            {snapshot.hasBlockingIssue && tracks > 1 && (
              <div className="h-3 flex-[2] rounded-sm border border-dashed border-destructive/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LayoutSnapshotCard({ vfsFiles, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const snapshots = useMemo(() => auditPageLayouts(vfsFiles), [vfsFiles]);
  const summary = useMemo(() => summarizeLayoutSnapshots(snapshots), [snapshots]);

  if (snapshots.length === 0) return null;

  return (
    <div className={cn('mb-3 rounded-lg border border-border bg-card/50 p-2.5 text-xs', className)}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <LayoutGrid className="h-3.5 w-3.5 text-primary" />
        <span className="font-semibold text-foreground">Layout snapshots</span>
        {summary.publishSafe ? (
          <Badge variant="outline" className="ml-auto gap-1 border-emerald-500/40 text-emerald-500">
            <CheckCircle2 className="h-3 w-3" />
            {summary.pages} pages clean
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto gap-1 border-destructive/40 text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {summary.blocking} left-glued / fragmented
          </Badge>
        )}
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {snapshots.map((snapshot) => (
            <div key={snapshot.path} className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate font-medium text-foreground">{snapshot.name}</span>
                {snapshot.hasBlockingIssue && <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />}
              </div>
              <Wireframe snapshot={snapshot} />
              {snapshot.issues.slice(0, 3).map((issue) => (
                <p
                  key={`${issue.code}-${issue.line}`}
                  className={cn(
                    'leading-snug',
                    issue.severity === 'error' ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  L{issue.line}: {issue.message}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LayoutSnapshotCard;
