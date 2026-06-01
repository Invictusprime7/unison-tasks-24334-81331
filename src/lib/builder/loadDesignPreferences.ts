/**
 * loadDesignPreferences — fetches persisted launcher design preferences
 * (template_category + design_preset) for a business from Supabase.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 18. Pure async helper:
 * no React, no setState. Returns a partial patch the caller maps onto state.
 */

import { supabase as supabaseClient } from '@/integrations/supabase/client';

const supabase = supabaseClient as any;

export interface DesignPreferencesPatch {
  designPreset?: string;
  templateCategory?: string;
}

export interface LoadDesignPreferencesInput {
  businessId?: string | null;
  /** If a preset is already set (e.g. from navigation state), skip the fetch. */
  currentDesignPreset?: string | null;
}

export async function loadDesignPreferences({
  businessId,
  currentDesignPreset,
}: LoadDesignPreferencesInput): Promise<DesignPreferencesPatch | null> {
  if (!businessId) return null;
  if (currentDesignPreset) return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return null;

    const { data, error } = await supabase
      .from('business_design_preferences' as any)
      .select('template_category,design_preset')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const patch: DesignPreferencesPatch = {};
    if (data.design_preset) patch.designPreset = String(data.design_preset);
    if (data.template_category) patch.templateCategory = String(data.template_category);
    return Object.keys(patch).length ? patch : null;
  } catch (e) {
    console.warn('[WebBuilder] Failed to load business design preferences', e);
    return null;
  }
}
