/**
 * Design Variation Generator — Launcher-Driven
 *
 * Themes only provide color tokens + typography.
 * Layout/structural decisions come from the industry matrix, NOT from themes.
 */

/**
 * @deprecated — Layout decisions are now industry-driven via systems-build.
 * This module is kept as a no-op stub for backward compatibility.
 */
export type DesignVariation = Record<string, unknown>;

export function generateDesignVariation(_themeId: string): DesignVariation {
  return {};
}
