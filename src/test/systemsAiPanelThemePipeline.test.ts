import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/onboarding/SystemsAIPanel.tsx'),
  'utf8',
);

describe('SystemsAIPanel chip theme ownership', () => {
  it('uses the canonical industry preset and threads it through every chip handoff', () => {
    const chipStart = source.indexOf('if (selectedCodeChip)');
    const freeformStart = source.indexOf('// Free-form prompt:', chipStart);
    const chipBranch = source.slice(chipStart, freeformStart);

    expect(source).toContain(
      'const themePreset = resolveThemePreset(null, getCategoryForChip(chipId));',
    );
    expect(source).toContain('themeTokens: themePresetToThemeTokens(themePreset),');
    expect(chipBranch).toContain('const chipThemePresetId = chipWizardSelections.themePresetId;');
    expect(chipBranch).toContain('themePresetId: chipThemePresetId,');
    expect(chipBranch).toContain('aesthetic: chipThemePresetId,');
    expect(chipBranch).not.toMatch(/aesthetic:\s*['"](?:premium|modern)['"]/);
  });

  it('uses the same canonical landing preset for free-form launch metadata and missing CSS', () => {
    const freeformStart = source.indexOf('// Free-form prompt:');
    const freeformBranch = source.slice(freeformStart);

    expect(freeformBranch).toContain(
      "const freeformThemePreset = resolveThemePreset(null, 'landing');",
    );
    expect(freeformBranch).toContain('ensureThemeCssForFreeformLaunch(');
    expect(freeformBranch).toContain('themePresetId: freeformThemePresetId,');
    expect(freeformBranch).toContain('aesthetic: freeformThemePresetId,');
    expect(freeformBranch).not.toMatch(/aesthetic:\s*['"]modern['"]/);
  });
});