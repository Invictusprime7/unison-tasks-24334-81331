/**
 * Theme Presets
 *
 * Minimal defaults are removed.
 * If a template omits local theme tokens, it inherits the Launcher base theme.
 */

import type { ThemeTokens } from './types';

export const LAUNCHER_BASE_THEME: ThemeTokens = {
  colors: {
    primary: '221 83% 53%',
    primaryForeground: '210 40% 98%',
    secondary: '262 83% 58%',
    secondaryForeground: '210 40% 98%',
    accent: '190 95% 45%',
    accentForeground: '222 47% 11%',
    background: '222 47% 11%',
    foreground: '210 40% 98%',
    muted: '222 26% 18%',
    mutedForeground: '215 20% 72%',
    card: '224 39% 14%',
    cardForeground: '210 40% 98%',
    border: '217 19% 27%',
  },
  typography: {
    headingFont: "'Space Grotesk', sans-serif",
    bodyFont: "'DM Sans', sans-serif",
    headingWeight: '700',
    bodyWeight: '400',
  },
  radius: '1rem',
  sectionPadding: '6rem 1.5rem',
  containerWidth: '1200px',
};

export const THEME_REGISTRY: Record<string, ThemeTokens> = {
  modern: LAUNCHER_BASE_THEME,
  'launcher-base': LAUNCHER_BASE_THEME,
};

export const resolveThemeTokens = (theme?: Partial<ThemeTokens> | null): ThemeTokens => ({
  colors: {
    ...LAUNCHER_BASE_THEME.colors,
    ...(theme?.colors ?? {}),
  },
  typography: {
    ...LAUNCHER_BASE_THEME.typography,
    ...(theme?.typography ?? {}),
  },
  radius: theme?.radius || LAUNCHER_BASE_THEME.radius,
  sectionPadding: theme?.sectionPadding || LAUNCHER_BASE_THEME.sectionPadding,
  containerWidth: theme?.containerWidth || LAUNCHER_BASE_THEME.containerWidth,
});

export const getTheme = (id?: string | null): ThemeTokens => {
  if (!id) return LAUNCHER_BASE_THEME;
  return resolveThemeTokens(THEME_REGISTRY[id] || LAUNCHER_BASE_THEME);
};
