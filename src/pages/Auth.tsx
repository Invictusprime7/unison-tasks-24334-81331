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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/home");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/home");
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
        emailRedirectTo: `${window.location.origin}/home`,
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
      </div>
    </div>
  );
};

export default Auth;