/**
 * Section ↔ catalog data contracts (Milestone 3).
 *
 * Every generated section declares WHAT data it needs, WHERE that data lives,
 * the minimum row count for the section to feel real, its empty-state behavior,
 * and the Business Center edit path so blockers can auto-repair.
 *
 * Consumed by:
 *  - autoEmitSectionBindings.ts        (writes data-* attributes into VFS)
 *  - catalogHydrationModule.ts         (runtime fetch scoped by businessId)
 *  - businessProfileReadinessGate.ts   (turn missing rows into repair actions)
 *  - ReadinessChecklist.tsx            (one-click repair CTAs)
 */

export type CatalogSourceTable =
  | 'services'
  | 'products'
  | 'menu_items'
  | 'pricing_plans'
  | 'featured_offers'
  | 'testimonials'
  | 'portfolio_projects'
  | 'availability_slots';

export type EmptyStateBehavior =
  | 'placeholder-cards' // render skeleton cards + owner "Add X" CTA
  | 'hide-section'      // remove section entirely if no rows
  | 'sample-copy';      // keep the wizard-generated sample copy visible

export interface SectionDataContract {
  /** PascalCase section identifier as declared in ComponentIntelligence registry. */
  sectionType: string;
  /** Human label used in readiness checklist. */
  friendlyName: string;
  /** Singular label of the row that fills this section. */
  rowLabel: string;
  requiredDataType:
    | 'service'
    | 'product'
    | 'menu-item'
    | 'pricing-plan'
    | 'offer'
    | 'testimonial'
    | 'portfolio-project'
    | 'availability-slot';
  sourceTable: CatalogSourceTable;
  minRows: number;
  emptyState: EmptyStateBehavior;
  /** Route under /business Center where the owner edits this data. */
  editPath: string;
  /** Prefix for the deterministic sectionBindingId written into VFS data-* attrs. */
  bindingIdPrefix: string;
}

export const SECTION_DATA_CONTRACTS: Record<string, SectionDataContract> = {
  ServicesGrid: {
    sectionType: 'ServicesGrid',
    friendlyName: 'Services',
    rowLabel: 'service',
    requiredDataType: 'service',
    sourceTable: 'services',
    minRows: 3,
    emptyState: 'placeholder-cards',
    editPath: '/business/services',
    bindingIdPrefix: 'services',
  },
  ProductGrid: {
    sectionType: 'ProductGrid',
    friendlyName: 'Products',
    rowLabel: 'product',
    requiredDataType: 'product',
    sourceTable: 'products',
    minRows: 4,
    emptyState: 'placeholder-cards',
    editPath: '/business/products',
    bindingIdPrefix: 'products',
  },
  Menu: {
    sectionType: 'Menu',
    friendlyName: 'Menu',
    rowLabel: 'menu item',
    requiredDataType: 'menu-item',
    sourceTable: 'menu_items',
    minRows: 6,
    emptyState: 'placeholder-cards',
    editPath: '/business/menu',
    bindingIdPrefix: 'menu',
  },
  PricingTable: {
    sectionType: 'PricingTable',
    friendlyName: 'Pricing plans',
    rowLabel: 'pricing plan',
    requiredDataType: 'pricing-plan',
    sourceTable: 'pricing_plans',
    minRows: 2,
    emptyState: 'sample-copy',
    editPath: '/business/pricing',
    bindingIdPrefix: 'pricing',
  },
  FeaturedOffers: {
    sectionType: 'FeaturedOffers',
    friendlyName: 'Featured offers',
    rowLabel: 'offer',
    requiredDataType: 'offer',
    sourceTable: 'featured_offers',
    minRows: 1,
    emptyState: 'hide-section',
    editPath: '/business/offers',
    bindingIdPrefix: 'offers',
  },
  Testimonials: {
    sectionType: 'Testimonials',
    friendlyName: 'Testimonials',
    rowLabel: 'testimonial',
    requiredDataType: 'testimonial',
    sourceTable: 'testimonials',
    minRows: 3,
    emptyState: 'sample-copy',
    editPath: '/business/testimonials',
    bindingIdPrefix: 'testimonials',
  },
  Portfolio: {
    sectionType: 'Portfolio',
    friendlyName: 'Portfolio',
    rowLabel: 'project',
    requiredDataType: 'portfolio-project',
    sourceTable: 'portfolio_projects',
    minRows: 3,
    emptyState: 'placeholder-cards',
    editPath: '/business/portfolio',
    bindingIdPrefix: 'portfolio',
  },
  BookingAvailability: {
    sectionType: 'BookingAvailability',
    friendlyName: 'Availability',
    rowLabel: 'time slot',
    requiredDataType: 'availability-slot',
    sourceTable: 'availability_slots',
    minRows: 5,
    emptyState: 'placeholder-cards',
    editPath: '/business/availability',
    bindingIdPrefix: 'availability',
  },
};

export function getSectionContract(sectionType: string): SectionDataContract | undefined {
  return SECTION_DATA_CONTRACTS[sectionType];
}

export function contractsForIndustry(industry: string): SectionDataContract[] {
  // Broad defaults; wizard-emitted topology narrows this further.
  const base = [SECTION_DATA_CONTRACTS.Testimonials];
  switch (industry) {
    case 'ecommerce':
      return [SECTION_DATA_CONTRACTS.ProductGrid, SECTION_DATA_CONTRACTS.FeaturedOffers, ...base];
    case 'restaurant':
      return [SECTION_DATA_CONTRACTS.Menu, SECTION_DATA_CONTRACTS.FeaturedOffers, ...base];
    case 'local-service':
    case 'salon':
    case 'coaching':
      return [
        SECTION_DATA_CONTRACTS.ServicesGrid,
        SECTION_DATA_CONTRACTS.BookingAvailability,
        SECTION_DATA_CONTRACTS.Portfolio,
        ...base,
      ];
    case 'saas':
      return [SECTION_DATA_CONTRACTS.PricingTable, ...base];
    case 'agency':
    case 'portfolio':
      return [SECTION_DATA_CONTRACTS.Portfolio, SECTION_DATA_CONTRACTS.ServicesGrid, ...base];
    default:
      return [SECTION_DATA_CONTRACTS.ServicesGrid, ...base];
  }
}
