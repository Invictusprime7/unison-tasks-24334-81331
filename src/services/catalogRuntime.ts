/**
 * catalogRuntime — read-side hydration for generated sections.
 *
 * Milestone 1 refactor: all section-type resolution + row projection now
 * derives from `catalogSurfaceRegistry`. No local wizard-type maps and no
 * hand-rolled display projections in this file.
 */

import { supabase } from '@/integrations/supabase/client';
import { getBinding } from '@/services/sectionDataBindingService';
import { catalogCardBindingFor } from '@/services/catalogCardBindingService';
import {
  getCatalogSurface,
  getCatalogSurfaceByTable,
  projectRowToCardViewModel,
  type CatalogCardViewModel,
} from '@/platform/core/catalogSurfaceRegistry';
import type {
  CatalogCollectionDTO,
  CatalogBinding,
  SectionDataBindingDTO,
  SectionDataFallback,
} from '@/types/catalog';

export interface CatalogRenderResult {
  rows: Array<Record<string, unknown>>;
  binding: SectionDataBindingDTO | null;
  cardBinding: CatalogBinding | null;
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
    return { rows: [], binding: null, cardBinding: null, collection: null, fallback: 'hide_section' };
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

  for (const [key, value] of Object.entries(binding.filters ?? {})) {
    query = query.eq(key, value as never);
  }

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
    return {
      rows: [],
      binding,
      cardBinding: catalogCardBindingFor(binding),
      collection,
      fallback: binding.fallbackMode,
    };
  }

  const rows = (data as unknown as Array<Record<string, unknown>>) ?? [];
  return {
    rows,
    binding,
    cardBinding: catalogCardBindingFor(binding),
    collection,
    fallback: rows.length === 0 ? binding.fallbackMode : 'ok',
  };
}

/**
 * Resolve a hydration request coming from the preview iframe.
 * Direct sectionId match first; otherwise (page + sectionType occurrence).
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
    return { rows: [], binding: null, cardBinding: null, collection: null, fallback: 'hide_section' };
  }

  if (params.sectionId) {
    const direct = await resolveSectionData(projectId, pagePath, params.sectionId, null);
    if (direct.binding) return direct;
  }

  const surface = getCatalogSurface(params.sectionType ?? '');
  if (!surface) {
    return { rows: [], binding: null, cardBinding: null, collection: null, fallback: 'hide_section' };
  }
  const { data, error } = await supabase
    .from('site_data_bindings' as never)
    .select('id, business_id, project_id, snapshot_id, page_path, section_id, slot_key, binding_type, source_kind, source_table, collection_id, filters, sort, limit_count, display_mapping, fallback_mode, created_at, updated_at')
    .eq('project_id', projectId)
    .eq('page_path', pagePath)
    .like('section_id', `${surface.bindingPrefix}-%`)
    .order('section_id', { ascending: true });
  if (error || !data || (data as unknown[]).length === 0) {
    return { rows: [], binding: null, cardBinding: null, collection: null, fallback: 'hide_section' };
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
      ? pick.display_mapping as Record<string, unknown> : {},
    fallbackMode: (pick.fallback_mode as SectionDataBindingDTO['fallbackMode']) ?? 'empty_state',
    createdAt: pick.created_at, updatedAt: pick.updated_at,
  };
  return hydrateBinding(binding);
}

/**
 * Project raw DB rows into the canonical CatalogCardViewModel — so generated
 * sections only ever see `title`, `description`, `imageUrl`, `priceCents`,
 * `priceLabel`, etc., regardless of whether the DB stored dollars or cents.
 */
export function projectRowsForSection(
  result: CatalogRenderResult,
): CatalogCardViewModel[] {
  if (!result.binding || result.rows.length === 0) return [];
  const surface = getCatalogSurfaceByTable(result.binding.sourceTable);
  if (!surface) return [];
  return result.rows.map((row) => projectRowToCardViewModel(surface, row));
}
