/**
 * TaskPlanSteps — Renders Unison TaskPlan steps as a visual cascade
 * in the AI Builder panel, showing the interpretation pipeline output
 * with real-time step status tracking.
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Brain,
  Code2,
  Wrench,
  Link,
  Route,
  Workflow,
  Shield,
  RefreshCw,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
  Target,
  Loader2,
  XCircle,
  SkipForward,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskPlan, PlanStep, PlanStepType, PlanStepStatus, NLRoute } from '@/unison/nlTypes';

// ============================================================================
// Step icon mapping
// ============================================================================

const STEP_ICONS: Record<PlanStepType, React.ReactNode> = {
  locate: <Search className="w-3 h-3" />,
  analyze: <Brain className="w-3 h-3" />,
  generate: <Code2 className="w-3 h-3" />,
  patch: <Wrench className="w-3 h-3" />,
  bind_intent: <Link className="w-3 h-3" />,
  create_route: <Route className="w-3 h-3" />,
  install_workflow: <Workflow className="w-3 h-3" />,
  enable_capability: <Shield className="w-3 h-3" />,
  update_registry: <FileText className="w-3 h-3" />,
  refresh_preview: <RefreshCw className="w-3 h-3" />,
  validate: <CheckCircle2 className="w-3 h-3" />,
  report: <FileText className="w-3 h-3" />,
};

const STEP_COLORS: Record<PlanStepType, string> = {
  locate: 'text-foreground/70',
  analyze: 'text-foreground/70',
  generate: 'text-foreground/70',
  patch: 'text-foreground/70',
  bind_intent: 'text-foreground/70',
  create_route: 'text-foreground/70',
  install_workflow: 'text-foreground/70',
  enable_capability: 'text-foreground/70',
  update_registry: 'text-foreground/70',
  refresh_preview: 'text-foreground/70',
  validate: 'text-foreground/70',
  report: 'text-muted-foreground',
};

const STATUS_STYLES: Record<PlanStepStatus, { border: string; bg: string; text: string }> = {
  pending: { border: 'border-border/70', bg: 'bg-muted/30', text: 'text-muted-foreground' },
  running: { border: 'border-primary/40', bg: 'bg-primary/10', text: 'text-foreground' },
  done: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300' },
  failed: { border: 'border-red-500/40', bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-300' },
  skipped: { border: 'border-border/60', bg: 'bg-muted/20', text: 'text-muted-foreground/70' },
};

const ROUTE_LABELS: Partial<Record<NLRoute, string>> = {
  'builder.generate': 'Generate',
  'builder.edit': 'Edit',
  'builder.restyle': 'Restyle',
  'debug.fix': 'Debug Fix',
  'workflow.create': 'Workflow',
  'intent.bind': 'Intent Bind',
  'crm.configure': 'CRM Config',
  'page.add': 'Add Page',
  'page.edit': 'Edit Page',
  'theme.restyle': 'Restyle Theme',
  'content.update': 'Content Update',
  'site.generate': 'Site Generation',
  'capability.enable': 'Enable Capability',
  'code.patch': 'Code Patch',
  'route.create': 'Create Route',
  'funnel.generate': 'Funnel',
  'unknown': 'Unknown',
};

// ============================================================================
// Component
// ============================================================================

interface TaskPlanStepsProps {
  plan: TaskPlan;
  className?: string;
}

export const TaskPlanSteps: React.FC<TaskPlanStepsProps> = ({ plan, className }) => {
  const [expanded, setExpanded] = useState(true);

  const routeLabel = ROUTE_LABELS[plan.route] || plan.route;
  const needsConfirm = plan.requiresUserConfirmation;

  // Compute progress
  const doneCount = plan.steps.filter(s => s.status === 'done').length;
  const failedCount = plan.steps.filter(s => s.status === 'failed').length;
  const runningCount = plan.steps.filter(s => s.status === 'running').length;
  const allDone = doneCount === plan.steps.length;
  const hasRunning = runningCount > 0;
  const hasFailed = failedCount > 0;

  const progressPct = plan.steps.length > 0
    ? Math.round((doneCount / plan.steps.length) * 100)
    : 0;

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden mb-2 transition-colors duration-300',
      allDone
        ? 'border-emerald-500/25 bg-emerald-500/5'
        : hasFailed
          ? 'border-red-500/25 bg-red-500/5'
          : needsConfirm
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-border/80 bg-muted/20',
      className,
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted/40 transition-colors"
      >
        {hasRunning ? (
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        ) : allDone ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        ) : hasFailed ? (
          <XCircle className="w-3 h-3 text-red-500" />
        ) : (
          <Target className={cn('w-3 h-3', needsConfirm ? 'text-amber-500' : 'text-muted-foreground')} />
        )}

        <span className={cn(
          'font-semibold',
          allDone ? 'text-emerald-700 dark:text-emerald-300' : hasFailed ? 'text-red-700 dark:text-red-300' : needsConfirm ? 'text-amber-700 dark:text-amber-300' : 'text-foreground',
        )}>
          Task Plan
        </span>

        <Badge
          variant="outline"
          className={cn(
            'text-[9px] px-1.5 py-0',
            allDone
              ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : needsConfirm
                ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'border-border/80 text-muted-foreground',
          )}
        >
          {routeLabel}
        </Badge>

        {/* Progress indicator */}
        <span className="text-[10px] text-muted-foreground ml-auto mr-1">
          {doneCount}/{plan.steps.length} steps
          {hasRunning && ' · running'}
          {allDone && ' · done'}
        </span>

        {expanded
          ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
          : <ChevronRight className="w-3 h-3 text-muted-foreground" />
        }
      </button>

      {/* Progress bar */}
      {(hasRunning || allDone) && (
        <div className="h-[2px] bg-border/70 mx-3">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out rounded-full',
              allDone ? 'bg-emerald-500/70' : 'bg-primary/60',
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Steps */}
      {expanded && (
        <div className="px-3 pb-2 pt-1">
          {/* Confirmation warning */}
          {needsConfirm && plan.confirmationReason && (
            <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 mb-1.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
              <span>{plan.confirmationReason}</span>
            </div>
          )}

          {/* Intent summary */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5 px-1">
            <Zap className="w-2.5 h-2.5 text-muted-foreground" />
            <span className="truncate">{plan.intent.requestedOutcome}</span>
            <span className="text-muted-foreground ml-auto">
              {Math.round(plan.intent.confidence * 100)}%
            </span>
          </div>

          {/* Step list */}
          <div className="ml-1 pl-2 border-l border-border/80 space-y-0.5">
            {plan.steps.map((step, i) => (
              <PlanStepRow key={step.id} step={step} isLast={i === plan.steps.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Individual Step Row
// ============================================================================

const PlanStepRow: React.FC<{ step: PlanStep; isLast: boolean }> = ({ step, isLast }) => {
  const icon = STEP_ICONS[step.type] || <Wrench className="w-3 h-3" />;
  const color = STEP_COLORS[step.type] || 'text-blue-400';
  const statusStyle = STATUS_STYLES[step.status];

  const statusIcon = (() => {
    switch (step.status) {
      case 'running':
        return <Loader2 className="w-2.5 h-2.5 text-blue-400 animate-spin" />;
      case 'done':
        return <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-2.5 h-2.5 text-red-400" />;
      case 'skipped':
        return <SkipForward className="w-2.5 h-2.5 text-blue-400/25" />;
      default:
        return <Circle className="w-2 h-2 text-blue-400/20" />;
    }
  })();

  return (
    <div className={cn(
      'flex items-center gap-2 py-0.5 group transition-all duration-300',
      step.status === 'running' && 'bg-primary/5 rounded px-1 -mx-1',
    )}>
      {/* Step type icon */}
      <div className={cn(
        'w-4 h-4 rounded flex items-center justify-center border transition-colors duration-300',
        statusStyle.bg,
        statusStyle.border,
        step.status === 'done' ? 'text-emerald-600 dark:text-emerald-400' : step.status === 'failed' ? 'text-red-600 dark:text-red-400' : color,
      )}>
        {step.status === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      </div>

      {/* Description */}
      <span className={cn(
        'text-[11px] font-mono flex-1 truncate transition-colors duration-300',
        statusStyle.text,
        step.status === 'done' && 'line-through decoration-emerald-500/30',
      )}>
        {step.description}
      </span>

      {/* Targets */}
      {step.targets.length > 0 && step.status !== 'skipped' && (
        <span className="text-[9px] text-muted-foreground font-mono flex-shrink-0">
          {step.targets.join(',')}
        </span>
      )}

      {/* Status indicator */}
      <div className="flex-shrink-0">{statusIcon}</div>
    </div>
  );
};

export default TaskPlanSteps;
