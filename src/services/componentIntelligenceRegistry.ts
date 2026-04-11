/**
 * Component Intelligence Registry — Concrete metadata for all section types.
 * 
 * Provides prop schemas, composition rules, industry suitability,
 * interaction affordances, and generation hints for every section component.
 */

import type {
  ComponentIntelligence,
  ComponentIntelligenceRegistry,
  CompositionRule,
  InteractionAffordance,
  IndustrySuitability,
  PropSchema,
} from '@/types/componentIntelligence';
import type { SectionType } from '@/sections/types';

// ============================================================================
// Universal Industries List
// ============================================================================

const ALL_INDUSTRIES = [
  'salon', 'restaurant', 'contractor', 'coaching', 'ecommerce',
  'fitness', 'legal', 'real_estate', 'photography', 'healthcare',
  'saas', 'nonprofit', 'agency', 'general',
];

// ============================================================================
// Helper: Create industry suitability with overrides
// ============================================================================

function industrySuits(
  overrides: Record<string, number> = {},
  defaultScore = 0.7,
): IndustrySuitability[] {
  return ALL_INDUSTRIES.map(industry => ({
    industry,
    score: overrides[industry] ?? defaultScore,
  }));
}

// ============================================================================
// Section Intelligence Definitions
// ============================================================================

const NAVBAR_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'navbar',
  label: 'Navigation Bar',
  category: 'navigation',
  description: 'Sticky header with brand, links, and CTA',
  propSchema: [
    { name: 'brand', label: 'Brand Name', type: 'string', required: true, description: 'Business name displayed in nav' },
    { name: 'logo', label: 'Logo URL', type: 'image_url', required: false },
    { name: 'links', label: 'Nav Links', type: 'array', required: true, arrayItemSchema: [
      { name: 'label', label: 'Label', type: 'string', required: true },
      { name: 'href', label: 'URL', type: 'string', required: true },
    ]},
    { name: 'cta', label: 'CTA Button', type: 'object', required: false },
    { name: 'sticky', label: 'Sticky', type: 'boolean', required: false, defaultValue: true },
    { name: 'transparent', label: 'Transparent BG', type: 'boolean', required: false, defaultValue: false },
  ],
  compositionRules: {
    preferredBefore: [],
    preferredAfter: ['hero'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: true,
    canBeLast: false,
  },
  responsiveBehaviors: ['collapse_menu', 'sticky_header'],
  interactions: {
    emitsIntents: ['nav.goto_page'],
    consumesIntents: [],
    hasForm: false,
    hasNavigation: true,
    interactiveElementCount: 'many',
  },
  industrySuitability: industrySuits({}, 0.95),
  npmDependencies: [],
  cssFeatures: ['sticky', 'backdrop-blur', 'flexbox'],
  generationHints: {
    alwaysCustomize: ['brand', 'links', 'cta'],
    neverChange: ['sticky'],
    maxContentItems: 7,
  },
};

const HERO_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'hero',
  label: 'Hero Section',
  category: 'hero',
  description: 'Above-the-fold headline with CTA buttons',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: true, constraints: { maxLength: 80 } },
    { name: 'subheadline', label: 'Subheadline', type: 'string', required: false, constraints: { maxLength: 160 } },
    { name: 'description', label: 'Description', type: 'string', required: false },
    { name: 'ctas', label: 'CTA Buttons', type: 'array', required: false },
    { name: 'image', label: 'Hero Image', type: 'image_url', required: false },
    { name: 'backgroundImage', label: 'Background Image', type: 'image_url', required: false },
    { name: 'layout', label: 'Layout', type: 'enum', required: false, enumValues: ['centered', 'split', 'full-bleed'] },
  ],
  compositionRules: {
    preferredBefore: ['navbar'],
    preferredAfter: ['services', 'features', 'stats', 'about'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: true,
    canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical', 'scale_text', 'full_bleed'],
  interactions: {
    emitsIntents: ['nav.goto_page', 'calendar.open', 'form.open'],
    consumesIntents: [],
    hasForm: false,
    hasNavigation: true,
    interactiveElementCount: 'few',
  },
  industrySuitability: industrySuits({}, 0.95),
  npmDependencies: [],
  cssFeatures: ['gradient', 'animation', 'flexbox'],
  generationHints: {
    alwaysCustomize: ['headline', 'subheadline', 'ctas', 'image'],
    neverChange: [],
    recommendedImageAspect: '16:9',
  },
};

const SERVICES_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'services',
  label: 'Services',
  category: 'content',
  description: 'Service cards with pricing and descriptions',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'subheadline', label: 'Subheadline', type: 'string', required: false },
    { name: 'items', label: 'Service Items', type: 'array', required: true },
    { name: 'columns', label: 'Columns', type: 'enum', required: false, enumValues: ['2', '3', '4'] },
    { name: 'layout', label: 'Layout', type: 'enum', required: false, enumValues: ['grid', 'list', 'alternating'] },
  ],
  compositionRules: {
    preferredBefore: ['hero', 'about'],
    preferredAfter: ['pricing', 'testimonials', 'cta'],
    incompatibleWith: [],
    maxPerPage: 2,
    canBeFirst: false,
    canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical', 'carousel_mobile'],
  interactions: {
    emitsIntents: ['nav.goto_page', 'calendar.open'],
    consumesIntents: [],
    hasForm: false,
    hasNavigation: true,
    interactiveElementCount: 'many',
  },
  industrySuitability: industrySuits({
    salon: 0.95, contractor: 0.95, coaching: 0.9, restaurant: 0.85, fitness: 0.95,
    healthcare: 0.95, legal: 0.9, photography: 0.8, ecommerce: 0.6,
  }),
  npmDependencies: [],
  cssFeatures: ['grid', 'animation'],
  generationHints: {
    alwaysCustomize: ['headline', 'items'],
    neverChange: [],
    maxContentItems: 8,
  },
};

const FEATURES_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'features',
  label: 'Features',
  category: 'content',
  description: 'Feature grid with icons and descriptions',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'items', label: 'Feature Items', type: 'array', required: true },
    { name: 'columns', label: 'Columns', type: 'enum', required: false, enumValues: ['2', '3', '4'] },
    { name: 'layout', label: 'Layout', type: 'enum', required: false, enumValues: ['grid', 'icon-left', 'centered'] },
  ],
  compositionRules: {
    preferredBefore: ['hero', 'services'],
    preferredAfter: ['testimonials', 'cta', 'pricing'],
    incompatibleWith: [],
    maxPerPage: 2,
    canBeFirst: false,
    canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical'],
  interactions: { emitsIntents: [], consumesIntents: [], hasForm: false, hasNavigation: false, interactiveElementCount: 'none' },
  industrySuitability: industrySuits({ saas: 0.95, agency: 0.9, coaching: 0.85 }),
  npmDependencies: [],
  cssFeatures: ['grid', 'animation'],
  generationHints: { alwaysCustomize: ['headline', 'items'], neverChange: [], maxContentItems: 6 },
};

const PRICING_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'pricing',
  label: 'Pricing',
  category: 'conversion',
  description: 'Pricing tiers with feature comparison',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'tiers', label: 'Pricing Tiers', type: 'array', required: true },
    { name: 'showToggle', label: 'Monthly/Annual Toggle', type: 'boolean', required: false },
  ],
  compositionRules: {
    preferredBefore: ['services', 'features'],
    preferredAfter: ['testimonials', 'faq', 'cta'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: false,
    canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical', 'carousel_mobile'],
  interactions: {
    emitsIntents: ['nav.goto_page', 'checkout.start', 'calendar.open'],
    consumesIntents: [],
    hasForm: false,
    hasNavigation: true,
    interactiveElementCount: 'many',
  },
  industrySuitability: industrySuits({
    saas: 0.95, coaching: 0.9, fitness: 0.9, salon: 0.85, contractor: 0.7, restaurant: 0.5,
  }),
  npmDependencies: [],
  cssFeatures: ['grid', 'gradient', 'animation'],
  generationHints: { alwaysCustomize: ['headline', 'tiers'], neverChange: [], maxContentItems: 4 },
};

const TESTIMONIALS_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'testimonials',
  label: 'Testimonials',
  category: 'social-proof',
  description: 'Customer reviews and quotes',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'items', label: 'Testimonials', type: 'array', required: true },
    { name: 'layout', label: 'Layout', type: 'enum', required: false, enumValues: ['grid', 'carousel', 'single'] },
  ],
  compositionRules: {
    preferredBefore: ['services', 'pricing', 'features'],
    preferredAfter: ['cta', 'contact'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: false,
    canBeLast: false,
  },
  responsiveBehaviors: ['carousel_mobile', 'stack_vertical'],
  interactions: { emitsIntents: [], consumesIntents: [], hasForm: false, hasNavigation: false, interactiveElementCount: 'none' },
  industrySuitability: industrySuits({}, 0.85),
  npmDependencies: [],
  cssFeatures: ['grid', 'animation'],
  generationHints: { alwaysCustomize: ['headline', 'items'], neverChange: [], maxContentItems: 6 },
};

const CTA_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'cta',
  label: 'Call to Action',
  category: 'conversion',
  description: 'Conversion-focused banner with CTA buttons',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: true },
    { name: 'description', label: 'Description', type: 'string', required: false },
    { name: 'ctas', label: 'CTA Buttons', type: 'array', required: true },
    { name: 'layout', label: 'Layout', type: 'enum', required: false, enumValues: ['centered', 'split', 'banner'] },
  ],
  compositionRules: {
    preferredBefore: ['testimonials', 'pricing', 'services'],
    preferredAfter: ['footer'],
    incompatibleWith: [],
    maxPerPage: 2,
    canBeFirst: false,
    canBeLast: true,
  },
  responsiveBehaviors: ['stack_vertical', 'scale_text'],
  interactions: {
    emitsIntents: ['nav.goto_page', 'calendar.open', 'form.open', 'checkout.start'],
    consumesIntents: [],
    hasForm: false,
    hasNavigation: true,
    interactiveElementCount: 'few',
  },
  industrySuitability: industrySuits({}, 0.9),
  npmDependencies: [],
  cssFeatures: ['gradient', 'animation'],
  generationHints: { alwaysCustomize: ['headline', 'description', 'ctas'], neverChange: [] },
};

const CONTACT_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'contact',
  label: 'Contact Form',
  category: 'conversion',
  description: 'Contact form with optional map and info',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'fields', label: 'Form Fields', type: 'array', required: false },
    { name: 'submitLabel', label: 'Submit Label', type: 'string', required: false, defaultValue: 'Send Message' },
    { name: 'submitIntent', label: 'Submit Intent', type: 'intent_ref', required: false },
    { name: 'showMap', label: 'Show Map', type: 'boolean', required: false },
    { name: 'address', label: 'Address', type: 'string', required: false },
    { name: 'phone', label: 'Phone', type: 'string', required: false },
    { name: 'email', label: 'Email', type: 'string', required: false },
  ],
  compositionRules: {
    preferredBefore: ['cta', 'testimonials'],
    preferredAfter: ['footer'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: false,
    canBeLast: true,
  },
  responsiveBehaviors: ['stack_vertical'],
  interactions: {
    emitsIntents: ['form.open', 'contact.submit'],
    consumesIntents: [],
    hasForm: true,
    hasNavigation: false,
    interactiveElementCount: 'many',
  },
  industrySuitability: industrySuits({}, 0.9),
  npmDependencies: [],
  cssFeatures: ['grid', 'flexbox'],
  generationHints: { alwaysCustomize: ['headline', 'address', 'phone', 'email'], neverChange: ['fields'] },
};

const FOOTER_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'footer',
  label: 'Footer',
  category: 'footer',
  description: 'Site footer with links, socials, and newsletter',
  propSchema: [
    { name: 'brand', label: 'Brand Name', type: 'string', required: true },
    { name: 'columns', label: 'Link Columns', type: 'array', required: false },
    { name: 'socials', label: 'Social Links', type: 'array', required: false },
    { name: 'copyright', label: 'Copyright', type: 'string', required: false },
    { name: 'newsletter', label: 'Newsletter Signup', type: 'boolean', required: false },
  ],
  compositionRules: {
    preferredBefore: ['cta', 'contact'],
    preferredAfter: [],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: false,
    canBeLast: true,
  },
  responsiveBehaviors: ['stack_vertical'],
  interactions: {
    emitsIntents: ['nav.goto_page', 'external.open'],
    consumesIntents: [],
    hasForm: false,
    hasNavigation: true,
    interactiveElementCount: 'many',
  },
  industrySuitability: industrySuits({}, 0.95),
  npmDependencies: [],
  cssFeatures: ['grid', 'flexbox'],
  generationHints: { alwaysCustomize: ['brand', 'columns', 'socials', 'copyright'], neverChange: [] },
};

const GALLERY_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'gallery',
  label: 'Gallery',
  category: 'content',
  description: 'Image gallery with optional filtering',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'items', label: 'Gallery Items', type: 'array', required: true },
    { name: 'columns', label: 'Columns', type: 'enum', required: false, enumValues: ['2', '3', '4'] },
    { name: 'filterable', label: 'Filterable', type: 'boolean', required: false },
  ],
  compositionRules: {
    preferredBefore: ['hero', 'services'],
    preferredAfter: ['cta', 'contact', 'testimonials'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: false,
    canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical', 'carousel_mobile'],
  interactions: { emitsIntents: [], consumesIntents: [], hasForm: false, hasNavigation: false, interactiveElementCount: 'few' },
  industrySuitability: industrySuits({
    photography: 0.99, salon: 0.95, restaurant: 0.9, contractor: 0.9,
    real_estate: 0.95, fitness: 0.8, ecommerce: 0.7,
  }),
  npmDependencies: [],
  cssFeatures: ['grid', 'animation'],
  generationHints: { alwaysCustomize: ['headline', 'items'], neverChange: [], maxContentItems: 12, recommendedImageAspect: '1:1' },
};

const FAQ_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'faq',
  label: 'FAQ',
  category: 'content',
  description: 'Frequently asked questions accordion',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'items', label: 'FAQ Items', type: 'array', required: true },
    { name: 'layout', label: 'Layout', type: 'enum', required: false, enumValues: ['accordion', 'grid', 'two-column'] },
  ],
  compositionRules: {
    preferredBefore: ['pricing', 'services'],
    preferredAfter: ['cta', 'contact'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: false,
    canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical'],
  interactions: { emitsIntents: [], consumesIntents: [], hasForm: false, hasNavigation: false, interactiveElementCount: 'many' },
  industrySuitability: industrySuits({}, 0.8),
  npmDependencies: [],
  cssFeatures: ['animation'],
  generationHints: { alwaysCustomize: ['headline', 'items'], neverChange: [], maxContentItems: 10 },
};

const STATS_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'stats',
  label: 'Statistics',
  category: 'social-proof',
  description: 'Key metrics and numbers',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'items', label: 'Stat Items', type: 'array', required: true },
    { name: 'layout', label: 'Layout', type: 'enum', required: false, enumValues: ['row', 'grid'] },
  ],
  compositionRules: {
    preferredBefore: ['hero'],
    preferredAfter: ['services', 'cta'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: false,
    canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical'],
  interactions: { emitsIntents: [], consumesIntents: [], hasForm: false, hasNavigation: false, interactiveElementCount: 'none' },
  industrySuitability: industrySuits({ saas: 0.9, agency: 0.85, coaching: 0.85, contractor: 0.8, fitness: 0.8 }),
  npmDependencies: [],
  cssFeatures: ['grid', 'animation'],
  generationHints: { alwaysCustomize: ['items'], neverChange: [], maxContentItems: 4 },
};

const ABOUT_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'about',
  label: 'About',
  category: 'content',
  description: 'About section with text and image',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'description', label: 'Description', type: 'string', required: true },
    { name: 'image', label: 'Image', type: 'image_url', required: false },
    { name: 'cta', label: 'CTA Button', type: 'object', required: false },
    { name: 'layout', label: 'Layout', type: 'enum', required: false, enumValues: ['text-left', 'text-right', 'centered'] },
  ],
  compositionRules: {
    preferredBefore: ['hero', 'services'],
    preferredAfter: ['team', 'testimonials', 'cta'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: false,
    canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical'],
  interactions: {
    emitsIntents: ['nav.goto_page'],
    consumesIntents: [],
    hasForm: false,
    hasNavigation: true,
    interactiveElementCount: 'few',
  },
  industrySuitability: industrySuits({}, 0.85),
  npmDependencies: [],
  cssFeatures: ['flexbox'],
  generationHints: { alwaysCustomize: ['headline', 'description', 'image'], neverChange: [] },
};

const TEAM_INTELLIGENCE: ComponentIntelligence = {
  sectionType: 'team',
  label: 'Team',
  category: 'content',
  description: 'Team member profiles with photos',
  propSchema: [
    { name: 'headline', label: 'Headline', type: 'string', required: false },
    { name: 'members', label: 'Team Members', type: 'array', required: true },
    { name: 'columns', label: 'Columns', type: 'enum', required: false, enumValues: ['2', '3', '4'] },
  ],
  compositionRules: {
    preferredBefore: ['about'],
    preferredAfter: ['testimonials', 'cta'],
    incompatibleWith: [],
    maxPerPage: 1,
    canBeFirst: false,
    canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical', 'carousel_mobile'],
  interactions: { emitsIntents: [], consumesIntents: [], hasForm: false, hasNavigation: false, interactiveElementCount: 'few' },
  industrySuitability: industrySuits({
    salon: 0.9, coaching: 0.85, agency: 0.9, legal: 0.9, healthcare: 0.9,
    fitness: 0.8, contractor: 0.7, restaurant: 0.7,
  }),
  npmDependencies: [],
  cssFeatures: ['grid'],
  generationHints: { alwaysCustomize: ['headline', 'members'], neverChange: [], maxContentItems: 8 },
};

// Placeholder intelligence for partial sections
const PLACEHOLDER_INTELLIGENCE = (type: SectionType, label: string, category: ComponentIntelligence['category']): ComponentIntelligence => ({
  sectionType: type,
  label,
  category,
  description: `${label} section (placeholder intelligence)`,
  propSchema: [],
  compositionRules: {
    preferredBefore: [], preferredAfter: [], incompatibleWith: [],
    maxPerPage: 1, canBeFirst: false, canBeLast: false,
  },
  responsiveBehaviors: ['stack_vertical'],
  interactions: { emitsIntents: [], consumesIntents: [], hasForm: false, hasNavigation: false, interactiveElementCount: 'none' },
  industrySuitability: industrySuits(),
  npmDependencies: [],
  cssFeatures: [],
  generationHints: { alwaysCustomize: [], neverChange: [] },
});

// ============================================================================
// Registry Assembly
// ============================================================================

const INTELLIGENCE_ENTRIES: Record<SectionType, ComponentIntelligence> = {
  navbar: NAVBAR_INTELLIGENCE,
  hero: HERO_INTELLIGENCE,
  services: SERVICES_INTELLIGENCE,
  features: FEATURES_INTELLIGENCE,
  pricing: PRICING_INTELLIGENCE,
  testimonials: TESTIMONIALS_INTELLIGENCE,
  cta: CTA_INTELLIGENCE,
  contact: CONTACT_INTELLIGENCE,
  footer: FOOTER_INTELLIGENCE,
  gallery: GALLERY_INTELLIGENCE,
  faq: FAQ_INTELLIGENCE,
  stats: STATS_INTELLIGENCE,
  about: ABOUT_INTELLIGENCE,
  team: TEAM_INTELLIGENCE,
  'logo-cloud': PLACEHOLDER_INTELLIGENCE('logo-cloud', 'Logo Cloud', 'social-proof'),
  'blog-preview': PLACEHOLDER_INTELLIGENCE('blog-preview', 'Blog Preview', 'content'),
  'before-after': PLACEHOLDER_INTELLIGENCE('before-after', 'Before & After', 'content'),
};

// ============================================================================
// Public API
// ============================================================================

export const COMPONENT_INTELLIGENCE_REGISTRY: ComponentIntelligenceRegistry = {
  entries: INTELLIGENCE_ENTRIES,
  version: '1.0.0',
};

export function getComponentIntelligence(sectionType: SectionType): ComponentIntelligence | undefined {
  return INTELLIGENCE_ENTRIES[sectionType];
}

export function getComponentsForIndustry(industry: string, minScore = 0.7): ComponentIntelligence[] {
  return Object.values(INTELLIGENCE_ENTRIES).filter(entry =>
    entry.industrySuitability.some(s => s.industry === industry && s.score >= minScore)
  );
}

export function getComponentsByCategory(category: ComponentIntelligence['category']): ComponentIntelligence[] {
  return Object.values(INTELLIGENCE_ENTRIES).filter(e => e.category === category);
}

export function validateComposition(sectionTypes: SectionType[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  for (let i = 0; i < sectionTypes.length; i++) {
    const current = INTELLIGENCE_ENTRIES[sectionTypes[i]];
    if (!current) continue;

    // Check maxPerPage
    const count = sectionTypes.filter(t => t === sectionTypes[i]).length;
    if (count > current.compositionRules.maxPerPage) {
      issues.push(`${current.label} appears ${count} times (max ${current.compositionRules.maxPerPage})`);
    }

    // Check canBeFirst/canBeLast
    if (i === 0 && !current.compositionRules.canBeFirst) {
      issues.push(`${current.label} should not be the first section`);
    }
    if (i === sectionTypes.length - 1 && !current.compositionRules.canBeLast) {
      issues.push(`${current.label} should not be the last section`);
    }

    // Check incompatibility with adjacent sections
    if (i < sectionTypes.length - 1) {
      const next = sectionTypes[i + 1];
      if (current.compositionRules.incompatibleWith.includes(next)) {
        issues.push(`${current.label} is incompatible with ${INTELLIGENCE_ENTRIES[next]?.label || next}`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
