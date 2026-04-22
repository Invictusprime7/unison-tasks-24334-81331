import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Check, Star, ArrowLeft, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createCheckoutSession, resolveCheckoutSessionBody } from "@/runtime/checkoutClient";

// Initialize Stripe - use the publishable key from environment

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out Unison Tasks",
    features: [
      "1 project",
      "10 AI generations/month",
      "Basic templates",
      "Community support",
      "1 team member",
      "100MB storage"
    ],
    limitations: [
      "No custom domains",
      "Unison branding on published sites"
    ],
    cta: "Get Started Free",
    popular: false,
    stripePriceId: null
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For professionals and growing teams",
    features: [
      "Unlimited projects",
      "500 AI generations/month",
      "All premium templates",
      "Priority email support",
      "5 team members",
      "Custom domains",
      "Remove branding",
      "Advanced analytics",
      "API access",
      "10GB storage"
    ],
    limitations: [],
    cta: "Start Pro Trial",
    popular: true,
    stripePriceId: "price_pro_monthly" // Will be replaced with actual Stripe price ID
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    description: "For agencies and large teams",
    features: [
      "Everything in Pro",
      "Unlimited AI generations",
      "White-label solution",
      "Dedicated account manager",
      "Unlimited team members",
      "SSO & advanced security",
      "Custom integrations",
      "99.9% SLA guarantee",
      "Priority feature requests",
      "100GB storage"
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
    stripePriceId: "price_business_monthly" // Will be replaced with actual Stripe price ID
  }
];

const faqs = [
  {
    question: "Can I change plans later?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing."
  },
  {
    question: "What happens when I hit my AI generation limit?",
    answer: "You'll receive a notification when you're close to your limit. You can upgrade your plan or wait until the next month for your limit to reset."
  },
  {
    question: "Do you offer annual billing?",
    answer: "Yes! Annual billing gives you 2 months free (16% savings). Contact us for annual pricing."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment provider Stripe."
  },
  {
    question: "Is there a money-back guarantee?",
    answer: "Yes, we offer a 14-day money-back guarantee on all paid plans. No questions asked."
  }
];

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubscribe = async (tier: typeof pricingTiers[0]) => {
    // Free plan - just redirect to auth/dashboard
    if (!tier.stripePriceId) {
      navigate(isAuthenticated ? "/dashboard" : "/auth");
      return;
    }

    // Business plan - contact sales
    if (tier.name === "Business") {
      window.open("mailto:sales@unisontasks.com?subject=Business Plan Inquiry", "_blank");
      return;
    }

    // Check authentication
    if (!isAuthenticated) {
      // Store intent and redirect to auth
      sessionStorage.setItem("checkout_plan", tier.name.toLowerCase());
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to subscribe.",
      });
      navigate("/auth");
      return;
    }

    setLoadingPlan(tier.name);

    try {
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const checkoutBody = resolveCheckoutSessionBody({
        plan: tier.name.toLowerCase(),
      });

      if (!checkoutBody) {
        throw new Error("Invalid checkout configuration");
      }

      const data = await createCheckoutSession(checkoutBody);

      // Redirect to Stripe Checkout (URL is returned from edge function)
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Navigation */}
      <nav className="bg-[#0d0d18]/95 backdrop-blur-sm border-b border-cyan-500/20 shadow-[0_4px_20px_rgba(0,255,255,0.1)]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className={cn(
                "text-cyan-400/70 hover:text-cyan-400",
                "hover:bg-cyan-500/20",
                "transition-all duration-200"
              )}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]" />
              <span className="text-xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Unison Tasks</span>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/auth")}
            className={cn(
              "bg-cyan-500 text-black font-bold",
              "shadow-[0_0_15px_rgba(0,255,255,0.4)]",
              "hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]",
              "active:scale-95 transition-all duration-200"
            )}
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Header */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge className={cn(
          "mb-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
          "shadow-[0_0_15px_rgba(255,255,0,0.2)]"
        )}>
          <Zap className="h-3 w-3 mr-1" />
          Simple pricing, powerful features
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          Choose your <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(0,255,255,0.6)]">plan</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Start free, scale as you grow. All plans include our core features.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingTiers.map((tier, i) => {
            const tierColors = {
              0: { // Free - Lime
                border: "border-lime-500/30",
                shadow: "shadow-[0_0_30px_rgba(0,255,0,0.1)]",
                hoverShadow: "hover:shadow-[0_0_40px_rgba(0,255,0,0.2)]",
                accent: "text-lime-400",
                badge: "bg-lime-500/20 text-lime-400 border-lime-500/30",
                button: "bg-lime-500/20 text-lime-400 border border-lime-500/40 hover:bg-lime-500/30 hover:shadow-[0_0_15px_rgba(0,255,0,0.3)]",
              },
              1: { // Pro - Cyan (popular)
                border: "border-cyan-500/50",
                shadow: "shadow-[0_0_40px_rgba(0,255,255,0.2)]",
                hoverShadow: "hover:shadow-[0_0_50px_rgba(0,255,255,0.3)]",
                accent: "text-cyan-400",
                badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
                button: "bg-cyan-500 text-black font-bold shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(0,255,255,0.6)]",
              },
              2: { // Business - Fuchsia
                border: "border-fuchsia-500/30",
                shadow: "shadow-[0_0_30px_rgba(255,0,255,0.1)]",
                hoverShadow: "hover:shadow-[0_0_40px_rgba(255,0,255,0.2)]",
                accent: "text-fuchsia-400",
                badge: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
                button: "bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 hover:bg-fuchsia-500/30 hover:shadow-[0_0_15px_rgba(255,0,255,0.3)]",
              },
            };
            const colors = tierColors[i as keyof typeof tierColors];

            return (
              <div 
                key={i} 
                className={cn(
                  "relative bg-[#12121e] rounded-2xl p-6",
                  "border-2 transition-all duration-300",
                  colors.border,
                  colors.shadow,
                  colors.hoverShadow,
                  tier.popular && "scale-105 z-10"
                )}
              >
                {tier.popular && (
                  <Badge className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2",
                    "bg-cyan-500 text-black font-bold",
                    "shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                  )}>
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                )}
                
                {/* Header */}
                <div className="text-center pb-4">
                  <h3 className={cn("text-2xl font-bold", colors.accent)}>{tier.name}</h3>
                  <div className="mt-4">
                    <span className="text-5xl font-bold text-white">{tier.price}</span>
                    <span className="text-gray-400 text-lg">{tier.period}</span>
                  </div>
                  <p className="mt-3 text-gray-400 text-sm">{tier.description}</p>
                </div>

                {/* Features */}
                <div className="pt-6 border-t border-gray-800">
                  <ul className="space-y-3">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check className={cn("h-5 w-5 flex-shrink-0 mt-0.5", colors.accent)} />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {tier.limitations.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-800/50">
                      <p className="text-xs text-gray-500 mb-2">Limitations:</p>
                      <ul className="space-y-1">
                        {tier.limitations.map((limitation, j) => (
                          <li key={j} className="text-xs text-gray-500">• {limitation}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="pt-6">
                  <Button 
                    className={cn(
                      "w-full font-bold",
                      colors.button,
                      "active:scale-95 transition-all duration-200"
                    )}
                    size="lg"
                    onClick={() => handleSubscribe(tier)}
                    disabled={loadingPlan !== null}
                  >
                    {loadingPlan === tier.name ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      tier.cta
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-[#0d0d18] py-20 border-t border-cyan-500/10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            Frequently Asked <span className="text-yellow-400 drop-shadow-[0_0_15px_rgba(255,255,0,0.5)]">Questions</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className={cn(
                  "bg-[#12121e] rounded-xl p-6",
                  "border border-purple-500/20",
                  "shadow-[0_0_20px_rgba(168,85,247,0.05)]",
                  "hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]",
                  "transition-all duration-300"
                )}
              >
                <h3 className="text-lg font-bold text-purple-400 mb-2">{faq.question}</h3>
                <p className="text-gray-400 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cyan-500/10 py-8 bg-[#0a0a12]">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          © 2024 Unison Tasks. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
