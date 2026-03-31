/**
 * Theme Presets
 * 
 * No default/minimal theme is provided. All themes MUST come from 
 * the Launcher industry pipeline via aesthetic selection.
 */

import type { ThemeTokens } from './types';

// ============================================================================
// Theme Registry — populated by Launcher aesthetic pipeline
// ============================================================================

export const THEME_REGISTRY: Record<string, ThemeTokens> = {};

export const getTheme = (id: string): ThemeTokens | null => {
  return THEME_REGISTRY[id] || null;
};
