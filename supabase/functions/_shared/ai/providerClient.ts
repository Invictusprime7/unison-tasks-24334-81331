export type ChatMessage = {
  role: string;
  content: unknown;
  [key: string]: unknown;
};

export type ChatCompletionRequest = {
  model?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  max_completion_tokens?: number;
  stream?: boolean;
  [key: string]: unknown;
};

type Provider = "openai" | "gemini" | "anthropic";
type EnvReader = (name: string) => string | undefined;

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";
const GEMINI_CHAT_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_RATE_LIMIT_RETRY_MS = 750;
const MAX_RATE_LIMIT_RETRY_MS = 2_500;

export function getShortRateLimitRetryMs(headers: Headers, now = Date.now()): number | null {
  const retryAfter = headers.get("retry-after");
  if (!retryAfter) return DEFAULT_RATE_LIMIT_RETRY_MS;

  const seconds = Number(retryAfter);
  const delay = Number.isFinite(seconds)
    ? Math.max(0, Math.round(seconds * 1000))
    : Math.max(0, Date.parse(retryAfter) - now);
  return Number.isFinite(delay) && delay <= MAX_RATE_LIMIT_RETRY_MS ? delay : null;
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export async function fetchWithShortRateLimitRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const response = await fetcher(input, init);
  if (response.status !== 429) return response;

  const retryMs = getShortRateLimitRetryMs(response.headers);
  if (retryMs === null || signal?.aborted) return response;

  console.warn(`[providerClient] Provider rate limited; retrying once after ${retryMs}ms`);
  await waitForRetry(retryMs, signal);
  return fetcher(input, init);
}

function readGeminiApiKey(readEnv: EnvReader = (name) => Deno.env.get(name)): string | undefined {
  return readEnv("GEMINI_API_KEY") ?? readEnv("GOOGLE_API_KEY") ?? readEnv("UNISONGEMINI_API_KEY");
}

function requestedProvider(model?: string): Provider | undefined {
  if (!model) return undefined;
  if (model.startsWith("google/") || model.startsWith("gemini-")) return "gemini";
  if (model.startsWith("openai/") || model.startsWith("gpt-")) return "openai";
  if (model.startsWith("anthropic/") || model.startsWith("claude-")) return "anthropic";
  return undefined;
}

export function resolveConfiguredProviders(
  model?: string,
  readEnv: EnvReader = (name) => Deno.env.get(name),
): Provider[] {
  // Gemini is the default text provider. Explicit model namespaces override
  // the default while preserving the other configured providers as fallbacks.
  const providers: Provider[] = [];
  if (readGeminiApiKey(readEnv)) providers.push("gemini");
  if (readEnv("OPENAI_API_KEY")) providers.push("openai");
  if (readEnv("ANTHROPIC_API_KEY")) providers.push("anthropic");

  const preferred = requestedProvider(model);
  if (!preferred || !providers.includes(preferred)) return providers;
  return [preferred, ...providers.filter((provider) => provider !== preferred)];
}

export function isTextGenerationConfigured(): boolean {
  return resolveConfiguredProviders().length > 0;
}

export function isImageGenerationConfigured(): boolean {
  return Boolean(Deno.env.get("OPENAI_API_KEY"));
}

export async function createImageGeneration(
  request: { prompt: string; size?: string; quality?: "low" | "medium" | "high" | "auto"; model?: string },
  signal?: AbortSignal,
): Promise<Response> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("No image provider is configured. Set OPENAI_API_KEY.");
  }

  const response = await fetch(OPENAI_IMAGE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: request.model ?? Deno.env.get("OPENAI_IMAGE_MODEL") ?? "gpt-image-1",
      prompt: request.prompt,
      n: 1,
      size: request.size ?? "1024x1024",
      quality: request.quality ?? "medium",
      output_format: "png",
    }),
    signal,
  });
  return withProviderHeader(response, "openai");
}

function modelFor(provider: Provider, requestedModel?: string): string {
  const model = requestedModel ?? "";

  if (provider === "openai") {
    if (Deno.env.get("OPENAI_MODEL")) return Deno.env.get("OPENAI_MODEL")!;
    if (model.startsWith("openai/")) return model.slice("openai/".length);
    if (model.startsWith("gpt-")) return model;
    return "gpt-4.1-mini";
  }

  if (provider === "gemini") {
    if (Deno.env.get("GEMINI_MODEL")) return Deno.env.get("GEMINI_MODEL")!;
    if (model.startsWith("google/")) return model.slice("google/".length);
    if (model.startsWith("gemini-")) return model;
    return "gemini-2.5-flash";
  }

  if (Deno.env.get("ANTHROPIC_MODEL")) return Deno.env.get("ANTHROPIC_MODEL")!;
  if (model.startsWith("anthropic/")) return model.slice("anthropic/".length);
  if (model.startsWith("claude-")) return model;
  return "claude-sonnet-4-5";
}

function withProviderHeader(response: Response, provider: Provider): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Unison-AI-Provider", provider);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function callOpenAICompatible(
  provider: "openai" | "gemini",
  request: ChatCompletionRequest,
  signal?: AbortSignal,
): Promise<Response> {
  const apiKey = provider === "openai" ? Deno.env.get("OPENAI_API_KEY") : readGeminiApiKey();
  if (!apiKey) throw new Error(`${provider} is not configured`);

  const body: Record<string, unknown> = { ...request, model: modelFor(provider, request.model) };
  if (String(body.model).startsWith("gpt-5") && body.max_tokens !== undefined) {
    body.max_completion_tokens = body.max_completion_tokens ?? body.max_tokens;
    delete body.max_tokens;
  }

  const response = await fetchWithShortRateLimitRetry(provider === "openai" ? OPENAI_CHAT_URL : GEMINI_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }, signal);
  return withProviderHeader(response, provider);
}

async function callAnthropic(request: ChatCompletionRequest, signal?: AbortSignal): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("anthropic is not configured");

  const system = request.messages
    .filter((message) => message.role === "system")
    .map((message) => String(message.content))
    .join("\n\n");
  const messages = request.messages
    .filter((message) => message.role !== "system")
    .map(({ role, content }) => ({ role, content }));
  const response = await fetchWithShortRateLimitRetry(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelFor("anthropic", request.model),
      max_tokens: request.max_completion_tokens ?? request.max_tokens ?? 8192,
      ...(system ? { system } : {}),
      messages,
    }),
    signal,
  }, signal);

  if (!response.ok || request.stream) return withProviderHeader(response, "anthropic");

  const payload = await response.json();
  const content = Array.isArray(payload.content)
    ? payload.content.find((block: { type?: string }) => block.type === "text")?.text ?? ""
    : "";
  return new Response(JSON.stringify({ choices: [{ message: { content } }], usage: payload.usage }), {
    headers: { "Content-Type": "application/json", "X-Unison-AI-Provider": "anthropic" },
  });
}

export async function createChatCompletion(request: ChatCompletionRequest, signal?: AbortSignal): Promise<Response> {
  const providers = resolveConfiguredProviders(request.model).filter((provider) => (
    provider !== "anthropic" || (!request.stream && !Array.isArray(request.tools))
  ));
  if (providers.length === 0) {
    throw new Error("No AI provider is configured. Set OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY.");
  }

  let lastResponse: Response | undefined;
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const response = provider === "anthropic"
        ? await callAnthropic(request, signal)
        : await callOpenAICompatible(provider, request, signal);
      if (response.ok) return response;
      lastResponse = response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error("All configured AI providers failed");
}
