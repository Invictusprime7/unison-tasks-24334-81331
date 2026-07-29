import { supabase } from '@/integrations/supabase/client';
import type { BusinessRuntimeContract } from '@/platform/core/businessRuntimeContract';
import type { PlannedSectionDataBinding } from '@/services/autoEmitSectionBindings';

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
  wizardSelections: Record<string, unknown>;
  businessRuntime: BusinessRuntimeContract;
  dataBindings: PlannedSectionDataBinding[];
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
      capabilities: input.capabilities ?? REQUIRED_SITE_CAPABILITIES,
    },
  });
  if (error) throw new Error(error.message || 'Unable to provision the confirmed site launch.');

  const result = (data as { data?: Partial<ConfirmedLaunchIds> } | null)?.data;
  if (!result?.businessId || !result.siteId || !result.projectId || !result.draftId || !result.buildId || !result.bundleId) {
    throw new Error('Confirmed launch provisioning returned an incomplete site identity.');
  }
  return result as ConfirmedLaunchIds;
}