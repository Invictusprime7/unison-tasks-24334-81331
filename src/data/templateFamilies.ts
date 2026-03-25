/**
 * Template Family Registry
 *
 * 4 structural template families, each with 3 visual variants.
 * Families define layout structure only — NOT colors, fonts, or theme presentation.
 *
 * Families:
 *   luxe      — premium, spacious, image-forward
 *   clean     — minimal, grid-based, content-first
 *   editorial — asymmetric, type-heavy, magazine-like
 *   bold      — dense, high-impact, conversion-focused
 */
import type {
  TemplateFamily,
  TemplateVariant,
  TemplateFamilyId,
  TemplateVariantId,
  TemplateStructure,
  SectionSlot,
} from '@/types/launchConfig';

// ============================================================================
// FAMILY DEFINITIONS
// ============================================================================

export const templateFamilies: TemplateFamily[] = [
  {
    id: 'luxe',
    name: 'Luxe',
    description: 'Premium, spacious layouts with image-forward sections. Generous whitespace and elegant composition.',
    bestFor: ['salon', 'restaurant', 'portfolio', 'clothing'],
    pageDepth: 'medium',
    conversionFocus: 'medium',
    includedFlows: ['booking', 'gallery', 'testimonials', 'contact'],
  },
  {
    id: 'clean',
    name: 'Clean',
    description: 'Minimal, grid-based layouts focused on content clarity. Strong hierarchy and balanced spacing.',
    bestFor: ['saas', 'consulting', 'developer', 'devtool'],
    pageDepth: 'medium',
    conversionFocus: 'high',
    includedFlows: ['pricing', 'features', 'testimonials', 'newsletter', 'FAQ'],
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Asymmetric, type-heavy layouts with magazine-like energy. Story-driven with large type contrast.',
    bestFor: ['blog', 'photographer', 'designer', 'nonprofit'],
    pageDepth: 'advanced',
    conversionFocus: 'low',
    includedFlows: ['gallery', 'about', 'newsletter', 'contact'],
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Dense, high-impact layouts built for conversion. Larger CTAs, stronger visual urgency.',
    bestFor: ['contractor', 'roofing', 'hvac', 'legal', 'realestate'],
    pageDepth: 'simple',
    conversionFocus: 'high',
    includedFlows: ['quote-request', 'services', 'testimonials', 'FAQ', 'map'],
  },
];

// ============================================================================
// VARIANT DEFINITIONS
// ============================================================================

export const templateVariants: TemplateVariant[] = [
  { id: 'A', name: 'Variant A', description: 'Primary layout — balanced and versatile.' },
  { id: 'B', name: 'Variant B', description: 'Alternate layout — different section emphasis.' },
  { id: 'C', name: 'Variant C', description: 'Compact layout — streamlined for speed.' },
];

// ============================================================================
// STRUCTURE DEFINITIONS — Section Order Per Family × Variant
// ============================================================================

function makeSections(types: string[]): SectionSlot[] {
  return types.map((type, i) => ({
    id: `${type}-${i}`,
    type,
    required: i < 3,
    order: i,
  }));
}

const STRUCTURES: Record<TemplateFamilyId, Record<TemplateVariantId, Omit<TemplateStructure, 'familyId' | 'variantId'>>> = {
  luxe: {
    A: {
      sections: makeSections(['nav', 'hero', 'features', 'gallery', 'testimonials', 'cta', 'footer']),
      heroStyle: 'fullbleed',
      density: 'sparse',
      navLayout: 'sticky-top',
      footerLayout: 'full',
      columnsDesktop: 2,
      maxWidth: 1200,
    },
    B: {
      sections: makeSections(['nav', 'hero', 'about', 'services', 'gallery', 'testimonials', 'contact', 'footer']),
      heroStyle: 'split',
      density: 'balanced',
      navLayout: 'sticky-top',
      footerLayout: 'full',
      columnsDesktop: 2,
      maxWidth: 1140,
    },
    C: {
      sections: makeSections(['nav', 'hero', 'services', 'cta', 'testimonials', 'footer']),
      heroStyle: 'centered',
      density: 'sparse',
      navLayout: 'minimal',
      footerLayout: 'minimal',
      columnsDesktop: 1,
      maxWidth: 960,
    },
  },
  clean: {
    A: {
      sections: makeSections(['nav', 'hero', 'features', 'pricing', 'testimonials', 'faq', 'cta', 'footer']),
      heroStyle: 'centered',
      density: 'balanced',
      navLayout: 'sticky-top',
      footerLayout: 'full',
      columnsDesktop: 3,
      maxWidth: 1200,
    },
    B: {
      sections: makeSections(['nav', 'hero', 'features', 'how-it-works', 'pricing', 'testimonials', 'newsletter', 'footer']),
      heroStyle: 'split',
      density: 'balanced',
      navLayout: 'sticky-top',
      footerLayout: 'centered',
      columnsDesktop: 2,
      maxWidth: 1120,
    },
    C: {
      sections: makeSections(['nav', 'hero', 'features', 'cta', 'footer']),
      heroStyle: 'minimal',
      density: 'sparse',
      navLayout: 'sticky-top',
      footerLayout: 'minimal',
      columnsDesktop: 2,
      maxWidth: 960,
    },
  },
  editorial: {
    A: {
      sections: makeSections(['nav', 'hero', 'featured-content', 'about', 'gallery', 'newsletter', 'contact', 'footer']),
      heroStyle: 'fullbleed',
      density: 'sparse',
      navLayout: 'minimal',
      footerLayout: 'centered',
      columnsDesktop: 2,
      maxWidth: 1100,
    },
    B: {
      sections: makeSections(['nav', 'hero', 'case-studies', 'about', 'testimonials', 'newsletter', 'footer']),
      heroStyle: 'split',
      density: 'balanced',
      navLayout: 'minimal',
      footerLayout: 'minimal',
      columnsDesktop: 2,
      maxWidth: 1060,
    },
    C: {
      sections: makeSections(['nav', 'hero', 'timeline', 'gallery', 'contact', 'footer']),
      heroStyle: 'centered',
      density: 'sparse',
      navLayout: 'hamburger',
      footerLayout: 'minimal',
      columnsDesktop: 1,
      maxWidth: 900,
    },
  },
  bold: {
    A: {
      sections: makeSections(['nav', 'hero', 'services', 'stats', 'testimonials', 'quote-form', 'faq', 'footer']),
      heroStyle: 'fullbleed',
      density: 'dense',
      navLayout: 'sticky-top',
      footerLayout: 'full',
      columnsDesktop: 3,
      maxWidth: 1280,
    },
    B: {
      sections: makeSections(['nav', 'hero', 'services', 'before-after', 'testimonials', 'map', 'cta', 'footer']),
      heroStyle: 'split',
      density: 'dense',
      navLayout: 'sticky-top',
      footerLayout: 'full',
      columnsDesktop: 2,
      maxWidth: 1200,
    },
    C: {
      sections: makeSections(['nav', 'hero', 'services', 'cta', 'testimonials', 'footer']),
      heroStyle: 'centered',
      density: 'balanced',
      navLayout: 'sticky-top',
      footerLayout: 'centered',
      columnsDesktop: 2,
      maxWidth: 1120,
    },
  },
};

// ============================================================================
// ACCESSORS
// ============================================================================

export function getFamilyById(id: TemplateFamilyId): TemplateFamily | undefined {
  return templateFamilies.find(f => f.id === id);
}

export function getStructure(familyId: TemplateFamilyId, variantId: TemplateVariantId): TemplateStructure {
  const structure = STRUCTURES[familyId]?.[variantId];
  if (!structure) {
    throw new Error(`No structure defined for family=${familyId}, variant=${variantId}`);
  }
  return { familyId, variantId, ...structure };
}

export function getAllStructuresForFamily(familyId: TemplateFamilyId): TemplateStructure[] {
  return (['A', 'B', 'C'] as TemplateVariantId[]).map(v => getStructure(familyId, v));
}
