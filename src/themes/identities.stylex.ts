/**
 * Theme Identities — StyleX Theme Overrides
 *
 * 5 identity themes, each created with stylex.createTheme().
 * Each theme overrides ONLY presentation tokens.
 * They NEVER affect layout structure, intent wiring, or component behavior.
 *
 * Identities:
 *   modern     — clean grids, cool neutrals, sharp accent, medium radius
 *   editorial  — serif headlines, asymmetric energy, type-forward, thin borders
 *   bold       — heavy contrast, large CTAs, strong color blocking, visual urgency
 *   futuristic — dark-first, electric accents, layered surfaces, glow edges
 *   organic    — warm tones, soft corners, breathable spacing, natural flow
 */
import * as stylex from '@stylexjs/stylex';
import {
  colorTokens,
  typographyTokens,
  shapeTokens,
  surfaceTokens,
  motionTokens,
  spacingTokens,
} from './tokens.stylex';

// ============================================================================
// THEME IDENTITY TYPE
// ============================================================================

export type ThemeIdentity = 'modern' | 'editorial' | 'bold' | 'futuristic' | 'organic';

export interface ThemeIdentityMeta {
  id: ThemeIdentity;
  name: string;
  description: string;
  tags: string[];
}

export const THEME_IDENTITY_META: Record<ThemeIdentity, ThemeIdentityMeta> = {
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean grids, medium radius, soft shadow depth, cool neutral palette with one sharp accent.',
    tags: ['clean', 'minimal', 'professional', 'whitespace'],
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Serif headlines with clean sans body, asymmetric energy, larger type contrast.',
    tags: ['typography', 'elegant', 'asymmetric', 'magazine'],
  },
  bold: {
    id: 'bold',
    name: 'Bold',
    description: 'Heavy contrast, larger CTAs, firmer shapes, higher saturation, visual urgency.',
    tags: ['contrast', 'urgent', 'saturated', 'impactful'],
  },
  futuristic: {
    id: 'futuristic',
    name: 'Futuristic',
    description: 'Dark-first presentation, bright electric accents, layered surfaces, luminous depth.',
    tags: ['dark', 'glow', 'tech', 'gradient-mesh'],
  },
  organic: {
    id: 'organic',
    name: 'Organic',
    description: 'Warmer tones, softer corners, breathable spacing, friendly typography, natural flow.',
    tags: ['warm', 'earthy', 'friendly', 'rounded'],
  },
};

// ============================================================================
// MODERN IDENTITY
// ============================================================================

export const modernColorTheme = stylex.createTheme(colorTokens, {
  primary: '#6366F1',
  primaryHover: '#4F46E5',
  secondary: '#8B5CF6',
  secondaryHover: '#7C3AED',
  accent: '#06B6D4',
  accentHover: '#0891B2',
  background: '#FFFFFF',
  backgroundAlt: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  textAccent: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  borderFocus: '#6366F1',
});

export const modernTypographyTheme = stylex.createTheme(typographyTokens, {
  fontHeading: "'Inter', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontAccent: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  sizeHero: '3.052rem',
  sizeH1: '2.441rem',
  sizeH2: '1.953rem',
  sizeH3: '1.563rem',
  sizeH4: '1.25rem',
  sizeBody: '1rem',
  sizeSmall: '0.8rem',
  sizeXs: '0.64rem',
  weightLight: '300',
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  weightBlack: '900',
  lineHeightTight: '1.2',
  lineHeightNormal: '1.5',
  lineHeightRelaxed: '1.75',
  trackingTight: '-0.025em',
  trackingNormal: '0',
  trackingWide: '0.05em',
});

export const modernShapeTheme = stylex.createTheme(shapeTokens, {
  radiusNone: '0',
  radiusSm: '0.25rem',
  radiusMd: '0.5rem',
  radiusLg: '0.75rem',
  radiusXl: '1rem',
  radius2xl: '1.5rem',
  radiusFull: '9999px',
  borderThin: '1px',
  borderMedium: '2px',
  borderThick: '3px',
  borderStyle: 'solid',
  shadowNone: 'none',
  shadowSm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  shadowMd: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
  shadowLg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.06)',
  shadowXl: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.06)',
  shadowInner: 'inset 0 2px 4px 0 rgba(0,0,0,0.04)',
  shadowFocus: '0 0 0 3px rgba(99,102,241,0.3)',
});

export const modernSurfaceTheme = stylex.createTheme(surfaceTokens, {
  gradientPrimary: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
  gradientSecondary: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
  gradientSubtle: 'linear-gradient(180deg, rgba(99,102,241,0.04), transparent)',
  gradientHero: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)',
  glassBackground: 'rgba(255,255,255,0.7)',
  glassBackdrop: 'blur(12px)',
  overlayLight: 'rgba(255,255,255,0.6)',
  overlayDark: 'rgba(0,0,0,0.3)',
});

export const modernMotionTheme = stylex.createTheme(motionTokens, {
  durationFast: '150ms',
  durationNormal: '200ms',
  durationSlow: '350ms',
  durationSluggish: '600ms',
  easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  easingSharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  hoverLift: 'translateY(-2px)',
  hoverScale: 'scale(1.02)',
});

export const modernSpacingTheme = stylex.createTheme(spacingTokens, {
  sectionGap: '5rem',
  containerMaxWidth: '1200px',
  containerPadding: '1.5rem',
  cardPadding: '1.5rem',
  inputPadding: '0.75rem 1rem',
  buttonPaddingX: '1.5rem',
  buttonPaddingY: '0.75rem',
});

// ============================================================================
// EDITORIAL IDENTITY
// ============================================================================

export const editorialColorTheme = stylex.createTheme(colorTokens, {
  primary: '#1A1A2E',
  primaryHover: '#16213E',
  secondary: '#C4A35A',
  secondaryHover: '#B8943F',
  accent: '#C4A35A',
  accentHover: '#B8943F',
  background: '#FEFDFB',
  backgroundAlt: '#FAF8F5',
  surface: '#FEFDFB',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F5F1EB',
  textPrimary: '#1A1A2E',
  textSecondary: '#4A4A5A',
  textMuted: '#8A8A9A',
  textInverse: '#FEFDFB',
  textAccent: '#C4A35A',
  success: '#2D6A4F',
  warning: '#C4A35A',
  error: '#9B2C2C',
  info: '#2563EB',
  border: '#E8E2D9',
  borderStrong: '#D4CBC0',
  borderFocus: '#C4A35A',
});

export const editorialTypographyTheme = stylex.createTheme(typographyTokens, {
  fontHeading: "'Playfair Display', 'Georgia', serif",
  fontBody: "'Source Sans 3', 'Helvetica Neue', sans-serif",
  fontAccent: "'Playfair Display', serif",
  fontMono: "'JetBrains Mono', monospace",
  sizeHero: '4rem',
  sizeH1: '3rem',
  sizeH2: '2.25rem',
  sizeH3: '1.75rem',
  sizeH4: '1.25rem',
  sizeBody: '1.0625rem',
  sizeSmall: '0.875rem',
  sizeXs: '0.75rem',
  weightLight: '300',
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  weightBlack: '900',
  lineHeightTight: '1.15',
  lineHeightNormal: '1.6',
  lineHeightRelaxed: '1.85',
  trackingTight: '-0.03em',
  trackingNormal: '0',
  trackingWide: '0.08em',
});

export const editorialShapeTheme = stylex.createTheme(shapeTokens, {
  radiusNone: '0',
  radiusSm: '0.125rem',
  radiusMd: '0.25rem',
  radiusLg: '0.375rem',
  radiusXl: '0.5rem',
  radius2xl: '0.75rem',
  radiusFull: '9999px',
  borderThin: '1px',
  borderMedium: '1px',
  borderThick: '2px',
  borderStyle: 'solid',
  shadowNone: 'none',
  shadowSm: '0 1px 2px 0 rgba(26,26,46,0.04)',
  shadowMd: '0 2px 4px -1px rgba(26,26,46,0.06)',
  shadowLg: '0 4px 8px -2px rgba(26,26,46,0.06)',
  shadowXl: '0 8px 16px -4px rgba(26,26,46,0.06)',
  shadowInner: 'inset 0 1px 2px 0 rgba(26,26,46,0.03)',
  shadowFocus: '0 0 0 2px rgba(196,163,90,0.3)',
});

export const editorialSurfaceTheme = stylex.createTheme(surfaceTokens, {
  gradientPrimary: 'linear-gradient(135deg, #1A1A2E, #2D2D4A)',
  gradientSecondary: 'linear-gradient(135deg, #C4A35A, #D4B878)',
  gradientSubtle: 'linear-gradient(180deg, rgba(196,163,90,0.04), transparent)',
  gradientHero: 'linear-gradient(180deg, #FEFDFB, #FAF8F5)',
  glassBackground: 'rgba(254,253,251,0.9)',
  glassBackdrop: 'blur(8px)',
  overlayLight: 'rgba(254,253,251,0.7)',
  overlayDark: 'rgba(26,26,46,0.5)',
});

export const editorialMotionTheme = stylex.createTheme(motionTokens, {
  durationFast: '180ms',
  durationNormal: '300ms',
  durationSlow: '500ms',
  durationSluggish: '800ms',
  easingDefault: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  easingBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  easingSharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  hoverLift: 'translateY(-1px)',
  hoverScale: 'scale(1.01)',
});

export const editorialSpacingTheme = stylex.createTheme(spacingTokens, {
  sectionGap: '6rem',
  containerMaxWidth: '1100px',
  containerPadding: '2rem',
  cardPadding: '2rem',
  inputPadding: '0.875rem 1.125rem',
  buttonPaddingX: '2rem',
  buttonPaddingY: '0.875rem',
});

// ============================================================================
// BOLD IDENTITY
// ============================================================================

export const boldColorTheme = stylex.createTheme(colorTokens, {
  primary: '#DC2626',
  primaryHover: '#B91C1C',
  secondary: '#1E293B',
  secondaryHover: '#0F172A',
  accent: '#FACC15',
  accentHover: '#EAB308',
  background: '#FFFFFF',
  backgroundAlt: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  textAccent: '#DC2626',
  success: '#16A34A',
  warning: '#FACC15',
  error: '#DC2626',
  info: '#2563EB',
  border: '#CBD5E1',
  borderStrong: '#94A3B8',
  borderFocus: '#DC2626',
});

export const boldTypographyTheme = stylex.createTheme(typographyTokens, {
  fontHeading: "'Space Grotesk', 'Inter', sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontAccent: "'Space Grotesk', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  sizeHero: '3.5rem',
  sizeH1: '2.75rem',
  sizeH2: '2.125rem',
  sizeH3: '1.625rem',
  sizeH4: '1.25rem',
  sizeBody: '1rem',
  sizeSmall: '0.875rem',
  sizeXs: '0.75rem',
  weightLight: '300',
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '800',
  weightBlack: '900',
  lineHeightTight: '1.1',
  lineHeightNormal: '1.5',
  lineHeightRelaxed: '1.65',
  trackingTight: '-0.02em',
  trackingNormal: '0',
  trackingWide: '0.04em',
});

export const boldShapeTheme = stylex.createTheme(shapeTokens, {
  radiusNone: '0',
  radiusSm: '0.25rem',
  radiusMd: '0.375rem',
  radiusLg: '0.5rem',
  radiusXl: '0.75rem',
  radius2xl: '1rem',
  radiusFull: '9999px',
  borderThin: '2px',
  borderMedium: '3px',
  borderThick: '4px',
  borderStyle: 'solid',
  shadowNone: 'none',
  shadowSm: '0 2px 4px 0 rgba(0,0,0,0.1)',
  shadowMd: '0 4px 8px -1px rgba(0,0,0,0.15), 0 2px 4px -2px rgba(0,0,0,0.1)',
  shadowLg: '0 10px 20px -3px rgba(0,0,0,0.15), 0 4px 8px -4px rgba(0,0,0,0.1)',
  shadowXl: '0 24px 32px -8px rgba(0,0,0,0.2), 0 8px 12px -6px rgba(0,0,0,0.12)',
  shadowInner: 'inset 0 2px 6px 0 rgba(0,0,0,0.08)',
  shadowFocus: '0 0 0 4px rgba(220,38,38,0.3)',
});

export const boldSurfaceTheme = stylex.createTheme(surfaceTokens, {
  gradientPrimary: 'linear-gradient(135deg, #DC2626, #B91C1C)',
  gradientSecondary: 'linear-gradient(135deg, #1E293B, #334155)',
  gradientSubtle: 'linear-gradient(180deg, rgba(220,38,38,0.06), transparent)',
  gradientHero: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #7F1D1D 100%)',
  glassBackground: 'rgba(255,255,255,0.85)',
  glassBackdrop: 'blur(16px)',
  overlayLight: 'rgba(255,255,255,0.7)',
  overlayDark: 'rgba(15,23,42,0.6)',
});

export const boldMotionTheme = stylex.createTheme(motionTokens, {
  durationFast: '100ms',
  durationNormal: '180ms',
  durationSlow: '300ms',
  durationSluggish: '500ms',
  easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  easingSharp: 'cubic-bezier(0.22, 1, 0.36, 1)',
  hoverLift: 'translateY(-3px)',
  hoverScale: 'scale(1.04)',
});

export const boldSpacingTheme = stylex.createTheme(spacingTokens, {
  sectionGap: '4rem',
  containerMaxWidth: '1280px',
  containerPadding: '1.25rem',
  cardPadding: '1.25rem',
  inputPadding: '0.875rem 1.125rem',
  buttonPaddingX: '2rem',
  buttonPaddingY: '1rem',
});

// ============================================================================
// FUTURISTIC IDENTITY
// ============================================================================

export const futuristicColorTheme = stylex.createTheme(colorTokens, {
  primary: '#8B5CF6',
  primaryHover: '#7C3AED',
  secondary: '#06B6D4',
  secondaryHover: '#0891B2',
  accent: '#22D3EE',
  accentHover: '#06B6D4',
  background: '#0B0F19',
  backgroundAlt: '#111827',
  surface: '#1F2937',
  surfaceElevated: '#374151',
  surfaceMuted: '#111827',
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#6B7280',
  textInverse: '#0B0F19',
  textAccent: '#22D3EE',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  border: '#374151',
  borderStrong: '#4B5563',
  borderFocus: '#8B5CF6',
});

export const futuristicTypographyTheme = stylex.createTheme(typographyTokens, {
  fontHeading: "'Space Grotesk', 'Inter', sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontAccent: "'JetBrains Mono', monospace",
  fontMono: "'JetBrains Mono', monospace",
  sizeHero: '3.25rem',
  sizeH1: '2.5rem',
  sizeH2: '2rem',
  sizeH3: '1.5rem',
  sizeH4: '1.125rem',
  sizeBody: '0.9375rem',
  sizeSmall: '0.8125rem',
  sizeXs: '0.6875rem',
  weightLight: '300',
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  weightBlack: '900',
  lineHeightTight: '1.2',
  lineHeightNormal: '1.55',
  lineHeightRelaxed: '1.7',
  trackingTight: '-0.02em',
  trackingNormal: '0',
  trackingWide: '0.06em',
});

export const futuristicShapeTheme = stylex.createTheme(shapeTokens, {
  radiusNone: '0',
  radiusSm: '0.25rem',
  radiusMd: '0.5rem',
  radiusLg: '0.75rem',
  radiusXl: '1rem',
  radius2xl: '1.25rem',
  radiusFull: '9999px',
  borderThin: '1px',
  borderMedium: '1px',
  borderThick: '2px',
  borderStyle: 'solid',
  shadowNone: 'none',
  shadowSm: '0 0 8px 0 rgba(139,92,246,0.1)',
  shadowMd: '0 0 16px -2px rgba(139,92,246,0.15), 0 0 8px -2px rgba(34,211,238,0.1)',
  shadowLg: '0 0 24px -4px rgba(139,92,246,0.2), 0 0 12px -4px rgba(34,211,238,0.12)',
  shadowXl: '0 0 40px -6px rgba(139,92,246,0.25), 0 0 20px -6px rgba(34,211,238,0.15)',
  shadowInner: 'inset 0 0 8px 0 rgba(139,92,246,0.08)',
  shadowFocus: '0 0 0 3px rgba(139,92,246,0.4), 0 0 12px rgba(34,211,238,0.2)',
});

export const futuristicSurfaceTheme = stylex.createTheme(surfaceTokens, {
  gradientPrimary: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
  gradientSecondary: 'linear-gradient(135deg, #22D3EE, #8B5CF6)',
  gradientSubtle: 'linear-gradient(180deg, rgba(139,92,246,0.08), transparent)',
  gradientHero: 'linear-gradient(135deg, #0B0F19 0%, #1E1B4B 50%, #0B0F19 100%)',
  glassBackground: 'rgba(31,41,55,0.6)',
  glassBackdrop: 'blur(20px)',
  overlayLight: 'rgba(31,41,55,0.5)',
  overlayDark: 'rgba(11,15,25,0.8)',
});

export const futuristicMotionTheme = stylex.createTheme(motionTokens, {
  durationFast: '120ms',
  durationNormal: '220ms',
  durationSlow: '380ms',
  durationSluggish: '600ms',
  easingDefault: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  easingSharp: 'cubic-bezier(0.22, 1, 0.36, 1)',
  hoverLift: 'translateY(-2px)',
  hoverScale: 'scale(1.03)',
});

export const futuristicSpacingTheme = stylex.createTheme(spacingTokens, {
  sectionGap: '4.5rem',
  containerMaxWidth: '1240px',
  containerPadding: '1.5rem',
  cardPadding: '1.25rem',
  inputPadding: '0.625rem 0.875rem',
  buttonPaddingX: '1.5rem',
  buttonPaddingY: '0.625rem',
});

// ============================================================================
// ORGANIC IDENTITY
// ============================================================================

export const organicColorTheme = stylex.createTheme(colorTokens, {
  primary: '#78716C',
  primaryHover: '#57534E',
  secondary: '#A3B18A',
  secondaryHover: '#8FA376',
  accent: '#E07A5F',
  accentHover: '#C96A52',
  background: '#FBF9F6',
  backgroundAlt: '#F5F0EA',
  surface: '#FBF9F6',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F0EBE3',
  textPrimary: '#3D3D3D',
  textSecondary: '#5C5C5C',
  textMuted: '#9C9C9C',
  textInverse: '#FBF9F6',
  textAccent: '#E07A5F',
  success: '#588157',
  warning: '#E07A5F',
  error: '#C1121F',
  info: '#457B9D',
  border: '#E0D8CE',
  borderStrong: '#C9BFB2',
  borderFocus: '#A3B18A',
});

export const organicTypographyTheme = stylex.createTheme(typographyTokens, {
  fontHeading: "'DM Serif Display', 'Georgia', serif",
  fontBody: "'DM Sans', 'Helvetica Neue', sans-serif",
  fontAccent: "'DM Serif Display', serif",
  fontMono: "'JetBrains Mono', monospace",
  sizeHero: '3rem',
  sizeH1: '2.375rem',
  sizeH2: '1.875rem',
  sizeH3: '1.5rem',
  sizeH4: '1.25rem',
  sizeBody: '1rem',
  sizeSmall: '0.875rem',
  sizeXs: '0.75rem',
  weightLight: '300',
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  weightBlack: '800',
  lineHeightTight: '1.25',
  lineHeightNormal: '1.65',
  lineHeightRelaxed: '1.85',
  trackingTight: '-0.01em',
  trackingNormal: '0.01em',
  trackingWide: '0.06em',
});

export const organicShapeTheme = stylex.createTheme(shapeTokens, {
  radiusNone: '0',
  radiusSm: '0.375rem',
  radiusMd: '0.75rem',
  radiusLg: '1rem',
  radiusXl: '1.5rem',
  radius2xl: '2rem',
  radiusFull: '9999px',
  borderThin: '1px',
  borderMedium: '1.5px',
  borderThick: '2px',
  borderStyle: 'solid',
  shadowNone: 'none',
  shadowSm: '0 1px 3px 0 rgba(61,61,61,0.06)',
  shadowMd: '0 4px 8px -2px rgba(61,61,61,0.08)',
  shadowLg: '0 8px 16px -4px rgba(61,61,61,0.08)',
  shadowXl: '0 16px 24px -6px rgba(61,61,61,0.08)',
  shadowInner: 'inset 0 1px 3px 0 rgba(61,61,61,0.04)',
  shadowFocus: '0 0 0 3px rgba(163,177,138,0.35)',
});

export const organicSurfaceTheme = stylex.createTheme(surfaceTokens, {
  gradientPrimary: 'linear-gradient(135deg, #A3B18A, #78716C)',
  gradientSecondary: 'linear-gradient(135deg, #E07A5F, #A3B18A)',
  gradientSubtle: 'linear-gradient(180deg, rgba(163,177,138,0.06), transparent)',
  gradientHero: 'linear-gradient(180deg, #FBF9F6, #F5F0EA)',
  glassBackground: 'rgba(251,249,246,0.85)',
  glassBackdrop: 'blur(10px)',
  overlayLight: 'rgba(251,249,246,0.7)',
  overlayDark: 'rgba(61,61,61,0.4)',
});

export const organicMotionTheme = stylex.createTheme(motionTokens, {
  durationFast: '180ms',
  durationNormal: '300ms',
  durationSlow: '500ms',
  durationSluggish: '800ms',
  easingDefault: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  easingBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  easingSharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  hoverLift: 'translateY(-1px)',
  hoverScale: 'scale(1.015)',
});

export const organicSpacingTheme = stylex.createTheme(spacingTokens, {
  sectionGap: '5.5rem',
  containerMaxWidth: '1100px',
  containerPadding: '2rem',
  cardPadding: '1.75rem',
  inputPadding: '0.875rem 1.125rem',
  buttonPaddingX: '1.75rem',
  buttonPaddingY: '0.875rem',
});

// ============================================================================
// THEME RESOLVER — Get all theme overrides for a given identity
// ============================================================================

export interface ResolvedThemeOverrides {
  color: ReturnType<typeof stylex.createTheme>;
  typography: ReturnType<typeof stylex.createTheme>;
  shape: ReturnType<typeof stylex.createTheme>;
  surface: ReturnType<typeof stylex.createTheme>;
  motion: ReturnType<typeof stylex.createTheme>;
  spacing: ReturnType<typeof stylex.createTheme>;
}

const IDENTITY_THEMES: Record<ThemeIdentity, ResolvedThemeOverrides> = {
  modern: {
    color: modernColorTheme,
    typography: modernTypographyTheme,
    shape: modernShapeTheme,
    surface: modernSurfaceTheme,
    motion: modernMotionTheme,
    spacing: modernSpacingTheme,
  },
  editorial: {
    color: editorialColorTheme,
    typography: editorialTypographyTheme,
    shape: editorialShapeTheme,
    surface: editorialSurfaceTheme,
    motion: editorialMotionTheme,
    spacing: editorialSpacingTheme,
  },
  bold: {
    color: boldColorTheme,
    typography: boldTypographyTheme,
    shape: boldShapeTheme,
    surface: boldSurfaceTheme,
    motion: boldMotionTheme,
    spacing: boldSpacingTheme,
  },
  futuristic: {
    color: futuristicColorTheme,
    typography: futuristicTypographyTheme,
    shape: futuristicShapeTheme,
    surface: futuristicSurfaceTheme,
    motion: futuristicMotionTheme,
    spacing: futuristicSpacingTheme,
  },
  organic: {
    color: organicColorTheme,
    typography: organicTypographyTheme,
    shape: organicShapeTheme,
    surface: organicSurfaceTheme,
    motion: organicMotionTheme,
    spacing: organicSpacingTheme,
  },
};

export function getThemeOverrides(identity: ThemeIdentity): ResolvedThemeOverrides {
  return IDENTITY_THEMES[identity];
}
