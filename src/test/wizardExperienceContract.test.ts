import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import { getCompositionById } from '@/sections/templates';
import { buildTemplateLayoutContract } from '@/services/templateLayoutContract';
import {
  buildWizardExperienceContract,
  formatWizardExperienceContract,
} from '@/services/wizardExperienceContract';

describe('wizard experience contract', () => {
  it('binds reusable visual behavior to the selected style and template cards', () => {
    const style = THEME_PRESETS.find((preset) => preset.id === 'bold');
    const template = getCompositionById('store-premium');
    if (!style || !template) throw new Error('Expected registered wizard cards');

    const contract = buildWizardExperienceContract(style, buildTemplateLayoutContract(template));

    expect(contract.stylePresetId).toBe('bold');
    expect(contract.templateId).toBe('store-premium');
    expect(contract.referenceSources).toContain('Bright Site editorial interaction study');
    expect(contract.referenceSources).toContain('Flix fixed-navigation hierarchy study');
    expect(formatWizardExperienceContract(contract)).toContain('Framer Motion');
    expect(formatWizardExperienceContract(contract)).toContain('bounded content frame');
    expect(formatWizardExperienceContract(contract)).toContain('Reference studies:');
    expect(formatWizardExperienceContract(contract)).toContain('selected business and industry');
  });

  it('forbids stale cross-industry content while preserving the selected cards as authority', () => {
    const style = THEME_PRESETS.find((preset) => preset.id === 'editorial');
    const template = getCompositionById('salon-premium');
    if (!style || !template) throw new Error('Expected registered wizard cards');

    const contract = buildWizardExperienceContract(style, buildTemplateLayoutContract(template));
    const prompt = formatWizardExperienceContract(contract);

    expect(prompt).toContain('semantic tokens, typography, and geometry');
    expect(prompt).toContain('Bright Site and Flix references as behavior-only inspiration');
    expect(prompt).toContain('Keep navigation compact and purposeful');
    expect(prompt).toContain('sole visual-token authority');
    expect(prompt).toContain('Do not reuse another launch');
    expect(prompt).toContain('replace placeholder or prior-business copy');
  });

  it('threads the contract through both the launcher and the Lane B Edge Function context', () => {
    const launcher = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );
    const edgeContext = readFileSync(
      resolve(process.cwd(), 'supabase/functions/ai-code-assistant/contextBuilders.ts'),
      'utf8',
    );

    expect(launcher).toContain('buildWizardExperienceContract(resolvedPreset, templateLayoutContract)');
    expect(launcher).toContain('experience: experienceContract');
    expect(edgeContext).toContain('EXPERIENCE QUALITY CONTRACT — HARD');
    expect(edgeContext).toContain('Keep the business copy, images, proof, and CTAs specific to this launch industry.');
  });
});