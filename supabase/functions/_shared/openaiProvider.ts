export type AiChatMessage = {
  role: string;
  content: string;
};

export type AiChatOptions = {
  messages: AiChatMessage[];
  responseFormat?: { type: "json_object" };
  temperature?: number;
  maxCompletionTokens?: number;
  timeoutMs?: number;
  fallbackGateway?: boolean;
  logPrefix?: string;
};

export type AiChatResult = {
  content: string;
  provider: "openai" | "lovable-gateway";
  model: string;
};

type ProviderAttempt = {
  provider: "openai" | "lovable-gateway";
  model: string;
  url: string;
  key: string;
};

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export function getOpenAIKey(): string | undefined {
  return Deno.env.get("OPENAI_API_KEY") || Deno.env.get("VITE_OPENAI_API_KEY") || undefined;
}

export function hasOpenAITextProvider(): boolean {
  return Boolean(getOpenAIKey() || Deno.env.get("LOVABLE_API_KEY"));
}

export async function generateOpenAIChatCompletion(opts: AiChatOptions): Promise<AiChatResult> {
  const openaiApiKey = getOpenAIKey();
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const openaiModel = Deno.env.get("OPENAI_MODEL") || "gpt-4.1";
  const gatewayOpenAIModel = Deno.env.get("LOVABLE_OPENAI_MODEL") || "openai/gpt-5-mini";
  const attempts: ProviderAttempt[] = [];

  if (openaiApiKey) {
    attempts.push({
      provider: "openai",
      model: openaiModel,
      url: OPENAI_CHAT_URL,
      key: openaiApiKey,
    });
  }

  if (opts.fallbackGateway !== false && lovableApiKey) {
    attempts.push({
      provider: "lovable-gateway",
      model: gatewayOpenAIModel,
      url: LOVABLE_CHAT_URL,
      key: lovableApiKey,
    });
  }

  if (attempts.length === 0) {
    throw new Error("No OpenAI provider configured. Set OPENAI_API_KEY or LOVABLE_API_KEY.");
  }

  const errors: string[] = [];
  for (const attempt of attempts) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);
    try {
      console.log(`${opts.logPrefix ?? "[openai-provider]"} Trying ${attempt.provider}:${attempt.model}`);
      const body: Record<string, unknown> = {
        model: attempt.model,
        messages: opts.messages,
        max_completion_tokens: opts.maxCompletionTokens ?? 16_384,
      };
      if (opts.temperature !== undefined) body.temperature = opts.temperature;
      if (opts.responseFormat) body.response_format = opts.responseFormat;

      const response = await fetch(attempt.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${attempt.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        errors.push(`${attempt.provider}:${attempt.model} ${response.status} ${errorText.slice(0, 300)}`);
        if ([401, 402, 403, 408, 429, 500, 502, 503, 504].includes(response.status)) {
          continue;
        }
        break;
      }

      const data = await response.json();
      const content = String(data?.choices?.[0]?.message?.content ?? "");
      if (content.trim()) {
        return { content, provider: attempt.provider, model: attempt.model };
      }
      errors.push(`${attempt.provider}:${attempt.model} returned empty content`);
    } catch (error) {
      const message = error instanceof Error
        ? (error.name === "AbortError" ? "request timed out" : error.message)
        : String(error);
      errors.push(`${attempt.provider}:${attempt.model} ${message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`OpenAI provider attempts failed: ${errors.join(" | ")}`);
}

export async function generateOpenAIImage(opts: {
  prompt: string;
  size?: "1024x1024" | "1536x1024" | "1024x1536";
  quality?: "low" | "medium" | "high";
  timeoutMs?: number;
}): Promise<string> {
  const openaiApiKey = getOpenAIKey();
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required for image generation.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-1",
        prompt: opts.prompt,
        n: 1,
        size: opts.size ?? "1024x1024",
        quality: opts.quality ?? "medium",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`OpenAI image generation failed: ${response.status} ${errorText.slice(0, 300)}`);
    }

    const data = await response.json();
    const imageData = data?.data?.[0]?.b64_json;
    if (typeof imageData === "string" && imageData) {
      return `data:image/png;base64,${imageData}`;
    }

    const imageUrl = data?.data?.[0]?.url;
    if (typeof imageUrl === "string" && imageUrl) {
      return imageUrl;
    }

    throw new Error("OpenAI image response did not include an image.");
  } finally {
    clearTimeout(timeoutId);
  }
}
