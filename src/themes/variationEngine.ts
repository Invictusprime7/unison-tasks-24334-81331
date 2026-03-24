/**
 * Theme Variation Engine
 *
 * Produces structurally unique design profiles on every generation while
 * staying within each theme's aesthetic constraints. Each theme defines
 * an "allowed pool" of hero styles, card layouts, animation combos, etc.
 * A seeded RNG picks from those pools so no two generations look the same.
 */

import type { DesignProfile, HeroStyle, SectionSpacing, MaxWidth, NavStyle, ShadowLevel, ImageStyle, ButtonStyle, ButtonSize, HoverEffect, ContentDensity } from './canonical';

// ============================================================================
// Seeded PRNG (simple mulberry32 — deterministic from seed string)
// ============================================================================

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function createRng(seed: string) {
  const rng = mulberry32(hashSeed(seed));
  return {
    pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; },
    bool(prob = 0.5): boolean { return rng() < prob; },
    int(min: number, max: number): number { return min + Math.floor(rng() * (max - min + 1)); },
  };
}

// ============================================================================
// Per-Theme Allowed Pools
// ============================================================================

interface ThemeVariationPool {
  heroStyles: HeroStyle[];
  sectionSpacings: SectionSpacing[];
  maxWidths: MaxWidth[];
  navStyles: NavStyle[];
  shadowLevels: ShadowLevel[];
  imageStyles: ImageStyle[];
  buttonStyles: ButtonStyle[];
  buttonSizes: ButtonSize[];
  hoverEffects: HoverEffect[];
  contentDensities: ContentDensity[];
  /** Which optional sections can be toggled on/off */
  toggleableSections: (keyof DesignProfile['sections'])[];
  /** Min/max of optional sections to enable */
  sectionCountRange: [number, number];
  /** Allowed hero animations */
  heroAnimations: string[];
  /** Allowed card hovers */
  cardHovers: string[];
  /** Forced values that NEVER vary for this theme */
  locked: Partial<{
    glassmorphism: boolean;
    gradient_backgrounds: boolean;
    use_icons: boolean;
    use_emojis: boolean;
    writing_style: DesignProfile['content']['writing_style'];
  }>;
}

const THEME_POOLS: Record<string, ThemeVariationPool> = {
  modern: {
    heroStyles: ['split', 'centered', 'image_right'],
    sectionSpacings: ['normal', 'spacious'],
    maxWidths: ['normal', 'wide'],
    navStyles: ['sticky', 'fixed'],
    shadowLevels: ['normal', 'subtle'],
    imageStyles: ['rounded'],
    buttonStyles: ['pill', 'rounded'],
    buttonSizes: ['medium', 'large'],
    hoverEffects: ['lift', 'scale'],
    contentDensities: ['balanced', 'rich'],
    toggleableSections: ['include_stats', 'include_testimonials', 'include_faq', 'include_cta_banner', 'include_newsletter', 'include_social_proof'],
    sectionCountRange: [4, 6],
    heroAnimations: ['float', 'parallax', 'reveal'],
    cardHovers: ['lift', 'scale', 'border-shift'],
    locked: { glassmorphism: false, gradient_backgrounds: true, use_icons: true, use_emojis: false, writing_style: 'professional' },
  },
  editorial: {
    heroStyles: ['centered', 'minimal', 'image_left'],
    sectionSpacings: ['spacious'],
    maxWidths: ['narrow', 'normal'],
    navStyles: ['static', 'sticky'],
    shadowLevels: ['none', 'subtle'],
    imageStyles: ['sharp'],
    buttonStyles: ['sharp', 'outline'],
    buttonSizes: ['medium', 'small'],
    hoverEffects: ['scale', 'none'],
    contentDensities: ['rich', 'balanced'],
    toggleableSections: ['include_testimonials', 'include_faq', 'include_cta_banner', 'include_newsletter'],
    sectionCountRange: [2, 4],
    heroAnimations: ['reveal', 'typewriter', 'none'],
    cardHovers: ['border-shift', 'none'],
    locked: { glassmorphism: false, gradient_backgrounds: false, use_icons: false, use_emojis: false, writing_style: 'conversational' },
  },
  futuristic: {
    heroStyles: ['fullscreen', 'split', 'centered'],
    sectionSpacings: ['compact', 'normal'],
    maxWidths: ['full', 'wide'],
    navStyles: ['fixed'],
    shadowLevels: ['dramatic', 'normal'],
    imageStyles: ['sharp', 'rounded'],
    buttonStyles: ['sharp', 'outline'],
    buttonSizes: ['large', 'medium'],
    hoverEffects: ['glow', 'scale'],
    contentDensities: ['minimal', 'balanced'],
    toggleableSections: ['include_stats', 'include_testimonials', 'include_cta_banner', 'include_newsletter', 'include_social_proof'],
    sectionCountRange: [3, 5],
    heroAnimations: ['morph', 'parallax', 'typewriter'],
    cardHovers: ['glow', 'tilt', 'scale'],
    locked: { glassmorphism: true, gradient_backgrounds: true, use_icons: true, use_emojis: false, writing_style: 'bold' },
  },
  minimalist: {
    heroStyles: ['centered', 'minimal', 'split'],
    sectionSpacings: ['spacious', 'normal'],
    maxWidths: ['narrow', 'normal'],
    navStyles: ['sticky', 'static'],
    shadowLevels: ['none', 'subtle'],
    imageStyles: ['sharp', 'rounded'],
    buttonStyles: ['outline', 'sharp', 'rounded'],
    buttonSizes: ['small', 'medium'],
    hoverEffects: ['none', 'scale'],
    contentDensities: ['minimal'],
    toggleableSections: ['include_testimonials', 'include_faq', 'include_cta_banner'],
    sectionCountRange: [1, 3],
    heroAnimations: ['none', 'reveal', 'fade-in'],
    cardHovers: ['none', 'lift'],
    locked: { glassmorphism: false, gradient_backgrounds: false, use_icons: false, use_emojis: false, writing_style: 'minimal' },
  },
  bold: {
    heroStyles: ['fullscreen', 'split', 'image_right'],
    sectionSpacings: ['compact', 'normal'],
    maxWidths: ['wide', 'full'],
    navStyles: ['fixed', 'sticky'],
    shadowLevels: ['dramatic', 'normal'],
    imageStyles: ['sharp'],
    buttonStyles: ['sharp', 'pill'],
    buttonSizes: ['large'],
    hoverEffects: ['scale', 'lift', 'glow'],
    contentDensities: ['balanced', 'rich'],
    toggleableSections: ['include_stats', 'include_testimonials', 'include_cta_banner', 'include_social_proof'],
    sectionCountRange: [3, 5],
    heroAnimations: ['morph', 'parallax', 'reveal'],
    cardHovers: ['scale', 'lift', 'tilt'],
    locked: { glassmorphism: false, gradient_backgrounds: true, use_icons: true, use_emojis: false, writing_style: 'bold' },
  },
  organic: {
    heroStyles: ['split', 'centered', 'image_left'],
    sectionSpacings: ['spacious', 'normal'],
    maxWidths: ['normal', 'narrow'],
    navStyles: ['sticky', 'static'],
    shadowLevels: ['subtle', 'normal'],
    imageStyles: ['organic', 'rounded', 'circular'],
    buttonStyles: ['pill', 'rounded'],
    buttonSizes: ['medium', 'large'],
    hoverEffects: ['lift', 'scale'],
    contentDensities: ['balanced', 'rich'],
    toggleableSections: ['include_testimonials', 'include_faq', 'include_cta_banner', 'include_newsletter'],
    sectionCountRange: [3, 5],
    heroAnimations: ['float', 'reveal', 'none'],
    cardHovers: ['lift', 'scale', 'none'],
    locked: { glassmorphism: false, gradient_backgrounds: false, use_icons: true, use_emojis: false, writing_style: 'conversational' },
  },
};

// ============================================================================
// Variation Generator
// ============================================================================

export interface VariationResult {
  /** The randomized design profile */
  profile: DesignProfile;
  /** Human-readable summary of what was randomized (for AI prompt injection) */
  variationSummary: string;
  /** The seed used (for reproducibility) */
  seed: string;
}

/**
 * Generate a unique design variation for a theme.
 * Same theme + different seed = different layout every time.
 */
export function generateThemeVariation(themeId: string, seed?: string): VariationResult {
  const effectiveSeed = seed || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const rng = createRng(`${themeId}_${effectiveSeed}`);
  const pool = THEME_POOLS[themeId] || THEME_POOLS.modern;

  // Pick structural choices
  const heroStyle = rng.pick(pool.heroStyles);
  const sectionSpacing = rng.pick(pool.sectionSpacings);
  const maxWidth = rng.pick(pool.maxWidths);
  const navStyle = rng.pick(pool.navStyles);
  const shadowLevel = rng.pick(pool.shadowLevels);
  const imageStyle = rng.pick(pool.imageStyles);
  const buttonStyle = rng.pick(pool.buttonStyles);
  const buttonSize = rng.pick(pool.buttonSizes);
  const hoverEffect = rng.pick(pool.hoverEffects);
  const contentDensity = rng.pick(pool.contentDensities);
  const heroAnimation = rng.pick(pool.heroAnimations);
  const cardHover = rng.pick(pool.cardHovers);

  // Randomize which optional sections are ON
  const enabledCount = rng.int(pool.sectionCountRange[0], pool.sectionCountRange[1]);
  const shuffled = [...pool.toggleableSections].sort(() => rng.bool() ? 1 : -1);
  const enabledSections = new Set(shuffled.slice(0, enabledCount));

  const profile: DesignProfile = {
    layout: {
      hero_style: heroStyle,
      section_spacing: sectionSpacing,
      max_width: maxWidth,
      navigation_style: navStyle,
    },
    effects: {
      animations: true,
      scroll_animations: true,
      hover_effects: true,
      gradient_backgrounds: pool.locked.gradient_backgrounds ?? rng.bool(0.5),
      glassmorphism: pool.locked.glassmorphism ?? false,
      shadows: shadowLevel,
    },
    images: {
      style: imageStyle,
      aspect_ratio: rng.pick(['landscape', 'square', 'auto'] as const),
      placeholder_service: 'unsplash',
      overlay_style: rng.pick(['none', 'gradient'] as const),
    },
    buttons: {
      style: buttonStyle,
      size: buttonSize,
      hover_effect: hoverEffect,
    },
    sections: {
      include_stats: enabledSections.has('include_stats'),
      include_testimonials: enabledSections.has('include_testimonials'),
      include_faq: enabledSections.has('include_faq'),
      include_cta_banner: enabledSections.has('include_cta_banner'),
      include_newsletter: enabledSections.has('include_newsletter'),
      include_social_proof: enabledSections.has('include_social_proof'),
      use_counter_animations: enabledSections.has('include_stats'),
    },
    content: {
      density: contentDensity,
      use_icons: pool.locked.use_icons ?? rng.bool(0.6),
      use_emojis: pool.locked.use_emojis ?? false,
      writing_style: pool.locked.writing_style ?? 'professional',
    },
  };

  // Build human-readable variation summary for prompt injection
  const variationSummary = `## LAYOUT VARIATION FOR THIS GENERATION (seed: ${effectiveSeed})
- Hero: ${heroStyle} layout
- Navigation: ${navStyle}
- Section spacing: ${sectionSpacing}, max-width: ${maxWidth}
- Cards: ${shadowLevel} shadows, ${imageStyle} images
- Buttons: ${buttonStyle} style, ${buttonSize} size, ${hoverEffect} hover
- Hero animation: ${heroAnimation}, Card hover: ${cardHover}
- Content density: ${contentDensity}
- Enabled sections: ${[...enabledSections].join(', ')}
- IMPORTANT: This is a UNIQUE variation — do NOT use a generic default layout. Follow these structural choices exactly.`;

  return { profile, variationSummary, seed: effectiveSeed };
}
