/**
 * StyleX Design Token Variables
 *
 * Canonical token surface for the entire theme system.
 * Every theme identity overrides ONLY these variables.
 *
 * Pipeline: template structure → intent wiring → theme override → build
 *
 * These tokens control:
 *   color, typography, radius, border, shadow, gradient, motion, surface
 *
 * They do NOT control:
 *   layout structure, section order, component behavior, intent bindings
 */
import * as stylex from '@stylexjs/stylex';

/**
 * Color tokens — palette control
 */
export const colorTokens = stylex.defineVars({
  // Core palette
  primary: '#6366F1',
  primaryHover: '#4F46E5',
  secondary: '#8B5CF6',
  secondaryHover: '#7C3AED',
  accent: '#F59E0B',
  accentHover: '#D97706',

  // Surfaces
  background: '#FFFFFF',
  backgroundAlt: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F3F4F6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  textAccent: '#6366F1',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Borders
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  borderFocus: '#6366F1',
});

/**
 * Typography tokens — font control
 */
export const typographyTokens = stylex.defineVars({
  // Font families
  fontHeading: "'Inter', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontAccent: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",

  // Font sizes (major third scale: 1.25)
  sizeHero: '3.052rem',
  sizeH1: '2.441rem',
  sizeH2: '1.953rem',
  sizeH3: '1.563rem',
  sizeH4: '1.25rem',
  sizeBody: '1rem',
  sizeSmall: '0.8rem',
  sizeXs: '0.64rem',

  // Font weights
  weightLight: '300',
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  weightBlack: '900',

  // Line heights
  lineHeightTight: '1.2',
  lineHeightNormal: '1.5',
  lineHeightRelaxed: '1.75',

  // Letter spacing
  trackingTight: '-0.025em',
  trackingNormal: '0',
  trackingWide: '0.05em',
});

/**
 * Shape tokens — radius, border, shadow
 */
export const shapeTokens = stylex.defineVars({
  // Border radius
  radiusNone: '0',
  radiusSm: '0.25rem',
  radiusMd: '0.5rem',
  radiusLg: '0.75rem',
  radiusXl: '1rem',
  radius2xl: '1.5rem',
  radiusFull: '9999px',

  // Border width
  borderThin: '1px',
  borderMedium: '2px',
  borderThick: '3px',

  // Border style
  borderStyle: 'solid',

  // Shadows
  shadowNone: 'none',
  shadowSm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  shadowMd: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  shadowLg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  shadowXl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  shadowInner: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
  shadowFocus: '0 0 0 3px rgba(99,102,241,0.3)',
});

/**
 * Surface tokens — gradient, glass, noise
 */
export const surfaceTokens = stylex.defineVars({
  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
  gradientSecondary: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
  gradientSubtle: 'linear-gradient(180deg, rgba(99,102,241,0.05), transparent)',
  gradientHero: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',

  // Glass treatment
  glassBackground: 'rgba(255,255,255,0.8)',
  glassBackdrop: 'blur(12px)',

  // Surface opacity
  overlayLight: 'rgba(255,255,255,0.6)',
  overlayDark: 'rgba(0,0,0,0.4)',
});

/**
 * Motion tokens — animation tempo
 */
export const motionTokens = stylex.defineVars({
  durationFast: '150ms',
  durationNormal: '250ms',
  durationSlow: '400ms',
  durationSluggish: '700ms',

  easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  easingSharp: 'cubic-bezier(0.4, 0, 0.6, 1)',

  // Hover lift
  hoverLift: 'translateY(-2px)',
  hoverScale: 'scale(1.02)',
});

/**
 * Spacing tokens — layout rhythm (not structure)
 */
export const spacingTokens = stylex.defineVars({
  sectionGap: '5rem',
  containerMaxWidth: '1200px',
  containerPadding: '1.5rem',
  cardPadding: '1.5rem',
  inputPadding: '0.75rem 1rem',
  buttonPaddingX: '1.5rem',
  buttonPaddingY: '0.75rem',
});
