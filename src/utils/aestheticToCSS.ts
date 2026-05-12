/**
 * Aesthetic-to-CSS Converter — DEPRECATED
 *
 * @deprecated Use `buildThemedIndexCss(preset)` from
 * `@/components/onboarding/themePresetToIndexCss` instead. That builder is the
 * single source of truth for `/src/index.css` across the wizard, launcher VFS,
 * preview session, and Sandpack overlay.
 *
 * Only `isValidAesthetic` remains in active use (id validation alias). The
 * `aestheticToCSSVariables` / `completeAestheticCSS` exports are kept solely
 * for backward compatibility with callers that have not yet migrated.
 */

import type { ThemePreset } from '@/components/onboarding/themePresets';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';

/**
 * Convert aesthetic palette colors to CSS custom properties.
 * Handles color transformation from hex/rgb to HSL format for Tailwind CDN integration.
 */
function hexToHSL(hex: string): string {
  // Parse hex color (e.g., "#0F172A" → [15, 23, 42])
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Return as "h s% l%" format for CSS custom properties
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Get a ThemePreset by ID.
 */
function getPresetById(id: string): ThemePreset | null {
  return THEME_PRESETS.find(p => p.id === id) || null;
}

/**
 * Generate CSS custom properties from aesthetic palette colors.
 * Maps ThemePreset colors to the semantic CSS variables Tailwind expects.
 *
 * @param aestheticId - ID from THEME_PRESETS, e.g., "modern", "futuristic"
 * @returns CSS string with :root { --primary: ... --accent: ... }
 */
export function aestheticToCSSVariables(aestheticId: string): string {
  const preset = getPresetById(aestheticId);
  if (!preset) {
    console.warn(`[aestheticToCSS] Unknown aesthetic ID: ${aestheticId}, using defaults`);
    return ''; // Return empty — fallback CSS will provide defaults
  }

  const palette = preset.palette;

  // Convert hex palette colors to HSL for CSS custom properties
  const bgHSL = hexToHSL(palette.bg);
  const fgHSL = hexToHSL(palette.fg);
  const accentHSL = hexToHSL(palette.accent);
  const accent2HSL = palette.accent2 ? hexToHSL(palette.accent2) : accentHSL;

  // Map palette to semantic variables
  const cssVars = `
:root {
  /* AESTHETIC: ${preset.label} */
  --background: ${bgHSL};
  --foreground: ${fgHSL};
  --card: ${bgHSL};
  --card-foreground: ${fgHSL};
  --popover: ${bgHSL};
  --popover-foreground: ${fgHSL};
  --primary: ${accentHSL};
  --primary-foreground: ${palette.fg === '#000000' || parseFloat(bgHSL.split(' ')[2]) < 50 ? '210 40% 98%' : '222.2 47.4% 11.2%'};
  --secondary: ${accent2HSL};
  --secondary-foreground: ${fgHSL};
  --muted: ${hexToHSL(palette.bg === '#000000' ? '#1a1a1a' : '#f0f0f0')};
  --muted-foreground: ${hexToHSL(palette.fg === '#000000' ? '#888888' : '#666666')};
  --accent: ${accentHSL};
  --accent-foreground: ${palette.bg === '#000000' || parseFloat(bgHSL.split(' ')[2]) < 50 ? '210 40% 98%' : '222.2 47.4% 11.2%'};
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: ${hexToHSL(palette.bg === '#000000' ? '#333333' : '#e5e5e5')};
  --input: var(--border);
  --ring: ${accentHSL};
  --radius: 0.75rem;

  /* TYPOGRAPHY from aesthetic */
  --font-heading: "${preset.typography.headingFont}", ui-sans-serif, system-ui;
  --font-body: "${preset.typography.bodyFont}", ui-sans-serif, system-ui;
}
`;

  return cssVars;
}

/**
 * Generate @font-face declarations for aesthetic typography fonts.
 * Uses Google Fonts CDN as fallback (browser will request if not cached).
 */
export function aestheticToFontFaces(aestheticId: string): string {
  const preset = getPresetById(aestheticId);
  if (!preset) return '';

  const headingFont = preset.typography.headingFont;
  const bodyFont = preset.typography.bodyFont;

  // Map font names to Google Fonts URLs
  // (In production, would use a font registry or API)
  const fontWeights = preset.typography.headingWeight ? `wght@400;700;${preset.typography.headingWeight}` : 'wght@400;700';

  const fonts = new Set([headingFont, bodyFont]);
  const fontFaces = Array.from(fonts)
    .map(fontName => {
      const sanitized = fontName.replace(/\s+/g, '+');
      return `@import url('https://fonts.googleapis.com/css2?family=${sanitized}:${fontWeights}&display=swap');`;
    })
    .join('\n');

  return fontFaces;
}

/**
 * Complete aesthetic CSS bundle: variables + @font-face imports.
 * This is the canonical format for prepending to any CSS file.
 */
export function completeAestheticCSS(aestheticId: string): string {
  const vars = aestheticToCSSVariables(aestheticId);
  const fonts = aestheticToFontFaces(aestheticId);
  return [fonts, vars].filter(Boolean).join('\n\n');
}

/**
 * Get all aesthetic IDs for validation/iteration.
 */
export function getAllAestheticIds(): string[] {
  return THEME_PRESETS.map(p => p.id);
}

/**
 * Check if an aesthetic ID is valid.
 */
export function isValidAesthetic(id: string): boolean {
  return THEME_PRESETS.some(p => p.id === id);
}
