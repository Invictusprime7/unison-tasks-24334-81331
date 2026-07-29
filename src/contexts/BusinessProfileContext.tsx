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
  useCallback,
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
import {
  BusinessProfileContext,
  type BusinessProfileContextValue,
} from '@/contexts/BusinessProfileContextDef';

export interface BusinessProfileProviderProps {
  businessId: string | undefined;
  children: ReactNode;
}

function broadcastProfile(profile: BusinessProfileDTO | null) {
  if (typeof window === 'undefined') return;
  const message = { type: 'BUSINESS_PROFILE_CHANGED', profile };
  for (const iframe of document.querySelectorAll('iframe')) {
    iframe.contentWindow?.postMessage(message, window.location.origin);
  }
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
        broadcastProfile(p);
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
          broadcastProfile(next);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleProfileRequest = (event: MessageEvent) => {
      if (event.origin && event.origin !== window.location.origin) return;
      if ((event.data as { type?: string } | null)?.type !== 'BUSINESS_PROFILE_REQUEST') return;
      event.source?.postMessage(
        { type: 'BUSINESS_PROFILE_CHANGED', profile },
        { targetOrigin: window.location.origin },
      );
    };
    window.addEventListener('message', handleProfileRequest);
    return () => window.removeEventListener('message', handleProfileRequest);
  }, [profile]);

  const value = useMemo<BusinessProfileContextValue>(
    () => ({ profile, loading, error, reload, patch }),
    [profile, loading, error, reload, patch],
  );

  return (
    <BusinessProfileContext.Provider value={value}>{children}</BusinessProfileContext.Provider>
  );
}
