/**
 * Recovery Phase 6 (M6) — ArtDirectionPack
 *
 * Themes alone (colors + typography tokens) cannot produce screenshot-level
 * cohesion. An ArtDirectionPack is the higher-order visual contract that sits
 * ABOVE the theme preset and BELOW page composition:
 *
 *   ThemePreset (color/type tokens)
 *        ↓
 *   ArtDirectionPack (grammar + compatible variant families + motion)
 *        ↓
 *   TemplateComposition sections (variantId per section)
 *
 * Critical principle from the audit:
 *   "Variants should be selected from compatible families, not randomly across
 *    the entire registry."
 *
 * So every pack declares, per section type, the ordered list of variants it is
 * allowed to use. The compiler clamps recipe-derived variants into that family
 * and fills unresolved sections with the pack's preferred variant. Explicit
 * user `activeVariants` are never clamped — direct authorship wins.
 *
 * This module is deterministic and registry-only. It never invents variant ids.
 */

import type { SectionType } from '../types';
import type { VariantId } from '../variants/types';
import { getVariantById } from '../variants/registry';

export type ArtDirectionPackId =
  | 'editorial-noir'
  | 'cinematic-portfolio'
  | 'luxury-minimal'
  | 'soft-editorial'
  | 'bold-commercial'
  | 'glass-tech'
  | 'organic-studio'
  | 'commerce-editorial';

export type MotionProfileId =
  | 'editorial-reveal'
  | 'gallery-inspection'
  | 'product-focus'
  | 'proof-led-stagger'
  | 'service-progressive-disclosure'
  | 'conversion-feedback';

export type InteractionProfileId =
  | 'image-lightbox'
  | 'accordion'
  | 'tabs'
  | 'mobile-nav-dialog';

export interface TypographyGrammar {
  /** Relative scale of display type against body copy. */
  displayScale: 'restrained' | 'balanced' | 'dramatic';
  headingCase: 'sentence' | 'title' | 'upper';
  /** Editorial packs run wide measures; commercial packs run tighter. */
  measure: 'narrow' | 'standard' | 'wide';
}

export interface GeometryGrammar {
  radius: 'square' | 'soft' | 'rounded' | 'pill';
  density: 'airy' | 'balanced' | 'compact';
  border: 'hairline' | 'none' | 'strong';
}

export interface MediaGrammar {
  /** How much of the page should be image/video surface. */
  density: 'low' | 'medium' | 'high';
  treatment: 'full-bleed' | 'framed' | 'mosaic' | 'card';
  aspect: 'portrait' | 'landscape' | 'mixed';
}

export interface ArtDirectionPack {
  id: ArtDirectionPackId;
  name: string;
  description: string;

  typography: TypographyGrammar;
  geometry: GeometryGrammar;
  media: MediaGrammar;

  navbarFamily: VariantId[];
  footerFamily: VariantId[];

  /** Compatible variants per section type, most-preferred first. */
  sectionFamilies: Partial<Record<SectionType, VariantId[]>>;

  motionProfile: MotionProfileId;
  interactionProfile: InteractionProfileId;
}

const pack = (definition: ArtDirectionPack): ArtDirectionPack => definition;

export const ART_DIRECTION_PACKS: Record<ArtDirectionPackId, ArtDirectionPack> = {
  'editorial-noir': pack({
    id: 'editorial-noir',
    name: 'Editorial Noir',
    description: 'High-contrast editorial grid, dramatic display type, mosaic media.',
    typography: { displayScale: 'dramatic', headingCase: 'sentence', measure: 'wide' },
    geometry: { radius: 'square', density: 'airy', border: 'hairline' },
    media: { density: 'high', treatment: 'mosaic', aspect: 'mixed' },
    navbarFamily: ['navbar:minimal-dark', 'navbar:centered-logo'],
    footerFamily: ['footer:dark-band', 'footer:columns'],
    sectionFamilies: {
      hero: ['hero:full-bleed', 'hero:centered'],
      gallery: ['gallery:editorial-mosaic', 'gallery:cinematic-grid', 'gallery:masonry'],
      services: ['services:alternating', 'services:card-grid'],
      features: ['features:minimal-centered', 'features:grid'],
      testimonials: ['testimonials:spotlight', 'testimonials:grid'],
      pricing: ['pricing:tiers', 'pricing:comparison'],
      cta: ['cta:split-card', 'cta:centered'],
      contact: ['contact:split-card', 'contact:centered'],
    },
    motionProfile: 'editorial-reveal',
    interactionProfile: 'image-lightbox',
  }),

  'cinematic-portfolio': pack({
    id: 'cinematic-portfolio',
    name: 'Cinematic Portfolio',
    description: 'Full-bleed imagery, inspection-led motion, portrait-weighted media.',
    typography: { displayScale: 'dramatic', headingCase: 'sentence', measure: 'standard' },
    geometry: { radius: 'square', density: 'airy', border: 'none' },
    media: { density: 'high', treatment: 'full-bleed', aspect: 'portrait' },
    navbarFamily: ['navbar:minimal-dark', 'navbar:standard'],
    footerFamily: ['footer:dark-band', 'footer:centered-minimal'],
    sectionFamilies: {
      hero: ['hero:full-bleed', 'hero:split-image'],
      gallery: ['gallery:cinematic-grid', 'gallery:lightbox-grid', 'gallery:editorial-mosaic'],
      services: ['services:alternating', 'services:compact-list'],
      features: ['features:minimal-centered', 'features:icon-left'],
      testimonials: ['testimonials:spotlight', 'testimonials:rail'],
      pricing: ['pricing:tiers', 'pricing:accordion'],
      cta: ['cta:centered', 'cta:split-card'],
      contact: ['contact:split-card', 'contact:minimal-inline'],
    },
    motionProfile: 'gallery-inspection',
    interactionProfile: 'image-lightbox',
  }),

  'luxury-minimal': pack({
    id: 'luxury-minimal',
    name: 'Luxury Minimal',
    description: 'Quiet layout, generous whitespace, restrained motion and framed media.',
    typography: { displayScale: 'restrained', headingCase: 'sentence', measure: 'wide' },
    geometry: { radius: 'soft', density: 'airy', border: 'hairline' },
    media: { density: 'medium', treatment: 'framed', aspect: 'landscape' },
    navbarFamily: ['navbar:centered-logo', 'navbar:minimal-dark'],
    footerFamily: ['footer:centered-minimal', 'footer:columns'],
    sectionFamilies: {
      hero: ['hero:centered', 'hero:split-image'],
      gallery: ['gallery:feature-split', 'gallery:editorial-mosaic'],
      services: ['services:compact-list', 'services:alternating'],
      features: ['features:minimal-centered', 'features:grid'],
      testimonials: ['testimonials:spotlight', 'testimonials:grid'],
      pricing: ['pricing:tiers', 'pricing:comparison'],
      cta: ['cta:centered', 'cta:split-card'],
      contact: ['contact:minimal-inline', 'contact:centered'],
    },
    motionProfile: 'editorial-reveal',
    interactionProfile: 'accordion',
  }),

  'soft-editorial': pack({
    id: 'soft-editorial',
    name: 'Soft Editorial',
    description: 'Warm rounded surfaces, human proof, medium media density.',
    typography: { displayScale: 'balanced', headingCase: 'sentence', measure: 'standard' },
    geometry: { radius: 'rounded', density: 'balanced', border: 'none' },
    media: { density: 'medium', treatment: 'card', aspect: 'mixed' },
    navbarFamily: ['navbar:standard', 'navbar:centered-logo'],
    footerFamily: ['footer:columns', 'footer:centered-minimal'],
    sectionFamilies: {
      hero: ['hero:split-image', 'hero:centered'],
      gallery: ['gallery:masonry', 'gallery:lightbox-grid'],
      services: ['services:card-grid', 'services:alternating'],
      features: ['features:grid', 'features:icon-left'],
      testimonials: ['testimonials:grid', 'testimonials:rail'],
      pricing: ['pricing:tiers', 'pricing:accordion'],
      cta: ['cta:split-card', 'cta:centered'],
      contact: ['contact:centered', 'contact:split-card'],
    },
    motionProfile: 'proof-led-stagger',
    interactionProfile: 'accordion',
  }),

  'bold-commercial': pack({
    id: 'bold-commercial',
    name: 'Bold Commercial',
    description: 'Loud hierarchy, conversion-forward blocks, compact density.',
    typography: { displayScale: 'dramatic', headingCase: 'title', measure: 'narrow' },
    geometry: { radius: 'soft', density: 'compact', border: 'strong' },
    media: { density: 'medium', treatment: 'card', aspect: 'landscape' },
    navbarFamily: ['navbar:standard', 'navbar:minimal-dark'],
    footerFamily: ['footer:dark-band', 'footer:columns'],
    sectionFamilies: {
      hero: ['hero:split-image', 'hero:full-bleed'],
      gallery: ['gallery:lightbox-grid', 'gallery:masonry'],
      services: ['services:card-grid', 'services:compact-list'],
      features: ['features:icon-left', 'features:grid'],
      testimonials: ['testimonials:rail', 'testimonials:grid'],
      pricing: ['pricing:comparison', 'pricing:tiers'],
      cta: ['cta:gradient-banner', 'cta:split-card'],
      contact: ['contact:split-card', 'contact:centered'],
    },
    motionProfile: 'conversion-feedback',
    interactionProfile: 'tabs',
  }),

  'glass-tech': pack({
    id: 'glass-tech',
    name: 'Glass Tech',
    description: 'Product-led surfaces, systematic grids, precise progressive disclosure.',
    typography: { displayScale: 'balanced', headingCase: 'sentence', measure: 'standard' },
    geometry: { radius: 'rounded', density: 'balanced', border: 'hairline' },
    media: { density: 'low', treatment: 'framed', aspect: 'landscape' },
    navbarFamily: ['navbar:minimal-dark', 'navbar:standard'],
    footerFamily: ['footer:columns', 'footer:dark-band'],
    sectionFamilies: {
      hero: ['hero:centered', 'hero:split-image'],
      gallery: ['gallery:cinematic-grid', 'gallery:lightbox-grid'],
      services: ['services:card-grid', 'services:alternating'],
      features: ['features:grid', 'features:icon-left'],
      testimonials: ['testimonials:grid', 'testimonials:spotlight'],
      pricing: ['pricing:comparison', 'pricing:tiers'],
      cta: ['cta:gradient-banner', 'cta:centered'],
      contact: ['contact:split-card', 'contact:minimal-inline'],
    },
    motionProfile: 'product-focus',
    interactionProfile: 'tabs',
  }),

  'organic-studio': pack({
    id: 'organic-studio',
    name: 'Organic Studio',
    description: 'Natural pacing, soft geometry, service storytelling over hard sell.',
    typography: { displayScale: 'balanced', headingCase: 'sentence', measure: 'wide' },
    geometry: { radius: 'pill', density: 'airy', border: 'none' },
    media: { density: 'medium', treatment: 'mosaic', aspect: 'mixed' },
    navbarFamily: ['navbar:centered-logo', 'navbar:standard'],
    footerFamily: ['footer:centered-minimal', 'footer:columns'],
    sectionFamilies: {
      hero: ['hero:split-image', 'hero:centered'],
      gallery: ['gallery:masonry', 'gallery:feature-split'],
      services: ['services:alternating', 'services:card-grid'],
      features: ['features:minimal-centered', 'features:grid'],
      testimonials: ['testimonials:rail', 'testimonials:spotlight'],
      pricing: ['pricing:accordion', 'pricing:tiers'],
      cta: ['cta:centered', 'cta:split-card'],
      contact: ['contact:centered', 'contact:split-card'],
    },
    motionProfile: 'service-progressive-disclosure',
    interactionProfile: 'accordion',
  }),

  'commerce-editorial': pack({
    id: 'commerce-editorial',
    name: 'Commerce Editorial',
    description: 'Catalog-led grids with editorial framing and product focus motion.',
    typography: { displayScale: 'balanced', headingCase: 'title', measure: 'standard' },
    geometry: { radius: 'soft', density: 'balanced', border: 'hairline' },
    media: { density: 'high', treatment: 'card', aspect: 'portrait' },
    navbarFamily: ['navbar:standard', 'navbar:centered-logo'],
    footerFamily: ['footer:columns', 'footer:dark-band'],
    sectionFamilies: {
      hero: ['hero:full-bleed', 'hero:split-image'],
      gallery: ['gallery:masonry', 'gallery:lightbox-grid'],
      services: ['services:card-grid', 'services:compact-list'],
      features: ['features:grid', 'features:minimal-centered'],
      testimonials: ['testimonials:grid', 'testimonials:rail'],
      pricing: ['pricing:tiers', 'pricing:comparison'],
      cta: ['cta:gradient-banner', 'cta:split-card'],
      contact: ['contact:split-card', 'contact:centered'],
    },
    motionProfile: 'product-focus',
    interactionProfile: 'image-lightbox',
  }),
};

export const ART_DIRECTION_PACK_IDS = Object.keys(ART_DIRECTION_PACKS) as ArtDirectionPackId[];

/**
 * Industry (LayoutCategory) → pack. Industry is the strongest signal because it
 * encodes what the site must *do*, not just how it should feel.
 */
const INDUSTRY_TO_PACK: Record<string, ArtDirectionPackId> = {
  portfolio: 'cinematic-portfolio',
  photography: 'cinematic-portfolio',
  content: 'editorial-noir',
  restaurant: 'editorial-noir',
  realestate: 'luxury-minimal',
  salon: 'organic-studio',
  coaching: 'organic-studio',
  nonprofit: 'organic-studio',
  agency: 'soft-editorial',
  contractor: 'bold-commercial',
  landing: 'bold-commercial',
  saas: 'glass-tech',
  store: 'commerce-editorial',
  saved: 'soft-editorial',
};

/** Theme preset → pack, used when industry is unknown or unmapped. */
const THEME_PRESET_TO_PACK: Record<string, ArtDirectionPackId> = {
  editorial: 'editorial-noir',
  minimalist: 'luxury-minimal',
  organic: 'organic-studio',
  bold: 'bold-commercial',
  futuristic: 'glass-tech',
  modern: 'soft-editorial',
};

export interface ArtDirectionResolutionInput {
  industry?: string | null;
  themePresetId?: string | null;
}

/**
 * Deterministic resolution. Never random, never a "default preset" fallthrough
 * that hides a broken upstream signal: when neither signal is registered we
 * return `soft-editorial`, the neutral pack, and callers can detect that by
 * comparing against `resolveArtDirectionPackId`'s inputs.
 */
export function resolveArtDirectionPackId(input: ArtDirectionResolutionInput): ArtDirectionPackId {
  const industry = (input.industry || '').trim().toLowerCase();
  if (industry && INDUSTRY_TO_PACK[industry]) return INDUSTRY_TO_PACK[industry];

  const preset = (input.themePresetId || '').trim().toLowerCase();
  if (preset && THEME_PRESET_TO_PACK[preset]) return THEME_PRESET_TO_PACK[preset];

  return 'soft-editorial';
}

export function resolveArtDirectionPack(input: ArtDirectionResolutionInput): ArtDirectionPack {
  return ART_DIRECTION_PACKS[resolveArtDirectionPackId(input)];
}

export function getArtDirectionPack(id: string | null | undefined): ArtDirectionPack | undefined {
  if (!id) return undefined;
  return ART_DIRECTION_PACKS[id as ArtDirectionPackId];
}

/** Variants the pack allows for a section type, filtered to registered ids. */
export function familyForSection(pack: ArtDirectionPack, sectionType: SectionType): VariantId[] {
  const declared =
    sectionType === 'navbar' ? pack.navbarFamily
    : sectionType === 'footer' ? pack.footerFamily
    : pack.sectionFamilies[sectionType];
  if (!declared?.length) return [];
  return declared.filter((id) => id.split(':')[0] === sectionType && Boolean(getVariantById(id)));
}

/** The pack's first-choice variant for a section type, if it owns that family. */
export function preferredVariantForSection(
  pack: ArtDirectionPack,
  sectionType: SectionType,
): VariantId | undefined {
  return familyForSection(pack, sectionType)[0];
}

export function isVariantInFamily(
  pack: ArtDirectionPack,
  sectionType: SectionType,
  variantId: VariantId | undefined,
): boolean {
  if (!variantId) return false;
  return familyForSection(pack, sectionType).includes(variantId);
}

/**
 * Clamp a derived variant into the pack's compatible family.
 * Returns the original id when the pack declares no family for the section
 * (unknown families are left alone rather than silently rewritten).
 */
export function clampVariantToPack(
  pack: ArtDirectionPack,
  sectionType: SectionType,
  variantId: VariantId | undefined,
): VariantId | undefined {
  const family = familyForSection(pack, sectionType);
  if (!family.length) return variantId;
  if (variantId && family.includes(variantId)) return variantId;
  return family[0];
}
