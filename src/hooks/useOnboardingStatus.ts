import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export interface OnboardingState {
  completed: boolean;
  current_step: string;
  completed_steps: string[];
  industry: string | null;
  business_name: string | null;
  project_id: string | null;
}

interface UseOnboardingStatusResult {
  isLoading: boolean;
  needsOnboarding: boolean;
  onboardingState: OnboardingState | null;
  markStepComplete: (step: string) => Promise<void>;
  completeOnboarding: (projectId: string) => Promise<void>;
  updateOnboardingState: (update: Partial<OnboardingState>) => Promise<void>;
}

export function useOnboardingStatus(user: User | null): UseOnboardingStatusResult {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setOnboardingState(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("onboarding_state")
          .select("completed, current_step, completed_steps, industry, business_name, project_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error && error.code !== "PGRST116") {
          // Table might not exist yet — treat as needs onboarding
          console.warn("onboarding_state fetch error:", error.message);
          setOnboardingState(null);
        } else if (!data) {
          // No row — first time user
          setOnboardingState({
            completed: false,
            current_step: "industry_selection",
            completed_steps: [],
            industry: null,
            business_name: null,
            project_id: null,
          });
        } else {
          setOnboardingState({
            completed: data.completed,
            current_step: data.current_step,
            completed_steps: data.completed_steps ?? [],
            industry: data.industry,
            business_name: data.business_name,
            project_id: data.project_id,
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const upsert = async (update: Record<string, unknown>) => {
    if (!user) return;
    const { data } = await supabase
      .from("onboarding_state")
      .upsert({ user_id: user.id, ...update }, { onConflict: "user_id" })
      .select()
      .single();

    if (data) {
      setOnboardingState(prev => prev ? { ...prev, ...update } as OnboardingState : null);
    }
  };

  const markStepComplete = async (step: string) => {
    const current = onboardingState;
    const steps = current?.completed_steps ?? [];
    if (!steps.includes(step)) {
      await upsert({ completed_steps: [...steps, step], current_step: step });
    }
  };

  const completeOnboarding = async (projectId: string) => {
    await upsert({
      completed: true,
      project_id: projectId,
      current_step: "launched",
    });
    setOnboardingState(prev =>
      prev ? { ...prev, completed: true, project_id: projectId, current_step: "launched" } : null
    );
  };

  const updateOnboardingState = async (update: Partial<OnboardingState>) => {
    await upsert(update as Record<string, unknown>);
  };

  const needsOnboarding = !isLoading && !!user && onboardingState !== null && !onboardingState.completed;

  return { isLoading, needsOnboarding, onboardingState, markStepComplete, completeOnboarding, updateOnboardingState };
}
