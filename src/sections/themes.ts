/**
 * Theme Tokens & Registry — Passthrough
 * Re-exports from the canonical theme system.
 * Themes are resolved dynamically via the launcher generation path.
 * New code should import from '@/themes' or '@/themes/canonical'.
 */

export type { ThemeTokens } from '@/themes/canonical';
import { getCanonicalTheme } from '@/themes/canonical';
import type { ThemeTokens } from '@/themes/canonical';

/**
 * Resolve a ThemeTokens by preset id.
 * Theme id is always supplied by the launcher generation path.
 */
export const getTheme = (id: string): ThemeTokens => {
  return getCanonicalTheme(id).tokens;
};
