/**
 * catalogRuntimeService — Track B foundation.
 *
 * The ONLY read/write path for CatalogItemDTO. Site runtimes, the Web
 * Builder's catalog attachments, readiness checks, and future
 * checkout/booking flows all funnel through here.
 *
 * Sourcing rules:
 *   - kind === 'service'          → public.services
 *   - kind === 'product'          → public.products
 *   - kind === 'menu_item'|'class'|'room'|'package'
 *                                 → public.products (with metadata.kind stamp)
 *                                   until dedicated tables land in a later pass.
 *
 * This wrapper keeps generated site code agnostic to schema evolution.
 * When new vertical tables get promoted, only this file changes.
 */

import { supabase } from '@/integrations/supabase/client';
import type { CatalogItemDTO, CatalogKind } from '@/types/catalog';
import { catalogKindsForIndustry } from '@/types/catalog';
import { loadBusinessProfile } from '@/services/businessProfileService';

// ─────────────────────────────────────────────────────────────────────────
// Row → DTO projections
// ─────────────────────────────────────────────────────────────────────────

interface ServiceRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number | null;
  is_active: boolean;
  updated_at: string;
}

interface ProductRow {
  id: string;
  business_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  currency: string | null;
  image_url: string | null;
  is_active: boolean | null;
  metadata: unknown;
  updated_at: string | null;
}

function serviceToDTO(row: ServiceRow): CatalogItemDTO {
  return {
    id: row.id,
    businessId: row.business_id,
    kind: 'service',
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    currency: 'USD',
    imageUrl: null,
    active: row.is_active,
    durationMinutes: row.duration_minutes,
    category: null,
    metadata: {},
    updatedAt: row.updated_at,
    source: 'services',
  };
}

function productToDTO(row: ProductRow): CatalogItemDTO {
  const meta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const stampedKind = (typeof meta.kind === 'string' ? meta.kind : 'product') as CatalogKind;
  return {
    id: row.id,
    businessId: row.business_id ?? '',
    kind: stampedKind,
    name: row.name,
    description: row.description,
    priceCents: Math.round((row.price ?? 0) * 100),
    currency: row.currency || 'USD',
    imageUrl: row.image_url,
    active: row.is_active ?? true,
    durationMinutes: typeof meta.durationMinutes === 'number' ? meta.durationMinutes : null,
    category: row.category,
    metadata: meta,
    updatedAt: row.updated_at,
    source: 'products',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────

const SERVICE_COLS =
  'id, business_id, name, description, duration_minutes, price_cents, is_active, updated_at';
const PRODUCT_COLS =
  'id, business_id, name, description, category, price, currency, image_url, is_active, metadata, updated_at';

export interface LoadCatalogOptions {
  /** Filter by kinds. Defaults: derived from business industry. */
  kinds?: CatalogKind[];
  /** Include inactive items (default false). */
  includeInactive?: boolean;
  /** Hard cap on returned items. Default 200. */
  limit?: number;
}

/**
 * Universal read: returns everything the generated site should render for
 * this business, industry-aware and normalized.
 */
export async function loadCatalog(
  businessId: string,
  options: LoadCatalogOptions = {},
): Promise<CatalogItemDTO[]> {
  if (!businessId) return [];
  let kinds = options.kinds;
  if (!kinds || kinds.length === 0) {
    const profile = await loadBusinessProfile(businessId);
    kinds = catalogKindsForIndustry(profile?.industry);
  }
  const limit = Math.max(1, Math.min(options.limit ?? 200, 500));
  const wantsServices = kinds.includes('service');
  const wantsProducts = kinds.some((k) => k !== 'service');

  const [svcRes, prodRes] = await Promise.all([
    wantsServices
      ? supabase
          .from('services')
          .select(SERVICE_COLS)
          .eq('business_id', businessId)
          .order('name', { ascending: true })
          .limit(limit)
      : Promise.resolve({ data: [] as ServiceRow[], error: null }),
    wantsProducts
      ? supabase
          .from('products')
          .select(PRODUCT_COLS)
          .eq('business_id', businessId)
          .order('name', { ascending: true })
          .limit(limit)
      : Promise.resolve({ data: [] as ProductRow[], error: null }),
  ]);

  if (svcRes.error) console.warn('[catalogRuntime] services load failed', svcRes.error);
  if (prodRes.error) console.warn('[catalogRuntime] products load failed', prodRes.error);

  const items: CatalogItemDTO[] = [];
  for (const row of (svcRes.data ?? []) as ServiceRow[]) items.push(serviceToDTO(row));
  for (const row of (prodRes.data ?? []) as ProductRow[]) items.push(productToDTO(row));

  const filtered = items
    .filter((i) => (options.includeInactive ? true : i.active))
    .filter((i) => (kinds!.length === 0 ? true : kinds!.includes(i.kind)));

  return filtered.slice(0, limit);
}

export async function loadCatalogItem(
  source: CatalogItemDTO['source'],
  id: string,
): Promise<CatalogItemDTO | null> {
  if (!id) return null;
  if (source === 'services') {
    const { data } = await supabase.from('services').select(SERVICE_COLS).eq('id', id).maybeSingle();
    return data ? serviceToDTO(data as ServiceRow) : null;
  }
  const { data } = await supabase.from('products').select(PRODUCT_COLS).eq('id', id).maybeSingle();
  return data ? productToDTO(data as ProductRow) : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────────────

export type CatalogItemPatch = Partial<
  Pick<
    CatalogItemDTO,
    | 'name'
    | 'description'
    | 'priceCents'
    | 'currency'
    | 'imageUrl'
    | 'active'
    | 'durationMinutes'
    | 'category'
    | 'metadata'
  >
>;

export interface UpsertCatalogItemInput {
  businessId: string;
  kind: CatalogKind;
  id?: string;
  patch: CatalogItemPatch;
}

/**
 * Upsert a catalog item. Routes to the correct backing table based on kind.
 * Returns the fresh DTO on success.
 */
export async function upsertCatalogItem(
  input: UpsertCatalogItemInput,
): Promise<CatalogItemDTO | null> {
  const { businessId, kind, id, patch } = input;
  if (!businessId) return null;

  if (kind === 'service') {
    const row: Record<string, unknown> = {
      business_id: businessId,
      name: patch.name,
      description: patch.description ?? null,
      duration_minutes: patch.durationMinutes ?? 60,
      price_cents: patch.priceCents ?? 0,
      is_active: patch.active ?? true,
    };
    if (id) row.id = id;
    const { data, error } = await supabase
      .from('services')
      .upsert(row as never)
      .select(SERVICE_COLS)
      .maybeSingle();
    if (error) {
      console.warn('[catalogRuntime] service upsert failed', error);
      return null;
    }
    return data ? serviceToDTO(data as ServiceRow) : null;
  }

  const meta = { ...(patch.metadata ?? {}), kind };
  const row: Record<string, unknown> = {
    business_id: businessId,
    name: patch.name,
    description: patch.description ?? null,
    category: patch.category ?? null,
    price: (patch.priceCents ?? 0) / 100,
    currency: patch.currency ?? 'USD',
    image_url: patch.imageUrl ?? null,
    is_active: patch.active ?? true,
    metadata: meta,
  };
  if (id) row.id = id;
  const { data, error } = await supabase
    .from('products')
    .upsert(row as never)
    .select(PRODUCT_COLS)
    .maybeSingle();
  if (error) {
    console.warn('[catalogRuntime] product upsert failed', error);
    return null;
  }
  return data ? productToDTO(data as ProductRow) : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Realtime subscription
// ─────────────────────────────────────────────────────────────────────────

export interface CatalogSubscription {
  unsubscribe(): void;
}

/**
 * Subscribes to inserts/updates/deletes on both services and products for
 * a given business. The callback is invoked with the fresh full catalog
 * so callers stay dumb and re-render.
 */
export function subscribeToCatalog(
  businessId: string,
  onChange: (items: CatalogItemDTO[]) => void,
  options: LoadCatalogOptions = {},
): CatalogSubscription {
  let disposed = false;
  const push = async () => {
    if (disposed) return;
    const items = await loadCatalog(businessId, options);
    if (!disposed) onChange(items);
  };
  void push();

  const channel = supabase
    .channel(`catalog:${businessId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'services', filter: `business_id=eq.${businessId}` },
      () => void push(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products', filter: `business_id=eq.${businessId}` },
      () => void push(),
    )
    .subscribe();

  return {
    unsubscribe() {
      disposed = true;
      supabase.removeChannel(channel);
    },
  };
}
