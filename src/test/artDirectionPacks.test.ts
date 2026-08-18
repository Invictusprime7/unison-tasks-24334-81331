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
import {
  ART_DIRECTION_PACKS as PACKS,
  buildArtDirectionTokens,
  resolveArtDirectionPack,
  resolveHeroPresentation,
} from '@/sections/variants/artDirectionPacks';
import { buildThemedIndexCss } from '@/components/onboarding/themePresetToIndexCss';
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

  it('resolves deterministically with the theme preset leading and industry narrowing', () => {
    expect(resolveArtDirectionPackId({ industry: 'portfolio' })).toBe('cinematic-portfolio');
    // Theme leads: the editorial family wins, narrowed to a saas-compatible pack.
    expect(resolveArtDirectionPackId({ industry: 'saas', themePresetId: 'editorial' })).toBe('swiss-grid');
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
        // The SEALED pack always wins over re-derivation.
        artDirectionPackId: 'cinematic-portfolio',
      },
    });

    const page = files['/src/pages/Home.tsx'];
    expect(page).toContain('full-bleed');
    expect(page).toContain('cinematic-grid');
  });
});


describe('Art direction signature — themePresetId drives the design system', () => {
  const themes = ['modern', 'editorial', 'futuristic', 'minimalist', 'bold', 'organic'];

  it('gives every pack a complete signature contract', () => {
    for (const id of ART_DIRECTION_PACK_IDS) {
      const sig = PACKS[id].signature;
      expect(sig.typography.displayStack, id).toBeTruthy();
      expect(sig.typography.displayWeight, id).toBeGreaterThan(199);
      expect(sig.gradient, id).toBeTruthy();
      expect(sig.density, id).toBeTruthy();
      expect(sig.hero.layout, id).toBeTruthy();
      expect(sig.pill, id).toBeTruthy();
      expect(sig.entrance, id).toBeTruthy();
    }
  });

  it('emits typography, gradient, spacing, hero and pill tokens', () => {
    const tokens = buildArtDirectionTokens(PACKS['neon-grid']);
    for (const name of [
      '--ut-font-display-stack', '--ut-weight-display', '--ut-gradient-hero', '--ut-gradient-text',
      '--ut-grid-gap', '--ut-card-padding', '--ut-hero-layout', '--ut-hero-columns',
      '--ut-pill-radius', '--ut-motion-stagger',
    ]) {
      expect(tokens[name], name).toBeTruthy();
    }
  });

  it('changes typography, gradients, spacing, hero layout and pills across style cards for ONE industry', () => {
    const signatures = themes.map((themePresetId) => {
      const pack = resolveArtDirectionPack({ industry: 'agency', themePresetId, seed: 'seed-1' });
      const tokens = buildArtDirectionTokens(pack);
      return {
        themePresetId,
        font: tokens['--ut-font-display-stack'],
        gradient: tokens['--ut-gradient-hero'],
        density: tokens['--ut-grid-gap'],
        hero: tokens['--ut-hero-layout'],
        pill: tokens['--ut-pill-radius'],
        entrance: tokens['--ut-entrance'],
      };
    });

    // The same industry must not collapse to one look across style cards.
    for (const key of ['font', 'gradient', 'density', 'hero', 'pill', 'entrance'] as const) {
      const distinct = new Set(signatures.map((s) => s[key]));
      expect(distinct.size, `${key} must vary by themePresetId`).toBeGreaterThan(1);
    }
  });

  it('projects the pack hero signature into the compiled hero layout', () => {
    const composition = {
      id: 'signature-hero',
      name: 'Signature hero',
      sections: [{ id: 's-hero', type: 'hero', props: { heading: 'Studio' } }],
    } as unknown as TemplateComposition;

    const centered = compositionToReactFileSet(composition, '/src/pages/Home.tsx', {
      designIntervention: { sectionVariants: [], artDirectionPackId: 'glass-tech' },
    })['/src/pages/Home.tsx'];
    const poster = compositionToReactFileSet(composition, '/src/pages/Home.tsx', {
      designIntervention: { sectionVariants: [], artDirectionPackId: 'brutalist-poster' },
    })['/src/pages/Home.tsx'];

    expect(resolveHeroPresentation(PACKS['glass-tech']).layout).toBe('centered');
    expect(centered).toContain('centered');
    expect(poster).toContain('full-bleed');
  });

  it('renders the signature into the themed stylesheet', () => {
    const css = buildThemedIndexCss('futuristic', { industry: 'saas', seed: 'seed-1' });
    expect(css).toContain('--ut-gradient-hero');
    expect(css).toContain('.ut-pill');
    expect(css).toContain('.ut-hero {');
    expect(css).toContain('--ut-font-display-stack');
  });
});
