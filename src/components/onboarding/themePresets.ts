/**
 * Theme Presets for UnifiedLauncher — Derived from Canonical Themes
 *
 * VISUAL-ONLY: These presets control colors, typography, and layout formatting.
 * They must NEVER influence industry content, text copy, or business language.
 */

import { CANONICAL_THEME_LIST, type CanonicalTheme } from '@/themes/canonical';

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Visual-only styling directive — no industry or content language */
  styleDirective: string;
  palette: { bg: string; fg: string; accent: string; accent2?: string };
  typography: { headingFont: string; bodyFont: string; headingWeight: string };
}

/** Convert canonical theme to wizard ThemePreset */
function toPreset(t: CanonicalTheme): ThemePreset {
  return {
    id: t.id,
    label: t.wizard.label,
    description: t.wizard.description,
    icon: t.wizard.icon,
    styleDirective: t.wizard.styleDirective,
    palette: t.wizard.palette,
    typography: {
      headingFont: t.tokens.typography.headingFont.replace(/'/g, ''),
      bodyFont: t.tokens.typography.bodyFont.replace(/'/g, ''),
      headingWeight: t.tokens.typography.headingWeight,
    },
  };
}

export const THEME_PRESETS: ThemePreset[] = CANONICAL_THEME_LIST.map(toPreset);
