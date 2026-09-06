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


/** Gradient language — how colour transitions are allowed to appear. */
export type GradientProfileId =
  | 'none'
  | 'ink-fade'
  | 'dawn-wash'
  | 'spectral-mesh'
  | 'chrome-sheen'
  | 'sun-bleed'
  | 'grid-glow'
  | 'paper-grain';
/** Spacing density — grid gaps, card padding, inline gutters. */
export type DensityId = 'compact' | 'standard' | 'roomy' | 'gallery';
/** Hero composition owned by the pack (theme-led, not industry-led). */
export type HeroLayoutId =
  | 'full-bleed'
  | 'split'
  | 'centered'
  | 'asymmetric'
  | 'stacked-editorial'
  | 'poster';
/** Badge / eyebrow / tag shape language. */
export type PillStyleId =
  | 'pill-soft'
  | 'pill-solid'
  | 'square-outline'
  | 'cut-corner'
  | 'underline-caps'
  | 'mono-bracket';
/** Entrance animation character. */
export type EntranceId =
  | 'fade-lift'
  | 'slow-pan'
  | 'mask-wipe'
  | 'snap-in'
  | 'stagger-rise'
  | 'blur-focus';

/**
 * The signature half of a pack — the parts the STYLE CARD (themePresetId)
 * is expected to change even when the industry stays the same: typography
 * character, gradient language, spacing density, hero composition, pill
 * shape and entrance animation.
 */
export interface ArtDirectionSignature {
  typography: {
    /** Fallback stack appended after the style card's chosen family. */
    displayStack: string;
    bodyStack: string;
    displayWeight: number;
    bodyWeight: number;
    displayLineHeight: string;
    eyebrowTracking: string;
    eyebrowTransform: 'none' | 'uppercase';
  };
  gradient: GradientProfileId;
  density: DensityId;
  hero: {
    layout: HeroLayoutId;
    align: 'start' | 'center';
    minHeight: string;
    mediaRatio: string;
  };
  pill: PillStyleId;
  entrance: EntranceId;
}

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
  /** Theme-led signature — typography, gradient, density, hero, pill, motion. */
  signature: ArtDirectionSignature;
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


const GRADIENT_RECIPES: Record<GradientProfileId, { hero: string; panel: string; text: string; divider: string }> = {
  none: {
    hero: 'none',
    panel: 'none',
    text: 'none',
    divider: 'linear-gradient(90deg, hsl(var(--border)), hsl(var(--border)))',
  },
  'ink-fade': {
    hero: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--foreground) / 0.06) 100%)',
    panel: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.6) 100%)',
    text: 'linear-gradient(180deg, hsl(var(--foreground)) 30%, hsl(var(--foreground) / 0.62) 100%)',
    divider: 'linear-gradient(90deg, hsl(var(--foreground) / 0.35), transparent)',
  },
  'dawn-wash': {
    hero: 'linear-gradient(160deg, hsl(var(--primary) / 0.16) 0%, hsl(var(--background)) 55%, hsl(var(--secondary) / 0.14) 100%)',
    panel: 'linear-gradient(150deg, hsl(var(--card)) 0%, hsl(var(--primary) / 0.08) 100%)',
    text: 'linear-gradient(100deg, hsl(var(--foreground)), hsl(var(--primary)))',
    divider: 'linear-gradient(90deg, hsl(var(--primary) / 0.5), transparent)',
  },
  'spectral-mesh': {
    hero: 'radial-gradient(70% 90% at 12% 8%, hsl(var(--primary) / 0.34), transparent 62%), radial-gradient(60% 80% at 88% 18%, hsl(var(--secondary) / 0.3), transparent 66%), radial-gradient(90% 70% at 50% 108%, hsl(var(--accent) / 0.24), transparent 70%)',
    panel: 'linear-gradient(140deg, hsl(var(--card) / 0.85), hsl(var(--primary) / 0.12))',
    text: 'linear-gradient(92deg, hsl(var(--primary)), hsl(var(--accent)))',
    divider: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)',
  },
  'chrome-sheen': {
    hero: 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, transparent 40%, hsl(var(--primary) / 0.18) 100%)',
    panel: 'linear-gradient(120deg, hsl(var(--card) / 0.9), hsl(var(--foreground) / 0.05))',
    text: 'linear-gradient(105deg, hsl(var(--foreground)), hsl(var(--primary)) 60%, hsl(var(--foreground)))',
    divider: 'linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.4), transparent)',
  },
  'sun-bleed': {
    hero: 'linear-gradient(180deg, hsl(var(--primary) / 0.26) 0%, hsl(var(--background)) 70%)',
    panel: 'linear-gradient(180deg, hsl(var(--primary) / 0.12), hsl(var(--card)))',
    text: 'linear-gradient(96deg, hsl(var(--primary)), hsl(var(--secondary)))',
    divider: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary) / 0.2))',
  },
  'grid-glow': {
    hero: 'linear-gradient(180deg, hsl(var(--background)), hsl(var(--primary) / 0.14)), repeating-linear-gradient(90deg, hsl(var(--primary) / 0.08) 0px, hsl(var(--primary) / 0.08) 1px, transparent 1px, transparent 3.5rem)',
    panel: 'linear-gradient(180deg, hsl(var(--card) / 0.8), hsl(var(--primary) / 0.1))',
    text: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
    divider: 'repeating-linear-gradient(90deg, hsl(var(--primary) / 0.5) 0 0.5rem, transparent 0.5rem 1rem)',
  },
  'paper-grain': {
    hero: 'linear-gradient(180deg, hsl(var(--muted) / 0.5), hsl(var(--background)))',
    panel: 'linear-gradient(180deg, hsl(var(--card)), hsl(var(--muted) / 0.45))',
    text: 'none',
    divider: 'linear-gradient(90deg, hsl(var(--foreground) / 0.25), transparent)',
  },
};

const DENSITY_RECIPES: Record<DensityId, { gridGap: string; blockGap: string; cardPadding: string; gutter: string; stackGap: string }> = {
  compact: { gridGap: '1rem', blockGap: '1.25rem', cardPadding: '1.25rem', gutter: '1rem', stackGap: '0.625rem' },
  standard: { gridGap: '1.5rem', blockGap: '2rem', cardPadding: '1.75rem', gutter: '1.5rem', stackGap: '0.875rem' },
  roomy: { gridGap: '2.25rem', blockGap: '3rem', cardPadding: '2.25rem', gutter: '2rem', stackGap: '1.125rem' },
  gallery: { gridGap: '3rem', blockGap: '4.5rem', cardPadding: '2.75rem', gutter: '2.5rem', stackGap: '1.5rem' },
};

const HERO_LAYOUT_RECIPES: Record<HeroLayoutId, { columns: string; justify: string; textAlign: string; padBlock: string }> = {
  'full-bleed': { columns: '1fr', justify: 'end', textAlign: 'left', padBlock: 'clamp(6rem, 12vh, 10rem)' },
  split: { columns: 'minmax(0, 1fr) minmax(0, 1fr)', justify: 'center', textAlign: 'left', padBlock: 'clamp(4rem, 9vh, 7rem)' },
  centered: { columns: '1fr', justify: 'center', textAlign: 'center', padBlock: 'clamp(5rem, 11vh, 9rem)' },
  asymmetric: { columns: 'minmax(0, 7fr) minmax(0, 5fr)', justify: 'center', textAlign: 'left', padBlock: 'clamp(4.5rem, 10vh, 8rem)' },
  'stacked-editorial': { columns: '1fr', justify: 'start', textAlign: 'left', padBlock: 'clamp(4rem, 8vh, 6.5rem)' },
  poster: { columns: '1fr', justify: 'center', textAlign: 'left', padBlock: 'clamp(5rem, 12vh, 9rem)' },
};

const PILL_RECIPES: Record<PillStyleId, { radius: string; fill: string; stroke: string; color: string; padding: string; tracking: string; transform: string; weight: string }> = {
  'pill-soft': { radius: '9999px', fill: 'hsl(var(--primary) / 0.12)', stroke: 'transparent', color: 'hsl(var(--primary))', padding: '0.3125rem 0.75rem', tracking: '0.01em', transform: 'none', weight: '600' },
  'pill-solid': { radius: '9999px', fill: 'hsl(var(--primary))', stroke: 'transparent', color: 'hsl(var(--primary-foreground))', padding: '0.375rem 0.875rem', tracking: '0.02em', transform: 'none', weight: '700' },
  'square-outline': { radius: '0px', fill: 'transparent', stroke: 'hsl(var(--foreground) / 0.45)', color: 'hsl(var(--foreground))', padding: '0.3125rem 0.6875rem', tracking: '0.14em', transform: 'uppercase', weight: '600' },
  'cut-corner': { radius: '0px', fill: 'hsl(var(--foreground))', stroke: 'transparent', color: 'hsl(var(--background))', padding: '0.375rem 0.875rem', tracking: '0.08em', transform: 'uppercase', weight: '800' },
  'underline-caps': { radius: '0px', fill: 'transparent', stroke: 'transparent', color: 'hsl(var(--primary))', padding: '0 0 0.25rem', tracking: '0.18em', transform: 'uppercase', weight: '600' },
  'mono-bracket': { radius: '0.125rem', fill: 'hsl(var(--primary) / 0.1)', stroke: 'hsl(var(--primary) / 0.55)', color: 'hsl(var(--primary))', padding: '0.25rem 0.5rem', tracking: '0.1em', transform: 'uppercase', weight: '500' },
};

const ENTRANCE_RECIPES: Record<EntranceId, { from: string; to: string; stagger: string; hoverLift: string; hoverScale: string }> = {
  'fade-lift': { from: 'opacity: 0; transform: translateY(var(--ut-motion-distance));', to: 'opacity: 1; transform: none;', stagger: '70ms', hoverLift: '-2px', hoverScale: '1.01' },
  'slow-pan': { from: 'opacity: 0; transform: translateY(var(--ut-motion-distance)) scale(1.02);', to: 'opacity: 1; transform: none;', stagger: '120ms', hoverLift: '0px', hoverScale: '1.03' },
  'mask-wipe': { from: 'opacity: 0; clip-path: inset(0 0 100% 0);', to: 'opacity: 1; clip-path: inset(0 0 0 0);', stagger: '90ms', hoverLift: '-1px', hoverScale: '1' },
  'snap-in': { from: 'opacity: 0; transform: translateY(var(--ut-motion-distance)) scale(0.985);', to: 'opacity: 1; transform: none;', stagger: '40ms', hoverLift: '-3px', hoverScale: '1.02' },
  'stagger-rise': { from: 'opacity: 0; transform: translateY(var(--ut-motion-distance));', to: 'opacity: 1; transform: none;', stagger: '110ms', hoverLift: '-4px', hoverScale: '1.015' },
  'blur-focus': { from: 'opacity: 0; filter: blur(0.5rem); transform: translateY(var(--ut-motion-distance));', to: 'opacity: 1; filter: blur(0); transform: none;', stagger: '80ms', hoverLift: '-2px', hoverScale: '1.01' },
};

/** Entrance keyframes are pack-owned, so the CSS builder can emit them. */
export function buildEntranceKeyframes(pack: ArtDirectionPack): { from: string; to: string } {
  const recipe = ENTRANCE_RECIPES[pack.signature.entrance];
  return { from: recipe.from, to: recipe.to };
}

/** Hero composition the compiler and Lane B must both honour. */
export function resolveHeroPresentation(pack: ArtDirectionPack): {
  layout: HeroLayoutId;
  align: 'start' | 'center';
  mediaRatio: string;
} {
  return {
    layout: pack.signature.hero.layout,
    align: pack.signature.hero.align,
    mediaRatio: pack.signature.hero.mediaRatio,
  };
}

/**
 * Emit the pack's aesthetic contract as `--ut-*` CSS custom properties.
 * The single place a pack turns into style. Consumed by Stage 4b CSS
 * emission and mirrored into the Lane B token vocabulary.
 */
export function buildArtDirectionTokens(pack: ArtDirectionPack): Record<string, string> {
  const d = pack.design;
  const sig = pack.signature;
  const surface = SURFACE_RECIPES[d.surface];
  const media = MEDIA_RECIPES[d.mediaTreatment];
  const gradient = GRADIENT_RECIPES[sig.gradient];
  const density = DENSITY_RECIPES[sig.density];
  const hero = HERO_LAYOUT_RECIPES[sig.hero.layout];
  const pill = PILL_RECIPES[sig.pill];
  const entrance = ENTRANCE_RECIPES[sig.entrance];
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

    // ── Theme-led signature: typography, gradients, density, hero, pills ──
    '--ut-font-display-stack': sig.typography.displayStack,
    '--ut-font-body-stack': sig.typography.bodyStack,
    '--ut-weight-display': String(sig.typography.displayWeight),
    '--ut-weight-body': String(sig.typography.bodyWeight),
    '--ut-display-leading': sig.typography.displayLineHeight,
    '--ut-eyebrow-tracking': sig.typography.eyebrowTracking,
    '--ut-eyebrow-transform': sig.typography.eyebrowTransform,

    '--ut-gradient-profile': sig.gradient,
    '--ut-gradient-hero': gradient.hero,
    '--ut-gradient-panel': gradient.panel,
    '--ut-gradient-text': gradient.text,
    '--ut-gradient-divider': gradient.divider,

    '--ut-density': sig.density,
    '--ut-grid-gap': density.gridGap,
    '--ut-block-gap': density.blockGap,
    '--ut-card-padding': density.cardPadding,
    '--ut-inline-gutter': density.gutter,
    '--ut-stack-gap': density.stackGap,

    '--ut-hero-layout': sig.hero.layout,
    '--ut-hero-align': sig.hero.align,
    '--ut-hero-columns': hero.columns,
    '--ut-hero-justify': hero.justify,
    '--ut-hero-text-align': hero.textAlign,
    '--ut-hero-pad-block': hero.padBlock,
    '--ut-hero-min-height': sig.hero.minHeight,
    '--ut-hero-media-ratio': sig.hero.mediaRatio,

    '--ut-pill-style': sig.pill,
    '--ut-pill-radius': pill.radius,
    '--ut-pill-fill': pill.fill,
    '--ut-pill-stroke': pill.stroke,
    '--ut-pill-color': pill.color,
    '--ut-pill-padding': pill.padding,
    '--ut-pill-tracking': pill.tracking,
    '--ut-pill-transform': pill.transform,
    '--ut-pill-weight': pill.weight,

    '--ut-entrance': sig.entrance,
    '--ut-motion-stagger': entrance.stagger,
    '--ut-hover-lift': entrance.hoverLift,
    '--ut-hover-scale': entrance.hoverScale,
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
    signature: {
      typography: {
        displayStack: 'ui-serif, Georgia, "Times New Roman", serif',
        bodyStack: '"Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif',
        displayWeight: 700,
        bodyWeight: 400,
        displayLineHeight: '1.02',
        eyebrowTracking: '0.16em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'ink-fade',
      density: 'roomy',
      hero: { layout: 'stacked-editorial', align: 'start', minHeight: '72vh', mediaRatio: '16 / 9' },
      pill: 'underline-caps',
      entrance: 'mask-wipe',
    },
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
    signature: {
      typography: {
        displayStack: '"Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif',
        bodyStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        displayWeight: 500,
        bodyWeight: 400,
        displayLineHeight: '1.05',
        eyebrowTracking: '0.22em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'ink-fade',
      density: 'gallery',
      hero: { layout: 'full-bleed', align: 'start', minHeight: '88vh', mediaRatio: '21 / 9' },
      pill: 'underline-caps',
      entrance: 'slow-pan',
    },
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
    signature: {
      typography: {
        displayStack: 'ui-serif, Georgia, "Times New Roman", serif',
        bodyStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        displayWeight: 400,
        bodyWeight: 300,
        displayLineHeight: '1.12',
        eyebrowTracking: '0.28em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'none',
      density: 'gallery',
      hero: { layout: 'centered', align: 'center', minHeight: '76vh', mediaRatio: '3 / 2' },
      pill: 'underline-caps',
      entrance: 'blur-focus',
    },
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
    signature: {
      typography: {
        displayStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        bodyStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        displayWeight: 600,
        bodyWeight: 400,
        displayLineHeight: '1.08',
        eyebrowTracking: '0.08em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'dawn-wash',
      density: 'roomy',
      hero: { layout: 'split', align: 'start', minHeight: '70vh', mediaRatio: '4 / 3' },
      pill: 'pill-soft',
      entrance: 'fade-lift',
    },
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
    signature: {
      typography: {
        displayStack: '"Helvetica Neue", Impact, ui-sans-serif, sans-serif',
        bodyStack: '"Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif',
        displayWeight: 800,
        bodyWeight: 500,
        displayLineHeight: '0.98',
        eyebrowTracking: '0.06em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'sun-bleed',
      density: 'standard',
      hero: { layout: 'asymmetric', align: 'start', minHeight: '74vh', mediaRatio: '16 / 9' },
      pill: 'pill-solid',
      entrance: 'snap-in',
    },
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
    signature: {
      typography: {
        displayStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        bodyStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        displayWeight: 600,
        bodyWeight: 400,
        displayLineHeight: '1.06',
        eyebrowTracking: '0.12em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'spectral-mesh',
      density: 'standard',
      hero: { layout: 'centered', align: 'center', minHeight: '78vh', mediaRatio: '16 / 10' },
      pill: 'pill-soft',
      entrance: 'blur-focus',
    },
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
    signature: {
      typography: {
        displayStack: 'ui-serif, Georgia, "Times New Roman", serif',
        bodyStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        displayWeight: 500,
        bodyWeight: 400,
        displayLineHeight: '1.14',
        eyebrowTracking: '0.1em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'dawn-wash',
      density: 'roomy',
      hero: { layout: 'split', align: 'start', minHeight: '68vh', mediaRatio: '5 / 4' },
      pill: 'pill-soft',
      entrance: 'stagger-rise',
    },
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
    signature: {
      typography: {
        displayStack: '"Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif',
        bodyStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        displayWeight: 700,
        bodyWeight: 400,
        displayLineHeight: '1.04',
        eyebrowTracking: '0.12em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'paper-grain',
      density: 'standard',
      hero: { layout: 'split', align: 'start', minHeight: '66vh', mediaRatio: '4 / 5' },
      pill: 'square-outline',
      entrance: 'fade-lift',
    },
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
    signature: {
      typography: {
        displayStack: '"Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif',
        bodyStack: '"Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif',
        displayWeight: 700,
        bodyWeight: 400,
        displayLineHeight: '1.0',
        eyebrowTracking: '0.02em',
        eyebrowTransform: 'none',
      },
      gradient: 'none',
      density: 'compact',
      hero: { layout: 'stacked-editorial', align: 'start', minHeight: '64vh', mediaRatio: '3 / 2' },
      pill: 'square-outline',
      entrance: 'snap-in',
    },
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
    signature: {
      typography: {
        displayStack: 'ui-serif, Georgia, "Times New Roman", serif',
        bodyStack: 'ui-serif, Georgia, "Times New Roman", serif',
        displayWeight: 600,
        bodyWeight: 400,
        displayLineHeight: '1.1',
        eyebrowTracking: '0.2em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'paper-grain',
      density: 'roomy',
      hero: { layout: 'stacked-editorial', align: 'start', minHeight: '70vh', mediaRatio: '3 / 2' },
      pill: 'underline-caps',
      entrance: 'mask-wipe',
    },
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
    signature: {
      typography: {
        displayStack: 'ui-monospace, "SF Mono", Menlo, monospace',
        bodyStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        displayWeight: 700,
        bodyWeight: 400,
        displayLineHeight: '1.0',
        eyebrowTracking: '0.24em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'grid-glow',
      density: 'standard',
      hero: { layout: 'centered', align: 'center', minHeight: '82vh', mediaRatio: '16 / 9' },
      pill: 'mono-bracket',
      entrance: 'snap-in',
    },
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
    signature: {
      typography: {
        displayStack: 'ui-monospace, "SF Mono", Menlo, monospace',
        bodyStack: 'ui-monospace, "SF Mono", Menlo, monospace',
        displayWeight: 500,
        bodyWeight: 400,
        displayLineHeight: '1.05',
        eyebrowTracking: '0.16em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'chrome-sheen',
      density: 'compact',
      hero: { layout: 'stacked-editorial', align: 'start', minHeight: '62vh', mediaRatio: '16 / 9' },
      pill: 'mono-bracket',
      entrance: 'fade-lift',
    },
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
    signature: {
      typography: {
        displayStack: '"Helvetica Neue", Impact, ui-sans-serif, sans-serif',
        bodyStack: '"Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif',
        displayWeight: 900,
        bodyWeight: 500,
        displayLineHeight: '0.92',
        eyebrowTracking: '0.02em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'chrome-sheen',
      density: 'compact',
      hero: { layout: 'poster', align: 'start', minHeight: '80vh', mediaRatio: '1 / 1' },
      pill: 'cut-corner',
      entrance: 'snap-in',
    },
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
    signature: {
      typography: {
        displayStack: 'ui-serif, Georgia, "Times New Roman", serif',
        bodyStack: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        displayWeight: 500,
        bodyWeight: 400,
        displayLineHeight: '1.16',
        eyebrowTracking: '0.14em',
        eyebrowTransform: 'uppercase',
      },
      gradient: 'dawn-wash',
      density: 'roomy',
      hero: { layout: 'split', align: 'start', minHeight: '66vh', mediaRatio: '5 / 4' },
      pill: 'pill-soft',
      entrance: 'stagger-rise',
    },
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
