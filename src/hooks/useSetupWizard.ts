/**
 * useSetupWizard — Manages business launch wizard state + backend wiring.
 * 
 * Loads/saves step completion from business_setup_progress table.
 * Each step has a config form and a completion handler that writes to the relevant backend tables.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  buildSiteSetupPlan,
  type SiteSetupCategory,
  type SiteSetupStepId,
} from "@/services/siteSetupPlan";

// ============================================================================
// Types
// ============================================================================

export type SetupStepId = SiteSetupStepId;

export type SetupStepStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface SetupStepConfig {
  [key: string]: unknown;
}

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  category: SiteSetupCategory;
  timeEstimate: string;
  required: boolean;
  status: SetupStepStatus;
  config: SetupStepConfig;
  completedAt: string | null;
}

export interface SetupWizardContext {
  siteId: string | null;
  businessId: string | null;
  projectId: string | null;
  industry?: string | null;
  systemType?: string | null;
}

export interface UseSetupWizardReturn {
  steps: SetupStep[];
  activeStep: SetupStepId | null;
  setActiveStep: (id: SetupStepId | null) => void;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  updateStepConfig: (stepId: SetupStepId, config: Partial<SetupStepConfig>) => void;
  completeStep: (stepId: SetupStepId) => Promise<void>;
  skipStep: (stepId: SetupStepId) => Promise<void>;
  resetStep: (stepId: SetupStepId) => Promise<void>;
  saveStepConfig: (stepId: SetupStepId) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useSetupWizard({
  siteId,
  businessId,
  projectId,
  industry,
  systemType,
}: SetupWizardContext): UseSetupWizardReturn {
  const { toast } = useToast();
  const [stepMap, setStepMap] = useState<Partial<Record<SetupStepId, { status: SetupStepStatus; config: SetupStepConfig; completedAt: string | null }>>>({});
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<SetupStepId | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load progress from DB
  useEffect(() => {
    if (!siteId) {
      setStepMap({});
      setCapabilities([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      try {
        const [stepsResult, capabilitiesResult] = await Promise.all([
          supabase
            .from("site_setup_steps")
            .select("step_id, status, config, completed_at")
            .eq("site_id", siteId),
          supabase
            .from("site_capabilities")
            .select("capability_id, status")
            .eq("site_id", siteId)
            .eq("status", "enabled"),
        ]);
        if (stepsResult.error) throw stepsResult.error;
        if (capabilitiesResult.error) throw capabilitiesResult.error;

        const map: Record<string, any> = {};
        (stepsResult.data || []).forEach((row: any) => {
          map[row.step_id] = {
            status: row.status as SetupStepStatus,
            config: row.config || {},
            completedAt: row.completed_at,
          };
        });
        if (!cancelled) {
          setStepMap(map);
          setCapabilities((capabilitiesResult.data || []).map((row: any) => row.capability_id));
        }
      } catch (err) {
        console.warn("[SetupWizard] Failed to load site setup state:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    const channel = supabase
      .channel(`site-setup-steps:${siteId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "site_setup_steps",
        filter: `site_id=eq.${siteId}`,
      }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [siteId]);

  // Build steps list
  const steps = useMemo<SetupStep[]>(() => {
    return buildSiteSetupPlan({ industry, systemType, capabilities }).map((def) => ({
      ...def,
      status: stepMap[def.id]?.status || "pending",
      config: stepMap[def.id]?.config || {},
      completedAt: stepMap[def.id]?.completedAt || null,
    }));
  }, [capabilities, industry, stepMap, systemType]);

  const completedCount = steps.filter(s => s.status === "completed").length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Upsert to DB
  const persistStep = useCallback(async (stepId: SetupStepId, status: SetupStepStatus, config: SetupStepConfig) => {
    const step = steps.find((candidate) => candidate.id === stepId);
    if (!siteId || !businessId || !projectId || !step) return;
    setIsSaving(true);
    try {
      const payload: any = {
        site_id: siteId,
        business_id: businessId,
        project_id: projectId,
        step_id: stepId,
        category: step.category,
        required: step.required,
        status,
        config,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("site_setup_steps")
        .upsert(payload, { onConflict: "site_id,step_id" });

      if (error) throw error;
    } catch (err) {
      console.error("[SetupWizard] Save failed:", err);
      toast({ title: "Failed to save progress", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [businessId, projectId, siteId, steps, toast]);

  // Update local config
  const updateStepConfig = useCallback((stepId: SetupStepId, config: Partial<SetupStepConfig>) => {
    setStepMap(prev => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        status: prev[stepId]?.status || "in_progress",
        config: { ...(prev[stepId]?.config || {}), ...config },
        completedAt: prev[stepId]?.completedAt || null,
      },
    }));
  }, []);

  // Complete step
  const completeStep = useCallback(async (stepId: SetupStepId) => {
    const config = stepMap[stepId]?.config || {};
    setStepMap(prev => ({
      ...prev,
      [stepId]: { status: "completed" as SetupStepStatus, config, completedAt: new Date().toISOString() },
    }));
    await persistStep(stepId, "completed", config);
    toast({ title: `${steps.find(s => s.id === stepId)?.title} completed!` });
  }, [stepMap, persistStep, steps, toast]);

  // Skip step
  const skipStep = useCallback(async (stepId: SetupStepId) => {
    const config = stepMap[stepId]?.config || {};
    setStepMap(prev => ({
      ...prev,
      [stepId]: { status: "skipped" as SetupStepStatus, config, completedAt: null },
    }));
    await persistStep(stepId, "skipped", config);
  }, [stepMap, persistStep]);

  // Reset step
  const resetStep = useCallback(async (stepId: SetupStepId) => {
    setStepMap(prev => ({
      ...prev,
      [stepId]: { status: "pending" as SetupStepStatus, config: {}, completedAt: null },
    }));
    await persistStep(stepId, "pending", {});
  }, [persistStep]);

  // Save config without completing
  const saveStepConfig = useCallback(async (stepId: SetupStepId) => {
    const config = stepMap[stepId]?.config || {};
    const status = stepMap[stepId]?.status || "in_progress";
    await persistStep(stepId, status === "pending" ? "in_progress" : status, config);
    toast({ title: "Progress saved" });
  }, [stepMap, persistStep, toast]);

  return {
    steps,
    activeStep,
    setActiveStep,
    completedCount,
    totalCount,
    progressPercent,
    isLoading,
    isSaving,
    updateStepConfig,
    completeStep,
    skipStep,
    resetStep,
    saveStepConfig,
  };
}
