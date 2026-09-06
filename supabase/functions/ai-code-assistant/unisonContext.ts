import type { AIRequest } from './requestSchema.ts';
import type { PromptComplexity } from './promptPreprocessor.ts';

type UnisonContext = NonNullable<AIRequest['unisonContext']>;
type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

const COMPLEXITY_RANK: Record<PromptComplexity, number> = {
  simple: 0,
  moderate: 1,
  complex: 2,
  advanced: 3,
};

export function resolveUnisonComplexity(
  serverComplexity: PromptComplexity,
  unisonContext?: UnisonContext,
): PromptComplexity {
  const score = unisonContext?.estimatedComplexity ?? 0;
  const unisonComplexity: PromptComplexity = score >= 12
    ? 'advanced'
    : score >= 7
      ? 'complex'
      : score >= 3
        ? 'moderate'
        : 'simple';

  return COMPLEXITY_RANK[unisonComplexity] > COMPLEXITY_RANK[serverComplexity]
    ? unisonComplexity
    : serverComplexity;
}

export function resolveReasoningEffort(
  explicitEffort: ReasoningEffort | undefined,
  complexity: PromptComplexity,
): ReasoningEffort {
  if (explicitEffort) return explicitEffort;
  if (complexity === 'advanced') return 'high';
  if (complexity === 'complex') return 'medium';
  return 'low';
}

export function buildUnisonContextDirective(context?: UnisonContext): string {
  if (!context) return '';

  const steps = context.steps
    .map((step, index) => {
      const targets = step.targets.length > 0 ? ` targets=${step.targets.join(', ')}` : '';
      const dependencies = step.dependsOn.length > 0 ? ` dependsOn=${step.dependsOn.join(', ')}` : '';
      return `${index + 1}. ${step.type}: ${step.description}${targets}${dependencies}`;
    })
    .join('\n');
  const entities = Object.entries(context.entities)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');

  return `

[UNISON SEMANTIC EXECUTION CONTEXT]
Route: ${context.route}
Primary intent: ${context.primaryIntent}
Secondary intents: ${context.secondaryIntents.join(', ') || 'none'}
Target scope: ${context.targetScope}
Requested outcome: ${context.requestedOutcome}
Confidence: ${context.confidence.toFixed(2)}
Entities: ${entities || 'none'}
Constraints: ${context.constraints.join(' | ') || 'none'}
Target files: ${context.targetFiles.join(', ') || 'not resolved'}
Target pages: ${context.targetPageIds.join(', ') || 'not resolved'}
Target sections: ${context.targetSections.join(', ') || 'not resolved'}
Execution plan:
${steps || '1. analyze: Resolve the safest implementation from current project context.'}

Use this as structured semantic guidance. Reconcile it with the current VFS, preview diagnostics, request envelope, and server-side task classification. Never invent a target that conflicts with the current files. Preserve explicit user constraints and complete dependent steps in order.`;
}