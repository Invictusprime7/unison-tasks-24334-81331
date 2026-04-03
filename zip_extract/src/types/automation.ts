/**
 * Automation Types
 * 
 * Type definitions for the automation/workflow recipe system.
 * These types mirror the database schema and are used throughout
 * the automation infrastructure.
 */

// ============================================================================
// Core Intent Types (synced with coreIntents.ts)
// ============================================================================

export type AutomationIntent = 
  | 'button.click'
  | 'form.submit'
  | 'auth.login'
  | 'auth.register'
  | 'cart.add'
  | 'cart.checkout'
  | 'cart.abandoned'
  | 'booking.confirmed'
  | 'booking.reminder'
  | 'booking.cancelled'
  | 'booking.noshow'
  | 'order.created'
  | 'order.shipped'
  | 'order.delivered'
  | 'deal.won'
  | 'deal.lost'
  | 'proposal.sent'
  | 'job.completed'
  | 'contact.submit'
  | 'newsletter.subscribe'
  | 'booking.create'
  | 'quote.request'
  | 'lead.capture';

// ============================================================================
// Industry Types
// ============================================================================

export type IndustryType = 
  | 'restaurant'
  | 'salon'
  | 'contractor'
  | 'agency'
  | 'ecommerce'
  | 'medical'
  | 'portfolio'
  | 'saas'
  | 'blog'
  | 'general';

// ============================================================================
// Workflow Node Types
// ============================================================================

export type NodeType = 'trigger' | 'action' | 'condition' | 'wait' | 'goal';

export type ActionType =
  | 'send_email'
  | 'send_sms'
  | 'create_task'
  | 'create_lead'
  | 'update_contact'
  | 'move_pipeline_stage'
  | 'add_tag'
  | 'remove_tag'
  | 'webhook'
  | 'condition'
  | 'delay';

export interface AutomationNode {
  id: string;
  workflow_id: string;
  node_type: NodeType;
  action_type: ActionType | null;
  label: string | null;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  execution_order: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationEdge {
  id: string;
  workflow_id: string;
  from_node_id: string;
  to_node_id: string;
  condition_key: string | null;
  condition_config: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Workflow Types
// ============================================================================

export type WorkflowStatus = 'draft' | 'published' | 'archived';
export type RunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  steps: WorkflowStep[];
  is_active: boolean;
  industry: string | null;
  recipe_id: string | null;
  recipe_version: number;
  business_id: string | null;
  is_recipe: boolean;
  category: string | null;
  priority: number;
  max_enrollments_per_contact: number | null;
  reenroll_after_days: number | null;
  suppression_tags: string[];
  suppression_stages: string[];
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  action_type: ActionType;
  config: Record<string, unknown>;
  order: number;
}

// ============================================================================
// Event & Run Types
// ============================================================================

export interface AutomationEvent {
  id: string;
  business_id: string | null;
  intent: string;
  payload: Record<string, unknown>;
  dedupe_key: string | null;
  contact_id: string | null;
  source: 'template' | 'api' | 'webhook' | 'manual';
  source_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  processed: boolean;
  occurred_at: string;
  created_at: string;
}

export interface AutomationRun {
  id: string;
  workflow_id: string;
  event_id: string | null;
  contact_id: string | null;
  status: RunStatus;
  current_node_id: string | null;
  context: RunContext;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  paused_at: string | null;
  paused_until: string | null;
  steps_completed: number;
  max_steps: number;
  idempotency_key: string | null;
  created_at: string;
}

export interface RunContext {
  intent: string;
  payload: Record<string, unknown>;
  business: {
    id: string;
    industry: string;
    name: string;
  };
  contact?: {
    id: string;
    email?: string;
    name?: string;
    phone?: string;
  };
  triggered_at: string;
  [key: string]: unknown;
}

export interface AutomationJob {
  id: string;
  run_id: string;
  node_id: string;
  status: JobStatus;
  execute_at: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  result: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}

export interface AutomationLog {
  id: string;
  run_id: string;
  node_id: string | null;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface BusinessAutomationSettings {
  id: string;
  business_id: string;
  // Business Hours
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  business_days: number[];
  timezone: string;
  // Quiet Hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  // Rate Limiting
  max_messages_per_contact_per_day: number;
  dedupe_window_minutes: number;
  // Sender Identity
  default_sender_name: string | null;
  default_sender_email: string | null;
  default_sender_phone: string | null;
  // Compliance
  require_consent_for_sms: boolean;
  require_consent_for_email: boolean;
  honor_stop_keywords: boolean;
  // Global Toggle
  automations_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Recipe Pack Types
// ============================================================================

export interface RecipeDefinition {
  id: string;
  name: string;
  description: string;
  trigger: AutomationIntent;
  delay?: string; // ISO 8601 duration
  steps?: WorkflowStep[];
}

export interface RecipePack {
  id: string;
  pack_id: string;
  name: string;
  description: string | null;
  industry: IndustryType;
  icon: string | null;
  tier: 'free' | 'pro' | 'business';
  is_published: boolean;
  version: number;
  recipes: RecipeDefinition[];
  created_at: string;
  updated_at: string;
}

export interface InstalledRecipePack {
  id: string;
  business_id: string;
  pack_id: string;
  enabled: boolean;
  installed_at: string;
}

export interface BusinessRecipeToggle {
  id: string;
  business_id: string;
  recipe_id: string;
  enabled: boolean;
  custom_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Enrollment Types
// ============================================================================

export interface AutomationEnrollment {
  id: string;
  contact_id: string;
  workflow_id: string;
  enrollment_count: number;
  first_enrolled_at: string;
  last_enrolled_at: string;
  last_completed_at: string | null;
  blocked_until: string | null;
}

// ============================================================================
// Intent Mapping Types
// ============================================================================

export interface IntentRecipeMapping {
  id: string;
  intent: AutomationIntent;
  industry: IndustryType;
  recipe_ids: string[];
  priority: number;
  conditions: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Action Config Types
// ============================================================================

export interface SendEmailConfig {
  to?: string;
  subject: string;
  body: string;
  template_id?: string;
  reply_to?: string;
}

export interface SendSMSConfig {
  to?: string;
  message: string;
}

export interface CreateTaskConfig {
  title: string;
  description?: string;
  due_date?: string;
  assignee_id?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateContactConfig {
  contact_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

export interface MovePipelineStageConfig {
  lead_id?: string;
  deal_id?: string;
  stage: string;
}

export interface AddTagConfig {
  contact_id?: string;
  tag: string;
}

export interface RemoveTagConfig {
  contact_id?: string;
  tag: string;
}

export interface WebhookConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
}

export interface ConditionConfig {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: unknown;
}

export interface WaitConfig {
  duration?: string; // ISO 8601 duration like "P1D", "PT5M"
  delay?: string;    // Alternative: "5m", "1h", "1d"
  until?: string;    // Wait until specific time
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AutomationEventRequest {
  businessId: string;
  intent: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  contactId?: string;
  source?: 'template' | 'api' | 'webhook' | 'manual';
  sourceUrl?: string;
}

export interface AutomationEventResponse {
  success: boolean;
  eventId?: string;
  triggered: number;
  results?: Array<{
    workflowId: string;
    runId?: string;
    error?: string;
  }>;
  error?: string;
}

export interface AutomationRuntimeRequest {
  runId: string;
  resumeFromNodeId?: string;
}

export interface AutomationRuntimeResponse {
  success: boolean;
  runId: string;
  status: RunStatus;
  stepsProcessed: number;
  error?: string;
}
