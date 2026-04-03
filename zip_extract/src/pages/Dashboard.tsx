import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ProjectsList } from "@/components/ProjectsList";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { LogOut, Plus, CheckSquare, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { canCreateProject, incrementProjectCount } = useSubscription();

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
    setCreateDialogOpen(true);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => navigate("/")}
          >
            <CheckSquare className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Unison Tasks</h1>
          </div>
          <div className="flex items-center gap-4">
            <SubscriptionBadge />
            <Button variant="outline" onClick={() => navigate("/dashboard/leads")}>
              <Inbox className="h-4 w-4 mr-2" />
              Leads
            </Button>
            <Button onClick={handleCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
            {user ? (
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ProjectsList userId={user?.id || ""} />
      </main>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        userId={user?.id || ""}
      />
    </div>
  );
};

export default Dashboard;