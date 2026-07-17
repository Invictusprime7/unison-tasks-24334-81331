/**
 * Readiness checklist UI (Milestone 4).
 *
 * Renders human-friendly blockers + warnings with a single primary action per row.
 * Mounted from:
 *  - WebBuilder topbar popover
 *  - Business OS shell dashboard
 *  - Publish modal
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RepairAction } from '@/services/readiness/repairActions';
import { partitionRepairs } from '@/services/readiness/repairActions';

interface Props {
  actions: RepairAction[];
  onAction?: (action: RepairAction) => void;
  className?: string;
  heading?: string;
  emptyMessage?: string;
}

export function ReadinessChecklist({
  actions,
  onAction,
  className,
  heading = 'Get ready to publish',
  emptyMessage = 'Everything looks great. You are ready to publish.',
}: Props) {
  const navigate = useNavigate();
  const { blockers, warnings } = partitionRepairs(actions);

  const handleClick = React.useCallback(
    (action: RepairAction) => {
      onAction?.(action);
      if (action.fix.type === 'route') {
        navigate(action.fix.path);
      } else if (action.fix.type === 'callback') {
        window.dispatchEvent(
          new CustomEvent('unison:readiness-action', { detail: { id: action.fix.id, action } }),
        );
      } else if (action.fix.type === 'connector') {
        window.dispatchEvent(
          new CustomEvent('unison:open-connector', { detail: { connectorId: action.fix.connectorId } }),
        );
      }
    },
    [navigate, onAction],
  );

  if (actions.length === 0) {
    return (
      <div className={cn('rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4', className)}>
        <div className="flex items-center gap-2 text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
        <span className="text-xs text-muted-foreground">
          {blockers.length} blocker{blockers.length === 1 ? '' : 's'}
          {warnings.length ? ` · ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}
        </span>
      </div>

      <ul className="space-y-2">
        {[...blockers, ...warnings].map((action) => (
          <li
            key={action.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 transition-colors',
              action.severity === 'blocker'
                ? 'border-destructive/40 bg-destructive/5'
                : 'border-amber-500/30 bg-amber-500/5',
            )}
          >
            <div className="mt-0.5 shrink-0">
              {action.severity === 'blocker' ? (
                <ShieldAlert className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{action.headline}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{action.reason}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => handleClick(action)} className="shrink-0">
              {action.label}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ReadinessChecklist;
