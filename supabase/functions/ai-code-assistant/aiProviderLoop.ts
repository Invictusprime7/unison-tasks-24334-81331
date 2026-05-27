/**
 * AI provider call loop — direct Gemini only.
 * Returns content, reasoning, and the model that succeeded.
 */

import type { ProviderPlan } from "./providerRouter.ts";
import { extractThinkingTags } from "./responseNormalizer.ts";

function coerceMessageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content == null) return '';
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
          return (part as { text: string }).text;
        }
        try {
          return JSON.stringify(part);
        } catch {
          return String(part);
        }
      })
      .join('\n')
      .trim();
  }
  if (typeof content === 'object' && content && 'text' in content && typeof (content as { text?: unknown }).text === 'string') {
    return (content as { text: string }).text;
  }
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

function mapGatewayGeminiIdToDirect(id: string): string {
  const normalized = id.replace(/^google\//, '').trim();
  const aliases: Record<string, string> = {
    'gemini-3-flash-preview': 'gemini-2.5-flash',
    'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
    'gemini-2.5-pro': 'gemini-2.5-pro',
  };
  return aliases[normalized] ?? normalized;
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
  void opts.reasoningEffort;

  const geminiApiKey = Deno.env.get('UNISONGEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
  if (!geminiApiKey) {
    return {
      content: '',
      reasoning: '',
      modelUsed: undefined,
      earlyError: { status: 503, error: 'No Gemini API key configured. Set GEMINI_API_KEY or GOOGLE_API_KEY in Supabase secrets.' },
    };
  }

  const isWizardLane = taskType === 'wizard_template_react';
  const totalBudgetMs = isWizardLane ? 70_000 : 135_000;
  const wizardMaxOutputTokens = 8_000;
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
        .slice(0, 2)
    : geminiModels;

  const systemInstructionText = aiMessages
    .filter((message) => message.role === 'system')
    .map((message) => coerceMessageText(message.content))
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const conversationContents = aiMessages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      const role = message.role === 'assistant' ? 'model' : 'user';
      const text = coerceMessageText(message.content).trim();
      return text ? { role, parts: [{ text }] } : null;
    })
    .filter((entry): entry is { role: string; parts: Array<{ text: string }> } => Boolean(entry));

  for (const model of orderedGeminiModels) {
    const remaining = budgetRemaining();
    if (remaining < 8000) {
      recordProviderError(model.label, 'budget exhausted');
      break;
    }

    const phaseCapMs = isWizardLane ? 15_000 : (providerPlan.perModelTimeoutMs || 60_000);
    const perModelMs = Math.min(phaseCapMs, Math.max(8000, remaining - 2000));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), perModelMs);

      const geminiBody: Record<string, unknown> = {
        contents: conversationContents.length > 0
          ? conversationContents
          : [{ role: 'user', parts: [{ text: 'Generate the requested output.' }] }],
        generationConfig: {
          maxOutputTokens: Math.min(model.maxTokens, isWizardLane ? wizardMaxOutputTokens : 32_768),
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

      clearTimeout(timeoutId);

      if (resp.status === 429) {
        const errText = await resp.text().catch(() => '');
        deferredEarlyError ??= { status: 429, error: 'Rate limit exceeded. Please try again later.' };
        recordProviderError(model.label, `${resp.status}${errText ? ` ${errText.substring(0, 200)}` : ''}`);
        continue;
      }

      if (!resp.ok) {
        const errText = await resp.text();
        recordProviderError(model.label, `${resp.status} ${errText.substring(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      const parsedContent = Array.isArray(parts)
        ? parts
            .map((part: { text?: string }) => (typeof part?.text === 'string' ? part.text : ''))
            .join('')
            .trim()
        : '';

      if (!parsedContent) {
        const blockReason = data?.promptFeedback?.blockReason;
        recordProviderError(model.label, blockReason ? `blocked (${blockReason})` : 'no content');
        continue;
      }

      const extracted = extractThinkingTags(parsedContent);
      if (extracted.reasoning) reasoning = extracted.reasoning;
      content = extracted.content;
      modelUsed = `google/${model.id}`;
      break;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        recordProviderError(model.label, 'timeout');
        continue;
      }
      recordProviderError(model.label, error instanceof Error ? error.message : 'unknown');
    }
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
    ? 'No Gemini API key is configured. Set GEMINI_API_KEY or GOOGLE_API_KEY in Supabase secrets.'
    : hasTimeoutError
      ? 'Gemini timed out. This is typically prompt size, latency, or network pressure.'
      : 'Gemini failed to produce a response. Check key validity and edge-function network latency.';

  throw new Error(
    `All AI providers failed. Configured providers: ${configuredProviders.join(', ') || 'none'}. Last errors: ${errorTrail}. ${guidance}`,
  );
}

export default runProviderLoop;