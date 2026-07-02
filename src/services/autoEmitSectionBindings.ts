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
const WIZARD_TYPE_TO_REQUIREMENT: Record<string, string> = {
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
};

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
          filters: defaultFilters[req.requiredKind] ?? { is_active: true },
          sort: { field: 'sort_order', direction: 'asc' },
          limitCount: defaultLimit,
          fallbackMode: defaultFallback,
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
