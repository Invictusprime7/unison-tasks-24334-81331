/**
 * Unison Tasks — Natural Language Interpretation Types
 * 
 * These types define the structured output of the NL interpretation pipeline.
 * The LLM handles raw language understanding; these types enforce
 * business-safe meaning resolution.
 */

// ============================================================================
// Layer 1: NL Router Output
// ============================================================================

export type NLRoute =
  | 'builder.generate'
  | 'builder.edit'
  | 'builder.restyle'
  | 'debug.fix'
  | 'workflow.create'
  | 'workflow.edit'
  | 'intent.bind'
  | 'crm.configure'
  | 'route.create'
  | 'route.edit'
  | 'funnel.generate'
  | 'page.add'
  | 'page.edit'
  | 'page.delete'
  | 'theme.restyle'
  | 'content.update'
  | 'preview.debug'
  | 'code.patch'
  | 'site.generate'
  | 'playground.update'
  | 'capability.enable'
  | 'unknown';

export interface NLRouteResult {
  route: NLRoute;
  confidence: number;
  /** Secondary routes if the request is compound */
  secondaryRoutes: NLRoute[];
  /** Raw classification reasoning (for logging) */
  reasoning?: string;
}

// ============================================================================
// Layer 2: Parsed User Intent (Structured Extraction)
// ============================================================================

export type TargetScope =
  | 'project'
  | 'page'
  | 'component'
  | 'section'
  | 'workflow'
  | 'preview'
  | 'crm'
  | 'route'
  | 'funnel'
  | 'theme'
  | 'config';

export interface ParsedUserIntent {
  primaryIntent: string;
  secondaryIntents: string[];
  targetScope: TargetScope;
  targetFiles?: string[];
  targetPageIds?: string[];
  targetSections?: string[];
  confidence: number;
  entities: ParsedEntities;
  requestedOutcome: string;
  constraints: string[];
  requiresClarification: boolean;
  clarificationReason?: string;
}

export interface ParsedEntities {
  industry?: string;
  businessType?: string;
  feature?: string;
  route?: string;
  buttonLabel?: string;
  componentName?: string;
  sectionType?: string;
  intentName?: string;
  styleTone?: string;
  colorScheme?: string;
  serviceName?: string;
  pageTitle?: string;
}

// ============================================================================
// Layer 3: Capability Validation Result
// ============================================================================

export type CapabilityStatus =
  | 'supported'
  | 'supported_with_fallback'
  | 'partial'
  | 'needs_clarification'
  | 'unsupported';

export interface CapabilityValidationResult {
  status: CapabilityStatus;
  missingCapabilities: string[];
  missingFiles: string[];
  missingWorkflows: string[];
  suggestedActions: string[];
  /** Whether the current builder mode supports this operation */
  correctBuilderMode: boolean;
  blockers: string[];
}

// ============================================================================
// Layer 4: Task Plan
// ============================================================================

export type PlanStepType =
  | 'locate'
  | 'analyze'
  | 'generate'
  | 'patch'
  | 'bind_intent'
  | 'create_route'
  | 'install_workflow'
  | 'enable_capability'
  | 'update_registry'
  | 'refresh_preview'
  | 'validate'
  | 'report';

export type PlanStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface PlanStep {
  id: string;
  type: PlanStepType;
  description: string;
  /** Files or resources this step affects */
  targets: string[];
  /** Steps that must complete before this one */
  dependsOn: string[];
  /** Estimated complexity: 1-5 */
  complexity: number;
  /** Runtime status — updated as execution progresses */
  status: PlanStepStatus;
  /** When the step started running */
  startedAt?: string;
  /** When the step completed */
  completedAt?: string;
}

export interface TaskPlan {
  planId: string;
  route: NLRoute;
  intent: ParsedUserIntent;
  steps: PlanStep[];
  estimatedComplexity: number;
  requiresUserConfirmation: boolean;
  confirmationReason?: string;
}

// ============================================================================
// Layer 5: Feedback / Logging
// ============================================================================

export interface InterpretationFeedback {
  id: string;
  timestamp: string;
  rawPrompt: string;
  route: NLRouteResult;
  parsedIntent: ParsedUserIntent;
  capabilityCheck: CapabilityValidationResult;
  plan?: TaskPlan;
  outcome: 'success' | 'partial' | 'failure' | 'clarification_needed';
  /** If the AI misclassified, what should it have been? */
  correctedRoute?: NLRoute;
  correctedIntent?: string;
  errorMessage?: string;
  executionTimeMs: number;
}
