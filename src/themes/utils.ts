/**
 * Theme utilities — helpers for applying ThemeTokens to components
 * Migrated from src/sections/themeUtils.ts to canonical location.
 */

import type { ThemeTokens } from './canonical';

/** Generate CSS custom properties from theme tokens */
export const themeToCSS = (theme: ThemeTokens): React.CSSProperties => ({
  '--color-primary': theme.colors.primary,
  '--color-primary-fg': theme.colors.primaryForeground,
  '--color-secondary': theme.colors.secondary,
  '--color-secondary-fg': theme.colors.secondaryForeground,
  '--color-accent': theme.colors.accent,
  '--color-accent-fg': theme.colors.accentForeground,
  '--color-bg': theme.colors.background,
  '--color-fg': theme.colors.foreground,
  '--color-muted': theme.colors.muted,
  '--color-muted-fg': theme.colors.mutedForeground,
  '--color-card': theme.colors.card,
  '--color-card-fg': theme.colors.cardForeground,
  '--color-border': theme.colors.border,
  '--font-heading': theme.typography.headingFont,
  '--font-body': theme.typography.bodyFont,
  '--font-heading-weight': theme.typography.headingWeight,
  '--font-body-weight': theme.typography.bodyWeight,
  '--radius': theme.radius,
  '--section-padding': theme.sectionPadding,
  '--container-width': theme.containerWidth,
} as React.CSSProperties);

/** Inline style shorthand for hsl colors from theme */
export const hsl = (token: string) => `hsl(${token})`;
export const hsla = (token: string, alpha: number) => `hsla(${token}, ${alpha})`;

/** Container style from theme */
export const containerStyle = (theme: ThemeTokens): React.CSSProperties => ({
  maxWidth: theme.containerWidth,
  margin: '0 auto',
  padding: '0 1rem',
});

/** Section wrapper style from theme */
export const sectionStyle = (theme: ThemeTokens): React.CSSProperties => ({
  padding: theme.sectionPadding,
});

/** Heading style from theme */
export const headingStyle = (theme: ThemeTokens): React.CSSProperties => ({
  fontFamily: theme.typography.headingFont,
  fontWeight: theme.typography.headingWeight,
  color: hsl(theme.colors.foreground),
});

/** Body text style from theme */
export const bodyStyle = (theme: ThemeTokens): React.CSSProperties => ({
  fontFamily: theme.typography.bodyFont,
  fontWeight: theme.typography.bodyWeight,
  color: hsl(theme.colors.mutedForeground),
});

/** Primary button style from theme */
export const primaryButtonStyle = (theme: ThemeTokens): React.CSSProperties => ({
  background: `linear-gradient(135deg, hsl(${theme.colors.primary}), hsl(${theme.colors.secondary}))`,
  color: hsl(theme.colors.primaryForeground),
  padding: '0.75rem 2rem',
  borderRadius: theme.radius,
  fontWeight: '600',
  border: 'none',
  cursor: 'pointer',
  fontFamily: theme.typography.bodyFont,
  transition: 'all 0.2s ease',
});

/** Outline button style from theme */
export const outlineButtonStyle = (theme: ThemeTokens): React.CSSProperties => ({
  background: 'transparent',
  color: hsl(theme.colors.foreground),
  padding: '0.75rem 2rem',
  borderRadius: theme.radius,
  fontWeight: '600',
  border: `1px solid ${hsla(theme.colors.border, 1)}`,
  cursor: 'pointer',
  fontFamily: theme.typography.bodyFont,
  transition: 'all 0.2s ease',
});

/** Card style from theme */
export const cardStyle = (theme: ThemeTokens): React.CSSProperties => ({
  background: hsl(theme.colors.card),
  color: hsl(theme.colors.cardForeground),
  borderRadius: theme.radius,
  border: `1px solid ${hsla(theme.colors.border, 1)}`,
  overflow: 'hidden',
  transition: 'all 0.3s ease',
});

/**
 * Generate a standalone CSS block with theme custom properties + typography.
 * Designed for template.css — no Tailwind directives.
 */
export function themeTokensToTemplateCSS(theme: ThemeTokens): string {
  return `/* Theme design tokens — auto-injected from selected aesthetic */
:root {
  --background: ${theme.colors.background};
  --foreground: ${theme.colors.foreground};
  --card: ${theme.colors.card};
  --card-foreground: ${theme.colors.cardForeground};
  --primary: ${theme.colors.primary};
  --primary-foreground: ${theme.colors.primaryForeground};
  --secondary: ${theme.colors.secondary};
  --secondary-foreground: ${theme.colors.secondaryForeground};
  --muted: ${theme.colors.muted};
  --muted-foreground: ${theme.colors.mutedForeground};
  --accent: ${theme.colors.accent};
  --accent-foreground: ${theme.colors.accentForeground};
  --border: ${theme.colors.border};
  --radius: ${theme.radius};
  --font-heading: '${theme.typography.headingFont}', system-ui, sans-serif;
  --font-body: '${theme.typography.bodyFont}', system-ui, sans-serif;
  --font-heading-weight: ${theme.typography.headingWeight};
  --font-body-weight: ${theme.typography.bodyWeight};
  --section-padding: ${theme.sectionPadding};
  --container-width: ${theme.containerWidth};
}

body {
  font-family: var(--font-body);
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  margin: 0; padding: 0;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
}
`;
}

/**
 * Convert ThemeTokens into a CSS :root block with all custom properties.
 * Produces Tailwind/shadcn-compatible variable names.
 */
export function themeTokensToCSSRoot(theme: ThemeTokens): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: ${theme.colors.background};
  --foreground: ${theme.colors.foreground};
  --card: ${theme.colors.card};
  --card-foreground: ${theme.colors.cardForeground};
  --primary: ${theme.colors.primary};
  --primary-foreground: ${theme.colors.primaryForeground};
  --secondary: ${theme.colors.secondary};
  --secondary-foreground: ${theme.colors.secondaryForeground};
  --muted: ${theme.colors.muted};
  --muted-foreground: ${theme.colors.mutedForeground};
  --accent: ${theme.colors.accent};
  --accent-foreground: ${theme.colors.accentForeground};
  --border: ${theme.colors.border};
  --radius: ${theme.radius};
}

* {
  border-color: hsl(var(--border));
}

body {
  font-family: ${theme.typography.bodyFont};
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  margin: 0;
  padding: 0;
}
`;
}
