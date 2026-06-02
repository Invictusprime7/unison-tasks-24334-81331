/**
 * loadBusinessData — fetches business name/category/preset context for AI prompts.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 19. Pure async helper:
 * no React, no setState. Caller maps the returned context string onto state.
 */

import { supabase as supabaseClient } from '@/integrations/supabase/client';

const supabase = supabaseClient as any;

export interface LoadBusinessDataInput {
  businessId?: string | null;
  currentTemplateCategory?: string | null;
  currentDesignPreset?: string | null;
}

/**
 * Load business data context lines for AI prompt enrichment.
 * Returns a multi-line string like "- businessName: Foo\n- businessId: ...",
 * or null when the business is missing / not found.
 */
export async function loadBusinessData({
  businessId,
  currentTemplateCategory,
  currentDesignPreset,
}: LoadBusinessDataInput): Promise<string | null> {
  if (!businessId) return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return null;

    const { data: biz, error } = await supabase
      .from('businesses' as any)
      .select('id,name')
      .eq('id', businessId)
      .maybeSingle();

    if (error) throw error;
    if (!biz) return null;

    const lines: string[] = [];
    if (biz.name) lines.push(`- businessName: ${biz.name}`);
    if (biz.id) lines.push(`- businessId: ${biz.id}`);
    if (currentTemplateCategory) lines.push(`- templateCategory: ${currentTemplateCategory}`);
    if (currentDesignPreset) lines.push(`- designPreset: ${currentDesignPreset}`);

    return lines.length ? lines.join('\n') : null;
  } catch (e) {
    console.warn('[loadBusinessData] Failed to load business data', e);
    return null;
  }
}
