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

/**
 * Build the provider/model plan for a classified task.
 * Preserves the exact model selection logic from the original index.ts.
 */
export function buildProviderPlan(task: ClassifiedTask, hasLovableKey: boolean): ProviderPlan {
  if (!hasLovableKey) {
    return {
      gatewayModels: [],
      perModelTimeoutMs: 25000,
      fallbackMaxTokens: task.type === "wizard_template_react" ? 16000 : 32000,
    };
  }

  switch (task.type) {
    case "nav_page_generation":
      return {
        gatewayModels: [
          { id: "google/gemini-2.5-flash-lite", maxTokens: 12000, label: "Gemini 2.5 Flash Lite" },
          { id: "google/gemini-2.5-flash", maxTokens: 12000, label: "Gemini 2.5 Flash" },
        ],
        perModelTimeoutMs: 20000,
        fallbackMaxTokens: 10000,
      };

    case "wizard_template_react":
      return {
        gatewayModels: [
          { id: "google/gemini-2.5-flash", maxTokens: 16000, label: "Gemini 2.5 Flash" },
          { id: "google/gemini-2.5-pro", maxTokens: 16000, label: "Gemini 2.5 Pro" },
          { id: "openai/gpt-5-mini", maxTokens: 16000, label: "GPT-5 Mini" },
        ],
        perModelTimeoutMs: 55000,
        fallbackMaxTokens: 16000,
      };

    default:
      return {
        gatewayModels: [
          { id: "google/gemini-2.5-flash", maxTokens: 32000, label: "Gemini 2.5 Flash" },
          { id: "google/gemini-2.5-pro", maxTokens: 32000, label: "Gemini 2.5 Pro" },
          { id: "openai/gpt-5-mini", maxTokens: 32000, label: "GPT-5 Mini" },
        ],
        perModelTimeoutMs: 25000,
        fallbackMaxTokens: 32000,
      };
  }
}
