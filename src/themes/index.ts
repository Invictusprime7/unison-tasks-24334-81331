/**
 * Theme System — Public API
 *
 * Single import point for all theme-related functionality.
 * Themes are strictly colors + typography. Layout/structure comes from industry matrix.
 */

export {
  // Core types
  type CanonicalTheme,
  type ThemeTokens,
  type WizardMeta,
  // Registry & resolvers
  CANONICAL_THEMES,
  CANONICAL_THEME_LIST,
  getCanonicalTheme,
  getThemeTokens,
} from './canonical';

export { themeToCSS, hsl, hsla, containerStyle, sectionStyle, headingStyle, bodyStyle, primaryButtonStyle, outlineButtonStyle, cardStyle, themeTokensToCSSRoot, themeTokensToTemplateCSS } from './utils';
