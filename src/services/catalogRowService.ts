/**
 * catalogRowService — canonical CRUD over every catalog table.
 *
 * Milestone 4: the allowed-table set + payload shape now derive from the
 * `catalogSurfaceRegistry` instead of a hand-maintained list. Every table
 * declared as a `CatalogSourceTable` (services, products, menu_items,
 * pricing_plans, featured_offers, testimonials, portfolio_projects,
 * availability_slots) is supported automatically.
 *
 * Callers may still pass the generic `{ name, description, price, image_url }`
 * shape used by the classic inspector — we normalize that per-surface using
 * the registry's `fields` mapping so services/pricing_plans/menu_items land
 * in `price_cents` and products lands in `price`.
 */
import { supabase } from '@/integrations/supabase/client';
import { hydrateBinding, type CatalogRenderResult } from '@/services/catalogRuntime';
import {
  getCatalogSurface,
  getCatalogSurfaceByTable,
  type CatalogSourceTable,
  type CatalogSurface,
} from '@/platform/core/catalogSurfaceRegistry';
import type { SectionDataBindingDTO } from '@/types/catalog';

/** Legacy "inspector" patch shape. */
export interface EditableRowPatch {
  name?: string | null;
  description?: string | null;
  /** Dollars (numeric). Written into the surface's price column, converting
   *  to cents when the surface uses a `priceCents` column. */
  price?: number | null;
  image_url?: string | null;
}

function normalizePatch(
  surface: CatalogSurface,
  patch: EditableRowPatch,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const f = surface.fields;

  if (patch.name !== undefined && f.title) {
    out[f.title] = patch.name ?? '';
  }
  if (patch.description !== undefined && f.description) {
    out[f.description] = patch.description ?? null;
  }
  if (patch.image_url !== undefined && f.image) {
    out[f.image] = patch.image_url ?? null;
  }
  if (patch.price !== undefined) {
    const dollars =
      patch.price == null || !Number.isFinite(patch.price) ? 0 : patch.price;
    if (f.priceCents) {
      out[f.priceCents] = Math.round(dollars * 100);
    } else if (f.price) {
      out[f.price] = dollars;
    }
  }
  return out;
}

function resolveTable(input: string): CatalogSurface | null {
  return getCatalogSurfaceByTable(input as CatalogSourceTable) ?? getCatalogSurface(input);
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
  const surface = resolveTable(table);
  if (!surface) {
    console.warn('[catalogRowService] refusing unknown table', table);
    return false;
  }
  const payload = normalizePatch(surface, patch);
  if (Object.keys(payload).length === 0) return true;
  const { error } = await supabase
    .from(surface.sourceTable as never)
    .update(payload as never)
    .eq('id', id);
  if (error) {
    console.warn('[catalogRowService] update failed', surface.sourceTable, id, error);
    return false;
  }
  return true;
}

export async function createCatalogRow(
  table: string,
  businessId: string,
  patch: EditableRowPatch,
): Promise<{ id: string } | null> {
  const surface = resolveTable(table);
  if (!surface) {
    console.warn('[catalogRowService] refusing unknown table', table);
    return null;
  }
  if (!businessId) {
    console.warn('[catalogRowService] create requires businessId');
    return null;
  }
  const base = normalizePatch(surface, {
    name: patch.name ?? 'New item',
    description: patch.description ?? null,
    price: patch.price ?? 0,
    image_url: patch.image_url ?? null,
  });
  const row: Record<string, unknown> = {
    ...surface.newRowDefaults,
    ...base,
    business_id: businessId,
  };
  const { data, error } = await supabase
    .from(surface.sourceTable as never)
    .insert(row as never)
    .select('id')
    .single();
  if (error || !data) {
    console.warn('[catalogRowService] create failed', surface.sourceTable, error);
    return null;
  }
  return { id: String((data as { id: string }).id) };
}

export async function deleteCatalogRow(
  table: string,
  id: string,
): Promise<boolean> {
  const surface = resolveTable(table);
  if (!surface) {
    console.warn('[catalogRowService] refusing unknown table', table);
    return false;
  }
  const { error } = await supabase
    .from(surface.sourceTable as never)
    .delete()
    .eq('id', id);
  if (error) {
    console.warn('[catalogRowService] delete failed', surface.sourceTable, id, error);
    return false;
  }
  return true;
}
