/**
 * loadCloudState — fetches the full WebBuilder cloud snapshot
 * (business + project + entitlements + installed packs) from Supabase.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 15. Pure async helper:
 * no React, no setState. Caller wraps result in setCloudState / handles
 * cancellation.
 */

import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { getProjectByIdCompat } from '@/services/projectSchemaCompat';

const supabase = supabaseClient as any;

export interface CloudStateProject {
  id: string | null;
  name: string | null;
  slug: string | null;
  publishStatus: string | null;
  customDomain: string | null;
  settings: Record<string, any>;
}

export interface CloudStateBusiness {
  id: string | null;
  name: string | null;
  notificationEmail: string | null;
  timezone: string | null;
  brandColor: string | null;
}

export interface CloudStateSnapshot {
  project: CloudStateProject;
  business: CloudStateBusiness;
  entitlements: Record<string, { limit?: number; enabled?: boolean }>;
  installedPacks: string[];
  isLoaded: boolean;
}

export interface CloudStateFallbacks {
  projectNameFromState?: string | null;
  projectSlug?: string | null;
  publishStatusFromState?: string | null;
  customDomainFromState?: string | null;
}

export interface LoadCloudStateInput {
  businessId?: string | null;
  projectId?: string | null;
  fallbacks?: CloudStateFallbacks;
}

export type LoadCloudStateResult =
  | { kind: 'partial'; patch: Partial<CloudStateSnapshot> }
  | { kind: 'full'; snapshot: CloudStateSnapshot };

/**
 * Load the cloud snapshot. Returns either a full snapshot (when we had a
 * session + businessId and queries succeeded) or a partial patch that only
 * flips `isLoaded` (for preview/demo mode, missing session, or errors).
 */
export async function loadCloudState({
  businessId,
  projectId,
  fallbacks = {},
}: LoadCloudStateInput): Promise<LoadCloudStateResult> {
  if (!businessId) {
    return { kind: 'partial', patch: { isLoaded: true } };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { kind: 'partial', patch: { isLoaded: true } };
    }

    const { data: bizData } = (await supabase
      .from('businesses' as any)
      .select('id, name, notification_email, timezone, brand_color, settings')
      .eq('id', businessId)
      .maybeSingle()) as {
      data: {
        id: string;
        name: string;
        notification_email: string | null;
        timezone: string | null;
        brand_color: string | null;
        settings: any;
      } | null;
    };

    let projectData:
      | {
          id: string;
          name: string;
          slug: string | null;
          publish_status: string | null;
          custom_domain: string | null;
          settings: any;
        }
      | null = null;
    if (projectId) {
      const { data } = await getProjectByIdCompat(projectId);
      projectData = data
        ? {
            id: data.id,
            name: data.name,
            slug: data.slug || null,
            publish_status: data.publish_status || null,
            custom_domain: data.custom_domain || null,
            settings: data.settings || {},
          }
        : null;
    }

    const { data: entitlementsData } = (await supabase
      .from('entitlements' as any)
      .select('key, value')
      .eq('business_id', businessId)) as {
      data: { key: string; value: any }[] | null;
    };

    const { data: packsData } = (await supabase
      .from('installed_packs' as any)
      .select('pack_id')
      .eq('business_id', businessId)
      .eq('status', 'active')) as { data: { pack_id: string }[] | null };

    const entitlements: Record<string, { limit?: number; enabled?: boolean }> = {};
    (entitlementsData || []).forEach((e) => {
      entitlements[e.key] = typeof e.value === 'string' ? JSON.parse(e.value) : e.value;
    });

    const installedPacks = (packsData || []).map((p: any) => p.pack_id);

    const snapshot: CloudStateSnapshot = {
      project: {
        id: projectData?.id || projectId || null,
        name: projectData?.name || fallbacks.projectNameFromState || null,
        slug: projectData?.slug || fallbacks.projectSlug || null,
        publishStatus: projectData?.publish_status || fallbacks.publishStatusFromState || null,
        customDomain: projectData?.custom_domain || fallbacks.customDomainFromState || null,
        settings: projectData?.settings || {},
      },
      business: {
        id: bizData?.id || businessId || null,
        name: bizData?.name || null,
        notificationEmail: bizData?.notification_email || null,
        timezone: bizData?.timezone || 'UTC',
        brandColor: bizData?.brand_color || null,
      },
      entitlements,
      installedPacks,
      isLoaded: true,
    };

    return { kind: 'full', snapshot };
  } catch (error) {
    console.warn('[loadCloudState] Failed to load cloud state:', error);
    return { kind: 'partial', patch: { isLoaded: true } };
  }
}
