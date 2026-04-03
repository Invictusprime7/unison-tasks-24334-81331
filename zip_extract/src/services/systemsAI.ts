/**
 * Systems AI Service
 * 
 * Central orchestration layer connecting:
 * - BusinessBlueprint schema (API contract)
 * - coreIntents.ts (locked intent surface)
 * - industryProfiles.ts (industry capabilities)
 * - Supabase edge functions (classify, compile, provision)
 * 
 * This service provides type-safe API calls and helpers for the
 * Business → Working System → Builder flow.
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  ACTION_INTENTS, 
  AUTOMATION_INTENTS, 
  NAV_INTENTS, 
  PAY_INTENTS,
  type ActionIntent,
  type AutomationIntent,
} from "@/coreIntents";

import type {
  BusinessBlueprint,
  ClassifyRequest,
  ClassifyResponse,
  CompileRequest,
  CompileResponse,
  ProvisionRequest,
  ProvisionResponse,
  Industry,
  IntentBinding,
  AutomationRule,
  Page,
  ClarifyingQuestion,
} from "@/schemas/BusinessBlueprint";

// ============================================================================
// INDUSTRY MAPPING
// ============================================================================

/**
 * Maps BusinessBlueprint industries to existing industryProfiles system types
 */
export const INDUSTRY_SYSTEM_MAP: Record<Industry, string> = {
  local_service: "booking",
  restaurant: "booking",
  salon_spa: "booking",
  ecommerce: "ecommerce",
  creator_portfolio: "portfolio",
  coaching_consulting: "booking",
  real_estate: "leads",
  nonprofit: "leads",
  other: "leads",
};

/**
 * Default intents by industry for quick provisioning
 */
export const INDUSTRY_INTENTS: Record<Industry, ActionIntent[]> = {
  local_service: ["booking.create", "contact.submit", "lead.capture"],
  restaurant: ["booking.create", "contact.submit"],
  salon_spa: ["booking.create", "contact.submit", "newsletter.subscribe"],
  ecommerce: ["lead.capture", "newsletter.subscribe"],
  creator_portfolio: ["contact.submit", "lead.capture"],
  coaching_consulting: ["booking.create", "lead.capture", "newsletter.subscribe"],
  real_estate: ["booking.create", "lead.capture", "contact.submit"],
  nonprofit: ["lead.capture", "newsletter.subscribe", "contact.submit"],
  other: ["contact.submit", "lead.capture"],
};

/**
 * Automation triggers by industry
 */
export const INDUSTRY_AUTOMATIONS: Record<Industry, AutomationIntent[]> = {
  local_service: ["booking.confirmed", "booking.reminder", "form.submit"],
  restaurant: ["booking.confirmed", "booking.reminder", "booking.cancelled"],
  salon_spa: ["booking.confirmed", "booking.reminder", "booking.cancelled", "booking.noshow"],
  ecommerce: ["cart.add", "cart.checkout", "cart.abandoned", "order.created", "order.shipped"],
  creator_portfolio: ["form.submit", "button.click"],
  coaching_consulting: ["booking.confirmed", "booking.reminder", "form.submit"],
  real_estate: ["booking.confirmed", "form.submit", "deal.won", "deal.lost"],
  nonprofit: ["form.submit", "button.click"],
  other: ["form.submit", "button.click"],
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

export interface SystemsAPIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SystemsAPIResult<T> {
  data: T | null;
  error: SystemsAPIError | null;
}

/**
 * Classify a business prompt to detect industry and get clarifying questions
 */
export async function classifyPrompt(
  prompt: string,
  context?: { locale?: string; region?: string; timezone?: string }
): Promise<SystemsAPIResult<ClassifyResponse>> {
  try {
    const request: ClassifyRequest = {
      prompt,
      context: {
        locale: context?.locale ?? "en-US",
        region: context?.region,
        timezone: context?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const { data, error } = await supabase.functions.invoke<ClassifyResponse>("systems-classify", {
      body: request,
    });

    if (error) {
      return {
        data: null,
        error: {
          code: "CLASSIFY_ERROR",
          message: error.message ?? "Failed to classify business prompt",
        },
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network error",
      },
    };
  }
}

/**
 * Compile a full Business Blueprint from prompt + answers
 */
export async function compileBlueprint(
  prompt: string,
  answers: Record<string, unknown> = {},
  constraints?: {
    preferred_template_style?: string;
    primary_goal?: "get_leads" | "get_bookings" | "sell_products" | "build_audience";
    content_tone?: string;
  }
): Promise<SystemsAPIResult<CompileResponse>> {
  try {
    const request: CompileRequest = {
      prompt,
      answers,
      constraints,
    };

    const { data, error } = await supabase.functions.invoke<CompileResponse>("systems-compile", {
      body: request,
    });

    if (error) {
      return {
        data: null,
        error: {
          code: "COMPILE_ERROR",
          message: error.message ?? "Failed to compile blueprint",
        },
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network error",
      },
    };
  }
}

/**
 * Provision a project from a compiled blueprint
 */
export async function provisionProject(
  ownerId: string,
  blueprint: BusinessBlueprint,
  options?: {
    create_demo_content?: boolean;
    provision_mode?: "shadow_automations" | "active_automations";
  }
): Promise<SystemsAPIResult<ProvisionResponse>> {
  try {
    const request: ProvisionRequest = {
      owner_id: ownerId,
      blueprint,
      options: {
        create_demo_content: options?.create_demo_content ?? true,
        provision_mode: options?.provision_mode ?? "shadow_automations",
      },
    };

    const { data, error } = await supabase.functions.invoke<ProvisionResponse>("builder-provision", {
      body: request,
    });

    if (error) {
      return {
        data: null,
        error: {
          code: "PROVISION_ERROR",
          message: error.message ?? "Failed to provision project",
        },
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network error",
      },
    };
  }
}

/**
 * Build a complete, production-ready website from a BusinessBlueprint
 * Uses the same AI capabilities as the Web Builder's ai-code-assistant
 */
export interface BuildWebsiteResponse {
  code: string;
  blueprint?: BusinessBlueprint;
  _meta?: {
    ai_generated?: boolean;
    fallback?: boolean;
    model?: string;
    error?: string;
  };
}

export async function buildWebsite(
  blueprint: BusinessBlueprint,
  userPrompt?: string
): Promise<SystemsAPIResult<BuildWebsiteResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke<BuildWebsiteResponse>("systems-build", {
      body: {
        blueprint,
        userPrompt,
        enhanceWithAI: true,
      },
    });

    if (error) {
      // Handle specific error cases
      if (error.message?.includes("503") || error.message?.includes("AI features")) {
        return {
          data: null,
          error: {
            code: "AI_UNAVAILABLE",
            message: "AI features are not available. Using fallback generation.",
          },
        };
      }
      if (error.message?.includes("429")) {
        return {
          data: null,
          error: {
            code: "RATE_LIMIT",
            message: "Rate limit exceeded. Please try again later.",
          },
        };
      }
      if (error.message?.includes("402")) {
        return {
          data: null,
          error: {
            code: "CREDITS_REQUIRED",
            message: "Credits required. Please add credits to continue.",
          },
        };
      }
      
      return {
        data: null,
        error: {
          code: "BUILD_ERROR",
          message: error.message ?? "Failed to build website",
        },
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network error",
      },
    };
  }
}

// ============================================================================
// BLUEPRINT HELPERS
// ============================================================================

/**
 * Generate default intent bindings for an industry
 */
export function generateDefaultIntents(industry: Industry): IntentBinding[] {
  const intents = INDUSTRY_INTENTS[industry] ?? INDUSTRY_INTENTS.other;
  
  return intents.map((intent) => {
    // Map intent to target
    const targetKind: "edge_function" | "route" | "modal" | "external_url" = "edge_function";
    let targetRef = "intent-router";
    
    if (intent === "booking.create") {
      targetRef = "create-booking";
    } else if (intent.startsWith("contact.") || intent === "lead.capture") {
      targetRef = "create-lead";
    } else if (intent === "newsletter.subscribe") {
      targetRef = "create-lead";
    }
    
    // Generate payload schema based on intent
    const payloadSchema = getPayloadSchemaForIntent(intent);
    
    return {
      intent: intent as IntentBinding["intent"],
      target: {
        kind: targetKind,
        ref: targetRef,
      },
      payload_schema: payloadSchema,
    };
  });
}

/**
 * Get payload schema for a specific intent
 */
function getPayloadSchemaForIntent(intent: ActionIntent): IntentBinding["payload_schema"] {
  const schemas: Record<string, IntentBinding["payload_schema"]> = {
    "lead.capture": [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "phone", required: false },
      { key: "message", label: "Message", type: "textarea", required: false },
    ],
    "contact.submit": [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "phone", required: false },
      { key: "message", label: "Message", type: "textarea", required: true },
    ],
    "booking.create": [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "phone", required: true },
      { key: "service", label: "Service", type: "select", required: true },
      { key: "date", label: "Preferred Date", type: "date", required: true },
      { key: "time", label: "Preferred Time", type: "time", required: false },
    ],
    "newsletter.subscribe": [
      { key: "email", label: "Email", type: "email", required: true },
      { key: "name", label: "Name", type: "text", required: false },
    ],
    "quote.request": [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "phone", required: true },
      { key: "service", label: "Service Needed", type: "select", required: true },
      { key: "details", label: "Project Details", type: "textarea", required: true },
    ],
  };
  
  return schemas[intent] ?? [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
  ];
}

/**
 * Generate default automation rules for an industry
 */
export function generateDefaultAutomations(industry: Industry): AutomationRule[] {
  const automations = INDUSTRY_AUTOMATIONS[industry] ?? INDUSTRY_AUTOMATIONS.other;
  const rules: AutomationRule[] = [];
  
  // Lead follow-up automation
  if (automations.includes("form.submit")) {
    rules.push({
      id: "lead_followup",
      name: "New Lead Follow-up",
      trigger: "on.lead_created",
      conditions: [],
      actions: [
        { type: "notify.email", params: { template: "new_lead_notification", to: "owner" } },
        { type: "crm.update_stage", params: { stage: "new" } },
      ],
      enabled_by_default: true,
    });
  }
  
  // Booking confirmation automation
  if (automations.includes("booking.confirmed")) {
    rules.push({
      id: "booking_confirmation",
      name: "Booking Confirmation",
      trigger: "on.booking_created",
      conditions: [],
      actions: [
        { type: "notify.email", params: { template: "booking_confirmation", to: "customer" } },
        { type: "calendar.create_event", params: {} },
      ],
      enabled_by_default: true,
    });
  }
  
  // Booking reminder automation
  if (automations.includes("booking.reminder")) {
    rules.push({
      id: "booking_reminder",
      name: "Booking Reminder (24h)",
      trigger: "on.booking_created",
      conditions: [],
      actions: [
        { type: "notify.sms", params: { template: "booking_reminder", timing: "24h_before" } },
      ],
      enabled_by_default: true,
    });
  }
  
  // Cart abandonment automation (ecommerce)
  if (automations.includes("cart.abandoned")) {
    rules.push({
      id: "cart_recovery",
      name: "Cart Recovery Email",
      trigger: "on.form_submitted",
      conditions: [{ field: "cart_status", op: "equals", value: "abandoned" }],
      actions: [
        { type: "notify.email", params: { template: "cart_recovery", delay: "1h" } },
      ],
      enabled_by_default: true,
    });
  }
  
  // Order notification automation (ecommerce)
  if (automations.includes("order.created")) {
    rules.push({
      id: "order_confirmation",
      name: "Order Confirmation",
      trigger: "on.checkout_completed",
      conditions: [],
      actions: [
        { type: "notify.email", params: { template: "order_confirmation", to: "customer" } },
        { type: "notify.email", params: { template: "new_order", to: "owner" } },
      ],
      enabled_by_default: true,
    });
  }
  
  return rules;
}

/**
 * Generate default CRM pipeline for an industry
 */
export function generateDefaultPipeline(industry: Industry): {
  pipeline_id: string;
  label: string;
  stages: Array<{ id: string; label: string; order: number }>;
} {
  const pipelineConfigs: Record<string, { label: string; stages: string[] }> = {
    booking: {
      label: "Bookings",
      stages: ["New Inquiry", "Contacted", "Appointment Scheduled", "Completed", "No-Show"],
    },
    leads: {
      label: "Lead Pipeline",
      stages: ["New", "Contacted", "Qualified", "Proposal Sent", "Closed Won", "Closed Lost"],
    },
    ecommerce: {
      label: "Customer Journey",
      stages: ["Visitor", "Cart Added", "Checkout Started", "Purchase Complete", "Repeat Customer"],
    },
    portfolio: {
      label: "Inquiries",
      stages: ["New Inquiry", "In Discussion", "Project Started", "Completed"],
    },
  };
  
  const systemType = INDUSTRY_SYSTEM_MAP[industry] ?? "leads";
  const config = pipelineConfigs[systemType] ?? pipelineConfigs.leads;
  
  return {
    pipeline_id: `${industry}_default`,
    label: config.label,
    stages: config.stages.map((label, index) => ({
      id: label.toLowerCase().replace(/\s+/g, "_"),
      label,
      order: index,
    })),
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a blueprint meets all guarantees
 */
export function validateBlueprint(blueprint: BusinessBlueprint): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check buttons_wired guarantee
  if (blueprint.guarantees.buttons_wired) {
    const hasIntents = blueprint.intents.length > 0;
    if (!hasIntents) {
      errors.push("buttons_wired guarantee requires at least one intent binding");
    }
  }
  
  // Check automations_ready guarantee
  if (blueprint.guarantees.automations_ready) {
    const hasAutomations = blueprint.automations.rules.length > 0;
    if (!hasAutomations) {
      warnings.push("automations_ready guarantee set but no automation rules defined");
    }
  }
  
  // Check forms_connected_to_crm guarantee
  if (blueprint.guarantees.forms_connected_to_crm) {
    const hasCrmObjects = blueprint.crm.objects.length > 0 || blueprint.crm.pipelines.length > 0;
    if (!hasCrmObjects) {
      warnings.push("forms_connected_to_crm guarantee set but no CRM objects defined");
    }
  }
  
  // Validate pages
  if (blueprint.site.pages.length === 0) {
    errors.push("At least one page is required");
  }
  
  const homePage = blueprint.site.pages.find(p => p.type === "home" || p.path === "/");
  if (!homePage) {
    warnings.push("No home page defined - visitors may land on wrong page");
  }
  
  // Validate brand
  if (!blueprint.brand.business_name) {
    errors.push("Business name is required");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get a summary of what a blueprint will create
 */
export function summarizeBlueprint(blueprint: BusinessBlueprint): {
  pages: string[];
  intents: string[];
  automations: string[];
  crmObjects: string[];
} {
  return {
    pages: blueprint.site.pages.map(p => p.title),
    intents: blueprint.intents.map(i => i.intent),
    automations: blueprint.automations.rules.map(r => r.name),
    crmObjects: [
      ...blueprint.crm.objects.map(o => o.name),
      ...blueprint.crm.pipelines.map(p => p.label),
    ],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ACTION_INTENTS,
  AUTOMATION_INTENTS,
  NAV_INTENTS,
  PAY_INTENTS,
};

export type {
  BusinessBlueprint,
  ClassifyRequest,
  ClassifyResponse,
  CompileRequest,
  CompileResponse,
  ProvisionRequest,
  ProvisionResponse,
  Industry,
  IntentBinding,
  AutomationRule,
  Page,
  ClarifyingQuestion,
};
