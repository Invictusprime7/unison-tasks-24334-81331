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
    toneDirective: 'Authoritative yet empathetic. Use transformation language (unlock, breakthrough, clarity, momentum, next level). Position the coach as a guide, not a guru. Speak to the client\'s aspirations and pain points. Include credentials naturally.',
    conversionGoals: ['Book discovery call', 'Download free resource', 'Join program'],
    trustSignals: ['Client results/outcomes', 'Certifications', 'Media features', 'Years of coaching', 'Number of clients served', 'Methodology framework'],
  },
];

/** Get industry context by tag */
export const getIndustryContext = (tag: IndustryTag): IndustryContextProfile | undefined =>
  INDUSTRY_CONTEXTS.find(ctx => ctx.industry === tag);
