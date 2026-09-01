/**
 * useSetupWizard — Manages business launch wizard state + backend wiring.
 * 
 * Loads/saves step completion from business_setup_progress table.
 * Each step has a config form and a completion handler that writes to the relevant backend tables.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Types
// ============================================================================

export type SetupStepId =
  | "booking_calendar"
  | "notifications"
  | "payments"
  | "database"
  | "domain"
  | "seo"
  | "analytics";

export type SetupStepStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface SetupStepConfig {
  [key: string]: unknown;
}

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  category: "core" | "growth" | "advanced";
  timeEstimate: string;
  status: SetupStepStatus;
  config: SetupStepConfig;
  completedAt: string | null;
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
// Default Steps
// ============================================================================

const DEFAULT_STEPS: Omit<SetupStep, "status" | "config" | "completedAt">[] = [
  {
    id: "booking_calendar",
    title: "Booking Calendar",
    description: "Configure your availability, service durations, and booking buffer times",
    category: "core",
    timeEstimate: "~5 min",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Set up email and SMS reminders for appointments and form submissions",
    category: "core",
    timeEstimate: "~3 min",
  },
  {
    id: "payments",
    title: "Payment Processing",
    description: "Accept deposits or full payments with Stripe integration",
    category: "core",
    timeEstimate: "~10 min",
  },
  {
    id: "database",
    title: "Database",
    description: "Store form submissions, user data, and content",
    category: "core",
    timeEstimate: "~2 min",
  },
  {
    id: "domain",
    title: "Custom Domain",
    description: "Connect your own domain name for a professional web presence",
    category: "growth",
    timeEstimate: "~10 min",
  },
  {
    id: "seo",
    title: "SEO & Meta Tags",
    description: "Optimize your site for search engines with titles, descriptions, and Open Graph",
    category: "growth",
    timeEstimate: "~5 min",
  },
  {
    id: "analytics",
    title: "Analytics & Tracking",
    description: "Track visitors, conversions, and site performance metrics",
    category: "advanced",
    timeEstimate: "~5 min",
  },
];

// ============================================================================
// Hook
// ============================================================================

export function useSetupWizard(businessId: string | null): UseSetupWizardReturn {
  const { toast } = useToast();
  const [stepMap, setStepMap] = useState<Record<SetupStepId, { status: SetupStepStatus; config: SetupStepConfig; completedAt: string | null }>>({} as any);
  const [activeStep, setActiveStep] = useState<SetupStepId | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load progress from DB
  useEffect(() => {
    if (!businessId) return;
    setIsLoading(true);

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("business_setup_progress" as any)
          .select("step_id, status, config, completed_at")
          .eq("business_id", businessId);

        if (error) throw error;

        const map: Record<string, any> = {};
        (data || []).forEach((row: any) => {
          map[row.step_id] = {
            status: row.status as SetupStepStatus,
            config: row.config || {},
            completedAt: row.completed_at,
          };
        });
        setStepMap(map as any);
      } catch (err) {
        console.warn("[SetupWizard] Failed to load progress:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [businessId]);

  // Build steps list
  const steps = useMemo<SetupStep[]>(() => {
    return DEFAULT_STEPS.map((def) => ({
      ...def,
      status: stepMap[def.id]?.status || "pending",
      config: stepMap[def.id]?.config || {},
      completedAt: stepMap[def.id]?.completedAt || null,
    }));
  }, [stepMap]);

  const completedCount = steps.filter(s => s.status === "completed").length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Upsert to DB
  const persistStep = useCallback(async (stepId: SetupStepId, status: SetupStepStatus, config: SetupStepConfig) => {
    if (!businessId) return;
    setIsSaving(true);
    try {
      const payload: any = {
        business_id: businessId,
        step_id: stepId,
        status,
        config,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("business_setup_progress" as any)
        .upsert(payload, { onConflict: "business_id,step_id" });

      if (error) throw error;
    } catch (err) {
      console.error("[SetupWizard] Save failed:", err);
      toast({ title: "Failed to save progress", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [businessId, toast]);

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
    toast({ title: `${DEFAULT_STEPS.find(s => s.id === stepId)?.title} completed!` });
  }, [stepMap, persistStep, toast]);

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
