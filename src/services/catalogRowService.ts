/**
 * catalogRowService — Track B Pass 5 (two-way) + Pass 6 (row CRUD).
 *
 * Thin CRUD over the underlying catalog tables (services, products, menu_items,
 * pricing_plans) so the Builder's Connected Data panel can create, edit and
 * delete rows inline without the caller knowing each table's exact column set.
 * All writes are scoped by business_id at the RLS layer.
 */
import { supabase } from '@/integrations/supabase/client';
import { hydrateBinding, type CatalogRenderResult } from '@/services/catalogRuntime';
import type { SectionDataBindingDTO } from '@/types/catalog';

/** Fields the inspector edits in place. Not every table has every column. */
export interface EditableRowPatch {
  name?: string | null;
  description?: string | null;
  price?: number | null;
  image_url?: string | null;
}

const KNOWN_TABLES = new Set([
  'services',
  'products',
  'menu_items',
  'pricing_plans',
]);

/**
 * Normalize the inspector's generic patch shape into the actual columns each
 * table exposes. Menu items and pricing plans store money as `price_cents`
 * and don't have `image_url` on pricing_plans.
 */
function normalizePatch(
  table: string,
  patch: EditableRowPatch,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const hasName = patch.name !== undefined;
  const hasDesc = patch.description !== undefined;
  const hasPrice = patch.price !== undefined;
  const hasImage = patch.image_url !== undefined;

  if (hasName) out.name = patch.name ?? '';
  if (hasDesc) out.description = patch.description ?? null;

  if (table === 'menu_items' || table === 'pricing_plans') {
    if (hasPrice) {
      const cents =
        patch.price == null || !Number.isFinite(patch.price)
          ? 0
          : Math.round(patch.price * 100);
      out.price_cents = cents;
    }
    if (table === 'menu_items' && hasImage) {
      out.image_url = patch.image_url ?? null;
    }
  } else {
    // services / products use `price` numeric and `image_url` text.
    if (hasPrice) {
      out.price = patch.price == null || !Number.isFinite(patch.price) ? 0 : patch.price;
    }
    if (hasImage) out.image_url = patch.image_url ?? null;
  }
  return out;
}

export async function loadRowsForBinding(
  binding: SectionDataBindingDTO,
): Promise<CatalogRenderResult> {
  return hydrateBinding(binding);
}

export async function updateCatalogRow(
  table: string,
  id: string,
  patch: EditableRowPatch,
): Promise<boolean> {
  if (!KNOWN_TABLES.has(table)) {
    console.warn('[catalogRowService] refusing unknown table', table);
    return false;
  }
  const payload = normalizePatch(table, patch);
  if (Object.keys(payload).length === 0) return true;
  const { error } = await supabase
    .from(table as never)
    .update(payload as never)
    .eq('id', id);
  if (error) {
    console.warn('[catalogRowService] update failed', table, id, error);
    return false;
  }
  return true;
}

export async function createCatalogRow(
  table: string,
  businessId: string,
  patch: EditableRowPatch,
): Promise<{ id: string } | null> {
  if (!KNOWN_TABLES.has(table)) {
    console.warn('[catalogRowService] refusing unknown table', table);
    return null;
  }
  if (!businessId) {
    console.warn('[catalogRowService] create requires businessId');
    return null;
  }
  const base = normalizePatch(table, {
    name: patch.name ?? 'New item',
    description: patch.description ?? null,
    price: patch.price ?? 0,
    image_url: patch.image_url ?? null,
  });
  const row: Record<string, unknown> = { ...base, business_id: businessId };
  const { data, error } = await supabase
    .from(table as never)
    .insert(row as never)
    .select('id')
    .single();
  if (error || !data) {
    console.warn('[catalogRowService] create failed', table, error);
    return null;
  }
  return { id: String((data as { id: string }).id) };
}

export async function deleteCatalogRow(
  table: string,
  id: string,
): Promise<boolean> {
  if (!KNOWN_TABLES.has(table)) {
    console.warn('[catalogRowService] refusing unknown table', table);
    return false;
  }
  const { error } = await supabase
    .from(table as never)
    .delete()
    .eq('id', id);
  if (error) {
    console.warn('[catalogRowService] delete failed', table, id, error);
    return false;
  }
  return true;
}
