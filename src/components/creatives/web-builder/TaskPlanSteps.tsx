/**
 * TaskPlanSteps — Renders Unison TaskPlan steps as a visual cascade
 * in the AI Builder panel, showing the interpretation pipeline output.
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskPlan, PlanStep, PlanStepType, NLRoute } from '@/unison/nlTypes';

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

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden mb-2',
      needsConfirm
        ? 'border-amber-500/30 bg-amber-950/20'
        : 'border-blue-500/20 bg-blue-950/20',
      className,
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-mono hover:bg-white/5 transition-colors"
      >
        <Target className={cn('w-3 h-3', needsConfirm ? 'text-amber-400' : 'text-blue-400')} />
        <span className={cn('font-semibold', needsConfirm ? 'text-amber-300' : 'text-blue-300')}>
          Task Plan
        </span>
        <Badge
          variant="outline"
          className={cn(
            'text-[9px] px-1.5 py-0',
            needsConfirm
              ? 'border-amber-500/40 text-amber-400'
              : 'border-blue-500/30 text-blue-400',
          )}
        >
          {routeLabel}
        </Badge>
        <span className="text-[10px] text-blue-400/40 ml-auto mr-1">
          {plan.steps.length} steps · complexity {plan.estimatedComplexity}
        </span>
        {expanded
          ? <ChevronDown className="w-3 h-3 text-blue-400/40" />
          : <ChevronRight className="w-3 h-3 text-blue-400/40" />
        }
      </button>

      {/* Steps */}
      {expanded && (
        <div className="px-3 pb-2">
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

  return (
    <div className="flex items-center gap-2 py-0.5 group">
      <div className={cn(
        'w-4 h-4 rounded flex items-center justify-center bg-black/30 border border-blue-500/10 group-hover:border-blue-500/30 transition-colors',
        color,
      )}>
        {icon}
      </div>
      <span className="text-[11px] text-blue-100/70 font-mono flex-1 truncate group-hover:text-blue-100/90 transition-colors">
        {step.description}
      </span>
      {step.targets.length > 0 && (
        <span className="text-[9px] text-blue-400/25 font-mono flex-shrink-0">
          {step.targets.join(',')}
        </span>
      )}
      {/* Complexity dots */}
      <div className="flex gap-px flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1 h-1 rounded-full',
              i < step.complexity ? 'bg-blue-400/50' : 'bg-blue-400/10',
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskPlanSteps;
