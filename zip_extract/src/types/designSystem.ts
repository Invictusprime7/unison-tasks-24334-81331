/**
 * Design System Types
 * 
 * Comprehensive type definitions for the Design Intent Compiler:
 * - Section types and variants
 * - Design tokens (colors, typography, spacing)
 * - MockupSpec schema (AI output format)
 * - Component library definitions
 */

// ============================================
// SECTION TYPES
// ============================================

export type SectionType =
  | 'navbar'
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'pricing'
  | 'team'
  | 'gallery'
  | 'cta'
  | 'faq'
  | 'contact'
  | 'footer'
  | 'stats'
  | 'logos'
  | 'video'
  | 'blog'
  | 'custom';

export type SectionVariant = {
  navbar: 'simple' | 'centered' | 'with-cta' | 'transparent' | 'sticky';
  hero: 'centered' | 'split-left' | 'split-right' | 'video-bg' | 'gradient' | 'minimal';
  features: 'grid-3' | 'grid-4' | 'list' | 'alternating' | 'cards' | 'icons';
  testimonials: 'carousel' | 'grid' | 'single' | 'with-rating' | 'quote';
  pricing: 'simple' | 'comparison' | 'toggle' | 'featured';
  team: 'grid' | 'carousel' | 'list' | 'compact';
  gallery: 'masonry' | 'grid' | 'carousel' | 'lightbox';
  cta: 'simple' | 'with-image' | 'split' | 'gradient' | 'banner';
  faq: 'accordion' | 'two-column' | 'simple';
  contact: 'simple' | 'with-map' | 'split' | 'minimal';
  footer: 'simple' | 'multi-column' | 'centered' | 'minimal';
  stats: 'inline' | 'grid' | 'with-icons';
  logos: 'simple' | 'carousel' | 'grid';
  video: 'full-width' | 'contained' | 'with-text';
  blog: 'grid' | 'list' | 'featured';
  custom: 'default';
};

export interface SectionDefinition<T extends SectionType = SectionType> {
  type: T;
  variant: T extends keyof SectionVariant ? SectionVariant[T] : string;
  id: string;
  order: number;
  visible: boolean;
  content: SectionContent;
  style: SectionStyle;
  slots: SlotDefinition[];
  responsive?: ResponsiveOverrides;
}

// ============================================
// SECTION CONTENT
// ============================================

export interface SectionContent {
  // Text content
  headline?: string;
  subheadline?: string;
  description?: string;
  body?: string;
  
  // CTA
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  
  // Lists/Items
  items?: ContentItem[];
  
  // Navigation
  navItems?: NavItem[];
  
  // Custom fields
  fields?: Record<string, string | number | boolean>;
}

export interface ContentItem {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  image?: string; // assetId reference
  link?: string;
  price?: string;
  rating?: number;
  metadata?: Record<string, unknown>;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

// ============================================
// SECTION STYLE
// ============================================

export interface SectionStyle {
  background: BackgroundStyle;
  padding: SpacingValue;
  textAlign?: 'left' | 'center' | 'right';
  maxWidth?: 'full' | 'container' | 'narrow' | 'wide';
  theme?: 'light' | 'dark' | 'auto';
}

export interface BackgroundStyle {
  type: 'solid' | 'gradient' | 'image' | 'video' | 'transparent';
  color?: string;
  gradient?: GradientDefinition;
  imageId?: string; // assetId
  overlay?: string; // overlay color with opacity
  blur?: number;
}

export interface GradientDefinition {
  type: 'linear' | 'radial';
  angle?: number;
  stops: Array<{ color: string; position: number }>;
}

export type SpacingValue = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// ============================================
// SLOT DEFINITIONS
// ============================================

export interface SlotDefinition {
  id: string;
  type: SlotType;
  assetId?: string;
  constraints: SlotConstraints;
  position: SlotPosition;
}

export type SlotType =
  | 'logo'
  | 'hero-image'
  | 'hero-background'
  | 'feature-icon'
  | 'feature-image'
  | 'avatar'
  | 'team-photo'
  | 'gallery-item'
  | 'video-thumbnail'
  | 'background'
  | 'custom';

export interface SlotConstraints {
  aspectRatio?: string;
  minWidth?: number;
  maxWidth?: number;
  objectFit?: 'contain' | 'cover' | 'fill';
  allowedTypes?: string[];
}

export type SlotPosition = 
  | 'left' | 'right' | 'center' | 'top' | 'bottom'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'background' | 'inline';

// ============================================
// RESPONSIVE OVERRIDES
// ============================================

export interface ResponsiveOverrides {
  mobile?: Partial<SectionStyle>;
  tablet?: Partial<SectionStyle>;
  desktop?: Partial<SectionStyle>;
}

// ============================================
// DESIGN TOKENS
// ============================================

export interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  transitions: TransitionTokens;
}

export interface ColorTokens {
  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  
  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Neutrals
  background: string;
  surface: string;
  border: string;
  
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  
  // Extracted from assets
  extracted?: string[];
}

export interface TypographyTokens {
  fontFamily: {
    heading: string;
    body: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  letterSpacing: {
    tight: string;
    normal: string;
    wide: string;
  };
}

export interface SpacingTokens {
  none: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ShadowTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface TransitionTokens {
  fast: string;
  normal: string;
  slow: string;
}

// ============================================
// MOCKUP SPEC (AI OUTPUT)
// ============================================

/**
 * MockupSpec - The structured schema AI must return
 * This is the "Design Intent" that the compiler transforms into a Scene
 */
export interface MockupSpec {
  // Metadata
  id: string;
  name: string;
  description?: string;
  
  // Theme
  theme: ThemeSpec;
  
  // Sections (in order)
  sections: SectionSpec[];
  
  // Asset placements
  assetPlacements: AssetPlacement[];
  
  // Global settings
  settings: PageSettings;
}

export interface ThemeSpec {
  mode: 'light' | 'dark' | 'auto';
  style: 'minimal' | 'modern' | 'bold' | 'elegant' | 'playful' | 'corporate';
  
  // Color extraction hints
  primaryColor?: string;
  accentColor?: string;
  
  // Override tokens
  tokens?: Partial<DesignTokens>;
}

export interface SectionSpec {
  type: SectionType;
  variant?: string;
  content: Partial<SectionContent>;
  style?: Partial<SectionStyle>;
  
  // AI hints
  intent?: string; // e.g., "make it bold and centered"
  emphasis?: 'low' | 'medium' | 'high';
}

export interface AssetPlacement {
  assetId: string;
  slotId: string;
  fit?: 'contain' | 'cover' | 'fill';
  position?: SlotPosition;
  effects?: AssetEffects;
}

export interface AssetEffects {
  grayscale?: boolean;
  blur?: number;
  brightness?: number;
  opacity?: number;
}

export interface PageSettings {
  title: string;
  favicon?: string;
  ogImage?: string;
  maxWidth?: 'full' | 'container' | 'narrow';
  scrollBehavior?: 'smooth' | 'auto';
}

// ============================================
// COMPONENT LIBRARY
// ============================================

export interface ComponentDefinition {
  id: string;
  name: string;
  type: SectionType;
  variant: string;
  
  // Structure
  template: string; // TSX template
  slots: SlotDefinition[];
  defaultContent: Partial<SectionContent>;
  defaultStyle: Partial<SectionStyle>;
  
  // Metadata
  thumbnail?: string;
  tags?: string[];
  category?: string;
}

export interface ComponentLibrary {
  components: ComponentDefinition[];
  getByType(type: SectionType): ComponentDefinition[];
  getByVariant(type: SectionType, variant: string): ComponentDefinition | undefined;
  getDefault(type: SectionType): ComponentDefinition | undefined;
}

// ============================================
// INLINE EDITING
// ============================================

export interface EditableField {
  id: string;
  path: string; // e.g., "sections[0].content.headline"
  type: 'text' | 'richtext' | 'image' | 'link' | 'color' | 'select';
  label: string;
  value: unknown;
  constraints?: {
    maxLength?: number;
    options?: string[];
    required?: boolean;
  };
}

export interface EditOperation {
  type: 'update' | 'add' | 'remove' | 'move' | 'style';
  target: string; // path to target
  value?: unknown;
  source?: string; // for AI attribution
  timestamp: number;
}

// ============================================
// COMPILER OUTPUT
// ============================================

export interface CompilerResult {
  success: boolean;
  scene?: import('./scene').RootNode;
  errors: CompilerError[];
  warnings: CompilerWarning[];
  stats: {
    sectionsCreated: number;
    slotsCreated: number;
    tokensApplied: number;
    compilationTime: number;
  };
}

export interface CompilerError {
  code: string;
  message: string;
  section?: string;
  recoverable: boolean;
}

export interface CompilerWarning {
  code: string;
  message: string;
  suggestion?: string;
}
