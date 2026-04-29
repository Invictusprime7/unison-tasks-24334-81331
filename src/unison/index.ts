/**
 * Unison Tasks — LLM-native Task Interpretation System
 * 
 * Architecture:
 *   Layer 1: NL Router       — Routes prompt to correct AI subsystem
 *   Layer 2: Intent Parser   — Extracts structured meaning
 *   Layer 3: Entity Resolver — Maps user language to canonical concepts
 *   Layer 4: Cap Validator   — Checks feasibility against project state
 *   Layer 5: Task Planner    — Creates execution plan before changes
 *   Layer 6: Feedback Logger — Captures misses for continuous improvement
 * 
 * The LLM handles raw language understanding.
 * Unison handles business-safe meaning resolution.
 */

// Types
export type {
  NLRoute,
  NLRouteResult,
  TargetScope,
  ParsedUserIntent,
  ParsedEntities,
  CapabilityStatus,
  CapabilityValidationResult,
  PlanStepType,
  PlanStepStatus,
  PlanStep,
  TaskPlan,
  InterpretationFeedback,
} from './nlTypes';

// Layer 1: NL Router
export { routePrompt } from './nlRouter';

// Layer 2: Intent Parser
export { parseIntent } from './intentParser';

// Layer 3: Entity Resolver
export {
  resolveSection,
  resolveIntent,
  resolvePage,
  extractEntities,
} from './entityResolver';

// Layer 4: Capability Validator
export { validateCapabilities } from './capabilityValidator';
export type { ProjectContext } from './capabilityValidator';

// Layer 5: Task Planner
export { createPlan } from './taskPlanner';

// Layer 6: Feedback Logger
export {
  logInterpretation,
  logCorrection,
  getFeedbackBuffer,
  loadLocalFeedback,
  getMisclassificationStats,
  clearFeedback,
} from './feedbackLogger';

// ============================================================================
// Convenience: Full interpretation pipeline
// ============================================================================

import { routePrompt } from './nlRouter';
import { parseIntent } from './intentParser';
import { validateCapabilities, type ProjectContext } from './capabilityValidator';
import { createPlan } from './taskPlanner';
import { logInterpretation } from './feedbackLogger';
import type { TaskPlan, InterpretationFeedback } from './nlTypes';
import { nanoid } from 'nanoid';

export interface InterpretResult {
  plan: TaskPlan;
  feedback: InterpretationFeedback;
}

/**
 * Full pipeline: prompt → route → parse → validate → plan → log.
 * 
 * This is the primary entry point for Unison Task interpretation.
 */
export function interpretPrompt(
  prompt: string,
  context: ProjectContext
): InterpretResult {
  const startMs = performance.now();

  // Layer 1: Route
  const routeResult = routePrompt(prompt);

  // Layer 2: Parse
  const parsedIntent = parseIntent(prompt, routeResult);

  // Layer 3: Entity resolution happens inside parseIntent via extractEntities

  // Layer 4: Validate
  const validation = validateCapabilities(parsedIntent, context);

  // Layer 5: Plan
  const plan = createPlan(parsedIntent, validation);

  const executionTimeMs = Math.round(performance.now() - startMs);

  // Layer 6: Log
  const feedback: InterpretationFeedback = {
    id: nanoid(12),
    timestamp: new Date().toISOString(),
    rawPrompt: prompt,
    route: routeResult,
    parsedIntent,
    capabilityCheck: validation,
    plan,
    outcome: validation.status === 'unsupported'
      ? 'failure'
      : parsedIntent.requiresClarification
        ? 'clarification_needed'
        : 'success',
    executionTimeMs,
  };

  logInterpretation(feedback);

  return { plan, feedback };
}
