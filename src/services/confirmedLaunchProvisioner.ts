import { supabase } from '@/integrations/supabase/client';

export interface ConfirmedLaunchIds {
  businessId: string;
  siteId: string;
  projectId: string;
  draftId: string;
  buildId: string;
  bundleId: string;
}

export interface ConfirmedLaunchProvisionInput {
  ids: ConfirmedLaunchIds;
  existingBusinessId?: string | null;
  businessName: string;
  industry: string;
  siteName: string;
  siteSlug?: string | null;
  systemType: string;
  templateId?: string | null;
  themePresetId: string;
}

export interface ConfirmedLaunchProvisionOptions {
  signal?: AbortSignal;
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('Confirmed launch provisioning was cancelled.');
}

function waitWithSignal<T>(work: PromiseLike<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return Promise.resolve(work);
  if (signal.aborted) return Promise.reject(abortError(signal));
  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => reject(abortError(signal));
    signal.addEventListener('abort', handleAbort, { once: true });
    Promise.resolve(work).then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', handleAbort);
    });
  });
}

async function confirmedLaunchErrorMessage(error: unknown): Promise<string> {
  const fallback = error instanceof Error && error.message
    ? error.message
    : 'Unable to provision the confirmed site launch.';
  const context = error && typeof error === 'object'
    ? (error as { context?: unknown }).context
    : undefined;
  if (!(context instanceof Response)) return fallback;

  try {
    const body = await context.clone().json() as { error?: unknown; message?: unknown };
    if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
    if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
  } catch {
    // Fall back to the Supabase client error when the response is not JSON.
  }
  return fallback;
}

export function createConfirmedLaunchIds(existingBusinessId?: string | null): ConfirmedLaunchIds {
  return {
    businessId: existingBusinessId || crypto.randomUUID(),
    siteId: crypto.randomUUID(),
    projectId: crypto.randomUUID(),
    draftId: crypto.randomUUID(),
    buildId: crypto.randomUUID(),
    bundleId: crypto.randomUUID(),
  };
}

export async function provisionConfirmedLaunchSite(
  input: ConfirmedLaunchProvisionInput,
  options: ConfirmedLaunchProvisionOptions = {},
): Promise<ConfirmedLaunchIds> {
  const { signal } = options;
  const { data, error } = await waitWithSignal(
    supabase.functions.invoke('provision-launch-site', { body: input }),
    signal,
  );
  if (error) throw new Error(await confirmedLaunchErrorMessage(error));

  const result = (data as { data?: Partial<ConfirmedLaunchIds> } | null)?.data;
  if (!result?.businessId || !result.siteId || !result.projectId || !result.draftId || !result.buildId || !result.bundleId) {
    throw new Error('Confirmed launch provisioning returned an incomplete site identity.');
  }

  // Provisioning owns identity only. Any site content present before the
  // platform-core commit would create a competing source of truth.
  let draftQuery = supabase
    .from('builder_drafts')
    .select('id, project_id, business_id, site_id, last_revision_id, vfs_files, metadata')
    .eq('id', result.draftId);
  if (signal) draftQuery = draftQuery.abortSignal(signal);
  const { data: draftRow, error: verifyError } = await draftQuery.maybeSingle();
  if (verifyError) {
    throw new Error(`Launch persisted but could not be verified: ${verifyError.message}`);
  }
  if (!draftRow
    || draftRow.project_id !== result.projectId
    || draftRow.business_id !== result.businessId
    || draftRow.site_id !== result.siteId) {
    throw new Error('Confirmed launch shell identity could not be verified.');
  }
  const persistedFiles = (draftRow.vfs_files ?? {}) as Record<string, unknown>;
  const persistedMetadata = draftRow.metadata && typeof draftRow.metadata === 'object'
    ? draftRow.metadata as Record<string, unknown>
    : {};
  if (draftRow.last_revision_id !== null
    || Object.keys(persistedFiles).length > 0
    || persistedMetadata.siteBundleSnapshot !== undefined
    || persistedMetadata.runtimeManifest !== undefined) {
    throw new Error('Confirmed launch shell contains content outside the canonical commit pipeline.');
  }

  const { data: authData, error: authError } = await waitWithSignal(
    supabase.auth.getUser(),
    signal,
  );
  if (authError || !authData.user?.id) {
    throw new Error('Confirmed launch project ownership could not be verified.');
  }
  let membershipQuery = supabase
    .from('project_members')
    .select('id')
    .eq('project_id', result.projectId)
    .eq('user_id', authData.user.id);
  if (signal) membershipQuery = membershipQuery.abortSignal(signal);
  const { data: membership, error: membershipError } = await membershipQuery.maybeSingle();
  if (membershipError || !membership) {
    throw new Error('Confirmed launch project ownership could not be verified.');
  }
  return result as ConfirmedLaunchIds;
}
