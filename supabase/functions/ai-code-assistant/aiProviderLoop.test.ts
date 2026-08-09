import { buildPlannedChatCompletionRequest } from './aiProviderLoop.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const messages = [{ role: 'user', content: 'Generate the requested site.' }];

Deno.test('omits reasoning_effort for the GPT-4.1 Wizard fallback', () => {
  const request = buildPlannedChatCompletionRequest({
    model: { id: 'openai/gpt-4.1', label: 'GPT-4.1', maxTokens: 32_000 },
    aiMessages: messages,
    reasoningEffort: 'medium',
  });

  assert(request.max_tokens === 32_000, 'GPT-4.1 should use max_tokens');
  assert(!('reasoning_effort' in request), 'GPT-4.1 must not receive reasoning_effort');
});

Deno.test('keeps reasoning_effort for Gemini OpenAI-compatible requests', () => {
  const request = buildPlannedChatCompletionRequest({
    model: { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', maxTokens: 36_000 },
    aiMessages: messages,
    reasoningEffort: 'medium',
  });

  assert(request.max_tokens === 36_000, 'Gemini should use max_tokens');
  assert(request.reasoning_effort === 'medium', 'Gemini should retain reasoning_effort');
});

Deno.test('keeps GPT-5 completion tokens and reasoning controls', () => {
  const request = buildPlannedChatCompletionRequest({
    model: { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini', maxTokens: 32_000 },
    aiMessages: messages,
    reasoningEffort: 'low',
  });

  assert(request.max_completion_tokens === 32_000, 'GPT-5 should use max_completion_tokens');
  assert(request.reasoning_effort === 'low', 'GPT-5 should retain reasoning_effort');
});
