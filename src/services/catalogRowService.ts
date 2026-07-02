/**
 * catalogRowService — Track B Pass 5 (two-way).
 *
 * Thin CRUD over the underlying catalog tables (services, products, menu_items,
 * pricing_plans) so the Builder's Connected Data panel can edit rows inline
 * without the caller knowing the table's exact column set. All writes are
 * scoped by business_id at the RLS layer.
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
  // Strip undefined so we don't null out untouched columns.
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) payload[k] = v;
  }
  if (Object.keys(payload).length === 0) return true;
  const { error } = await supabase
    .from(table as never)
    .update(payload)
    .eq('id', id);
  if (error) {
    console.warn('[catalogRowService] update failed', table, id, error);
    return false;
  }
  return true;
}
