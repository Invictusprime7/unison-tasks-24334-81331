/**
 * autoEmitSectionBindings — Track B, Pass 2.
 *
 * Scans a SiteBundleSnapshot's PageRegistry for section types that the
 * runtime knows how to hydrate (see SECTION_DATA_REQUIREMENTS in
 * `@/types/catalog`) and upserts a `site_data_binding` row for each so
 * `catalogRuntime` can serve live Supabase rows into the preview.
 *
 * This is idempotent — bindings are keyed by
 * (project_id, page_path, section_id, slot_key) — so re-running it after
 * every canonical recompile just refreshes filters/limits and never
 * duplicates rows.
 *
 * Called from the System Launcher after a snapshot is produced, and from
 * `recompileFromPlayground` when the section topology changes.
 */
import { upsertBinding } from '@/services/sectionDataBindingService';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import {
  CATALOG_KIND_TO_TABLE,
  requirementForSection,
  type CatalogKind,
  type SectionDataFallback,
} from '@/types/catalog';

/**
 * Wizard section-type vocabulary (lowercase, industry-neutral) → the
 * PascalCase section-type keyed in SECTION_DATA_REQUIREMENTS. Keep this
 * mapping conservative — only add an entry when there is a real runtime
 * hydrator for the target kind.
 */
export const WIZARD_TYPE_TO_REQUIREMENT: Record<string, string> = {
  services: 'ServiceGrid',
  service_grid: 'ServiceGrid',
  featured_services: 'ServiceGrid',
  products: 'ProductGrid',
  product_grid: 'ProductGrid',
  shop: 'ProductGrid',
  featured_products: 'FeaturedProducts',
  menu: 'MenuSection',
  menu_section: 'MenuSection',
  pricing: 'PricingTable',
  pricing_table: 'PricingTable',
  plans: 'PricingTable',
  // Milestone 3 — additional live-data sections
  offers: 'FeaturedOffers',
  featured_offers: 'FeaturedOffers',
  promotions: 'FeaturedOffers',
  deals: 'FeaturedOffers',
  testimonials: 'Testimonials',
  reviews: 'Testimonials',
  social_proof: 'Testimonials',
  portfolio: 'PortfolioGrid',
  portfolio_grid: 'PortfolioGrid',
  projects: 'PortfolioGrid',
  case_studies: 'PortfolioGrid',
  gallery: 'PortfolioGrid',
  work: 'PortfolioGrid',
};

/**
 * Per-kind defaults so auto-emitted bindings match each table's actual
 * schema (columns differ: services uses `is_active`, featured_offers uses
 * `active`, testimonials/portfolio use `featured`, etc.). Filters/sort/
 * displayMapping produced here flow straight into `site_data_bindings`.
 */
type KindDefaults = {
  filters: Record<string, unknown>;
  sort: { field: string; direction: 'asc' | 'desc' };
  limit: number;
  displayMapping: Record<string, string>;
};

const KIND_DEFAULTS: Partial<Record<import('@/types/catalog').CatalogKind, KindDefaults>> = {
  service: {
    filters: { is_active: true },
    sort: { field: 'sort_order', direction: 'asc' },
    limit: 12,
    displayMapping: { title: 'name', description: 'description', price: 'price', image: 'image_url', duration: 'duration_minutes' },
  },
  product: {
    filters: { is_active: true },
    sort: { field: 'sort_order', direction: 'asc' },
    limit: 12,
    displayMapping: { title: 'name', description: 'description', price: 'price', image: 'image_url', badge: 'badge' },
  },
  menu_item: {
    filters: { available: true },
    sort: { field: 'sort_order', direction: 'asc' },
    limit: 24,
    displayMapping: { title: 'name', description: 'description', price: 'price_cents', image: 'image_url' },
  },

  pricing_plan: {
    filters: { is_active: true },
    sort: { field: 'sort_order', direction: 'asc' },
    limit: 6,
    displayMapping: { title: 'name', description: 'description', price: 'price', badge: 'badge' },
  },
  offer: {
    filters: { active: true },
    sort: { field: 'sort_order', direction: 'asc' },
    limit: 6,
    displayMapping: { title: 'title', description: 'description', image: 'image_url', badge: 'discount_label', cta: 'cta_label' },
  },
  testimonial: {
    filters: {},
    sort: { field: 'sort_order', direction: 'asc' },
    limit: 9,
    displayMapping: { title: 'author_name', description: 'quote', image: 'author_avatar_url', badge: 'rating', role: 'author_role' },
  },
  project: {
    filters: {},
    sort: { field: 'sort_order', direction: 'asc' },
    limit: 12,
    displayMapping: { title: 'title', description: 'summary', image: 'cover_image_url', badge: 'client_name' },
  },
};


/**
 * Build the sectionId → requirementKey map used by the CatalogInspectorPanel /
 * CatalogReadinessGate. Mirrors the sectionId scheme emitted below
 * (`${requirementKey}-${index}`) so a snapshot alone is enough to derive it —
 * no DB round-trip required.
 */
export function buildSectionTypeMap(
  snapshot: SiteBundleSnapshot | null | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  const pages = snapshot?.pageRegistry?.pages;
  if (!pages) return map;
  for (const page of Object.values(pages)) {
    const sectionTypes = (page as unknown as { sectionTypes?: unknown }).sectionTypes;
    if (!Array.isArray(sectionTypes)) continue;
    for (let index = 0; index < sectionTypes.length; index++) {
      const raw = String(sectionTypes[index] ?? '').trim();
      if (!raw) continue;
      const normalized = raw.toLowerCase().replace(/[-\s]/g, '_');
      const key =
        WIZARD_TYPE_TO_REQUIREMENT[normalized] ?? WIZARD_TYPE_TO_REQUIREMENT[raw];
      if (!key) continue;
      map[`${key}-${index}`] = key;
    }
  }
  return map;
}

export interface AutoEmitOptions {
  businessId: string;
  projectId: string;
  snapshot: SiteBundleSnapshot;
  /** Optional per-kind default filters (e.g. { service: { is_active: true } }). */
  defaultFilters?: Partial<Record<CatalogKind, Record<string, unknown>>>;
  /** Default fallback per kind — otherwise 'empty_state'. */
  defaultFallback?: SectionDataFallback;
  /** Max rows per section — mirrors design intent (e.g. 6 for grids). */
  defaultLimit?: number;
}

export interface AutoEmitResult {
  emitted: number;
  skipped: number;
  errors: number;
  bindingIds: string[];
}

export async function autoEmitSectionBindings(
  opts: AutoEmitOptions,
): Promise<AutoEmitResult> {
  const {
    businessId,
    projectId,
    snapshot,
    defaultFilters = {},
    defaultFallback = 'empty_state',
    defaultLimit = 12,
  } = opts;

  const result: AutoEmitResult = { emitted: 0, skipped: 0, errors: 0, bindingIds: [] };
  if (!businessId || !projectId || !snapshot?.pageRegistry?.pages) return result;

  for (const page of Object.values(snapshot.pageRegistry.pages)) {
    const pagePath = page.path || `/${page.pageId}`;
    const sectionTypes = (page as unknown as { sectionTypes?: unknown }).sectionTypes;
    if (!Array.isArray(sectionTypes) || sectionTypes.length === 0) continue;

    for (let index = 0; index < sectionTypes.length; index++) {
      const raw = String(sectionTypes[index] ?? '').trim();
      if (!raw) continue;
      const normalized = raw.toLowerCase().replace(/[-\s]/g, '_');
      const requirementKey =
        WIZARD_TYPE_TO_REQUIREMENT[normalized] ?? WIZARD_TYPE_TO_REQUIREMENT[raw];
      if (!requirementKey) {
        result.skipped++;
        continue;
      }
      const req = requirementForSection(requirementKey);
      if (!req) {
        result.skipped++;
        continue;
      }

      const sourceTable = CATALOG_KIND_TO_TABLE[req.requiredKind];
      const sectionId = `${requirementKey}-${index}`;
      const kindDefaults = KIND_DEFAULTS[req.requiredKind];
      const fallbackDefault =
        (req.emptyState as SectionDataFallback) === 'hide_section'
          ? 'hide_section'
          : defaultFallback;

      try {
        const dto = await upsertBinding({
          businessId,
          projectId,
          snapshotId: snapshot.snapshotId,
          pagePath,
          sectionId,
          bindingType: 'section',
          sourceKind: req.requiredKind,
          sourceTable,
          filters:
            defaultFilters[req.requiredKind] ??
            kindDefaults?.filters ??
            { is_active: true },
          sort: kindDefaults?.sort ?? { field: 'sort_order', direction: 'asc' },
          limitCount: kindDefaults?.limit ?? defaultLimit,
          displayMapping: kindDefaults?.displayMapping ?? {},
          fallbackMode: fallbackDefault,
        });

        if (dto) {
          result.emitted++;
          result.bindingIds.push(dto.id);
        } else {
          result.errors++;
        }
      } catch (e) {
        console.warn('[autoEmitSectionBindings] upsert failed', {
          pagePath,
          sectionId,
          error: e,
        });
        result.errors++;
      }
    }
  }

  if (result.emitted > 0) {
    console.info('[autoEmitSectionBindings] emitted bindings', {
      projectId,
      snapshotId: snapshot.snapshotId,
      ...result,
    });
  }
  return result;
}
