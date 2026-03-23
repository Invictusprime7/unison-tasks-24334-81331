/**
 * Design Variation Generator — Launcher-Driven
 *
 * All design variations are resolved by the system/business launcher.
 * This module provides typed accessors but requires a themeId from the launcher path.
 */

import { getCanonicalTheme, type DesignProfile } from '@/themes/canonical';

// Re-export the DesignProfile as DesignVariation for backward compat
export type DesignVariation = DesignProfile;

/**
 * Generate a design variation for a given themeId.
 * The themeId MUST be provided by the launcher generation path.
 */
export function generateDesignVariation(themeId: string): DesignVariation {
  return getCanonicalTheme(themeId).profile;
}

/**
 * Get CSS design system directive for a theme.
 */
export function getThemeCSSDirective(themeId: string): string {
  const theme = getCanonicalTheme(themeId);
  return `${theme.cssDirective}\n\n/* THEME ANIMATIONS */\n${theme.animations.keyframes}`;
}

/**
 * Get the detailed generation directive for a theme.
 */
export function getThemeGenerationDirective(themeId: string): string {
  return getCanonicalTheme(themeId).generationDirective;
}
