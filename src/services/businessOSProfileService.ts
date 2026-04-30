/**
 * businessOSProfileService — Read/write BusinessOSProfile to builder_drafts.metadata.
 *
 * Persistence model:
 *   builder_drafts.metadata.businessOS = BusinessOSProfile
 *
 * No new table. We piggy-back on the existing draft row that the launcher
 * creates so the profile travels alongside topology + page registry.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  BUSINESS_OS_PROFILE_VERSION,
  isBusinessOSProfile,
  type BusinessOSProfile,
} from "@/types/businessOS";

const META_KEY = "businessOS";

interface DraftRow {
  id: string;
  metadata: Record<string, unknown> | null;
  business_id: string | null;
  user_id: string | null;
  updated_at: string;
}

// ============================================================================
// Read
// ============================================================================

export async function loadBusinessOSProfileFromDraft(draftId: string): Promise<BusinessOSProfile | null> {
  const { data, error } = await supabase
    .from("builder_drafts")
    .select("id, metadata, business_id, user_id, updated_at")
    .eq("id", draftId)
    .maybeSingle();

  if (error) {
    console.warn("[businessOS] loadBusinessOSProfileFromDraft failed:", error);
    return null;
  }
  if (!data) return null;

  const meta = (data.metadata || {}) as Record<string, unknown>;
  const candidate = meta[META_KEY];
  if (!isBusinessOSProfile(candidate)) return null;

  // Hydrate runtime-only fields
  return {
    ...candidate,
    draftId: data.id,
    businessId: data.business_id || candidate.businessId,
    ownerUserId: data.user_id || candidate.ownerUserId,
  };
}

// ============================================================================
// Write
// ============================================================================

export async function saveBusinessOSProfileToDraft(
  draftId: string,
  profile: BusinessOSProfile,
): Promise<{ ok: boolean; error?: string }> {
  // Re-fetch existing metadata so we don't blow away topology / wizardSelections
  const { data: existing, error: readError } = await supabase
    .from("builder_drafts")
    .select("id, metadata")
    .eq("id", draftId)
    .maybeSingle();

  if (readError) {
    console.warn("[businessOS] saveBusinessOSProfileToDraft read failed:", readError);
    return { ok: false, error: readError.message };
  }

  const prevMeta = ((existing as DraftRow | null)?.metadata || {}) as Record<string, unknown>;
  const nextMeta: Record<string, unknown> = {
    ...prevMeta,
    [META_KEY]: {
      ...profile,
      version: BUSINESS_OS_PROFILE_VERSION,
      updatedAt: new Date().toISOString(),
    },
  };

  const { error: writeError } = await supabase
    .from("builder_drafts")
    // Cast through unknown — Supabase types don't always know the JSONB shape
    .update({ metadata: nextMeta as unknown as never })
    .eq("id", draftId);

  if (writeError) {
    console.warn("[businessOS] saveBusinessOSProfileToDraft write failed:", writeError);
    return { ok: false, error: writeError.message };
  }
  return { ok: true };
}
