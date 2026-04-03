import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { 
  CheckSquare, 
  Zap, 
  Shield, 
  Sparkles, 
  AlertCircle, 
  LogOut,
  Check, 
  ArrowRight,
  Star,
  Play,
  Layers,
  Workflow,
  Bot,
  Cloud,
  FolderOpen,
  Clock,
  ExternalLink,
  Plus,
  Paintbrush,
  Menu
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { businessSystems } from "@/data/templates/types";
import { getTemplatesByCategory, type LayoutTemplate } from "@/data/templates";
import { BusinessLauncher } from "@/components/onboarding/BusinessLauncher";
import { SystemsAIPanel } from "@/components/onboarding/SystemsAIPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DocHelper } from "@/components/docs";

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Launch your first business system",
    features: [
      "1 live system",
      "10 AI generations/month",
      "Pre-built templates",
      "Community support",
      "All core features"
    ],
    limitations: [],
    cta: "Start Free",
    popular: false,
    variant: "outline" as const
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Scale with unlimited systems",
    features: [
      "Unlimited systems",
      "500 AI generations/month",
      "Custom domains",
      "Priority support",
      "Advanced analytics",
      "Remove branding",
      "API access"
    ],
    limitations: [],
    cta: "Start Pro Trial",
    popular: true,
    variant: "default" as const
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    description: "For agencies and teams",
    features: [
      "Everything in Pro",
      "Unlimited AI",
      "White-label",
      "Dedicated support",
      "Unlimited team",
      "SSO & security",
      "Custom integrations"
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
    variant: "outline" as const
  }
];

const platformFeatures = [
  {
    icon: Layers,
    title: "Ready-to-Run Systems",
    description: "Not just templates. Complete business systems with booking, payments, and CRM pre-wired."
  },
  {
    icon: Zap,
    title: "Buttons That Work",
    description: "Every button knows what it does. Forms submit, carts update, bookings confirm—automatically."
  },
  {
    icon: Bot,
    title: "AI That Understands Context",
    description: "Generate pages, copy, and features that understand your business type and goals."
  },
  {
    icon: Workflow,
    title: "Built-in Automation",
    description: "Lead capture, email notifications, and CRM updates happen without extra setup."
  },
  {
    icon: Shield,
    title: "Enterprise-Ready",
    description: "Secure infrastructure, custom domains, and SSO for growing teams."
  },
  {
    icon: Sparkles,
    title: "One-Click Launch",
    description: "From template to live website in minutes. No deployment headaches."
  }
];

// Interface for recent projects from design_templates table
interface RecentProject {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  created_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    if (!isSupabaseConfigured) {
      console.warn('⚠️ Backend is not properly configured. Some features may not work.');
    }

    return () => subscription.unsubscribe();
  }, []);

  // Load recent projects when user is authenticated
  useEffect(() => {
    const loadRecentProjects = async () => {
      if (!user || !isSupabaseConfigured) return;
      
      setLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from('design_templates')
          .select('id, name, description, is_public, updated_at, created_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(6);

        if (error) {
          console.error('Error loading recent projects:', error);
        } else {
          setRecentProjects(data || []);
        }
      } catch (err) {
        console.error('Failed to load recent projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadRecentProjects();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const handleStartLauncher = () => {
    if (user) {
      setLauncherOpen(true);
    } else {
      // For non-authenticated users, still show launcher (they'll auth after)
      setLauncherOpen(true);
    }
  };

  const isNewTemplate = (t: LayoutTemplate) => {
    const tags = t.tags || [];
    return tags.includes("editorial") || /data-ut-(cta|intent)\s*=/.test(t.code);
  };

  const launchableSystems = businessSystems.filter((system) =>
    system.templateCategories
      .flatMap((cat) => getTemplatesByCategory(cat))
      .some(isNewTemplate)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Configuration Warning */}
      {!isSupabaseConfigured && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
          <div className="container mx-auto flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              <strong>Configuration Warning:</strong> Backend environment variables are not properly set.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sheet open={docsOpen} onOpenChange={setDocsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open documentation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[400px] sm:w-[450px] p-0 overflow-hidden">
                <DocHelper embedded className="h-full" />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">Unison Tasks</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#systems" className="text-muted-foreground hover:text-foreground transition-colors">Systems</a>
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            {user && <SubscriptionBadge />}
            <Button 
              variant="outline" 
              onClick={() => navigate("/cloud")} 
              className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/20"
            >
              <Cloud className="h-4 w-4 mr-2 text-blue-500" />
              Cloud
            </Button>
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button onClick={handleStartLauncher}>
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - New Positioning */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/40" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mt-24 h-72 rounded-[2rem] bg-primary/10 blur-3xl" />
          </div>
        </div>
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <Badge variant="secondary" className="mb-6">
            <Zap className="h-3 w-3 mr-1" />
            Installable systems · real backend included
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground leading-tight">
            Launch-ready business systems
            <span className="block text-primary">that ship with working logic</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Pick a system, choose a contract-ready starter, and we’ll install the backend packs
            (data, workflows, intents) automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => document.getElementById('systems-ai')?.scrollIntoView({ behavior: 'smooth' })} className="text-lg px-8 h-14">
              <Play className="mr-2 h-5 w-5" />
              {user ? "Launch a System" : "Start Free"}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/web-builder")} className="text-lg px-8 h-14">
              Explore Builder
            </Button>
          </div>
          {!user && (
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required · You’ll sign in when you install
            </p>
          )}
          </div>
        </div>
      </section>
      {/* Systems AI Panel - Main interactive component */}
      <SystemsAIPanel 
        user={user} 
        onAuthRequired={() => navigate("/auth")} 
      />
      {/* Recent Projects Section - Only visible for authenticated users */}
      {user && (
        <section className="container mx-auto px-4 py-12 border-b border-border/40">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Your Recent Projects</h2>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/cloud")}
              className="text-muted-foreground hover:text-foreground"
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          {loadingProjects ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
              Loading projects...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((project) => (
              <Card 
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
                onClick={() => navigate(`/web-builder?id=${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                        {project.name || 'Untitled Project'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">
                          {new Date(project.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={project.is_public ? 'default' : 'secondary'}
                      className="text-xs shrink-0"
                    >
                      {project.is_public ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardFooter className="pt-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/web-builder?id=${project.id}`);
                    }}
                  >
                    <Paintbrush className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {/* Quick Add New Project Card */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all border-dashed hover:border-primary/50 flex items-center justify-center min-h-[140px]"
              onClick={handleStartLauncher}
            >
              <CardContent className="flex flex-col items-center justify-center py-6 text-muted-foreground hover:text-primary transition-colors">
                <Plus className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">New Project</span>
              </CardContent>
            </Card>
          </div>
          )}
        </section>
      )}

      {/* The Difference Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Why Unison Tasks</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Templates are dead. Systems are alive.
              </h2>
              <p className="text-lg text-muted-foreground">
                Other tools give you static pages. We give you running businesses.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Old Way */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-lg text-destructive">❌ Static Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>• Buttons don't do anything</p>
                  <p>• Forms need manual wiring</p>
                  <p>• Payments require integration</p>
                  <p>• Booking needs separate app</p>
                  <p>• Weeks of development work</p>
                </CardContent>
              </Card>

              {/* New Way */}
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">✓ Unison Systems</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>• Buttons pre-wired to actions</p>
                  <p>• Forms auto-submit to CRM</p>
                  <p>• Payments work out of box</p>
                  <p>• Booking calendar included</p>
                  <p>• Backend packs installed automatically</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Everything is connected</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No plugins. No integrations. Just launch.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {platformFeatures.map((feature, i) => (
              <Card key={i} className="border-border/50 bg-background">
                <CardHeader>
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Simple pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade when you grow.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, i) => (
              <Card 
                key={i} 
                className={`relative border-2 ${tier.popular ? 'border-primary shadow-lg scale-105' : 'border-border/50'}`}
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
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                  <CardDescription className="mt-2">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={tier.variant}
                    onClick={handleStartLauncher}
                  >
                    {tier.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto bg-primary text-primary-foreground border-0">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to launch?</h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Pick a business type. We'll handle the rest.
              </p>
              <Button 
                size="lg" 
                variant="secondary" 
                onClick={handleStartLauncher}
                className="text-lg px-8 h-14"
              >
                <Zap className="mr-2 h-5 w-5" />
                Launch Your System
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">Unison Tasks</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Unison Tasks. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Business Launcher Dialog - New Flow */}
      <BusinessLauncher open={launcherOpen} onOpenChange={setLauncherOpen} />
    </div>
  );
};

export default Index;
