/**
 * AI provider call loop using direct provider APIs.
 * Returns content, reasoning, and the model that succeeded.
 */

import type { ProviderPlan } from "./providerRouter.ts";
import { extractThinkingTags } from "./responseNormalizer.ts";
import {
  createLastResortGatewayChatCompletion,
  createPlannedChatCompletion,
} from "../_shared/ai/providerClient.ts";
import type { ChatCompletionRequest } from "../_shared/ai/providerClient.ts";
import type { ModelSpec } from './providerRouter.ts';

export interface ProviderEarlyError {
  status: number;
  error: string;
}

export interface RawToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
  name?: string;
  arguments?: unknown;
}

export interface ProviderCallResult {
  content: string;
  reasoning: string;
  /** Which model produced the successful response */
  modelUsed?: string;
  /** Direct provider that served the successful response. */
  providerUsed?: string;
  /** OpenAI-shaped tool_calls returned by the model (chat completions style). */
  toolCalls?: RawToolCall[];
  /** Non-null when we should return an early HTTP error (rate limit, payment required) */
  earlyError?: ProviderEarlyError;
}

export function buildPlannedChatCompletionRequest(opts: {
  model: ModelSpec;
  aiMessages: Array<{ role: string; content: unknown }>;
  reasoningEffort?: "none" | "low" | "medium" | "high";
  tools?: unknown[];
  toolChoice?: unknown;
}): ChatCompletionRequest {
  const { model, aiMessages, reasoningEffort, tools, toolChoice } = opts;
  const usesCompletionTokens = model.id.includes('gpt-5');
  const request: ChatCompletionRequest = {
    model: model.id,
    ...(usesCompletionTokens
      ? { max_completion_tokens: model.maxTokens }
      : { max_tokens: model.maxTokens }),
    messages: aiMessages,
  };

  if (reasoningEffort && reasoningEffort !== 'none') {
    request.reasoning_effort = reasoningEffort;
  }
  if (tools && tools.length > 0) {
    request.tools = tools;
    request.tool_choice = toolChoice ?? 'auto';
  }
  return request;
}

export async function runProviderLoop(opts: {
  aiMessages: Array<{ role: string; content: unknown }>;
  providerPlan: ProviderPlan;
  navPageGen: boolean;
  reasoningEffort?: "none" | "low" | "medium" | "high";
  /** Disable direct provider attempts for flows that do not need AI generation. */
  allowDirectFallbacks?: boolean;
  /** OpenAI-compatible chat-completions `tools` array (function tools). */
  tools?: unknown[];
  /** `tool_choice` forwarded to the provider. Defaults to `"auto"` when tools are present. */
  toolChoice?: "auto" | "none" | "required";
  /** Cancels provider work when the browser request disconnects or expires. */
  signal?: AbortSignal;
}): Promise<ProviderCallResult> {
  const { aiMessages, providerPlan, reasoningEffort, allowDirectFallbacks = true, tools, toolChoice, signal } = opts;
  const hasTools = Array.isArray(tools) && tools.length > 0;
  const effectiveToolChoice = hasTools ? (toolChoice ?? "auto") : undefined;
  let content = '';
  let lastError = '';
  let reasoning = '';
  let modelUsed: string | undefined;
  let providerUsed: string | undefined;
  let toolCalls: RawToolCall[] | undefined;

  // Hard server deadline. Keep enough headroom for validation, one targeted
  // repair, persistence and the response trip before the browser deadline.
  // Provider failover is owned here; providerClient must not nest another
  // fallback chain inside these attempts.
  const TOTAL_BUDGET_MS = 105_000;
  const startedAt = Date.now();
  const budgetRemaining = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);
  const hasDirectOpenAI = allowDirectFallbacks && Boolean(Deno.env.get('OPENAI_API_KEY'));
  const hasDirectGemini = allowDirectFallbacks && Boolean(Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('UNISONGEMINI_API_KEY'));
  const hasLastResortGateway = allowDirectFallbacks && Boolean(Deno.env.get('LOVABLE_API_KEY'));
  const lastResortReserveMs = hasLastResortGateway ? 20_000 : 0;
  const providerErrors: string[] = [];
  let deferredEarlyError: ProviderEarlyError | undefined;
  // Tracks whether any provider failed for a non-rate-limit reason (timeout,
  // 500, empty response, etc.). When true, a deferred 429 from one provider
  // must NOT mask the real failure — the client would show "rate limited" even
  // though the actual cause was a timeout on a different provider.
  let hadNonRateLimitError = false;
  const recordProviderError = (label: string, detail: string) => {
    const message = `${label}: ${detail}`;
    providerErrors.push(message);
    lastError = message;
    if (!/429|rate limit|402|payment required/i.test(detail)) {
      hadNonRateLimitError = true;
    }
  };
  const createAttemptSignal = (timeoutMs: number) => {
    const controller = new AbortController();
    const onOuterAbort = () => controller.abort(signal?.reason);
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason);
      else signal.addEventListener('abort', onOuterAbort, { once: true });
    }
    const timeoutId = setTimeout(() => controller.abort(new DOMException('Provider attempt timed out', 'TimeoutError')), timeoutMs);
    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onOuterAbort);
      },
    };
  };
  const throwIfCancelled = () => {
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new DOMException('Request aborted', 'AbortError');
    }
  };

  const runDirectOpenAI = async (): Promise<void> => {
    if (!allowDirectFallbacks) return;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY || content) return;

    // OpenAI is a direct provider in the local and deployed runtime.
    // Use the plan's per-model timeout so wizard/builder tasks get their full budget
    // (e.g. 110 s for wizard_seed_generation) instead of a hardcoded 25 s cap.
    const role = 'direct';
    console.log(`[AI-Hybrid] Direct OpenAI configured as ${role} provider`);
    
    const configuredOpenAIModel = Deno.env.get('OPENAI_MODEL');
    const fallbackTokens = providerPlan.fallbackMaxTokens;
    // Model-specific output token limits (max_completion_tokens caps).
    // gpt-4.1 supports 32 768 — enough for a full wizard seed (9+ pages).
    // Keep this native fallback list short: planned routing owns normal model
    // selection, while this branch only covers a provider family omitted from
    // the plan.
    const openaiModels = [
      ...(configuredOpenAIModel
        ? [{ id: configuredOpenAIModel, maxTokens: Math.min(fallbackTokens, 32768), label: `OpenAI ${configuredOpenAIModel}` }]
        : []),
      // gpt-4.1: faster throughput + 32 k output — primary direct-API choice.
      { id: 'gpt-4.1', maxTokens: Math.min(fallbackTokens, 32768), label: 'OpenAI gpt-4.1' },
    ].filter((model, index, models) => models.findIndex(m => m.id === model.id) === index);
    
    for (const model of openaiModels) {
      throwIfCancelled();
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
        const attempt = createAttemptSignal(perModelMs);
        
        const requestBody: Record<string, unknown> = {
          model: model.id,
          messages: aiMessages,
          max_completion_tokens: model.maxTokens,
        };
        if (hasTools) {
          requestBody.tools = tools;
          requestBody.tool_choice = effectiveToolChoice;
        }
        
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: attempt.signal,
        });
        attempt.cleanup();

        if (resp.status === 429 || resp.status === 402) {
          const errText = await resp.text().catch(() => '');
          const earlyError: ProviderEarlyError = resp.status === 429
            ? { status: 429, error: 'Rate limit exceeded. Please try again later.' }
            : { status: 402, error: 'Payment required. Please add credits to your OpenAI account.' };
          recordProviderError(model.label, `${resp.status}${errText ? ` ${errText.substring(0, 200)}` : ''}`);
          deferredEarlyError ??= earlyError;
          console.warn(`[AI-Hybrid] ${model.label} returned ${resp.status}; continuing fallback chain...`);
          // A 429 is per-model/tier, not terminal for the whole chain: keep
          // walking the remaining models (including other provider families)
          // instead of aborting generation on the first rate limit.
          if (resp.status === 429) continue;
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

        const message = data.choices?.[0]?.message ?? {};
        const parsedContent = message.content || '';
        const parsedToolCalls = Array.isArray(message.tool_calls) ? (message.tool_calls as RawToolCall[]) : undefined;
        if (!parsedContent && (!parsedToolCalls || parsedToolCalls.length === 0)) {
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
        providerUsed = 'openai';
        if (parsedToolCalls && parsedToolCalls.length > 0) toolCalls = parsedToolCalls;
        console.log(`[AI-Hybrid] Success with fallback ${model.label}`);
        break;
      } catch (err) {
        throwIfCancelled();
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

  // ── Direct Gemini API helper ──────────────────────────────────────────
  // gemini-2.5-flash supports 65 536 output tokens — the most capable
  // single-shot provider for large wizard seed generation (9+ pages).
  const runDirectGemini = async (): Promise<void> => {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('UNISONGEMINI_API_KEY');
    if (!GEMINI_API_KEY || content) return;

    const role = 'direct';
    console.log(`[AI-Hybrid] Direct Gemini API configured as ${role} provider`);

    const geminiModels = [
      // 65 536 output tokens — ideal for multi-page wizard generation
      { id: 'gemini-2.5-flash', maxTokens: Math.min(providerPlan.fallbackMaxTokens, 65536), label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', maxTokens: Math.min(providerPlan.fallbackMaxTokens, 8192), label: 'Gemini 2.5 Flash Lite' },
    ];

    for (const model of geminiModels) {
      throwIfCancelled();
      const remaining = budgetRemaining();
      if (remaining < 8000) {
        console.warn(`[AI-Hybrid] Budget exhausted (${remaining}ms left), skipping remaining Gemini models`);
        lastError = lastError || 'budget exhausted before all models tried';
        break;
      }
      const perModelMs = Math.min(providerPlan.perModelTimeoutMs, Math.max(8000, remaining - 2000));
      try {
        console.log(`[AI-Hybrid] Trying ${role} ${model.label} (timeout: ${perModelMs / 1000}s, budget left: ${remaining / 1000}s)...`);
        const attempt = createAttemptSignal(perModelMs);

        const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GEMINI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model.id,
            messages: aiMessages,
            max_tokens: model.maxTokens,
            ...(hasTools ? { tools, tool_choice: effectiveToolChoice } : {}),
          }),
          signal: attempt.signal,
        });
        attempt.cleanup();

        if (resp.status === 429 || resp.status === 402) {
          const errText = await resp.text().catch(() => '');
          const earlyError: ProviderEarlyError = resp.status === 429
            ? { status: 429, error: 'Rate limit exceeded. Please try again later.' }
            : { status: 402, error: 'Payment required. Please add credits to your Google AI account.' };
          recordProviderError(model.label, `${resp.status}${errText ? ` ${errText.substring(0, 200)}` : ''}`);
          deferredEarlyError ??= earlyError;
          console.warn(`[AI-Hybrid] ${model.label} returned ${resp.status}; trying next...`);
          if (resp.status === 429) continue;
          break;
        }

        if (!resp.ok) {
          const errText = await resp.text();
          console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 300)}`);
          recordProviderError(model.label, `${resp.status} ${errText.substring(0, 200)}`);
          continue;
        }

        const responseText = await resp.text();
        if (!responseText || responseText.trim() === '') {
          recordProviderError(model.label, 'empty response');
          continue;
        }

        let data;
        try { data = JSON.parse(responseText); } catch {
          recordProviderError(model.label, 'invalid JSON');
          continue;
        }

        const message = data.choices?.[0]?.message ?? {};
        const parsedContent = message.content || '';
        const parsedToolCalls = Array.isArray(message.tool_calls) ? (message.tool_calls as RawToolCall[]) : undefined;
        if (!parsedContent && (!parsedToolCalls || parsedToolCalls.length === 0)) {
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
        providerUsed = 'gemini';
        if (parsedToolCalls && parsedToolCalls.length > 0) toolCalls = parsedToolCalls;
        console.log(`[AI-Hybrid] Success with ${role} ${model.label}`);
        break;
      } catch (err) {
        throwIfCancelled();
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

  // ── Phase 1: Planned direct-provider attempts ──────────────────────────
  if (allowDirectFallbacks) {
    // Log total prompt size for debugging
    const totalChars = aiMessages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0);
    console.log(`[AI-Hybrid] Total prompt size: ${totalChars} chars across ${aiMessages.length} messages`);
    
    for (const model of providerPlan.gatewayModels) {
      throwIfCancelled();
      const remaining = budgetRemaining();
      if (remaining < 8000) {
        console.warn(`[AI-Hybrid] Budget exhausted (${remaining}ms left), skipping remaining gateway models`);
        lastError = lastError || 'budget exhausted before all models tried';
        break;
      }
      // Most turns reserve room for failover. Wizard generation is different:
      // a valid 20k+ token Gemini response routinely needs 80–90 seconds. Give
      // that funded lead path nearly the full turn; auth/rate-limit failures
      // return quickly and can still fall through to the remaining providers.
      const isLeadModel = model.id === providerPlan.gatewayModels[0]?.id;
      const cap = providerPlan.perModelTimeoutMs;
      const reserveMs = providerPlan.preferLongLeadAttempt && isLeadModel
        ? 8_000
        : lastResortReserveMs;
      const headroom = Math.max(8000, remaining - 2000 - reserveMs);
      const leadShare = Math.max(30000, Math.floor(headroom * 0.6));
      const perModelMs = isLeadModel
        ? Math.min(cap, headroom, providerPlan.preferLongLeadAttempt ? headroom : leadShare)
        : Math.min(cap, Math.max(12000, headroom));


      try {
        console.log(`[AI-Hybrid] Trying planned direct model ${model.label} (timeout: ${perModelMs / 1000}s, budget left: ${remaining / 1000}s)...`);
        const attempt = createAttemptSignal(perModelMs);

        const reqBody = buildPlannedChatCompletionRequest({
          model,
          aiMessages,
          reasoningEffort,
          tools: hasTools ? tools : undefined,
          toolChoice: effectiveToolChoice,
        });

        const resp = await createPlannedChatCompletion(reqBody, attempt.signal);
        attempt.cleanup();

        if (resp.status === 429 || resp.status === 402) {
          const errText = await resp.text().catch(() => '');
          const earlyError: ProviderEarlyError = resp.status === 429
            ? { status: 429, error: 'Rate limit exceeded. Please try again later.' }
            : { status: 402, error: 'Payment required. Please add credits to your workspace.' };
          recordProviderError(model.label, `${resp.status}${errText ? ` ${errText.substring(0, 200)}` : ''}`);
          deferredEarlyError ??= earlyError;
          console.warn(`[AI-Hybrid] ${model.label} returned ${resp.status}; trying next provider...`);
          if (resp.status === 429) continue;
          break;
        }

        if (!resp.ok) {
          const errText = await resp.text();
          console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 300)}`);
          if (resp.status === 401 || resp.status === 403) {
            deferredEarlyError ??= {
              status: 503,
              error: 'AI provider authentication failed. Check the configured direct provider secrets.',
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

        const message = data.choices?.[0]?.message ?? {};
        const parsedContent = message.content || '';
        const parsedToolCalls = Array.isArray(message.tool_calls) ? (message.tool_calls as RawToolCall[]) : undefined;
        if (!parsedContent && (!parsedToolCalls || parsedToolCalls.length === 0)) {
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
        providerUsed = resp.headers.get('X-Unison-AI-Provider') ?? providerUsed;
        if (parsedToolCalls && parsedToolCalls.length > 0) toolCalls = parsedToolCalls;
        console.log(`[AI-Hybrid] Success with planned direct model ${model.label}`);
        break;
      } catch (err) {
        throwIfCancelled();
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

  // ── Phase 2–3: Provider-native fallback models ───────────────────────
  // Planned models already exercise both direct provider families. Repeating
  // both complete provider-native lists after that used the entire wall-clock
  // budget during 429/timeout storms and starved the true last-resort path.
  // Only use the native list for a configured family that had no planned model.
  const plannedProviders = new Set(providerPlan.gatewayModels.map((model) => (
    model.id.startsWith('openai/') || model.id.startsWith('gpt-') ? 'openai' :
    model.id.startsWith('google/') || model.id.startsWith('gemini-') ? 'gemini' :
    'other'
  )));
  if (!content && allowDirectFallbacks) {
    if (hasDirectOpenAI && !plannedProviders.has('openai')) await runDirectOpenAI();
    if (!content && hasDirectGemini && !plannedProviders.has('gemini')) await runDirectGemini();
  }

  // ── Phase 4: Direct Anthropic API ─────────────────────────────────────
  if (!content && allowDirectFallbacks) {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (ANTHROPIC_API_KEY) {
      const remaining = budgetRemaining();
      const anthropicBudget = remaining - (hasLastResortGateway ? 10_000 : 2_000);
      if (anthropicBudget >= 8000) {
        const perModelMs = Math.min(28000, anthropicBudget);
        try {
          const systemMsg = (aiMessages.find((m) => m.role === 'system')?.content as string) || '';
          const userMsgs = aiMessages.filter((m) => m.role !== 'system');
          console.log(`[AI-Hybrid] Trying direct Anthropic claude-sonnet-4-5 (timeout: ${perModelMs / 1000}s)...`);

          const attempt = createAttemptSignal(perModelMs);
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
            signal: attempt.signal,
          });
          attempt.cleanup();

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
              providerUsed = 'anthropic';
              console.log('[AI-Hybrid] Success with direct Anthropic claude-sonnet-4-5');
            } else {
              recordProviderError('Anthropic claude-sonnet-4-5', 'no content');
            }
          }
        } catch (err) {
          throwIfCancelled();
          recordProviderError('Anthropic claude-sonnet-4-5', err instanceof Error ? err.message : 'unknown');
        }
      }
    }
  }

  // ── Phase 5: Managed gateway, strictly last resort ───────────────────
  // This path is intentionally unreachable until all configured direct
  // provider models (and Anthropic, when present) have failed. It prevents a
  // temporary direct-provider 429 from blocking the Wizard while preserving
  // the product rule that the managed gateway is never primary.
  if (!content && hasLastResortGateway) {
    const remaining = budgetRemaining();
    if (remaining >= 8_000) {
      // The gateway needs ~30 s to respond for large wizard-seed prompts
      // (observed: success at 29 s with a 30 s planned-model timeout). The
      // previous 25 s cap aborted the gateway just before it could complete.
      const perModelMs = Math.min(35_000, Math.max(8_000, remaining - 2_000));
      const gatewayModel: ModelSpec = {
        id: 'google/gemini-3.6-flash',
        maxTokens: Math.min(providerPlan.fallbackMaxTokens, 32_000),
        label: 'Managed gateway fallback',
      };
      try {
        console.log(`[AI-Hybrid] Trying managed gateway as final fallback (timeout: ${perModelMs / 1000}s)...`);
        const attempt = createAttemptSignal(perModelMs);
        const resp = await createLastResortGatewayChatCompletion(
          buildPlannedChatCompletionRequest({
            model: gatewayModel,
            aiMessages,
            reasoningEffort,
            tools: hasTools ? tools : undefined,
            toolChoice: effectiveToolChoice,
          }),
          attempt.signal,
        );
        attempt.cleanup();
        if (resp.ok) {
          const data = await resp.json();
          const message = data.choices?.[0]?.message ?? {};
          const parsedContent = message.content || '';
          const parsedToolCalls = Array.isArray(message.tool_calls) ? (message.tool_calls as RawToolCall[]) : undefined;
          if (parsedContent || (parsedToolCalls && parsedToolCalls.length > 0)) {
            const extracted = extractThinkingTags(parsedContent);
            content = extracted.content;
            reasoning = extracted.reasoning || reasoning;
            modelUsed = gatewayModel.id;
            providerUsed = 'lovable';
            if (parsedToolCalls?.length) toolCalls = parsedToolCalls;
            console.log('[AI-Hybrid] Success with managed gateway final fallback');
          }
        } else {
          const errText = await resp.text().catch(() => '');
          recordProviderError(gatewayModel.label, `${resp.status} ${errText.substring(0, 200)}`);
          if (resp.status === 402) {
            deferredEarlyError = { status: 402, error: 'AI credits are exhausted. Please add workspace credits and try again.' };
          }
        }
      } catch (err) {
        throwIfCancelled();
        recordProviderError(gatewayModel.label, err instanceof Error ? err.message : 'unknown');
      }
    }
  }

  if (!content) {

    // Only surface a deferred 429/402 as the early error when every provider
    // failed for rate-limit / billing reasons. If any provider failed for a
    // different reason (timeout, 500, empty response), the 429 from one
    // provider is misleading — fall through to the detailed "all providers
    // failed" error so the client shows the real failure.
    if (deferredEarlyError && !hadNonRateLimitError) {
      return { content: '', reasoning: '', modelUsed: undefined, earlyError: deferredEarlyError };
    }
    const configuredProviders = [
      hasDirectGemini ? 'gemini' : '',
      hasDirectOpenAI ? 'openai' : '',
    ].filter(Boolean);
    const errorTrail = providerErrors.slice(-10).join(' | ') || lastError || 'no provider attempts completed';
    throw new Error(`All AI providers failed. Configured providers: ${configuredProviders.join(', ') || 'none'}. Last errors: ${errorTrail}. Please ensure the managed AI gateway secret is valid and available to backend functions.`);
  }

  return { content, reasoning, modelUsed, providerUsed, toolCalls };
}
