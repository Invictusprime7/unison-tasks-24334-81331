/**
 * IntentHealthPill — Always-visible Launch / Intent Health surface.
 *
 * Mounted in the WebBuilder topbar so users can never miss whether the
 * current site is preview-ready and publish-ready. Reads from the
 * canonical PlaygroundIntentReadinessReport (single source of truth) —
 * no parallel state.
 *
 * Click expands a popover listing Working / Blocked intents with fix
 * hints, fulfilling the "Here is your business system" product identity.
 */

import { useMemo, useState } from 'react';
import { Activity, CheckCircle2, XCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { PlaygroundIntentReadinessReport } from '@/types/playground';

interface IntentHealthPillProps {
  report: PlaygroundIntentReadinessReport | null;
  className?: string;
}

export function IntentHealthPill({ report, className }: IntentHealthPillProps) {
  const [open, setOpen] = useState(false);

  const { isPreviewReady, isPublishReady, working, blocked, partial } = useMemo(() => {
    const bindings = report ? Object.values(report.bindings ?? {}) : [];
    const w: Array<{ label: string; id: string }> = [];
    const b: Array<{ label: string; id: string; hint?: string }> = [];
    const p: Array<{ label: string; id: string; hint?: string }> = [];

    for (const binding of bindings) {
      const label =
        (binding as { label?: string; intent?: string; bindingId?: string }).label ??
        (binding as { intent?: string }).intent ??
        (binding as { bindingId?: string }).bindingId ??
        'Intent';
      const id = (binding as { bindingId?: string }).bindingId ?? label;
      const hint =
        (binding as { fixHints?: string[] }).fixHints?.[0] ??
        (binding as { missingDependencies?: string[] }).missingDependencies?.[0];

      if ((binding as { publishStatus?: string }).publishStatus === 'ready') {
        w.push({ label, id });
      } else if ((binding as { publishStatus?: string }).publishStatus === 'blocked') {
        b.push({ label, id, hint });
      } else {
        p.push({ label, id, hint });
      }
    }

    const previewBlocked = report?.summary?.previewBlocked ?? 0;
    const publishBlocked = report?.summary?.publishBlocked ?? 0;
    const publishPartial = report?.summary?.publishPartial ?? 0;

    return {
      isPreviewReady: previewBlocked === 0,
      isPublishReady: publishBlocked === 0 && publishPartial === 0 && w.length > 0,
      working: w,
      blocked: b,
      partial: p,
    };
  }, [report]);

  const tone = blocked.length > 0
    ? 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25'
    : partial.length > 0
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 gap-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all',
            tone,
            className,
          )}
          title="Launch / Intent Health"
        >
          <Activity className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Health</span>
          <span className="tabular-nums">
            {working.length}✓ {blocked.length}✗
          </span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Launch Health</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <StatusRow label="Preview Ready" ok={isPreviewReady} />
            <StatusRow label="Publish Ready" ok={isPublishReady} />
          </div>
        </div>

        <ScrollArea className="max-h-[320px]">
          <div className="px-4 py-3 space-y-3">
            {working.length > 0 && (
              <Section title="Working" tone="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                {working.slice(0, 12).map((w) => (
                  <li key={w.id} className="flex items-center gap-2 text-xs text-emerald-200/90">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {w.label}
                  </li>
                ))}
              </Section>
            )}

            {partial.length > 0 && (
              <Section title="Partial" tone="amber" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                {partial.slice(0, 12).map((w) => (
                  <li key={w.id} className="text-xs text-amber-200/90">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-400" /> {w.label}
                    </div>
                    {w.hint && <div className="ml-5 mt-0.5 text-[10.5px] text-amber-200/70">{w.hint}</div>}
                  </li>
                ))}
              </Section>
            )}

            {blocked.length > 0 && (
              <Section title="Blocked" tone="red" icon={<XCircle className="h-3.5 w-3.5" />}>
                {blocked.slice(0, 12).map((w) => (
                  <li key={w.id} className="text-xs text-red-200/90">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-400" /> {w.label}
                    </div>
                    {w.hint && <div className="ml-5 mt-0.5 text-[10.5px] text-red-200/70">{w.hint}</div>}
                  </li>
                ))}
              </Section>
            )}

            {working.length + partial.length + blocked.length === 0 && (
              <div className="text-xs text-muted-foreground py-4 text-center">
                No intents wired yet. Add interactive elements to start tracking health.
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', ok ? 'text-emerald-400' : 'text-red-400')}>
        {ok ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

function Section({
  title,
  tone,
  icon,
  children,
}: {
  title: string;
  tone: 'emerald' | 'amber' | 'red';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : 'text-red-300';
  return (
    <div>
      <div className={cn('mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide', toneClass)}>
        {icon}
        {title}
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}
