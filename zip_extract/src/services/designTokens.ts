/**
 * Design Tokens System
 * 
 * Manages design tokens (colors, typography, spacing, etc.)
 * with support for:
 * - Theme presets (light, dark, bold, minimal)
 * - Color extraction from assets
 * - AI-driven token generation from prompts
 * - Runtime token overrides
 */

import type {
  DesignTokens,
  ColorTokens,
  TypographyTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
  TransitionTokens,
  ThemeSpec,
} from '@/types/designSystem';

// ============================================
// DEFAULT TOKENS
// ============================================

const defaultTypography: TypographyTokens = {
  fontFamily: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, Menlo, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
};

const defaultSpacing: SpacingTokens = {
  none: '0',
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
};

const defaultRadius: RadiusTokens = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
};

const defaultShadows: ShadowTokens = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

const defaultTransitions: TransitionTokens = {
  fast: '150ms ease',
  normal: '300ms ease',
  slow: '500ms ease',
};

// ============================================
// THEME PRESETS
// ============================================

export interface ThemePreset {
  name: string;
  mode: 'light' | 'dark';
  style: string;
  colors: ColorTokens;
}

const lightColors: ColorTokens = {
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  secondary: '#8b5cf6',
  accent: '#f59e0b',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',
};

const darkColors: ColorTokens = {
  primary: '#60a5fa',
  primaryLight: '#93c5fd',
  primaryDark: '#3b82f6',
  secondary: '#a78bfa',
  accent: '#fbbf24',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  background: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  textInverse: '#0f172a',
};

export const THEME_PRESETS: Record<string, ThemePreset> = {
  'light-minimal': {
    name: 'Light Minimal',
    mode: 'light',
    style: 'minimal',
    colors: lightColors,
  },
  'light-modern': {
    name: 'Light Modern',
    mode: 'light',
    style: 'modern',
    colors: {
      ...lightColors,
      primary: '#0ea5e9',
      primaryLight: '#38bdf8',
      primaryDark: '#0284c7',
    },
  },
  'light-bold': {
    name: 'Light Bold',
    mode: 'light',
    style: 'bold',
    colors: {
      ...lightColors,
      primary: '#dc2626',
      primaryLight: '#ef4444',
      primaryDark: '#b91c1c',
      accent: '#7c3aed',
    },
  },
  'dark-minimal': {
    name: 'Dark Minimal',
    mode: 'dark',
    style: 'minimal',
    colors: darkColors,
  },
  'dark-modern': {
    name: 'Dark Modern',
    mode: 'dark',
    style: 'modern',
    colors: {
      ...darkColors,
      primary: '#06b6d4',
      primaryLight: '#22d3ee',
      primaryDark: '#0891b2',
    },
  },
  'dark-bold': {
    name: 'Dark Bold',
    mode: 'dark',
    style: 'bold',
    colors: {
      ...darkColors,
      primary: '#f43f5e',
      primaryLight: '#fb7185',
      primaryDark: '#e11d48',
      accent: '#a855f7',
      background: '#09090b',
      surface: '#18181b',
    },
  },
  'dark-elegant': {
    name: 'Dark Elegant',
    mode: 'dark',
    style: 'elegant',
    colors: {
      ...darkColors,
      primary: '#d4af37',
      primaryLight: '#e8c252',
      primaryDark: '#b8962e',
      background: '#1a1a2e',
      surface: '#16213e',
      border: '#2a3f5f',
    },
  },
  'light-playful': {
    name: 'Light Playful',
    mode: 'light',
    style: 'playful',
    colors: {
      ...lightColors,
      primary: '#ec4899',
      primaryLight: '#f472b6',
      primaryDark: '#db2777',
      secondary: '#8b5cf6',
      accent: '#06b6d4',
    },
  },
};

// ============================================
// TOKEN MANAGER
// ============================================

export class DesignTokenManager {
  private tokens: DesignTokens;
  private basePreset: string = 'light-minimal';

  constructor(preset?: string) {
    this.tokens = this.createDefaultTokens();
    if (preset) {
      this.applyPreset(preset);
    }
  }

  private createDefaultTokens(): DesignTokens {
    return {
      colors: lightColors,
      typography: { ...defaultTypography },
      spacing: { ...defaultSpacing },
      radius: { ...defaultRadius },
      shadows: { ...defaultShadows },
      transitions: { ...defaultTransitions },
    };
  }

  /**
   * Apply a theme preset
   */
  applyPreset(presetName: string): void {
    const preset = THEME_PRESETS[presetName];
    if (preset) {
      this.basePreset = presetName;
      this.tokens.colors = { ...preset.colors };
    }
  }

  /**
   * Apply theme spec from AI
   */
  applyThemeSpec(spec: ThemeSpec): void {
    // Find matching preset
    const presetKey = `${spec.mode}-${spec.style}`;
    if (THEME_PRESETS[presetKey]) {
      this.applyPreset(presetKey);
    }

    // Apply overrides
    if (spec.primaryColor) {
      this.tokens.colors.primary = spec.primaryColor;
      this.tokens.colors.primaryLight = this.lightenColor(spec.primaryColor, 0.2);
      this.tokens.colors.primaryDark = this.darkenColor(spec.primaryColor, 0.2);
    }

    if (spec.accentColor) {
      this.tokens.colors.accent = spec.accentColor;
    }

    // Apply custom token overrides
    if (spec.tokens) {
      this.tokens = this.mergeTokens(this.tokens, spec.tokens);
    }
  }

  /**
   * Extract colors from image assets
   */
  applyExtractedColors(colors: string[]): void {
    if (colors.length === 0) return;

    this.tokens.colors.extracted = colors;

    // Use first color as primary if not already set
    if (colors[0]) {
      const dominant = colors[0];
      // Only apply if it's a strong enough color
      if (this.getColorSaturation(dominant) > 0.3) {
        this.tokens.colors.primary = dominant;
        this.tokens.colors.primaryLight = this.lightenColor(dominant, 0.2);
        this.tokens.colors.primaryDark = this.darkenColor(dominant, 0.2);
      }
    }

    // Use second color as accent if available
    if (colors[1]) {
      this.tokens.colors.accent = colors[1];
    }
  }

  /**
   * Get current tokens
   */
  getTokens(): DesignTokens {
    return this.tokens;
  }

  /**
   * Get specific token value
   */
  get<K extends keyof DesignTokens>(category: K): DesignTokens[K] {
    return this.tokens[category];
  }

  /**
   * Generate CSS custom properties
   */
  toCSSProperties(): string {
    const lines: string[] = [':root {'];

    // Colors
    Object.entries(this.tokens.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        lines.push(`  --color-${this.toKebabCase(key)}: ${value};`);
      }
    });

    // Typography
    Object.entries(this.tokens.typography.fontSize).forEach(([key, value]) => {
      lines.push(`  --font-size-${key}: ${value};`);
    });
    Object.entries(this.tokens.typography.fontFamily).forEach(([key, value]) => {
      lines.push(`  --font-${key}: ${value};`);
    });

    // Spacing
    Object.entries(this.tokens.spacing).forEach(([key, value]) => {
      lines.push(`  --spacing-${key}: ${value};`);
    });

    // Radius
    Object.entries(this.tokens.radius).forEach(([key, value]) => {
      lines.push(`  --radius-${key}: ${value};`);
    });

    // Shadows
    Object.entries(this.tokens.shadows).forEach(([key, value]) => {
      lines.push(`  --shadow-${key}: ${value};`);
    });

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Generate Tailwind config
   */
  toTailwindConfig(): object {
    return {
      theme: {
        extend: {
          colors: {
            primary: {
              DEFAULT: this.tokens.colors.primary,
              light: this.tokens.colors.primaryLight,
              dark: this.tokens.colors.primaryDark,
            },
            secondary: this.tokens.colors.secondary,
            accent: this.tokens.colors.accent,
          },
          fontFamily: {
            heading: [this.tokens.typography.fontFamily.heading],
            body: [this.tokens.typography.fontFamily.body],
            mono: [this.tokens.typography.fontFamily.mono],
          },
        },
      },
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private mergeTokens(base: DesignTokens, overrides: Partial<DesignTokens>): DesignTokens {
    return {
      colors: { ...base.colors, ...overrides.colors },
      typography: { ...base.typography, ...overrides.typography },
      spacing: { ...base.spacing, ...overrides.spacing },
      radius: { ...base.radius, ...overrides.radius },
      shadows: { ...base.shadows, ...overrides.shadows },
      transitions: { ...base.transitions, ...overrides.transitions },
    };
  }

  private lightenColor(hex: string, amount: number): string {
    return this.adjustColor(hex, amount);
  }

  private darkenColor(hex: string, amount: number): string {
    return this.adjustColor(hex, -amount);
  }

  private adjustColor(hex: string, amount: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const adjusted = {
      r: Math.round(Math.min(255, Math.max(0, rgb.r + (255 * amount)))),
      g: Math.round(Math.min(255, Math.max(0, rgb.g + (255 * amount)))),
      b: Math.round(Math.min(255, Math.max(0, rgb.b + (255 * amount)))),
    };

    return this.rgbToHex(adjusted.r, adjusted.g, adjusted.b);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  private getColorSaturation(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
    const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
    const l = (max + min) / 2;

    if (max === min) return 0;

    return l > 0.5
      ? (max - min) / (2 - max - min)
      : (max - min) / (max + min);
  }

  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

// ============================================
// SINGLETON
// ============================================

let tokenManager: DesignTokenManager | null = null;

export function getTokenManager(): DesignTokenManager {
  if (!tokenManager) {
    tokenManager = new DesignTokenManager();
  }
  return tokenManager;
}

export function resetTokenManager(): void {
  tokenManager = null;
}
