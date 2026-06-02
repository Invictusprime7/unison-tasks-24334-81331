/**
 * createInitialCloudState — builds the initial CloudStateSnapshot used by
 * WebBuilder before loadCloudState resolves.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 21. Pure helper: no React,
 * no setState. Mirrors the inline literal previously declared in
 * useState<{...}>(...).
 */

import type { CloudStateSnapshot } from '@/lib/builder/loadCloudState';

export interface CreateInitialCloudStateInput {
  projectId?: string | null;
  businessId?: string | null;
  projectNameFromState?: string | null;
  projectSlug?: string | null;
  publishStatusFromState?: string | null;
  customDomainFromState?: string | null;
}

export function createInitialCloudState({
  projectId,
  businessId,
  projectNameFromState,
  projectSlug,
  publishStatusFromState,
  customDomainFromState,
}: CreateInitialCloudStateInput): CloudStateSnapshot {
  return {
    project: {
      id: projectId || null,
      name: projectNameFromState || null,
      slug: projectSlug || null,
      publishStatus: publishStatusFromState || null,
      customDomain: customDomainFromState || null,
      settings: {},
    },
    business: {
      id: businessId || null,
      name: null,
      notificationEmail: null,
      timezone: 'UTC',
      brandColor: null,
    },
    entitlements: {},
    installedPacks: [],
    isLoaded: false,
  };
}
