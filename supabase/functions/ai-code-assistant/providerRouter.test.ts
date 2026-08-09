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

const bothProviders = (name: string): string | undefined => ({
  GEMINI_API_KEY: "gemini-test-key",
  OPENAI_API_KEY: "openai-test-key",
}[name]);

Deno.test("parses explicit Gemini/OpenAI traffic weights", () => {
  assertEquals(parseProviderDistribution("gemini=70,openai=30"), { gemini: 70, openai: 30 });
  assertEquals(parseProviderDistribution("invalid"), { gemini: 85, openai: 15 });
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
    (name) => name === "OPENAI_API_KEY" ? "openai-test-key" : undefined,
  );

  assertEquals(plan.primaryProvider, "openai");
});

Deno.test("keeps Wizard provider slices within the bounded failover window", () => {
  const plan = buildProviderPlan(
    wizardTask,
    true,
    { timeoutMs: 120_000 },
    "advanced",
    "wizard-route",
    bothProviders,
  );

  assertEquals(plan.gatewayModels.length, 2);
  assertEquals(plan.gatewayModels[0]?.id, "google/gemini-2.5-flash");
  assertEquals(plan.gatewayModels[1]?.id, "openai/gpt-4.1");
  assertEquals(plan.perModelTimeoutMs, 95_000);
  assertEquals(plan.preferLongLeadAttempt, true);
});

Deno.test("honors lower Wizard resource caps without changing its model lineup", () => {
  const plan = buildProviderPlan(
    wizardTask,
    true,
    { timeoutMs: 50_000, maxTokens: 12_000 },
    "advanced",
    "wizard-page-route",
    bothProviders,
  );

  assertEquals(plan.gatewayModels.map((model) => model.id), [
    "google/gemini-2.5-flash",
    "openai/gpt-4.1",
  ]);
  assertEquals(plan.gatewayModels.map((model) => model.maxTokens), [12_000, 12_000]);
  assertEquals(plan.fallbackMaxTokens, 12_000);
  assertEquals(plan.perModelTimeoutMs, 50_000);
});
