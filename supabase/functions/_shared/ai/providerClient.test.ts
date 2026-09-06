import {
  fetchWithShortRateLimitRetry,
  getShortRateLimitRetryMs,
  resolveConfiguredProviders,
} from "./providerClient.ts";

function env(values: Record<string, string>): (name: string) => string | undefined {
  return (name) => values[name];
}

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

Deno.test("defaults to Gemini when multiple text providers are configured", () => {
  const providers = resolveConfiguredProviders(undefined, env({
    GEMINI_API_KEY: "gemini-test-key",
    OPENAI_API_KEY: "openai-test-key",
    ANTHROPIC_API_KEY: "anthropic-test-key",
  }));

  assertEquals(providers, ["gemini", "openai", "anthropic"]);
});

Deno.test("routes explicit OpenAI models to OpenAI first", () => {
  const providers = resolveConfiguredProviders("openai/gpt-5", env({
    GEMINI_API_KEY: "gemini-test-key",
    OPENAI_API_KEY: "openai-test-key",
  }));

  assertEquals(providers, ["openai", "gemini"]);
});

Deno.test("routes explicit Gemini models to Gemini first", () => {
  const providers = resolveConfiguredProviders("google/gemini-2.5-flash", env({
    GEMINI_API_KEY: "gemini-test-key",
    OPENAI_API_KEY: "openai-test-key",
  }));

  assertEquals(providers, ["gemini", "openai"]);
});

Deno.test("accepts GOOGLE_API_KEY as the server-side Gemini alias", () => {
  const providers = resolveConfiguredProviders("gemini-2.5-flash", env({
    GOOGLE_API_KEY: "google-test-key",
  }));

  assertEquals(providers, ["gemini"]);
});

Deno.test("retries a short rate limit response once", async () => {
  let calls = 0;
  const response = await fetchWithShortRateLimitRetry(
    "https://provider.example.test/chat",
    undefined,
    undefined,
    () => {
      calls += 1;
      return Promise.resolve(calls === 1
        ? new Response("busy", { status: 429, headers: { "retry-after": "0" } })
        : new Response("ok", { status: 200 }));
    },
  );

  if (calls !== 2) throw new Error(`Expected two provider calls, received ${calls}`);
  if (response.status !== 200) throw new Error(`Expected retry success, received ${response.status}`);
});

Deno.test("does not retry a long provider cooldown", async () => {
  let calls = 0;
  const response = await fetchWithShortRateLimitRetry(
    "https://provider.example.test/chat",
    undefined,
    undefined,
    () => {
      calls += 1;
      return Promise.resolve(
        new Response("busy", { status: 429, headers: { "retry-after": "5" } }),
      );
    },
  );

  if (calls !== 1) throw new Error(`Expected one provider call, received ${calls}`);
  if (response.status !== 429) throw new Error(`Expected original 429, received ${response.status}`);
});

Deno.test("retries a transient provider capacity response once", async () => {
  let calls = 0;
  const response = await fetchWithShortRateLimitRetry(
    "https://provider.example.test/chat",
    undefined,
    undefined,
    () => {
      calls += 1;
      return Promise.resolve(calls === 1
        ? new Response("temporarily unavailable", { status: 503, headers: { "retry-after": "0" } })
        : new Response("ok", { status: 200 }));
    },
  );

  if (calls !== 2) throw new Error(`Expected two provider calls, received ${calls}`);
  if (response.status !== 200) throw new Error(`Expected retry success, received ${response.status}`);
});

Deno.test("parses a short HTTP-date Retry-After value", () => {
  const now = Date.parse("2026-07-17T00:00:00Z");
  const retryMs = getShortRateLimitRetryMs(
    new Headers({ "retry-after": "Fri, 17 Jul 2026 00:00:02 GMT" }),
    now,
  );
  if (retryMs !== 2000) throw new Error(`Expected 2000ms retry, received ${retryMs}`);
});

Deno.test("never places the Lovable gateway ahead of direct provider keys", () => {
  const providers = resolveConfiguredProviders("openai/gpt-5-mini", env({
    LOVABLE_API_KEY: "lovable-test-key",
    GEMINI_API_KEY: "gemini-test-key",
    OPENAI_API_KEY: "openai-test-key",
  }));

  assertEquals(providers, ["openai", "gemini", "lovable"]);
});
