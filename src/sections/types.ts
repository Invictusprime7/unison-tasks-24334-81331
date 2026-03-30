/**
 * Section Registry — Type Definitions
 * 
 * Every section component conforms to a typed schema.
 * Templates become declarative compositions of sections.
 */

import type { ComponentType } from 'react';

// ============================================================================
// Theme Contract
// ============================================================================

/** Design tokens passed to every section */
export interface ThemeTokens {
  // Colors (CSS custom property values, HSL format)
  colors: {
    primary: string;       // e.g. "330 80% 60%"
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    card: string;
    cardForeground: string;
    border: string;
  };
  // Typography
  typography: {
    headingFont: string;   // e.g. "'Cormorant Garamond', serif"
    bodyFont: string;      // e.g. "'Inter', sans-serif"
    headingWeight: string; // e.g. "700"
    bodyWeight: string;
  };
  // Shape
  radius: string;          // e.g. "0.75rem"
  // Density
  sectionPadding: string;  // e.g. "5rem 1rem"
  containerWidth: string;  // e.g. "1200px"
}

// ============================================================================
// Section Schema
// ============================================================================

/** Section type identifiers */
export type SectionType =
  | 'navbar'
  | 'hero'
  | 'services'
  | 'features'
  | 'pricing'
  | 'testimonials'
  | 'team'
  | 'gallery'
  | 'faq'
  | 'cta'
  | 'contact'
  | 'footer'
  | 'stats'
  | 'about'
  | 'logo-cloud'
  | 'blog-preview'
  | 'before-after';

/** A single section in a template composition */
export interface SectionEntry<T extends SectionType = SectionType> {
  id: string;
  type: T;
  props: SectionPropsMap[T];
  /** Optional CSS module or scoped styles for this section */
  className?: string;
  /** Whether this section is hidden */
  hidden?: boolean;
}

/** Navigation link */
export interface NavLink {
  label: string;
  href: string;
  /** Intent to fire on click (replaces href navigation) */
  intent?: string;
}

/** CTA button */
export interface CTAButton {
  label: string;
  href?: string;
  intent?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

/** Testimonial item */
export interface TestimonialItem {
  quote: string;
  author: string;
  role?: string;
  avatar?: string;
  rating?: number;
}

/** Service/feature item */
export interface ServiceItem {
  title: string;
  description: string;
  price?: string;
  duration?: string;
  icon?: string;
  image?: string;
  badge?: string;
  cta?: CTAButton;
}

/** Team member */
export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  image?: string;
  socials?: { platform: string; url: string }[];
}

/** FAQ item */
export interface FAQItem {
  question: string;
  answer: string;
}

/** Pricing tier */
export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  cta: CTAButton;
  highlighted?: boolean;
  badge?: string;
}

/** Gallery item */
export interface GalleryItem {
  src: string;
  alt: string;
  caption?: string;
  category?: string;
}

/** Stat item */
export interface StatItem {
  value: string;
  label: string;
  icon?: string;
}

// ============================================================================
// Props map — each section type's specific props
// ============================================================================

export interface SectionPropsMap {
  navbar: {
    brand: string;
    logo?: string;
    links: NavLink[];
    cta?: CTAButton;
    sticky?: boolean;
    transparent?: boolean;
  };
  hero: {
    headline: string;
    subheadline?: string;
    description?: string;
    ctas?: CTAButton[];
    image?: string;
    backgroundImage?: string;
    layout?: 'centered' | 'split' | 'full-bleed';
    badge?: string;
    stats?: StatItem[];
  };
  services: {
    headline?: string;
    subheadline?: string;
    items: ServiceItem[];
    columns?: 2 | 3 | 4;
    layout?: 'grid' | 'list' | 'alternating';
  };
  features: {
    headline?: string;
    subheadline?: string;
    items: ServiceItem[];
    columns?: 2 | 3 | 4;
    layout?: 'grid' | 'icon-left' | 'centered';
  };
  pricing: {
    headline?: string;
    subheadline?: string;
    tiers: PricingTier[];
    showToggle?: boolean;
  };
  testimonials: {
    headline?: string;
    subheadline?: string;
    items: TestimonialItem[];
    layout?: 'grid' | 'carousel' | 'single';
  };
  team: {
    headline?: string;
    subheadline?: string;
    members: TeamMember[];
    columns?: 2 | 3 | 4;
  };
  gallery: {
    headline?: string;
    subheadline?: string;
    items: GalleryItem[];
    columns?: 2 | 3 | 4;
    filterable?: boolean;
  };
  faq: {
    headline?: string;
    subheadline?: string;
    items: FAQItem[];
    layout?: 'accordion' | 'grid' | 'two-column';
  };
  cta: {
    headline: string;
    description?: string;
    ctas: CTAButton[];
    layout?: 'centered' | 'split' | 'banner';
    backgroundImage?: string;
  };
  contact: {
    headline?: string;
    description?: string;
    fields?: { name: string; type: string; placeholder?: string; required?: boolean }[];
    submitLabel?: string;
    submitIntent?: string;
    showMap?: boolean;
    address?: string;
    phone?: string;
    email?: string;
  };
  footer: {
    brand: string;
    logo?: string;
    columns?: { title: string; links: NavLink[] }[];
    socials?: { platform: string; url: string; icon?: string }[];
    copyright?: string;
    newsletter?: boolean;
  };
  stats: {
    headline?: string;
    items: StatItem[];
    layout?: 'row' | 'grid';
  };
  about: {
    headline?: string;
    description: string;
    image?: string;
    cta?: CTAButton;
    layout?: 'text-left' | 'text-right' | 'centered';
  };
  'logo-cloud': {
    headline?: string;
    logos: { name: string; src?: string }[];
  };
  'blog-preview': {
    headline?: string;
    posts: { title: string; excerpt: string; image?: string; date?: string; author?: string; href?: string }[];
  };
  'before-after': {
    headline?: string;
    subheadline?: string;
    items: { before: string; after: string; label?: string }[];
  };
}

// ============================================================================
// Registry Types
// ============================================================================

/** Props passed to every section component */
export interface BaseSectionProps<T extends SectionType = SectionType> {
  section: SectionEntry<T>;
  theme: ThemeTokens;
}

/** A registered section component */
export interface SectionRegistryEntry {
  component: ComponentType<BaseSectionProps<any>>;
  label: string;
  category: 'navigation' | 'hero' | 'content' | 'social-proof' | 'conversion' | 'footer';
  description?: string;
}

// ============================================================================
// Template Composition
// ============================================================================

/** A complete template definition — just data, no JSX */
export interface TemplateComposition {
  id: string;
  name: string;
  category: string;
  industry: string;
  description: string;
  theme: ThemeTokens;
  sections: SectionEntry[];
  /** Optional global CSS for advanced effects (keyframes, scroll-reveal) */
  globalStyles?: string;
  tags?: string[];
  systemType?: string;
}
