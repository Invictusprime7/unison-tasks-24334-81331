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
