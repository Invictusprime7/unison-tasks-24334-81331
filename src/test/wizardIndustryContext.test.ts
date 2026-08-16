import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Wizard industry chain of custody', () => {
  it('threads the selected template guidance into Lane A, Lane B, and the WizardSeed', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    // R4: the industry argument makes the copy directive mandatory even when
    // no template card resolved.
    expect(source).toContain('const industryTemplateGuidance = buildTemplateGuidance(effectiveTemplate, resolvedIndustry)');
    expect(source).toContain('industry_context: industryTemplateGuidance');
    expect(source).toContain('industryTemplateGuidance,');
    expect(source).toContain('guidance: industryTemplateGuidance');
    expect(source).toContain('never replace with generic business copy');
  });
});
