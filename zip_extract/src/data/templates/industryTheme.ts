/**
 * Industry Theme System
 * 
 * Generates CSS custom properties and Tailwind-compatible tokens
 * based on industry theme presets.
 * 
 * This ensures industries LOOK different, not just behave differently.
 */

import { IndustryType, IndustryThemePreset, industryProfiles, getThemePreset } from './industryProfiles';

// ============================================================================
// THEME TOKEN TYPES
// ============================================================================

export interface ThemeTokens {
  // Typography
  fontSizeBase: string;
  fontSizeHeading1: string;
  fontSizeHeading2: string;
  fontSizeHeading3: string;
  fontSizeSmall: string;
  lineHeightBody: string;
  lineHeightHeading: string;
  letterSpacingHeading: string;
  
  // Spacing
  spacingXs: string;
  spacingSm: string;
  spacingMd: string;
  spacingLg: string;
  spacingXl: string;
  spacing2xl: string;
  spacing3xl: string;
  sectionPaddingY: string;
  containerPaddingX: string;
  
  // Border Radius
  radiusNone: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusFull: string;
  radiusButton: string;
  radiusCard: string;
  radiusInput: string;
  
  // Shadows
  shadowNone: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowCard: string;
  shadowButton: string;
  
  // CTA Copy
  ctaPrimary: string;
  ctaSecondary: string;
}

export interface IndustryTheme {
  id: IndustryType;
  name: string;
  tokens: ThemeTokens;
  cssVariables: Record<string, string>;
  tailwindConfig: Record<string, unknown>;
}

// ============================================================================
// TOKEN SCALE DEFINITIONS
// ============================================================================

const TYPOGRAPHY_SCALES = {
  compact: {
    fontSizeBase: '14px',
    fontSizeHeading1: '36px',
    fontSizeHeading2: '28px',
    fontSizeHeading3: '20px',
    fontSizeSmall: '12px',
    lineHeightBody: '1.5',
    lineHeightHeading: '1.2',
    letterSpacingHeading: '-0.02em',
  },
  standard: {
    fontSizeBase: '16px',
    fontSizeHeading1: '48px',
    fontSizeHeading2: '36px',
    fontSizeHeading3: '24px',
    fontSizeSmall: '14px',
    lineHeightBody: '1.6',
    lineHeightHeading: '1.25',
    letterSpacingHeading: '-0.025em',
  },
  generous: {
    fontSizeBase: '18px',
    fontSizeHeading1: '64px',
    fontSizeHeading2: '48px',
    fontSizeHeading3: '32px',
    fontSizeSmall: '14px',
    lineHeightBody: '1.7',
    lineHeightHeading: '1.15',
    letterSpacingHeading: '-0.03em',
  },
};

const SPACING_SCALES = {
  tight: {
    spacingXs: '4px',
    spacingSm: '8px',
    spacingMd: '12px',
    spacingLg: '16px',
    spacingXl: '24px',
    spacing2xl: '32px',
    spacing3xl: '48px',
    sectionPaddingY: '48px',
    containerPaddingX: '16px',
  },
  normal: {
    spacingXs: '4px',
    spacingSm: '8px',
    spacingMd: '16px',
    spacingLg: '24px',
    spacingXl: '32px',
    spacing2xl: '48px',
    spacing3xl: '64px',
    sectionPaddingY: '64px',
    containerPaddingX: '24px',
  },
  relaxed: {
    spacingXs: '8px',
    spacingSm: '12px',
    spacingMd: '20px',
    spacingLg: '32px',
    spacingXl: '48px',
    spacing2xl: '64px',
    spacing3xl: '96px',
    sectionPaddingY: '96px',
    containerPaddingX: '32px',
  },
};

const BORDER_RADIUS_SCALES = {
  none: {
    radiusNone: '0',
    radiusSm: '0',
    radiusMd: '0',
    radiusLg: '0',
    radiusFull: '0',
    radiusButton: '0',
    radiusCard: '0',
    radiusInput: '0',
  },
  subtle: {
    radiusNone: '0',
    radiusSm: '2px',
    radiusMd: '4px',
    radiusLg: '6px',
    radiusFull: '9999px',
    radiusButton: '4px',
    radiusCard: '6px',
    radiusInput: '4px',
  },
  rounded: {
    radiusNone: '0',
    radiusSm: '4px',
    radiusMd: '8px',
    radiusLg: '12px',
    radiusFull: '9999px',
    radiusButton: '8px',
    radiusCard: '12px',
    radiusInput: '8px',
  },
  pill: {
    radiusNone: '0',
    radiusSm: '8px',
    radiusMd: '16px',
    radiusLg: '24px',
    radiusFull: '9999px',
    radiusButton: '9999px',
    radiusCard: '24px',
    radiusInput: '9999px',
  },
};

const SHADOW_SCALES = {
  none: {
    shadowNone: 'none',
    shadowSm: 'none',
    shadowMd: 'none',
    shadowLg: 'none',
    shadowCard: 'none',
    shadowButton: 'none',
  },
  subtle: {
    shadowNone: 'none',
    shadowSm: '0 1px 2px rgba(0,0,0,0.04)',
    shadowMd: '0 2px 4px rgba(0,0,0,0.06)',
    shadowLg: '0 4px 8px rgba(0,0,0,0.08)',
    shadowCard: '0 2px 8px rgba(0,0,0,0.06)',
    shadowButton: '0 1px 2px rgba(0,0,0,0.05)',
  },
  medium: {
    shadowNone: 'none',
    shadowSm: '0 1px 3px rgba(0,0,0,0.08)',
    shadowMd: '0 4px 6px rgba(0,0,0,0.1)',
    shadowLg: '0 10px 15px rgba(0,0,0,0.12)',
    shadowCard: '0 4px 12px rgba(0,0,0,0.1)',
    shadowButton: '0 2px 4px rgba(0,0,0,0.1)',
  },
  dramatic: {
    shadowNone: 'none',
    shadowSm: '0 2px 4px rgba(0,0,0,0.12)',
    shadowMd: '0 8px 16px rgba(0,0,0,0.15)',
    shadowLg: '0 20px 40px rgba(0,0,0,0.2)',
    shadowCard: '0 8px 24px rgba(0,0,0,0.15)',
    shadowButton: '0 4px 8px rgba(0,0,0,0.15)',
  },
};

// ============================================================================
// THEME GENERATOR
// ============================================================================

/**
 * Generate theme tokens from an industry preset
 */
export function generateThemeTokens(preset: IndustryThemePreset): ThemeTokens {
  const typography = TYPOGRAPHY_SCALES[preset.typographyScale];
  const spacing = SPACING_SCALES[preset.spacingDensity];
  const radius = BORDER_RADIUS_SCALES[preset.borderRadius];
  const shadows = SHADOW_SCALES[preset.shadowIntensity];

  return {
    ...typography,
    ...spacing,
    ...radius,
    ...shadows,
    ctaPrimary: preset.ctaTone.primary,
    ctaSecondary: preset.ctaTone.secondary,
  };
}

/**
 * Convert tokens to CSS custom properties
 */
export function tokensToCssVariables(tokens: ThemeTokens): Record<string, string> {
  const variables: Record<string, string> = {};

  // Convert camelCase to kebab-case for CSS
  for (const [key, value] of Object.entries(tokens)) {
    const cssKey = `--industry-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    variables[cssKey] = value;
  }

  return variables;
}

/**
 * Generate a CSS string with all custom properties
 */
export function generateCssString(industryId: IndustryType): string {
  const preset = getThemePreset(industryId);
  const tokens = generateThemeTokens(preset);
  const variables = tokensToCssVariables(tokens);

  const lines = [
    `/* Industry Theme: ${industryId} */`,
    ':root {',
  ];

  for (const [key, value] of Object.entries(variables)) {
    lines.push(`  ${key}: ${value};`);
  }

  lines.push('}');

  // Add utility classes
  lines.push('');
  lines.push(`/* ${industryId} utility classes */`);
  lines.push(`.industry-${industryId} {`);
  lines.push(`  --section-padding-y: var(--industry-section-padding-y);`);
  lines.push(`  --container-padding-x: var(--industry-container-padding-x);`);
  lines.push(`  --card-radius: var(--industry-radius-card);`);
  lines.push(`  --card-shadow: var(--industry-shadow-card);`);
  lines.push(`  --button-radius: var(--industry-radius-button);`);
  lines.push(`}`);

  return lines.join('\n');
}

/**
 * Generate complete industry theme object
 */
export function generateIndustryTheme(industryId: IndustryType): IndustryTheme {
  const profile = industryProfiles[industryId];
  const tokens = generateThemeTokens(profile.themePreset);
  const cssVariables = tokensToCssVariables(tokens);

  return {
    id: industryId,
    name: profile.name,
    tokens,
    cssVariables,
    tailwindConfig: {
      extend: {
        fontSize: {
          'industry-base': tokens.fontSizeBase,
          'industry-h1': tokens.fontSizeHeading1,
          'industry-h2': tokens.fontSizeHeading2,
          'industry-h3': tokens.fontSizeHeading3,
          'industry-sm': tokens.fontSizeSmall,
        },
        spacing: {
          'industry-xs': tokens.spacingXs,
          'industry-sm': tokens.spacingSm,
          'industry-md': tokens.spacingMd,
          'industry-lg': tokens.spacingLg,
          'industry-xl': tokens.spacingXl,
          'industry-2xl': tokens.spacing2xl,
          'industry-3xl': tokens.spacing3xl,
        },
        borderRadius: {
          'industry-button': tokens.radiusButton,
          'industry-card': tokens.radiusCard,
          'industry-input': tokens.radiusInput,
        },
        boxShadow: {
          'industry-card': tokens.shadowCard,
          'industry-button': tokens.shadowButton,
        },
      },
    },
  };
}

// ============================================================================
// IMAGERY STYLE GUIDANCE
// ============================================================================

export interface ImageryGuidance {
  style: IndustryThemePreset['imageryStyle'];
  description: string;
  keywords: string[];
  aspectRatios: string[];
  treatment: string;
}

const IMAGERY_GUIDANCE: Record<IndustryThemePreset['imageryStyle'], ImageryGuidance> = {
  editorial: {
    style: 'editorial',
    description: 'Magazine-quality, storytelling imagery with artistic composition',
    keywords: ['atmospheric', 'moody', 'storytelling', 'candid', 'cinematic'],
    aspectRatios: ['16:9', '3:2', '4:3'],
    treatment: 'High contrast, warm tones, selective focus',
  },
  product: {
    style: 'product',
    description: 'Clean, detailed product photography on neutral backgrounds',
    keywords: ['clean', 'detailed', 'studio', 'white-background', 'packshot'],
    aspectRatios: ['1:1', '4:5', '3:4'],
    treatment: 'Bright, even lighting, sharp focus, minimal shadows',
  },
  lifestyle: {
    style: 'lifestyle',
    description: 'People using products/services in real-life settings',
    keywords: ['authentic', 'natural', 'in-context', 'aspirational', 'relatable'],
    aspectRatios: ['16:9', '4:3', '1:1'],
    treatment: 'Natural lighting, warm tones, soft focus backgrounds',
  },
  professional: {
    style: 'professional',
    description: 'Corporate, trustworthy imagery with confident subjects',
    keywords: ['corporate', 'trustworthy', 'confident', 'clean', 'business'],
    aspectRatios: ['16:9', '3:2'],
    treatment: 'Neutral colors, even lighting, professional attire',
  },
  artistic: {
    style: 'artistic',
    description: 'Creative, expressive imagery that showcases artistic work',
    keywords: ['creative', 'expressive', 'unique', 'bold', 'textured'],
    aspectRatios: ['1:1', '4:5', '16:9'],
    treatment: 'High contrast, dramatic lighting, unique compositions',
  },
};

/**
 * Get imagery guidance for an industry
 */
export function getImageryGuidance(industryId: IndustryType): ImageryGuidance {
  const preset = getThemePreset(industryId);
  return IMAGERY_GUIDANCE[preset.imageryStyle];
}

// ============================================================================
// COLOR MOOD PALETTES
// ============================================================================

export interface ColorMoodPalette {
  mood: IndustryThemePreset['colorMood'];
  description: string;
  suggestedPrimary: string[];
  suggestedSecondary: string[];
  suggestedAccent: string[];
  backgroundTone: 'light' | 'dark' | 'neutral';
}

const COLOR_MOOD_PALETTES: Record<IndustryThemePreset['colorMood'], ColorMoodPalette> = {
  warm: {
    mood: 'warm',
    description: 'Inviting, comfortable, and appetizing',
    suggestedPrimary: ['#D97706', '#B45309', '#92400E', '#C2410C', '#B91C1C'],
    suggestedSecondary: ['#FCD34D', '#FBBF24', '#F59E0B', '#FCA5A5', '#FDBA74'],
    suggestedAccent: ['#DC2626', '#EA580C', '#F97316'],
    backgroundTone: 'light',
  },
  cool: {
    mood: 'cool',
    description: 'Professional, trustworthy, and calm',
    suggestedPrimary: ['#2563EB', '#1D4ED8', '#1E40AF', '#0369A1', '#0891B2'],
    suggestedSecondary: ['#3B82F6', '#60A5FA', '#93C5FD', '#22D3EE', '#67E8F9'],
    suggestedAccent: ['#06B6D4', '#14B8A6', '#10B981'],
    backgroundTone: 'light',
  },
  neutral: {
    mood: 'neutral',
    description: 'Balanced, versatile, and timeless',
    suggestedPrimary: ['#374151', '#4B5563', '#6B7280', '#1F2937', '#111827'],
    suggestedSecondary: ['#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB'],
    suggestedAccent: ['#3B82F6', '#10B981', '#8B5CF6'],
    backgroundTone: 'neutral',
  },
  bold: {
    mood: 'bold',
    description: 'Energetic, confident, and attention-grabbing',
    suggestedPrimary: ['#DC2626', '#7C3AED', '#DB2777', '#2563EB', '#059669'],
    suggestedSecondary: ['#000000', '#18181B', '#27272A', '#1F2937', '#111827'],
    suggestedAccent: ['#FBBF24', '#22D3EE', '#A3E635'],
    backgroundTone: 'dark',
  },
  muted: {
    mood: 'muted',
    description: 'Soft, sophisticated, and calming',
    suggestedPrimary: ['#78716C', '#A8A29E', '#8B7355', '#7C9885', '#8E7CC3'],
    suggestedSecondary: ['#D6D3D1', '#E7E5E4', '#F5F5F4', '#E8E4DF', '#EDE9E3'],
    suggestedAccent: ['#D4A574', '#B8C4A8', '#C4B5D4'],
    backgroundTone: 'light',
  },
};

/**
 * Get color mood palette for an industry
 */
export function getColorMoodPalette(industryId: IndustryType): ColorMoodPalette {
  const preset = getThemePreset(industryId);
  return COLOR_MOOD_PALETTES[preset.colorMood];
}

// ============================================================================
// APPLY THEME TO TEMPLATE
// ============================================================================

/**
 * Generate inline styles for a section based on industry theme
 */
export function getSectionStyles(industryId: IndustryType): Record<string, string> {
  const tokens = generateThemeTokens(getThemePreset(industryId));
  
  return {
    paddingTop: tokens.sectionPaddingY,
    paddingBottom: tokens.sectionPaddingY,
    paddingLeft: tokens.containerPaddingX,
    paddingRight: tokens.containerPaddingX,
  };
}

/**
 * Generate inline styles for a card based on industry theme
 */
export function getCardStyles(industryId: IndustryType): Record<string, string> {
  const tokens = generateThemeTokens(getThemePreset(industryId));
  
  return {
    borderRadius: tokens.radiusCard,
    boxShadow: tokens.shadowCard,
    padding: tokens.spacingLg,
  };
}

/**
 * Generate inline styles for a button based on industry theme
 */
export function getButtonStyles(industryId: IndustryType): Record<string, string> {
  const tokens = generateThemeTokens(getThemePreset(industryId));
  
  return {
    borderRadius: tokens.radiusButton,
    boxShadow: tokens.shadowButton,
    paddingLeft: tokens.spacingLg,
    paddingRight: tokens.spacingLg,
    paddingTop: tokens.spacingMd,
    paddingBottom: tokens.spacingMd,
    fontSize: tokens.fontSizeBase,
  };
}
