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
/* AESTHETIC: ${preset.label} (wizard token injection — single source of truth) */
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
  /* Tailwind CDN reads these via theme.fontFamily.heading / body */
  --font-heading: ${tokens.typography.headingFont}, ui-sans-serif, system-ui, sans-serif;
  --font-body: ${tokens.typography.bodyFont}, ui-sans-serif, system-ui, sans-serif;
}

* { border-color: hsl(var(--border)); }

html, body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--font-body);
  font-weight: ${tokens.typography.bodyWeight};
  margin: 0;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: ${tokens.typography.headingWeight};
  color: hsl(var(--foreground));
  letter-spacing: -0.02em;
  line-height: 1.15;
}

/* Tailwind utility shortcuts that often appear in AI output */
.font-heading { font-family: var(--font-heading); }
.font-body    { font-family: var(--font-body); }

/* ============================================================
   PREMIUM UTILITY LAYER (contract with templatePrompts.ts)
   AI output relies on these classes — they MUST exist or the
   rendered site collapses (no padding, overlapping typography).
   Themed via preset tokens — never hardcode white-on-dark.
   ============================================================ */

/* Layout */
.container-wide { max-width: 1200px; margin-left: auto; margin-right: auto; padding-left: 1rem; padding-right: 1rem; }
.section-spacing { padding: 5rem 1rem; }
@media (min-width: 768px) { .section-spacing { padding: 7rem 2rem; } }

/* Typography scale */
.headline-xl { font-family: var(--font-heading); font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 1rem; }
.headline-lg { font-family: var(--font-heading); font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 1rem; }
.headline-md { font-family: var(--font-heading); font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 700; line-height: 1.25; margin: 0 0 0.75rem; }
.body-lg     { font-family: var(--font-body); font-size: 1.125rem; line-height: 1.7; color: hsl(var(--foreground) / 0.78); }
.body-md     { font-family: var(--font-body); font-size: 1rem; line-height: 1.6; color: hsl(var(--foreground) / 0.7); }
.caption     { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(var(--primary)); }

/* Buttons */
.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%);
  color: hsl(var(--primary-foreground));
  font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 9999px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  box-shadow: 0 4px 14px hsl(var(--primary) / 0.25);
  border: none; cursor: pointer;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 22px hsl(var(--primary) / 0.35); }
.btn-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  background: transparent; border: 1.5px solid hsl(var(--border));
  color: hsl(var(--foreground));
  font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 9999px;
  transition: all 0.25s ease; cursor: pointer;
}
.btn-secondary:hover { background: hsl(var(--accent) / 0.1); border-color: hsl(var(--primary) / 0.5); }

/* Cards */
.card {
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
  border-radius: 1.25rem;
  padding: 2rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
.card:hover { transform: translateY(-4px); border-color: hsl(var(--primary) / 0.4); box-shadow: 0 12px 32px hsl(var(--foreground) / 0.08); }

/* Glass */
.glass {
  background: hsl(var(--card) / 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid hsl(var(--border) / 0.5);
}
.glass-card {
  background: hsl(var(--card) / 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid hsl(var(--border) / 0.6);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px hsl(var(--foreground) / 0.06);
}
.nav-blur {
  background: hsl(var(--background) / 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid hsl(var(--border) / 0.6);
}

/* Badges */
.badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.9rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; border-radius: 9999px; }
.badge-primary { background: hsl(var(--primary) / 0.12); color: hsl(var(--primary)); border: 1px solid hsl(var(--primary) / 0.25); }

/* Gradient text */
.gradient-text {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}

/* Micro-interactions */
.hover-lift { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
.hover-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 40px hsl(var(--foreground) / 0.12); }
.button-press { transition: transform 0.1s ease; }
.button-press:active { transform: scale(0.97); }

/* Animations */
@keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { opacity: 0; animation: fade-in-up 0.6s ease forwards; }
.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }

/* Shadows */
.shadow-elevation-3 { box-shadow: 0 10px 20px hsl(var(--foreground) / 0.12), 0 3px 6px hsl(var(--foreground) / 0.08); }
.shadow-glow { box-shadow: 0 0 20px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.1); }

/* Sensible vertical rhythm defaults — prevents hero/nav overlap when the
   AI forgets to add a wrapper section padding. */
section { position: relative; }
main > section + section { margin-top: 0; }
p { margin: 0 0 1rem; line-height: 1.65; }
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; text-decoration: none; }
ul, ol { padding-left: 1.25rem; }
`;
}
