import { describe, expect, it } from 'vitest';
import { enhancePromptForAI } from '@/services/promptIntelligence';

describe('prompt intelligence edit scope', () => {
  it('treats a whole-site theme change as a multi-file edit', () => {
    const result = enhancePromptForAI('Change the site theme to a warm editorial style');

    expect(result.analysis.intent).toBe('restyle');
    expect(result.isSurgical).toBe(false);
  });

  it('keeps a section-specific restyle surgical', () => {
    const result = enhancePromptForAI('Restyle the hero section with a warm editorial theme');

    expect(result.analysis.intent).toBe('restyle');
    expect(result.isSurgical).toBe(true);
  });
});