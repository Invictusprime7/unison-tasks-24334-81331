import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Check, Star, ArrowLeft, Zap } from "lucide-react";

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

  const handleSubscribe = (tier: typeof pricingTiers[0]) => {
    if (tier.stripePriceId) {
      // TODO: Implement Stripe checkout
      navigate("/auth");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">Unison Tasks</span>
            </div>
          </div>
          <Button onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </nav>

      {/* Header */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">
          <Zap className="h-3 w-3 mr-1" />
          Simple pricing, powerful features
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Choose your plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start free, scale as you grow. All plans include our core features.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingTiers.map((tier, i) => (
            <Card 
              key={i} 
              className={`relative border-2 ${tier.popular ? 'border-primary shadow-xl scale-105' : 'border-border/50'}`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground text-lg">{tier.period}</span>
                </div>
                <CardDescription className="mt-3">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {tier.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                {tier.limitations.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Limitations:</p>
                    <ul className="space-y-1">
                      {tier.limitations.map((limitation, j) => (
                        <li key={j} className="text-xs text-muted-foreground">• {limitation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-4">
                <Button 
                  className="w-full" 
                  variant={tier.popular ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleSubscribe(tier)}
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqs.map((faq, i) => (
              <Card key={i} className="border-border/50 bg-background">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2024 Unison Tasks. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
