import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<{
    plan: string;
    status: string;
  } | null>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifyAndFetchSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Poll until the webhook updates the subscription (up to 5 × 2s = 10s)
        let found = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const { data: sub } = await supabase
            .from("user_subscriptions")
            .select("plan, status")
            .eq("user_id", user.id)
            .single();

          if (sub && sub.status === "active" && sub.plan !== "free") {
            found = sub;
            break;
          }
        }

        if (found) {
          setSubscription(found);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetchSubscription();
  }, [navigate, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-lime-400 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(132,204,22,0.5)]" />
          <p className="text-lg text-gray-400">Confirming your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      </div>
      
      <Card className="max-w-md w-full text-center bg-[#12121e] border-lime-500/30 shadow-[0_0_30px_rgba(132,204,22,0.2)] relative z-10">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-lime-500/20 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(132,204,22,0.3)]">
            <CheckCircle2 className="h-10 w-10 text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.5)]" />
          </div>
          <CardTitle className="text-2xl text-white">Payment Successful!</CardTitle>
          <CardDescription className="text-gray-400">
            Welcome to Unison Tasks {subscription?.plan ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) : "Pro"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 justify-center mb-2">
              <Sparkles className="h-5 w-5 text-lime-400" />
              <span className="font-semibold text-white">Your new benefits are active</span>
            </div>
            <ul className="text-sm text-gray-400 space-y-1">
              {subscription?.plan === "business" ? (
                <>
                  <li>✓ Unlimited AI generations</li>
                  <li>✓ Unlimited team members</li>
                  <li>✓ White-label solution</li>
                  <li>✓ Priority support</li>
                </>
              ) : (
                <>
                  <li>✓ Unlimited projects</li>
                  <li>✓ 500 AI generations/month</li>
                  <li>✓ Custom domains</li>
                  <li>✓ API access</li>
                </>
              )}
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              className={cn(
                "w-full bg-lime-500 text-black font-bold",
                "shadow-[0_0_20px_rgba(132,204,22,0.4)]",
                "hover:bg-lime-400 hover:shadow-[0_0_30px_rgba(132,204,22,0.6)]",
                "active:scale-95 transition-all duration-200"
              )}
              size="lg"
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className="w-full border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
              onClick={() => navigate("/settings")}
            >
              Manage Subscription
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            A confirmation email has been sent to your email address.
            You can manage your subscription anytime from Settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;
