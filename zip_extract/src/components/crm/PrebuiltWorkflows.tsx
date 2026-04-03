import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Package, 
  Check, 
  Clock, 
  Mail, 
  MessageSquare, 
  Calendar,
  Star,
  Bell,
  UserX,
  Send,
  RefreshCw,
  Zap,
  ChevronRight,
  Download,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Recipe pack from database
interface RecipePack {
  id: string;
  pack_id: string;
  name: string;
  description: string | null;
  industry: string;
  icon: string;
  tier: 'free' | 'pro' | 'business';
  is_published: boolean;
  version: number;
  recipes: Recipe[];
}

interface Recipe {
  id: string;
  name: string;
  trigger: string;
  delay?: string;
  description: string;
  actions?: string[];
}

interface InstalledPack {
  id: string;
  pack_id: string;
  enabled: boolean;
  installed_at: string;
}

interface RecipeToggle {
  recipe_id: string;
  enabled: boolean;
}

// Icon mapping for recipe types
const recipeIcons: Record<string, typeof Zap> = {
  'booking_confirmation': Check,
  'appointment_reminder_24h': Clock,
  'appointment_reminder_1h': Bell,
  'followup_review_request': Star,
  'lead_followup': Send,
  'noshow_followup': UserX,
  'cancellation_rebooking': RefreshCw,
};

// Trigger display names
const triggerLabels: Record<string, string> = {
  'booking.create': 'When booking is created',
  'booking.confirmed': 'When booking is confirmed',
  'booking.cancelled': 'When booking is cancelled',
  'booking.noshow': 'When customer is a no-show',
  'job.completed': 'When service is completed',
  'contact.submit': 'When contact form is submitted',
  'newsletter.subscribe': 'When someone subscribes',
};

// Action labels
const actionLabels: Record<string, { label: string; icon: typeof Mail }> = {
  'send_email': { label: 'Send Email', icon: Mail },
  'send_sms': { label: 'Send SMS', icon: MessageSquare },
  'create_task': { label: 'Create Task', icon: Calendar },
};

export function PrebuiltWorkflows() {
  const [packs, setPacks] = useState<RecipePack[]>([]);
  const [installedPacks, setInstalledPacks] = useState<Map<string, InstalledPack>>(new Map());
  const [recipeToggles, setRecipeToggles] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<RecipePack | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessAndPacks();
  }, []);

  async function fetchBusinessAndPacks() {
    try {
      // Get user's business
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1);

      const bizId = businesses?.[0]?.id;
      setBusinessId(bizId || null);

      // Fetch all published recipe packs
      const { data: packsData, error: packsError } = await supabase
        .from("automation_recipe_packs")
        .select("*")
        .eq("is_published", true)
        .order("industry");

      if (packsError) throw packsError;

      // Parse recipes JSON
      const parsedPacks = (packsData || []).map((p: any) => ({
        ...p,
        recipes: typeof p.recipes === 'string' ? JSON.parse(p.recipes) : (p.recipes || []),
      }));
      setPacks(parsedPacks);

      // Set first pack as selected
      if (parsedPacks.length > 0) {
        // Prefer salon pack
        const salonPack = parsedPacks.find((p: RecipePack) => p.industry === 'salon');
        setSelectedPack(salonPack || parsedPacks[0]);
      }

      // Fetch installed packs for this business
      if (bizId) {
        const { data: installed } = await supabase
          .from("installed_recipe_packs")
          .select("*")
          .eq("business_id", bizId);

        const installedMap = new Map<string, InstalledPack>();
        (installed || []).forEach((i: InstalledPack) => {
          installedMap.set(i.pack_id, i);
        });
        setInstalledPacks(installedMap);

        // Fetch recipe toggles
        const { data: toggles } = await supabase
          .from("business_recipe_toggles")
          .select("recipe_id, enabled")
          .eq("business_id", bizId);

        const toggleMap = new Map<string, boolean>();
        (toggles || []).forEach((t: RecipeToggle) => {
          toggleMap.set(t.recipe_id, t.enabled);
        });
        setRecipeToggles(toggleMap);
      }
    } catch (error) {
      console.error("Error fetching recipe packs:", error);
      toast.error("Failed to load automation packs");
    } finally {
      setLoading(false);
    }
  }

  async function installPack(pack: RecipePack) {
    if (!businessId) {
      toast.error("Please create a business first");
      return;
    }

    setInstalling(pack.pack_id);
    try {
      const { error } = await supabase
        .from("installed_recipe_packs")
        .upsert({
          business_id: businessId,
          pack_id: pack.pack_id,
          enabled: true,
        }, { onConflict: 'business_id,pack_id' });

      if (error) throw error;

      // Update local state
      setInstalledPacks(prev => {
        const next = new Map(prev);
        next.set(pack.pack_id, {
          id: crypto.randomUUID(),
          pack_id: pack.pack_id,
          enabled: true,
          installed_at: new Date().toISOString(),
        });
        return next;
      });

      toast.success(`${pack.name} installed successfully!`);
    } catch (error) {
      console.error("Error installing pack:", error);
      toast.error("Failed to install pack");
    } finally {
      setInstalling(null);
    }
  }

  async function togglePack(packId: string, enabled: boolean) {
    if (!businessId) return;

    try {
      const { error } = await supabase
        .from("installed_recipe_packs")
        .update({ enabled })
        .eq("business_id", businessId)
        .eq("pack_id", packId);

      if (error) throw error;

      setInstalledPacks(prev => {
        const next = new Map(prev);
        const existing = next.get(packId);
        if (existing) {
          next.set(packId, { ...existing, enabled });
        }
        return next;
      });

      toast.success(enabled ? "Pack enabled" : "Pack disabled");
    } catch (error) {
      console.error("Error toggling pack:", error);
      toast.error("Failed to update pack");
    }
  }

  async function toggleRecipe(recipeId: string, enabled: boolean) {
    if (!businessId) return;

    try {
      const { error } = await supabase
        .from("business_recipe_toggles")
        .upsert({
          business_id: businessId,
          recipe_id: recipeId,
          enabled,
        }, { onConflict: 'business_id,recipe_id' });

      if (error) throw error;

      setRecipeToggles(prev => {
        const next = new Map(prev);
        next.set(recipeId, enabled);
        return next;
      });

      toast.success(enabled ? "Recipe enabled" : "Recipe disabled");
    } catch (error) {
      console.error("Error toggling recipe:", error);
      toast.error("Failed to update recipe");
    }
  }

  function formatDelay(delay?: string): string {
    if (!delay) return 'Immediately';
    if (delay === 'P1D') return '24 hours before';
    if (delay === 'PT1H') return '1 hour before';
    if (delay === 'PT2H') return '2 hours after';
    if (delay === 'PT30M') return '30 minutes after';
    return delay;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <Card className="p-8 text-center">
        <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Set Up Your Business First</h3>
        <p className="text-muted-foreground mb-4">
          Create a business to access prebuilt automation workflows
        </p>
        <Button>Create Business</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Prebuilt Workflows
          </h2>
          <p className="text-muted-foreground mt-1">
            Ready-to-use automation recipes for your salon business
          </p>
        </div>
      </div>

      {/* Pack Selection Tabs */}
      <Tabs 
        value={selectedPack?.pack_id || ''} 
        onValueChange={(v) => {
          const pack = packs.find(p => p.pack_id === v);
          if (pack) setSelectedPack(pack);
        }}
        className="w-full"
      >
        <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-transparent p-0 mb-6">
          {packs.map((pack) => {
            const isInstalled = installedPacks.has(pack.pack_id);
            return (
              <TabsTrigger
                key={pack.pack_id}
                value={pack.pack_id}
                className={cn(
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                  "border px-4 py-2 rounded-lg gap-2",
                  isInstalled && "border-green-500/50"
                )}
              >
                <span className="text-lg">{pack.icon}</span>
                <span>{pack.name}</span>
                {isInstalled && (
                  <Check className="h-3 w-3 text-green-500" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {packs.map((pack) => (
          <TabsContent key={pack.pack_id} value={pack.pack_id} className="mt-0">
            {/* Pack Header Card */}
            <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{pack.icon}</div>
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {pack.name}
                        <Badge variant={pack.tier === 'free' ? 'secondary' : 'default'}>
                          {pack.tier}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {pack.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {installedPacks.has(pack.pack_id) ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {installedPacks.get(pack.pack_id)?.enabled ? 'Active' : 'Paused'}
                          </span>
                          <Switch
                            checked={installedPacks.get(pack.pack_id)?.enabled || false}
                            onCheckedChange={(checked) => togglePack(pack.pack_id, checked)}
                          />
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings2 className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => installPack(pack)}
                        disabled={installing === pack.pack_id}
                      >
                        {installing === pack.pack_id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            Installing...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Install Pack
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {installedPacks.has(pack.pack_id) && (
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="h-4 w-4" />
                      <span>{pack.recipes.length} automations ready</span>
                    </div>
                    <div className="text-muted-foreground">
                      Installed {new Date(installedPacks.get(pack.pack_id)?.installed_at || '').toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Recipes Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {pack.recipes.map((recipe) => {
                const RecipeIcon = recipeIcons[recipe.id] || Zap;
                const isEnabled = recipeToggles.get(recipe.id) !== false;
                const isPackInstalled = installedPacks.has(pack.pack_id);
                
                return (
                  <Card 
                    key={recipe.id}
                    className={cn(
                      "transition-all",
                      !isPackInstalled && "opacity-60",
                      isPackInstalled && isEnabled && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <RecipeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{recipe.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {recipe.description}
                            </p>
                          </div>
                        </div>
                        {isPackInstalled && (
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => toggleRecipe(recipe.id, checked)}
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Trigger */}
                      <div className="flex items-center gap-2 text-sm mb-3">
                        <Badge variant="outline" className="gap-1">
                          <Zap className="h-3 w-3" />
                          {triggerLabels[recipe.trigger] || recipe.trigger}
                        </Badge>
                        {recipe.delay && (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDelay(recipe.delay)}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      {recipe.actions && recipe.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {recipe.actions.map((action, i) => {
                            const actionInfo = actionLabels[action];
                            const ActionIcon = actionInfo?.icon || Send;
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
                              >
                                <ActionIcon className="h-3 w-3" />
                                {actionInfo?.label || action}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Expand for details */}
                      {isPackInstalled && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-3 text-muted-foreground hover:text-foreground"
                        >
                          View Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Empty State for No Recipes */}
            {pack.recipes.length === 0 && (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Recipes Yet</h3>
                <p className="text-muted-foreground">
                  This pack doesn't have any automation recipes yet
                </p>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Empty State for No Packs */}
      {packs.length === 0 && (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Automation Packs Available</h3>
          <p className="text-muted-foreground">
            Check back soon for prebuilt automation workflows
          </p>
        </Card>
      )}
    </div>
  );
}
