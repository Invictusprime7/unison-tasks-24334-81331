import { describe, it, expect } from 'vitest';
import {
  ART_DIRECTION_PACKS,
  ART_DIRECTION_PACK_IDS,
  clampVariantToPack,
  familyForSection,
  isVariantInFamily,
  preferredVariantForSection,
  resolveArtDirectionPackId,
  getVariantById,
} from '@/sections/variants';
import { compositionToReactFileSet } from '@/sections/compositionToFileSet';
import type { TemplateComposition } from '@/sections/types';

describe('Recovery Phase 6 — ArtDirectionPack', () => {
  it('registers only variants that exist in the canonical registry', () => {
    for (const id of ART_DIRECTION_PACK_IDS) {
      const pack = ART_DIRECTION_PACKS[id];
      const declared = [
        ...pack.navbarFamily,
        ...pack.footerFamily,
        ...Object.values(pack.sectionFamilies).flat(),
      ];
      expect(declared.length).toBeGreaterThan(0);
      for (const variantId of declared) {
        expect(getVariantById(variantId), `${id} → ${variantId}`).toBeTruthy();
      }
    }
  });

  it('declares section families whose variants own their section type', () => {
    for (const id of ART_DIRECTION_PACK_IDS) {
      const pack = ART_DIRECTION_PACKS[id];
      for (const [sectionType, variants] of Object.entries(pack.sectionFamilies)) {
        for (const variantId of variants || []) {
          expect(variantId.split(':')[0], `${id} ${sectionType}`).toBe(sectionType);
        }
      }
    }
  });

  it('resolves deterministically from industry, then theme preset', () => {
    expect(resolveArtDirectionPackId({ industry: 'portfolio' })).toBe('cinematic-portfolio');
    expect(resolveArtDirectionPackId({ industry: 'saas', themePresetId: 'editorial' })).toBe('glass-tech');
    expect(resolveArtDirectionPackId({ industry: 'unknown-thing', themePresetId: 'editorial' })).toBe('editorial-noir');
    expect(resolveArtDirectionPackId({})).toBe('soft-editorial');
    // Stable across calls.
    expect(resolveArtDirectionPackId({ industry: 'salon' })).toBe(resolveArtDirectionPackId({ industry: 'salon' }));
  });

  it('clamps incompatible variants into the pack family and keeps compatible ones', () => {
    const pack = ART_DIRECTION_PACKS['cinematic-portfolio'];
    expect(clampVariantToPack(pack, 'gallery', 'gallery:masonry')).toBe('gallery:cinematic-grid');
    expect(clampVariantToPack(pack, 'gallery', 'gallery:lightbox-grid')).toBe('gallery:lightbox-grid');
    expect(preferredVariantForSection(pack, 'hero')).toBe('hero:full-bleed');
    expect(isVariantInFamily(pack, 'hero', 'hero:centered')).toBe(false);
    // Section types the pack does not describe are left untouched.
    expect(clampVariantToPack(pack, 'stats', undefined)).toBeUndefined();
    expect(familyForSection(pack, 'navbar')).toContain('navbar:minimal-dark');
  });

  it('applies pack cohesion during compilation when a design brief is present', () => {
    const composition = {
      id: 'test-composition',
      name: 'Test',
      description: 'Test composition',
      category: 'portfolio',
      industry: 'portfolio',
      theme: {} as TemplateComposition['theme'],
      sections: [
        { id: 's-hero', type: 'hero', props: { heading: 'Studio' } },
        { id: 's-gallery', type: 'gallery', props: { heading: 'Work' } },
      ],
    } as unknown as TemplateComposition;

    const files = compositionToReactFileSet(composition, '/src/pages/Home.tsx', {
      designIntervention: {
        sectionVariants: [],
        industry: 'portfolio',
        themePresetId: 'editorial',
      },
    });

    const page = files['/src/pages/Home.tsx'];
    expect(page).toContain('full-bleed');
    expect(page).toContain('cinematic-grid');
  });
});
