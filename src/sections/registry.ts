/**
 * Section Registry — The lookup system for all section components
 * 
 * Templates are declarative compositions that reference sections by type.
 * The registry maps type → React component.
 */

import type { SectionType, SectionRegistryEntry, BaseSectionProps } from './types';

// Import section components
import { NavbarSection } from './components/NavbarSection';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { FeaturesSection } from './components/FeaturesSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { PricingSection } from './components/PricingSection';
import { TeamSection } from './components/TeamSection';
import { GallerySection } from './components/GallerySection';
import { FAQSection } from './components/FAQSection';
import { CTASection } from './components/CTASection';
import { ContactSection } from './components/ContactSection';
import { FooterSection } from './components/FooterSection';
import { StatsSection } from './components/StatsSection';
import { AboutSection } from './components/AboutSection';

// ============================================================================
// Registry
// ============================================================================

const SECTION_REGISTRY: Record<SectionType, SectionRegistryEntry> = {
  navbar: {
    component: NavbarSection,
    label: 'Navigation Bar',
    category: 'navigation',
    description: 'Sticky header with brand, links, and CTA',
  },
  hero: {
    component: HeroSection,
    label: 'Hero Section',
    category: 'hero',
    description: 'Above-the-fold headline with CTA buttons',
  },
  services: {
    component: ServicesSection,
    label: 'Services',
    category: 'content',
    description: 'Service cards with pricing and descriptions',
  },
  features: {
    component: FeaturesSection,
    label: 'Features',
    category: 'content',
    description: 'Feature grid with icons and descriptions',
  },
  pricing: {
    component: PricingSection,
    label: 'Pricing',
    category: 'conversion',
    description: 'Pricing tiers with feature comparison',
  },
  testimonials: {
    component: TestimonialsSection,
    label: 'Testimonials',
    category: 'social-proof',
    description: 'Customer reviews and quotes',
  },
  team: {
    component: TeamSection,
    label: 'Team',
    category: 'content',
    description: 'Team member profiles with photos',
  },
  gallery: {
    component: GallerySection,
    label: 'Gallery',
    category: 'content',
    description: 'Image gallery with optional filtering',
  },
  faq: {
    component: FAQSection,
    label: 'FAQ',
    category: 'content',
    description: 'Frequently asked questions accordion',
  },
  cta: {
    component: CTASection,
    label: 'Call to Action',
    category: 'conversion',
    description: 'Conversion-focused banner with CTA buttons',
  },
  contact: {
    component: ContactSection,
    label: 'Contact Form',
    category: 'conversion',
    description: 'Contact form with optional map and info',
  },
  footer: {
    component: FooterSection,
    label: 'Footer',
    category: 'footer',
    description: 'Site footer with links, socials, and newsletter',
  },
  stats: {
    component: StatsSection,
    label: 'Statistics',
    category: 'social-proof',
    description: 'Key metrics and numbers',
  },
  about: {
    component: AboutSection,
    label: 'About',
    category: 'content',
    description: 'About section with text and image',
  },
  'logo-cloud': {
    component: StatsSection, // Placeholder — will build dedicated component later
    label: 'Logo Cloud',
    category: 'social-proof',
  },
  'blog-preview': {
    component: AboutSection, // Placeholder
    label: 'Blog Preview',
    category: 'content',
  },
  'before-after': {
    component: GallerySection, // Placeholder
    label: 'Before & After',
    category: 'content',
  },
};

// ============================================================================
// Public API
// ============================================================================

export const getSection = (type: SectionType): SectionRegistryEntry | undefined => {
  return SECTION_REGISTRY[type];
};

export const getSectionComponent = (type: SectionType) => {
  return SECTION_REGISTRY[type]?.component;
};

export const getAllSections = (): Record<SectionType, SectionRegistryEntry> => {
  return SECTION_REGISTRY;
};

export const getSectionsByCategory = (category: SectionRegistryEntry['category']) => {
  return Object.entries(SECTION_REGISTRY)
    .filter(([_, entry]) => entry.category === category)
    .map(([type, entry]) => ({ type: type as SectionType, ...entry }));
};
