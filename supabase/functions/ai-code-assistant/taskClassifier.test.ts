import { classifyTask } from "./taskClassifier.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

Deno.test("keeps seeded wizard launches on the low-latency path", () => {
  const task = classifyTask({
    mode: "wizard-seed",
    editMode: false,
    navPageGen: false,
    surgicalEdit: false,
    behavioralEdit: false,
    debugMode: false,
  });

  assertEquals(task.type, "wizard_seed_generation");
  assertEquals(task.fastPath, true);
  assertEquals(task.shouldUseMemory, false);
  assertEquals(task.skipResearch, true);
  assertEquals(task.skipThinking, true);
});