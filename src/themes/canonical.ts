/**
 * Canonical Theme Registry
 *
 * Consolidates design tokens, profiles, animations, and directives.
 * Wizard metadata (label, icon, palette, styleDirective) is sourced from
 * `@/components/onboarding/themePresets.ts` — the main theme reference.
 *
 * Every theme is a complete `CanonicalTheme` that carries:
 *   1. Design tokens (HSL colors, typography, radius, spacing)
 *   2. Design profile (layout, effects, buttons, images, content rules)
 *   3. Animation directives (per-theme motion language)
 *   4. Image treatment rules (aspect, overlay, style)
 *   5. CSS design system (injectable utility classes)
 *   6. Wizard metadata (derived from themePresets.ts)
 *
 * Usage:
 *   import { getCanonicalTheme, CANONICAL_THEMES } from '@/themes/canonical';
 *   const theme = getCanonicalTheme('futuristic');
 */

import { getThemePreset } from '@/components/onboarding/themePresets';

// ============================================================================
// Core Token Interface (HSL-based, Tailwind/shadcn compatible)
// ============================================================================

export interface ThemeTokens {
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    card: string;
    cardForeground: string;
    border: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    headingWeight: string;
    bodyWeight: string;
  };
  radius: string;
  sectionPadding: string;
  containerWidth: string;
}

// ============================================================================
// Design Profile — Layout & Effects
// ============================================================================

export type HeroStyle = 'centered' | 'split' | 'image_left' | 'image_right' | 'fullscreen' | 'minimal';
export type SectionSpacing = 'compact' | 'normal' | 'spacious';
export type MaxWidth = 'narrow' | 'normal' | 'wide' | 'full';
export type NavStyle = 'fixed' | 'sticky' | 'static';
export type ShadowLevel = 'none' | 'subtle' | 'normal' | 'dramatic';
export type ImageStyle = 'rounded' | 'sharp' | 'circular' | 'organic';
export type AspectRatio = 'square' | 'portrait' | 'landscape' | 'auto';
export type OverlayStyle = 'none' | 'gradient' | 'color' | 'blur';
export type ButtonStyle = 'rounded' | 'pill' | 'sharp' | 'outline';
export type ButtonSize = 'small' | 'medium' | 'large';
export type HoverEffect = 'scale' | 'glow' | 'lift' | 'none';
export type ContentDensity = 'minimal' | 'balanced' | 'rich';
export type WritingStyle = 'professional' | 'conversational' | 'bold' | 'minimal';

export interface DesignProfile {
  layout: {
    hero_style: HeroStyle;
    section_spacing: SectionSpacing;
    max_width: MaxWidth;
    navigation_style: NavStyle;
  };
  effects: {
    animations: boolean;
    scroll_animations: boolean;
    hover_effects: boolean;
    gradient_backgrounds: boolean;
    glassmorphism: boolean;
    shadows: ShadowLevel;
  };
  images: {
    style: ImageStyle;
    aspect_ratio: AspectRatio;
    placeholder_service: 'unsplash';
    overlay_style: OverlayStyle;
  };
  buttons: {
    style: ButtonStyle;
    size: ButtonSize;
    hover_effect: HoverEffect;
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
    density: ContentDensity;
    use_icons: boolean;
    use_emojis: boolean;
    writing_style: WritingStyle;
  };
}

// ============================================================================
// Animation Profile — Per-theme motion language
// ============================================================================

export interface AnimationProfile {
  /** Page entrance animation */
  pageEntrance: 'fade-up' | 'fade-in' | 'slide-up' | 'scale-in' | 'none';
  /** Section reveal on scroll */
  scrollReveal: 'fade-up' | 'slide-left' | 'slide-right' | 'scale' | 'blur-in' | 'none';
  /** Default transition duration in ms */
  transitionDuration: number;
  /** Easing function */
  easing: string;
  /** Stagger delay between child elements in ms */
  staggerDelay: number;
  /** Hero-specific animation */
  heroAnimation: 'parallax' | 'float' | 'typewriter' | 'morph' | 'reveal' | 'none';
  /** Card hover micro-interaction */
  cardHover: 'lift' | 'glow' | 'scale' | 'border-shift' | 'tilt' | 'none';
  /** Button interaction feedback */
  buttonFeedback: 'scale-down' | 'ripple' | 'glow-pulse' | 'slide-fill' | 'none';
  /** Image treatment on load */
  imageReveal: 'fade' | 'blur-to-clear' | 'clip-reveal' | 'scale-in' | 'none';
  /** CSS keyframes to inject */
  keyframes: string;
}

// ============================================================================
// Image Treatment — Per-theme visual treatment for imagery
// ============================================================================

export interface ImageTreatment {
  /** Border radius for images */
  borderRadius: string;
  /** CSS filter applied to images */
  filter: string;
  /** Hover filter transition */
  hoverFilter: string;
  /** Overlay gradient on hero/banner images */
  overlayGradient: string;
  /** Object-fit strategy */
  objectFit: 'cover' | 'contain' | 'fill';
  /** Aspect ratio for grid/card images */
  aspectRatio: string;
  /** Shadow on images */
  shadow: string;
  /** Unsplash query keywords to bias relevant imagery */
  unsplashKeywords: string[];
}

// ============================================================================
// Wizard Metadata — UI display properties
// ============================================================================

export interface WizardMeta {
  label: string;
  description: string;
  icon: string;
  /** HEX palette for visual preview in the wizard */
  palette: { bg: string; fg: string; accent: string; accent2?: string };
  /** Visual-only style directive for AI prompt injection */
  styleDirective: string;
}

// ============================================================================
// Canonical Theme — The complete, unified theme object
// ============================================================================

export interface CanonicalTheme {
  id: string;
  tokens: ThemeTokens;
  profile: DesignProfile;
  animations: AnimationProfile;
  imageTreatment: ImageTreatment;
  cssDirective: string;
  /**
   * Detailed, prescriptive generation rules the AI MUST follow.
   * Covers exact CSS patterns, typography scale, spacing, components,
   * effects, and image treatment that define the theme's visual identity.
   */
  generationDirective: string;
  wizard: WizardMeta;
}

// ============================================================================
// Wizard Metadata — derived from themePresets.ts (main theme reference)
// ============================================================================

function getWizardMeta(themeId: string): WizardMeta {
  const preset = getThemePreset(themeId);
  return {
    label: preset.label,
    description: preset.description,
    icon: preset.icon,
    palette: { ...preset.palette },
    styleDirective: preset.styleDirective,
  };
}

// ============================================================================
// Theme Definitions
// ============================================================================

const MODERN: CanonicalTheme = {
  id: 'modern',
  tokens: {
    colors: {
      primary: '217 91% 60%',
      primaryForeground: '210 40% 98%',
      secondary: '258 90% 66%',
      secondaryForeground: '210 40% 98%',
      accent: '217 91% 60%',
      accentForeground: '210 40% 98%',
      background: '222 47% 11%',
      foreground: '210 40% 98%',
      muted: '217 33% 17%',
      mutedForeground: '215 20% 65%',
      card: '222 47% 15%',
      cardForeground: '210 40% 98%',
      border: '217 33% 25%',
    },
    typography: {
      headingFont: "'Inter', sans-serif",
      bodyFont: "'DM Sans', sans-serif",
      headingWeight: '700',
      bodyWeight: '400',
    },
    radius: '0.75rem',
    sectionPadding: '5rem 1.5rem',
    containerWidth: '1200px',
  },
  profile: {
    layout: { hero_style: 'split', section_spacing: 'spacious', max_width: 'wide', navigation_style: 'sticky' },
    effects: { animations: true, scroll_animations: true, hover_effects: true, gradient_backgrounds: true, glassmorphism: false, shadows: 'normal' },
    images: { style: 'rounded', aspect_ratio: 'landscape', placeholder_service: 'unsplash', overlay_style: 'gradient' },
    buttons: { style: 'pill', size: 'large', hover_effect: 'lift' },
    sections: { include_stats: true, include_testimonials: true, include_faq: true, include_cta_banner: true, include_newsletter: true, include_social_proof: true, use_counter_animations: true },
    content: { density: 'balanced', use_icons: true, use_emojis: false, writing_style: 'professional' },
  },
  animations: {
    pageEntrance: 'fade-up',
    scrollReveal: 'fade-up',
    transitionDuration: 600,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    staggerDelay: 100,
    heroAnimation: 'float',
    cardHover: 'lift',
    buttonFeedback: 'scale-down',
    imageReveal: 'fade',
    keyframes: `
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.animate-float { animation: float 6s ease-in-out infinite; }
.animate-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
.animate-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); background-size: 200% 100%; animation: shimmer 2s infinite; }
`,
  },
  imageTreatment: {
    borderRadius: '0.75rem',
    filter: 'none',
    hoverFilter: 'brightness(1.05)',
    overlayGradient: 'linear-gradient(135deg, hsla(217,91%,60%,0.15) 0%, hsla(258,90%,66%,0.1) 100%)',
    objectFit: 'cover',
    aspectRatio: '16/9',
    shadow: '0 4px 16px rgba(0,0,0,0.2)',
    unsplashKeywords: ['modern', 'technology', 'workspace', 'clean'],
  },
  generationDirective: `## MODERN AESTHETIC — MANDATORY DESIGN RULES

TYPOGRAPHY:
- Headings: Inter or DM Sans, weight 700, letter-spacing -0.025em, line-height 1.15
- Body: DM Sans, weight 400, line-height 1.6, max-width 65ch
- Hero H1: clamp(2.5rem, 5vw, 4rem), gradient text effect encouraged

COLORS & BACKGROUNDS:
- Vibrant gradient backgrounds on hero/CTA: linear-gradient(135deg, primary, secondary)
- Cards: dark card bg with subtle 1px border, hover lifts with shadow
- Alternate sections between solid dark bg and subtle gradient bg

LAYOUT:
- Split hero: text left, image/visual right (50/50 grid)
- Section padding: 5rem vertical. Container: 1200px centered
- Card grid: 3-column desktop, gap-6

COMPONENTS:
- Buttons: pill shape (border-radius: 9999px), gradient fill, large (0.875rem 2rem)
- Button hover: translateY(-1px) + shadow. Cards: rounded-xl, hover translateY(-2px)
- Navigation: sticky, glass-like backdrop-blur

EFFECTS:
- Scroll: fade-up with 100ms stagger. Hero: floating decorative elements
- Gradient shimmer on accents. Transitions: 0.3s cubic-bezier(0.16,1,0.3,1)

IMAGES:
- border-radius: 0.75rem, 16/9 hero / 4/3 cards, shadow 0 4px 16px rgba(0,0,0,0.2)`,
  cssDirective: `/* MODERN DESIGN SYSTEM */
:root { --radius: 0.75rem; }
.card { border-radius: var(--radius); box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04); border: 1px solid hsl(var(--border)); transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
.card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); transform: translateY(-2px); }
.btn-gradient { background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary))); border-radius: 9999px; font-weight: 600; transition: all 0.2s; }
.btn-gradient:hover { opacity: 0.9; transform: translateY(-1px); }
.section-alt { background: linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)/0.3) 100%); }
h1, h2, h3 { letter-spacing: -0.025em; line-height: 1.2; }
`,
  wizard: getWizardMeta('modern'),
};

const EDITORIAL: CanonicalTheme = {
  id: 'editorial',
  tokens: {
    colors: {
      primary: '33 30% 44%',
      primaryForeground: '0 0% 100%',
      secondary: '33 30% 64%',
      secondaryForeground: '0 0% 100%',
      accent: '33 30% 44%',
      accentForeground: '0 0% 100%',
      background: '40 33% 98%',
      foreground: '0 0% 10%',
      muted: '40 20% 95%',
      mutedForeground: '0 0% 40%',
      card: '0 0% 100%',
      cardForeground: '0 0% 10%',
      border: '40 15% 88%',
    },
    typography: {
      headingFont: "'Playfair Display', serif",
      bodyFont: "'Source Serif 4', serif",
      headingWeight: '700',
      bodyWeight: '400',
    },
    radius: '0.25rem',
    sectionPadding: '5rem 1.5rem',
    containerWidth: '1100px',
  },
  profile: {
    layout: { hero_style: 'centered', section_spacing: 'spacious', max_width: 'narrow', navigation_style: 'static' },
    effects: { animations: true, scroll_animations: true, hover_effects: true, gradient_backgrounds: false, glassmorphism: false, shadows: 'subtle' },
    images: { style: 'sharp', aspect_ratio: 'portrait', placeholder_service: 'unsplash', overlay_style: 'none' },
    buttons: { style: 'sharp', size: 'medium', hover_effect: 'scale' },
    sections: { include_stats: false, include_testimonials: true, include_faq: true, include_cta_banner: true, include_newsletter: true, include_social_proof: false, use_counter_animations: false },
    content: { density: 'rich', use_icons: false, use_emojis: false, writing_style: 'conversational' },
  },
  animations: {
    pageEntrance: 'fade-in',
    scrollReveal: 'fade-up',
    transitionDuration: 800,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    staggerDelay: 150,
    heroAnimation: 'reveal',
    cardHover: 'border-shift',
    buttonFeedback: 'slide-fill',
    imageReveal: 'clip-reveal',
    keyframes: `
@keyframes clipReveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
@keyframes underline { from { width: 0; } to { width: 100%; } }
.animate-clip-reveal { animation: clipReveal 1.2s cubic-bezier(0.25,0.46,0.45,0.94) both; }
.animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.25,0.46,0.45,0.94) both; }
.hover-underline::after { content: ''; position: absolute; bottom: -2px; left: 0; height: 2px; width: 0; background: hsl(var(--primary)); transition: width 0.4s ease; }
.hover-underline:hover::after { width: 100%; }
`,
  },
  imageTreatment: {
    borderRadius: '0',
    filter: 'grayscale(0.1) contrast(1.05)',
    hoverFilter: 'grayscale(0) contrast(1.1)',
    overlayGradient: 'none',
    objectFit: 'cover',
    aspectRatio: '3/4',
    shadow: 'none',
    unsplashKeywords: ['editorial', 'fashion', 'architecture', 'portrait'],
  },
  generationDirective: `## EDITORIAL AESTHETIC — MANDATORY DESIGN RULES

TYPOGRAPHY:
- Headings: Playfair Display, weight 700, letter-spacing -0.02em, line-height 1.15
- H1: clamp(2.5rem, 5vw, 4.5rem) — typography IS the hero, not graphics
- Body: Source Serif 4, weight 400, line-height 1.8, max-width 42ch (magazine column measure)
- Pull quotes: 1.5rem italic with left border. .lead paragraphs: 1.25rem

COLORS & BACKGROUNDS:
- Light warm bg: creamy off-white (#FDFCFA). NO gradients. NO neon.
- Muted warm accent: gold/bronze (#8B7355, #C4A882). Text: near-black #1A1A1A
- Section dividers: thin 1px lines, max-width 120px, centered

LAYOUT:
- Centered hero with large typographic headline — NO split image layout
- Narrow container: 1100px. Generous 5rem+ vertical spacing
- Asymmetric image+text: image 60%, text 40%. Magazine-style mixed grids

COMPONENTS:
- Buttons: sharp corners (radius: 0), medium, clean borders. Hover: slide-fill
- Cards: border only (no shadows), hover changes border to primary
- Navigation: static, understated text links

EFFECTS:
- Subtle clip-reveal on images. Underline hover (width 0→100%). Slow 0.8s ease
- NO flashy animations, NO scale, NO glow

IMAGES:
- Sharp corners (radius: 0), grayscale(0.1) contrast(1.05), portrait 3:4, no shadows`,
  cssDirective: `/* EDITORIAL DESIGN SYSTEM */
:root { --radius: 0; }
h1, h2, h3 { letter-spacing: -0.02em; line-height: 1.15; }
h1 { font-size: clamp(2.5rem, 5vw, 4.5rem); }
p.lead { font-size: 1.25rem; line-height: 1.8; max-width: 42ch; }
.card { border: 1px solid hsl(var(--border)); transition: border-color 0.4s ease; }
.card:hover { border-color: hsl(var(--primary)); }
.section-divider { border-top: 1px solid hsl(var(--border)); margin: 4rem auto; max-width: 120px; }
.pullquote { font-size: 1.5rem; font-style: italic; border-left: 3px solid hsl(var(--primary)); padding-left: 1.5rem; }
`,
  wizard: getWizardMeta('editorial'),
};

const FUTURISTIC: CanonicalTheme = {
  id: 'futuristic',
  tokens: {
    colors: {
      primary: '183 100% 50%',
      primaryForeground: '240 20% 6%',
      secondary: '300 100% 50%',
      secondaryForeground: '0 0% 100%',
      accent: '183 100% 50%',
      accentForeground: '240 20% 6%',
      background: '240 33% 6%',
      foreground: '240 100% 94%',
      muted: '240 20% 12%',
      mutedForeground: '240 20% 60%',
      card: '240 25% 10%',
      cardForeground: '240 100% 94%',
      border: '240 20% 20%',
    },
    typography: {
      headingFont: "'Space Grotesk', sans-serif",
      bodyFont: "'JetBrains Mono', monospace",
      headingWeight: '700',
      bodyWeight: '400',
    },
    radius: '0.5rem',
    sectionPadding: '5rem 1.5rem',
    containerWidth: '1200px',
  },
  profile: {
    layout: { hero_style: 'fullscreen', section_spacing: 'compact', max_width: 'full', navigation_style: 'fixed' },
    effects: { animations: true, scroll_animations: true, hover_effects: true, gradient_backgrounds: true, glassmorphism: true, shadows: 'dramatic' },
    images: { style: 'sharp', aspect_ratio: 'landscape', placeholder_service: 'unsplash', overlay_style: 'blur' },
    buttons: { style: 'sharp', size: 'large', hover_effect: 'glow' },
    sections: { include_stats: true, include_testimonials: true, include_faq: false, include_cta_banner: true, include_newsletter: true, include_social_proof: true, use_counter_animations: true },
    content: { density: 'minimal', use_icons: true, use_emojis: false, writing_style: 'bold' },
  },
  animations: {
    pageEntrance: 'scale-in',
    scrollReveal: 'blur-in',
    transitionDuration: 500,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    staggerDelay: 80,
    heroAnimation: 'morph',
    cardHover: 'glow',
    buttonFeedback: 'glow-pulse',
    imageReveal: 'blur-to-clear',
    keyframes: `
@keyframes neonPulse { 0%, 100% { box-shadow: 0 0 20px hsl(var(--primary)/0.4), 0 0 60px hsl(var(--primary)/0.15); } 50% { box-shadow: 0 0 30px hsl(var(--primary)/0.6), 0 0 80px hsl(var(--primary)/0.25); } }
@keyframes scanline { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
@keyframes blurIn { from { opacity: 0; filter: blur(12px); } to { opacity: 1; filter: blur(0); } }
@keyframes glitch { 0%, 100% { transform: translate(0); } 20% { transform: translate(-2px, 2px); } 40% { transform: translate(2px, -2px); } 60% { transform: translate(-1px, -1px); } 80% { transform: translate(1px, 1px); } }
.animate-neon-pulse { animation: neonPulse 3s ease-in-out infinite; }
.animate-blur-in { animation: blurIn 0.6s cubic-bezier(0.22,1,0.36,1) both; }
.neon-glow { box-shadow: 0 0 20px hsl(var(--primary)/0.4), 0 0 60px hsl(var(--primary)/0.15); }
.neon-text { text-shadow: 0 0 20px hsl(var(--primary)/0.5), 0 0 40px hsl(var(--primary)/0.2); }
.glass-card { background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.12); border-radius: 1rem; }
.grid-bg { background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 60px 60px; }
`,
  },
  imageTreatment: {
    borderRadius: '0.5rem',
    filter: 'saturate(1.2) contrast(1.1)',
    hoverFilter: 'saturate(1.4) contrast(1.15) brightness(1.1)',
    overlayGradient: 'linear-gradient(135deg, hsla(240,33%,6%,0.7) 0%, hsla(183,100%,50%,0.1) 100%)',
    objectFit: 'cover',
    aspectRatio: '16/9',
    shadow: '0 0 30px rgba(0,240,255,0.15)',
    unsplashKeywords: ['futuristic', 'neon', 'technology', 'cyberpunk', 'abstract'],
  },
  generationDirective: `## FUTURISTIC AESTHETIC — MANDATORY DESIGN RULES

TYPOGRAPHY:
- Headings: Space Grotesk, weight 700. Body: JetBrains Mono (monospace) — terminal feel
- H1: clamp(2.5rem, 6vw, 5rem), neon text-shadow on hero headline
- Labels/small text: uppercase, letter-spacing 0.1em, monospace

COLORS & BACKGROUNDS:
- Deep dark bg: #0A0A14. Neon cyan: #00F0FF for accents/glows/borders
- Neon magenta: #FF00FF sparingly. ALL cards MUST use glassmorphism
- Grid bg on hero: fine 60px grid lines at 3% opacity

LAYOUT:
- Fullscreen hero (100vh), centered. Compact section spacing. Full-width container
- Dark panels with glass-card treatment throughout

COMPONENTS:
- Buttons: sharp corners, large, neon glow on hover. Feedback: glow-pulse
- Cards: glass-card (MANDATORY) — translucent bg, blur(24px), thin white border
- Navigation: fixed, glass backdrop-blur

EFFECTS:
- Neon pulse on featured elements. Blur-in scroll reveal. Grid/scanline hero bg
- Card hover: neon glow border. Fast 0.5s cubic-bezier(0.22,1,0.36,1)

IMAGES:
- saturate(1.2) contrast(1.1), dark overlay gradient, neon shadow, 16/9, sharp corners`,
  cssDirective: `/* FUTURISTIC DESIGN SYSTEM */
:root { --radius: 0.5rem; }
.glass-card { background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.12); border-radius: 1rem; box-shadow: 0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08); }
.neon-glow { box-shadow: 0 0 20px hsl(var(--primary)/0.4), 0 0 60px hsl(var(--primary)/0.15); }
.neon-text { text-shadow: 0 0 20px hsl(var(--primary)/0.5), 0 0 40px hsl(var(--primary)/0.2); }
.grid-bg { background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 60px 60px; }
.nav-glass { background: rgba(10,10,20,0.85); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.08); }
`,
  wizard: getWizardMeta('futuristic'),
};

const MINIMALIST: CanonicalTheme = {
  id: 'minimalist',
  tokens: {
    colors: {
      primary: '0 0% 33%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 60%',
      secondaryForeground: '0 0% 100%',
      accent: '0 0% 33%',
      accentForeground: '0 0% 100%',
      background: '0 0% 100%',
      foreground: '0 0% 7%',
      muted: '0 0% 97%',
      mutedForeground: '0 0% 45%',
      card: '0 0% 100%',
      cardForeground: '0 0% 7%',
      border: '0 0% 90%',
    },
    typography: {
      headingFont: "'Inter', sans-serif",
      bodyFont: "'Inter', sans-serif",
      headingWeight: '400',
      bodyWeight: '300',
    },
    radius: '0rem',
    sectionPadding: '6rem 1.5rem',
    containerWidth: '1000px',
  },
  profile: {
    layout: { hero_style: 'minimal', section_spacing: 'spacious', max_width: 'narrow', navigation_style: 'static' },
    effects: { animations: true, scroll_animations: false, hover_effects: true, gradient_backgrounds: false, glassmorphism: false, shadows: 'none' },
    images: { style: 'sharp', aspect_ratio: 'auto', placeholder_service: 'unsplash', overlay_style: 'none' },
    buttons: { style: 'outline', size: 'medium', hover_effect: 'none' },
    sections: { include_stats: false, include_testimonials: true, include_faq: false, include_cta_banner: false, include_newsletter: false, include_social_proof: false, use_counter_animations: false },
    content: { density: 'minimal', use_icons: false, use_emojis: false, writing_style: 'minimal' },
  },
  animations: {
    pageEntrance: 'fade-in',
    scrollReveal: 'fade-up',
    transitionDuration: 400,
    easing: 'ease',
    staggerDelay: 60,
    heroAnimation: 'none',
    cardHover: 'none',
    buttonFeedback: 'none',
    imageReveal: 'fade',
    keyframes: `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes subtleFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.animate-subtle-fade { animation: subtleFadeUp 0.4s ease both; }
`,
  },
  imageTreatment: {
    borderRadius: '0',
    filter: 'grayscale(0.3)',
    hoverFilter: 'grayscale(0)',
    overlayGradient: 'none',
    objectFit: 'cover',
    aspectRatio: '1/1',
    shadow: 'none',
    unsplashKeywords: ['minimal', 'architecture', 'abstract', 'monochrome'],
  },
  generationDirective: `## MINIMALIST AESTHETIC — MANDATORY DESIGN RULES

TYPOGRAPHY:
- Headings: Inter, weight 400 (LIGHT — NOT bold), letter-spacing -0.04em, line-height 1.05
- H1: clamp(3rem, 6vw, 6rem) — oversized but whisper-light. H2: weight 400
- Body: Inter, weight 300, line-height 1.6. Everything feels weightless

COLORS & BACKGROUNDS:
- Pure white bg (#FFFFFF) — no off-whites. Near-black text (#111111)
- ONLY monochrome accents: grays (#555, #999). NO color. NO gradients anywhere.

LAYOUT:
- Minimal hero: massive headline + one line subtext, nothing else
- Extreme 6rem+ vertical padding. Narrow 1000px container. 2-column max grids

COMPONENTS:
- Buttons: outline only (1.5px solid), NO fill, NO color. Hover: invert colors
- Cards: hairline 1px border, NO shadows, NO fills, NO rounded corners. Hover: border darkens
- Navigation: static, minimal text links

EFFECTS:
- Almost NONE — only subtle opacity fades (0.4s ease). NO scroll animations, NO scale, NO glow
- Single subtle fade on page load. Restraint IS the design language

IMAGES:
- Sharp corners (radius: 0), grayscale(0.3), hover reveals color. Square 1:1. No shadows`,
  cssDirective: `/* MINIMALIST DESIGN SYSTEM */
:root { --radius: 0; }
.card { border: 1px solid hsl(var(--border)); transition: border-color 0.2s; }
.card:hover { border-color: hsl(var(--foreground)); }
h1 { font-size: clamp(3rem, 6vw, 6rem); font-weight: 400; letter-spacing: -0.04em; line-height: 1.05; }
h2 { font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 400; letter-spacing: -0.02em; }
section { padding: 6rem 0; }
.btn-minimal { border: 1.5px solid hsl(var(--foreground)); color: hsl(var(--foreground)); background: transparent; padding: 0.75rem 2rem; transition: all 0.2s; }
.btn-minimal:hover { background: hsl(var(--foreground)); color: hsl(var(--background)); }
`,
  wizard: getWizardMeta('minimalist'),
};

const BOLD: CanonicalTheme = {
  id: 'bold',
  tokens: {
    colors: {
      primary: '0 100% 60%',
      primaryForeground: '0 0% 100%',
      secondary: '16 100% 60%',
      secondaryForeground: '0 0% 100%',
      accent: '0 100% 60%',
      accentForeground: '0 0% 100%',
      background: '0 0% 0%',
      foreground: '0 0% 100%',
      muted: '0 0% 8%',
      mutedForeground: '0 0% 65%',
      card: '0 0% 6%',
      cardForeground: '0 0% 100%',
      border: '0 0% 18%',
    },
    typography: {
      headingFont: "'Space Grotesk', sans-serif",
      bodyFont: "'Inter', sans-serif",
      headingWeight: '900',
      bodyWeight: '400',
    },
    radius: '0rem',
    sectionPadding: '5rem 1.5rem',
    containerWidth: '1200px',
  },
  profile: {
    layout: { hero_style: 'fullscreen', section_spacing: 'compact', max_width: 'full', navigation_style: 'fixed' },
    effects: { animations: true, scroll_animations: true, hover_effects: true, gradient_backgrounds: true, glassmorphism: false, shadows: 'dramatic' },
    images: { style: 'sharp', aspect_ratio: 'landscape', placeholder_service: 'unsplash', overlay_style: 'color' },
    buttons: { style: 'sharp', size: 'large', hover_effect: 'scale' },
    sections: { include_stats: true, include_testimonials: true, include_faq: true, include_cta_banner: true, include_newsletter: false, include_social_proof: true, use_counter_animations: true },
    content: { density: 'balanced', use_icons: true, use_emojis: false, writing_style: 'bold' },
  },
  animations: {
    pageEntrance: 'slide-up',
    scrollReveal: 'scale',
    transitionDuration: 300,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    staggerDelay: 50,
    heroAnimation: 'typewriter',
    cardHover: 'scale',
    buttonFeedback: 'scale-down',
    imageReveal: 'scale-in',
    keyframes: `
@keyframes slamIn { from { opacity: 0; transform: scale(1.2) translateY(-20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
@keyframes countUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-slam { animation: slamIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
.animate-count-up { animation: countUp 0.5s ease both; }
.hover-shake:hover { animation: shake 0.3s ease; }
`,
  },
  imageTreatment: {
    borderRadius: '0',
    filter: 'contrast(1.2) saturate(1.1)',
    hoverFilter: 'contrast(1.3) saturate(1.2)',
    overlayGradient: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)',
    objectFit: 'cover',
    aspectRatio: '16/9',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
    unsplashKeywords: ['bold', 'contrast', 'dramatic', 'dark', 'urban'],
  },
  generationDirective: `## BOLD AESTHETIC — MANDATORY DESIGN RULES

TYPOGRAPHY:
- Headings: Space Grotesk, weight 900 (BLACK — heaviest possible)
- H1: clamp(3.5rem, 8vw, 8rem), UPPERCASE, letter-spacing -0.04em, line-height 0.95
- H2: weight 800, UPPERCASE. ALL headings MUST be uppercase — non-negotiable
- Body: Inter weight 400. Typography IS the visual — massive and commanding

COLORS & BACKGROUNDS:
- Pure black bg (#000000). Pure white text. ONE vivid accent: red (#FF3333)
- High contrast ONLY — no subtle grays, no muted tones
- Alternate: black / near-black with accent gradient

LAYOUT:
- Fullscreen hero: dramatic oversized headline dominates viewport
- Compact spacing, full-bleed sections breaking out of container
- Extreme size contrast for visual hierarchy

COMPONENTS:
- Buttons: sharp (radius: 0), primary fill, weight 800 UPPERCASE, letter-spacing 0.05em
- Hover: scale(1.05) — aggressive. Cards: inverted (white bg, dark text)
- Card hover: scale(1.02), 0.15s. Navigation: fixed, bold, high contrast

EFFECTS:
- Slam-in entrance: scale(1.2)→scale(1) with bounce. Shake on hover
- Fast 0.3s bounce easing. Counter animations on stats. POWERFUL and IMMEDIATE

IMAGES:
- Sharp (no radius), contrast(1.2), dark bottom gradient overlay, heavy shadow`,
  cssDirective: `/* BOLD DESIGN SYSTEM */
:root { --radius: 0; }
h1 { font-size: clamp(3.5rem, 8vw, 8rem); font-weight: 900; text-transform: uppercase; letter-spacing: -0.04em; line-height: 0.95; }
h2 { font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em; }
.card { background: hsl(var(--foreground)); color: hsl(var(--background)); transition: transform 0.15s; }
.card:hover { transform: scale(1.02); }
.btn-bold { background: hsl(var(--primary)); color: white; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 1rem 2.5rem; transition: all 0.15s; }
.btn-bold:hover { transform: scale(1.05); }
.full-bleed { margin-left: calc(-50vw + 50%); margin-right: calc(-50vw + 50%); padding: 6rem 2rem; }
`,
  wizard: getWizardMeta('bold'),
};

const ORGANIC: CanonicalTheme = {
  id: 'organic',
  tokens: {
    colors: {
      primary: '21 56% 51%',
      primaryForeground: '0 0% 100%',
      secondary: '100 24% 49%',
      secondaryForeground: '0 0% 100%',
      accent: '21 56% 51%',
      accentForeground: '0 0% 100%',
      background: '30 38% 95%',
      foreground: '30 25% 13%',
      muted: '30 25% 91%',
      mutedForeground: '30 10% 40%',
      card: '0 0% 100%',
      cardForeground: '30 25% 13%',
      border: '30 15% 85%',
    },
    typography: {
      headingFont: "'Libre Baskerville', serif",
      bodyFont: "'Nunito', sans-serif",
      headingWeight: '700',
      bodyWeight: '400',
    },
    radius: '1rem',
    sectionPadding: '5rem 1.5rem',
    containerWidth: '1100px',
  },
  profile: {
    layout: { hero_style: 'image_right', section_spacing: 'spacious', max_width: 'normal', navigation_style: 'sticky' },
    effects: { animations: true, scroll_animations: true, hover_effects: true, gradient_backgrounds: true, glassmorphism: false, shadows: 'subtle' },
    images: { style: 'organic', aspect_ratio: 'auto', placeholder_service: 'unsplash', overlay_style: 'gradient' },
    buttons: { style: 'rounded', size: 'large', hover_effect: 'lift' },
    sections: { include_stats: true, include_testimonials: true, include_faq: true, include_cta_banner: true, include_newsletter: true, include_social_proof: true, use_counter_animations: true },
    content: { density: 'rich', use_icons: true, use_emojis: false, writing_style: 'conversational' },
  },
  animations: {
    pageEntrance: 'fade-up',
    scrollReveal: 'fade-up',
    transitionDuration: 700,
    easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
    staggerDelay: 120,
    heroAnimation: 'float',
    cardHover: 'lift',
    buttonFeedback: 'scale-down',
    imageReveal: 'fade',
    keyframes: `
@keyframes gentleFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 33% { transform: translateY(-8px) rotate(0.5deg); } 66% { transform: translateY(-4px) rotate(-0.5deg); } }
@keyframes warmFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
.animate-gentle-float { animation: gentleFloat 8s ease-in-out infinite; }
.animate-warm-fade { animation: warmFadeUp 0.7s cubic-bezier(0.37,0,0.63,1) both; }
.animate-breathe { animation: breathe 4s ease-in-out infinite; }
.blob { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
`,
  },
  imageTreatment: {
    borderRadius: '1.5rem',
    filter: 'saturate(0.9) warmth(1.1)',
    hoverFilter: 'saturate(1) brightness(1.05)',
    overlayGradient: 'linear-gradient(135deg, hsla(30,38%,95%,0.3) 0%, hsla(21,56%,51%,0.1) 100%)',
    objectFit: 'cover',
    aspectRatio: '4/3',
    shadow: '0 2px 8px rgba(0,0,0,0.06)',
    unsplashKeywords: ['nature', 'warm', 'organic', 'earth', 'botanical'],
  },
  generationDirective: `## ORGANIC AESTHETIC — MANDATORY DESIGN RULES

TYPOGRAPHY:
- Headings: Libre Baskerville, weight 700, line-height 1.25 — warm and readable
- Body: Nunito, weight 400, line-height 1.75 — friendly and approachable
- No uppercase — everything warm and human. Generous font sizes

COLORS & BACKGROUNDS:
- Warm cream bg (#FAF5F0) — NOT pure white. Terracotta (#C4703F), sage (#7C9A5E)
- Warm dark fg (#2D2418) — NOT pure black. Gentle warm gradients (NEVER neon/cold)
- Section bgs: warm-gradient 135deg cream→muted→accent hint

LAYOUT:
- Image-right hero: text left, warm image right. Spacious 5rem+ padding
- Container 1100px. Rounded, soft layouts — nothing sharp or angular

COMPONENTS:
- Buttons: fully rounded (9999px), terracotta fill. Hover: brightness(1.1) + lift(-2px)
- Cards: 1.5rem radius, warm shadow, thin border. Hover: shadow expand + lift(-4px), 0.4s
- Navigation: sticky, warm tones

EFFECTS:
- Gentle float on hero decorations (8s infinite). Warm fade-up (0.7s — slower)
- Breathing pulse on accents (4s scale 1→1.02→1)
- Blob shapes: organic border-radius 60% 40% 30% 70%. ALIVE but CALM

IMAGES:
- 1.5rem radius, saturate(0.9), soft shadow, 4/3 ratio, nature/botanical imagery`,
  cssDirective: `/* ORGANIC DESIGN SYSTEM */
:root { --radius: 1.25rem; }
.card { border-radius: 1.5rem; background: hsl(var(--card)); box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid hsl(var(--border)/0.5); transition: all 0.4s ease; }
.card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-4px); }
.warm-gradient { background: linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 50%, hsl(var(--accent)/0.1) 100%); }
.btn-warm { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-radius: 9999px; font-weight: 600; padding: 0.875rem 2rem; transition: all 0.3s; }
.btn-warm:hover { filter: brightness(1.1); transform: translateY(-2px); }
h1, h2 { line-height: 1.25; }
p { line-height: 1.75; }
.blob { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
`,
  wizard: getWizardMeta('organic'),
};

// ============================================================================
// Registry
// ============================================================================

export const CANONICAL_THEMES: Record<string, CanonicalTheme> = {
  modern: MODERN,
  editorial: EDITORIAL,
  futuristic: FUTURISTIC,
  minimalist: MINIMALIST,
  bold: BOLD,
  organic: ORGANIC,
};

export const CANONICAL_THEME_LIST: CanonicalTheme[] = Object.values(CANONICAL_THEMES);

/**
 * Resolve a canonical theme by id.
 * Falls back to 'modern' for unknown ids.
 */
export function getCanonicalTheme(id: string): CanonicalTheme {
  return CANONICAL_THEMES[id] || CANONICAL_THEMES.modern;
}

/**
 * Get just the design tokens (for backward compatibility with ThemeTokens consumers).
 */
export function getThemeTokens(id: string): ThemeTokens {
  return getCanonicalTheme(id).tokens;
}

/**
 * Get the full CSS directive including animation keyframes for a theme.
 */
export function getFullCSSDirective(id: string): string {
  const theme = getCanonicalTheme(id);
  return `${theme.cssDirective}\n\n/* THEME ANIMATIONS */\n${theme.animations.keyframes}`;
}

/**
 * Get the generation directive for a theme — detailed, prescriptive AI rules.
 */
export function getGenerationDirective(id: string): string {
  return getCanonicalTheme(id).generationDirective;
}

/**
 * Build Unsplash image URL with theme-appropriate keywords.
 */
export function getThemeImageUrl(id: string, width = 800, height = 600, keyword?: string): string {
  const theme = getCanonicalTheme(id);
  const query = keyword || theme.imageTreatment.unsplashKeywords[0];
  return `https://images.unsplash.com/photo-placeholder?w=${width}&h=${height}&q=80&fit=crop&auto=format&query=${encodeURIComponent(query)}`;
}
