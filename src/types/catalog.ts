/**
 * Universal Catalog Runtime — type contracts.
 *
 * Every generated section is either static design or a live data surface.
 * Live-data sections declare a CatalogSource + SectionDataRequirement so the
 * runtime knows what to fetch, what CTA payloads to build, and what to render
 * when the business hasn't seeded rows yet.
 *
 * These types are read by:
 *   - sectionDataBindingService     (persistence for site_data_bindings)
 *   - catalogCollectionService      (persistence for catalog_collections)
 *   - catalogRuntime                (read-side hydration for the preview)
 *   - Builder Catalog panel         (UI editing surfaces)
 */

export type CatalogKind =
  | 'product'
  | 'service'
  | 'menu_item'
  | 'pricing_plan'
  | 'offer'
  | 'project'
  | 'testimonial';

export const CATALOG_KIND_TO_TABLE: Record<CatalogKind, string> = {
  product: 'products',
  service: 'services',
  menu_item: 'menu_items',
  pricing_plan: 'pricing_plans',
  offer: 'featured_offers',
  project: 'portfolio_projects',
  testimonial: 'testimonials',
};


export type SectionDataFallback = 'empty_state' | 'hide_section' | 'show_placeholder';
export type BindingType = 'section' | 'slot' | 'card';

export interface CatalogCollectionDTO {
  id: string;
  businessId: string;
  projectId: string | null;
  kind: CatalogKind;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  rules: Record<string, unknown>;
  manualItemIds: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDataBindingDTO {
  id: string;
  businessId: string;
  projectId: string;
  snapshotId: string | null;
  pagePath: string;
  sectionId: string;
  slotKey: string | null;
  bindingType: BindingType;
  sourceKind: CatalogKind;
  sourceTable: string;
  collectionId: string | null;
  filters: Record<string, unknown>;
  sort: { field?: string; direction?: 'asc' | 'desc' };
  limitCount: number | null;
  displayMapping: Record<string, string>;
  fallbackMode: SectionDataFallback;
  createdAt: string;
  updatedAt: string;
}

/**
 * Static section-type → data contract map.
 * Used by the generator and readiness gate to know which sections are live.
 */
export interface SectionDataRequirement {
  sectionType: string;
  requiredKind: CatalogKind;
  minRows: number;
  emptyState: SectionDataFallback;
  supportedIntents: string[];
}

export const SECTION_DATA_REQUIREMENTS: Record<string, SectionDataRequirement> = {
  ServiceGrid: {
    sectionType: 'ServiceGrid',
    requiredKind: 'service',
    minRows: 1,
    emptyState: 'show_setup_prompt' as unknown as SectionDataFallback, // maps to empty_state in DB
    supportedIntents: ['booking.create', 'quote.request'],
  },
  ProductGrid: {
    sectionType: 'ProductGrid',
    requiredKind: 'product',
    minRows: 1,
    emptyState: 'empty_state',
    supportedIntents: ['cart.add', 'checkout.start'],
  },
  FeaturedProducts: {
    sectionType: 'FeaturedProducts',
    requiredKind: 'product',
    minRows: 1,
    emptyState: 'hide_section',
    supportedIntents: ['cart.add'],
  },
  MenuSection: {
    sectionType: 'MenuSection',
    requiredKind: 'menu_item',
    minRows: 3,
    emptyState: 'empty_state',
    supportedIntents: ['reservation.create', 'order.create'],
  },
  PricingTable: {
    sectionType: 'PricingTable',
    requiredKind: 'pricing_plan',
    minRows: 1,
    emptyState: 'empty_state',
    supportedIntents: ['checkout.start', 'contact.form'],
  },
  FeaturedOffers: {
    sectionType: 'FeaturedOffers',
    requiredKind: 'offer',
    minRows: 1,
    emptyState: 'hide_section',
    supportedIntents: ['nav.goto', 'cart.add', 'contact.form'],
  },
  Testimonials: {
    sectionType: 'Testimonials',
    requiredKind: 'testimonial',
    minRows: 1,
    emptyState: 'hide_section',
    supportedIntents: [],
  },
  PortfolioGrid: {
    sectionType: 'PortfolioGrid',
    requiredKind: 'project',
    minRows: 1,
    emptyState: 'hide_section',
    supportedIntents: ['nav.goto'],
  },
};


export function requirementForSection(sectionType: string): SectionDataRequirement | null {
  return SECTION_DATA_REQUIREMENTS[sectionType] ?? null;
}
