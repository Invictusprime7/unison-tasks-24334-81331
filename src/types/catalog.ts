/**
 * Universal Catalog Types — Track B
 *
 * A single normalized shape (`CatalogItemDTO`) that every generated site
 * consumes, regardless of the underlying vertical table (services,
 * products, and — later — menu_items, classes, rooms, packages…).
 *
 * The runtime layer (`catalogRuntimeService`) is responsible for reading
 * from the correct Supabase table for a given business+industry and
 * projecting the row into this DTO. Site templates never touch the
 * vertical tables directly.
 */

export type CatalogKind =
  | 'service'
  | 'product'
  | 'menu_item'
  | 'class'
  | 'room'
  | 'package';

export interface CatalogItemDTO {
  id: string;
  businessId: string;
  kind: CatalogKind;
  name: string;
  description?: string | null;
  /** Price in the smallest currency unit (cents). */
  priceCents?: number | null;
  currency: string;
  imageUrl?: string | null;
  active: boolean;
  /** Duration only meaningful for kinds that consume time (service, class). */
  durationMinutes?: number | null;
  /** Optional category/tag for grouping in UI. */
  category?: string | null;
  /** Structured extras that don't warrant top-level fields. */
  metadata: Record<string, unknown>;
  updatedAt?: string | null;
  /** The exact Supabase source table this row came from. */
  source: 'services' | 'products';
}

/** Industries → the catalog kinds that appear on their generated sites. */
export const INDUSTRY_CATALOG_KINDS: Record<string, CatalogKind[]> = {
  salon: ['service'],
  'local-service': ['service'],
  contractor: ['service'],
  fitness: ['service', 'class'],
  coaching: ['service', 'package'],
  restaurant: ['menu_item'],
  retail: ['product'],
  ecommerce: ['product'],
  automotive: ['service'],
  'real-estate': ['product'],
  nonprofit: ['package'],
};

export function catalogKindsForIndustry(industry?: string | null): CatalogKind[] {
  if (!industry) return ['service', 'product'];
  const key = industry.toLowerCase();
  return INDUSTRY_CATALOG_KINDS[key] ?? ['service', 'product'];
}

export function isPricedKind(kind: CatalogKind): boolean {
  return kind !== 'room';
}

export function formatPrice(item: CatalogItemDTO, locale = 'en-US'): string {
  if (item.priceCents == null) return '';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: item.currency || 'USD',
    }).format(item.priceCents / 100);
  } catch {
    return `${(item.priceCents / 100).toFixed(2)} ${item.currency}`;
  }
}
