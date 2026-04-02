// supabase/functions/ai-code-assistant/providerRouter.ts
// Selects AI models and timeouts based on classified task type.
// Lane-aware: lighter models for simple edits, stronger for debug/multi-file.

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
 * Lane-aware routing:
 *   - Wizard: fast structured models, protected from overrides
 *   - Debug/multi-file: stronger reasoning models
 *   - Single-file/style edits: cheaper/faster models
 *   - Nav page: lightweight models
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

  let plan: ProviderPlan;

  switch (task.type) {
    // ── Lane A: Wizard (protected) ──────────────────────────────────────
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

    // ── Lane B: Lightweight tasks ───────────────────────────────────────
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

    case "single_file_edit":
      plan = {
        gatewayModels: [
          { id: "google/gemini-2.5-flash", maxTokens: 24000, label: "Gemini 2.5 Flash" },
          { id: "openai/gpt-5-mini", maxTokens: 24000, label: "GPT-5 Mini" },
          { id: "google/gemini-2.5-pro", maxTokens: 24000, label: "Gemini 2.5 Pro" },
        ],
        perModelTimeoutMs: 25000,
        fallbackMaxTokens: 24000,
      };
      break;

    // ── Lane B: Heavy reasoning tasks ───────────────────────────────────
    case "debug_fix":
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

    case "multi_file_edit":
    case "surgical_edit":
      plan = {
        gatewayModels: [
          { id: "google/gemini-2.5-pro", maxTokens: 32000, label: "Gemini 2.5 Pro" },
          { id: "google/gemini-2.5-flash", maxTokens: 32000, label: "Gemini 2.5 Flash" },
          { id: "openai/gpt-5-mini", maxTokens: 32000, label: "GPT-5 Mini" },
        ],
        perModelTimeoutMs: 30000,
        fallbackMaxTokens: 32000,
      };
      break;

    // ── Lane B: Default ─────────────────────────────────────────────────
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

  // Apply user overrides (Lane B only — wizard is protected)
  if (overrides && task.type !== "wizard_template_react") {
    if (overrides.autoModelSelection === false && overrides.selectedModelId) {
      const tokens = overrides.maxTokens ?? plan.gatewayModels[0]?.maxTokens ?? 32000;
      const modelId = overrides.selectedModelId;
      const label = modelId.split("/").pop() ?? modelId;
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
