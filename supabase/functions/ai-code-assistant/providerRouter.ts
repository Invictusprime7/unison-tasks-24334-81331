// supabase/functions/ai-code-assistant/providerRouter.ts
// Selects AI models and timeouts based on classified task type.

import type { ClassifiedTask, AssistantTaskType } from "./taskClassifier.ts";

export interface ModelSpec {
  id: string;
  maxTokens: number;
  label: string;
}

export interface ProviderPlan {
  /** Ordered list of gateway models to try (via Lovable AI Gateway) */
  gatewayModels: ModelSpec[];
  /** Per-model timeout in ms */
  perModelTimeoutMs: number;
  /** Max tokens hint for direct fallback APIs */
  fallbackMaxTokens: number;
}

export interface GatewayOverrides {
  selectedModelId?: string;
  reasoningEffort?: "none" | "low" | "medium" | "high";
  timeoutMs?: number;
  autoModelSelection?: boolean;
  maxTokens?: number;
}

/**
 * Build the provider/model plan for a classified task.
 * When gatewayOverrides are provided and autoModelSelection is false,
 * the user's chosen model takes priority (Lane B only).
 */
export function buildProviderPlan(
  task: ClassifiedTask,
  hasLovableKey: boolean,
  overrides?: GatewayOverrides,
): ProviderPlan {
  if (!hasLovableKey) {
    return {
      gatewayModels: [],
      perModelTimeoutMs: 25000,
      fallbackMaxTokens: task.type === "wizard_template_react" ? 16000 : 32000,
    };
  }

  // Build default plan first
  let plan: ProviderPlan;

  switch (task.type) {
    case "nav_page_generation":
      plan = {
        gatewayModels: [
          { id: "google/gemini-2.5-flash-lite", maxTokens: 12000, label: "Gemini 2.5 Flash Lite" },
          { id: "google/gemini-2.5-flash", maxTokens: 12000, label: "Gemini 2.5 Flash" },
        ],
        perModelTimeoutMs: 20000,
        fallbackMaxTokens: 10000,
      };
      break;

    case "wizard_template_react":
      plan = {
        gatewayModels: [
          { id: "google/gemini-2.5-flash", maxTokens: 16000, label: "Gemini 2.5 Flash" },
          { id: "google/gemini-2.5-pro", maxTokens: 16000, label: "Gemini 2.5 Pro" },
          { id: "openai/gpt-5-mini", maxTokens: 16000, label: "GPT-5 Mini" },
        ],
        perModelTimeoutMs: 55000,
        fallbackMaxTokens: 16000,
      };
      break;

    default:
      plan = {
        gatewayModels: [
          { id: "google/gemini-2.5-flash", maxTokens: 32000, label: "Gemini 2.5 Flash" },
          { id: "google/gemini-2.5-pro", maxTokens: 32000, label: "Gemini 2.5 Pro" },
          { id: "openai/gpt-5-mini", maxTokens: 32000, label: "GPT-5 Mini" },
        ],
        perModelTimeoutMs: 25000,
        fallbackMaxTokens: 32000,
      };
      break;
  }

  // Apply user overrides (only for non-wizard tasks to protect Lane A)
  if (overrides && task.type !== "wizard_template_react") {
    if (overrides.autoModelSelection === false && overrides.selectedModelId) {
      const tokens = overrides.maxTokens ?? plan.gatewayModels[0]?.maxTokens ?? 32000;
      const modelId = overrides.selectedModelId;
      const label = modelId.split("/").pop() ?? modelId;
      // Put user-selected model first, keep others as fallbacks
      const userModel: ModelSpec = { id: modelId, maxTokens: tokens, label };
      const fallbacks = plan.gatewayModels.filter(m => m.id !== modelId);
      plan.gatewayModels = [userModel, ...fallbacks];
    }
    if (overrides.timeoutMs) {
      plan.perModelTimeoutMs = overrides.timeoutMs;
    }
  }

  return plan;
}
