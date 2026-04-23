import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ProjectsList } from "@/components/ProjectsList";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { LogOut, Plus, CheckSquare, Inbox, Zap, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  if (loading) {
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
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Arcade Header */}
      <header className="bg-[#0d0d18]/95 backdrop-blur-sm border-b border-cyan-500/20 shadow-[0_4px_20px_rgba(0,255,255,0.1)]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => navigate("/")}
          >
            <div className="p-2 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all duration-300">
              <CheckSquare className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]" />
            </div>
            <h1 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] group-hover:text-cyan-300 transition-colors">
              Unison Tasks
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Desktop buttons */}
            <div className="hidden sm:flex items-center gap-3">
              <SubscriptionBadge />
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard/leads")}
                className={cn(
                  "border border-fuchsia-500/30 text-fuchsia-400 font-bold",
                  "hover:bg-fuchsia-500/20 hover:border-fuchsia-500/60",
                  "hover:shadow-[0_0_15px_rgba(255,0,255,0.3)]",
                  "transition-all duration-200"
                )}
              >
                <Inbox className="h-4 w-4 mr-2" />
                Leads
              </Button>
              <Button
                onClick={handleCreateProject}
                className={cn(
                  "bg-lime-400 text-black font-bold",
                  "shadow-[0_0_15px_rgba(0,255,0,0.4)]",
                  "hover:bg-lime-300 hover:shadow-[0_0_25px_rgba(0,255,0,0.6)]",
                  "active:scale-95 transition-all duration-200"
                )}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
              {user ? (
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className={cn(
                    "border border-red-500/30 text-red-400 font-bold",
                    "hover:bg-red-500/20 hover:border-red-500/60",
                    "hover:shadow-[0_0_15px_rgba(255,0,0,0.3)]",
                    "transition-all duration-200"
                  )}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  className={cn(
                    "border border-cyan-500/30 text-cyan-400 font-bold",
                    "hover:bg-cyan-500/20 hover:border-cyan-500/60",
                    "hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]",
                    "transition-all duration-200"
                  )}
                >
                  Sign In
                </Button>
              )}
            </div>

            {/* Mobile: subscription badge + hamburger */}
            <div className="flex sm:hidden items-center gap-2">
              <SubscriptionBadge />
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/60 transition-all duration-200"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 bg-[#0d0d18] border-l border-fuchsia-500/30 flex flex-col gap-3 pt-10">
                  <Button
                    variant="ghost"
                    onClick={() => { navigate("/dashboard/leads"); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full justify-start border border-fuchsia-500/30 text-fuchsia-400 font-bold",
                      "hover:bg-fuchsia-500/20"
                    )}
                  >
                    <Inbox className="h-4 w-4 mr-2" />
                    Leads
                  </Button>
                  <Button
                    onClick={() => { handleCreateProject(); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full justify-start bg-lime-400 text-black font-bold",
                      "hover:bg-lime-300 active:scale-95 transition-all duration-200"
                    )}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                  {user ? (
                    <Button
                      variant="ghost"
                      onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                      className={cn(
                        "w-full justify-start border border-red-500/30 text-red-400 font-bold",
                        "hover:bg-red-500/20"
                      )}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                      className={cn(
                        "w-full justify-start border border-cyan-500/30 text-cyan-400 font-bold",
                        "hover:bg-cyan-500/20"
                      )}
                    >
                      Sign In
                    </Button>
                  )}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <ProjectsList userId={user?.id || ""} />
      </main>
    </div>
  );
};

export default Dashboard;
