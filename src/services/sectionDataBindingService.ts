/**
 * sectionDataBindingService — persistence for site_data_bindings.
 *
 * A generated section like `home.featured-services` binds to a live catalog
 * source (services table, optionally filtered by a collection). The runtime
 * (catalogRuntime) reads these rows to hydrate the preview and the Builder
 * inspector reads them to render the "Connected Data" panel.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  CATALOG_KIND_TO_TABLE,
  type BindingType,
  type CatalogKind,
  type SectionDataBindingDTO,
  type SectionDataFallback,
} from '@/types/catalog';

interface BindingRow {
  id: string;
  business_id: string;
  project_id: string;
  snapshot_id: string | null;
  page_path: string;
  section_id: string;
  slot_key: string | null;
  binding_type: string;
  source_kind: string;
  source_table: string;
  collection_id: string | null;
  filters: unknown;
  sort: unknown;
  limit_count: number | null;
  display_mapping: unknown;
  fallback_mode: string;
  created_at: string;
  updated_at: string;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function rowToDto(row: BindingRow): SectionDataBindingDTO {
  return {
    id: row.id,
    businessId: row.business_id,
    projectId: row.project_id,
    snapshotId: row.snapshot_id,
    pagePath: row.page_path,
    sectionId: row.section_id,
    slotKey: row.slot_key,
    bindingType: (row.binding_type as BindingType) ?? 'section',
    sourceKind: row.source_kind as CatalogKind,
    sourceTable: row.source_table,
    collectionId: row.collection_id,
    filters: asRecord(row.filters),
    sort: asRecord(row.sort) as SectionDataBindingDTO['sort'],
    limitCount: row.limit_count,
    displayMapping: asRecord(row.display_mapping) as Record<string, string>,
    fallbackMode: (row.fallback_mode as SectionDataFallback) ?? 'empty_state',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLS =
  'id, business_id, project_id, snapshot_id, page_path, section_id, slot_key, binding_type, source_kind, source_table, collection_id, filters, sort, limit_count, display_mapping, fallback_mode, created_at, updated_at';

export async function listBindingsForProject(
  projectId: string,
): Promise<SectionDataBindingDTO[]> {
  if (!projectId) return [];
  const { data, error } = await supabase
    .from('site_data_bindings' as never)
    .select(COLS)
    .eq('project_id', projectId);
  if (error) {
    console.warn('[sectionDataBindingService] list failed', error);
    return [];
  }
  return (data as unknown as BindingRow[]).map(rowToDto);
}

export async function getBinding(
  projectId: string,
  pagePath: string,
  sectionId: string,
  slotKey: string | null = null,
): Promise<SectionDataBindingDTO | null> {
  let q = supabase
    .from('site_data_bindings' as never)
    .select(COLS)
    .eq('project_id', projectId)
    .eq('page_path', pagePath)
    .eq('section_id', sectionId);
  q = slotKey ? q.eq('slot_key', slotKey) : q.is('slot_key', null);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return rowToDto(data as unknown as BindingRow);
}

export interface UpsertBindingInput {
  businessId: string;
  projectId: string;
  snapshotId?: string | null;
  pagePath: string;
  sectionId: string;
  slotKey?: string | null;
  bindingType?: BindingType;
  sourceKind: CatalogKind;
  sourceTable?: string;
  collectionId?: string | null;
  filters?: Record<string, unknown>;
  sort?: { field?: string; direction?: 'asc' | 'desc' };
  limitCount?: number | null;
  displayMapping?: Record<string, string>;
  fallbackMode?: SectionDataFallback;
}

export async function upsertBinding(
  input: UpsertBindingInput,
): Promise<SectionDataBindingDTO | null> {
  const row = {
    business_id: input.businessId,
    project_id: input.projectId,
    snapshot_id: input.snapshotId ?? null,
    page_path: input.pagePath,
    section_id: input.sectionId,
    slot_key: input.slotKey ?? null,
    binding_type: input.bindingType ?? 'section',
    source_kind: input.sourceKind,
    source_table: input.sourceTable ?? CATALOG_KIND_TO_TABLE[input.sourceKind],
    collection_id: input.collectionId ?? null,
    filters: input.filters ?? {},
    sort: input.sort ?? {},
    limit_count: input.limitCount ?? null,
    display_mapping: input.displayMapping ?? {},
    fallback_mode: input.fallbackMode ?? 'empty_state',
  };
  const { data, error } = await supabase
    .from('site_data_bindings' as never)
    .upsert(row, { onConflict: 'project_id,page_path,section_id,slot_key' })
    .select(COLS)
    .maybeSingle();
  if (error) {
    console.warn('[sectionDataBindingService] upsert failed', error);
    return null;
  }
  return data ? rowToDto(data as unknown as BindingRow) : null;
}

export async function deleteBinding(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('site_data_bindings' as never)
    .delete()
    .eq('id', id);
  if (error) return false;
  return true;
}
