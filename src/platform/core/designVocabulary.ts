/**
 * Canonical Design Vocabulary Registry (Phase 2 — design intelligence).
 *
 * Phase 1 made powerful React/R3F output *legal*. This registry is what makes
 * it *usable*: instead of handing Lane B five generic recipes and the word
 * "premium", it hands over a curated construction kit whose every entry
 * declares what it costs and what it composes from.
 *
 * AUTHORITY
 *   - This module is a DEPENDENCY OF THE COMPILER, never a parallel pipeline.
 *     It resolves nothing on its own; `experienceCapabilityResolver` reads it,
 *     `wizardDesignIntervention` seals the result, Lane B composes from it.
 *   - It owns visual VOCABULARY only. It never decides page identity, section
 *     presence, or business capability — those stay with topology and the
 *     SiteBundleSnapshot composition (see
 *     mem://architecture/site-os/composition-authority).
 *
 * Each entry declares:
 *   - `capabilities`  business capabilities required before it may be offered
 *   - `experience`    WebGL/3D cost so the existing experience preflight can
 *                     budget it without a second cost model
 *   - `primitives`    the foundation exports it composes from
 *   - `traits`        resolver-facing characteristics (density, symmetry…)
 */

import type { ExperiencePrimitive } from './experiencePrimitives';

export const DESIGN_VOCABULARY_VERSION = '1.0' as const;

export type VocabularyCategory =
  | 'hero'
  | 'content'
  | 'media'
  | 'background'
  | 'commerce'
  | 'motion'
  | 'navigation';

/** How expensive an entry is for the experience (WebGL) budget. */
export type VocabularyExperienceCost = 'none' | 'accent' | 'heavy';

export type VocabularyDensity = 'compact' | 'balanced' | 'airy';
export type VocabularySymmetry = 'symmetric' | 'asymmetric';
export type VocabularyVisualDominance = 'low' | 'medium' | 'high';
export type VocabularyMotionIntensity = 'restrained' | 'balanced' | 'expressive';

export interface DesignVocabularyEntry {
  id: string;
  category: VocabularyCategory;
  label: string;
  /** One-line composition instruction handed to Lane B verbatim. */
  directive: string;
  /** Business capabilities that must be present for this entry to be offered. */
  capabilities: readonly string[];
  /** Experience-layer cost — feeds the existing experience preflight budget. */
  experience: VocabularyExperienceCost;
  /** Foundation experience primitives this entry composes from (if any). */
  primitives: readonly ExperiencePrimitive[];
  traits: {
    density: VocabularyDensity;
    symmetry: VocabularySymmetry;
    visualDominance: VocabularyVisualDominance;
    motion: VocabularyMotionIntensity;
  };
}

function entry(
  id: string,
  category: VocabularyCategory,
  label: string,
  directive: string,
  traits: DesignVocabularyEntry['traits'],
  options: {
    capabilities?: readonly string[];
    experience?: VocabularyExperienceCost;
    primitives?: readonly ExperiencePrimitive[];
  } = {},
): DesignVocabularyEntry {
  return {
    id,
    category,
    label,
    directive,
    capabilities: options.capabilities ?? [],
    experience: options.experience ?? 'none',
    primitives: options.primitives ?? [],
    traits,
  };
}

const T = (
  density: VocabularyDensity,
  symmetry: VocabularySymmetry,
  visualDominance: VocabularyVisualDominance,
  motion: VocabularyMotionIntensity,
): DesignVocabularyEntry['traits'] => ({ density, symmetry, visualDominance, motion });

// ============================================================================
// HERO
// ============================================================================

const HERO: DesignVocabularyEntry[] = [
  entry('immersive-product', 'hero', 'Immersive product hero',
    'Full-viewport product stage with a depth-lit scene behind readable DOM copy and the primary CTA.',
    T('airy', 'asymmetric', 'high', 'expressive'),
    { experience: 'heavy', primitives: ['ImmersiveHero', 'ProductStage'], capabilities: ['commerce'] }),
  entry('oversized-editorial', 'hero', 'Oversized editorial hero',
    'Monumental display headline breaking the grid, a single supporting line, and one restrained CTA.',
    T('airy', 'asymmetric', 'medium', 'balanced')),
  entry('split-cinematic', 'hero', 'Split cinematic hero',
    'Two-column split: full-bleed media on one side, tight copy stack and CTA on the other.',
    T('balanced', 'asymmetric', 'high', 'balanced')),
  entry('floating-media', 'hero', 'Floating media hero',
    'Copy anchored left with parallax-floating media cards drifting at different depths.',
    T('airy', 'asymmetric', 'high', 'expressive'),
    { experience: 'accent', primitives: ['FloatingMedia'] }),
  entry('kinetic-type', 'hero', 'Kinetic type hero',
    'Typography is the artwork: staggered, mask-revealed display lines with minimal imagery.',
    T('airy', 'symmetric', 'low', 'expressive')),
  entry('interactive-canvas', 'hero', 'Interactive canvas hero',
    'Reactive canvas backdrop behind a centered value proposition; content never depends on WebGL.',
    T('airy', 'symmetric', 'high', 'expressive'),
    { experience: 'heavy', primitives: ['ImmersiveHero', 'SceneBackground'] }),
  entry('fullscreen-video', 'hero', 'Fullscreen video hero',
    'Edge-to-edge looping media with a legibility scrim and a single conversion action.',
    T('compact', 'symmetric', 'high', 'balanced')),
  entry('collage', 'hero', 'Collage hero',
    'Overlapping offset image plates at varied aspect ratios with headline type interleaved.',
    T('balanced', 'asymmetric', 'high', 'expressive')),
  entry('3d-product', 'hero', '3D product hero',
    'Rotating product stage as the hero subject with specs and CTA beside it.',
    T('balanced', 'asymmetric', 'high', 'expressive'),
    { experience: 'heavy', primitives: ['ProductStage', 'ModelViewer'], capabilities: ['commerce'] }),
  entry('asymmetric-story', 'hero', 'Asymmetric story hero',
    'Off-axis narrative block: eyebrow, long-form promise, inline proof, offset media.',
    T('airy', 'asymmetric', 'medium', 'balanced')),
  entry('scroll-reveal', 'hero', 'Scroll-reveal hero',
    'Hero elements arrive on scroll-linked reveal with a pinned focal subject.',
    T('balanced', 'symmetric', 'medium', 'expressive')),
];

// ============================================================================
// CONTENT
// ============================================================================

const CONTENT: DesignVocabularyEntry[] = [
  entry('editorial-story', 'content', 'Editorial story',
    'Long-form measured column with pull quotes and inline media — no card grid.',
    T('airy', 'asymmetric', 'medium', 'restrained')),
  entry('sticky-narrative', 'content', 'Sticky narrative',
    'Sticky media pane paired with scrolling narrative steps.',
    T('balanced', 'asymmetric', 'high', 'expressive')),
  entry('bento', 'content', 'Bento grid',
    'Mixed-span bento tiles with deliberate hierarchy — never equal-width cards.',
    T('compact', 'asymmetric', 'medium', 'balanced')),
  entry('horizontal-scroll', 'content', 'Horizontal scroll rail',
    'Horizontally scrolling rail of unequal panels with snap points and keyboard access.',
    T('balanced', 'asymmetric', 'high', 'expressive')),
  entry('layered-media', 'content', 'Layered media',
    'Text layered over offset media plates with depth separation.',
    T('airy', 'asymmetric', 'high', 'balanced')),
  entry('split-feature', 'content', 'Split feature',
    'Alternating media/copy split rows with varying media dominance per row.',
    T('balanced', 'asymmetric', 'medium', 'balanced')),
  entry('floating-cards', 'content', 'Floating cards',
    'Elevated cards at staggered vertical offsets with hover depth.',
    T('balanced', 'asymmetric', 'medium', 'expressive')),
  entry('marquee', 'content', 'Marquee strip',
    'Continuous marquee of proof marks or statements, paused on hover/reduced motion.',
    T('compact', 'symmetric', 'low', 'expressive')),
  entry('comparison', 'content', 'Comparison matrix',
    'Structured comparison table/matrix with an emphasised recommended column.',
    T('compact', 'symmetric', 'low', 'restrained')),
  entry('timeline', 'content', 'Timeline',
    'Sequential timeline with progressive reveal and anchored milestones.',
    T('balanced', 'asymmetric', 'low', 'balanced')),
];

// ============================================================================
// MEDIA
// ============================================================================

const MEDIA: DesignVocabularyEntry[] = [
  entry('depth-gallery', 'media', 'Depth gallery',
    'Parallax depth gallery with focus-on-hover inspection.',
    T('airy', 'asymmetric', 'high', 'expressive'),
    { experience: 'heavy', primitives: ['DepthGallery'] }),
  entry('lookbook', 'media', 'Lookbook',
    'Full-bleed editorial spreads with captions set as running text.',
    T('airy', 'asymmetric', 'high', 'balanced')),
  entry('masonry', 'media', 'Masonry',
    'Masonry grid preserving native aspect ratios; no forced square crops.',
    T('compact', 'asymmetric', 'high', 'balanced')),
  entry('lightbox', 'media', 'Lightbox grid',
    'Grid with accessible dialog lightbox, keyboard navigation and captions.',
    T('balanced', 'symmetric', 'high', 'balanced')),
  entry('filmstrip', 'media', 'Filmstrip',
    'Horizontal filmstrip of tall frames with a scrubbing rail.',
    T('compact', 'asymmetric', 'high', 'expressive')),
  entry('infinite-carousel', 'media', 'Infinite carousel',
    'Looping carousel with visible neighbours and momentum.',
    T('balanced', 'symmetric', 'high', 'expressive')),
  entry('stacked-images', 'media', 'Stacked images',
    'Deck of overlapping images that fan out on interaction.',
    T('balanced', 'asymmetric', 'high', 'expressive')),
  entry('3d-viewer', 'media', '3D viewer',
    'Inspectable 3D asset viewer with a static image fallback.',
    T('balanced', 'symmetric', 'high', 'expressive'),
    { experience: 'heavy', primitives: ['ModelViewer'] }),
  entry('parallax-gallery', 'media', 'Parallax gallery',
    'Columns scrolling at different rates for depth.',
    T('airy', 'asymmetric', 'high', 'expressive')),
];

// ============================================================================
// BACKGROUND
// ============================================================================

const BACKGROUND: DesignVocabularyEntry[] = [
  entry('particle-field', 'background', 'Particle field',
    'Low-density particle ambience behind content; never carries meaning.',
    T('airy', 'symmetric', 'medium', 'expressive'),
    { experience: 'accent', primitives: ['ParticleField'] }),
  entry('mesh-gradient', 'background', 'Mesh gradient',
    'Soft multi-stop mesh gradient built from semantic tokens only.',
    T('airy', 'symmetric', 'medium', 'restrained')),
  entry('animated-grid', 'background', 'Animated grid',
    'Slow-drifting technical grid with token-driven line colour.',
    T('compact', 'symmetric', 'low', 'balanced')),
  entry('noise-field', 'background', 'Noise field',
    'Fine grain/noise texture layer for tactile depth.',
    T('balanced', 'symmetric', 'low', 'restrained')),
  entry('glow-field', 'background', 'Glow field',
    'Diffuse accent glows anchored behind focal content.',
    T('airy', 'symmetric', 'medium', 'balanced')),
  entry('3d-scene', 'background', '3D scene backdrop',
    'Ambient 3D backdrop scene behind DOM content.',
    T('airy', 'symmetric', 'high', 'expressive'),
    { experience: 'heavy', primitives: ['SceneBackground'] }),
  entry('gradient-orbs', 'background', 'Gradient orbs',
    'Blurred accent orbs drifting slowly behind sections.',
    T('airy', 'asymmetric', 'medium', 'balanced')),
  entry('media-canvas', 'background', 'Media canvas',
    'Full-bleed media used as the section canvas with a legibility scrim.',
    T('balanced', 'symmetric', 'high', 'balanced')),
];

// ============================================================================
// COMMERCE
// ============================================================================

const COMMERCE: DesignVocabularyEntry[] = [
  entry('product-stage', 'commerce', 'Product stage',
    'Single hero product on a lit stage with price, variants and add-to-bag intent.',
    T('airy', 'asymmetric', 'high', 'expressive'),
    { experience: 'heavy', primitives: ['ProductStage'], capabilities: ['commerce'] }),
  entry('editorial-product-grid', 'commerce', 'Editorial product grid',
    'Mixed-span product grid with editorial captions instead of uniform cards.',
    T('balanced', 'asymmetric', 'high', 'balanced'),
    { capabilities: ['commerce'] }),
  entry('featured-product', 'commerce', 'Featured product',
    'Full-bleed feature band for one product with narrative copy.',
    T('airy', 'asymmetric', 'high', 'balanced'),
    { capabilities: ['commerce'] }),
  entry('quick-view', 'commerce', 'Quick view',
    'Accessible dialog quick-view with variant selection and cart intent.',
    T('compact', 'symmetric', 'medium', 'balanced'),
    { capabilities: ['commerce'] }),
  entry('interactive-product', 'commerce', 'Interactive product',
    'Configurable product with live preview of the selected options.',
    T('balanced', 'asymmetric', 'high', 'expressive'),
    { experience: 'accent', primitives: ['ProductStage'], capabilities: ['commerce'] }),
  entry('category-showcase', 'commerce', 'Category showcase',
    'Category entry points at unequal weights driven by merchandising priority.',
    T('balanced', 'asymmetric', 'high', 'balanced'),
    { capabilities: ['commerce'] }),
];

// ============================================================================
// MOTION
// ============================================================================

const MOTION: DesignVocabularyEntry[] = [
  entry('stagger', 'motion', 'Stagger', 'Children enter on a staggered cascade.',
    T('balanced', 'symmetric', 'low', 'balanced')),
  entry('scroll-linked', 'motion', 'Scroll-linked', 'Progress is driven by scroll position, not time.',
    T('balanced', 'asymmetric', 'medium', 'expressive')),
  entry('mask-reveal', 'motion', 'Mask reveal', 'Type and media arrive through a clipping mask.',
    T('balanced', 'asymmetric', 'medium', 'expressive')),
  entry('parallax', 'motion', 'Parallax', 'Layers translate at differing rates for depth.',
    T('airy', 'asymmetric', 'high', 'expressive')),
  entry('magnetic', 'motion', 'Magnetic', 'Interactive controls attract the pointer within a small radius.',
    T('compact', 'symmetric', 'low', 'expressive')),
  entry('hover-depth', 'motion', 'Hover depth', 'Hover raises the surface with light and shadow response.',
    T('balanced', 'symmetric', 'low', 'balanced')),
  entry('cursor-reactive', 'motion', 'Cursor reactive', 'Backdrop or media responds subtly to pointer position.',
    T('airy', 'asymmetric', 'medium', 'expressive')),
  entry('page-transition', 'motion', 'Page transition', 'Route changes cross-fade or wipe rather than cutting.',
    T('balanced', 'symmetric', 'low', 'balanced')),
];

// ============================================================================
// NAVIGATION
// ============================================================================

const NAVIGATION: DesignVocabularyEntry[] = [
  entry('floating-pill', 'navigation', 'Floating pill nav',
    'Detached rounded nav bar floating over content with blur backing.',
    T('compact', 'symmetric', 'low', 'balanced')),
  entry('editorial', 'navigation', 'Editorial nav',
    'Wordmark left, sparse links right, hairline rule beneath.',
    T('airy', 'symmetric', 'low', 'restrained')),
  entry('transparent-overlay', 'navigation', 'Transparent overlay nav',
    'Transparent over the hero, solidifying on scroll.',
    T('balanced', 'symmetric', 'low', 'balanced')),
  entry('mega-nav', 'navigation', 'Mega nav',
    'Expanding panel grouping destinations with media previews.',
    T('compact', 'symmetric', 'medium', 'balanced')),
  entry('minimal', 'navigation', 'Minimal nav',
    'Wordmark plus a single primary action; everything else in the mobile dialog.',
    T('airy', 'symmetric', 'low', 'restrained')),
  entry('split', 'navigation', 'Split nav',
    'Links split either side of a centered wordmark.',
    T('balanced', 'symmetric', 'low', 'restrained')),
];

export const DESIGN_VOCABULARY: readonly DesignVocabularyEntry[] = Object.freeze([
  ...HERO, ...CONTENT, ...MEDIA, ...BACKGROUND, ...COMMERCE, ...MOTION, ...NAVIGATION,
]);

const BY_ID = new Map(DESIGN_VOCABULARY.map((item) => [`${item.category}:${item.id}`, item]));

export function getVocabularyEntry(
  category: VocabularyCategory,
  id: string,
): DesignVocabularyEntry | undefined {
  return BY_ID.get(`${category}:${id}`);
}

export function getVocabularyByCategory(category: VocabularyCategory): DesignVocabularyEntry[] {
  return DESIGN_VOCABULARY.filter((item) => item.category === category);
}

export function isVocabularyId(category: VocabularyCategory, id: unknown): id is string {
  return typeof id === 'string' && BY_ID.has(`${category}:${id}`);
}

/** Experience primitives implied by a set of chosen vocabulary ids. */
export function primitivesForVocabulary(
  picks: ReadonlyArray<{ category: VocabularyCategory; id: string }>,
): ExperiencePrimitive[] {
  const out = new Set<ExperiencePrimitive>();
  for (const pick of picks) {
    for (const primitive of getVocabularyEntry(pick.category, pick.id)?.primitives ?? []) {
      out.add(primitive);
    }
  }
  return [...out];
}

/** Heavy (WebGL) entries among a set of picks — feeds the experience budget. */
export function heavyVocabularyPicks(
  picks: ReadonlyArray<{ category: VocabularyCategory; id: string }>,
): string[] {
  return picks
    .filter((pick) => getVocabularyEntry(pick.category, pick.id)?.experience === 'heavy')
    .map((pick) => `${pick.category}:${pick.id}`);
}
