import type { TaskPlan } from './nlTypes';

export interface UnisonAIContext {
  route: TaskPlan['route'];
  primaryIntent: string;
  secondaryIntents: string[];
  targetScope: TaskPlan['intent']['targetScope'];
  requestedOutcome: string;
  constraints: string[];
  entities: TaskPlan['intent']['entities'];
  targetFiles: string[];
  targetPageIds: string[];
  targetSections: string[];
  confidence: number;
  estimatedComplexity: number;
  requiresClarification: boolean;
  requiresUserConfirmation: boolean;
  steps: Array<{
    type: TaskPlan['steps'][number]['type'];
    description: string;
    targets: string[];
    dependsOn: string[];
    complexity: number;
  }>;
}

export function buildUnisonAIContext(plan: TaskPlan): UnisonAIContext {
  return {
    route: plan.route,
    primaryIntent: plan.intent.primaryIntent,
    secondaryIntents: plan.intent.secondaryIntents.slice(0, 12),
    targetScope: plan.intent.targetScope,
    requestedOutcome: plan.intent.requestedOutcome,
    constraints: plan.intent.constraints.slice(0, 20),
    entities: plan.intent.entities,
    targetFiles: (plan.intent.targetFiles ?? []).slice(0, 20),
    targetPageIds: (plan.intent.targetPageIds ?? []).slice(0, 20),
    targetSections: (plan.intent.targetSections ?? []).slice(0, 20),
    confidence: plan.intent.confidence,
    estimatedComplexity: plan.estimatedComplexity,
    requiresClarification: plan.intent.requiresClarification,
    requiresUserConfirmation: plan.requiresUserConfirmation,
    steps: plan.steps.slice(0, 20).map((step) => ({
      type: step.type,
      description: step.description,
      targets: step.targets.slice(0, 20),
      dependsOn: step.dependsOn.slice(0, 20),
      complexity: step.complexity,
    })),
  };
}