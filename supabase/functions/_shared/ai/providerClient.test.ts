import {
  fetchWithShortRateLimitRetry,
  getShortRateLimitRetryMs,
} from "./providerClient.ts";

Deno.test("retries a short rate limit response once", async () => {
  let calls = 0;
  const response = await fetchWithShortRateLimitRetry(
    "https://provider.example.test/chat",
    undefined,
    undefined,
    async () => {
      calls += 1;
      return calls === 1
        ? new Response("busy", { status: 429, headers: { "retry-after": "0" } })
        : new Response("ok", { status: 200 });
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
    async () => {
      calls += 1;
      return new Response("busy", { status: 429, headers: { "retry-after": "5" } });
    },
  );

  if (calls !== 1) throw new Error(`Expected one provider call, received ${calls}`);
  if (response.status !== 429) throw new Error(`Expected original 429, received ${response.status}`);
});

Deno.test("parses a short HTTP-date Retry-After value", () => {
  const now = Date.parse("2026-07-17T00:00:00Z");
  const retryMs = getShortRateLimitRetryMs(
    new Headers({ "retry-after": "Fri, 17 Jul 2026 00:00:02 GMT" }),
    now,
  );
  if (retryMs !== 2000) throw new Error(`Expected 2000ms retry, received ${retryMs}`);
});