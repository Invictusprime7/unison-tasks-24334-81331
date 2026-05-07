/**
 * Build a themed /src/index.css from a wizard ThemePreset.
 *
 * Single source of truth for the visual layer of every wizard-scaffolded page.
 *
 * Beyond raw shadcn tokens, this injects an "Aesthetic Polish Layer":
 *   - Premium per-preset font pairings (display + body) via Google Fonts
 *   - Gradient / elevation / glow / noise tokens
 *   - Editorial typography scale (clamp-based fluid sizes)
 *   - Motion utility classes (fade-up, stagger, blur-in)
 *   - Image grading utilities (duotone, soft-light overlay)
 *   - Subtle radial background atmosphere
 *
 * Result: scaffolded sites stop looking like flat shadcn defaults and start
 * looking like intentionally designed editorial / luxury / agency pages.
 */
import { THEME_PRESETS, type ThemePreset } from './themePresets';
import { themePresetToThemeTokens } from './themePresetToTokens';

export const DEFAULT_PREVIEW_THEME_PRESET: ThemePreset =
  THEME_PRESETS.find((p) => p.id === 'modern') ?? THEME_PRESETS[0];

export function buildDefaultThemedIndexCss(): string {
  return buildThemedIndexCss(DEFAULT_PREVIEW_THEME_PRESET);
}

/**
 * Premium font pairings per preset.
 * These OVERRIDE the preset's declared headingFont/bodyFont where appropriate
 * to lift visual quality (e.g. editorial → Fraunces + Inter Tight).
 */
type FontPair = { display: string; body: string; displayWeights?: string; bodyWeights?: string };
const PREMIUM_FONT_PAIRS: Record<string, FontPair> = {
  editorial:   { display: 'Fraunces',         body: 'Inter Tight',     displayWeights: '300;400;500;600;700;800;900', bodyWeights: '300;400;500;600;700' },
  modern:      { display: 'Geist',            body: 'Geist',           displayWeights: '400;500;600;700;800;900',     bodyWeights: '300;400;500;600' },
  bold:        { display: 'Space Grotesk',    body: 'Inter',           displayWeights: '500;600;700',                 bodyWeights: '400;500;600;700' },
  futuristic:  { display: 'Space Grotesk',    body: 'JetBrains Mono',  displayWeights: '500;600;700',                 bodyWeights: '400;500;700' },
  minimalist:  { display: 'Instrument Serif', body: 'Inter Tight',     displayWeights: '400',                          bodyWeights: '300;400;500;600' },
  organic:     { display: 'Cormorant Garamond', body: 'Nunito',        displayWeights: '400;500;600;700',             bodyWeights: '300;400;600;700' },
};

function googleFontsLink(pair: FontPair): string {
  const families = [
    `family=${encodeURIComponent(pair.display).replace(/%20/g, '+')}:wght@${pair.displayWeights ?? '400;600;700'}`,
    `family=${encodeURIComponent(pair.body).replace(/%20/g, '+')}:wght@${pair.bodyWeights ?? '400;500;600'}`,
  ];
  return `@import url('https://fonts.googleapis.com/css2?${families.join('&')}&display=swap');`;
}

/**
 * Inline SVG fractal noise as a data-URI background — adds tactile grain
 * without a network request. Tuned subtle (opacity 0.02–0.05 in usage).
 */
const NOISE_SVG_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function buildThemedIndexCss(preset: ThemePreset): string {
  const tokens = themePresetToThemeTokens(preset);
  const c = tokens.colors;

  const pair: FontPair = PREMIUM_FONT_PAIRS[preset.id] ?? {
    display: preset.typography.headingFont,
    body: preset.typography.bodyFont,
  };
  const fontsImport = googleFontsLink(pair);

  // Editorial preset gets a slightly heavier display weight by default
  const displayWeight = preset.id === 'minimalist' ? '400' : preset.typography.headingWeight || '700';

  return `${fontsImport}
/* AESTHETIC: ${preset.label} — wizard token injection (single source of truth) */
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

  /* Aesthetic polish tokens */
  --font-display: '${pair.display}', ${preset.id === 'editorial' || preset.id === 'minimalist' || preset.id === 'organic' ? 'serif' : 'sans-serif'};
  --font-body: '${pair.body}', ${preset.id === 'futuristic' ? 'monospace' : 'sans-serif'};

  --gradient-hero: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
  --gradient-subtle: linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%);
  --gradient-radial: radial-gradient(ellipse at top, hsl(var(--primary) / 0.18), transparent 60%);
  --gradient-mesh: radial-gradient(at 20% 20%, hsl(var(--primary) / 0.25) 0px, transparent 50%),
                   radial-gradient(at 80% 0%,  hsl(var(--accent) / 0.20) 0px, transparent 50%),
                   radial-gradient(at 0% 80%,  hsl(var(--secondary) / 0.18) 0px, transparent 50%);

  --shadow-elegant: 0 30px 80px -20px hsl(var(--primary) / 0.25);
  --shadow-soft:    0 10px 30px -10px hsl(var(--foreground) / 0.10);
  --shadow-glow:    0 0 60px hsl(var(--accent) / 0.40);
  --shadow-card:    0 1px 2px hsl(var(--foreground) / 0.04), 0 8px 24px -8px hsl(var(--foreground) / 0.10);

  --noise-bg: ${NOISE_SVG_DATA_URI};

  --transition-smooth: cubic-bezier(0.22, 1, 0.36, 1);
  --transition-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
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
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Subtle atmospheric background — adds depth without heavy assets */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background: var(--gradient-radial);
  pointer-events: none;
  z-index: 0;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: ${displayWeight};
  color: hsl(var(--foreground));
  letter-spacing: -0.02em;
  line-height: 1.05;
}

/* Editorial fluid type scale — overrides flat Tailwind sizes for hero/headings */
h1 { font-size: clamp(2.5rem, 5vw + 1rem, 5.5rem); }
h2 { font-size: clamp(2rem, 3vw + 1rem, 3.75rem); }
h3 { font-size: clamp(1.5rem, 1.5vw + 1rem, 2.25rem); }

p, li { line-height: 1.65; }

/* === Aesthetic utility classes (consumable from generated TSX) === */

.bg-gradient-hero    { background: var(--gradient-hero); }
.bg-gradient-subtle  { background: var(--gradient-subtle); }
.bg-gradient-mesh    { background-color: hsl(var(--background)); background-image: var(--gradient-mesh); }

.shadow-elegant { box-shadow: var(--shadow-elegant); }
.shadow-soft    { box-shadow: var(--shadow-soft); }
.shadow-glow    { box-shadow: var(--shadow-glow); }
.shadow-card    { box-shadow: var(--shadow-card); }

.text-gradient {
  background: var(--gradient-hero);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.noise-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: var(--noise-bg);
  background-size: 160px 160px;
  opacity: 0.04;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.glass {
  background: hsl(var(--card) / 0.6);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid hsl(var(--border) / 0.6);
}

.duotone {
  filter: grayscale(100%) contrast(1.05);
  mix-blend-mode: luminosity;
}

/* Motion primitives — generated TSX can apply these for polish without framer */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes blur-in {
  from { opacity: 0; filter: blur(12px); transform: scale(0.98); }
  to   { opacity: 1; filter: blur(0); transform: scale(1); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}

.animate-fade-up { animation: fade-up 0.8s var(--transition-smooth) both; }
.animate-fade-in { animation: fade-in 0.6s var(--transition-smooth) both; }
.animate-blur-in { animation: blur-in 1s var(--transition-smooth) both; }
.animate-float   { animation: float 6s ease-in-out infinite; }

.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-500 { animation-delay: 0.5s; }
.delay-700 { animation-delay: 0.7s; }

/* Hover affordances generated CTAs can opt into */
.hover-lift {
  transition: transform 0.3s var(--transition-smooth), box-shadow 0.3s var(--transition-smooth);
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-elegant);
}

/* Layered hero orb (decorative blurred accent — no DOM cost beyond one div) */
.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  opacity: 0.55;
  pointer-events: none;
}
.orb-primary   { background: hsl(var(--primary)); }
.orb-accent    { background: hsl(var(--accent)); }
.orb-secondary { background: hsl(var(--secondary)); }

/* Ensure foreground content sits above ::before atmosphere */
#root, main, header, footer, section { position: relative; z-index: 1; }
`;
}
