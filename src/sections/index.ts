/**
 * Sections Library — Public API
 * 
 * Usage:
 *   import { PageRenderer, getCompositionById } from '@/sections';
 *   const template = getCompositionById('salon-dark-luxury');
 *   <PageRenderer template={template} />
 * 
 * For VFS serialization:
 *   import { compositionToReactCode, getCompositionById } from '@/sections';
 *   const code = compositionToReactCode(getCompositionById('salon-dark-luxury'));
 */

// Types
export type {
  ThemeTokens,
  SectionType,
  SectionEntry,
  SectionPropsMap,
  BaseSectionProps,
  SectionRegistryEntry,
  TemplateComposition,
  NavLink,
  CTAButton,
  TestimonialItem,
  ServiceItem,
  TeamMember,
  FAQItem,
  PricingTier,
  GalleryItem,
  StatItem,
} from './types';

// Registry
export { getSection, getSectionComponent, getAllSections, getSectionsByCategory } from './registry';

// Themes
export { THEME_REGISTRY, getTheme } from './themes';

// PageRenderer
export { PageRenderer, compositionToReactCode } from './PageRenderer';

// Template compositions
export {
  ALL_COMPOSITIONS,
  getCompositionById,
  getCompositionsByIndustry,
  getCompositionsByCategory,
  getCompositionsBySystemType,
} from './templates';
