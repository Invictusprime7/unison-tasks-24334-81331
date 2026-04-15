/**
 * Task Planner — Layer 4: Creates an execution plan before any file changes.
 * 
 * Turns a validated ParsedUserIntent into a sequence of PlanSteps
 * that the executor can carry out deterministically.
 */

import type {
  ParsedUserIntent,
  CapabilityValidationResult,
  TaskPlan,
  PlanStep,
  PlanStepType,
  NLRoute,
} from './nlTypes';
import { nanoid } from 'nanoid';

// ============================================================================
// Plan Templates by Route
// ============================================================================

type PlanTemplate = Array<{
  type: PlanStepType;
  description: string;
  targets: string[];
  complexity: number;
}>;

const PLAN_TEMPLATES: Partial<Record<NLRoute, PlanTemplate>> = {
  'intent.bind': [
    { type: 'locate', description: 'Locate target button/form element', targets: ['vfs'], complexity: 1 },
    { type: 'analyze', description: 'Detect current intent wiring', targets: ['vfs'], complexity: 1 },
    { type: 'bind_intent', description: 'Wire canonical intent to element', targets: ['vfs'], complexity: 2 },
    { type: 'validate', description: 'Verify intent fires correctly', targets: ['preview'], complexity: 1 },
    { type: 'report', description: 'Report binding result', targets: [], complexity: 1 },
  ],
  'debug.fix': [
    { type: 'locate', description: 'Locate error source from diagnostics', targets: ['preview', 'console'], complexity: 2 },
    { type: 'analyze', description: 'Analyze root cause', targets: ['vfs'], complexity: 3 },
    { type: 'patch', description: 'Apply fix', targets: ['vfs'], complexity: 3 },
    { type: 'refresh_preview', description: 'Refresh preview to verify', targets: ['preview'], complexity: 1 },
    { type: 'validate', description: 'Confirm error resolved', targets: ['preview'], complexity: 1 },
  ],
  'page.add': [
    { type: 'analyze', description: 'Determine page type and content needs', targets: [], complexity: 1 },
    { type: 'generate', description: 'Generate page component', targets: ['vfs'], complexity: 3 },
    { type: 'create_route', description: 'Register route in page registry', targets: ['vfs'], complexity: 1 },
    { type: 'bind_intent', description: 'Wire navigation intents', targets: ['vfs'], complexity: 1 },
    { type: 'refresh_preview', description: 'Load new page in preview', targets: ['preview'], complexity: 1 },
  ],
  'page.edit': [
    { type: 'locate', description: 'Locate target page file', targets: ['vfs'], complexity: 1 },
    { type: 'analyze', description: 'Analyze current page structure', targets: ['vfs'], complexity: 2 },
    { type: 'patch', description: 'Apply requested changes', targets: ['vfs'], complexity: 3 },
    { type: 'refresh_preview', description: 'Refresh preview', targets: ['preview'], complexity: 1 },
  ],
  'theme.restyle': [
    { type: 'analyze', description: 'Analyze current theme tokens', targets: ['vfs'], complexity: 2 },
    { type: 'patch', description: 'Update CSS variables and theme config', targets: ['vfs'], complexity: 3 },
    { type: 'refresh_preview', description: 'Refresh preview to show changes', targets: ['preview'], complexity: 1 },
  ],
  'workflow.create': [
    { type: 'analyze', description: 'Determine workflow trigger and steps', targets: [], complexity: 2 },
    { type: 'install_workflow', description: 'Create workflow configuration', targets: ['database'], complexity: 3 },
    { type: 'bind_intent', description: 'Connect trigger intent to workflow', targets: ['vfs'], complexity: 2 },
    { type: 'validate', description: 'Test workflow trigger', targets: ['preview'], complexity: 2 },
  ],
  'capability.enable': [
    { type: 'analyze', description: 'Check capability requirements', targets: [], complexity: 1 },
    { type: 'enable_capability', description: 'Provision capability resources', targets: ['database', 'vfs'], complexity: 3 },
    { type: 'update_registry', description: 'Update capability registry', targets: ['config'], complexity: 1 },
    { type: 'validate', description: 'Verify capability is operational', targets: ['preview'], complexity: 2 },
  ],
  'builder.edit': [
    { type: 'locate', description: 'Locate target component/section', targets: ['vfs'], complexity: 1 },
    { type: 'analyze', description: 'Analyze current structure', targets: ['vfs'], complexity: 2 },
    { type: 'patch', description: 'Apply edit', targets: ['vfs'], complexity: 3 },
    { type: 'refresh_preview', description: 'Refresh preview', targets: ['preview'], complexity: 1 },
  ],
  'site.generate': [
    { type: 'analyze', description: 'Determine industry, style, and content needs', targets: [], complexity: 2 },
    { type: 'generate', description: 'Generate full site structure', targets: ['vfs'], complexity: 5 },
    { type: 'create_route', description: 'Set up page routing', targets: ['vfs'], complexity: 2 },
    { type: 'bind_intent', description: 'Wire all interactive elements', targets: ['vfs'], complexity: 3 },
    { type: 'enable_capability', description: 'Provision required capabilities', targets: ['database'], complexity: 3 },
    { type: 'refresh_preview', description: 'Load site in preview', targets: ['preview'], complexity: 1 },
  ],
  'content.update': [
    { type: 'locate', description: 'Locate content target', targets: ['vfs'], complexity: 1 },
    { type: 'patch', description: 'Update text/copy', targets: ['vfs'], complexity: 2 },
    { type: 'refresh_preview', description: 'Refresh preview', targets: ['preview'], complexity: 1 },
  ],
  'crm.configure': [
    { type: 'analyze', description: 'Assess current CRM setup', targets: ['database'], complexity: 2 },
    { type: 'enable_capability', description: 'Enable CRM capabilities', targets: ['database'], complexity: 3 },
    { type: 'install_workflow', description: 'Install CRM workflows', targets: ['database'], complexity: 2 },
    { type: 'validate', description: 'Verify CRM pipeline', targets: [], complexity: 1 },
  ],
};

// Fallback plan for unrecognized routes
const FALLBACK_PLAN: PlanTemplate = [
  { type: 'analyze', description: 'Analyze request', targets: [], complexity: 2 },
  { type: 'patch', description: 'Apply changes', targets: ['vfs'], complexity: 3 },
  { type: 'refresh_preview', description: 'Refresh preview', targets: ['preview'], complexity: 1 },
];

// ============================================================================
// Planner
// ============================================================================

/**
 * Create an execution plan from a parsed and validated intent.
 */
export function createPlan(
  intent: ParsedUserIntent,
  validation: CapabilityValidationResult
): TaskPlan {
  const template = PLAN_TEMPLATES[intent.primaryIntent as NLRoute] ?? FALLBACK_PLAN;

  // Build steps with IDs and dependency chains
  const steps: PlanStep[] = template.map((t, i) => ({
    id: nanoid(8),
    type: t.type,
    description: t.description,
    targets: t.targets,
    dependsOn: i > 0 ? [/* previous step ID filled below */] : [],
    complexity: t.complexity,
    status: 'pending' as const,
  }));

  // Wire sequential dependencies
  for (let i = 1; i < steps.length; i++) {
    steps[i].dependsOn = [steps[i - 1].id];
  }

  // Prepend capability enablement steps if missing capabilities detected
  if (validation.missingCapabilities.length > 0) {
    const enableStep: PlanStep = {
      id: nanoid(8),
      type: 'enable_capability',
      description: `Enable missing capabilities: ${validation.missingCapabilities.join(', ')}`,
      targets: ['database', 'config'],
      dependsOn: [],
      complexity: 3,
      status: 'pending',
    };
    // Make all existing steps depend on this
    steps.forEach(s => {
      if (s.dependsOn.length === 0) s.dependsOn = [enableStep.id];
    });
    steps.unshift(enableStep);
  }

  const estimatedComplexity = steps.reduce((sum, s) => sum + s.complexity, 0);
  const requiresUserConfirmation =
    validation.status === 'unsupported' ||
    estimatedComplexity > 12 ||
    intent.requiresClarification;

  let confirmationReason: string | undefined;
  if (validation.blockers.length > 0) {
    confirmationReason = validation.blockers[0];
  } else if (intent.requiresClarification) {
    confirmationReason = intent.clarificationReason;
  } else if (estimatedComplexity > 12) {
    confirmationReason = 'This is a complex operation. Confirm to proceed.';
  }

  return {
    planId: nanoid(12),
    route: intent.primaryIntent as NLRoute,
    intent,
    steps,
    estimatedComplexity,
    requiresUserConfirmation,
    confirmationReason,
  };
}
