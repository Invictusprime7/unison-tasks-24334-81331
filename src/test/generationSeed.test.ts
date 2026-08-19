import { describe, expect, it } from 'vitest';
import {
  childSeed,
  createSeededRng,
  deriveGenerationSeed,
  seededPick,
  seededRotate,
  seededShuffle,
} from '@/platform/core/generationSeed';
import { generateStyleVariation } from '@/utils/designVariation';
import { buildWizardDesignIntervention } from '@/services/wizardDesignIntervention';

const BASE = {
  businessName: 'Aurelia Salon',
  businessModel: 'appointment_service',
  industry: 'salon',
  templateId: 'luxe-salon',
  themePresetId: 'editorial',
  primaryGoal: 'book_appointments',
  secondaryGoals: ['collect_leads'],
  requestedPages: ['about', 'services'],
  projectId: 'biz_1',
};

describe('canonical generation seed', () => {
  it('is deterministic for identical selections', () => {
    expect(deriveGenerationSeed(BASE)).toBe(deriveGenerationSeed({ ...BASE }));
  });

  it('is order-insensitive for list selections', () => {
    expect(deriveGenerationSeed({ ...BASE, requestedPages: ['services', 'about'] }))
      .toBe(deriveGenerationSeed(BASE));
  });

  it('changes when any wizard dimension changes', () => {
    const base = deriveGenerationSeed(BASE);
    expect(deriveGenerationSeed({ ...BASE, themePresetId: 'brutalist' })).not.toBe(base);
    expect(deriveGenerationSeed({ ...BASE, templateId: 'other' })).not.toBe(base);
    expect(deriveGenerationSeed({ ...BASE, primaryGoal: 'sell_products' })).not.toBe(base);
    expect(deriveGenerationSeed({ ...BASE, requestedPages: ['about'] })).not.toBe(base);
    expect(deriveGenerationSeed({ ...BASE, industry: 'restaurant' })).not.toBe(base);
  });

  it('produces a new seed for an intentional regeneration nonce', () => {
    expect(deriveGenerationSeed({ ...BASE, launchNonce: 'run-2' }))
      .not.toBe(deriveGenerationSeed({ ...BASE, launchNonce: 'run-1' }));
  });

  it('rng / pick / shuffle / rotate are reproducible', () => {
    const a = createSeededRng('x');
    const b = createSeededRng('x');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const items = [1, 2, 3, 4, 5];
    expect(seededShuffle('s', items)).toEqual(seededShuffle('s', items));
    expect(seededRotate('s', items)).toEqual(seededRotate('s', items));
    expect(seededPick('s', items)).toBe(seededPick('s', items));
    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect(childSeed('root', 'page', 2)).toBe('root::page::2');
  });
});

describe('seeded style variation', () => {
  it('is stable across calls with the same seed (refresh safety)', () => {
    const seed = deriveGenerationSeed(BASE);
    expect(generateStyleVariation(seed)).toEqual(generateStyleVariation(seed));
  });

  it('differs across dramatically different verticals', () => {
    const salon = generateStyleVariation(deriveGenerationSeed(BASE));
    const restaurant = generateStyleVariation(deriveGenerationSeed({
      ...BASE,
      businessName: 'Osteria Nove',
      industry: 'restaurant',
      businessModel: 'restaurant_hospitality',
      themePresetId: 'warm-editorial',
      templateId: 'trattoria',
    }));
    expect(JSON.stringify(salon)).not.toBe(JSON.stringify(restaurant));
  });
});

describe('design brief seeding', () => {
  it('seeds the design intervention from every wizard dimension', () => {
    const brief = buildWizardDesignIntervention({
      businessName: BASE.businessName,
      businessModel: 'appointment_service',
      industryOverlay: 'salon',
      templateId: BASE.templateId,
      themePresetId: BASE.themePresetId,
      primaryGoal: BASE.primaryGoal,
      requestedPages: BASE.requestedPages,
      projectId: BASE.projectId,
    });
    const other = buildWizardDesignIntervention({
      businessName: BASE.businessName,
      businessModel: 'appointment_service',
      industryOverlay: 'salon',
      templateId: BASE.templateId,
      themePresetId: BASE.themePresetId,
      primaryGoal: 'sell_products',
      requestedPages: BASE.requestedPages,
      projectId: BASE.projectId,
    });
    expect(brief.seed).not.toBe(other.seed);
    expect(brief.seed).toContain('salon');
  });
});
