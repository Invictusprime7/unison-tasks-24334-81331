/**
 * Industry Context Annotations
 * 
 * Maps each priority industry to recommended section combinations,
 * content tone guidance, and which premium references to use.
 */

import type { IndustryTag, ReferenceSectionType } from './types';

export interface IndustryContextProfile {
  industry: IndustryTag;
  label: string;
  /** Recommended section order for this industry */
  sectionFlow: ReferenceSectionType[];
  /** Preferred premium reference IDs per section type */
  preferredReferences: Partial<Record<ReferenceSectionType, string[]>>;
  /** Content tone/voice guidance for AI generation */
  toneDirective: string;
  /** Key conversion goals */
  conversionGoals: string[];
  /** Trust signals to emphasize */
  trustSignals: string[];
}

export const INDUSTRY_CONTEXTS: IndustryContextProfile[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // SALON / BEAUTY
  // ─────────────────────────────────────────────────────────────────────────
  {
    industry: 'salon',
    label: 'Salon & Beauty',
    sectionFlow: ['navbar', 'hero', 'services', 'about', 'gallery', 'testimonials', 'stats', 'cta', 'contact', 'footer'],
    preferredReferences: {
      navbar: ['navbar-frosted'],
      hero: ['hero-cinematic', 'hero-immersive-stack'],
      services: ['services-elevated-cards'],
      testimonials: ['testimonials-glass-carousel'],
      cta: ['cta-gradient-glow'],
      contact: ['contact-split-elegant'],
      about: ['about-story-split'],
      footer: ['footer-rich-columns'],
    },
    toneDirective: 'Luxurious yet approachable. Use sensory language (transform, glow, radiance, refresh). Emphasize the experience and self-care journey, not just the service. Avoid clinical or overly casual tone.',
    conversionGoals: ['Book appointment', 'View service menu', 'Call now'],
    trustSignals: ['Years of experience', 'Client transformations', 'Licensed professionals', 'Star ratings', 'Before/after gallery'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LOCAL SERVICE (PLUMBING, HVAC, ELECTRICAL)
  // ─────────────────────────────────────────────────────────────────────────
  {
    industry: 'local-service',
    label: 'Local Service (Plumbing, HVAC, Electrical)',
    sectionFlow: ['navbar', 'hero', 'services', 'stats', 'about', 'testimonials', 'faq', 'cta', 'contact', 'footer'],
    preferredReferences: {
      navbar: ['navbar-dark-elevated'],
      hero: ['hero-authority-split'],
      services: ['services-alternating-showcase'],
      testimonials: ['testimonials-highlight-wall'],
      cta: ['cta-split-trust'],
      contact: ['contact-split-elegant'],
      about: ['about-story-split'],
      faq: ['faq-elegant-accordion'],
      footer: ['footer-rich-columns'],
    },
    toneDirective: 'Professional, dependable, and urgent. Use trust language (guaranteed, licensed, insured, same-day, family-owned). Lead with reliability and speed. Include service area references. Avoid jargon customers won\'t understand.',
    conversionGoals: ['Call for emergency service', 'Request free estimate', 'Schedule service'],
    trustSignals: ['Licensed & insured', 'Service area coverage', 'Response time guarantee', 'BBB rating', 'Years serving community', 'Number of jobs completed'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COACHING / CONSULTING
  // ─────────────────────────────────────────────────────────────────────────
  {
    industry: 'coaching',
    label: 'Coaching & Consulting',
    sectionFlow: ['navbar', 'hero', 'features', 'about', 'stats', 'testimonials', 'pricing', 'faq', 'cta', 'contact', 'footer'],
    preferredReferences: {
      navbar: ['navbar-frosted'],
      hero: ['hero-authority-split', 'hero-cinematic'],
      features: ['services-bento-grid'],
      services: ['services-elevated-cards'],
      testimonials: ['testimonials-highlight-wall', 'testimonials-glass-carousel'],
      cta: ['cta-gradient-glow', 'cta-split-trust'],
      contact: ['contact-split-elegant'],
      about: ['about-story-split'],
      faq: ['faq-elegant-accordion'],
      footer: ['footer-rich-columns'],
    },
    toneDirective: 'Authoritative yet empathetic. Use transformation language (unlock, breakthrough, clarity, momentum, next level). Position the coach as a guide, not a guru. Speak to the client\'s aspirations and pain points. Include credentials naturally.',
    conversionGoals: ['Book discovery call', 'Download free resource', 'Join program'],
    trustSignals: ['Client results/outcomes', 'Certifications', 'Media features', 'Years of coaching', 'Number of clients served', 'Methodology framework'],
  },
];

/** Get industry context by tag */
export const getIndustryContext = (tag: IndustryTag): IndustryContextProfile | undefined =>
  INDUSTRY_CONTEXTS.find(ctx => ctx.industry === tag);

/** Get all recommended reference IDs for an industry */
export const getIndustryReferenceIds = (tag: IndustryTag): string[] => {
  const ctx = getIndustryContext(tag);
  if (!ctx) return [];
  return Object.values(ctx.preferredReferences).flat();
};
