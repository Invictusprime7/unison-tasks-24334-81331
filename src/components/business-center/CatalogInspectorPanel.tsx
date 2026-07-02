/**
 * CatalogInspectorPanel — Track B Builder surface.
 *
 * Lists every `site_data_binding` for the active project, shows the live row
 * count for each bound section, and calls out sections that block publish.
 * Read-only for now: editing filters/collections happens through the future
 * Catalog editor; this panel is the "does my generated site have data yet?"
 * mirror of the ConnectedBusinessStrip.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  evaluateCatalogReadinessGate,
  type CatalogGateVerdict,
} from '@/services/catalogReadinessGate';

interface CatalogInspectorPanelProps {
  projectId: string | null | undefined;
  sectionTypeMap?: Record<string, string>;
  onClose?: () => void;
  className?: string;
}

export function CatalogInspectorPanel({
  projectId,
  sectionTypeMap,
  onClose,
  className,
}: CatalogInspectorPanelProps) {
  const [verdict, setVerdict] = useState<CatalogGateVerdict | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setVerdict(null);
      return;
    }
    setLoading(true);
    evaluateCatalogReadinessGate(projectId, sectionTypeMap ?? {})
      .then((v) => {
        if (!cancelled) setVerdict(v);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, sectionTypeMap]);

  return (
    <div
      className={cn(
        'w-[360px] max-h-[70vh] overflow-auto rounded-lg border border-indigo-500/30 bg-zinc-950/95 backdrop-blur-md shadow-[0_0_25px_rgba(99,102,241,0.15)] text-zinc-200',
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            Connected Data
          </span>
          {verdict && (
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full border',
                verdict.publishBlocked
                  ? 'bg-red-500/10 text-red-300 border-red-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
              )}
            >
              {verdict.publishBlocked ? 'Publish blocked' : 'Ready'}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-sm leading-none"
          >
            ×
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {loading && <div className="text-xs text-zinc-500">Loading bindings…</div>}
        {!loading && !projectId && (
          <div className="text-xs text-zinc-500">
            No project attached. Open a builder draft to inspect connected data.
          </div>
        )}
        {!loading && verdict && verdict.bindings.length === 0 && (
          <div className="text-xs text-zinc-500">
            No live-data sections bound yet. Generated sections will appear here when
            they connect to catalog rows.
          </div>
        )}

        {verdict?.bindings.map(({ binding, rowCount }) => {
          const blocked = verdict.reasons.some(
            (r) => r.pagePath === binding.pagePath && r.sectionId === binding.sectionId,
          );
          const soft = verdict.recommended.some(
            (r) => r.pagePath === binding.pagePath && r.sectionId === binding.sectionId,
          );
          return (
            <div
              key={binding.id}
              className={cn(
                'rounded-md border px-3 py-2 bg-zinc-900/60',
                blocked
                  ? 'border-red-500/40'
                  : soft
                    ? 'border-amber-500/30'
                    : 'border-zinc-800',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-zinc-100 truncate">
                  {binding.pagePath} · {binding.sectionId}
                </div>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    rowCount === 0
                      ? 'bg-zinc-800 text-zinc-500'
                      : 'bg-indigo-500/10 text-indigo-300',
                  )}
                >
                  {rowCount} row{rowCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-zinc-500 flex items-center gap-2">
                <span>{binding.sourceKind}</span>
                <span>·</span>
                <span>{binding.sourceTable}</span>
                {binding.collectionId && (
                  <>
                    <span>·</span>
                    <span>collection</span>
                  </>
                )}
                <span>·</span>
                <span>fallback: {binding.fallbackMode}</span>
              </div>
            </div>
          );
        })}

        {verdict && verdict.reasons.length > 0 && (
          <div className="mt-3 border-t border-red-500/20 pt-2 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-red-300">
              Publish blockers
            </div>
            {verdict.reasons.map((r) => (
              <div key={r.code + r.sectionId} className="text-[11px] text-red-200">
                {r.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CatalogInspectorPanel;
