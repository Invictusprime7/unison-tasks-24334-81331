/**
 * GateVerdictStrip — Compact, always-visible PreviewGate / PublishGate status row.
 *
 * Wires the @/platform/core Gate objects directly into the Builder UI so creators
 * always see whether the project can be previewed and/or published, and why not.
 *
 * Source of truth: evaluateAllGates(contract) from @/platform/core.
 */

import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { evaluateAllGates, type CompiledContract, type GateVerdict } from '@/platform/core';

interface GateVerdictStripProps {
  contract: CompiledContract | null;
  className?: string;
  compact?: boolean;
}

const verdictTone = (v: GateVerdict | null) => {
  if (!v) return 'unknown';
  return v.ok ? 'ok' : 'fail';
};

const Pill: React.FC<{
  label: string;
  verdict: GateVerdict | null;
  icon: React.ReactNode;
}> = ({ label, verdict, icon }) => {
  const tone = verdictTone(verdict);
  const reasons = verdict?.reasons ?? [];

  const body = (
    <Badge
      variant={tone === 'ok' ? 'default' : tone === 'fail' ? 'destructive' : 'outline'}
      className={cn(
        'gap-1.5 px-2 py-0.5 text-[11px] font-medium cursor-default',
        tone === 'ok' && 'bg-primary text-primary-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
      <span className="opacity-80">
        {tone === 'ok' ? '✓' : tone === 'fail' ? `${reasons.length} blocker${reasons.length === 1 ? '' : 's'}` : '—'}
      </span>
    </Badge>
  );

  if (!verdict || reasons.length === 0) return body;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-xs">
        <p className="text-xs font-semibold mb-1">{label} — {reasons.length} reason{reasons.length === 1 ? '' : 's'}</p>
        <ul className="space-y-1">
          {reasons.slice(0, 6).map((r, i) => (
            <li key={i} className="text-[11px] leading-snug">
              • <span className="opacity-90">{r.message}</span>
              <span className="ml-1 opacity-50">[{r.code}]</span>
            </li>
          ))}
          {reasons.length > 6 && (
            <li className="text-[10px] opacity-70 pl-2">+{reasons.length - 6} more</li>
          )}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
};

export const GateVerdictStrip: React.FC<GateVerdictStripProps> = ({ contract, className, compact }) => {
  const verdicts = useMemo(() => (contract ? evaluateAllGates(contract) : null), [contract]);

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/60 bg-muted/40',
          compact ? 'text-[11px]' : 'text-xs',
          className,
        )}
        role="status"
        aria-label="Project gate status"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {!contract && (
          <span className="text-muted-foreground italic">No contract — gates idle</span>
        )}
        {contract && verdicts && (
          <>
            <Pill
              label="Preview"
              verdict={verdicts.preview}
              icon={
                verdicts.preview.ok
                  ? <CheckCircle2 className="w-3 h-3" />
                  : <AlertTriangle className="w-3 h-3" />
              }
            />
            <Pill
              label="Publish"
              verdict={verdicts.publish}
              icon={
                verdicts.publish.ok
                  ? <CheckCircle2 className="w-3 h-3" />
                  : <XCircle className="w-3 h-3" />
              }
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default GateVerdictStrip;
