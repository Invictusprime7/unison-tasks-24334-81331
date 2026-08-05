import { describe, expect, it } from 'vitest';
import {
  buildWizardDesignIntervention,
  readWizardDesignIntervention,
} from '@/services/wizardDesignIntervention';
import { getVariantById } from '@/sections/variants';
import { getCompositionById } from '@/sections/templates';

describe('wizard design intervention', () => {
  const salonInput = {
    businessName: 'Northstar Salon',
    businessModel: 'appointment_service' as const,
    industryOverlay: 'salon' as const,
    templateId: 'salon-premium',
    themePresetId: 'organic',
    wizardSeedId: 'wizard-salon-1',
    needsBooking: true,
  };

  it('is stable for one wizard launch and differs by industry model', () => {
    expect(buildWizardDesignIntervention(salonInput)).toEqual(buildWizardDesignIntervention(salonInput));

    const store = buildWizardDesignIntervention({
      ...salonInput,
      businessModel: 'ecommerce',
      industryOverlay: 'ecommerce',
      templateId: 'store-boutique',
      sellsProducts: true,
    });

    expect(store.layoutRecipe).toBe('media-card-grid');
    expect(store.motionBudget).toBe('expressive');
    expect(store.interactionRecipes).toContain('image-lightbox');
    expect(store.sectionVariants).not.toEqual(buildWizardDesignIntervention(salonInput).sectionVariants);
  });

  it('keeps the generated AI directive inside canonical ownership boundaries', () => {
    const intervention = buildWizardDesignIntervention(salonInput);
    expect(intervention.aiDirective).toContain('snapshot-owned UI primitives');
    expect(intervention.aiDirective).toContain('Stage 4b tokens');
  });

  it('binds stable composition section ids to registered visual variants', () => {
    const intervention = buildWizardDesignIntervention(salonInput);
    const composition = getCompositionById(salonInput.templateId);
    const sectionIds = new Set(composition?.sections.map((section) => section.id));

    expect(Object.keys(intervention.activeVariants).length).toBeGreaterThan(0);
    for (const [sectionId, variantId] of Object.entries(intervention.activeVariants)) {
      expect(sectionIds.has(sectionId)).toBe(true);
      expect(getVariantById(variantId)).toBeDefined();
    }
  });

  it('reads only a complete, versioned intervention artifact', () => {
    const intervention = buildWizardDesignIntervention(salonInput);
    expect(readWizardDesignIntervention({
      '/.unison/design-intervention.json': JSON.stringify(intervention),
    })).toEqual(intervention);
    expect(readWizardDesignIntervention({
      '/.unison/design-intervention.json': JSON.stringify({ layoutRecipe: 'collage-hero' }),
    })).toBeNull();
    expect(readWizardDesignIntervention({
      '/.unison/design-intervention.json': JSON.stringify({
        ...intervention,
        motionRecipes: ['run-arbitrary-code'],
      }),
    })).toBeNull();
  });
});