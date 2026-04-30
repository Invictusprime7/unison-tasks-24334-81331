/**
 * useBusinessOSProfile — In-memory profile state with optional draft persistence.
 *
 * Usage inside WebBuilder:
 *   const os = useBusinessOSProfile({ draftId, initialProfile });
 *   os.profile, os.updateProfile, os.setModuleStatus, os.persist()
 *   os.setupTasks, os.updateSetupTaskStatus, os.regenerateSetupTasks()
 *
 * Persistence is opt-in: caller passes a draftId, then `persist()` flushes the
 * current profile into builder_drafts.metadata.businessOS via the service.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeBusinessOSReadiness,
  type BusinessOSModuleId,
  type BusinessOSModuleState,
  type BusinessOSProfile,
  type BusinessOSReadiness,
  type BusinessOSSetupTask,
  type SetupTaskStatus,
} from "@/types/businessOS";
import {
  loadBusinessOSProfileFromDraft,
  saveBusinessOSProfileToDraft,
} from "@/services/businessOSProfileService";
import {
  computeSetupTasks,
  setSetupTaskStatus,
} from "@/services/businessOSSetupAutopilot";

export interface UseBusinessOSProfileOptions {
  /** When provided, the hook can load + persist to that draft. */
  draftId?: string | null;
  /** Optional starter profile — usually produced by the launcher/installer. */
  initialProfile?: BusinessOSProfile | null;
  /** Auto-load from the draft on mount when no initialProfile is given. */
  autoLoad?: boolean;
  /** Auto-flush updates to the draft on a debounce. */
  autoPersistMs?: number;
}

export interface UseBusinessOSProfileReturn {
  profile: BusinessOSProfile | null;
  loading: boolean;
  error: string | null;
  readiness: BusinessOSReadiness | null;
  setProfile: (p: BusinessOSProfile | null) => void;
  updateProfile: (patch: Partial<BusinessOSProfile>) => void;
  setModuleStatus: (id: BusinessOSModuleId, patch: Partial<BusinessOSModuleState>) => void;
  persist: () => Promise<{ ok: boolean; error?: string }>;
  reload: () => Promise<void>;
}

export function useBusinessOSProfile(
  options: UseBusinessOSProfileOptions = {},
): UseBusinessOSProfileReturn {
  const { draftId, initialProfile, autoLoad = true, autoPersistMs } = options;

  const [profile, setProfileState] = useState<BusinessOSProfile | null>(initialProfile || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const persistTimer = useRef<number | null>(null);

  // Load on mount when applicable
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!autoLoad || !draftId || initialProfile) return;
      setLoading(true);
      setError(null);
      const loaded = await loadBusinessOSProfileFromDraft(draftId);
      if (cancelled) return;
      setProfileState(loaded);
      setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [autoLoad, draftId, initialProfile]);

  const setProfile = useCallback((p: BusinessOSProfile | null) => {
    dirtyRef.current = true;
    setProfileState(p);
  }, []);

  const updateProfile = useCallback((patch: Partial<BusinessOSProfile>) => {
    setProfileState((prev) => {
      if (!prev) return prev;
      dirtyRef.current = true;
      return { ...prev, ...patch, updatedAt: new Date().toISOString() };
    });
  }, []);

  const setModuleStatus = useCallback((id: BusinessOSModuleId, patch: Partial<BusinessOSModuleState>) => {
    setProfileState((prev) => {
      if (!prev) return prev;
      dirtyRef.current = true;
      const current = prev.modules[id] || { enabled: false, setupStatus: "not_started" as const };
      return {
        ...prev,
        modules: { ...prev.modules, [id]: { ...current, ...patch } },
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const persist = useCallback(async () => {
    if (!draftId || !profile) return { ok: false, error: "No draftId or profile" };
    const res = await saveBusinessOSProfileToDraft(draftId, profile);
    if (res.ok) dirtyRef.current = false;
    else setError(res.error || "Save failed");
    return res;
  }, [draftId, profile]);

  const reload = useCallback(async () => {
    if (!draftId) return;
    setLoading(true);
    const loaded = await loadBusinessOSProfileFromDraft(draftId);
    setProfileState(loaded);
    setLoading(false);
  }, [draftId]);

  // Auto-persist debounce
  useEffect(() => {
    if (!autoPersistMs || !draftId || !profile) return;
    if (!dirtyRef.current) return;
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      void persist();
    }, autoPersistMs);
    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, [autoPersistMs, draftId, profile, persist]);

  const readiness = profile ? computeBusinessOSReadiness(profile) : null;

  return { profile, loading, error, readiness, setProfile, updateProfile, setModuleStatus, persist, reload };
}
