// supabase/functions/ai-code-assistant/providerRouter.ts
// Selects AI models and timeouts based on classified task type + prompt complexity.
// Lane-aware: lighter models for simple edits, stronger for debug/multi-file.
// Complexity-aware: auto-upgrades model tier for complex/advanced prompts.

import type { ClassifiedTask, AssistantTaskType } from "./taskClassifier.ts";
import type { PromptComplexity } from "./promptPreprocessor.ts";

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

// ── Model tiers ─────────────────────────────────────────────────────────────

const MODELS = {
  gemini3Flash: { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  gemini25Flash: { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  gemini25FlashLite: { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  gemini25Pro: { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  gemini31Pro: { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  gpt5Mini: { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  gpt5: { id: "openai/gpt-5", label: "GPT-5" },
} as const;

function m(spec: typeof MODELS[keyof typeof MODELS], maxTokens: number): ModelSpec {
  return { id: spec.id, maxTokens, label: spec.label };
}

/**
 * Upgrade a model list based on prompt complexity tier.
 * - simple: keep as-is
 * - moderate: keep as-is (task type already handled)
 * - complex: prepend a stronger model if not already primary
 * - advanced: use strongest models, increase tokens
 */
function applyComplexityUpgrade(
  models: ModelSpec[],
  complexity: PromptComplexity,
  baseMaxTokens: number,
): { models: ModelSpec[]; timeoutBoostMs: number } {
  if (complexity === "simple" || complexity === "moderate") {
    return { models, timeoutBoostMs: 0 };
  }

  if (complexity === "advanced") {
    // Advanced: lead with FAST models so we always get a response within budget,
    // then escalate to Pro tiers as fallback. Previously Pro models were first
    // and consumed the entire 135s budget on long prompts before fast models ran.
    const advancedTokens = Math.min(baseMaxTokens + 8000, 48000);
    const advancedModels: ModelSpec[] = [
      m(MODELS.gemini3Flash, advancedTokens),
      m(MODELS.gemini25Flash, advancedTokens),
      m(MODELS.gemini25Pro, advancedTokens),
      m(MODELS.gpt5Mini, advancedTokens),
    ];
    return { models: advancedModels, timeoutBoostMs: 5000 };
  }

  // Complex: append Pro-tier as fallback (don't prepend — fast models first)
  const hasPro = models.some(mm => mm.id.includes("pro"));
  if (!hasPro) {
    const complexTokens = Math.min(baseMaxTokens + 4000, 40000);
    const upgraded: ModelSpec[] = [
      ...models,
      m(MODELS.gemini25Pro, complexTokens),
    ];
    return { models: upgraded, timeoutBoostMs: 5000 };
  }

  return { models, timeoutBoostMs: 5000 };
}

/**
 * Build the provider/model plan for a classified task.
 * Lane-aware routing + complexity-aware auto-upgrade:
 *   - Wizard: fast structured models, protected from overrides AND complexity upgrades
 *   - Debug/multi-file: stronger reasoning models
 *   - Single-file/style edits: cheaper/faster models (upgraded if complex)
 *   - Nav page: lightweight models
 */
export function buildProviderPlan(
  task: ClassifiedTask,
  hasLovableKey: boolean,
  overrides?: GatewayOverrides,
  complexity: PromptComplexity = "moderate",
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
    // ── Lane A: Wizard (protected — no complexity upgrades) ─────────────
    case "wizard_template_react":
      plan = {
        gatewayModels: [
          m(MODELS.gemini3Flash, 16000),
          m(MODELS.gemini25Flash, 16000),
          m(MODELS.gpt5Mini, 16000),
        ],
        perModelTimeoutMs: 55000,
        fallbackMaxTokens: 16000,
      };
      break;

    // ── Lane B: Lightweight tasks ───────────────────────────────────────
    case "nav_page_generation":
      plan = {
        gatewayModels: [
          m(MODELS.gemini25FlashLite, 12000),
          m(MODELS.gemini3Flash, 12000),
        ],
        perModelTimeoutMs: 30000,
        fallbackMaxTokens: 10000,
      };
      break;

    case "single_file_edit":
      plan = {
        gatewayModels: [
          m(MODELS.gemini3Flash, 24000),
          m(MODELS.gemini25Flash, 24000),
          m(MODELS.gpt5Mini, 24000),
        ],
        perModelTimeoutMs: 45000,
        fallbackMaxTokens: 24000,
      };
      break;

    // ── Lane B: Heavy reasoning tasks ───────────────────────────────────
    case "debug_fix":
      plan = {
        gatewayModels: [
          m(MODELS.gemini3Flash, 32000),
          m(MODELS.gemini25Pro, 32000),
          m(MODELS.gpt5Mini, 32000),
        ],
        perModelTimeoutMs: 45000,
        fallbackMaxTokens: 32000,
      };
      break;

    case "multi_file_edit":
    case "surgical_edit":
      plan = {
        gatewayModels: [
          m(MODELS.gemini25Pro, 32000),
          m(MODELS.gemini3Flash, 32000),
          m(MODELS.gpt5Mini, 32000),
        ],
        perModelTimeoutMs: 50000,
        fallbackMaxTokens: 32000,
      };
      break;

    // ── Lane B: Default ─────────────────────────────────────────────────
    default:
      plan = {
        gatewayModels: [
          m(MODELS.gemini3Flash, 32000),
          m(MODELS.gemini25Flash, 32000),
          m(MODELS.gpt5Mini, 32000),
        ],
        perModelTimeoutMs: 45000,
        fallbackMaxTokens: 32000,
      };
      break;
  }

  // Apply complexity-based auto-upgrade (Wizard is protected)
  if (task.type !== "wizard_template_react") {
    const baseTokens = plan.gatewayModels[0]?.maxTokens ?? 32000;
    const upgrade = applyComplexityUpgrade(plan.gatewayModels, complexity, baseTokens);
    plan.gatewayModels = upgrade.models;
    plan.perModelTimeoutMs += upgrade.timeoutBoostMs;
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
