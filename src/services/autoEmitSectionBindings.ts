/**
 * autoEmitSectionBindings — Track B, Pass 2. (Milestone 1 refactor)
 *
 * All naming / kind / table / filter / sort / limit / display-mapping data
 * now comes from the canonical `catalogSurfaceRegistry`. This file is a
 * thin walker that maps snapshot section-types → registry surfaces →
 * `site_data_bindings` rows.
 */
import { upsertBinding } from '@/services/sectionDataBindingService';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import {
  buildDisplayMappingForBinding,
  CATALOG_SURFACES,
  getCatalogSurface,
  type CatalogKind,
} from '@/platform/core/catalogSurfaceRegistry';
import type { SectionDataFallback } from '@/types/catalog';

/**
 * Legacy export. Consumers should call `getCatalogSurface(rawType)` directly.
 * We synthesize the old (wizard-type → componentType) map from the registry
 * so any existing importers still resolve correctly.
 */
export const WIZARD_TYPE_TO_REQUIREMENT: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const surface of Object.values(CATALOG_SURFACES)) {
    const spellings = new Set<string>([
      surface.surfaceId,
      surface.componentType,
      ...surface.aliases,
    ]);
    for (const s of spellings) {
      out[s.toLowerCase().replace(/[-\s]/g, '_')] = surface.componentType;
    }
  }
  return out;
})();

/**
 * Build the sectionId → componentType map used by inspector/readiness panels.
 * Mirrors the emission scheme: `${surface.bindingPrefix}-${index}`.
 */
export function buildSectionTypeMap(
  snapshot: SiteBundleSnapshot | null | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  const pages = snapshot?.pageRegistry?.pages;
  if (!pages) return map;
  for (const page of Object.values(pages)) {
    const sectionTypes = (page as unknown as { sectionTypes?: unknown }).sectionTypes;
    if (!Array.isArray(sectionTypes)) continue;
    for (let index = 0; index < sectionTypes.length; index++) {
      const raw = String(sectionTypes[index] ?? '').trim();
      const surface = getCatalogSurface(raw);
      if (!surface) continue;
      map[`${surface.bindingPrefix}-${index}`] = surface.componentType;
    }
  }
  return map;
}

export interface AutoEmitOptions {
  businessId: string;
  projectId: string;
  snapshot: SiteBundleSnapshot;
  defaultFilters?: Partial<Record<CatalogKind, Record<string, unknown>>>;
  defaultFallback?: SectionDataFallback;
  defaultLimit?: number;
}

export interface AutoEmitResult {
  emitted: number;
  skipped: number;
  errors: number;
  bindingIds: string[];
}

export interface PlannedSectionDataBinding {
  snapshotId: string;
  pagePath: string;
  sectionId: string;
  slotKey: null;
  bindingType: 'section';
  sourceKind: CatalogKind;
  sourceTable: string;
  collectionId: null;
  filters: Record<string, unknown>;
  sort: { field?: string; direction?: 'asc' | 'desc' };
  limitCount: number;
  displayMapping: Record<string, unknown>;
  fallbackMode: SectionDataFallback;
}

/**
 * Phase 2: the snapshot walk now lives in `artifactHydrationPlan`, which covers
 * catalog AND business-profile artifacts in one pass. This stays the catalog
 * projection of that plan, so section ids and binding payloads are unchanged.
 */
export function planSectionDataBindings(
  snapshot: SiteBundleSnapshot | null | undefined,
): PlannedSectionDataBinding[] {
  return plannedBindingsFromHydration(planArtifactHydration(snapshot));
}


export async function autoEmitSectionBindings(
  opts: AutoEmitOptions,
): Promise<AutoEmitResult> {
  const {
    businessId,
    projectId,
    snapshot,
    defaultFilters = {},
    defaultFallback,
    defaultLimit,
  } = opts;

  const result: AutoEmitResult = { emitted: 0, skipped: 0, errors: 0, bindingIds: [] };
  if (!businessId || !projectId || !snapshot?.pageRegistry?.pages) return result;

  const plannedBindings = planSectionDataBindings(snapshot);
  for (const binding of plannedBindings) {
    const fallbackDefault = binding.fallbackMode === 'hide_section'
      ? 'hide_section'
      : defaultFallback ?? binding.fallbackMode;
    try {
      const dto = await upsertBinding({
        businessId,
        projectId,
        ...binding,
        filters:
          defaultFilters[binding.sourceKind] ?? binding.filters,
        limitCount: defaultLimit ?? binding.limitCount,
        fallbackMode: fallbackDefault,
      });

      if (dto) {
        result.emitted++;
        result.bindingIds.push(dto.id);
      } else {
        result.errors++;
      }
    } catch (e) {
      console.warn('[autoEmitSectionBindings] upsert failed', {
        pagePath: binding.pagePath,
        sectionId: binding.sectionId,
        error: e,
      });
      result.errors++;
    }
  }

  if (result.emitted > 0) {
    console.info('[autoEmitSectionBindings] emitted bindings', {
      projectId,
      snapshotId: snapshot.snapshotId,
      ...result,
    });
  }
  return result;
}
