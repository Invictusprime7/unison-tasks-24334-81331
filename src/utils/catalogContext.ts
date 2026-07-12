/**
 * catalogContext — M6 (AI Catalog Intelligence Pass).
 *
 * Builds a structured "catalogContext" block for the AI Builder (Lane B /
 * Stage 4b). The assistant uses this to know:
 *   - which business + project + industry it is editing,
 *   - what section the user has selected (surfaceId / componentType / table),
 *   - live row counts per surface (so it can decide seed vs. edit),
 *   - existing bindings (so it patches instead of upserts),
 *   - which surfaces are supported and which intents each surface may bind to.
 *
 * This context is intentionally structured — downstream we render it into
 * the prompt as JSON so the model can echo values back verbatim in tool
 * calls (see `catalogOperations.CATALOG_OPERATION_TOOLS`).
 */

import { supabase } from '@/integrations/supabase/client';
import {
  CATALOG_SURFACES,
  getCatalogSurface,
  type CatalogSourceTable,
  type CatalogSurface,
} from '@/platform/core/catalogSurfaceRegistry';
import { listBindingsForProject } from '@/services/sectionDataBindingService';
import type { SectionDataBindingDTO } from '@/types/catalog';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectedSectionRef {
  sectionId: string;
  surfaceId?: string;
  componentType?: string;
  /** Optional page path for locating the site_data_bindings row. */
  pagePath?: string;
  slotKey?: string | null;
}

export interface SelectedSectionContext {
  sectionId: string;
  surfaceId: string;
  componentType: string;
  sourceTable: CatalogSourceTable;
  catalogKind: string;
  supportedIntents: string[];
  pagePath?: string;
  slotKey?: string | null;
  existingBindingId?: string;
}

export interface CatalogSurfaceSummary {
  surfaceId: string;
  catalogKind: string;
  sourceTable: CatalogSourceTable;
  componentType: string;
  priceColumn: { name: string; unit: 'cents' | 'dollars' } | null;
  editorRoute: string;
  aliases: string[];
  editableFields: { key: string; type: string; required?: boolean }[];
  supportedIntents: string[];
  defaultLimit: number;
  defaultSort: { field: string; direction: 'asc' | 'desc' };
  fallbackMode: string;
}

export interface CatalogContextBlock {
  businessId: string | null;
  projectId: string | null;
  industry: string | null;
  selectedSection: SelectedSectionContext | null;
  rowCounts: Record<string, number>;
  activeBindings: {
    id: string;
    pagePath: string;
    sectionId: string;
    surfaceId: string | null;
    sourceTable: string;
    collectionId: string | null;
    limitCount: number | null;
    filters: Record<string, unknown>;
    sort: { field?: string; direction?: 'asc' | 'desc' };
    fallbackMode: string;
  }[];
  supportedSurfaces: string[];
  supportedIntentsBySurface: Record<string, string[]>;
  registry: CatalogSurfaceSummary[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function surfaceIdForSection(
  ref: SelectedSectionRef,
): CatalogSurface | null {
  if (ref.surfaceId) {
    const s = getCatalogSurface(ref.surfaceId);
    if (s) return s;
  }
  if (ref.componentType) {
    const s = getCatalogSurface(ref.componentType);
    if (s) return s;
  }
  // sectionId is often "<surface>-N" e.g. "services-0"
  const guess = ref.sectionId.split(/[-_]/)[0];
  if (guess) {
    const s = getCatalogSurface(guess);
    if (s) return s;
  }
  return null;
}

async function loadRowCounts(businessId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const surfaces = Object.values(CATALOG_SURFACES);
  await Promise.all(
    surfaces.map(async (s) => {
      const { count, error } = await supabase
        .from(s.sourceTable as never)
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId);
      out[s.surfaceId] = error ? 0 : count ?? 0;
    }),
  );
  return out;
}

function summarizeSurface(s: CatalogSurface): CatalogSurfaceSummary {
  const priceColumn = s.fields.priceCents
    ? { name: s.fields.priceCents, unit: 'cents' as const }
    : s.fields.price
      ? { name: s.fields.price, unit: 'dollars' as const }
      : null;
  return {
    surfaceId: s.surfaceId,
    catalogKind: s.catalogKind,
    sourceTable: s.sourceTable,
    componentType: s.componentType,
    priceColumn,
    editorRoute: s.editorRoute,
    aliases: [...s.aliases],
    editableFields: s.editableFields.map((f) => ({
      key: f.key,
      type: f.type,
      required: f.required,
    })),
    supportedIntents: [...s.supportedIntents],
    defaultLimit: s.defaultLimit,
    defaultSort: s.defaultSort,
    fallbackMode: s.fallbackMode,
  };
}

function surfaceIdForBinding(b: SectionDataBindingDTO): string | null {
  const surfaces = Object.values(CATALOG_SURFACES);
  return surfaces.find((s) => s.sourceTable === b.sourceTable)?.surfaceId ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public
// ─────────────────────────────────────────────────────────────────────────────

export async function buildCatalogContext(input: {
  businessId: string | null;
  projectId: string | null;
  industry?: string | null;
  selectedSection?: SelectedSectionRef | null;
}): Promise<CatalogContextBlock> {
  const surfaces = Object.values(CATALOG_SURFACES);
  const supportedIntentsBySurface: Record<string, string[]> = {};
  for (const s of surfaces) supportedIntentsBySurface[s.surfaceId] = [...s.supportedIntents];

  const [rowCounts, bindings] = await Promise.all([
    input.businessId ? loadRowCounts(input.businessId) : Promise.resolve({} as Record<string, number>),
    input.projectId ? listBindingsForProject(input.projectId) : Promise.resolve([] as SectionDataBindingDTO[]),
  ]);

  let selected: SelectedSectionContext | null = null;
  if (input.selectedSection) {
    const surface = surfaceIdForSection(input.selectedSection);
    if (surface) {
      const existing = bindings.find(
        (b) =>
          b.sectionId === input.selectedSection!.sectionId &&
          (input.selectedSection!.pagePath ? b.pagePath === input.selectedSection!.pagePath : true) &&
          (input.selectedSection!.slotKey === undefined
            ? true
            : (b.slotKey ?? null) === (input.selectedSection!.slotKey ?? null)),
      );
      selected = {
        sectionId: input.selectedSection.sectionId,
        surfaceId: surface.surfaceId,
        componentType: surface.componentType,
        sourceTable: surface.sourceTable,
        catalogKind: surface.catalogKind,
        supportedIntents: [...surface.supportedIntents],
        pagePath: input.selectedSection.pagePath,
        slotKey: input.selectedSection.slotKey ?? null,
        existingBindingId: existing?.id,
      };
    }
  }

  return {
    businessId: input.businessId,
    projectId: input.projectId,
    industry: input.industry ?? null,
    selectedSection: selected,
    rowCounts,
    activeBindings: bindings.map((b) => ({
      id: b.id,
      pagePath: b.pagePath,
      sectionId: b.sectionId,
      surfaceId: surfaceIdForBinding(b),
      sourceTable: b.sourceTable,
      collectionId: b.collectionId,
      limitCount: b.limitCount,
      filters: b.filters,
      sort: b.sort,
      fallbackMode: b.fallbackMode,
    })),
    supportedSurfaces: surfaces.map((s) => s.surfaceId),
    supportedIntentsBySurface,
    registry: surfaces.map(summarizeSurface),
  };
}

/**
 * Render the CatalogContextBlock as a prompt-friendly string (JSON body plus
 * the hard rules the assistant must obey). This is what Lane B / Stage 4b
 * appends to `buildWebBuilderAIContext`.
 */
export function renderCatalogContextForPrompt(ctx: CatalogContextBlock): string {
  const rules = [
    '\n=== CATALOG CONTEXT (structured — DO NOT reword) ===',
    'catalogContext = ' + JSON.stringify(ctx, null, 2),
    '',
    'Hard rules for catalog & section-binding edits:',
    '- Never invent a catalog surface name. Only use values from catalogContext.supportedSurfaces.',
    '- Never invent a source table. Use the sourceTable declared for the chosen surface.',
    '- Never rename data-ut-section-type manually — sections are wired via site_data_bindings, not string edits.',
    '- Never change backend content (products/services/menu items/pricing/offers/testimonials/portfolio) by hardcoding card text in TSX. Propose a catalog operation instead.',
    '- Use the catalog operations tools for row edits:',
    '    createCatalogRow / updateCatalogRow / deleteCatalogRow',
    '- Use the catalog operations tools for data-source edits:',
    '    updateSectionBinding / switchSectionCollection / changeSectionLimit / changeSectionSort / changeSectionFallback',
    '- Prices in updateCatalogRow/createCatalogRow patches are in DOLLARS; the service converts to price_cents where the surface requires it.',
    '- Only bind CTAs to intents listed in catalogContext.supportedIntentsBySurface for the surface being edited, and only to canonical intents from the CoreIntents registry.',
    '- When an existing binding already exists for the selected section, PATCH it (updateSectionBinding with locator.bindingId); do NOT create a duplicate.',
    '=== END CATALOG CONTEXT ===',
  ];
  return rules.join('\n');
}
