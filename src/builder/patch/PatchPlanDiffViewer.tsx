/**
 * PatchPlanDiffViewer — Phase B5.
 *
 * Pure presentational component for reviewing an AI `PatchPlan` before
 * it is applied. Renders:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Header: rationale + intent badge + status pill              │
 *   ├──────────────┬──────────────────────────────────────────────┤
 *   │ File tree    │ Per-file unified diff (color-coded)          │
 *   │ (list of     │   + lines  → bg-primary/10                   │
 *   │  edits with  │   - lines  → bg-destructive/10               │
 *   │  kind chips) │   context  → bg-muted/40                     │
 *   ├──────────────┴──────────────────────────────────────────────┤
 *   │ Footer: Discard | Retry | Apply                              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Driven entirely by props — no controllers, no global state — so the
 * caller (AIBuilderPanel in a follow-up) owns the lifecycle. It pairs
 * naturally with `AIPatchTransactionService.getState()` for the data
 * and `runRepairLoop` for the retry pathway.
 *
 * Uses Tailwind semantic tokens + shadcn primitives only.
 */

import { useMemo, useState } from 'react';
import { FileDiff, FilePlus, FileX, FileEdit, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type {
  AIPatchTransactionState,
  ApplyOutcome,
  DryRunOutcome,
} from '@/builder/patch/AIPatchTransactionService';
import type { PatchPlanFilePatch, UnifiedHunk } from '@/builder/patch/types';

export interface PatchPlanDiffViewerProps {
  /** Snapshot from `AIPatchTransactionService.getState()`. */
  state: AIPatchTransactionState;
  /** Pre-edit source for each file path. Used to render edit hunks in context. */
  originalFiles?: Record<string, string>;
  /** Triggered by the Apply button. Disabled unless phase === 'preview'. */
  onApply?: () => void;
  /** Triggered by the Discard button. */
  onDiscard?: () => void;
  /** Triggered by the Retry button (only shown when dry-run failed). */
  onRetry?: () => void;
  className?: string;
}

export function PatchPlanDiffViewer({
  state,
  originalFiles = {},
  onApply,
  onDiscard,
  onRetry,
  className,
}: PatchPlanDiffViewerProps) {
  const edits = state.plan?.edits ?? [];
  const [activePath, setActivePath] = useState<string | null>(
    edits[0]?.path ?? null,
  );

  // Keep the selected file in sync when the plan changes underneath us.
  const visibleEdit = useMemo(
    () => edits.find((e) => e.path === activePath) ?? edits[0] ?? null,
    [edits, activePath],
  );

  if (!state.plan) {
    return (
      <EmptyShell className={className}>
        No patch plan to review.
      </EmptyShell>
    );
  }

  const canApply = state.phase === 'preview';
  const showRetry = state.phase === 'dry-failed' || state.phase === 'failed';
  const busy = state.phase === 'applying' || state.phase === 'dry-running';

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border border-border bg-background text-foreground',
        className,
      )}
      data-testid="patch-plan-diff-viewer"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {state.plan.intent}
          </Badge>
          <Badge variant="outline" className="text-xs">
            risk: {state.plan.riskLevel}
          </Badge>
          <PhaseBadge phase={state.phase} />
        </div>
        {state.plan.rationale && (
          <p className="text-sm text-muted-foreground">{state.plan.rationale}</p>
        )}
        <OutcomeBanner dryRun={state.dryRun} apply={state.apply} />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-64 shrink-0 border-r border-border">
          <ScrollArea className="h-full">
            <ul className="flex flex-col p-2">
              {edits.map((edit) => (
                <li key={`${edit.kind}:${edit.path}`}>
                  <button
                    type="button"
                    onClick={() => setActivePath(edit.path)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                      'hover:bg-muted',
                      visibleEdit?.path === edit.path && 'bg-muted font-medium',
                    )}
                  >
                    <EditKindIcon kind={edit.kind} />
                    <span className="truncate font-mono text-xs">{edit.path}</span>
                  </button>
                </li>
              ))}
              {edits.length === 0 && (
                <li className="px-2 py-1.5 text-xs text-muted-foreground">
                  No file edits in plan.
                </li>
              )}
            </ul>
          </ScrollArea>
        </div>

        {/* Diff */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              {visibleEdit ? (
                <FileDiffView
                  edit={visibleEdit}
                  original={originalFiles[visibleEdit.path] ?? ''}
                />
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Select a file to view its diff.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Separator />

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {edits.length} file{edits.length === 1 ? '' : 's'} affected
        </span>
        <div className="flex items-center gap-2">
          {onDiscard && (
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={busy}>
              Discard
            </Button>
          )}
          {showRetry && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} disabled={busy}>
              Retry
            </Button>
          )}
          {onApply && (
            <Button
              variant="default"
              size="sm"
              onClick={onApply}
              disabled={!canApply || busy}
            >
              {state.phase === 'applying' && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Apply
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------- file diff view

function FileDiffView({
  edit,
  original,
}: {
  edit: PatchPlanFilePatch;
  original: string;
}) {
  switch (edit.kind) {
    case 'create':
      return (
        <DiffSurface label="Created file">
          {renderFullFile(edit.content, '+')}
        </DiffSurface>
      );
    case 'delete':
      return (
        <DiffSurface label="Deleted file">
          {renderFullFile(original, '-')}
        </DiffSurface>
      );
    case 'replace':
      return (
        <DiffSurface label="Replaced file contents">
          {renderFullFile(original, '-')}
          <div className="my-2 h-px bg-border" />
          {renderFullFile(edit.content, '+')}
        </DiffSurface>
      );
    case 'edit':
      return (
        <DiffSurface label="Edited file">
          {edit.hunks.map((hunk, i) => (
            <HunkBlock key={i} hunk={hunk} />
          ))}
        </DiffSurface>
      );
  }
}

function DiffSurface({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-0 font-mono text-xs leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function HunkBlock({ hunk }: { hunk: UnifiedHunk }) {
  return (
    <div className="overflow-hidden rounded border border-border">
      <div className="border-b border-border bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
      </div>
      <div>
        {hunk.lines.map((raw, i) => (
          <DiffLine key={i} raw={raw} />
        ))}
      </div>
    </div>
  );
}

function DiffLine({ raw }: { raw: string }) {
  const marker = raw.charAt(0);
  const body = raw.slice(1);
  let cls = 'bg-background text-foreground';
  let symbol = ' ';
  if (marker === '+') {
    cls = 'bg-primary/10 text-foreground';
    symbol = '+';
  } else if (marker === '-') {
    cls = 'bg-destructive/10 text-foreground';
    symbol = '-';
  }
  return (
    <div className={cn('flex whitespace-pre', cls)}>
      <span className="select-none px-2 text-muted-foreground">{symbol}</span>
      <span className="flex-1 pr-2">{body || ' '}</span>
    </div>
  );
}

function renderFullFile(content: string, marker: '+' | '-') {
  const lines = content.split('\n');
  return lines.map((line, i) => <DiffLine key={i} raw={`${marker}${line}`} />);
}

// ----------------------------------------------------------- chrome bits

function EditKindIcon({ kind }: { kind: PatchPlanFilePatch['kind'] }) {
  const Icon =
    kind === 'create' ? FilePlus : kind === 'delete' ? FileX : kind === 'replace' ? FileDiff : FileEdit;
  const color =
    kind === 'create'
      ? 'text-primary'
      : kind === 'delete'
      ? 'text-destructive'
      : 'text-muted-foreground';
  return <Icon className={cn('h-3.5 w-3.5 shrink-0', color)} aria-hidden />;
}

function PhaseBadge({ phase }: { phase: AIPatchTransactionState['phase'] }) {
  const label = phase.replace('-', ' ');
  const variant: 'default' | 'secondary' | 'destructive' | 'outline' =
    phase === 'applied'
      ? 'default'
      : phase === 'failed' || phase === 'rejected' || phase === 'dry-failed'
      ? 'destructive'
      : 'secondary';
  return (
    <Badge variant={variant} className="text-xs capitalize">
      {label}
    </Badge>
  );
}

function OutcomeBanner({
  dryRun,
  apply,
}: {
  dryRun: DryRunOutcome | null;
  apply: ApplyOutcome | null;
}) {
  const errors = [
    ...(dryRun && !dryRun.ok ? dryRun.errors ?? [] : []),
    ...(apply && !apply.ok && apply.error ? [apply.error] : []),
  ];
  if (errors.length === 0) return null;
  return (
    <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
      {errors.map((e, i) => (
        <li key={i} className="font-mono">
          {e}
        </li>
      ))}
    </ul>
  );
}

function EmptyShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-background p-8 text-sm text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}
