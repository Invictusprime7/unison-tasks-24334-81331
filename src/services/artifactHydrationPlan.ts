/**
 * artifactHydrationPlan — Phase 2 of the Business Runtime program.
 *
 * ONE walk of a `SiteBundleSnapshot` that answers, for every section on every
 * page: *where does this artifact's content come from at runtime, and is that
 * source actually ready?*
 *
 * Before this module the answer was split in half:
 *   - `autoEmitSectionBindings` knew about catalog-backed sections only
 *     (services, products, testimonials, …) and emitted `site_data_bindings`.
 *   - Business-profile-backed sections (hero, about, contact, footer, navbar)
 *     had no plan at all, so they silently kept rendering generation-time seed
 *     copy — fake phone numbers, placeholder addresses — even when a real
 *     business profile existed.
 *
 * The artifact registry (Phase 3) already knows both cases, so this planner
 * derives everything from `resolveArtifact` and never restates a table name,
 * field list, row minimum or fallback mode.
 *
 * Additive by contract: this module only reads. It emits a plan; callers decide
 * what to do with it. Catalog section ids are produced with the exact same
 * scheme `autoEmitSectionBindings` already uses (`${bindingPrefix}-${index}`),
 * so plans and existing `site_data_bindings` rows line up 1:1.
 */

import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import {
  resolveArtifact,
  type ArtifactDataSourceKind,
  type BusinessProfileField,
  type ResolvedArtifact,
} from '@/platform/core/artifactRegistry';
import {
  buildDisplayMappingForBinding,
  getCatalogSurface,
} from '@/platform/core/catalogSurfaceRegistry';
import type { PlannedSectionDataBinding } from '@/services/autoEmitSectionBindings';
import type { BusinessProfileDTO } from '@/types/businessProfile';
import type { CatalogSourceTable } from '@/platform/core/catalogSurfaceRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// Plan
// ─────────────────────────────────────────────────────────────────────────────

export interface ArtifactHydrationEntry {
  pageId: string;
  pagePath: string;
  sectionIndex: number;
  /** Stable id shared with `site_data_bindings.section_id`. */
  sectionId: string;
  /** The spelling that appeared in the snapshot, before registry resolution. */
  rawSectionType: string;
  /** `null` when the snapshot names a section the registry does not know. */
  artifact: ResolvedArtifact | null;
  dataSourceKind: ArtifactDataSourceKind | 'unknown';
  /** Catalog tables that must hold rows for this artifact to render live data. */
  requiredTables: readonly CatalogSourceTable[];
  /** Business-profile fields this artifact reads. Empty for non-profile sources. */
  profileFields: readonly BusinessProfileField[];
  minRows: number;
  /** Non-null only for catalog artifacts — feeds `upsertBinding` unchanged. */
  binding: PlannedSectionDataBinding | null;
}

/**
 * Section id scheme. Catalog artifacts keep the historical
 * `${bindingPrefix}-${index}` so existing binding rows resolve; everything else
 * uses `${componentType}-${index}`, which is the same shape.
 */
function sectionIdFor(artifact: ResolvedArtifact | null, raw: string, index: number): string {
  if (artifact?.catalogSurface) return `${artifact.catalogSurface.bindingPrefix}-${index}`;
  if (artifact) return `${artifact.componentType}-${index}`;
  return `${raw || 'Section'}-${index}`;
}

function bindingFor(
  snapshot: SiteBundleSnapshot,
  artifact: ResolvedArtifact | null,
  pagePath: string,
  sectionId: string,
): PlannedSectionDataBinding | null {
  const surface = artifact?.catalogSurface;
  if (!surface) return null;
  return {
    snapshotId: snapshot.snapshotId,
    pagePath,
    sectionId,
    slotKey: null,
    bindingType: 'section',
    sourceKind: surface.catalogKind,
    sourceTable: surface.sourceTable,
    collectionId: null,
    filters: surface.defaultFilters,
    sort: surface.defaultSort,
    limitCount: surface.defaultLimit,
    displayMapping: buildDisplayMappingForBinding(surface),
    fallbackMode: surface.fallbackMode,
  };
}

/** Walk every page/section of a snapshot and describe its runtime data source. */
export function planArtifactHydration(
  snapshot: SiteBundleSnapshot | null | undefined,
): ArtifactHydrationEntry[] {
  const entries: ArtifactHydrationEntry[] = [];
  const pages = snapshot?.pageRegistry?.pages;
  if (!snapshot || !pages) return entries;

  for (const page of Object.values(pages)) {
    const sectionTypes = (page as unknown as { sectionTypes?: unknown }).sectionTypes;
    if (!Array.isArray(sectionTypes)) continue;
    const pagePath = page.path || `/${page.pageId}`;

    for (let index = 0; index < sectionTypes.length; index++) {
      const raw = String(sectionTypes[index] ?? '').trim();
      if (!raw) continue;

      // Prefer the artifact registry; fall back to the catalog registry alone
      // so a catalog surface that predates an artifact def is never dropped.
      const artifact = resolveArtifact(raw);
      const legacySurface = artifact ? null : getCatalogSurface(raw);
      const sectionId = legacySurface
        ? `${legacySurface.bindingPrefix}-${index}`
        : sectionIdFor(artifact, raw, index);

      entries.push({
        pageId: page.pageId,
        pagePath,
        sectionIndex: index,
        sectionId,
        rawSectionType: raw,
        artifact,
        dataSourceKind: artifact?.dataSource.kind ?? (legacySurface ? 'catalog' : 'unknown'),
        requiredTables: artifact?.requiredTables ?? (legacySurface ? [legacySurface.sourceTable] : []),
        profileFields: artifact?.dataSource.profileFields ?? [],
        minRows: artifact?.dataSource.minRows ?? legacySurface?.minRows ?? 0,
        binding: artifact
          ? bindingFor(snapshot, artifact, pagePath, sectionId)
          : legacySurface
            ? {
                snapshotId: snapshot.snapshotId,
                pagePath,
                sectionId,
                slotKey: null,
                bindingType: 'section',
                sourceKind: legacySurface.catalogKind,
                sourceTable: legacySurface.sourceTable,
                collectionId: null,
                filters: legacySurface.defaultFilters,
                sort: legacySurface.defaultSort,
                limitCount: legacySurface.defaultLimit,
                displayMapping: buildDisplayMappingForBinding(legacySurface),
                fallbackMode: legacySurface.fallbackMode,
              }
            : null,
      });
    }
  }

  return entries;
}

/** Every catalog binding a snapshot implies — the Phase 2 input to `upsertBinding`. */
export function plannedBindingsFromHydration(
  entries: ArtifactHydrationEntry[],
): PlannedSectionDataBinding[] {
  return entries
    .map((entry) => entry.binding)
    .filter((binding): binding is PlannedSectionDataBinding => binding !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Readiness
// ─────────────────────────────────────────────────────────────────────────────

export type ArtifactHydrationBlocker =
  | 'artifact_unknown'
  | 'data_binding_missing'
  | 'catalog_rows_missing'
  | 'profile_fields_missing';

export interface ArtifactHydrationVerdict {
  sectionId: string;
  pagePath: string;
  artifactId: string | null;
  dataSourceKind: ArtifactDataSourceKind | 'unknown';
  /** True when this section can render live business data right now. */
  live: boolean;
  blockers: ArtifactHydrationBlocker[];
  /** Profile fields that are empty on the live business object. */
  missingProfileFields: BusinessProfileField[];
}

export interface ArtifactHydrationReport {
  verdicts: ArtifactHydrationVerdict[];
  /** Sections resolving from live Supabase data. */
  liveCount: number;
  /** Sections that want live data but cannot get it yet. */
  blockedCount: number;
  /** Sections that legitimately carry authored copy (no backend needed). */
  authoredCount: number;
}

function profileFieldIsEmpty(profile: BusinessProfileDTO, field: BusinessProfileField): boolean {
  const value = profile[field] as unknown;
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

export interface EvaluateArtifactHydrationInput {
  entries: ArtifactHydrationEntry[];
  /** Live business object, when one is loaded. */
  profile?: BusinessProfileDTO | null;
  /** Section ids that already have a persisted `site_data_bindings` row. */
  boundSectionIds?: Iterable<string>;
  /** Row counts per catalog table, e.g. `{ services: 4 }`. */
  rowCounts?: Partial<Record<CatalogSourceTable, number>>;
}

/**
 * Turn a plan into a per-section verdict. Deterministic and side-effect free —
 * safe to run in readiness chips, publish gates and AI context alike.
 */
export function evaluateArtifactHydration(
  input: EvaluateArtifactHydrationInput,
): ArtifactHydrationReport {
  const bound = new Set(input.boundSectionIds ?? []);
  const rowCounts = input.rowCounts ?? {};
  const profile = input.profile ?? null;

  const verdicts = input.entries.map<ArtifactHydrationVerdict>((entry) => {
    const blockers: ArtifactHydrationBlocker[] = [];
    const missingProfileFields: BusinessProfileField[] = [];

    if (entry.dataSourceKind === 'unknown') {
      blockers.push('artifact_unknown');
    }

    if (entry.dataSourceKind === 'catalog') {
      if (!bound.has(entry.sectionId)) blockers.push('data_binding_missing');
      const available = entry.requiredTables.reduce(
        (total, table) => total + (rowCounts[table] ?? 0),
        0,
      );
      if (available < entry.minRows) blockers.push('catalog_rows_missing');
    }

    if (entry.dataSourceKind === 'business-profile') {
      if (!profile) {
        blockers.push('profile_fields_missing');
        missingProfileFields.push(...entry.profileFields);
      } else {
        for (const field of entry.profileFields) {
          if (profileFieldIsEmpty(profile, field)) missingProfileFields.push(field);
        }
        if (missingProfileFields.length > 0) blockers.push('profile_fields_missing');
      }
    }

    const wantsLiveData =
      entry.dataSourceKind === 'catalog' || entry.dataSourceKind === 'business-profile';

    return {
      sectionId: entry.sectionId,
      pagePath: entry.pagePath,
      artifactId: entry.artifact?.artifactId ?? null,
      dataSourceKind: entry.dataSourceKind,
      live: wantsLiveData && blockers.length === 0,
      blockers,
      missingProfileFields,
    };
  });

  return {
    verdicts,
    liveCount: verdicts.filter((v) => v.live).length,
    blockedCount: verdicts.filter(
      (v) =>
        !v.live &&
        (v.dataSourceKind === 'catalog' || v.dataSourceKind === 'business-profile'),
    ).length,
    authoredCount: verdicts.filter(
      (v) => v.dataSourceKind === 'authored' || v.dataSourceKind === 'behavioral',
    ).length,
  };
}
