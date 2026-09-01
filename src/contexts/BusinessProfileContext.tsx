/**
 * BusinessProfileContext — Milestone 2 root.
 *
 * Single source of truth that every generated-site artifact and Builder
 * surface reads from. Hero, Footer, Contact, Booking form, SEO, CRM header,
 * topbar chip must resolve business identity/contact/hours through this
 * context — never through LaunchState, WizardSelections, or hardcoded seeds.
 *
 * Additive by design: nothing breaks if a consumer doesn't wrap in the
 * provider — `useBusinessProfile()` returns { profile: null, loading: false }.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BusinessProfileDTO } from '@/types/businessProfile';
import {
  loadBusinessProfile,
  saveBusinessProfile,
  type BusinessProfilePatch,
} from '@/services/businessProfileService';

interface BusinessProfileContextValue {
  profile: BusinessProfileDTO | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  patch: (p: BusinessProfilePatch) => Promise<BusinessProfileDTO | null>;
}

const DEFAULT: BusinessProfileContextValue = {
  profile: null,
  loading: false,
  error: null,
  reload: async () => {},
  patch: async () => null,
};

const BusinessProfileContext = createContext<BusinessProfileContextValue>(DEFAULT);
BusinessProfileContext.displayName = 'BusinessProfileContext';

export interface BusinessProfileProviderProps {
  businessId: string | undefined;
  children: ReactNode;
}

export function BusinessProfileProvider({ businessId, children }: BusinessProfileProviderProps) {
  const [profile, setProfile] = useState<BusinessProfileDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!businessId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = await loadBusinessProfile(businessId);
      setProfile(p);
      // Mirror into window for VFS preview iframe hydration.
      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>).__UNISON_BUSINESS__ = p ?? null;
        window.dispatchEvent(
          new CustomEvent('unison:business-profile-changed', { detail: { businessId, profile: p } }),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const patch = useCallback(
    async (p: BusinessProfilePatch) => {
      if (!businessId) return null;
      const next = await saveBusinessProfile(businessId, p);
      if (next) {
        setProfile(next);
        if (typeof window !== 'undefined') {
          (window as unknown as Record<string, unknown>).__UNISON_BUSINESS__ = next;
          window.dispatchEvent(
            new CustomEvent('unison:business-profile-changed', { detail: { businessId, profile: next } }),
          );
        }
      }
      return next;
    },
    [businessId],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<BusinessProfileContextValue>(
    () => ({ profile, loading, error, reload, patch }),
    [profile, loading, error, reload, patch],
  );

  return (
    <BusinessProfileContext.Provider value={value}>{children}</BusinessProfileContext.Provider>
  );
}

/** Inline hook (per project rule: no standalone custom hook files). */
export function useBusinessProfile(): BusinessProfileContextValue {
  return useContext(BusinessProfileContext);
}
