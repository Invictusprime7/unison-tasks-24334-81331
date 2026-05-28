/**
 * AI provider call loop — direct Gemini only.
 * Returns content, reasoning, and the model that succeeded.
 */

import type { ProviderPlan } from "./providerRouter.ts";
import { extractThinkingTags } from "./responseNormalizer.ts";
import { coerceGeminiText, extractGeminiText, getGeminiApiKey, missingGeminiKeyMessage } from "../_shared/gemini.ts";

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type GeminiContent = { role: string; parts: GeminiPart[] };

function mapGatewayGeminiIdToDirect(id: string): string {
  const normalized = id.replace(/^google\//, '').trim();
  const aliases: Record<string, string> = {
    'gemini-3-flash-preview': 'gemini-2.5-flash',
    'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
    'gemini-2.5-flash': 'gemini-2.5-flash',
    'gemini-2.5-pro': 'gemini-2.5-pro',
  };
  return aliases[normalized] ?? normalized;
}

function isRetryableGeminiStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function retryDelayMs(attempt: number): number {
  return 900 * (attempt + 1);
}

function parseDataUrl(value: string): { mimeType: string; data: string } | null {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function openAIContentPartToGemini(part: unknown): GeminiPart[] {
  if (typeof part === 'string') return part.trim() ? [{ text: part }] : [];
  if (!part || typeof part !== 'object') return [];

  const candidate = part as {
    type?: unknown;
    text?: unknown;
    image_url?: { url?: unknown };
    imageUrl?: { url?: unknown };
    data?: unknown;
    mimeType?: unknown;
    mime_type?: unknown;
    name?: unknown;
  };

  if (candidate.type === 'text' && typeof candidate.text === 'string') {
    return candidate.text.trim() ? [{ text: candidate.text }] : [];
  }

  if (typeof candidate.text === 'string' && candidate.text.trim()) {
    return [{ text: candidate.text }];
  }

  const imageUrl = candidate.image_url?.url || candidate.imageUrl?.url || candidate.data;
  if (
    (candidate.type === 'image_url' || candidate.type === 'input_image' || candidate.type === 'image') &&
    typeof imageUrl === 'string'
  ) {
    const dataUrl = parseDataUrl(imageUrl);
    if (dataUrl) return [{ inlineData: dataUrl }];

    // Gemini direct API cannot fetch arbitrary browser URLs as inline media.
    // Preserve the reference as text instead of silently dropping it.
    return [{
      text: `Attached image reference${typeof candidate.name === 'string' ? ` (${candidate.name})` : ''}: ${imageUrl}`,
    }];
  }

  const maybeData = typeof candidate.data === 'string' ? parseDataUrl(candidate.data) : null;
  if (maybeData) return [{ inlineData: maybeData }];

  return [];
}

function messageToGeminiContent(message: { role: string; content: unknown }): GeminiContent | null {
  const role = message.role === 'assistant' ? 'model' : 'user';
  const parts = Array.isArray(message.content)
    ? message.content.flatMap(openAIContentPartToGemini)
    : openAIContentPartToGemini(message.content);

  if (parts.length > 0) return { role, parts };

  const text = coerceGeminiText(message.content).trim();
  return text ? { role, parts: [{ text }] } : null;
}

export interface ProviderEarlyError {
  status: number;
  error: string;
}

export interface ProviderCallResult {
  content: string;
  reasoning: string;
  /** Which model produced the successful response */
  modelUsed?: string;
  /** Non-null when we should return an early HTTP error */
  earlyError?: ProviderEarlyError;
}

export async function runProviderLoop(opts: {
  aiMessages: Array<{ role: string; content: unknown }>;
  providerPlan: ProviderPlan;
  navPageGen: boolean;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  /** Force JSON response mode for wizard lanes. */
  forceJsonResponse?: boolean;
  /** Task type — used to choose the right model budget from providerPlan */
  taskType?: string;
}): Promise<ProviderCallResult> {
  const { aiMessages, providerPlan, forceJsonResponse, taskType } = opts;
  void opts.navPageGen;
  const reasoningEffort = opts.reasoningEffort ?? 'medium';

  const geminiApiKey = getGeminiApiKey();
  if (!geminiApiKey) {
    return {
      content: '',
      reasoning: '',
      modelUsed: undefined,
      earlyError: { status: 503, error: missingGeminiKeyMessage() },
    };
  }

  const isWizardLane = taskType === 'wizard_template_react';
  const totalBudgetMs = isWizardLane ? 145_000 : 145_000;
  const wizardMaxOutputTokens = 24_000;
  const startedAt = Date.now();
  const budgetRemaining = () => totalBudgetMs - (Date.now() - startedAt);

  const providerErrors: string[] = [];
  let deferredEarlyError: ProviderEarlyError | undefined;
  let content = '';
  let reasoning = '';
  let modelUsed: string | undefined;

  const recordProviderError = (label: string, detail: string) => {
    providerErrors.push(`${label}: ${detail}`);
  };

  const geminiModelsFromPlan = (providerPlan.gatewayModels || [])
    .filter((model) => model.id.startsWith('google/'))
    .map((model) => ({
      id: mapGatewayGeminiIdToDirect(model.id),
      maxTokens: model.maxTokens,
      label: `Gemini ${mapGatewayGeminiIdToDirect(model.id)}`,
    }))
    .filter((model, index, models) => models.findIndex((candidate) => candidate.id === model.id) === index);

  const geminiModels = geminiModelsFromPlan.length > 0
    ? geminiModelsFromPlan
    : [
        { id: 'gemini-2.5-flash-lite', maxTokens: providerPlan.fallbackMaxTokens, label: 'Gemini gemini-2.5-flash-lite' },
        { id: 'gemini-2.5-flash', maxTokens: providerPlan.fallbackMaxTokens, label: 'Gemini gemini-2.5-flash' },
        { id: 'gemini-2.5-pro', maxTokens: providerPlan.fallbackMaxTokens, label: 'Gemini gemini-2.5-pro' },
      ];

  const orderedGeminiModels = isWizardLane
    ? [...geminiModels]
        .sort((a, b) => {
          const score = (id: string) => {
            if (id.includes('flash-lite')) return 0;
            if (id.includes('flash')) return 1;
            if (id.includes('pro')) return 2;
            return 3;
          };
          return score(a.id) - score(b.id);
        })
        .slice(0, 3)
    : geminiModels;

  const systemInstructionText = aiMessages
    .filter((message) => message.role === 'system')
    .map((message) => coerceGeminiText(message.content))
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const conversationContents = aiMessages
    .filter((message) => message.role !== 'system')
    .map(messageToGeminiContent)
    .filter((entry): entry is GeminiContent => Boolean(entry));

  for (const model of orderedGeminiModels) {
    const maxAttempts = isWizardLane ? 2 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const remaining = budgetRemaining();
      if (remaining < 8000) {
        recordProviderError(model.label, 'budget exhausted');
        break;
      }

      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt - 1)));
      }

      const phaseCapMs = isWizardLane ? 42_000 : (providerPlan.perModelTimeoutMs || 60_000);
      const perModelMs = Math.min(phaseCapMs, Math.max(8000, remaining - 2000));
      const attemptLabel = maxAttempts > 1 ? `${model.label} attempt ${attempt + 1}` : model.label;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), perModelMs);

      try {
        const geminiBody: Record<string, unknown> = {
          contents: conversationContents.length > 0
            ? conversationContents
            : [{ role: 'user', parts: [{ text: 'Generate the requested output.' }] }],
          generationConfig: {
            maxOutputTokens: Math.min(model.maxTokens, isWizardLane ? wizardMaxOutputTokens : 32_768),
            ...(reasoningEffort === 'none' ? { temperature: 0.2 } : {}),
            ...(reasoningEffort === 'high' ? { temperature: 0.7 } : {}),
            ...(forceJsonResponse ? { responseMimeType: 'application/json' } : {}),
          },
        };

        if (systemInstructionText) {
          geminiBody.systemInstruction = { parts: [{ text: systemInstructionText }] };
        }

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.id)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody),
            signal: controller.signal,
          },
        );

        if (resp.status === 429) {
          const errText = await resp.text().catch(() => '');
          deferredEarlyError ??= { status: 429, error: 'Rate limit exceeded. Please try again later.' };
          recordProviderError(attemptLabel, `${resp.status}${errText ? ` ${errText.substring(0, 200)}` : ''}`);
          continue;
        }

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          recordProviderError(attemptLabel, `${resp.status} ${errText.substring(0, 200)}`);
          if (isRetryableGeminiStatus(resp.status)) continue;
          break;
        }

        const data = await resp.json();
        const parsedContent = extractGeminiText(data);

        if (!parsedContent) {
          const blockReason = data?.promptFeedback?.blockReason;
          recordProviderError(attemptLabel, blockReason ? `blocked (${blockReason})` : 'no content');
          continue;
        }

        const extracted = extractThinkingTags(parsedContent);
        if (extracted.reasoning) reasoning = extracted.reasoning;
        content = extracted.content;
        modelUsed = `google/${model.id}`;
        break;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          recordProviderError(attemptLabel, 'timeout');
          continue;
        }
        recordProviderError(attemptLabel, error instanceof Error ? error.message : 'unknown');
        continue;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (content) break;
  }

  if (content) {
    return { content, reasoning, modelUsed };
  }

  if (deferredEarlyError && providerErrors.length === 1) {
    return { content: '', reasoning: '', modelUsed: undefined, earlyError: deferredEarlyError };
  }

  const errorTrail = providerErrors.slice(-10).join(' | ') || 'no provider attempts completed';
  const configuredProviders = [geminiApiKey ? 'gemini-direct' : ''].filter(Boolean);
  const hasTimeoutError = /timeout|timed out|aborterror|aborted/.test(errorTrail.toLowerCase());
  const guidance = configuredProviders.length === 0
    ? missingGeminiKeyMessage()
    : hasTimeoutError
      ? 'Gemini timed out. This is typically prompt size, latency, or network pressure.'
      : 'Gemini failed to produce a response. Check key validity and edge-function network latency.';

  throw new Error(
    `All AI providers failed. Configured providers: ${configuredProviders.join(', ') || 'none'}. Last errors: ${errorTrail}. ${guidance}`,
  );
}

export default runProviderLoop;
