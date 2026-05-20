/**
 * CloudAIUsage — Admin dashboard for Unison Tasks AI usage
 *
 * Shows total request counts, model usage, and per-provider error rates
 * (highlighting 429 rate-limits and 402 payment-required errors).
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
// Cast to any to bypass TS deep-instantiation issues on the large generated Database type.
const supabase = supabaseClient as any;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ShieldAlert, Activity, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIRequestLog {
  id: string;
  provider: string;
  model: string;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
  user_id: string | null;
}

type Range = '1h' | '24h' | '7d' | '30d';

const RANGES: { id: Range; label: string; ms: number }[] = [
  { id: '1h', label: 'Last hour', ms: 60 * 60 * 1000 },
  { id: '24h', label: 'Last 24h', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
];

interface Props {
  userId: string;
}

export function CloudAIUsage({ userId }: Props) {
  const [logs, setLogs] = useState<AIRequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [range, setRange] = useState<Range>('24h');
  const [error, setError] = useState<string | null>(null);

  const checkRole = async () => {
    const { data, error: roleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (roleErr) {
      setIsAdmin(false);
      return false;
    }
    const ok = !!data;
    setIsAdmin(ok);
    return ok;
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - (RANGES.find((r) => r.id === range)?.ms ?? 86400000)).toISOString();
    const { data, error: err } = await supabase
      .from('ai_request_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000);
    if (err) setError(err.message);
    setLogs((data as AIRequestLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const ok = await checkRole();
      if (ok) await fetchLogs();
      else setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (isAdmin) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.success).length;
    const failed = total - success;
    const errorRate = total ? (failed / total) * 100 : 0;
    const avgLatency =
      total > 0
        ? Math.round(
            logs.reduce((s, l) => s + (l.latency_ms ?? 0), 0) / total,
          )
        : 0;

    const rate429 = logs.filter((l) => l.status_code === 429).length;
    const rate402 = logs.filter((l) => l.status_code === 402).length;

    const byProvider = new Map<
      string,
      { total: number; failed: number; r429: number; r402: number }
    >();
    const byModel = new Map<string, number>();

    for (const l of logs) {
      const p = byProvider.get(l.provider) ?? { total: 0, failed: 0, r429: 0, r402: 0 };
      p.total++;
      if (!l.success) p.failed++;
      if (l.status_code === 429) p.r429++;
      if (l.status_code === 402) p.r402++;
      byProvider.set(l.provider, p);

      const key = `${l.provider}/${l.model}`;
      byModel.set(key, (byModel.get(key) ?? 0) + 1);
    }

    return {
      total,
      success,
      failed,
      errorRate,
      avgLatency,
      rate429,
      rate402,
      providers: Array.from(byProvider.entries()).map(([name, v]) => ({
        name,
        ...v,
        errorRate: v.total ? (v.failed / v.total) * 100 : 0,
      })),
      models: Array.from(byModel.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [logs]);

  if (isAdmin === null || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 p-6">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-400" />
          <div>
            <p className="font-semibold text-white">Admin access required</p>
            <p className="mt-1 text-sm text-white/60">
              You need the <code className="rounded bg-black/40 px-1">admin</code> role to view AI
              usage. Grant yourself admin by inserting a row into{' '}
              <code className="rounded bg-black/40 px-1">user_roles</code> with your user id and
              role <code className="rounded bg-black/40 px-1">admin</code>.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">AI Usage</h2>
          <p className="text-sm text-white/55">
            Unison Tasks AI request volume, model usage, and provider error rates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-[#0d0d18] p-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs transition',
                  range === r.id
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-white/55 hover:text-white',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={fetchLogs}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Total requests" value={stats.total} icon={Activity} tone="cyan" />
        <Metric
          label="Error rate"
          value={`${stats.errorRate.toFixed(1)}%`}
          icon={AlertTriangle}
          tone={stats.errorRate > 10 ? 'red' : stats.errorRate > 2 ? 'amber' : 'lime'}
        />
        <Metric label="429 Rate-limited" value={stats.rate429} icon={Zap} tone={stats.rate429 ? 'amber' : 'lime'} />
        <Metric label="402 Payment" value={stats.rate402} icon={Zap} tone={stats.rate402 ? 'red' : 'lime'} />
      </div>

      {/* Per-provider error breakdown */}
      <Card className="border-white/10 bg-[#0d0d18]">
        <CardHeader>
          <CardTitle className="text-base text-white">Per-provider error rates</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.providers.length === 0 ? (
            <p className="text-sm text-white/45">No requests in this window.</p>
          ) : (
            <div className="space-y-3">
              {stats.providers.map((p) => (
                <div
                  key={p.name}
                  className="rounded-lg border border-white/5 bg-black/20 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{p.name}</span>
                      <Badge variant="outline" className="border-white/10 text-white/55">
                        {p.total} req
                      </Badge>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        p.errorRate > 10
                          ? 'text-red-400'
                          : p.errorRate > 2
                            ? 'text-amber-400'
                            : 'text-lime-400',
                      )}
                    >
                      {p.errorRate.toFixed(1)}% errors
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={cn(
                        'h-full',
                        p.errorRate > 10
                          ? 'bg-red-500'
                          : p.errorRate > 2
                            ? 'bg-amber-500'
                            : 'bg-lime-500',
                      )}
                      style={{ width: `${Math.min(100, p.errorRate)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-white/55">
                    <span>Failed: {p.failed}</span>
                    <span className="text-amber-300/80">429: {p.r429}</span>
                    <span className="text-red-300/80">402: {p.r402}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model usage */}
      <Card className="border-white/10 bg-[#0d0d18]">
        <CardHeader>
          <CardTitle className="text-base text-white">Model usage</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.models.length === 0 ? (
            <p className="text-sm text-white/45">No model activity in this window.</p>
          ) : (
            <div className="space-y-2">
              {stats.models.map((m) => {
                const pct = stats.total ? (m.count / stats.total) * 100 : 0;
                return (
                  <div key={m.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-mono text-white/80">{m.name}</span>
                      <span className="text-white/55">
                        {m.count} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent log */}
      <Card className="border-white/10 bg-[#0d0d18]">
        <CardHeader>
          <CardTitle className="text-base text-white">Recent requests</CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-white/45">
              <tr>
                <th className="py-2">Time</th>
                <th>Provider</th>
                <th>Model</th>
                <th>Status</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody className="text-white/75">
              {logs.slice(0, 100).map((l) => (
                <tr key={l.id} className="border-t border-white/5">
                  <td className="py-1.5">
                    {new Date(l.created_at).toLocaleTimeString()}
                  </td>
                  <td>{l.provider}</td>
                  <td className="font-mono">{l.model}</td>
                  <td>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5',
                        l.success
                          ? 'bg-lime-500/15 text-lime-300'
                          : l.status_code === 429
                            ? 'bg-amber-500/15 text-amber-300'
                            : l.status_code === 402
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-red-500/15 text-red-300',
                      )}
                    >
                      {l.status_code ?? '—'}
                    </span>
                  </td>
                  <td>{l.latency_ms ? `${l.latency_ms} ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: 'cyan' | 'amber' | 'red' | 'lime';
}) {
  const toneMap = {
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    lime: 'text-lime-400',
  };
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
        <Icon className={cn('h-4 w-4', toneMap[tone])} />
      </div>
      <p className={cn('mt-2 text-2xl font-semibold', toneMap[tone])}>{value}</p>
    </div>
  );
}
