import {
  buildProviderPlan,
  parseProviderDistribution,
  selectParallelProvider,
} from "./providerRouter.ts";
import type { ClassifiedTask } from "./taskClassifier.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

const task: ClassifiedTask = {
  type: "single_file_edit",
  fastPath: false,
  shouldUseMemory: false,
  shouldUseCompactContext: false,
  prefersJsonOutput: true,
  skipResearch: true,
  skipThinking: false,
};

const wizardTask: ClassifiedTask = {
  ...task,
  type: "wizard_seed_generation",
};

const wizardContentTask: ClassifiedTask = {
  ...task,
  type: "wizard_content_enrichment",
  fastPath: true,
  shouldUseCompactContext: true,
  skipThinking: true,
};

const bothProviders = (name: string): string | undefined => ({
  GEMINI_API_KEY: "gemini-test-key",
  OPENAI_API_KEY: "openai-test-key",
  AI_PROVIDER_MODE: "hybrid",
}[name]);

// Alternate funded providers are opt-in; an omitted mode remains Gemini-only.
const geminiOnlyMode = (name: string): string | undefined => ({
  GEMINI_API_KEY: "gemini-test-key",
  OPENAI_API_KEY: "openai-test-key",
  AI_PROVIDER_MODE: "gemini-only",
}[name]);

Deno.test("parses explicit Gemini/OpenAI traffic weights", () => {
  assertEquals(parseProviderDistribution("gemini=70,openai=30"), { gemini: 70, openai: 30 });
  assertEquals(parseProviderDistribution("invalid"), { gemini: 20, openai: 80 });
});

Deno.test("honors fixed Gemini and OpenAI distributions", () => {
  assertEquals(selectParallelProvider("any-key", { gemini: 100, openai: 0 }), "gemini");
  assertEquals(selectParallelProvider("any-key", { gemini: 0, openai: 100 }), "openai");
});

Deno.test("uses a stable routing key for weighted assignment", () => {
  const distribution = { gemini: 50, openai: 50 };
  assertEquals(
    selectParallelProvider("user-42:edit landing page", distribution),
    selectParallelProvider("user-42:edit landing page", distribution),
  );
});

Deno.test("moves the selected provider models to the front of the plan", () => {
  const geminiPlan = buildProviderPlan(
    task,
    true,
    undefined,
    "moderate",
    "route-gemini",
    (name) => name === "AI_PROVIDER_DISTRIBUTION" ? "gemini=100,openai=0" : bothProviders(name),
  );
  const openAIPlan = buildProviderPlan(
    task,
    true,
    undefined,
    "moderate",
    "route-openai",
    (name) => name === "AI_PROVIDER_DISTRIBUTION" ? "gemini=0,openai=100" : bothProviders(name),
  );

  assertEquals(geminiPlan.primaryProvider, "gemini");
  assertEquals(geminiPlan.gatewayModels[0]?.id.startsWith("google/"), true);
  assertEquals(openAIPlan.primaryProvider, "openai");
  assertEquals(openAIPlan.gatewayModels[0]?.id.startsWith("openai/"), true);
});

Deno.test("keeps an explicit model ahead of weighted routing", () => {
  const plan = buildProviderPlan(
    task,
    true,
    { autoModelSelection: false, selectedModelId: "openai/gpt-5" },
    "moderate",
    "route-gemini",
    (name) => name === "AI_PROVIDER_DISTRIBUTION" ? "gemini=100,openai=0" : bothProviders(name),
  );

  assertEquals(plan.primaryProvider, undefined);
  assertEquals(plan.gatewayModels[0]?.id, "openai/gpt-5");
});

Deno.test("uses the only configured text provider", () => {
  const plan = buildProviderPlan(
    task,
    true,
    undefined,
    "moderate",
    "any-key",
    (name) => ({ OPENAI_API_KEY: "openai-test-key", AI_PROVIDER_MODE: "hybrid" }[name]),
  );

  assertEquals(plan.primaryProvider, "openai");
});

Deno.test("uses Gemini exclusively when AI_PROVIDER_MODE opts out of the OpenAI fallback", () => {
  const plan = buildProviderPlan(
    wizardTask,
    true,
    { timeoutMs: 120_000 },
    "advanced",
    "wizard-route",
    geminiOnlyMode,
  );

  assertEquals(plan.primaryProvider, "gemini");
  assertEquals(plan.gatewayModels.map((model) => model.id), [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
  ]);
});

Deno.test("defaults to Gemini-only when AI_PROVIDER_MODE is omitted", () => {
  const plan = buildProviderPlan(
    wizardTask,
    true,
    { timeoutMs: 85_000 },
    "advanced",
    "wizard-route",
    (name) => ({
      GEMINI_API_KEY: "gemini-test-key",
      OPENAI_API_KEY: "configured-but-not-funded",
    }[name]),
  );

  assertEquals(plan.primaryProvider, "gemini");
  assertEquals(plan.perModelTimeoutMs, 85_000);
  assertEquals(plan.gatewayModels.every((model) => model.id.startsWith("google/")), true);
});

Deno.test("keeps a funded Gemini Wizard leading, with OpenAI retained as a fallback", () => {
  const plan = buildProviderPlan(
    wizardTask,
    true,
    { timeoutMs: 130_000 },
    "advanced",
    "wizard-route",
    bothProviders,
  );

  assertEquals(plan.gatewayModels.map((model) => model.id), [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "openai/gpt-4.1",
  ]);
  assertEquals(plan.primaryProvider, "gemini");
  assertEquals(plan.perModelTimeoutMs, 125_000);
  assertEquals(plan.preferLongLeadAttempt, false);
});

Deno.test("gives focused Wizard page completion one model with its full budget, no fallback split", () => {
  const plan = buildProviderPlan(
    wizardTask,
    true,
    {
      timeoutMs: 50_000,
      maxTokens: 20_000,
      autoModelSelection: false,
      selectedModelId: "google/gemini-2.5-flash-lite",
    },
    "advanced",
    "wizard-page-route",
    bothProviders,
  );

  assertEquals(plan.gatewayModels.map((model) => model.id), [
    "google/gemini-2.5-flash-lite",
  ]);
  assertEquals(plan.gatewayModels.map((model) => model.maxTokens), [20_000]);
  assertEquals(plan.fallbackMaxTokens, 20_000);
  assertEquals(plan.perModelTimeoutMs, 50_000);
  assertEquals(plan.preferLongLeadAttempt, false);
  assertEquals(plan.balancedProviderAttempts, true);
});

Deno.test("keeps Wizard content enrichment bounded to small structured-output models", () => {
  const plan = buildProviderPlan(
    wizardContentTask,
    true,
    undefined,
    "moderate",
    "wizard-content-route",
    bothProviders,
  );

  assertEquals(plan.gatewayModels.map((model) => model.id), [
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.5-flash",
  ]);
  assertEquals(plan.gatewayModels.map((model) => model.maxTokens), [6_000, 6_000]);
  assertEquals(plan.fallbackMaxTokens, 6_000);
  assertEquals(plan.perModelTimeoutMs, 35_000);
});
