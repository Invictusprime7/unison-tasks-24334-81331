import {
  scoreProfileCompleteness,
  type BusinessProfileDTO,
} from '@/types/businessProfile';

export const BUSINESS_RUNTIME_CONTRACT_VERSION = '1.0' as const;

export interface BusinessRuntimeContract {
  version: typeof BUSINESS_RUNTIME_CONTRACT_VERSION;
  businessId: string;
  profile: {
    source: 'businesses';
    version: string;
    completenessPercent: number;
    publishReady: boolean;
    missingRequiredFields: string[];
  };
  dataBindings: {
    source: 'site_data_bindings';
    snapshotId: string;
    expectedCount: number;
    status: 'pending' | 'ready';
  };
  generatedAt: string;
}

export function buildBusinessRuntimeContract({
  businessId,
  profile,
  snapshotId,
  expectedBindingCount,
  bindingsReady = false,
  generatedAt = new Date().toISOString(),
}: {
  businessId: string;
  profile: BusinessProfileDTO;
  snapshotId: string;
  expectedBindingCount: number;
  bindingsReady?: boolean;
  generatedAt?: string;
}): BusinessRuntimeContract {
  if (profile.businessId !== businessId) {
    throw new Error('Business runtime profile must match the launch business.');
  }

  const completeness = scoreProfileCompleteness(profile);
  const missingRequiredFields = completeness.missingRequired
    .filter((field) => field.blocksPublish)
    .map((field) => field.key);

  return {
    version: BUSINESS_RUNTIME_CONTRACT_VERSION,
    businessId,
    profile: {
      source: 'businesses',
      version: profile.updatedAt || 'unversioned',
      completenessPercent: completeness.percent,
      publishReady: missingRequiredFields.length === 0,
      missingRequiredFields,
    },
    dataBindings: {
      source: 'site_data_bindings',
      snapshotId,
      expectedCount: Math.max(0, expectedBindingCount),
      status: bindingsReady || expectedBindingCount === 0 ? 'ready' : 'pending',
    },
    generatedAt,
  };
}