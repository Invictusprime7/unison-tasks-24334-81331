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
  locate: 'text-sky-400',
  analyze: 'text-violet-400',
  generate: 'text-blue-400',
  patch: 'text-amber-400',
  bind_intent: 'text-emerald-400',
  create_route: 'text-cyan-400',
  install_workflow: 'text-orange-400',
  enable_capability: 'text-rose-400',
  update_registry: 'text-blue-300',
  refresh_preview: 'text-sky-300',
  validate: 'text-green-400',
  report: 'text-blue-400/60',
};

const STATUS_STYLES: Record<PlanStepStatus, { border: string; bg: string; text: string }> = {
  pending: { border: 'border-blue-500/10', bg: 'bg-black/30', text: 'text-blue-100/40' },
  running: { border: 'border-blue-400/50', bg: 'bg-blue-500/15', text: 'text-blue-100/90' },
  done: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300/80' },
  failed: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-300/80' },
  skipped: { border: 'border-blue-500/5', bg: 'bg-black/20', text: 'text-blue-100/25' },
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
      'rounded-lg border overflow-hidden mb-2 transition-colors duration-300',
      allDone
        ? 'border-emerald-500/25 bg-emerald-950/15'
        : hasFailed
          ? 'border-red-500/25 bg-red-950/15'
          : needsConfirm
            ? 'border-amber-500/30 bg-amber-950/20'
            : 'border-blue-500/20 bg-blue-950/20',
      className,
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-mono hover:bg-white/5 transition-colors"
      >
        {hasRunning ? (
          <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
        ) : allDone ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        ) : hasFailed ? (
          <XCircle className="w-3 h-3 text-red-400" />
        ) : (
          <Target className={cn('w-3 h-3', needsConfirm ? 'text-amber-400' : 'text-blue-400')} />
        )}

        <span className={cn(
          'font-semibold',
          allDone ? 'text-emerald-300' : hasFailed ? 'text-red-300' : needsConfirm ? 'text-amber-300' : 'text-blue-300',
        )}>
          Task Plan
        </span>

        <Badge
          variant="outline"
          className={cn(
            'text-[9px] px-1.5 py-0',
            allDone
              ? 'border-emerald-500/30 text-emerald-400'
              : needsConfirm
                ? 'border-amber-500/40 text-amber-400'
                : 'border-blue-500/30 text-blue-400',
          )}
        >
          {routeLabel}
        </Badge>

        {/* Progress indicator */}
        <span className="text-[10px] text-blue-400/40 ml-auto mr-1">
          {doneCount}/{plan.steps.length} steps
          {hasRunning && ' · running'}
          {allDone && ' · done'}
        </span>

        {expanded
          ? <ChevronDown className="w-3 h-3 text-blue-400/40" />
          : <ChevronRight className="w-3 h-3 text-blue-400/40" />
        }
      </button>

      {/* Progress bar */}
      {(hasRunning || allDone) && (
        <div className="h-[2px] bg-blue-500/10 mx-3">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out rounded-full',
              allDone ? 'bg-emerald-400/60' : 'bg-blue-400/50',
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
            <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 mb-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
              <span>{plan.confirmationReason}</span>
            </div>
          )}

          {/* Intent summary */}
          <div className="flex items-center gap-1.5 text-[10px] text-blue-400/50 font-mono mb-1.5 px-1">
            <Zap className="w-2.5 h-2.5 text-blue-400/40" />
            <span className="truncate">{plan.intent.requestedOutcome}</span>
            <span className="text-blue-400/25 ml-auto">
              {Math.round(plan.intent.confidence * 100)}%
            </span>
          </div>

          {/* Step list */}
          <div className="ml-1 pl-2 border-l border-blue-500/15 space-y-0.5">
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
      step.status === 'running' && 'bg-blue-500/5 rounded px-1 -mx-1',
    )}>
      {/* Step type icon */}
      <div className={cn(
        'w-4 h-4 rounded flex items-center justify-center border transition-colors duration-300',
        statusStyle.bg,
        statusStyle.border,
        step.status === 'done' ? 'text-emerald-400' : step.status === 'failed' ? 'text-red-400' : color,
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
        <span className="text-[9px] text-blue-400/25 font-mono flex-shrink-0">
          {step.targets.join(',')}
        </span>
      )}

      {/* Status indicator */}
      <div className="flex-shrink-0">{statusIcon}</div>
    </div>
  );
};

export default TaskPlanSteps;
