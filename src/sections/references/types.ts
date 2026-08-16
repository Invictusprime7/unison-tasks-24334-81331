/**
 * Industry Content Reference Types
 *
 * R4: the premium TSX few-shot tier was deleted — after R5 Lane B is a CONTENT
 * author, not a design author, so design examples in prompts are harmful.
 * What remains is the industry *content* vocabulary consumed by the wizard
 * Lane B prompt (tone, conversion goals, trust signals, section flow).
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

export type IndustryTag =
  | 'salon'
  | 'local-service'
  | 'coaching'
  | 'restaurant'
  | 'ecommerce'
  | 'fitness'
  | 'legal'
  | 'realestate'
  | 'photography'
  | 'universal';
