/**
 * Industry → Theme Preset Mapping
 *
 * Deterministic, exhaustive map from SiteBundle industry/template selection
 * (LayoutCategory) to one of the canonical wizard ThemePresets:
 *   bold | modern | organic | futuristic | editorial | minimalist
 *
 * Why this exists:
 *  - SiteBundleSnapshot + composition.theme is the single source of truth for
 *    aesthetics. composition.theme is produced from a ThemePreset via
 *    themePresetToThemeTokens.
 *  - When a user does not explicitly pick a Style card in the wizard, we MUST
 *    still seed composition.theme with a valid preset so the deterministic
 *    pipeline never falls through to ad-hoc CSS strings or "minimal default"
 *    scaffolds. This map guarantees that resolution.
 *
 * VISUAL-ONLY: presets here only influence colors + typography. They never
 * touch industry copy, sections, or business language.
 */
import type { LayoutCategory } from '@/data/templates/types';
import { THEME_PRESETS, type ThemePreset } from './themePresets';

const presetById = (id: string): ThemePreset =>
  THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];

/**
 * Exhaustive industry → preset map. Every LayoutCategory is covered so there
 * is no implicit fallback path through the wizard.
 */
export const INDUSTRY_TO_THEME_PRESET_ID: Record<LayoutCategory, ThemePreset['id']> = {
  salon:       'organic',
  restaurant:  'editorial',
  contractor:  'bold',
  portfolio:   'editorial',
  agency:      'modern',
  store:       'modern',
  saas:        'futuristic',
  content:     'editorial',
  coaching:    'organic',
  realestate:  'editorial',
  nonprofit:   'organic',
  landing:     'modern',
  saved:       'modern',
};

/**
 * Resolve the canonical ThemePreset for a given user selection.
 *
 * Resolution order (deterministic):
 *   1. Explicit user selection from the wizard's Style step.
 *   2. Industry-based mapping (INDUSTRY_TO_THEME_PRESET_ID).
 *   3. Throw. The wizard must provide a supported industry/template context;
 *      silently choosing a default reintroduces the minimal-template path.
 */
export function resolveThemePreset(
  selectedTheme: ThemePreset | null | undefined,
  industryCategory?: LayoutCategory | string | null,
): ThemePreset {
  if (selectedTheme) return selectedTheme;

  if (industryCategory && industryCategory in INDUSTRY_TO_THEME_PRESET_ID) {
    const id = INDUSTRY_TO_THEME_PRESET_ID[industryCategory as LayoutCategory];
    return presetById(id);
  }

  // themePresetId is no longer required. Wizard runtime (AI + siteBundle
  // Lane B / Stage 4b merge) authors the final theme. Return the first
  // registered preset as a neutral seed instead of throwing.
  return THEME_PRESETS[0];
}
