import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { DocHelper } from "@/components/docs";
import { 
  CheckSquare, 
  Menu, 
  Cloud, 
  LogOut, 
  ArrowRight 
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavigationBarProps {
  user: User | null;
  docsOpen: boolean;
  onDocsOpenChange: (open: boolean) => void;
  onSignOut: () => void;
  onStartLauncher: () => void;
}

export function NavigationBar({ 
  user, 
  docsOpen, 
  onDocsOpenChange, 
  onSignOut, 
  onStartLauncher 
}: NavigationBarProps) {
  const navigate = useNavigate();

  return (
    <nav className="bg-[#0d0d18]/95 backdrop-blur-sm border-b border-cyan-500/20 shadow-[0_4px_20px_rgba(0,255,255,0.1)] sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Sheet open={docsOpen} onOpenChange={onDocsOpenChange}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-500/20">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open documentation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[450px] p-0 overflow-hidden bg-[#0d0d18] border-cyan-500/20">
              <DocHelper embedded className="h-full" />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.6)]" />
            <span className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">Unison Tasks</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a href="#systems" className="text-gray-400 hover:text-cyan-400 transition-colors">Systems</a>
          <a href="#features" className="text-gray-400 hover:text-lime-400 transition-colors">Features</a>
          <a href="#pricing" className="text-gray-400 hover:text-fuchsia-400 transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          {user && <SubscriptionBadge />}
          <Button 
            variant="ghost" 
            onClick={() => navigate("/cloud")} 
            className={cn(
              "border border-blue-500/30 text-blue-400",
              "hover:bg-blue-500/20 hover:border-blue-500/50",
              "hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]",
              "transition-all duration-200"
            )}
          >
            <Cloud className="h-4 w-4 mr-2" />
            Cloud
          </Button>
          {user ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/dashboard")}
                className="text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-500/20"
              >
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                onClick={onSignOut}
                className={cn(
                  "border border-red-500/30 text-red-400",
                  "hover:bg-red-500/20 hover:border-red-500/50",
                  "transition-all duration-200"
                )}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/auth")}
                className="text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-500/20"
              >
                Sign In
              </Button>
              <Button 
                onClick={onStartLauncher}
                className={cn(
                  "bg-lime-400 text-black font-bold",
                  "shadow-[0_0_15px_rgba(0,255,0,0.4)]",
                  "hover:bg-lime-300 hover:shadow-[0_0_25px_rgba(0,255,0,0.6)]",
                  "active:scale-95 transition-all duration-200"
                )}
              >
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
