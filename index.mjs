import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const openai = createOpenAI({
  baseURL: 'https://ai.gateway.lovable.dev/v1',
  apiKey: process.env.LOVABLE_API_KEY,
});

const result = streamText({
  model: openai('openai/gpt-5.5'),
  prompt: 'Explain quantum computing in simple terms.',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
