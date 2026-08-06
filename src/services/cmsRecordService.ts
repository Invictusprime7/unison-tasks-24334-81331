import { supabase } from '@/integrations/supabase/client';
import { getCatalogSurface, type CatalogSurface } from '@/platform/core/catalogSurfaceRegistry';

export type CmsRecordAction = 'list' | 'get' | 'create' | 'update' | 'delete';

export interface CmsRecordRequest {
  action: CmsRecordAction;
  businessId: string;
  projectId?: string | null;
  siteId?: string | null;
  resource: string;
  recordId?: string;
  values?: Record<string, unknown>;
}

interface CmsRecordResponse {
  success: boolean;
  resource: string;
  records?: Array<Record<string, unknown>>;
  record?: Record<string, unknown>;
  error?: string;
}

function resolveResource(resource: string): CatalogSurface {
  const surface = getCatalogSurface(resource);
  if (!surface || surface.editableFields.length === 0) {
    throw new Error(`Unknown or non-editable CMS resource: ${resource}`);
  }
  return surface;
}

export async function mutateCmsRecord(request: CmsRecordRequest): Promise<CmsRecordResponse> {
  const surface = resolveResource(request.resource);
  const { data, error } = await supabase.functions.invoke('cms-records', {
    body: {
      ...request,
      resource: surface.surfaceId,
      projectId: request.projectId ?? undefined,
      siteId: request.siteId ?? undefined,
    },
  });
  const response = (data ?? {}) as CmsRecordResponse;
  if (error) throw new Error(error.message || 'CMS request failed');
  if (!response.success) throw new Error(response.error || 'CMS request failed');
  return response;
}

export async function listCmsRecords(input: {
  businessId: string;
  projectId?: string | null;
  siteId?: string | null;
  resource: string;
}): Promise<Array<Record<string, unknown>>> {
  const response = await mutateCmsRecord({ action: 'list', ...input });
  return response.records ?? [];
}

export async function getCmsRecord(input: {
  businessId: string;
  projectId?: string | null;
  siteId?: string | null;
  resource: string;
  recordId: string;
}): Promise<Record<string, unknown>> {
  const response = await mutateCmsRecord({ action: 'get', ...input });
  if (!response.record) throw new Error('CMS did not return the requested record');
  return response.record;
}

export async function createCmsRecord(input: {
  businessId: string;
  projectId?: string | null;
  siteId?: string | null;
  resource: string;
  values: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const response = await mutateCmsRecord({ action: 'create', ...input });
  if (!response.record) throw new Error('CMS did not return the created record');
  return response.record;
}

export async function updateCmsRecord(input: {
  businessId: string;
  projectId?: string | null;
  siteId?: string | null;
  resource: string;
  recordId: string;
  values: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const response = await mutateCmsRecord({ action: 'update', ...input });
  if (!response.record) throw new Error('CMS did not return the updated record');
  return response.record;
}

export async function removeCmsRecord(input: {
  businessId: string;
  projectId?: string | null;
  siteId?: string | null;
  resource: string;
  recordId: string;
}): Promise<void> {
  await mutateCmsRecord({ action: 'delete', ...input });
}