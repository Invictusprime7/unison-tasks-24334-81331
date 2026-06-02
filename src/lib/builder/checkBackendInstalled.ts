/**
 * checkBackendInstalled — checks whether a business has backend packs installed.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 19. Pure async helper:
 * no React, no setState. Returns true/false; caller maps onto state.
 */

import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { getOrCreatePreviewBusinessId, isMissingBusinessInstallsError } from '@/lib/builder/previewBusiness';

const supabase = supabaseClient as any;

export interface CheckBackendInstalledInput {
  businessId?: string | null;
  systemType?: string | null;
}

/**
 * Check if the business has installed backend packs.
 */
export async function checkBackendInstalled({
  businessId,
  systemType,
}: CheckBackendInstalledInput): Promise<boolean> {
  const effectiveBusinessId = businessId || getOrCreatePreviewBusinessId(systemType);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return false;

    const { data, error } = await supabase
      .from('business_installs' as any)
      .select('id')
      .eq('business_id', effectiveBusinessId)
      .limit(1);

    if (error) {
      if (isMissingBusinessInstallsError(error)) {
        return false;
      }
      console.warn('[checkBackendInstalled] business_installs check failed', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (e) {
    console.warn('[checkBackendInstalled] check error', e);
    return false;
  }
}
