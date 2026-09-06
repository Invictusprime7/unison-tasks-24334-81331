import { createContext } from 'react';
import type { BusinessProfileDTO } from '@/types/businessProfile';
import type { BusinessProfilePatch } from '@/services/businessProfileService';

export interface BusinessProfileContextValue {
  profile: BusinessProfileDTO | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  patch: (patch: BusinessProfilePatch) => Promise<BusinessProfileDTO | null>;
}

const DEFAULT_BUSINESS_PROFILE_CONTEXT: BusinessProfileContextValue = {
  profile: null,
  loading: false,
  error: null,
  reload: async () => {},
  patch: async () => null,
};

export const BusinessProfileContext = createContext<BusinessProfileContextValue>(
  DEFAULT_BUSINESS_PROFILE_CONTEXT,
);
BusinessProfileContext.displayName = 'BusinessProfileContext';