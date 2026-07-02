/**
 * catalogCollectionService — the ONLY read/write path for
 * catalog_collections (Shopify-style groupings across all CatalogKinds).
 *
 * Generated sections should bind to a collection when possible instead of
 * raw table filters, because collections give users a mental model they can
 * edit directly in the Builder Catalog panel.
 */

import { supabase } from '@/integrations/supabase/client';
import type { CatalogCollectionDTO, CatalogKind } from '@/types/catalog';

interface CollectionRow {
  id: string;
  business_id: string;
  project_id: string | null;
  kind: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  rules: unknown;
  manual_item_ids: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function rowToDto(row: CollectionRow): CatalogCollectionDTO {
  return {
    id: row.id,
    businessId: row.business_id,
    projectId: row.project_id,
    kind: row.kind as CatalogKind,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    rules: (row.rules && typeof row.rules === 'object') ? (row.rules as Record<string, unknown>) : {},
    manualItemIds: Array.isArray(row.manual_item_ids) ? row.manual_item_ids : [],
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLS =
  'id, business_id, project_id, kind, name, slug, description, image_url, rules, manual_item_ids, sort_order, is_active, created_at, updated_at';

export async function listCollections(
  businessId: string,
  kind?: CatalogKind,
): Promise<CatalogCollectionDTO[]> {
  if (!businessId) return [];
  let query = supabase
    .from('catalog_collections' as never)
    .select(COLS)
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true });
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) {
    console.warn('[catalogCollectionService] list failed', error);
    return [];
  }
  return (data as unknown as CollectionRow[]).map(rowToDto);
}

export async function getCollectionBySlug(
  businessId: string,
  kind: CatalogKind,
  slug: string,
): Promise<CatalogCollectionDTO | null> {
  const { data, error } = await supabase
    .from('catalog_collections' as never)
    .select(COLS)
    .eq('business_id', businessId)
    .eq('kind', kind)
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToDto(data as unknown as CollectionRow);
}

export interface CreateCollectionInput {
  businessId: string;
  projectId?: string | null;
  kind: CatalogKind;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  rules?: Record<string, unknown>;
  manualItemIds?: string[];
  sortOrder?: number;
  isActive?: boolean;
}

export async function upsertCollection(
  input: CreateCollectionInput,
): Promise<CatalogCollectionDTO | null> {
  const row = {
    business_id: input.businessId,
    project_id: input.projectId ?? null,
    kind: input.kind,
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    image_url: input.imageUrl ?? null,
    rules: input.rules ?? {},
    manual_item_ids: input.manualItemIds ?? [],
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
  };
  const { data, error } = await supabase
    .from('catalog_collections' as never)
    .upsert(row, { onConflict: 'business_id,kind,slug' })
    .select(COLS)
    .maybeSingle();
  if (error) {
    console.warn('[catalogCollectionService] upsert failed', error);
    return null;
  }
  return data ? rowToDto(data as unknown as CollectionRow) : null;
}

export async function deleteCollection(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('catalog_collections' as never)
    .delete()
    .eq('id', id);
  if (error) {
    console.warn('[catalogCollectionService] delete failed', error);
    return false;
  }
  return true;
}
