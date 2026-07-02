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
  /** Disable direct provider fallbacks for flows that must only use the managed gateway. */
  allowDirectFallbacks?: boolean;
}): Promise<ProviderCallResult> {
  const { aiMessages, providerPlan, lovableApiKey, reasoningEffort, allowDirectFallbacks = true } = opts;
  let content = '';
  let lastError = '';
  let reasoning = '';
  let modelUsed: string | undefined;

  // Global wall-clock budget so we don't exceed the client's timeout window.
  // Client global abort fires at 150s; reserve ~15s for response packaging/network.
  const TOTAL_BUDGET_MS = 135_000;
  const startedAt = Date.now();
  const budgetRemaining = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);
  const hasDirectOpenAI = allowDirectFallbacks && Boolean(Deno.env.get('OPENAI_API_KEY'));
  const providerErrors: string[] = [];
  let deferredEarlyError: ProviderEarlyError | undefined;
  const recordProviderError = (label: string, detail: string) => {
    const message = `${label}: ${detail}`;
    providerErrors.push(message);
    lastError = message;
  };

  const runDirectOpenAI = async (): Promise<void> => {
    if (!allowDirectFallbacks) return;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY || content) return;

    // When no Lovable gateway key is configured, OpenAI is the PRIMARY provider.
    // Use the plan's per-model timeout so wizard/builder tasks get their full budget
    // (e.g. 110 s for wizard_seed_generation) instead of a hardcoded 25 s cap.
    const isGatewayAbsent = !lovableApiKey;
    const role = isGatewayAbsent ? 'primary' : 'fallback';
    console.log(`[AI-Hybrid] Direct OpenAI configured as ${role} provider`);
    
    const configuredOpenAIModel = Deno.env.get('OPENAI_MODEL');
    const fallbackTokens = providerPlan.fallbackMaxTokens;
    // Model-specific output token limits (max_completion_tokens caps).
    // gpt-4.1 supports 32 768 — enough for a full wizard seed (9+ pages).
    // gpt-4o and gpt-4o-mini top out at 16 384.
    const openaiModels = [
      ...(configuredOpenAIModel
        ? [{ id: configuredOpenAIModel, maxTokens: Math.min(fallbackTokens, 32768), label: `OpenAI ${configuredOpenAIModel}` }]
        : []),
      // gpt-4.1: faster throughput + 32 k output — primary direct-API choice.
      { id: 'gpt-4.1', maxTokens: Math.min(fallbackTokens, 32768), label: 'OpenAI gpt-4.1' },
      { id: 'gpt-4o', maxTokens: Math.min(fallbackTokens, 16384), label: 'OpenAI gpt-4o' },
      { id: 'gpt-4o-mini', maxTokens: Math.min(fallbackTokens, 16384), label: 'OpenAI gpt-4o-mini' },
    ].filter((model, index, models) => models.findIndex(m => m.id === model.id) === index);
    
    for (const model of openaiModels) {
      const remaining = budgetRemaining();
      if (remaining < 8000) {
        console.warn(`[AI-Hybrid] Budget exhausted (${remaining}ms left), skipping remaining OpenAI models`);
        lastError = lastError || 'budget exhausted before all models tried';
        break;
      }
      // Use the plan's per-model timeout — not a hardcoded cap — so large tasks
      // (wizard seed = 110 s) are not artificially cut short.
      const perModelMs = Math.min(providerPlan.perModelTimeoutMs, Math.max(8000, remaining - 2000));
      try {
        console.log(`[AI-Hybrid] Trying ${role} ${model.label} (timeout: ${perModelMs / 1000}s, budget left: ${remaining / 1000}s)...`);
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
            deferredEarlyError ??= earlyError;
            return;
          }
          deferredEarlyError ??= earlyError;
          console.warn(`[AI-Hybrid] ${model.label} returned ${resp.status}; continuing fallback chain...`);
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
        console.log(`[AI-Hybrid] Success with fallback ${model.label}`);
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
  };

  // ── Phase 1: Lovable AI Gateway (PRIMARY) ─────────────────────────────
  // Prefer the managed gateway so workspace OpenAI rate limits do not block generation.
  if (lovableApiKey) {
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
      // Per-model timeout: give the LEAD model the lion's share of the
      // remaining budget (up to its configured cap) so a single fast model
      // can actually finish, and only fall back when it truly fails.
      // Fallback models get whatever is left, floored at 12s so they have
      // a real chance to respond instead of being preemptively starved.
      const isLeadModel = model.id === providerPlan.gatewayModels[0]?.id;
      const cap = providerPlan.perModelTimeoutMs;
      const headroom = Math.max(8000, remaining - 2000);
      const perModelMs = isLeadModel
        ? Math.min(cap, headroom)
        : Math.min(cap, Math.max(12000, headroom));

      try {
        console.log(`[AI-Hybrid] Trying PRIMARY gateway model ${model.label} (timeout: ${perModelMs / 1000}s, budget left: ${remaining / 1000}s)...`);
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
            'Lovable-API-Key': lovableApiKey,
            'X-Lovable-AIG-SDK': 'vercel-ai-sdk',
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
          if (resp.status === 401 || resp.status === 403) {
            deferredEarlyError ??= {
              status: 503,
              error: 'Managed AI gateway authentication failed. The backend key is unavailable or stale; rotate the managed gateway key and redeploy the AI functions.',
            };
          }
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
        console.log(`[AI-Hybrid] Success with PRIMARY gateway ${model.label}`);
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

  // ── Phase 2: Direct OpenAI API (FALLBACK) ─────────────────────────────
  if (allowDirectFallbacks) {
    await runDirectOpenAI();
  }

  // ── Phase 3: Direct Anthropic API fallback ───────────────────────────
  if (!content && allowDirectFallbacks) {
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
    if (deferredEarlyError) {
      return { content: '', reasoning: '', modelUsed: undefined, earlyError: deferredEarlyError };
    }
    const configuredProviders = [
      lovableApiKey ? 'lovable-gateway' : '',
      hasDirectOpenAI ? 'openai' : '',
    ].filter(Boolean);
    const errorTrail = providerErrors.slice(-10).join(' | ') || lastError || 'no provider attempts completed';
    throw new Error(`All AI providers failed. Configured providers: ${configuredProviders.join(', ') || 'none'}. Last errors: ${errorTrail}. Please ensure the managed AI gateway secret is valid and available to backend functions.`);
  }

  return { content, reasoning, modelUsed };
}
