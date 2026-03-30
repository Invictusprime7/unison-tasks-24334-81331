/**
 * Design Variation Generator
 *
 * Produces randomized design schema parameters for the systems-build
 * edge function so that every generated website has a unique layout,
 * visual effect set, button style, image treatment, and section mix.
 *
 * This is the PRIMARY mechanism for visual diversity — the variationSeed
 * in the edge function only nudges AI creative choices; the design schema
 * is the authoritative contract the AI follows.
 */

// ============================================================================
// Option pools — each field draws from these at random
// ============================================================================

const HERO_STYLES = ["centered", "split", "image_left", "image_right", "fullscreen", "minimal"] as const;
const SECTION_SPACINGS = ["compact", "normal", "spacious"] as const;
const MAX_WIDTHS = ["narrow", "normal", "wide", "full"] as const;
const NAV_STYLES = ["fixed", "sticky", "static"] as const;
const SHADOW_LEVELS = ["none", "subtle", "normal", "dramatic"] as const;
const IMAGE_STYLES = ["rounded", "sharp", "circular", "organic"] as const;
const ASPECT_RATIOS = ["square", "portrait", "landscape", "auto"] as const;
const OVERLAY_STYLES = ["none", "gradient", "color", "blur"] as const;
const BUTTON_STYLES = ["rounded", "pill", "sharp", "outline"] as const;
const BUTTON_SIZES = ["small", "medium", "large"] as const;
const HOVER_EFFECTS = ["scale", "glow", "lift", "none"] as const;
const CONTENT_DENSITIES = ["minimal", "balanced", "rich"] as const;
const WRITING_STYLES = ["professional", "conversational", "bold", "minimal"] as const;

const FONT_PAIRINGS: Array<{ heading: string; body: string }> = [
  { heading: "Plus Jakarta Sans", body: "Inter" },
  { heading: "Space Grotesk", body: "DM Sans" },
  { heading: "Manrope", body: "Inter" },
  { heading: "Outfit", body: "Nunito" },
  { heading: "Sora", body: "Inter" },
  { heading: "Clash Display", body: "DM Sans" },
  { heading: "Poppins", body: "Inter" },
  { heading: "Raleway", body: "Lato" },
  { heading: "Montserrat", body: "Open Sans" },
  { heading: "Playfair Display", body: "Source Sans 3" },
];

// ============================================================================
// Helpers
// ============================================================================

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function coinFlip(probability = 0.5): boolean {
  return Math.random() < probability;
}

// ============================================================================
// Public API
// ============================================================================

export interface DesignVariation {
  layout: {
    hero_style: (typeof HERO_STYLES)[number];
    section_spacing: (typeof SECTION_SPACINGS)[number];
    max_width: (typeof MAX_WIDTHS)[number];
    navigation_style: (typeof NAV_STYLES)[number];
  };
  effects: {
    animations: boolean;
    scroll_animations: boolean;
    hover_effects: boolean;
    gradient_backgrounds: boolean;
    glassmorphism: boolean;
    shadows: (typeof SHADOW_LEVELS)[number];
  };
  images: {
    style: (typeof IMAGE_STYLES)[number];
    aspect_ratio: (typeof ASPECT_RATIOS)[number];
    placeholder_service: "unsplash";
    overlay_style: (typeof OVERLAY_STYLES)[number];
  };
  buttons: {
    style: (typeof BUTTON_STYLES)[number];
    size: (typeof BUTTON_SIZES)[number];
    hover_effect: (typeof HOVER_EFFECTS)[number];
  };
  sections: {
    include_stats: boolean;
    include_testimonials: boolean;
    include_faq: boolean;
    include_cta_banner: boolean;
    include_newsletter: boolean;
    include_social_proof: boolean;
    use_counter_animations: boolean;
  };
  content: {
    density: (typeof CONTENT_DENSITIES)[number];
    use_icons: boolean;
    use_emojis: boolean;
    writing_style: (typeof WRITING_STYLES)[number];
  };
}

/**
 * Generate a randomized design schema.
 * Core sections (testimonials, CTA) are weighted to appear most of the time
 * but NOT always, ensuring visual diversity.
 */
export function generateDesignVariation(): DesignVariation {
  return {
    layout: {
      hero_style: pick(HERO_STYLES),
      section_spacing: pick(SECTION_SPACINGS),
      max_width: pick(MAX_WIDTHS),
      navigation_style: pick(NAV_STYLES),
    },
    effects: {
      animations: coinFlip(0.85),
      scroll_animations: coinFlip(0.8),
      hover_effects: coinFlip(0.9),
      gradient_backgrounds: coinFlip(0.7),
      glassmorphism: coinFlip(0.3),
      shadows: pick(SHADOW_LEVELS),
    },
    images: {
      style: pick(IMAGE_STYLES),
      aspect_ratio: pick(ASPECT_RATIOS),
      placeholder_service: "unsplash",
      overlay_style: pick(OVERLAY_STYLES),
    },
    buttons: {
      style: pick(BUTTON_STYLES),
      size: pick(BUTTON_SIZES),
      hover_effect: pick(HOVER_EFFECTS),
    },
    sections: {
      include_stats: coinFlip(0.7),
      include_testimonials: coinFlip(0.85),
      include_faq: coinFlip(0.65),
      include_cta_banner: coinFlip(0.8),
      include_newsletter: coinFlip(0.6),
      include_social_proof: coinFlip(0.75),
      use_counter_animations: coinFlip(0.6),
    },
    content: {
      density: pick(CONTENT_DENSITIES),
      use_icons: coinFlip(0.9),
      use_emojis: coinFlip(0.15),
      writing_style: pick(WRITING_STYLES),
    },
  };
}

/**
 * Pick a random font pairing different from the given current fonts.
 */
export function randomFontPairing(currentHeading?: string): { heading: string; body: string } {
  const candidates = currentHeading
    ? FONT_PAIRINGS.filter(p => p.heading !== currentHeading)
    : FONT_PAIRINGS;
  return pick(candidates.length > 0 ? candidates : FONT_PAIRINGS);
}
