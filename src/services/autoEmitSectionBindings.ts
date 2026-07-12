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
  getCatalogSurface,
  type CatalogKind,
  type CatalogSurface,
} from '@/platform/core/catalogSurfaceRegistry';
import type { SectionDataFallback } from '@/types/catalog';

/**
 * Legacy export. Consumers should call `getCatalogSurface(rawType)` directly.
 * We synthesize the old (wizard-type → componentType) map from the registry
 * so any existing importers still resolve correctly.
 */
export const WIZARD_TYPE_TO_REQUIREMENT: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const surface of Object.values(
    // Avoid a static import cycle: read from registry via getCatalogSurface's
    // module. We do a one-shot pass over aliases here.
    (await import('@/platform/core/catalogSurfaceRegistry')).CATALOG_SURFACES,
  )) {
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

  for (const page of Object.values(snapshot.pageRegistry.pages)) {
    const pagePath = page.path || `/${page.pageId}`;
    const sectionTypes = (page as unknown as { sectionTypes?: unknown }).sectionTypes;
    if (!Array.isArray(sectionTypes) || sectionTypes.length === 0) continue;

    for (let index = 0; index < sectionTypes.length; index++) {
      const raw = String(sectionTypes[index] ?? '').trim();
      if (!raw) continue;
      const surface: CatalogSurface | null = getCatalogSurface(raw);
      if (!surface) {
        result.skipped++;
        continue;
      }

      const sectionId = `${surface.bindingPrefix}-${index}`;
      const fallbackDefault: SectionDataFallback =
        surface.fallbackMode === 'hide_section'
          ? 'hide_section'
          : defaultFallback ?? surface.fallbackMode;

      try {
        const dto = await upsertBinding({
          businessId,
          projectId,
          snapshotId: snapshot.snapshotId,
          pagePath,
          sectionId,
          bindingType: 'section',
          sourceKind: surface.catalogKind,
          sourceTable: surface.sourceTable,
          filters:
            defaultFilters[surface.catalogKind] ??
            surface.defaultFilters,
          sort: surface.defaultSort,
          limitCount: defaultLimit ?? surface.defaultLimit,
          displayMapping: buildDisplayMappingForBinding(surface),
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
          pagePath,
          sectionId,
          error: e,
        });
        result.errors++;
      }
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
