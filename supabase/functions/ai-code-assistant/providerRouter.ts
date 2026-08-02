// supabase/functions/ai-code-assistant/providerRouter.ts
// Selects AI models and timeouts based on classified task type + prompt complexity.
// Lane-aware: lighter models for simple edits, stronger for debug/multi-file.
// Complexity-aware: auto-upgrades model tier for complex/advanced prompts.

import type { ClassifiedTask } from "./taskClassifier.ts";
import type { PromptComplexity } from "./promptPreprocessor.ts";

export interface ModelSpec {
  id: string;
  maxTokens: number;
  label: string;
}

export interface ProviderPlan {
  /** Ordered list of direct-provider models to try. */
  gatewayModels: ModelSpec[];
  /** Provider selected by the weighted runtime before fallbacks. */
  primaryProvider?: ParallelTextProvider;
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

export type ParallelTextProvider = "gemini" | "openai";
type EnvReader = (name: string) => string | undefined;

export interface ProviderDistribution {
  gemini: number;
  openai: number;
}

const DEFAULT_PROVIDER_DISTRIBUTION: ProviderDistribution = { gemini: 50, openai: 50 };

/** Parses `gemini=50,openai=50` or `gemini:50,openai:50`. */
export function parseProviderDistribution(raw?: string): ProviderDistribution {
  if (!raw?.trim()) return { ...DEFAULT_PROVIDER_DISTRIBUTION };

  const parsed: Partial<ProviderDistribution> = {};
  for (const entry of raw.split(',')) {
    const [name, value] = entry.split(/[:=]/, 2).map((part) => part.trim().toLowerCase());
    if ((name !== 'gemini' && name !== 'openai') || !value) continue;
    const weight = Number(value);
    if (Number.isFinite(weight) && weight >= 0) parsed[name] = weight;
  }

  const gemini = parsed.gemini ?? 0;
  const openai = parsed.openai ?? 0;
  return gemini + openai > 0 ? { gemini, openai } : { ...DEFAULT_PROVIDER_DISTRIBUTION };
}

function stableBucket(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x1_0000_0000;
}

export function selectParallelProvider(
  routingKey: string,
  distribution: ProviderDistribution,
): ParallelTextProvider {
  const total = distribution.gemini + distribution.openai;
  if (total <= 0) return 'gemini';
  return stableBucket(routingKey || 'unison-default') * total < distribution.gemini
    ? 'gemini'
    : 'openai';
}

function providerForModel(modelId: string): ParallelTextProvider | null {
  if (modelId.startsWith('google/') || modelId.startsWith('gemini-')) return 'gemini';
  if (modelId.startsWith('openai/') || modelId.startsWith('gpt-')) return 'openai';
  return null;
}

function selectPrimaryProvider(
  routingKey: string | undefined,
  readEnv: EnvReader,
): ParallelTextProvider | undefined {
  const hasGemini = Boolean(readEnv('GEMINI_API_KEY') || readEnv('GOOGLE_API_KEY'));
  const hasOpenAI = Boolean(readEnv('OPENAI_API_KEY'));
  if (!hasGemini && !hasOpenAI) return undefined;
  if (!hasGemini) return 'openai';
  if (!hasOpenAI) return 'gemini';
  return selectParallelProvider(
    routingKey || 'unison-default',
    parseProviderDistribution(readEnv('AI_PROVIDER_DISTRIBUTION')),
  );
}

function prioritizeProviderModels(models: ModelSpec[], primaryProvider?: ParallelTextProvider): ModelSpec[] {
  if (!primaryProvider) return models;
  return [
    ...models.filter((model) => providerForModel(model.id) === primaryProvider),
    ...models.filter((model) => providerForModel(model.id) !== primaryProvider),
  ];
}

// ── Model tiers ─────────────────────────────────────────────────────────────

const MODELS = {
  // Direct provider model choices. Gemini Flash is much faster than GPT-5
  // (which uses heavy reasoning + frequently times out at 50s).
  geminiFlash: { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  gemini25Flash: { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  geminiFlashLite: { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  geminiPro: { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  gpt4oMini: { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  gpt4o: { id: "openai/gpt-5", label: "GPT-5" },
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
    // Advanced: lead with FAST Gemini, then GPT-5 family as fallback.
    const advancedTokens = Math.min(baseMaxTokens + 8000, 48000);
    const advancedModels: ModelSpec[] = [
      m(MODELS.geminiFlash, advancedTokens),
      m(MODELS.gpt4oMini, advancedTokens),
      m(MODELS.gpt4o, advancedTokens),
    ];
    return { models: advancedModels, timeoutBoostMs: 5000 };
  }

  // Complex: append Pro-tier as fallback (don't prepend — fast models first)
  const hasPro = models.some(mm => mm.id === MODELS.geminiPro.id || mm.id === MODELS.gpt4o.id);
  if (!hasPro) {
    const complexTokens = Math.min(baseMaxTokens + 4000, 40000);
    const upgraded: ModelSpec[] = [
      ...models,
      m(MODELS.geminiPro, complexTokens),
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
  hasConfiguredTextProvider: boolean,
  overrides?: GatewayOverrides,
  complexity: PromptComplexity = "moderate",
  routingKey?: string,
  readEnv: EnvReader = (name) => Deno.env.get(name),
): ProviderPlan {
  if (!hasConfiguredTextProvider) {
    return {
      gatewayModels: [],
      perModelTimeoutMs: 25000,
      fallbackMaxTokens: 32000,
    };
  }

  let plan: ProviderPlan;

  switch (task.type) {
    // ── Lane B: Wizard seed (full builder-brain path — sole wizard lane) ──
    case "wizard_seed_generation":
      // Two-model lineup so a single provider blip (prose leak, soft-fail,
      // token cutoff) can't strand a Wizard launch with an empty/partial
      // bundle. Both honor the same multi-file JSON output contract.
      plan = {
        gatewayModels: [
          m(MODELS.geminiFlash, 36000),   // primary
          m(MODELS.gpt4oMini,   32000),   // fallback — same JSON contract
        ],
        // Two bounded attempts fit inside the provider loop's hard deadline and
        // leave time for response validation/persistence. Large sites are
        // already page-batched by the Wizard rather than buying reliability
        // with an unbounded single provider call.
        // Two attempts must finish inside the provider loop's 105 s hard cap.
        // A 45 s slice preserves enough room for failover and response work.
        perModelTimeoutMs: 45_000,
        fallbackMaxTokens: 36000,
      };
      break;



    case "nav_page_generation":
      plan = {
        gatewayModels: [
          m(MODELS.geminiFlashLite, 12000),
          m(MODELS.geminiFlash, 12000),
          m(MODELS.gpt4oMini, 12000),
        ],
        perModelTimeoutMs: 30000,
        fallbackMaxTokens: 10000,
      };
      break;

    case "single_file_edit":
      plan = {
        gatewayModels: [
          m(MODELS.geminiFlash, 24000),
          m(MODELS.gpt4oMini, 24000),
          m(MODELS.gpt4o, 24000),
        ],
        perModelTimeoutMs: 40000,
        fallbackMaxTokens: 24000,
      };
      break;

    // ── Lane B: Heavy reasoning tasks ───────────────────────────────────
    case "debug_fix":
      plan = {
        gatewayModels: [
          m(MODELS.geminiFlash, 32000),
          m(MODELS.gpt4oMini, 32000),
          m(MODELS.gpt4o, 32000),
        ],
        perModelTimeoutMs: 45000,
        fallbackMaxTokens: 32000,
      };
      break;

    case "multi_file_edit":
    case "surgical_edit":
      plan = {
        gatewayModels: [
          m(MODELS.geminiFlash, 32000),
          m(MODELS.gpt4oMini, 32000),
          m(MODELS.gpt4o, 32000),
        ],
        perModelTimeoutMs: 45000,
        fallbackMaxTokens: 32000,
      };
      break;

    // ── Lane B: Default ─────────────────────────────────────────────────
    // ── Launch Desk ──────────────────────────────────────────────────────
    case "launch_desk":
    default:
      plan = {
        gatewayModels: [
          m(MODELS.geminiFlash, 32000),
          m(MODELS.gpt4oMini, 32000),
          m(MODELS.gpt4o, 32000),
        ],
        perModelTimeoutMs: 45000,
        fallbackMaxTokens: 32000,
      };
      break;
  }

  // Apply complexity-based auto-upgrade (wizard seed is protected — the
  // wizard seed lineup is intentionally tuned for first-shot success and
  // must not be swapped out for slower advanced-tier models).
  if (task.type !== "wizard_seed_generation") {
    const baseTokens = plan.gatewayModels[0]?.maxTokens ?? 32000;
    const upgrade = applyComplexityUpgrade(plan.gatewayModels, complexity, baseTokens);
    plan.gatewayModels = upgrade.models;
    plan.perModelTimeoutMs += upgrade.timeoutBoostMs;
  }

  // Apply user overrides (wizard seed is protected from model swaps)
  if (overrides && task.type !== "wizard_seed_generation") {
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

  // Explicit user model selections always win. Automatic selections use the
  // stable weighted split and retain the other provider models as fallbacks.
  const hasExplicitModel = overrides?.autoModelSelection === false && Boolean(overrides.selectedModelId);
  if (!hasExplicitModel) {
    plan.primaryProvider = selectPrimaryProvider(routingKey, readEnv);
    plan.gatewayModels = prioritizeProviderModels(plan.gatewayModels, plan.primaryProvider);
  }

  return plan;
}
