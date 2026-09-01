/**
 * Premium Section Reference Types
 * 
 * These types define the structure for premium TSX section templates
 * used as few-shot examples by the Launcher generation pipeline.
 */

export type ReferenceSectionType =
  | 'navbar'
  | 'hero'
  | 'services'
  | 'features'
  | 'testimonials'
  | 'pricing'
  | 'cta'
  | 'contact'
  | 'footer'
  | 'stats'
  | 'about'
  | 'faq'
  | 'gallery'
  | 'team';

export type IndustryTag = 'salon' | 'local-service' | 'coaching' | 'restaurant' | 'ecommerce' | 'fitness' | 'legal' | 'realestate' | 'photography' | 'universal';

export type QualityTrait =
  | 'glassmorphism'
  | 'gradient'
  | 'animation'
  | 'micro-interaction'
  | 'layered-depth'
  | 'semantic-html'
  | 'responsive-grid'
  | 'scroll-reveal'
  | 'hover-effects'
  | 'backdrop-blur'
  | 'texture'
  | 'asymmetric-layout';

export interface PremiumSectionReference {
  /** Unique identifier */
  id: string;
  /** Section type */
  sectionType: ReferenceSectionType;
  /** Human label */
  label: string;
  /** Visual/structural traits this template demonstrates */
  traits: QualityTrait[];
  /** Industries this template works best for */
  industries: IndustryTag[];
  /** The TSX source string — uses CSS custom properties, no hardcoded colors */
  tsx: string;
  /** Companion CSS (keyframes, custom animations) */
  css?: string;
  /** Brief description for AI context */
  description: string;
}

/** All CSS custom properties the premium templates rely on */
export const THEME_CSS_VARS = [
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--accent',
  '--accent-foreground',
  '--background',
  '--foreground',
  '--muted',
  '--muted-foreground',
  '--card',
  '--card-foreground',
  '--border',
  '--radius',
  '--font-heading',
  '--font-body',
] as const;
