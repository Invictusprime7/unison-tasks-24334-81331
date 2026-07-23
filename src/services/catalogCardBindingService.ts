/**
 * Catalog card bindings keep a component instance attached to one canonical
 * catalog row. They use the existing site_data_bindings table so preview and
 * published runtime hydrate through the same tenant-scoped read path.
 */
import { getCatalogSurface, type CatalogSurface } from '@/platform/core/catalogSurfaceRegistry';
import {
  getBindingById,
  patchBindingById,
  upsertBinding,
} from '@/services/sectionDataBindingService';
import type {
  CatalogBinding,
  CatalogBindingActions,
  CatalogBindingPresentation,
  SectionDataBindingDTO,
} from '@/types/catalog';

export const CATALOG_CARD_BINDING_KEY = 'catalogBinding';

const DEFAULT_PRESENTATION: CatalogBindingPresentation = {
  showImage: true,
  showDescription: true,
  showPrice: true,
  showCTA: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readCatalogCardBinding(
  displayMapping: Record<string, unknown>,
): CatalogBinding | null {
  const value = displayMapping[CATALOG_CARD_BINDING_KEY];
  if (!isRecord(value) || value.type !== 'catalog.item' || typeof value.itemId !== 'string') {
    return null;
  }
  const presentation = isRecord(value.presentation)
    ? { ...DEFAULT_PRESENTATION, ...value.presentation }
    : { ...DEFAULT_PRESENTATION };
  const actions = isRecord(value.actions) ? value.actions as CatalogBindingActions : {};
  return {
    type: 'catalog.item',
    itemId: value.itemId,
    presentation,
    actions,
  };
}

function displayMappingWithCardBinding(
  current: Record<string, unknown>,
  binding: CatalogBinding,
): Record<string, unknown> {
  return {
    ...current,
    [CATALOG_CARD_BINDING_KEY]: binding,
  };
}

export async function upsertCatalogCardBinding(input: {
  businessId: string;
  projectId: string;
  snapshotId?: string | null;
  pagePath: string;
  componentId: string;
  slotKey?: string | null;
  surfaceId: string;
  itemId: string;
  presentation?: Partial<CatalogBindingPresentation>;
  actions?: CatalogBindingActions;
}): Promise<SectionDataBindingDTO | null> {
  const surface = getCatalogSurface(input.surfaceId);
  if (!surface) return null;
  const catalogBinding: CatalogBinding = {
    type: 'catalog.item',
    itemId: input.itemId,
    presentation: { ...DEFAULT_PRESENTATION, ...input.presentation },
    actions: input.actions ?? {},
  };
  return upsertBinding({
    businessId: input.businessId,
    projectId: input.projectId,
    snapshotId: input.snapshotId,
    pagePath: input.pagePath,
    sectionId: input.componentId,
    slotKey: input.slotKey ?? null,
    bindingType: 'card',
    sourceKind: surface.catalogKind,
    sourceTable: surface.sourceTable,
    filters: { id: input.itemId },
    sort: {},
    limitCount: 1,
    displayMapping: displayMappingWithCardBinding({}, catalogBinding),
    fallbackMode: surface.fallbackMode,
  });
}

export async function updateCatalogCardPresentation(
  bindingId: string,
  patch: Partial<CatalogBindingPresentation>,
): Promise<SectionDataBindingDTO | null> {
  return updateCatalogCardBinding(bindingId, { presentation: patch });
}

export async function updateCatalogCardBinding(
  bindingId: string,
  patch: {
    presentation?: Partial<CatalogBindingPresentation>;
    actions?: CatalogBindingActions;
  },
): Promise<SectionDataBindingDTO | null> {
  const current = await getBindingById(bindingId);
  if (!current || current.bindingType !== 'card') return null;
  const cardBinding = readCatalogCardBinding(current.displayMapping);
  if (!cardBinding) return null;
  return patchBindingById(bindingId, {
    displayMapping: displayMappingWithCardBinding(current.displayMapping, {
      ...cardBinding,
      presentation: { ...cardBinding.presentation, ...patch.presentation },
      actions: patch.actions ?? cardBinding.actions,
    }),
  });
}

export function catalogCardBindingFor(
  binding: SectionDataBindingDTO,
): CatalogBinding | null {
  return binding.bindingType === 'card'
    ? readCatalogCardBinding(binding.displayMapping)
    : null;
}