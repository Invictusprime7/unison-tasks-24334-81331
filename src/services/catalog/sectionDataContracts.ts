/**
 * Section ↔ catalog data contracts — thin adapter over the registry.
 *
 * Real definitions live in `@/platform/core/catalogSurfaceRegistry`. This
 * file exists so readiness code / Business Center / repair actions can keep
 * importing from `@/services/catalog/sectionDataContracts` without breaking.
 */

import {
  CATALOG_SURFACES,
  getCatalogSurface,
  type CatalogSourceTable,
} from '@/platform/core/catalogSurfaceRegistry';
import {
  rankCatalogSurfaces,
  type CatalogRankingContext,
} from '@/services/catalog/catalogCapabilityResolution';

export type { CatalogRankingContext };

export type { CatalogSourceTable };

export type EmptyStateBehavior =
  | 'placeholder-cards'
  | 'hide-section'
  | 'sample-copy';

export interface SectionDataContract {
  sectionType: string;      // componentType (canonical)
  friendlyName: string;
  rowLabel: string;
  requiredDataType:
    | 'service' | 'product' | 'menu-item' | 'pricing-plan'
    | 'offer' | 'testimonial' | 'portfolio-project' | 'availability-slot';
  sourceTable: CatalogSourceTable;
  minRows: number;
  emptyState: EmptyStateBehavior;
  editPath: string;
  bindingIdPrefix: string;
}

const KIND_TO_LEGACY_DATA_TYPE: Record<string, SectionDataContract['requiredDataType']> = {
  service: 'service',
  product: 'product',
  menu_item: 'menu-item',
  pricing_plan: 'pricing-plan',
  offer: 'offer',
  testimonial: 'testimonial',
  project: 'portfolio-project',
  availability_slot: 'availability-slot',
};

const FALLBACK_TO_EMPTY_STATE: Record<string, EmptyStateBehavior> = {
  empty_state: 'placeholder-cards',
  hide_section: 'hide-section',
  show_placeholder: 'sample-copy',
};

/**
 * Registry keyed by the canonical `componentType` (ServiceGrid, ProductGrid…).
 * Consumers that lookup with legacy names (ServicesGrid, Portfolio, Menu…)
 * should call `getSectionContract(name)` which routes through the alias index.
 */
export const SECTION_DATA_CONTRACTS: Record<string, SectionDataContract> = // from catalogSurfaceRegistry
  (() => {
  const out: Record<string, SectionDataContract> = {};
  for (const surface of Object.values(CATALOG_SURFACES)) {
    out[surface.componentType] = {
      sectionType: surface.componentType,
      friendlyName: surface.friendlyName,
      rowLabel: surface.rowLabel,
      requiredDataType: KIND_TO_LEGACY_DATA_TYPE[surface.catalogKind] ?? 'service',
      sourceTable: surface.sourceTable,
      minRows: surface.minRows,
      emptyState: FALLBACK_TO_EMPTY_STATE[surface.fallbackMode] ?? 'placeholder-cards',
      editPath: surface.editorRoute,
      bindingIdPrefix: surface.bindingPrefix,
    };
  }
  return out;
})();

export function getSectionContract(sectionType: string): SectionDataContract | undefined {
  const surface = getCatalogSurface(sectionType);
  if (!surface) return undefined;
  return SECTION_DATA_CONTRACTS[surface.componentType];
}

/**
 * Suggests contracts for a site. EVERY catalog surface is available to every
 * industry — industry is only a ranking hint, selection + capabilities decide.
 * Ordering comes from `rankCatalogSurfaces`.
 */
export function suggestSectionContracts(
  ctx: CatalogRankingContext = {},
): SectionDataContract[] {
  return rankCatalogSurfaces(ctx)
    .map(({ surface }) => SECTION_DATA_CONTRACTS[surface.componentType])
    .filter(Boolean);
}

/**
 * @deprecated Industry is a hint, not a gate. Prefer `suggestSectionContracts`
 * with wizard selections + capabilities. Returns all surfaces, industry-ranked.
 */
export function contractsForIndustry(industry: string): SectionDataContract[] {
  return suggestSectionContracts({ industry });
}

