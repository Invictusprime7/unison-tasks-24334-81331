import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, ArrowLeft, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isDev = import.meta.env.DEV;

  // Resolve destination after sign-in/up: /onboarding for new users, /dashboard for returning.
  // If the user was mid-checkout before authenticating, send them back to /pricing.
  const resolvePostAuthDestination = async (userId: string, isNewSignup = false) => {
    const checkoutPlan = sessionStorage.getItem("checkout_plan");
    if (checkoutPlan) {
      sessionStorage.removeItem("checkout_plan");
      return "/pricing";
    }
    if (isNewSignup) return "/onboarding";
    try {
      const { data } = await supabase
        .from("onboarding_state")
        .select("completed")
        .eq("user_id", userId)
        .maybeSingle();
      return data?.completed ? "/dashboard" : "/onboarding";
    } catch {
      return "/dashboard";
    }
  };

  // Dev mode: Create a session that Supabase will recognize
  const handleDevModeLogin = async () => {
    try {
      // Use the project's anon key as a pseudo-JWT for dev mode
      // This allows supabase.functions.invoke() to work in dev
      const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcmRvbWR2eXJid3Vva2F0aHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODE5MzgsImV4cCI6MjA3NTg1NzkzOH0.TFjyJIMlSMd3P0ZQkaStMiQpVlCviCLDrXyhLE5hZ2k";
      const devUserId = 'dev-' + Math.random().toString(36).substring(7);
      
      // Create a session object that Supabase will use for function invocations
      const session = {
        access_token: anonKey,
        refresh_token: 'dev-refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: devUserId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'dev@example.local',
        }
      };
      
      // Store in localStorage so Supabase can use it
      await supabase.auth.setSession(session as any);
      
      navigate("/onboarding?dev=true");
    } catch (err) {
      console.error('Dev login error:', err);
      // Fall back to simple navigation if session setup fails
      navigate("/onboarding?dev=true");
    }
  };

  useEffect(() => {
    let handled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && !handled) {
        handled = true;
        const dest = await resolvePostAuthDestination(session.user.id, (event as string) === "SIGNED_UP");
        navigate(dest);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const dest = await resolvePostAuthDestination(session.user.id);
        navigate(dest);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("signup-email") as string;
    const password = formData.get("signup-password") as string;
    const fullName = formData.get("full-name") as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: {
          full_name: fullName,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "You can now sign in to your account.",
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("signin-email") as string;
    const password = formData.get("signin-password") as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] p-4 relative overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Auth Card */}
      <div className={cn(
        "w-full max-w-md relative z-10",
        "bg-[#12121e] border border-cyan-500/20 rounded-2xl",
        "shadow-[0_0_40px_rgba(0,255,255,0.15)]",
        "p-8"
      )}>
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className={cn(
            "absolute left-4 top-4",
            "text-cyan-400/60 hover:text-cyan-400",
            "hover:bg-cyan-500/20 rounded-lg",
            "transition-all duration-200"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className={cn(
            "inline-flex items-center justify-center",
            "w-16 h-16 rounded-2xl mb-4",
            "bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20",
            "border border-cyan-500/30",
            "shadow-[0_0_30px_rgba(0,255,255,0.3)]"
          )}>
            <CheckSquare className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
          </div>
          <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
            Unison Tasks
          </h1>
          <p className="text-gray-400 mt-2">Collaborative task management for teams</p>
        </div>

        {/* Auth Tabs */}
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#0d0d18] p-1 rounded-lg border border-cyan-500/20">
            <TabsTrigger 
              value="signin"
              className={cn(
                "rounded-md font-bold transition-all duration-200",
                "data-[state=active]:bg-cyan-500 data-[state=active]:text-black",
                "data-[state=active]:shadow-[0_0_15px_rgba(0,255,255,0.5)]",
                "data-[state=inactive]:text-cyan-400/60 data-[state=inactive]:hover:text-cyan-400"
              )}
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className={cn(
                "rounded-md font-bold transition-all duration-200",
                "data-[state=active]:bg-lime-400 data-[state=active]:text-black",
                "data-[state=active]:shadow-[0_0_15px_rgba(0,255,0,0.5)]",
                "data-[state=inactive]:text-lime-400/60 data-[state=inactive]:hover:text-lime-400"
              )}
            >
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-cyan-400 font-medium">Email</Label>
                <Input
                  id="signin-email"
                  name="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className={cn(
                    "bg-[#0a0a12] border-cyan-500/20 text-white",
                    "placeholder:text-gray-500",
                    "focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40",
                    "transition-all duration-200"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-cyan-400 font-medium">Password</Label>
                <Input
                  id="signin-password"
                  name="signin-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className={cn(
                    "bg-[#0a0a12] border-cyan-500/20 text-white",
                    "placeholder:text-gray-500",
                    "focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40",
                    "transition-all duration-200"
                  )}
                />
              </div>
              <Button 
                type="submit" 
                className={cn(
                  "w-full bg-cyan-500 text-black font-bold",
                  "shadow-[0_0_20px_rgba(0,255,255,0.4)]",
                  "hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(0,255,255,0.6)]",
                  "active:scale-[0.98] transition-all duration-200"
                )} 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 animate-pulse" />
                    Signing in...
                  </span>
                ) : "Sign In"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name" className="text-lime-400 font-medium">Full Name</Label>
                <Input
                  id="full-name"
                  name="full-name"
                  type="text"
                  placeholder="John Doe"
                  required
                  className={cn(
                    "bg-[#0a0a12] border-lime-500/20 text-white",
                    "placeholder:text-gray-500",
                    "focus:border-lime-500/60 focus:ring-1 focus:ring-lime-500/40",
                    "transition-all duration-200"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-lime-400 font-medium">Email</Label>
                <Input
                  id="signup-email"
                  name="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className={cn(
                    "bg-[#0a0a12] border-lime-500/20 text-white",
                    "placeholder:text-gray-500",
                    "focus:border-lime-500/60 focus:ring-1 focus:ring-lime-500/40",
                    "transition-all duration-200"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-lime-400 font-medium">Password</Label>
                <Input
                  id="signup-password"
                  name="signup-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={cn(
                    "bg-[#0a0a12] border-lime-500/20 text-white",
                    "placeholder:text-gray-500",
                    "focus:border-lime-500/60 focus:ring-1 focus:ring-lime-500/40",
                    "transition-all duration-200"
                  )}
                />
              </div>
              <Button 
                type="submit" 
                className={cn(
                  "w-full bg-lime-400 text-black font-bold",
                  "shadow-[0_0_20px_rgba(0,255,0,0.4)]",
                  "hover:bg-lime-300 hover:shadow-[0_0_30px_rgba(0,255,0,0.6)]",
                  "active:scale-[0.98] transition-all duration-200"
                )} 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 animate-pulse" />
                    Creating account...
                  </span>
                ) : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Development Mode Button */}
        {isDev && (
          <div className="mt-6 pt-6 border-t border-cyan-500/20">
            <Button
              onClick={handleDevModeLogin}
              className={cn(
                "w-full bg-purple-600/40 text-purple-300 border border-purple-500/40",
                "hover:bg-purple-600/60 hover:border-purple-500/60",
                "font-medium transition-all duration-200",
                "text-sm"
              )}
            >
              <Zap className="h-3 w-3 mr-2" />
              Dev Mode Login
            </Button>
            <p className="text-xs text-purple-400/60 mt-2 text-center">
              Creates test session for development
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;