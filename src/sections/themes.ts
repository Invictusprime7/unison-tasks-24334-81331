/**
 * Theme Presets — Minimal-first design tokens
 */

import type { ThemeTokens } from './types';

// ============================================================================
// Default Minimal Theme (Light)
// ============================================================================

export const THEME_MINIMAL_LIGHT: ThemeTokens = {
  colors: {
    primary: '220 14% 20%',         // Near-black charcoal
    primaryForeground: '0 0% 100%',
    secondary: '220 10% 40%',       // Medium gray
    secondaryForeground: '0 0% 100%',
    accent: '220 14% 20%',          // Same as primary for minimal look
    accentForeground: '0 0% 100%',
    background: '0 0% 99%',         // Off-white
    foreground: '220 14% 10%',      // Dark
    muted: '220 5% 96%',            // Very light gray
    mutedForeground: '220 5% 46%',  // Medium gray
    card: '0 0% 100%',              // White
    cardForeground: '220 14% 10%',
    border: '220 5% 90%',           // Light border
  },
  typography: {
    headingFont: "'Inter', sans-serif",
    bodyFont: "'Inter', sans-serif",
    headingWeight: '600',
    bodyWeight: '400',
  },
  radius: '0.5rem',
  sectionPadding: '5rem 1.5rem',
  containerWidth: '1100px',
};

// ============================================================================
// Theme Registry (will expand as users customize)
// ============================================================================

export const THEME_REGISTRY: Record<string, ThemeTokens> = {
  'minimal-light': THEME_MINIMAL_LIGHT,
};

export const getTheme = (id: string): ThemeTokens => {
  return THEME_REGISTRY[id] || THEME_MINIMAL_LIGHT;
};
