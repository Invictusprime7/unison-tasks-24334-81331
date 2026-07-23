/**
 * Universal Catalog Runtime — type contracts (thin adapter over the registry).
 *
 * Real definitions live in `@/platform/core/catalogSurfaceRegistry`. This
 * file exists only to keep long-standing import paths (`@/types/catalog`)
 * working. Do NOT add new maps here — extend the registry instead.
 */

import {
  CATALOG_KIND_TO_TABLE as REGISTRY_KIND_TO_TABLE,
  CATALOG_SURFACES,
  getCatalogSurface,
  isHydratableSectionType,
  type CatalogFallbackMode,
  type CatalogKind,
  type CatalogSourceTable,
} from '@/platform/core/catalogSurfaceRegistry';

// Re-export the primitive types.
export type { CatalogKind, CatalogSourceTable };

/** Legacy alias name preserved for old imports. */
export type SectionDataFallback = CatalogFallbackMode;
export type BindingType = 'section' | 'slot' | 'card';

export interface CatalogBindingPresentation {
  showImage: boolean;
  showDescription: boolean;
  showPrice: boolean;
  showCTA: boolean;
  imageAspectRatio?: string;
  layout?: string;
  typography?: string;
  alignment?: string;
  ctaStyle?: string;
  featuredBadge?: boolean;
  [key: string]: unknown;
}

export interface CatalogBindingActions {
  primary?: 'cart.add' | 'booking.start' | 'quote.request';
  secondary?: 'catalog.view_details';
}

/**
 * Canonical binding for a single rendered catalog card. Content remains in
 * the catalog row; this object only identifies that row and its local view.
 */
export interface CatalogBinding {
  type: 'catalog.item';
  itemId: string;
  presentation: CatalogBindingPresentation;
  actions: CatalogBindingActions;
}

/** kind → table map. Now sourced from catalogSurfaceRegistry. */
export const CATALOG_KIND_TO_TABLE = REGISTRY_KIND_TO_TABLE; // from catalogSurfaceRegistry

export interface CatalogCollectionDTO {
  id: string;
  businessId: string;
  projectId: string | null;
  kind: CatalogKind;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  rules: Record<string, unknown>;
  manualItemIds: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDataBindingDTO {
  id: string;
  businessId: string;
  projectId: string;
  snapshotId: string | null;
  pagePath: string;
  sectionId: string;
  slotKey: string | null;
  bindingType: BindingType;
  sourceKind: CatalogKind;
  sourceTable: string;
  collectionId: string | null;
  filters: Record<string, unknown>;
  sort: { field?: string; direction?: 'asc' | 'desc' };
  limitCount: number | null;
  displayMapping: Record<string, unknown>;
  fallbackMode: SectionDataFallback;
  createdAt: string;
  updatedAt: string;
}

/**
 * Legacy shape. Prefer `getCatalogSurface(sectionType)` from the registry.
 * We synthesize a requirement per registry surface so existing callers
 * (readiness, autoEmit) can keep working.
 */
export interface SectionDataRequirement {
  sectionType: string;
  requiredKind: CatalogKind;
  minRows: number;
  emptyState: SectionDataFallback;
  supportedIntents: string[];
}

export const SECTION_DATA_REQUIREMENTS: Record<string, SectionDataRequirement> = // from catalogSurfaceRegistry
  (() => {
  const out: Record<string, SectionDataRequirement> = {};
  for (const surface of Object.values(CATALOG_SURFACES)) {
    out[surface.componentType] = {
      sectionType: surface.componentType,
      requiredKind: surface.catalogKind,
      minRows: surface.minRows,
      emptyState: surface.fallbackMode,
      supportedIntents: [...surface.supportedIntents],
    };
  }
  return out;
})();

export function requirementForSection(
  sectionType: string,
): SectionDataRequirement | null {
  const surface = getCatalogSurface(sectionType);
  if (!surface) return null;
  return SECTION_DATA_REQUIREMENTS[surface.componentType] ?? null;
}

export { isHydratableSectionType };
