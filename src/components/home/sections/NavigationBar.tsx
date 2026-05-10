import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { DocHelper } from "@/components/docs";
import { 
  CheckSquare, 
  Menu, 
  LayoutDashboard,
  LogOut, 
  Zap,
  Users,
  Cloud,
  X,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-[#0a0a14]/95 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Left: docs trigger + logo */}
        <div className="flex items-center gap-3">
          <Sheet open={docsOpen} onOpenChange={onDocsOpenChange}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-white/70 hover:bg-white/5">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open documentation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-[450px] p-0 overflow-hidden bg-[#0d0d18] border-white/8">
              <DocHelper embedded className="h-full" />
            </SheetContent>
          </Sheet>
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 group"
          >
            <CheckSquare className="h-6 w-6 text-cyan-400 group-hover:drop-shadow-[0_0_10px_rgba(0,255,255,0.8)] transition-all" />
            <span className="text-base font-bold text-white">Unison Tasks</span>
          </button>
        </div>

        {/* Center: Desktop nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <a href="#systems"   className="text-white/40 hover:text-white transition-colors">Systems</a>
          <a href="#features"  className="text-white/40 hover:text-white transition-colors">Features</a>
          <a href="#pricing"   className="text-white/40 hover:text-white transition-colors">Pricing</a>
        </div>

        {/* Right: Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          {user && <SubscriptionBadge />}
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-white/50 hover:text-white hover:bg-white/5 gap-1.5"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/cloud")}
                className="text-white/50 hover:text-cyan-400 hover:bg-cyan-500/10 gap-1.5"
              >
                <Cloud className="h-3.5 w-3.5" />
                Cloud
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/team")}
                className="text-white/50 hover:text-white hover:bg-white/5 gap-1.5"
              >
                <Users className="h-3.5 w-3.5" />
                Team
              </Button>
              <Button
                onClick={onStartLauncher}
                size="sm"
                className={cn(
                  "bg-cyan-500 text-black font-bold gap-1.5",
                  "hover:bg-cyan-400",
                  "shadow-[0_0_20px_rgba(0,200,255,0.3)]",
                  "hover:shadow-[0_0_28px_rgba(0,200,255,0.5)]",
                  "transition-all duration-200"
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                Build Your Site
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                onClick={onSignOut}
                className="h-8 w-8 text-white/30 hover:text-red-400 hover:bg-red-500/10"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => navigate("/auth")}
                className="text-white/50 hover:text-white hover:bg-white/5"
              >
                Sign In
              </Button>
              <Button 
                size="sm"
                onClick={onStartLauncher}
                className={cn(
                  "bg-cyan-500 text-black font-bold gap-1.5",
                  "hover:bg-cyan-400",
                  "shadow-[0_0_20px_rgba(0,200,255,0.3)]",
                  "transition-all duration-200"
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                Get Started Free
              </Button>
            </>
          )}
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {user && <SubscriptionBadge />}
          <Button
            size="sm"
            onClick={onStartLauncher}
            className={cn(
              "bg-cyan-500 text-black font-bold text-xs px-3 h-8 gap-1",
              "hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,200,255,0.3)]"
            )}
          >
            <Zap className="h-3 w-3" />
            {user ? "Build" : "Start Free"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0a0a14]/98 backdrop-blur-md">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
            <a href="#systems"  onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-3 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-sm transition-colors">Systems</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-3 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-sm transition-colors">Features</a>
            <a href="#pricing"  onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-3 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-sm transition-colors">Pricing</a>

            <div className="border-t border-white/5 my-2" />

            {user ? (
              <>
                <Button variant="ghost" onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }} className="justify-start h-10 text-white/60 hover:text-white hover:bg-white/5 gap-2">
                  <LayoutDashboard className="h-4 w-4" />Dashboard
                </Button>
                <Button variant="ghost" onClick={() => { navigate("/cloud"); setMobileMenuOpen(false); }} className="justify-start h-10 text-white/60 hover:text-cyan-400 hover:bg-cyan-500/10 gap-2">
                  <Cloud className="h-4 w-4" />Cloud
                </Button>
                <Button variant="ghost" onClick={() => { navigate("/team"); setMobileMenuOpen(false); }} className="justify-start h-10 text-white/60 hover:text-white hover:bg-white/5 gap-2">
                  <Users className="h-4 w-4" />Team
                </Button>
                <Button onClick={() => { onStartLauncher(); setMobileMenuOpen(false); }} className="justify-start h-10 bg-cyan-500 text-black font-bold hover:bg-cyan-400 gap-2">
                  <Zap className="h-4 w-4" />Build Your Site
                </Button>
                <Button variant="ghost" onClick={() => { onSignOut(); setMobileMenuOpen(false); }} className="justify-start h-10 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 gap-2">
                  <LogOut className="h-4 w-4" />Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }} className="justify-start h-10 text-white/60 hover:text-white hover:bg-white/5">
                  Sign In
                </Button>
                <Button onClick={() => { onStartLauncher(); setMobileMenuOpen(false); }} className="justify-start h-10 bg-cyan-500 text-black font-bold hover:bg-cyan-400 gap-2">
                  <Zap className="h-4 w-4" />Get Started Free
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
