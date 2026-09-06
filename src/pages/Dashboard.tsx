import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ProjectsList } from "@/components/ProjectsList";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { Plus, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useLaunch } from "@/contexts/useLaunchHooks";
import { readLauncherHandoff } from "@/services/launcherHandoffPersistence";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { canCreateProject, incrementProjectCount } = useSubscription();
  const { isFreshLaunch } = useLaunch();
  const hasPendingLauncherHandoff = !!readLauncherHandoff();

  // Strict enforcement: generated sites must always open in the WebBuilder.
  // If a fresh launch is in context, the Unison Tasks dashboard must never
  // intercept the post-launch destination — redirect straight to /web-builder.
  useEffect(() => {
    if (isFreshLaunch || hasPendingLauncherHandoff) {
      navigate("/web-builder", { replace: true });
    }
  }, [hasPendingLauncherHandoff, isFreshLaunch, navigate]);

  const handleCreateProject = () => {
    if (!canCreateProject()) {
      toast({
        title: "Project limit reached",
        description: "Upgrade your plan to create more projects.",
        variant: "destructive"
      });
      navigate("/pricing");
      return;
    }
    navigate("/cloud", { state: { tab: "projects" } });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || isFreshLaunch || hasPendingLauncherHandoff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12]">
        <div className="flex flex-col items-center gap-4">
          <Zap className="h-8 w-8 text-cyan-400 animate-pulse" />
          <div className="text-cyan-400 font-bold drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SubscriptionBadge />
        <Button
          onClick={handleCreateProject}
          className="bg-lime-400 font-bold text-black shadow-[0_0_15px_rgba(0,255,0,0.4)] hover:bg-lime-300 hover:shadow-[0_0_25px_rgba(0,255,0,0.6)] active:scale-95 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <ProjectsList userId={user?.id || ""} />
    </div>
  );
};

export default Dashboard;
