export type GeminiMessage = { role: string; content: unknown };

function cleanSecretValue(value: string | undefined): string | undefined {
  const cleaned = value
    ?.trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/[\r\n\t ]+/g, "");
  return cleaned || undefined;
}

export function getGeminiApiKey(): string | undefined {
  return (
    cleanSecretValue(Deno.env.get("UNISONGEMINI_API_KEY")) ||
    cleanSecretValue(Deno.env.get("GEMINI_API_KEY")) ||
    cleanSecretValue(Deno.env.get("GOOGLE_API_KEY")) ||
    undefined
  );
}

export function missingGeminiKeyMessage(): string {
  return "Gemini API key is not configured. Set UNISONGEMINI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.";
}

export function coerceGeminiText(content: unknown): string {
  if (typeof content === "string") return content;
  if (content == null) return "";
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
      try { return JSON.stringify(part); } catch { return String(part); }
    }).join("\n").trim();
  }
  if (typeof content === "object" && "text" in content && typeof (content as { text?: unknown }).text === "string") {
    return (content as { text: string }).text;
  }
  try { return JSON.stringify(content); } catch { return String(content); }
}

function toGeminiContents(messages?: GeminiMessage[], userPrompt?: string) {
  const source = messages?.length ? messages : [{ role: "user", content: userPrompt ?? "" }];
  return source
    .filter((message) => message.role !== "system")
    .map((message) => {
      const text = coerceGeminiText(message.content).trim();
      if (!text) return null;
      return {
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      };
    })
    .filter((entry): entry is { role: string; parts: Array<{ text: string }> } => Boolean(entry));
}

export function extractGeminiText(data: unknown): string {
  const parts = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]?.content?.parts;
  return Array.isArray(parts)
    ? parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join("").trim()
    : "";
}

export function cleanJsonText(text: string): string {
  return text.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

export async function callGeminiText(opts: {
  systemPrompt?: string;
  userPrompt?: string;
  messages?: GeminiMessage[];
  model?: string;
  maxOutputTokens?: number;
  responseMimeType?: "application/json" | "text/plain";
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error(missingGeminiKeyMessage());

  const model = opts.model || "gemini-2.5-flash";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? 90_000);
  try {
    const body: Record<string, unknown> = {
      contents: toGeminiContents(opts.messages, opts.userPrompt),
      generationConfig: {
        maxOutputTokens: opts.maxOutputTokens ?? 8192,
        ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
        ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
      },
    };
    if (opts.systemPrompt) body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Gemini error ${response.status}: ${errorText.slice(0, 500)}`);
    }

    const data = await response.json();
    const text = extractGeminiText(data);
    if (!text) throw new Error("Gemini returned no text content");
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callGeminiJson<T = unknown>(opts: Parameters<typeof callGeminiText>[0]): Promise<T> {
  const text = await callGeminiText({ ...opts, responseMimeType: "application/json" });
  return JSON.parse(cleanJsonText(text)) as T;
}

export function openAICompatibleSse(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

export async function callGeminiImage(prompt: string, opts?: { model?: string; timeoutMs?: number }): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error(missingGeminiKeyMessage());

  const model = opts?.model || Deno.env.get("GEMINI_IMAGE_MODEL") || "gemini-2.5-flash-image";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 90_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Gemini image error ${response.status}: ${errorText.slice(0, 500)}`);
    }
    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.find((part: { inlineData?: { data?: string; mimeType?: string }; inline_data?: { data?: string; mime_type?: string } }) => part.inlineData?.data || part.inline_data?.data);
    const b64 = inline?.inlineData?.data || inline?.inline_data?.data;
    const mime = inline?.inlineData?.mimeType || inline?.inline_data?.mime_type || "image/png";
    if (!b64) throw new Error("Gemini returned no image data");
    return `data:${mime};base64,${b64}`;
  } finally {
    clearTimeout(timeoutId);
  }
}