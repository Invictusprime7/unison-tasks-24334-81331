import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Primary: Direct OpenAI API
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const result = streamText({
  model: openai('gpt-4o'),
  prompt: 'Build a fullstack website with a React frontend and a Node.js backend that connects to a PostgreSQL database. The website should allow users to create, read, update, and delete tasks.',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
