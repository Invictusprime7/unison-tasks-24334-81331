/**
 * Art Direction Packs — the cohesion contract above theme tokens.
 *
 * A pack is a complete design system, not a variant picker. It declares:
 *   1. which variant families each section type may use (structure), and
 *   2. a full aesthetic contract — type scale, rhythm, radius, border,
 *      surface treatment, accent policy, media treatment, motion (style).
 *
 * ONE TRUTH: `resolveArtDirectionPackId` is the ONLY function allowed to
 * choose a pack. Once resolved it is sealed onto the snapshot as
 * `meta.artDirectionPackId` and every downstream surface reads it back —
 * CSS emission, the compiler, the Lane B brief, previews, and export.
 *
 * This module is intentionally React-free: the Stage 4b CSS builder and the
 * wizard worker import it, and must not pull variant components into their
 * bundles. `registry.ts` re-exports everything here so
 * `@/sections/variants` stays the single public entry point.
 */

import type { SectionType } from '../types';
import type { VariantId } from './types';

export type ArtDirectionPackId =
  | 'editorial-noir'
  | 'cinematic-portfolio'
  | 'luxury-minimal'
  | 'soft-editorial'
  | 'bold-commercial'
  | 'glass-tech'
  | 'organic-studio'
  | 'commerce-editorial'
  | 'swiss-grid'
  | 'print-serif'
  | 'neon-grid'
  | 'mono-terminal'
  | 'brutalist-poster'
  | 'warm-craft';

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

/** Surface language — how a card/panel separates itself from the page. */
export type SurfaceTreatment = 'flat' | 'bordered' | 'elevated' | 'glass' | 'offset';
/** Accent/gradient policy — how the accent colour is allowed to spread. */
export type AccentPolicy = 'none' | 'duotone-wash' | 'radial-bloom' | 'mesh' | 'scanline';
/** Media treatment — how imagery is framed. */
export type MediaTreatment = 'full-bleed' | 'framed' | 'duotone' | 'masked' | 'soft-mask';
/** Vertical cadence between sections. */
export type RhythmId = 'tight' | 'balanced' | 'airy' | 'expansive';

/**
 * The aesthetic half of a pack. Every value is emitted as a CSS custom
 * property — generated pages reference tokens and never hardcode literals.
 */
export interface ArtDirectionDesignContract {
  /** Modular scale ratio driving heading sizes. */
  typeScaleRatio: number;
  headingTracking: string;
  headingTransform: 'none' | 'uppercase';
  /** Optimal line length for body copy. */
  measure: string;
  rhythm: RhythmId;
  radius: string;
  borderWeight: string;
  surface: SurfaceTreatment;
  accentPolicy: AccentPolicy;
  mediaTreatment: MediaTreatment;
  motionDuration: string;
  motionEase: string;
  /** Travel distance for reveal motion. */
  motionDistance: string;
}

export interface ArtDirectionPack {
  id: ArtDirectionPackId;
  name: string;
  description: string;
  navbarFamily: VariantId[];
  footerFamily: VariantId[];
  /** Compatible variants per section type, most-preferred first. */
  sectionFamilies: Partial<Record<SectionType, VariantId[]>>;
  motionProfile: MotionProfileId;
  interactionProfile: InteractionProfileId;
  /** Full aesthetic contract — emitted as CSS custom properties. */
  design: ArtDirectionDesignContract;
}

const RHYTHM_SPACE: Record<RhythmId, string> = {
  tight: 'clamp(3rem, 5vw, 5rem)',
  balanced: 'clamp(4rem, 7vw, 7rem)',
  airy: 'clamp(5rem, 8.5vw, 9rem)',
  expansive: 'clamp(6rem, 10vw, 11rem)',
};

const SURFACE_RECIPES: Record<SurfaceTreatment, { fill: string; stroke: string; elevation: string; elevationHover: string }> = {
  flat: {
    fill: 'transparent',
    stroke: 'transparent',
    elevation: 'none',
    elevationHover: 'none',
  },
  bordered: {
    fill: 'hsl(var(--card))',
    stroke: 'hsl(var(--border))',
    elevation: 'none',
    elevationHover: '0 0 0 1px hsl(var(--foreground) / 0.12)',
  },
  elevated: {
    fill: 'hsl(var(--card))',
    stroke: 'hsl(var(--border) / 0.6)',
    elevation: '0 6px 18px hsl(var(--foreground) / 0.09)',
    elevationHover: '0 14px 32px hsl(var(--foreground) / 0.14)',
  },
  glass: {
    fill: 'hsl(var(--card) / 0.62)',
    stroke: 'hsl(var(--border) / 0.5)',
    elevation: '0 0 0 1px hsl(var(--primary) / 0.16), 0 12px 30px hsl(var(--foreground) / 0.22)',
    elevationHover: '0 0 0 1px hsl(var(--primary) / 0.32), 0 16px 40px hsl(var(--primary) / 0.18)',
  },
  offset: {
    fill: 'hsl(var(--card))',
    stroke: 'hsl(var(--foreground))',
    elevation: '5px 5px 0 hsl(var(--foreground))',
    elevationHover: '8px 8px 0 hsl(var(--foreground))',
  },
};

const ACCENT_RECIPES: Record<AccentPolicy, string> = {
  none: 'none',
  'duotone-wash': 'linear-gradient(135deg, hsl(var(--primary) / 0.16), hsl(var(--secondary) / 0.1))',
  'radial-bloom': 'radial-gradient(80% 120% at 50% 0%, hsl(var(--primary) / 0.28), transparent 70%)',
  mesh: 'radial-gradient(60% 80% at 15% 10%, hsl(var(--primary) / 0.26), transparent 60%), radial-gradient(50% 70% at 85% 20%, hsl(var(--secondary) / 0.22), transparent 65%)',
  scanline: 'repeating-linear-gradient(180deg, hsl(var(--primary) / 0.07) 0px, hsl(var(--primary) / 0.07) 1px, transparent 1px, transparent 4px)',
};

const MEDIA_RECIPES: Record<MediaTreatment, { radius: string; filter: string; ratio: string }> = {
  'full-bleed': { radius: '0px', filter: 'none', ratio: '16 / 9' },
  framed: { radius: 'var(--ut-radius-base)', filter: 'none', ratio: '4 / 3' },
  duotone: { radius: 'var(--ut-radius-base)', filter: 'saturate(0.55) contrast(1.12)', ratio: '3 / 2' },
  masked: { radius: 'calc(var(--ut-radius-base) * 2)', filter: 'none', ratio: '1 / 1' },
  'soft-mask': { radius: 'calc(var(--ut-radius-base) * 3)', filter: 'saturate(1.05)', ratio: '5 / 4' },
};

/**
 * Emit the pack's aesthetic contract as `--ut-*` CSS custom properties.
 * The single place a pack turns into style. Consumed by Stage 4b CSS
 * emission and mirrored into the Lane B token vocabulary.
 */
export function buildArtDirectionTokens(pack: ArtDirectionPack): Record<string, string> {
  const d = pack.design;
  const surface = SURFACE_RECIPES[d.surface];
  const media = MEDIA_RECIPES[d.mediaTreatment];
  return {
    '--ut-art-direction': pack.id,
    '--ut-type-ratio': String(d.typeScaleRatio),
    '--ut-type-display': `clamp(2.25rem, ${(d.typeScaleRatio * 3.4).toFixed(2)}vw + 1rem, ${(d.typeScaleRatio ** 3).toFixed(2)}rem)`,
    '--ut-type-title': `clamp(1.75rem, ${(d.typeScaleRatio * 2.2).toFixed(2)}vw + 0.75rem, ${(d.typeScaleRatio ** 2).toFixed(2)}rem)`,
    '--ut-type-lead': `clamp(1.0625rem, ${(d.typeScaleRatio * 0.7).toFixed(2)}vw + 0.7rem, 1.375rem)`,
    '--ut-heading-tracking': d.headingTracking,
    '--ut-heading-transform': d.headingTransform,
    '--ut-measure': d.measure,
    '--ut-rhythm-space': RHYTHM_SPACE[d.rhythm],
    '--ut-radius-base': d.radius,
    '--ut-radius-lg': `calc(${d.radius} * 2)`,
    '--ut-radius-pill': '9999px',
    '--ut-border-weight': d.borderWeight,
    '--ut-surface-fill': surface.fill,
    '--ut-surface-stroke': surface.stroke,
    '--ut-surface-elevation': surface.elevation,
    '--ut-surface-elevation-hover': surface.elevationHover,
    '--ut-accent-wash': ACCENT_RECIPES[d.accentPolicy],
    '--ut-media-frame-radius': media.radius,
    '--ut-media-filter': media.filter,
    '--ut-media-ratio': media.ratio,
    '--ut-motion-duration': d.motionDuration,
    '--ut-motion-ease': d.motionEase,
    '--ut-motion-distance': d.motionDistance,
  };
}

/** Serialize the pack tokens as a CSS declaration block fragment. */
export function buildArtDirectionCssDeclarations(pack: ArtDirectionPack): string {
  return Object.entries(buildArtDirectionTokens(pack))
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ');
}

export const ART_DIRECTION_PACKS: Record<ArtDirectionPackId, ArtDirectionPack> = {
  'editorial-noir': {
    id: 'editorial-noir',
    name: 'Editorial Noir',
    description: 'High-contrast editorial grid, dramatic display type, mosaic media.',
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
    design: {
      typeScaleRatio: 1.333,
      headingTracking: '-0.03em',
      headingTransform: 'none',
      measure: '68ch',
      rhythm: 'airy',
      radius: '0.125rem',
      borderWeight: '1px',
      surface: 'bordered',
      accentPolicy: 'none',
      mediaTreatment: 'full-bleed',
      motionDuration: '640ms',
      motionEase: 'cubic-bezier(0.16, 1, 0.3, 1)',
      motionDistance: '1.5rem',
    },
  },
  'cinematic-portfolio': {
    id: 'cinematic-portfolio',
    name: 'Cinematic Portfolio',
    description: 'Full-bleed imagery, inspection-led motion, portrait-weighted media.',
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
    design: {
      typeScaleRatio: 1.25,
      headingTracking: '-0.02em',
      headingTransform: 'none',
      measure: '62ch',
      rhythm: 'expansive',
      radius: '0.25rem',
      borderWeight: '1px',
      surface: 'flat',
      accentPolicy: 'radial-bloom',
      mediaTreatment: 'full-bleed',
      motionDuration: '760ms',
      motionEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
      motionDistance: '2rem',
    },
  },
  'luxury-minimal': {
    id: 'luxury-minimal',
    name: 'Luxury Minimal',
    description: 'Quiet layout, generous whitespace, restrained motion and framed media.',
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
    design: {
      typeScaleRatio: 1.2,
      headingTracking: '0.01em',
      headingTransform: 'none',
      measure: '58ch',
      rhythm: 'expansive',
      radius: '0rem',
      borderWeight: '1px',
      surface: 'flat',
      accentPolicy: 'none',
      mediaTreatment: 'framed',
      motionDuration: '820ms',
      motionEase: 'cubic-bezier(0.33, 1, 0.68, 1)',
      motionDistance: '0.75rem',
    },
  },
  'soft-editorial': {
    id: 'soft-editorial',
    name: 'Soft Editorial',
    description: 'Warm rounded surfaces, human proof, medium media density.',
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
    design: {
      typeScaleRatio: 1.25,
      headingTracking: '-0.015em',
      headingTransform: 'none',
      measure: '66ch',
      rhythm: 'balanced',
      radius: '0.75rem',
      borderWeight: '1px',
      surface: 'elevated',
      accentPolicy: 'duotone-wash',
      mediaTreatment: 'framed',
      motionDuration: '520ms',
      motionEase: 'cubic-bezier(0.4, 0, 0.2, 1)',
      motionDistance: '1.25rem',
    },
  },
  'bold-commercial': {
    id: 'bold-commercial',
    name: 'Bold Commercial',
    description: 'Loud hierarchy, conversion-forward blocks, compact density.',
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
    design: {
      typeScaleRatio: 1.5,
      headingTracking: '-0.04em',
      headingTransform: 'none',
      measure: '60ch',
      rhythm: 'tight',
      radius: '0.5rem',
      borderWeight: '2px',
      surface: 'elevated',
      accentPolicy: 'duotone-wash',
      mediaTreatment: 'framed',
      motionDuration: '360ms',
      motionEase: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      motionDistance: '1rem',
    },
  },
  'glass-tech': {
    id: 'glass-tech',
    name: 'Glass Tech',
    description: 'Product-led surfaces, systematic grids, precise progressive disclosure.',
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
    design: {
      typeScaleRatio: 1.25,
      headingTracking: '-0.025em',
      headingTransform: 'none',
      measure: '64ch',
      rhythm: 'balanced',
      radius: '0.875rem',
      borderWeight: '1px',
      surface: 'glass',
      accentPolicy: 'mesh',
      mediaTreatment: 'masked',
      motionDuration: '440ms',
      motionEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      motionDistance: '1rem',
    },
  },
  'organic-studio': {
    id: 'organic-studio',
    name: 'Organic Studio',
    description: 'Natural pacing, soft geometry, service storytelling over hard sell.',
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
    design: {
      typeScaleRatio: 1.2,
      headingTracking: '-0.01em',
      headingTransform: 'none',
      measure: '70ch',
      rhythm: 'airy',
      radius: '1.25rem',
      borderWeight: '1px',
      surface: 'elevated',
      accentPolicy: 'duotone-wash',
      mediaTreatment: 'soft-mask',
      motionDuration: '600ms',
      motionEase: 'cubic-bezier(0.4, 0, 0.2, 1)',
      motionDistance: '1.25rem',
    },
  },
  'commerce-editorial': {
    id: 'commerce-editorial',
    name: 'Commerce Editorial',
    description: 'Catalog-led grids with editorial framing and product focus motion.',
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
    design: {
      typeScaleRatio: 1.333,
      headingTracking: '-0.02em',
      headingTransform: 'none',
      measure: '64ch',
      rhythm: 'balanced',
      radius: '0.375rem',
      borderWeight: '1px',
      surface: 'bordered',
      accentPolicy: 'none',
      mediaTreatment: 'framed',
      motionDuration: '420ms',
      motionEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      motionDistance: '1rem',
    },
  },

  // --- Expanded set: theme-led expressions -------------------------------

  'swiss-grid': {
    id: 'swiss-grid',
    name: 'Swiss Grid',
    description: 'Strict modular grid, hairline rules, zero ornament, typographic hierarchy only.',
    navbarFamily: ['navbar:standard', 'navbar:minimal-dark'],
    footerFamily: ['footer:columns', 'footer:centered-minimal'],
    sectionFamilies: {
      hero: ['hero:split-image', 'hero:centered'],
      gallery: ['gallery:cinematic-grid', 'gallery:editorial-mosaic'],
      services: ['services:compact-list', 'services:card-grid'],
      features: ['features:grid', 'features:minimal-centered'],
      testimonials: ['testimonials:grid', 'testimonials:spotlight'],
      pricing: ['pricing:comparison', 'pricing:tiers'],
      cta: ['cta:split-card', 'cta:centered'],
      contact: ['contact:minimal-inline', 'contact:split-card'],
    },
    motionProfile: 'editorial-reveal',
    interactionProfile: 'tabs',
    design: {
      typeScaleRatio: 1.2,
      headingTracking: '-0.035em',
      headingTransform: 'none',
      measure: '54ch',
      rhythm: 'balanced',
      radius: '0rem',
      borderWeight: '1px',
      surface: 'bordered',
      accentPolicy: 'none',
      mediaTreatment: 'framed',
      motionDuration: '380ms',
      motionEase: 'cubic-bezier(0.4, 0, 0.2, 1)',
      motionDistance: '0.5rem',
    },
  },
  'print-serif': {
    id: 'print-serif',
    name: 'Print Serif',
    description: 'Long-form magazine feel, wide measure, drop-cap scale, duotone photography.',
    navbarFamily: ['navbar:centered-logo', 'navbar:standard'],
    footerFamily: ['footer:centered-minimal', 'footer:columns'],
    sectionFamilies: {
      hero: ['hero:centered', 'hero:full-bleed'],
      gallery: ['gallery:editorial-mosaic', 'gallery:feature-split'],
      services: ['services:alternating', 'services:compact-list'],
      features: ['features:minimal-centered', 'features:icon-left'],
      testimonials: ['testimonials:spotlight', 'testimonials:rail'],
      pricing: ['pricing:tiers', 'pricing:accordion'],
      cta: ['cta:centered', 'cta:split-card'],
      contact: ['contact:centered', 'contact:minimal-inline'],
    },
    motionProfile: 'editorial-reveal',
    interactionProfile: 'accordion',
    design: {
      typeScaleRatio: 1.414,
      headingTracking: '-0.015em',
      headingTransform: 'none',
      measure: '74ch',
      rhythm: 'airy',
      radius: '0.125rem',
      borderWeight: '1px',
      surface: 'flat',
      accentPolicy: 'none',
      mediaTreatment: 'duotone',
      motionDuration: '700ms',
      motionEase: 'cubic-bezier(0.16, 1, 0.3, 1)',
      motionDistance: '1.5rem',
    },
  },
  'neon-grid': {
    id: 'neon-grid',
    name: 'Neon Grid',
    description: 'Saturated accent bloom over dark panels, glowing edges, kinetic reveals.',
    navbarFamily: ['navbar:minimal-dark', 'navbar:standard'],
    footerFamily: ['footer:dark-band', 'footer:columns'],
    sectionFamilies: {
      hero: ['hero:full-bleed', 'hero:centered'],
      gallery: ['gallery:cinematic-grid', 'gallery:lightbox-grid'],
      services: ['services:card-grid', 'services:alternating'],
      features: ['features:grid', 'features:icon-left'],
      testimonials: ['testimonials:rail', 'testimonials:grid'],
      pricing: ['pricing:comparison', 'pricing:tiers'],
      cta: ['cta:gradient-banner', 'cta:centered'],
      contact: ['contact:split-card', 'contact:centered'],
    },
    motionProfile: 'product-focus',
    interactionProfile: 'tabs',
    design: {
      typeScaleRatio: 1.5,
      headingTracking: '-0.03em',
      headingTransform: 'uppercase',
      measure: '58ch',
      rhythm: 'tight',
      radius: '0.25rem',
      borderWeight: '1px',
      surface: 'glass',
      accentPolicy: 'radial-bloom',
      mediaTreatment: 'duotone',
      motionDuration: '300ms',
      motionEase: 'cubic-bezier(0.16, 1, 0.3, 1)',
      motionDistance: '1.75rem',
    },
  },
  'mono-terminal': {
    id: 'mono-terminal',
    name: 'Mono Terminal',
    description: 'Monospaced precision, scanline texture, dense technical tables and rules.',
    navbarFamily: ['navbar:minimal-dark', 'navbar:standard'],
    footerFamily: ['footer:columns', 'footer:dark-band'],
    sectionFamilies: {
      hero: ['hero:centered', 'hero:split-image'],
      gallery: ['gallery:lightbox-grid', 'gallery:cinematic-grid'],
      services: ['services:compact-list', 'services:card-grid'],
      features: ['features:icon-left', 'features:grid'],
      testimonials: ['testimonials:grid', 'testimonials:rail'],
      pricing: ['pricing:comparison', 'pricing:accordion'],
      cta: ['cta:split-card', 'cta:centered'],
      contact: ['contact:minimal-inline', 'contact:split-card'],
    },
    motionProfile: 'service-progressive-disclosure',
    interactionProfile: 'tabs',
    design: {
      typeScaleRatio: 1.15,
      headingTracking: '0.02em',
      headingTransform: 'uppercase',
      measure: '52ch',
      rhythm: 'tight',
      radius: '0rem',
      borderWeight: '1px',
      surface: 'bordered',
      accentPolicy: 'scanline',
      mediaTreatment: 'framed',
      motionDuration: '240ms',
      motionEase: 'steps(6, end)',
      motionDistance: '0.375rem',
    },
  },
  'brutalist-poster': {
    id: 'brutalist-poster',
    name: 'Brutalist Poster',
    description: 'Oversized type, hard offset shadows, thick rules, unapologetic contrast.',
    navbarFamily: ['navbar:standard', 'navbar:minimal-dark'],
    footerFamily: ['footer:dark-band', 'footer:columns'],
    sectionFamilies: {
      hero: ['hero:full-bleed', 'hero:split-image'],
      gallery: ['gallery:masonry', 'gallery:lightbox-grid'],
      services: ['services:card-grid', 'services:compact-list'],
      features: ['features:icon-left', 'features:grid'],
      testimonials: ['testimonials:rail', 'testimonials:spotlight'],
      pricing: ['pricing:tiers', 'pricing:comparison'],
      cta: ['cta:gradient-banner', 'cta:split-card'],
      contact: ['contact:split-card', 'contact:centered'],
    },
    motionProfile: 'conversion-feedback',
    interactionProfile: 'accordion',
    design: {
      typeScaleRatio: 1.618,
      headingTracking: '-0.05em',
      headingTransform: 'uppercase',
      measure: '50ch',
      rhythm: 'tight',
      radius: '0rem',
      borderWeight: '3px',
      surface: 'offset',
      accentPolicy: 'none',
      mediaTreatment: 'full-bleed',
      motionDuration: '200ms',
      motionEase: 'cubic-bezier(0.2, 0, 0, 1)',
      motionDistance: '0.5rem',
    },
  },
  'warm-craft': {
    id: 'warm-craft',
    name: 'Warm Craft',
    description: 'Hand-made warmth, deep rounding, soft masks, unhurried storytelling pace.',
    navbarFamily: ['navbar:centered-logo', 'navbar:standard'],
    footerFamily: ['footer:centered-minimal', 'footer:columns'],
    sectionFamilies: {
      hero: ['hero:split-image', 'hero:centered'],
      gallery: ['gallery:feature-split', 'gallery:masonry'],
      services: ['services:alternating', 'services:compact-list'],
      features: ['features:minimal-centered', 'features:icon-left'],
      testimonials: ['testimonials:spotlight', 'testimonials:rail'],
      pricing: ['pricing:accordion', 'pricing:tiers'],
      cta: ['cta:centered', 'cta:split-card'],
      contact: ['contact:centered', 'contact:minimal-inline'],
    },
    motionProfile: 'proof-led-stagger',
    interactionProfile: 'accordion',
    design: {
      typeScaleRatio: 1.25,
      headingTracking: '0em',
      headingTransform: 'none',
      measure: '72ch',
      rhythm: 'airy',
      radius: '1.75rem',
      borderWeight: '1px',
      surface: 'flat',
      accentPolicy: 'duotone-wash',
      mediaTreatment: 'soft-mask',
      motionDuration: '680ms',
      motionEase: 'cubic-bezier(0.33, 1, 0.68, 1)',
      motionDistance: '1rem',
    },
  },
};

export const ART_DIRECTION_PACK_IDS = Object.keys(ART_DIRECTION_PACKS) as ArtDirectionPackId[];

export const DEFAULT_ART_DIRECTION_PACK_ID: ArtDirectionPackId = 'soft-editorial';

/**
 * Theme preset → aesthetic family, most-preferred first.
 * The STYLE CARD LEADS: this is the primary axis of resolution.
 */
const THEME_PRESET_TO_PACKS: Record<string, ArtDirectionPackId[]> = {
  modern: ['soft-editorial', 'glass-tech', 'swiss-grid'],
  editorial: ['editorial-noir', 'print-serif', 'swiss-grid'],
  futuristic: ['glass-tech', 'neon-grid', 'mono-terminal'],
  minimalist: ['luxury-minimal', 'swiss-grid', 'mono-terminal'],
  bold: ['bold-commercial', 'brutalist-poster', 'commerce-editorial'],
  organic: ['organic-studio', 'warm-craft', 'soft-editorial'],
};

/**
 * Industry → packs whose section families support what the site must DO
 * (catalog grids, booking proof, gallery inspection). Industry CONSTRAINS
 * the theme's family; it no longer overrides it.
 */
const INDUSTRY_TO_PACKS: Record<string, ArtDirectionPackId[]> = {
  portfolio: ['cinematic-portfolio', 'print-serif', 'editorial-noir', 'luxury-minimal', 'warm-craft', 'swiss-grid'],
  photography: ['cinematic-portfolio', 'editorial-noir', 'print-serif', 'luxury-minimal', 'warm-craft'],
  content: ['editorial-noir', 'print-serif', 'swiss-grid', 'soft-editorial'],
  restaurant: ['editorial-noir', 'warm-craft', 'print-serif', 'organic-studio', 'cinematic-portfolio'],
  realestate: ['luxury-minimal', 'cinematic-portfolio', 'swiss-grid', 'soft-editorial'],
  salon: ['organic-studio', 'warm-craft', 'luxury-minimal', 'soft-editorial'],
  coaching: ['organic-studio', 'warm-craft', 'soft-editorial', 'print-serif'],
  nonprofit: ['organic-studio', 'warm-craft', 'print-serif', 'soft-editorial'],
  agency: ['soft-editorial', 'swiss-grid', 'editorial-noir', 'glass-tech', 'brutalist-poster'],
  contractor: ['bold-commercial', 'brutalist-poster', 'soft-editorial', 'swiss-grid'],
  landing: ['bold-commercial', 'brutalist-poster', 'glass-tech', 'neon-grid', 'soft-editorial'],
  saas: ['glass-tech', 'neon-grid', 'mono-terminal', 'swiss-grid', 'soft-editorial'],
  store: ['commerce-editorial', 'bold-commercial', 'soft-editorial', 'swiss-grid', 'brutalist-poster'],
  ecommerce: ['commerce-editorial', 'bold-commercial', 'soft-editorial', 'swiss-grid'],
  saved: ['soft-editorial', 'swiss-grid'],
  general: ['soft-editorial', 'swiss-grid', 'glass-tech'],
};

export interface ArtDirectionResolutionInput {
  industry?: string | null;
  themePresetId?: string | null;
  /**
   * Deterministic wizard seed. When a theme family offers several compatible
   * packs, the seed picks one — same seed in, same pack out, forever.
   */
  seed?: string | null;
  /**
   * Sealed pack from `meta.artDirectionPackId`. When present it WINS: the
   * snapshot is the single truth and no layer may re-derive art direction.
   */
  sealedPackId?: string | null;
}

/** FNV-1a — the same stable hash the wizard design intervention uses. */
function stableIndex(seed: string, size: number): number {
  if (size <= 1) return 0;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % size;
}

/**
 * THE single resolver. Deterministic and pure — no randomness, no network,
 * no AI. Order: sealed value → theme family (constrained by industry
 * capability) → industry capability → neutral default.
 */
export function resolveArtDirectionPackId(input: ArtDirectionResolutionInput): ArtDirectionPackId {
  const sealed = (input.sealedPackId || '').trim();
  if (sealed && ART_DIRECTION_PACKS[sealed as ArtDirectionPackId]) {
    return sealed as ArtDirectionPackId;
  }

  const preset = (input.themePresetId || '').trim().toLowerCase();
  const industry = (input.industry || '').trim().toLowerCase();
  const themeFamily = THEME_PRESET_TO_PACKS[preset];
  const industryFamily = INDUSTRY_TO_PACKS[industry];

  // Theme leads; industry narrows it to packs that support the site's job.
  let candidates: ArtDirectionPackId[] | undefined;
  if (themeFamily?.length) {
    const compatible = industryFamily?.length
      ? themeFamily.filter((id) => industryFamily.includes(id))
      : themeFamily;
    candidates = compatible.length ? compatible : industryFamily || themeFamily;
  } else {
    candidates = industryFamily;
  }

  if (!candidates?.length) return DEFAULT_ART_DIRECTION_PACK_ID;
  if (candidates.length === 1 || !input.seed) return candidates[0];
  return candidates[stableIndex(`${input.seed}|art-direction`, candidates.length)];
}

export function resolveArtDirectionPack(input: ArtDirectionResolutionInput): ArtDirectionPack {
  return ART_DIRECTION_PACKS[resolveArtDirectionPackId(input)];
}

export function getArtDirectionPack(id: string | null | undefined): ArtDirectionPack | undefined {
  if (!id) return undefined;
  return ART_DIRECTION_PACKS[id as ArtDirectionPackId];
}

export function isArtDirectionPackId(id: string | null | undefined): id is ArtDirectionPackId {
  return Boolean(id && ART_DIRECTION_PACKS[id as ArtDirectionPackId]);
}
