/**
 * Build a themed /src/index.css from a wizard ThemePreset.
 *
 * This makes the wizard's "Bold / Modern / Organic / Futuristic / Editorial /
 * Minimal" card the SINGLE source of truth for colors and typography across
 * EVERY scaffolded page (home + multi-page placeholders + router header) in
 * the preview VFS — without invoking the AI assistant.
 *
 * The CSS variables exposed here mirror the names used by the launcher
 * placeholder pages (bg-background, text-foreground, border-border/40, etc.)
 * and Tailwind's shadcn token convention.
 */
import { THEME_PRESETS, type ThemePreset } from './themePresets';
import { themePresetToThemeTokens } from './themePresetToTokens';

/**
 * Default ThemePreset used whenever a caller has not selected one in the
 * wizard. We pick "modern" so that EVERY scaffold path (multi-page, sandpack
 * fallback, template VFS, preview session defaults) shares the SAME token
 * injection system instead of hand-rolled hex/HSL strings.
 */
export const DEFAULT_PREVIEW_THEME_PRESET: ThemePreset =
  THEME_PRESETS.find((p) => p.id === 'modern') ?? THEME_PRESETS[0];

/** Themed index.css using the default preset — single source of truth for fallbacks. */
export function buildDefaultThemedIndexCss(): string {
  return buildThemedIndexCss(DEFAULT_PREVIEW_THEME_PRESET);
}

export function buildThemedIndexCss(preset: ThemePreset): string {
  const tokens = themePresetToThemeTokens(preset);
  const c = tokens.colors;

  // Web-font import (Google Fonts) for the preset typography
  const fontFamilies = Array.from(
    new Set([preset.typography.headingFont, preset.typography.bodyFont]),
  )
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700;800`)
    .join('&');
  const fontsImport = `@import url('https://fonts.googleapis.com/css2?${fontFamilies}&display=swap');`;

  return `${fontsImport}
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: ${c.background};
  --foreground: ${c.foreground};
  --card: ${c.card};
  --card-foreground: ${c.cardForeground};
  --popover: ${c.card};
  --popover-foreground: ${c.cardForeground};
  --primary: ${c.primary};
  --primary-foreground: ${c.primaryForeground};
  --secondary: ${c.secondary};
  --secondary-foreground: ${c.secondaryForeground};
  --muted: ${c.muted};
  --muted-foreground: ${c.mutedForeground};
  --accent: ${c.accent};
  --accent-foreground: ${c.accentForeground};
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: ${c.border};
  --input: ${c.border};
  --ring: ${c.primary};
  --radius: ${tokens.radius};
}

* { border-color: hsl(var(--border)); }

html, body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: ${tokens.typography.bodyFont};
  font-weight: ${tokens.typography.bodyWeight};
  margin: 0;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${tokens.typography.headingFont};
  font-weight: ${tokens.typography.headingWeight};
  color: hsl(var(--foreground));
}
`;
}
