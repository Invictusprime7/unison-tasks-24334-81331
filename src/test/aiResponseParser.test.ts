import { describe, expect, it } from 'vitest';
import { extractMultiFileOutput, extractStylesheetOutput } from '@/utils/aiResponseParser';

describe('AI response file extraction', () => {
  it('extracts a prose-wrapped fenced JSON patch for theme and image edits', () => {
    const response = [
      'I updated the theme and added the requested hero image.',
      '```json',
      JSON.stringify({
        files: {
          '/src/index.css': ':root { --primary: 12 85% 48%; }',
          '/src/pages/Home.tsx': 'export default function Home() { return <img src="https://images.unsplash.com/photo-1?w=1200&q=80" alt="Hero" />; }',
        },
        explanation: 'Applied the new visual direction.',
      }, null, 2),
      '```',
      'The rest of the page is unchanged.',
    ].join('\n');

    expect(extractMultiFileOutput(response)).toEqual({
      files: {
        '/src/index.css': ':root { --primary: 12 85% 48%; }',
        '/src/pages/Home.tsx': 'export default function Home() { return <img src="https://images.unsplash.com/photo-1?w=1200&q=80" alt="Hero" />; }',
      },
      explanation: 'Applied the new visual direction.',
    });
  });

  it('routes a prose-wrapped CSS theme response to the canonical stylesheet', () => {
    const response = [
      'Here is the updated theme:',
      '```css',
      ':root { --primary: 12 85% 48%; --background: 36 33% 97%; }',
      'body { font-family: "DM Sans", sans-serif; }',
      '```',
    ].join('\n');

    expect(extractStylesheetOutput(response)).toEqual({
      '/src/index.css': ':root { --primary: 12 85% 48%; --background: 36 33% 97%; }\nbody { font-family: "DM Sans", sans-serif; }',
    });
  });
});