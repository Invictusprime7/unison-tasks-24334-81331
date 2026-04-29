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
  const { aiMessages, providerPlan, navPageGen, lovableApiKey, reasoningEffort } = opts;
  let content = '';
  let lastError = '';
  let reasoning = '';
  let modelUsed: string | undefined;

  // ── Phase 1: Lovable AI Gateway ──────────────────────────────────────
  if (lovableApiKey) {
    // Log total prompt size for debugging
    const totalChars = aiMessages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0);
    console.log(`[AI-Hybrid] Total prompt size: ${totalChars} chars across ${aiMessages.length} messages`);
    
    for (const model of providerPlan.gatewayModels) {
      try {
        console.log(`[AI-Hybrid] Trying gateway model ${model.label} (timeout: ${providerPlan.perModelTimeoutMs / 1000}s)...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), providerPlan.perModelTimeoutMs);

        const reqBody: Record<string, unknown> = {
          model: model.id,
          ...(model.id.startsWith('openai/') ? { max_completion_tokens: model.maxTokens } : { max_tokens: model.maxTokens }),
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

        if (resp.status === 429) {
          return {
            content: '', reasoning: '', modelUsed: undefined,
            earlyError: {
              status: 429,
              error: 'Rate limit exceeded. Please try again later.',
            },
          };
        }
        if (resp.status === 402) {
          return {
            content: '', reasoning: '', modelUsed: undefined,
            earlyError: {
              status: 402,
              error: 'Payment required. Please add credits to your workspace.',
            },
          };
        }

        if (!resp.ok) {
          const errText = await resp.text();
          console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 300)}`);
          // For 400 errors, log full detail to help diagnose parameter issues
          if (resp.status === 400) {
            console.error(`[AI-Hybrid] 400 Bad Request for ${model.id}. Request body keys: ${Object.keys(reqBody).join(', ')}`);
          }
          lastError = `${model.label}: ${resp.status}`;
          continue;
        }

        const responseText = await resp.text();
        if (!responseText || responseText.trim() === '') {
          console.warn(`[AI-Hybrid] ${model.label} returned empty response, trying next...`);
          lastError = `${model.label}: empty response`;
          continue;
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.warn(`[AI-Hybrid] ${model.label} returned invalid JSON, trying next...`);
          lastError = `${model.label}: invalid JSON`;
          continue;
        }

        const parsedContent = data.choices?.[0]?.message?.content || '';
        if (!parsedContent) {
          console.warn(`[AI-Hybrid] ${model.label} returned no content, trying next...`);
          lastError = `${model.label}: no content`;
          continue;
        }

        const extracted = extractThinkingTags(parsedContent);
        if (extracted.reasoning) {
          reasoning = extracted.reasoning;
          console.log(`[AI-Hybrid] Thinking tags extracted from ${model.label}: ${extracted.reasoning.length} chars`);
        }
        content = extracted.content;
        modelUsed = model.id;
        console.log(`[AI-Hybrid] Success with ${model.label}`);
        break;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn(`[AI-Hybrid] ${model.label} timed out, trying next...`);
          lastError = `${model.label}: timeout`;
          continue;
        }
        console.warn(`[AI-Hybrid] ${model.label} failed:`, err);
        lastError = `${model.label}: ${err instanceof Error ? err.message : 'unknown'}`;
        continue;
      }
    }
  }

  // ── Phase 2: Direct OpenAI API fallback ──────────────────────────────
  if (!content) {
    const OPENAI_API_KEY = Deno.env.get('NEW_OPENAI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
    if (OPENAI_API_KEY) {
      const openaiModels = [
        { id: 'gpt-4o-mini', maxTokens: 16000, label: 'OpenAI gpt-4o-mini' },
        { id: 'gpt-4o', maxTokens: 16000, label: 'OpenAI gpt-4o' },
      ];
      for (const model of openaiModels) {
        try {
          console.log(`[AI-Hybrid] Trying direct ${model.label}...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: model.id, max_completion_tokens: model.maxTokens, messages: aiMessages }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!resp.ok) {
            const errText = await resp.text();
            console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 200)}`);
            lastError = `${model.label}: ${resp.status}`;
            continue;
          }
          const data = await resp.json();
          const parsedContent = data.choices?.[0]?.message?.content || '';
          if (!parsedContent) { lastError = `${model.label}: no content`; continue; }
          const extracted = extractThinkingTags(parsedContent);
          if (extracted.reasoning) {
            reasoning = extracted.reasoning;
          }
          content = extracted.content;
          modelUsed = model.id;
          console.log(`[AI-Hybrid] Success with ${model.label}`);
          break;
        } catch (err) {
          lastError = `${model.label}: ${err instanceof Error ? err.message : 'unknown'}`;
          continue;
        }
      }
    }
  }

  // ── Phase 3: Direct Anthropic API fallback ───────────────────────────
  if (!content) {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (ANTHROPIC_API_KEY) {
      try {
        console.log('[AI-Hybrid] Trying direct Anthropic claude-sonnet-4-5 (extended thinking)...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const systemMsg = (aiMessages.find(m => m.role === 'system')?.content as string) || '';
        const userMsgs = aiMessages.filter(m => m.role !== 'system');
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2025-02-19',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: navPageGen ? 10000 : 32000,
            ...(navPageGen ? {} : {
              thinking: { type: 'enabled', budget_tokens: 10000 },
            }),
            system: systemMsg,
            messages: userMsgs,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const data = await resp.json();
          const textBlock = (data.content as Array<{ type: string; text?: string; thinking?: string }> | undefined)
            ?.find(b => b.type === 'text');
          const thinkingBlocks = (data.content as Array<{ type: string; thinking?: string }> | undefined)
            ?.filter(b => b.type === 'thinking')
            .map(b => b.thinking || '')
            .filter(Boolean);
          const parsedContent = textBlock?.text || data.content?.[0]?.text || '';
          if (parsedContent) {
            if (thinkingBlocks?.length) {
              reasoning = thinkingBlocks.join('\n\n');
              content = parsedContent;
            } else {
              const extracted = extractThinkingTags(parsedContent);
              if (extracted.reasoning) reasoning = extracted.reasoning;
              content = extracted.content;
            }
            modelUsed = 'claude-sonnet-4-5';
            console.log('[AI-Hybrid] Success with Anthropic claude-sonnet-4-5');
          } else {
            lastError = 'Anthropic: no content';
          }
        } else {
          const errText = await resp.text();
          lastError = `Anthropic: ${resp.status} ${errText.substring(0, 100)}`;
        }
      } catch (err) {
        lastError = `Anthropic: ${err instanceof Error ? err.message : 'unknown'}`;
      }
    }
  }

  if (!content) {
    throw new Error(`All AI providers failed. Last error: ${lastError}. Please ensure at least one of LOVABLE_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY is set in your Supabase secrets.`);
  }

  return { content, reasoning, modelUsed };
}
