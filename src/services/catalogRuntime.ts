/**
 * catalogRuntime — read-side hydration for generated sections.
 *
 * Given a SectionDataBindingDTO, resolve the actual rows the section
 * should render. Applies filters, sort, limit, and collection membership
 * (rules or manual_item_ids).
 *
 * Returns a `CatalogRenderResult` that includes the rows plus a fallback
 * decision so the section renderer knows whether to show data, an empty
 * state, a placeholder, or hide itself.
 */

import { supabase } from '@/integrations/supabase/client';
import { getCollectionBySlug } from '@/services/catalogCollectionService';
import { getBinding } from '@/services/sectionDataBindingService';
import type {
  CatalogCollectionDTO,
  SectionDataBindingDTO,
  SectionDataFallback,
} from '@/types/catalog';

export interface CatalogRenderResult {
  rows: Array<Record<string, unknown>>;
  binding: SectionDataBindingDTO | null;
  collection: CatalogCollectionDTO | null;
  fallback: SectionDataFallback | 'ok';
}

export async function resolveSectionData(
  projectId: string,
  pagePath: string,
  sectionId: string,
  slotKey: string | null = null,
): Promise<CatalogRenderResult> {
  const binding = await getBinding(projectId, pagePath, sectionId, slotKey);
  if (!binding) {
    return { rows: [], binding: null, collection: null, fallback: 'hide_section' };
  }
  return hydrateBinding(binding);
}

export async function hydrateBinding(
  binding: SectionDataBindingDTO,
): Promise<CatalogRenderResult> {
  let collection: CatalogCollectionDTO | null = null;
  if (binding.collectionId) {
    const { data } = await supabase
      .from('catalog_collections' as never)
      .select('id, business_id, project_id, kind, name, slug, description, image_url, rules, manual_item_ids, sort_order, is_active, created_at, updated_at')
      .eq('id', binding.collectionId)
      .maybeSingle();
    if (data) {
      const r = data as unknown as {
        id: string; business_id: string; project_id: string | null; kind: string;
        name: string; slug: string; description: string | null; image_url: string | null;
        rules: unknown; manual_item_ids: string[] | null; sort_order: number;
        is_active: boolean; created_at: string; updated_at: string;
      };
      collection = {
        id: r.id, businessId: r.business_id, projectId: r.project_id,
        kind: r.kind as CatalogCollectionDTO['kind'], name: r.name, slug: r.slug,
        description: r.description, imageUrl: r.image_url,
        rules: (r.rules && typeof r.rules === 'object') ? r.rules as Record<string, unknown> : {},
        manualItemIds: Array.isArray(r.manual_item_ids) ? r.manual_item_ids : [],
        sortOrder: r.sort_order, isActive: r.is_active,
        createdAt: r.created_at, updatedAt: r.updated_at,
      };
    }
  }

  let query = supabase
    .from(binding.sourceTable as never)
    .select('*')
    .eq('business_id', binding.businessId);

  // Apply flat equality filters (e.g. { featured: true, is_active: true }).
  for (const [key, value] of Object.entries(binding.filters ?? {})) {
    query = query.eq(key, value as never);
  }

  // Manual collection membership overrides filter set.
  if (collection && collection.manualItemIds.length > 0) {
    query = query.in('id', collection.manualItemIds);
  }

  if (binding.sort?.field) {
    query = query.order(binding.sort.field, {
      ascending: binding.sort.direction !== 'desc',
    });
  }
  if (binding.limitCount && binding.limitCount > 0) {
    query = query.limit(binding.limitCount);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[catalogRuntime] hydrate failed', error);
    return { rows: [], binding, collection, fallback: binding.fallbackMode };
  }

  const rows = (data as unknown as Array<Record<string, unknown>>) ?? [];
  return {
    rows,
    binding,
    collection,
    fallback: rows.length === 0 ? binding.fallbackMode : 'ok',
  };
}

/**
 * Resolve a hydration request coming from the preview iframe.
 *
 * The generated site posts `{ pagePath, sectionId?, sectionType?, occurrenceIndex? }`.
 * When `sectionId` matches an emitted binding directly we use it; otherwise
 * we fall back to (page + sectionType occurrence) which is what
 * `autoEmitSectionBindings` currently keys on (`${requirementKey}-${index}`).
 */
export async function resolveHydrationRequest(params: {
  projectId: string;
  pagePath: string;
  sectionId?: string | null;
  sectionType?: string | null;
  occurrenceIndex?: number | null;
}): Promise<CatalogRenderResult> {
  const { projectId, pagePath } = params;
  if (!projectId || !pagePath) {
    return { rows: [], binding: null, collection: null, fallback: 'hide_section' };
  }

  // 1) Direct match by explicit sectionId.
  if (params.sectionId) {
    const direct = await resolveSectionData(projectId, pagePath, params.sectionId, null);
    if (direct.binding) return direct;
  }

  // 2) Occurrence-based match: pull all bindings for the page whose sectionId
  //    starts with the requirement key implied by `sectionType`.
  const requirementKey = mapWizardTypeToRequirement(params.sectionType ?? '');
  if (!requirementKey) {
    return { rows: [], binding: null, collection: null, fallback: 'hide_section' };
  }
  const { data, error } = await supabase
    .from('site_data_bindings' as never)
    .select('id, business_id, project_id, snapshot_id, page_path, section_id, slot_key, binding_type, source_kind, source_table, collection_id, filters, sort, limit_count, display_mapping, fallback_mode, created_at, updated_at')
    .eq('project_id', projectId)
    .eq('page_path', pagePath)
    .like('section_id', `${requirementKey}-%`)
    .order('section_id', { ascending: true });
  if (error || !data || (data as unknown[]).length === 0) {
    return { rows: [], binding: null, collection: null, fallback: 'hide_section' };
  }
  const rows = data as unknown as Array<{
    id: string; business_id: string; project_id: string; snapshot_id: string | null;
    page_path: string; section_id: string; slot_key: string | null; binding_type: string;
    source_kind: string; source_table: string; collection_id: string | null;
    filters: unknown; sort: unknown; limit_count: number | null;
    display_mapping: unknown; fallback_mode: string; created_at: string; updated_at: string;
  }>;
  const idx = Math.max(0, params.occurrenceIndex ?? 0);
  const pick = rows[Math.min(idx, rows.length - 1)];
  const binding: SectionDataBindingDTO = {
    id: pick.id, businessId: pick.business_id, projectId: pick.project_id,
    snapshotId: pick.snapshot_id, pagePath: pick.page_path, sectionId: pick.section_id,
    slotKey: pick.slot_key, bindingType: (pick.binding_type as SectionDataBindingDTO['bindingType']) ?? 'section',
    sourceKind: pick.source_kind as SectionDataBindingDTO['sourceKind'],
    sourceTable: pick.source_table, collectionId: pick.collection_id,
    filters: (pick.filters && typeof pick.filters === 'object') ? pick.filters as Record<string, unknown> : {},
    sort: (pick.sort && typeof pick.sort === 'object') ? pick.sort as SectionDataBindingDTO['sort'] : {},
    limitCount: pick.limit_count,
    displayMapping: (pick.display_mapping && typeof pick.display_mapping === 'object')
      ? pick.display_mapping as Record<string, string> : {},
    fallbackMode: (pick.fallback_mode as SectionDataBindingDTO['fallbackMode']) ?? 'empty_state',
    createdAt: pick.created_at, updatedAt: pick.updated_at,
  };
  return hydrateBinding(binding);
}

const WIZARD_TYPE_TO_REQUIREMENT_LOCAL: Record<string, string> = {
  services: 'ServiceGrid', service_grid: 'ServiceGrid', featured_services: 'ServiceGrid',
  products: 'ProductGrid', product_grid: 'ProductGrid', shop: 'ProductGrid',
  featured_products: 'FeaturedProducts',
  menu: 'MenuSection', menu_section: 'MenuSection',
  pricing: 'PricingTable', pricing_table: 'PricingTable', plans: 'PricingTable',
  offers: 'FeaturedOffers', featured_offers: 'FeaturedOffers', promotions: 'FeaturedOffers', deals: 'FeaturedOffers',
  testimonials: 'Testimonials', reviews: 'Testimonials', social_proof: 'Testimonials',
  portfolio: 'PortfolioGrid', portfolio_grid: 'PortfolioGrid', projects: 'PortfolioGrid',
  case_studies: 'PortfolioGrid', gallery: 'PortfolioGrid', work: 'PortfolioGrid',
};


function mapWizardTypeToRequirement(t: string): string | null {
  if (!t) return null;
  const n = t.toLowerCase().replace(/[-\s]/g, '_');
  return WIZARD_TYPE_TO_REQUIREMENT_LOCAL[n] ?? null;
}

/**
 * Given a hydration result and the binding's displayMapping, project the raw
 * DB rows into the shape generated section components consume (title,
 * description, price, image, cta, badge).
 */
export function projectRowsForSection(
  result: CatalogRenderResult,
): Array<Record<string, unknown>> {
  if (!result.binding || result.rows.length === 0) return [];
  const map = result.binding.displayMapping ?? {};
  const defaults: Record<string, string> = {
    title: map.title ?? 'name',
    description: map.description ?? 'description',
    price: map.price ?? 'price',
    image: map.image ?? 'image_url',
    badge: map.badge ?? 'badge',
    duration: map.duration ?? 'duration_minutes',
  };
  return result.rows.map((row) => {
    const out: Record<string, unknown> = { ...row };
    for (const [outKey, srcKey] of Object.entries(defaults)) {
      if (out[outKey] === undefined && row[srcKey] !== undefined) {
        out[outKey] = row[srcKey];
      }
    }
    return out;
  });
}
