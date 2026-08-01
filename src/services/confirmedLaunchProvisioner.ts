import { supabase } from '@/integrations/supabase/client';
import type { BusinessRuntimeContract } from '@/platform/core/businessRuntimeContract';
import type { PlannedSectionDataBinding } from '@/services/autoEmitSectionBindings';
import type { PlannedFormDefinition } from '@/services/launchFormDefinitions';
import type { GeneratedSiteRuntimeManifest } from '@/services/generatedSiteRuntimeManifest';

export const REQUIRED_SITE_CAPABILITIES = [
  'business_profile',
  'forms.contact',
  'crm.leads',
  'analytics.events',
  'catalog.products',
  'booking',
  'cms.content',
  'customer.accounts',
  'payments',
  'automations',
] as const;

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
  code: string;
  vfsFiles: Record<string, string>;
  siteBundleSnapshot: Record<string, unknown>;
  runtimeManifest: Record<string, unknown>;
  generatedSiteRuntimeManifest: GeneratedSiteRuntimeManifest;
  wizardSelections: Record<string, unknown>;
  businessRuntime: BusinessRuntimeContract;
  dataBindings: PlannedSectionDataBinding[];
  formDefinitions?: PlannedFormDefinition[];
  capabilities?: readonly string[];
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
): Promise<ConfirmedLaunchIds> {
  const { data, error } = await supabase.functions.invoke('provision-launch-site', {
    body: {
      ...input,
      formDefinitions: input.formDefinitions ?? [],
      capabilities: input.capabilities ?? REQUIRED_SITE_CAPABILITIES,
    },
  });
  if (error) throw new Error(error.message || 'Unable to provision the confirmed site launch.');

  const result = (data as { data?: Partial<ConfirmedLaunchIds> } | null)?.data;
  if (!result?.businessId || !result.siteId || !result.projectId || !result.draftId || !result.buildId || !result.bundleId) {
    throw new Error('Confirmed launch provisioning returned an incomplete site identity.');
  }

  // Durability gate: a launch is only real once the generated VFS is readable
  // back out of `builder_drafts`. Without this check a silently-rolled-back
  // transaction produces a project that paints an empty preview canvas.
  const { data: draftRow, error: verifyError } = await supabase
    .from('builder_drafts')
    .select('id, vfs_files')
    .eq('id', result.draftId)
    .maybeSingle();
  if (verifyError) {
    throw new Error(`Launch persisted but could not be verified: ${verifyError.message}`);
  }
  const persistedFiles = (draftRow?.vfs_files ?? {}) as Record<string, unknown>;
  if (!draftRow || Object.keys(persistedFiles).length === 0) {
    throw new Error('Launch did not persist the generated site files. Nothing was saved — please retry.');
  }

  return result as ConfirmedLaunchIds;
}
