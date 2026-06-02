/**
 * AI provider call loop — gateway + direct API fallbacks.
 * Returns content, reasoning, and the model that succeeded.
 */

import type { ProviderPlan } from "./providerRouter.ts";
import { extractThinkingTags } from "./responseNormalizer.ts";

export interface ProviderEarlyError {
  status: number;
  error: string;
}

export interface ProviderCallResult {
  content: string;
  reasoning: string;
  /** Which model produced the successful response */
  modelUsed?: string;
  /** Non-null when we should return an early HTTP error (rate limit, payment required) */
  earlyError?: ProviderEarlyError;
}

export async function runProviderLoop(opts: {
  aiMessages: Array<{ role: string; content: unknown }>;
  providerPlan: ProviderPlan;
  navPageGen: boolean;
  lovableApiKey?: string;
  reasoningEffort?: "none" | "low" | "medium" | "high";
}): Promise<ProviderCallResult> {
  const { aiMessages, providerPlan, lovableApiKey, reasoningEffort } = opts;
  let content = '';
  let lastError = '';
  let reasoning = '';
  let modelUsed: string | undefined;

  // Global wall-clock budget so we don't exceed the client's timeout window.
  // Client global abort fires at 150s; reserve ~15s for response packaging/network.
  const TOTAL_BUDGET_MS = 135_000;
  const startedAt = Date.now();
  const budgetRemaining = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);
  const hasDirectOpenAI = Boolean(Deno.env.get('OPENAI_API_KEY'));
  const providerErrors: string[] = [];
  let deferredEarlyError: ProviderEarlyError | undefined;
  const recordProviderError = (label: string, detail: string) => {
    const message = `${label}: ${detail}`;
    providerErrors.push(message);
    lastError = message;
  };

  // ── Phase 1: Direct OpenAI API (PRIMARY) ─────────────────────────────
  // OpenAI is the primary provider when available
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (OPENAI_API_KEY) {
    const configuredOpenAIModel = Deno.env.get('OPENAI_MODEL');
    const openaiModels = [
      ...(configuredOpenAIModel
        ? [{ id: configuredOpenAIModel, maxTokens: providerPlan.fallbackMaxTokens, label: `OpenAI ${configuredOpenAIModel}` }]
        : []),
      { id: 'gpt-4o', maxTokens: 16000, label: 'OpenAI gpt-4o' },
      { id: 'gpt-4o-mini', maxTokens: 16000, label: 'OpenAI gpt-4o-mini' },
    ].filter((model, index, models) => models.findIndex(m => m.id === model.id) === index);
    
    for (const model of openaiModels) {
      const remaining = budgetRemaining();
      if (remaining < 8000) {
        console.warn(`[AI-Hybrid] Budget exhausted (${remaining}ms left), skipping remaining OpenAI models`);
        lastError = lastError || 'budget exhausted before all models tried';
        break;
      }
      const perModelMs = Math.min(25000, Math.max(8000, remaining - 2000));
      try {
        console.log(`[AI-Hybrid] Trying PRIMARY OpenAI ${model.label} (timeout: ${perModelMs / 1000}s, budget left: ${remaining / 1000}s)...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), perModelMs);
        
        const requestBody: Record<string, unknown> = {
          model: model.id,
          messages: aiMessages,
          max_completion_tokens: model.maxTokens,
        };
        
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.status === 429 || resp.status === 402) {
          const errText = await resp.text().catch(() => '');
          const earlyError: ProviderEarlyError = resp.status === 429
            ? { status: 429, error: 'Rate limit exceeded. Please try again later.' }
            : { status: 402, error: 'Payment required. Please add credits to your OpenAI account.' };
          recordProviderError(model.label, `${resp.status}${errText ? ` ${errText.substring(0, 200)}` : ''}`);
          if (!lovableApiKey) {
            return { content: '', reasoning: '', modelUsed: undefined, earlyError };
          }
          deferredEarlyError ??= earlyError;
          console.warn(`[AI-Hybrid] ${model.label} returned ${resp.status}; trying Lovable gateway fallback...`);
          break;
        }

        if (!resp.ok) {
          const errText = await resp.text();
          console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 300)}`);
          if (resp.status === 400) {
            console.error(`[AI-Hybrid] 400 Bad Request for ${model.id}. Request body keys: ${Object.keys(requestBody).join(', ')}`);
          }
          recordProviderError(model.label, `${resp.status} ${errText.substring(0, 200)}`);
          continue;
        }

        const responseText = await resp.text();
        if (!responseText || responseText.trim() === '') {
          console.warn(`[AI-Hybrid] ${model.label} returned empty response, trying next...`);
          recordProviderError(model.label, 'empty response');
          continue;
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.warn(`[AI-Hybrid] ${model.label} returned invalid JSON, trying next...`);
          recordProviderError(model.label, 'invalid JSON');
          continue;
        }

        const parsedContent = data.choices?.[0]?.message?.content || '';
        if (!parsedContent) {
          console.warn(`[AI-Hybrid] ${model.label} returned no content, trying next...`);
          recordProviderError(model.label, 'no content');
          continue;
        }

        const extracted = extractThinkingTags(parsedContent);
        if (extracted.reasoning) {
          reasoning = extracted.reasoning;
          console.log(`[AI-Hybrid] Thinking tags extracted from ${model.label}: ${extracted.reasoning.length} chars`);
        }
        content = extracted.content;
        modelUsed = model.id;
        console.log(`[AI-Hybrid] Success with PRIMARY ${model.label}`);
        break;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn(`[AI-Hybrid] ${model.label} timed out, trying next...`);
          recordProviderError(model.label, 'timeout');
          continue;
        }
        console.warn(`[AI-Hybrid] ${model.label} failed:`, err);
        recordProviderError(model.label, err instanceof Error ? err.message : 'unknown');
        continue;
      }
    }
  }

  // ── Phase 2: Lovable AI Gateway (FALLBACK) ───────────────────────────
  // Lovable gateway is secondary fallback if OpenAI is unavailable or fails
  if (!content && lovableApiKey) {
    // Log total prompt size for debugging
    const totalChars = aiMessages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0);
    console.log(`[AI-Hybrid] Total prompt size: ${totalChars} chars across ${aiMessages.length} messages`);
    
    for (const model of providerPlan.gatewayModels) {
      const remaining = budgetRemaining();
      if (remaining < 8000) {
        console.warn(`[AI-Hybrid] Budget exhausted (${remaining}ms left), skipping remaining gateway models`);
        lastError = lastError || 'budget exhausted before all models tried';
        break;
      }
      // Per-model timeout = min(configured, half of remaining budget) so that a
      // single slow model can't burn the entire budget and starve fallbacks.
      const halfBudget = Math.max(15000, Math.floor(remaining / 2));
      const perModelMs = Math.min(providerPlan.perModelTimeoutMs, halfBudget, Math.max(8000, remaining - 2000));
      try {
        console.log(`[AI-Hybrid] Trying FALLBACK gateway model ${model.label} (timeout: ${perModelMs / 1000}s, budget left: ${remaining / 1000}s)...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), perModelMs);

        const usesCompletionTokens = model.id.includes('gpt-5');
        const reqBody: Record<string, unknown> = {
          model: model.id,
          ...(usesCompletionTokens
            ? { max_completion_tokens: model.maxTokens }
            : { max_tokens: model.maxTokens }),
          messages: aiMessages,
        };
        // Only send reasoning parameter for supported models and only via the correct API format
        // The Lovable AI Gateway passes `reasoning` through for OpenAI models only
        if (reasoningEffort && reasoningEffort !== "none" && model.id.startsWith('openai/')) {
          reqBody.reasoning = { effort: reasoningEffort };
        }

        const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reqBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.status === 429 || resp.status === 402) {
          const errText = await resp.text().catch(() => '');
          const earlyError: ProviderEarlyError = resp.status === 429
            ? { status: 429, error: 'Rate limit exceeded. Please try again later.' }
            : { status: 402, error: 'Payment required. Please add credits to your workspace.' };
          recordProviderError(model.label, `${resp.status}${errText ? ` ${errText.substring(0, 200)}` : ''}`);
          deferredEarlyError ??= earlyError;
          console.warn(`[AI-Hybrid] ${model.label} returned ${resp.status}; trying next provider...`);
          break;
        }

        if (!resp.ok) {
          const errText = await resp.text();
          console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 300)}`);
          // For 400 errors, log full detail to help diagnose parameter issues
          if (resp.status === 400) {
            console.error(`[AI-Hybrid] 400 Bad Request for ${model.id}. Request body keys: ${Object.keys(reqBody).join(', ')}`);
          }
          recordProviderError(model.label, `${resp.status} ${errText.substring(0, 200)}`);
          continue;
        }

        const responseText = await resp.text();
        if (!responseText || responseText.trim() === '') {
          console.warn(`[AI-Hybrid] ${model.label} returned empty response, trying next...`);
          recordProviderError(model.label, 'empty response');
          continue;
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.warn(`[AI-Hybrid] ${model.label} returned invalid JSON, trying next...`);
          recordProviderError(model.label, 'invalid JSON');
          continue;
        }

        const parsedContent = data.choices?.[0]?.message?.content || '';
        if (!parsedContent) {
          console.warn(`[AI-Hybrid] ${model.label} returned no content, trying next...`);
          recordProviderError(model.label, 'no content');
          continue;
        }

        const extracted = extractThinkingTags(parsedContent);
        if (extracted.reasoning) {
          reasoning = extracted.reasoning;
          console.log(`[AI-Hybrid] Thinking tags extracted from ${model.label}: ${extracted.reasoning.length} chars`);
        }
        content = extracted.content;
        modelUsed = model.id;
        console.log(`[AI-Hybrid] Success with FALLBACK ${model.label}`);
        break;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn(`[AI-Hybrid] ${model.label} timed out, trying next...`);
          recordProviderError(model.label, 'timeout');
          continue;
        }
        console.warn(`[AI-Hybrid] ${model.label} failed:`, err);
        recordProviderError(model.label, err instanceof Error ? err.message : 'unknown');
        continue;
      }
    }
  }

  // ── Phase 3: Direct Anthropic API fallback ───────────────────────────
  if (!content) {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (ANTHROPIC_API_KEY) {
      const remaining = budgetRemaining();
      if (remaining >= 8000) {
        const perModelMs = Math.min(28000, Math.max(8000, remaining - 2000));
        try {
          const systemMsg = (aiMessages.find((m) => m.role === 'system')?.content as string) || '';
          const userMsgs = aiMessages.filter((m) => m.role !== 'system');
          console.log(`[AI-Hybrid] Trying direct Anthropic claude-sonnet-4-5 (timeout: ${perModelMs / 1000}s)...`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), perModelMs);
          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-5',
              max_tokens: providerPlan.fallbackMaxTokens,
              system: systemMsg,
              messages: userMsgs,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!resp.ok) {
            const errText = await resp.text();
            recordProviderError('Anthropic claude-sonnet-4-5', `${resp.status} ${errText.substring(0, 200)}`);
          } else {
            const data = await resp.json();
            const blocks = Array.isArray(data.content) ? data.content : [];
            const textBlock = blocks.find((b: { type?: string; text?: string }) => b.type === 'text');
            const parsedContent = textBlock?.text || '';
            if (parsedContent) {
              const extracted = extractThinkingTags(parsedContent);
              if (extracted.reasoning) reasoning = extracted.reasoning;
              content = extracted.content;
              modelUsed = 'claude-sonnet-4-5';
              console.log('[AI-Hybrid] Success with direct Anthropic claude-sonnet-4-5');
            } else {
              recordProviderError('Anthropic claude-sonnet-4-5', 'no content');
            }
          }
        } catch (err) {
          recordProviderError('Anthropic claude-sonnet-4-5', err instanceof Error ? err.message : 'unknown');
        }
      }
    }
  }

  if (!content) {
    if (deferredEarlyError && providerErrors.length === 1) {
      return { content: '', reasoning: '', modelUsed: undefined, earlyError: deferredEarlyError };
    }
    const configuredProviders = [
      lovableApiKey ? 'lovable-gateway' : '',
      hasDirectOpenAI ? 'openai' : '',
    ].filter(Boolean);
    const errorTrail = providerErrors.slice(-10).join(' | ') || lastError || 'no provider attempts completed';
    throw new Error(`All AI providers failed. Configured providers: ${configuredProviders.join(', ') || 'none'}. Last errors: ${errorTrail}. Please ensure LOVABLE_API_KEY and OPENAI_API_KEY are valid Supabase secrets.`);
  }

  return { content, reasoning, modelUsed };
}
