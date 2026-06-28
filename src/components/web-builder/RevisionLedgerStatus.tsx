/**
 * RevisionLedgerStatus — Move D/F surface
 *
 * Reads the most recent `site_revisions` row for the active project and
 * shows publish-readiness, blocker count, and VFS drift versus the
 * hydrated in-memory VFS.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { evaluateDrift, type DriftReport } from '@/services/vfsDriftWatcher';

interface RevisionLedgerStatusProps {
  projectId: string | null;
  vfsFiles: Record<string, string>;
  className?: string;
}

export default function RevisionLedgerStatus({
  projectId,
  vfsFiles,
  className,
}: RevisionLedgerStatusProps) {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await evaluateDrift({ projectId, vfsFiles });
      setReport(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId, vfsFiles]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!projectId) return null;

  const revision = report?.revision ?? null;
  const publishReady = revision?.publishReady === true;
  const blockerCount = revision?.publishBlockers.length ?? 0;
  const drift = report?.reason === 'drift';

  return (
    <Card className={cn('bg-slate-950/40 border-slate-800', className)}>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-cyan-400" />
            Commit Ledger
          </CardTitle>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-slate-400 hover:text-slate-200"
            onClick={() => void refresh()}
            disabled={loading}
            title="Refresh ledger status"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 space-y-2 text-[11px]">
        {error && <div className="text-red-400">{error}</div>}
        {!report && !error && !loading && (
          <div className="text-slate-500">No ledger data yet.</div>
        )}
        {report && !revision && (
          <div className="text-slate-500">No revisions persisted for this project.</div>
        )}
        {revision && (
          <>
            <Row
              label="Publish gate"
              value={
                publishReady ? (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[10px] h-4 px-1.5">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px] h-4 px-1.5">
                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />Blocked ({blockerCount})
                  </Badge>
                )
              }
            />
            <Row label="Source" value={<span className="text-slate-300">{revision.source}</span>} />
            <Row
              label="VFS drift"
              value={
                drift ? (
                  <Badge variant="outline" className="border-red-500/40 text-red-300 bg-red-500/10 text-[10px] h-4 px-1.5">
                    <XCircle className="h-2.5 w-2.5 mr-1" />Drift
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-600 text-slate-300 bg-slate-800/40 text-[10px] h-4 px-1.5">
                    In sync
                  </Badge>
                )
              }
            />
            {!publishReady && revision.publishBlockers.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-slate-800 pt-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Top blockers</div>
                {revision.publishBlockers.slice(0, 4).map((b, i) => (
                  <div key={i} className="text-[10px] text-slate-400 truncate" title={b.message}>
                    <span className="text-amber-400">{b.source}</span>: {b.message}
                  </div>
                ))}
                {revision.publishBlockers.length > 4 && (
                  <div className="text-[10px] text-slate-500">
                    + {revision.publishBlockers.length - 4} more
                  </div>
                )}
              </div>
            )}
            {drift && (
              <div className="mt-1 text-[10px] text-red-300/80">
                Live VFS hash differs from the latest ledger row. Re-commit through the AI Builder or layout fast-path to resync.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
