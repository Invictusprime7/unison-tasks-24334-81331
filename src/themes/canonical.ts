/**
 * Canonical Theme Registry
 *
 * SINGLE RESPONSIBILITY: Color tokens + typography per aesthetic.
 * Themes NEVER influence layout, section structure, animations, or CSS directives.
 * Those are driven by the Industry Matrix in the systems-build edge function.
 *
 * Wizard metadata (label, icon, palette, styleDirective) is sourced from
 * `@/components/onboarding/themePresets.ts` — the canonical reference.
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
// Canonical Theme — Colors + Typography + Wizard only
// ============================================================================

export interface CanonicalTheme {
  id: string;
  tokens: ThemeTokens;
  wizard: WizardMeta;
}

// ============================================================================
// Wizard Metadata — derived from themePresets.ts (single source of truth)
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
// Theme Token Definitions — HSL color palettes + typography ONLY
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
