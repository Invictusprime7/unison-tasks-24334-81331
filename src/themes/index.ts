/**
 * Theme System — Public API
 *
 * Single import point for all theme-related functionality.
 * Replaces fragmented imports from sections/themes, sections/themeUtils,
 * onboarding/themePresets, and utils/designVariation.
 */

export {
  // Core types
  type CanonicalTheme,
  type ThemeTokens,
  type DesignProfile,
  type AnimationProfile,
  type ImageTreatment,
  type WizardMeta,
  // Type aliases for design profile fields
  type HeroStyle,
  type SectionSpacing,
  type MaxWidth,
  type NavStyle,
  type ShadowLevel,
  type ImageStyle,
  type AspectRatio,
  type OverlayStyle,
  type ButtonStyle,
  type ButtonSize,
  type HoverEffect,
  type ContentDensity,
  type WritingStyle,
  // Registry & resolvers
  CANONICAL_THEMES,
  CANONICAL_THEME_LIST,
  getCanonicalTheme,
  getThemeTokens,
  getFullCSSDirective,
  getGenerationDirective,
  getThemeImageUrl,
} from './canonical';

export { themeToCSS, hsl, hsla, containerStyle, sectionStyle, headingStyle, bodyStyle, primaryButtonStyle, outlineButtonStyle, cardStyle, themeTokensToCSSRoot } from './utils';

export { generateThemeVariation, type VariationResult } from './variationEngine';
