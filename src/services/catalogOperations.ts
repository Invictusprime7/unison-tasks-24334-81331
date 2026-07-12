/**
 * catalogOperations — the AI Builder's ONLY sanctioned surface for
 * mutating catalog rows and section→data bindings.
 *
 * Milestone 5 (AI Catalog Intelligence Pass):
 * Instead of hand-editing TSX to change card copy, prices, sort order,
 * data source or collection, the assistant proposes one of the
 * operations declared here. Every op is registry-aware:
 *   - `surfaceId` MUST be a registered surface (services/products/menu/…);
 *     legacy aliases are resolved to the canonical id.
 *   - Row patches are normalized against the surface's `fields` map so
 *     `price` lands in `price_cents` vs `price` correctly.
 *   - Binding patches route through `sectionDataBindingService.patchBindingById`
 *     and can also be located by (projectId + pagePath + sectionId [+ slotKey]).
 *
 * The `CATALOG_OPERATION_TOOLS` export is a JSON-schema catalog suitable
 * for a chat-completions/tool-calling loop. Downstream orchestrators map
 * `tool.name` → `applyCatalogOperation({ op, args })`.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  CATALOG_SURFACES,
  getCatalogSurface,
  type CatalogSurface,
} from '@/platform/core/catalogSurfaceRegistry';
import {
  createCatalogRow as createRow,
  deleteCatalogRow as deleteRow,
  updateCatalogRow as updateRow,
  type EditableRowPatch,
} from '@/services/catalogRowService';
import {
  getBinding,
  patchBindingById,
  upsertBinding,
  type BindingPatch,
  type UpsertBindingInput,
} from '@/services/sectionDataBindingService';
import type { CatalogFallbackMode } from '@/platform/core/catalogSurfaceRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CatalogOperationName =
  | 'createCatalogRow'
  | 'updateCatalogRow'
  | 'deleteCatalogRow'
  | 'updateSectionBinding'
  | 'switchSectionCollection'
  | 'changeSectionLimit'
  | 'changeSectionSort'
  | 'changeSectionFallback';

export interface CatalogRowFieldPatch {
  // Registry-normalized fields (converted per-surface):
  name?: string | null;
  description?: string | null;
  /** Price in DOLLARS. Written to price_cents (×100) or price depending on surface. */
  price?: number | null;
  image_url?: string | null;
  // Passthrough columns for advanced writes (validated against surface):
  [column: string]: unknown;
}

export interface SectionBindingLocator {
  /** Preferred: the binding row id. */
  bindingId?: string;
  /** Fallback: locate by (projectId, pagePath, sectionId, slotKey?). */
  projectId?: string;
  pagePath?: string;
  sectionId?: string;
  slotKey?: string | null;
}

export interface CatalogOperationResult {
  ok: boolean;
  op: CatalogOperationName;
  message: string;
  data?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resolveSurfaceOrFail(surfaceId: string): CatalogSurface {
  const s = getCatalogSurface(surfaceId);
  if (!s) {
    throw new Error(
      `Unknown catalog surfaceId "${surfaceId}". Registered surfaces: ${Object.keys(
        CATALOG_SURFACES,
      ).join(', ')}`,
    );
  }
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorization — enforce RLS-aligned membership BEFORE any mutation.
// The DB has RLS + is_business_member / is_project_member security-definer
// helpers; we mirror those checks client-side so the AI's tool calls fail
// fast with a friendly message instead of a raw Postgres error, and so we
// never issue a mutation the current user is not entitled to make.
// ─────────────────────────────────────────────────────────────────────────────

const UNAUTHORIZED_SIGN_IN = 'Please sign in to edit catalog data.';
const UNAUTHORIZED_BUSINESS =
  "You don't have permission to edit this business's catalog.";
const UNAUTHORIZED_PROJECT =
  "You don't have permission to edit this project's section bindings.";

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function assertBusinessAccess(
  businessId: string | null | undefined,
): Promise<string | null> {
  if (!businessId) return 'businessId is required for this catalog operation.';
  const uid = await currentUserId();
  if (!uid) return UNAUTHORIZED_SIGN_IN;
  const { data, error } = await supabase.rpc(
    'is_business_member' as never,
    { _business_id: businessId } as never,
  );
  if (error) return `Authorization check failed: ${error.message}`;
  if (data !== true) return UNAUTHORIZED_BUSINESS;
  return null;
}

async function assertProjectAccess(
  projectId: string | null | undefined,
): Promise<string | null> {
  if (!projectId) return 'projectId is required for this catalog operation.';
  const uid = await currentUserId();
  if (!uid) return UNAUTHORIZED_SIGN_IN;
  const { data, error } = await supabase.rpc(
    'is_project_member' as never,
    { _user_id: uid, _project_id: projectId } as never,
  );
  if (error) return `Authorization check failed: ${error.message}`;
  if (data !== true) return UNAUTHORIZED_PROJECT;
  return null;
}

/** Look up the owning business_id for a catalog row before mutating it. */
async function fetchRowBusinessId(
  table: string,
  rowId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from(table as never)
    .select('business_id')
    .eq('id', rowId)
    .maybeSingle();
  return (data as { business_id?: string } | null)?.business_id ?? null;
}

/** Look up the owning project/business for a binding row. */
async function fetchBindingScope(
  bindingId: string,
): Promise<{ projectId: string | null; businessId: string | null }> {
  const { data } = await supabase
    .from('site_data_bindings' as never)
    .select('project_id, business_id')
    .eq('id', bindingId)
    .maybeSingle();
  const row = data as { project_id?: string; business_id?: string } | null;
  return {
    projectId: row?.project_id ?? null,
    businessId: row?.business_id ?? null,
  };
}


/** Split a caller-supplied field patch into (editable-shape, raw-column-writes). */
function splitPatch(
  surface: CatalogSurface,
  patch: CatalogRowFieldPatch,
): { editable: EditableRowPatch; extraColumns: Record<string, unknown> } {
  const editable: EditableRowPatch = {};
  const extraColumns: Record<string, unknown> = {};
  const editableCols = new Set(surface.editableFields.map((f) => f.key));

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'name' || key === 'description' || key === 'price' || key === 'image_url') {
      (editable as Record<string, unknown>)[key] = value;
      continue;
    }
    if (editableCols.has(key)) {
      extraColumns[key] = value;
    }
  }
  return { editable, extraColumns };
}

async function locateBindingId(
  locator: SectionBindingLocator,
): Promise<string | null> {
  if (locator.bindingId) return locator.bindingId;
  if (locator.projectId && locator.pagePath && locator.sectionId) {
    const row = await getBinding(
      locator.projectId,
      locator.pagePath,
      locator.sectionId,
      locator.slotKey ?? null,
    );
    return row?.id ?? null;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row operations (M5)
// ─────────────────────────────────────────────────────────────────────────────

export async function createCatalogRow(args: {
  surfaceId: string;
  businessId: string;
  patch: CatalogRowFieldPatch;
}): Promise<CatalogOperationResult> {
  const surface = resolveSurfaceOrFail(args.surfaceId);
  const denied = await assertBusinessAccess(args.businessId);
  if (denied) return { ok: false, op: 'createCatalogRow', message: denied };
  const { editable, extraColumns } = splitPatch(surface, args.patch);
  const created = await createRow(surface.sourceTable, args.businessId, editable);
  if (!created) {
    return { ok: false, op: 'createCatalogRow', message: 'create failed' };
  }
  if (Object.keys(extraColumns).length > 0) {
    await supabase
      .from(surface.sourceTable as never)
      .update(extraColumns as never)
      .eq('id', created.id);
  }
  return {
    ok: true,
    op: 'createCatalogRow',
    message: `Created ${surface.rowLabel} in ${surface.sourceTable}`,
    data: { id: created.id, surfaceId: surface.surfaceId, table: surface.sourceTable },
  };
}

export async function updateCatalogRow(args: {
  surfaceId: string;
  rowId: string;
  patch: CatalogRowFieldPatch;
}): Promise<CatalogOperationResult> {
  const surface = resolveSurfaceOrFail(args.surfaceId);
  const ownerBusinessId = await fetchRowBusinessId(surface.sourceTable, args.rowId);
  const denied = await assertBusinessAccess(ownerBusinessId);
  if (denied) return { ok: false, op: 'updateCatalogRow', message: denied };
  const { editable, extraColumns } = splitPatch(surface, args.patch);

  const ok1 = Object.keys(editable).length === 0
    ? true
    : await updateRow(surface.sourceTable, args.rowId, editable);

  let ok2 = true;
  if (Object.keys(extraColumns).length > 0) {
    const { error } = await supabase
      .from(surface.sourceTable as never)
      .update(extraColumns as never)
      .eq('id', args.rowId);
    ok2 = !error;
  }

  return {
    ok: ok1 && ok2,
    op: 'updateCatalogRow',
    message: ok1 && ok2
      ? `Updated ${surface.rowLabel} ${args.rowId}`
      : `Partial/failed update on ${surface.sourceTable}#${args.rowId}`,
    data: { surfaceId: surface.surfaceId, table: surface.sourceTable, rowId: args.rowId },
  };
}

export async function deleteCatalogRow(args: {
  surfaceId: string;
  rowId: string;
}): Promise<CatalogOperationResult> {
  const surface = resolveSurfaceOrFail(args.surfaceId);
  const ownerBusinessId = await fetchRowBusinessId(surface.sourceTable, args.rowId);
  const denied = await assertBusinessAccess(ownerBusinessId);
  if (denied) return { ok: false, op: 'deleteCatalogRow', message: denied };
  const ok = await deleteRow(surface.sourceTable, args.rowId);
  return {
    ok,
    op: 'deleteCatalogRow',
    message: ok ? `Deleted ${surface.rowLabel} ${args.rowId}` : 'delete failed',
    data: { surfaceId: surface.surfaceId, rowId: args.rowId },
  };
}


export async function updateCatalogRow(args: {
  surfaceId: string;
  rowId: string;
  patch: CatalogRowFieldPatch;
}): Promise<CatalogOperationResult> {
  const surface = resolveSurfaceOrFail(args.surfaceId);
  const { editable, extraColumns } = splitPatch(surface, args.patch);

  const ok1 = Object.keys(editable).length === 0
    ? true
    : await updateRow(surface.sourceTable, args.rowId, editable);

  let ok2 = true;
  if (Object.keys(extraColumns).length > 0) {
    const { error } = await supabase
      .from(surface.sourceTable as never)
      .update(extraColumns as never)
      .eq('id', args.rowId);
    ok2 = !error;
  }

  return {
    ok: ok1 && ok2,
    op: 'updateCatalogRow',
    message: ok1 && ok2
      ? `Updated ${surface.rowLabel} ${args.rowId}`
      : `Partial/failed update on ${surface.sourceTable}#${args.rowId}`,
    data: { surfaceId: surface.surfaceId, table: surface.sourceTable, rowId: args.rowId },
  };
}

export async function deleteCatalogRow(args: {
  surfaceId: string;
  rowId: string;
}): Promise<CatalogOperationResult> {
  const surface = resolveSurfaceOrFail(args.surfaceId);
  const ok = await deleteRow(surface.sourceTable, args.rowId);
  return {
    ok,
    op: 'deleteCatalogRow',
    message: ok ? `Deleted ${surface.rowLabel} ${args.rowId}` : 'delete failed',
    data: { surfaceId: surface.surfaceId, rowId: args.rowId },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Binding operations (M5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The one-stop binding patcher. Prefer the specific helpers below when the
 * intent is narrow (limit/sort/collection/fallback) — this exists for
 * multi-field edits ("show only featured services, limit 3").
 */
export async function updateSectionBinding(args: {
  surfaceId: string;
  locator?: SectionBindingLocator;
  /** Full upsert input for the case where the binding does not yet exist. */
  upsert?: UpsertBindingInput;
  patch: BindingPatch;
}): Promise<CatalogOperationResult> {
  resolveSurfaceOrFail(args.surfaceId); // validate surface exists

  const id = args.locator ? await locateBindingId(args.locator) : null;
  if (id) {
    const dto = await patchBindingById(id, args.patch);
    return {
      ok: !!dto,
      op: 'updateSectionBinding',
      message: dto ? `Patched binding ${id}` : `Patch failed for binding ${id}`,
      data: dto,
    };
  }

  if (!args.upsert) {
    return {
      ok: false,
      op: 'updateSectionBinding',
      message:
        'No existing binding found and no upsert payload provided. Include upsert:{businessId,projectId,pagePath,sectionId,sourceKind}.',
    };
  }
  const dto = await upsertBinding({
    ...args.upsert,
    ...args.patch,
  });
  return {
    ok: !!dto,
    op: 'updateSectionBinding',
    message: dto ? `Upserted binding ${dto.id}` : 'upsert failed',
    data: dto,
  };
}

export async function switchSectionCollection(args: {
  surfaceId: string;
  locator: SectionBindingLocator;
  collectionId: string | null;
}): Promise<CatalogOperationResult> {
  return updateSectionBinding({
    surfaceId: args.surfaceId,
    locator: args.locator,
    patch: { collectionId: args.collectionId },
  }).then((r) => ({ ...r, op: 'switchSectionCollection' }));
}

export async function changeSectionLimit(args: {
  surfaceId: string;
  locator: SectionBindingLocator;
  limitCount: number | null;
}): Promise<CatalogOperationResult> {
  return updateSectionBinding({
    surfaceId: args.surfaceId,
    locator: args.locator,
    patch: { limitCount: args.limitCount },
  }).then((r) => ({ ...r, op: 'changeSectionLimit' }));
}

export async function changeSectionSort(args: {
  surfaceId: string;
  locator: SectionBindingLocator;
  sort: { field?: string; direction?: 'asc' | 'desc' };
}): Promise<CatalogOperationResult> {
  return updateSectionBinding({
    surfaceId: args.surfaceId,
    locator: args.locator,
    patch: { sort: args.sort },
  }).then((r) => ({ ...r, op: 'changeSectionSort' }));
}

export async function changeSectionFallback(args: {
  surfaceId: string;
  locator: SectionBindingLocator;
  fallbackMode: CatalogFallbackMode;
}): Promise<CatalogOperationResult> {
  return updateSectionBinding({
    surfaceId: args.surfaceId,
    locator: args.locator,
    patch: { fallbackMode: args.fallbackMode },
  }).then((r) => ({ ...r, op: 'changeSectionFallback' }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export async function applyCatalogOperation(
  op: CatalogOperationName,
  args: Record<string, unknown>,
): Promise<CatalogOperationResult> {
  try {
    switch (op) {
      case 'createCatalogRow':
        return await createCatalogRow(args as never);
      case 'updateCatalogRow':
        return await updateCatalogRow(args as never);
      case 'deleteCatalogRow':
        return await deleteCatalogRow(args as never);
      case 'updateSectionBinding':
        return await updateSectionBinding(args as never);
      case 'switchSectionCollection':
        return await switchSectionCollection(args as never);
      case 'changeSectionLimit':
        return await changeSectionLimit(args as never);
      case 'changeSectionSort':
        return await changeSectionSort(args as never);
      case 'changeSectionFallback':
        return await changeSectionFallback(args as never);
      default:
        return { ok: false, op, message: `Unknown catalog op "${op}"` };
    }
  } catch (err) {
    return {
      ok: false,
      op,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool schemas (for tool-calling LLM loops)
// ─────────────────────────────────────────────────────────────────────────────

const SURFACE_IDS = Object.keys(CATALOG_SURFACES);

const LOCATOR_SCHEMA = {
  type: 'object',
  description:
    'How to locate the site_data_bindings row. Prefer bindingId. Otherwise pass projectId + pagePath + sectionId (+ optional slotKey).',
  properties: {
    bindingId: { type: 'string' },
    projectId: { type: 'string' },
    pagePath: { type: 'string' },
    sectionId: { type: 'string' },
    slotKey: { type: ['string', 'null'] },
  },
} as const;

const ROW_PATCH_SCHEMA = {
  type: 'object',
  description:
    'Row patch. Use editable shape (name, description, price [dollars], image_url) OR pass raw column names declared in the surface editableFields.',
  additionalProperties: true,
  properties: {
    name: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    price: {
      type: ['number', 'null'],
      description: 'Price in DOLLARS. Auto-converted to price_cents when the surface stores cents.',
    },
    image_url: { type: ['string', 'null'] },
  },
} as const;

export const CATALOG_OPERATION_TOOLS = [
  {
    name: 'createCatalogRow',
    description:
      'Create a new row in a catalog surface (service/product/menu item/pricing plan/offer/testimonial/portfolio project).',
    parameters: {
      type: 'object',
      required: ['surfaceId', 'businessId', 'patch'],
      properties: {
        surfaceId: { type: 'string', enum: SURFACE_IDS },
        businessId: { type: 'string' },
        patch: ROW_PATCH_SCHEMA,
      },
    },
  },
  {
    name: 'updateCatalogRow',
    description:
      'Patch fields on an existing catalog row. Prices go in DOLLARS in the patch (converted to cents when needed).',
    parameters: {
      type: 'object',
      required: ['surfaceId', 'rowId', 'patch'],
      properties: {
        surfaceId: { type: 'string', enum: SURFACE_IDS },
        rowId: { type: 'string' },
        patch: ROW_PATCH_SCHEMA,
      },
    },
  },
  {
    name: 'deleteCatalogRow',
    description: 'Delete an existing catalog row.',
    parameters: {
      type: 'object',
      required: ['surfaceId', 'rowId'],
      properties: {
        surfaceId: { type: 'string', enum: SURFACE_IDS },
        rowId: { type: 'string' },
      },
    },
  },
  {
    name: 'updateSectionBinding',
    description:
      'Patch a site_data_bindings row (filters/sort/limit/collection/fallback/displayMapping). If no existing binding matches the locator, provide an `upsert` payload to create it.',
    parameters: {
      type: 'object',
      required: ['surfaceId', 'patch'],
      properties: {
        surfaceId: { type: 'string', enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        upsert: {
          type: 'object',
          properties: {
            businessId: { type: 'string' },
            projectId: { type: 'string' },
            pagePath: { type: 'string' },
            sectionId: { type: 'string' },
            slotKey: { type: ['string', 'null'] },
            sourceKind: { type: 'string' },
            sourceTable: { type: 'string' },
          },
        },
        patch: {
          type: 'object',
          properties: {
            collectionId: { type: ['string', 'null'] },
            filters: { type: 'object', additionalProperties: true },
            sort: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                direction: { type: 'string', enum: ['asc', 'desc'] },
              },
            },
            limitCount: { type: ['number', 'null'] },
            displayMapping: { type: 'object', additionalProperties: { type: 'string' } },
            fallbackMode: { type: 'string', enum: ['empty_state', 'hide_section', 'show_placeholder'] },
          },
        },
      },
    },
  },
  {
    name: 'switchSectionCollection',
    description: 'Point a bound section at a different collection (or clear with null).',
    parameters: {
      type: 'object',
      required: ['surfaceId', 'locator', 'collectionId'],
      properties: {
        surfaceId: { type: 'string', enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        collectionId: { type: ['string', 'null'] },
      },
    },
  },
  {
    name: 'changeSectionLimit',
    description: 'Set the max number of rows a bound section renders. Pass null to remove the limit.',
    parameters: {
      type: 'object',
      required: ['surfaceId', 'locator', 'limitCount'],
      properties: {
        surfaceId: { type: 'string', enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        limitCount: { type: ['number', 'null'] },
      },
    },
  },
  {
    name: 'changeSectionSort',
    description: 'Change the sort field/direction of a bound section.',
    parameters: {
      type: 'object',
      required: ['surfaceId', 'locator', 'sort'],
      properties: {
        surfaceId: { type: 'string', enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        sort: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            direction: { type: 'string', enum: ['asc', 'desc'] },
          },
        },
      },
    },
  },
  {
    name: 'changeSectionFallback',
    description: 'Change what a bound section renders when there are no rows.',
    parameters: {
      type: 'object',
      required: ['surfaceId', 'locator', 'fallbackMode'],
      properties: {
        surfaceId: { type: 'string', enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        fallbackMode: { type: 'string', enum: ['empty_state', 'hide_section', 'show_placeholder'] },
      },
    },
  },
] as const;
