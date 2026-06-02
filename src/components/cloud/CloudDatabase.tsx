/**
 * CloudDatabase — read-only business data overview panel
 *
 * Two sections:
 *  1. Table row counts  — live counts from Supabase for the selected business
 *  2. Migration log     — which install-system packs have been applied + when
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getInstalledPacks, type InstalledPack } from '@/services/recipeManagerService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Database,
  RefreshCw,
  Table2,
  PackageCheck,
  PackageX,
  CheckCircle2,
  Clock,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface TableStat {
  label: string;
  table: string;
  filterCol: string;
  count: number | null;
  error?: boolean;
  /** colour class for the accent stripe */
  color: string;
}

const TABLE_DEFS: Omit<TableStat, 'count' | 'error'>[] = [
  { label: 'Projects',         table: 'projects',               filterCol: 'business_id', color: 'text-cyan-400' },
  { label: 'Leads',            table: 'leads',                  filterCol: 'business_id', color: 'text-fuchsia-400' },
  { label: 'Bookings',         table: 'bookings',               filterCol: 'business_id', color: 'text-violet-400' },
  { label: 'Intent Executions',table: 'intent_execution_log',   filterCol: 'business_id', color: 'text-lime-400' },
  { label: 'AI Runs',          table: 'ai_runs',                filterCol: 'business_id', color: 'text-amber-400' },
  { label: 'Automation Events',table: 'automation_events',      filterCol: 'business_id', color: 'text-sky-400' },
  { label: 'Recipe Packs',     table: 'installed_recipe_packs', filterCol: 'business_id', color: 'text-emerald-400' },
  { label: 'Plugin Instances', table: 'ai_plugin_instances',    filterCol: 'business_id', color: 'text-rose-400' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchCount(table: string, filterCol: string, businessId: string): Promise<number | null> {
  try {
    const { count, error } = await (supabase as any)
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(filterCol, businessId);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

interface CloudDatabaseProps {
  businessId: string;
  businessName: string;
}

export function CloudDatabase({ businessId, businessName }: CloudDatabaseProps) {
  const [stats, setStats] = useState<TableStat[]>([]);
  const [packs, setPacks] = useState<InstalledPack[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    const results = await Promise.all(
      TABLE_DEFS.map(async (def) => {
        const count = await fetchCount(def.table, def.filterCol, businessId);
        return { ...def, count, error: count === null };
      })
    );
    setStats(results);
    setLoadingStats(false);
    setLastRefreshed(new Date());
  }, [businessId]);

  const loadPacks = useCallback(async () => {
    setLoadingPacks(true);
    const result = await getInstalledPacks(businessId);
    // Sort: enabled first, then by packName
    result.sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.packName.localeCompare(b.packName);
    });
    setPacks(result);
    setLoadingPacks(false);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    loadStats();
    loadPacks();
  }, [businessId, loadStats, loadPacks]);

  const refresh = () => {
    loadStats();
    loadPacks();
  };

  const isLoading = loadingStats || loadingPacks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Database className="h-5 w-5 text-cyan-400" />
            Database Overview
          </h2>
          <p className="mt-0.5 text-sm text-white/45">
            Read-only view for <span className="text-white/70">{businessName}</span>.
            Counts refresh on demand.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-white/10"
          onClick={refresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('mr-2 h-3.5 w-3.5', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {lastRefreshed && !isLoading && (
        <p className="text-[11px] text-white/30">
          Last refreshed at {lastRefreshed.toLocaleTimeString()}
        </p>
      )}

      {/* ── Table Stats ─────────────────────────────────────────────── */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table2 className="h-4 w-4 text-cyan-400" />
            Row Counts
          </CardTitle>
          <CardDescription>
            Live record counts for this business. All queries use the anonymous read-only key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {loadingStats
              ? Array.from({ length: TABLE_DEFS.length }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl bg-white/[0.04]" />
                ))
              : stats.map((stat) => (
                  <div
                    key={stat.table}
                    className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                  >
                    <span className="text-[11px] uppercase tracking-widest text-white/35">
                      {stat.label}
                    </span>
                    {stat.error ? (
                      <span className="text-sm text-white/25">—</span>
                    ) : (
                      <span className={cn('text-2xl font-semibold tabular-nums', stat.color)}>
                        {stat.count?.toLocaleString() ?? '—'}
                      </span>
                    )}
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Migration / Pack Log ────────────────────────────────────── */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="h-4 w-4 text-emerald-400" />
            Installed Packs
            {packs.length > 0 && (
              <Badge variant="outline" className="ml-1 border-white/10 text-white/50 text-[10px]">
                {packs.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Recipe packs provisioned by <code className="text-xs text-white/50">install-system</code>.
            Each pack represents a capability group (booking, leads, ecommerce, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPacks ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : packs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-6 py-8 text-center">
              <PackageX className="mx-auto mb-3 h-8 w-8 text-white/20" />
              <p className="text-sm font-medium text-white/40">No packs installed</p>
              <p className="mt-1 text-xs text-white/25">
                Packs are auto-provisioned when you first launch a system or save automation defaults.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {packs.map((pack) => (
                <div key={pack.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {pack.enabled ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <PackageX className="h-4 w-4 shrink-0 text-white/25" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pack.packName}</p>
                    {pack.industry && (
                      <p className="text-xs text-white/40 capitalize">{pack.industry}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pack.installedAt && (
                      <span className="flex items-center gap-1 text-[11px] text-white/30">
                        <Clock className="h-3 w-3" />
                        {new Date(pack.installedAt).toLocaleDateString()}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        pack.enabled
                          ? 'border-emerald-500/30 text-emerald-300'
                          : 'border-white/10 text-white/30'
                      )}
                    >
                      {pack.enabled ? 'active' : 'disabled'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Notice ─────────────────────────────────────────────────── */}
      <p className="text-[11px] text-white/20">
        All data shown here is scoped to this business (
        <code className="font-mono">{businessId}</code>
        ). No mutations are possible from this panel.
      </p>
    </div>
  );
}
