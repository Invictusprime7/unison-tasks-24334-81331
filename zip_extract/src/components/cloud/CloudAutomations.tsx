/**
 * CLOUD AUTOMATIONS - Automation Recipes & Workflow Management
 * 
 * Provides a UI for managing:
 * - Business selection and automation wiring
 * - Automation recipe packs by industry
 * - Per-business automation settings
 * - Active workflow monitoring
 * - Automation run history
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Zap, 
  Package, 
  Settings, 
  History, 
  Play, 
  Pause, 
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  RefreshCw,
  ChevronRight,
  Loader2,
  Sparkles,
  Bell,
  Shield,
  Check,
  Link2,
  Unlink,
  Power,
  Globe,
  Calendar,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CloudAutomationsProps {
  userId: string;
}

interface Business {
  id: string;
  name: string;
  industry: string | null;
  slug: string | null;
  website: string | null;
  created_at: string;
  automations_enabled?: boolean;
  automation_settings?: AutomationSettings | null;
}

interface AutomationSettings {
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  business_days: number[];
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  max_messages_per_contact_per_day: number;
  automations_enabled: boolean;
}

interface RecipePack {
  pack_id: string;
  name: string;
  description: string;
  industry: string;
  icon: string;
  tier: string;
}

interface AutomationRun {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  steps_completed: number;
  max_steps: number;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

const INDUSTRY_OPTIONS = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'salon', label: 'Salon & Spa', icon: '💇' },
  { value: 'contractor', label: 'Contractor', icon: '🔧' },
  { value: 'agency', label: 'Agency', icon: '📊' },
  { value: 'ecommerce', label: 'E-Commerce', icon: '🛒' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'realestate', label: 'Real Estate', icon: '🏠' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'other', label: 'Other', icon: '⚡' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const DEFAULT_SETTINGS: AutomationSettings = {
  business_hours_enabled: false,
  business_hours_start: '09:00',
  business_hours_end: '17:00',
  business_days: [1, 2, 3, 4, 5],
  quiet_hours_enabled: true,
  quiet_hours_start: '21:00',
  quiet_hours_end: '08:00',
  max_messages_per_contact_per_day: 5,
  automations_enabled: true,
};

// Default recipe packs - shown when database doesn't have them yet
const DEFAULT_RECIPE_PACKS: RecipePack[] = [
  {
    pack_id: 'salon_basic',
    name: 'Salon Essentials',
    description: 'Booking confirmations, appointment reminders, and review requests for salons and spas',
    industry: 'salon',
    icon: '💇',
    tier: 'free',
  },
  {
    pack_id: 'contractor_basic',
    name: 'Contractor Essentials',
    description: 'Quote follow-ups, lead nurturing, and job completion reviews for contractors',
    industry: 'contractor',
    icon: '🔧',
    tier: 'free',
  },
  {
    pack_id: 'restaurant_basic',
    name: 'Restaurant Essentials',
    description: 'Reservation confirmations, reminders, and no-show follow-ups for restaurants',
    industry: 'restaurant',
    icon: '🍽️',
    tier: 'free',
  },
  {
    pack_id: 'agency_basic',
    name: 'Agency Essentials',
    description: 'Consultation bookings, proposal follow-ups, and client onboarding for agencies',
    industry: 'agency',
    icon: '📊',
    tier: 'free',
  },
  {
    pack_id: 'ecommerce_basic',
    name: 'E-commerce Essentials',
    description: 'Order confirmations, abandoned cart recovery, and post-purchase reviews',
    industry: 'ecommerce',
    icon: '🛒',
    tier: 'free',
  },
  {
    pack_id: 'healthcare_basic',
    name: 'Healthcare Essentials',
    description: 'Appointment reminders, follow-up care, and patient feedback collection',
    industry: 'healthcare',
    icon: '🏥',
    tier: 'free',
  },
  {
    pack_id: 'realestate_basic',
    name: 'Real Estate Essentials',
    description: 'Property viewing confirmations, lead follow-ups, and closing celebrations',
    industry: 'realestate',
    icon: '🏠',
    tier: 'free',
  },
  {
    pack_id: 'fitness_basic',
    name: 'Fitness Essentials',
    description: 'Class bookings, membership renewals, and workout reminders',
    industry: 'fitness',
    icon: '💪',
    tier: 'free',
  },
];

export function CloudAutomations({ userId }: CloudAutomationsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('businesses');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [recipePacks, setRecipePacks] = useState<RecipePack[]>([]);
  const [recentRuns, setRecentRuns] = useState<AutomationRun[]>([]);
  const [editingSettings, setEditingSettings] = useState<AutomationSettings | null>(null);
  const [installingPackId, setInstallingPackId] = useState<string | null>(null);
  const [lastInstall, setLastInstall] = useState<
    | { pack: RecipePack; result: any; installedAt: string; businessId: string }
    | null
  >(null);

  useEffect(() => {
    loadBusinesses();
    loadRecipePacks();
  }, [userId]);

  useEffect(() => {
    if (selectedBusiness) {
      loadBusinessAutomationData(selectedBusiness.id);
    }
  }, [selectedBusiness]);

  const mapIndustryToSystemType = (industry: string): string => {
    const industryToSystemType: Record<string, string> = {
      salon: 'booking',
      restaurant: 'booking',
      contractor: 'booking',
      agency: 'agency',
      startup: 'saas',
      ecommerce: 'store',
      blog: 'content',
      landing: 'content',
      portfolio: 'portfolio',
      general: 'agency',
      healthcare: 'booking',
      realestate: 'agency',
      fitness: 'booking',
      other: 'agency',
    };
    return industryToSystemType[industry] || 'agency';
  };

  const installRecipePack = async (pack: RecipePack) => {
    if (!selectedBusiness) {
      toast.error('Select a business first');
      return;
    }

    try {
      setInstallingPackId(pack.pack_id);
      setLastInstall(null);

      const systemType = mapIndustryToSystemType(pack.industry);
      console.log('[CloudAutomations] Installing pack', {
        packId: pack.pack_id,
        systemType,
        businessId: selectedBusiness.id,
      });

      const { data: installData, error: installError } = await supabase.functions.invoke('install-system', {
        body: {
          systemType,
          businessId: selectedBusiness.id,
          businessName: selectedBusiness.name,
          templateCategory: pack.industry,
        },
      });

      if (installError) {
        console.error('[CloudAutomations] install-system failed', installError);
        toast.error(`Install failed: ${installError.message}`);
        return;
      }

      // Optional bookkeeping for UI (non-fatal if blocked by RLS)
      try {
        await supabase
          .from('installed_recipe_packs')
          .upsert({
            business_id: selectedBusiness.id,
            pack_id: pack.pack_id,
            enabled: true,
            installed_at: new Date().toISOString(),
          });
      } catch (e) {
        console.warn('[CloudAutomations] Could not upsert installed_recipe_packs (non-fatal)', e);
      }

      const resultData = installData?.data || installData;
      setLastInstall({
        pack,
        result: resultData,
        installedAt: new Date().toISOString(),
        businessId: selectedBusiness.id,
      });

      toast.success(
        `${pack.name} installed: ${(resultData?.packs || []).length} backend packs, ${resultData?.intentsRegistered || 0} intents registered.`
      );

      // Refresh history panel data for this business (best-effort)
      await loadBusinessAutomationData(selectedBusiness.id);
    } catch (e) {
      console.error('[CloudAutomations] installRecipePack error', e);
      toast.error(`Install failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setInstallingPackId(null);
    }
  };

  const loadRecipePacks = async () => {
    try {
      const { data: packs } = await supabase
        .from('automation_recipe_packs')
        .select('pack_id, name, description, industry, icon, tier')
        .eq('is_published', true)
        .order('industry');

      if (packs && packs.length > 0) {
        setRecipePacks(packs as RecipePack[]);
      } else {
        // Use default packs if none in database
        setRecipePacks(DEFAULT_RECIPE_PACKS);
      }
    } catch {
      // Fallback to defaults on error
      setRecipePacks(DEFAULT_RECIPE_PACKS);
    }
  };

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      // Load all user's businesses - use select('*') to match CloudBusinesses pattern
      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .order('name');

      if (error) {
        console.error('Error loading businesses:', error);
        // Don't show error toast - table might not have expected columns
        setBusinesses([]);
        setLoading(false);
        return;
      }

      if (businessData && businessData.length > 0) {
        // Cast to our Business type and load automation settings
        const businessesWithSettings: Business[] = await Promise.all(
          businessData.map(async (biz: Record<string, unknown>) => {
            const business = {
              id: biz.id as string,
              name: biz.name as string,
              industry: (biz.industry as string) || null,
              slug: (biz.slug as string) || null,
              website: (biz.website as string) || null,
              created_at: biz.created_at as string,
            };
            
            try {
              const { data: settings } = await supabase
                .from('business_automation_settings')
                .select('*')
                .eq('business_id', business.id)
                .maybeSingle();

              return {
                ...business,
                automations_enabled: settings?.automations_enabled ?? false,
                automation_settings: settings ? {
                  business_hours_enabled: settings.business_hours_enabled,
                  business_hours_start: settings.business_hours_start,
                  business_hours_end: settings.business_hours_end,
                  business_days: settings.business_days,
                  quiet_hours_enabled: settings.quiet_hours_enabled,
                  quiet_hours_start: settings.quiet_hours_start,
                  quiet_hours_end: settings.quiet_hours_end,
                  max_messages_per_contact_per_day: settings.max_messages_per_contact_per_day,
                  automations_enabled: settings.automations_enabled,
                } : null,
              } as Business;
            } catch {
              return { ...business, automations_enabled: false, automation_settings: null } as Business;
            }
          })
        );

        setBusinesses(businessesWithSettings);
      } else {
        setBusinesses([]);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      // Silently fail - don't show toast for schema mismatches
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessAutomationData = async (businessId: string) => {
    try {
      // Load recent automation events for this business
      const { data: events } = await supabase
        .from('automation_events')
        .select('id, intent, status, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (events) {
        setRecentRuns(events.map(e => ({
          id: e.id,
          workflow_id: e.id,
          workflow_name: e.intent,
          status: e.status === 'processed' ? 'completed' : e.status === 'failed' ? 'failed' : 'running',
          steps_completed: 1,
          max_steps: 1,
          created_at: e.created_at,
          completed_at: e.status === 'processed' ? e.created_at : null,
          error_message: null,
        })));
      }

      // Load recipe packs from database or use defaults
      const { data: packs } = await supabase
        .from('automation_recipe_packs')
        .select('pack_id, name, description, industry, icon, tier')
        .eq('is_published', true)
        .order('industry');

      if (packs && packs.length > 0) {
        setRecipePacks(packs as RecipePack[]);
      } else {
        // Use default packs if none in database
        setRecipePacks(DEFAULT_RECIPE_PACKS);
      }
    } catch (error) {
      console.error('Error loading business automation data:', error);
    }
  };

  const enableAutomations = async (business: Business) => {
    setSaving(business.id);
    try {
      const { data: existing } = await supabase
        .from('business_automation_settings')
        .select('id')
        .eq('business_id', business.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('business_automation_settings')
          .update({ automations_enabled: true, updated_at: new Date().toISOString() })
          .eq('business_id', business.id);
      } else {
        await supabase
          .from('business_automation_settings')
          .insert({
            business_id: business.id,
            ...DEFAULT_SETTINGS,
            automations_enabled: true,
          });
      }

      toast.success(`Automations enabled for ${business.name}`);
      await loadBusinesses();
    } catch (error) {
      console.error('Error enabling automations:', error);
      toast.error('Failed to enable automations');
    } finally {
      setSaving(null);
    }
  };

  const disableAutomations = async (business: Business) => {
    setSaving(business.id);
    try {
      await supabase
        .from('business_automation_settings')
        .update({ automations_enabled: false, updated_at: new Date().toISOString() })
        .eq('business_id', business.id);

      toast.success(`Automations disabled for ${business.name}`);
      await loadBusinesses();
    } catch (error) {
      console.error('Error disabling automations:', error);
      toast.error('Failed to disable automations');
    } finally {
      setSaving(null);
    }
  };

  const saveSettings = async () => {
    if (!selectedBusiness || !editingSettings) return;
    
    setSaving(selectedBusiness.id);
    try {
      const { data: existing } = await supabase
        .from('business_automation_settings')
        .select('id')
        .eq('business_id', selectedBusiness.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('business_automation_settings')
          .update({
            ...editingSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('business_id', selectedBusiness.id);
      } else {
        await supabase
          .from('business_automation_settings')
          .insert({
            business_id: selectedBusiness.id,
            ...editingSettings,
          });
      }

      toast.success('Settings saved');
      setEditingSettings(null);
      await loadBusinesses();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const openSettings = (business: Business) => {
    setSelectedBusiness(business);
    setEditingSettings(business.automation_settings || DEFAULT_SETTINGS);
    setActiveTab('settings');
  };

  const selectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    // Pre-load settings for editing
    setEditingSettings(business.automation_settings || DEFAULT_SETTINGS);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4 text-blue-400" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-400" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-400" />
            Automations
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Wire your businesses to automated workflows and recipe packs
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadBusinesses}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-white/[0.03] border border-white/5">
            <TabsTrigger value="businesses" className="data-[state=active]:bg-white/10">
              <Building2 className="h-4 w-4 mr-2" />
              Businesses
            </TabsTrigger>
            <TabsTrigger value="recipes" className="data-[state=active]:bg-white/10">
              <Package className="h-4 w-4 mr-2" />
              Recipe Packs
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white/10">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white/10" disabled={!selectedBusiness}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
          {selectedBusiness && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Selected:</span>
              <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                {selectedBusiness.name}
              </Badge>
            </div>
          )}
        </div>

        {/* Helper message when no business selected */}
        {!selectedBusiness && businesses.length > 0 && activeTab === 'businesses' && (
          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Click on a business card below to select it, then access Recipe Packs, History, and Settings tabs.
          </div>
        )}

        {/* Businesses Tab */}
        <TabsContent value="businesses" className="mt-6">
          {businesses.length === 0 ? (
            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Businesses Found</h3>
                <p className="text-slate-400 mb-4">
                  Create a business in the Businesses tab first, then come back here to wire it to automations.
                </p>
                <Button onClick={() => window.location.href = '/cloud?tab=businesses'}>
                  Go to Businesses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {businesses.map((business) => {
                const industryInfo = INDUSTRY_OPTIONS.find(i => i.value === business.industry) || INDUSTRY_OPTIONS[INDUSTRY_OPTIONS.length - 1];
                const isEnabled = business.automations_enabled;
                const isSaving = saving === business.id;

                return (
                  <Card 
                    key={business.id}
                    onClick={() => selectBusiness(business)}
                    className={cn(
                      "bg-white/[0.02] border transition-all cursor-pointer",
                      isEnabled ? "border-green-500/30 hover:border-green-500/50" : "border-white/5 hover:border-white/10",
                      selectedBusiness?.id === business.id && "ring-2 ring-blue-500/50"
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                            isEnabled ? "bg-green-500/10" : "bg-white/5"
                          )}>
                            {industryInfo.icon}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              {isEnabled && (
                                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Automations Active
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {industryInfo.label}
                              </span>
                              {business.website && (
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {business.website}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Created {new Date(business.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {isEnabled && business.automation_settings && (
                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-2 text-xs">
                                  <Clock className={cn(
                                    "h-3 w-3",
                                    business.automation_settings.business_hours_enabled ? "text-green-400" : "text-slate-500"
                                  )} />
                                  <span className={business.automation_settings.business_hours_enabled ? "text-slate-300" : "text-slate-500"}>
                                    Business Hours
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Bell className={cn(
                                    "h-3 w-3",
                                    business.automation_settings.quiet_hours_enabled ? "text-green-400" : "text-slate-500"
                                  )} />
                                  <span className={business.automation_settings.quiet_hours_enabled ? "text-slate-300" : "text-slate-500"}>
                                    Quiet Hours
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Shield className="h-3 w-3 text-slate-400" />
                                  <span className="text-slate-400">
                                    {business.automation_settings.max_messages_per_contact_per_day} msgs/day limit
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {isEnabled ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openSettings(business)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Configure
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disableAutomations(business)}
                                disabled={isSaving}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Unlink className="h-4 w-4 mr-2" />
                                    Disconnect
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => enableAutomations(business)}
                              disabled={isSaving}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                            >
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Link2 className="h-4 w-4 mr-2" />
                              )}
                              Wire to Automations
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Recipe Packs Tab */}
        <TabsContent value="recipes" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {selectedBusiness ? `Recipe Packs for ${selectedBusiness.name}` : 'Available Recipe Packs'}
                </h3>
                <p className="text-sm text-slate-400">
                  Pre-built automation workflows tailored to your industry
                </p>
              </div>
              {!selectedBusiness && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                  Select a business to install packs
                </Badge>
              )}
            </div>

            {selectedBusiness && lastInstall && (
              <Card className="bg-white/[0.02] border border-white/10">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="truncate">Installed {lastInstall.pack.name}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-400 space-y-1">
                        <div>
                          Business: <span className="text-slate-300">{selectedBusiness.name}</span>
                        </div>
                        <div>
                          Backend packs: <span className="text-slate-300">{(lastInstall.result?.packs || []).join(', ') || '(none)'}</span>
                        </div>
                        <div>
                          Intents registered: <span className="text-slate-300">{lastInstall.result?.intentsRegistered || 0}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setLastInstall(null)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipePacks.length === 0 ? (
                <Card className="col-span-full bg-white/[0.02] border-white/5">
                  <CardContent className="py-8 text-center">
                    <Package className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400">Loading recipe packs...</p>
                  </CardContent>
                </Card>
              ) : (
                recipePacks.map((pack) => {
                  const isRecommended = selectedBusiness?.industry === pack.industry;
                  const industryInfo = INDUSTRY_OPTIONS.find(i => i.value === pack.industry);

                  return (
                    <Card 
                      key={pack.pack_id}
                      className={cn(
                        "bg-white/[0.02] border transition-all hover:border-white/20",
                        isRecommended ? "border-blue-500/50" : "border-white/5"
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{industryInfo?.icon || pack.icon || '⚡'}</span>
                            <div>
                              <CardTitle className="text-base">{pack.name}</CardTitle>
                              <CardDescription className="text-xs capitalize">
                                {pack.industry}
                              </CardDescription>
                            </div>
                          </div>
                          {isRecommended && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Recommended
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-400 mb-4">{pack.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs capitalize">
                            {pack.tier}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant={selectedBusiness ? "default" : "ghost"}
                            disabled={!selectedBusiness || installingPackId !== null}
                            className={selectedBusiness ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" : ""}
                            onClick={() => {
                              if (!selectedBusiness) return;
                              installRecipePack(pack);
                            }}
                          >
                            {selectedBusiness ? (
                              <>
                                {installingPackId === pack.pack_id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Zap className="h-4 w-4 mr-1" />
                                )}
                                {installingPackId === pack.pack_id ? 'Installing…' : 'Install Pack'}
                              </>
                            ) : (
                              <>
                                View Recipes
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle>
                {selectedBusiness ? `Automation History - ${selectedBusiness.name}` : 'Automation History'}
              </CardTitle>
              <CardDescription>
                {selectedBusiness 
                  ? 'Recent automation events and workflow runs'
                  : 'Select a business to view its automation history, or view global activity below'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentRuns.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No automation history yet</p>
                  <p className="text-sm mt-1">
                    {selectedBusiness 
                      ? 'Events will appear here as automations run' 
                      : 'Wire a business to automations to start seeing activity'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentRuns.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(run.status)}
                        <div>
                          <p className="font-medium">{run.workflow_name}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(run.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("border", getStatusColor(run.status))}>
                        {run.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          {!selectedBusiness || !editingSettings ? (
            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="py-12 text-center">
                <Settings className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Business First</h3>
                <p className="text-slate-400">
                  Click "Configure" on a business to edit automation settings
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="bg-white/[0.02] border-white/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Automation Settings - {selectedBusiness.name}</CardTitle>
                      <CardDescription>Configure how automations behave for this business</CardDescription>
                    </div>
                    <Button
                      onClick={saveSettings}
                      disabled={saving === selectedBusiness.id}
                    >
                      {saving === selectedBusiness.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Settings
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        editingSettings.automations_enabled ? "bg-green-500/10" : "bg-white/5"
                      )}>
                        <Power className={cn(
                          "h-5 w-5",
                          editingSettings.automations_enabled ? "text-green-400" : "text-slate-500"
                        )} />
                      </div>
                      <div>
                        <Label className="text-base">Automations Enabled</Label>
                        <p className="text-sm text-slate-400">Master switch for all automations</p>
                      </div>
                    </div>
                    <Switch
                      checked={editingSettings.automations_enabled}
                      onCheckedChange={(checked) => 
                        setEditingSettings({ ...editingSettings, automations_enabled: checked })
                      }
                    />
                  </div>

                  {/* Business Hours */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-400" />
                        <div>
                          <Label className="text-base">Business Hours</Label>
                          <p className="text-sm text-slate-400">Only send messages during business hours</p>
                        </div>
                      </div>
                      <Switch
                        checked={editingSettings.business_hours_enabled}
                        onCheckedChange={(checked) => 
                          setEditingSettings({ ...editingSettings, business_hours_enabled: checked })
                        }
                      />
                    </div>
                    
                    {editingSettings.business_hours_enabled && (
                      <div className="ml-8 p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-slate-400">Start Time</Label>
                            <Input
                              type="time"
                              value={editingSettings.business_hours_start}
                              onChange={(e) => 
                                setEditingSettings({ ...editingSettings, business_hours_start: e.target.value })
                              }
                              className="bg-white/5 border-white/10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">End Time</Label>
                            <Input
                              type="time"
                              value={editingSettings.business_hours_end}
                              onChange={(e) => 
                                setEditingSettings({ ...editingSettings, business_hours_end: e.target.value })
                              }
                              className="bg-white/5 border-white/10"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400 mb-2 block">Business Days</Label>
                          <div className="flex gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <button
                                key={day.value}
                                onClick={() => {
                                  const days = editingSettings.business_days.includes(day.value)
                                    ? editingSettings.business_days.filter(d => d !== day.value)
                                    : [...editingSettings.business_days, day.value];
                                  setEditingSettings({ ...editingSettings, business_days: days });
                                }}
                                className={cn(
                                  "w-10 h-10 rounded-lg text-xs font-medium transition-colors",
                                  editingSettings.business_days.includes(day.value)
                                    ? "bg-blue-500 text-white"
                                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                                )}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quiet Hours */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-purple-400" />
                        <div>
                          <Label className="text-base">Quiet Hours</Label>
                          <p className="text-sm text-slate-400">Pause messaging during quiet hours (e.g., overnight)</p>
                        </div>
                      </div>
                      <Switch
                        checked={editingSettings.quiet_hours_enabled}
                        onCheckedChange={(checked) => 
                          setEditingSettings({ ...editingSettings, quiet_hours_enabled: checked })
                        }
                      />
                    </div>
                    
                    {editingSettings.quiet_hours_enabled && (
                      <div className="ml-8 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-slate-400">Quiet Starts</Label>
                            <Input
                              type="time"
                              value={editingSettings.quiet_hours_start}
                              onChange={(e) => 
                                setEditingSettings({ ...editingSettings, quiet_hours_start: e.target.value })
                              }
                              className="bg-white/5 border-white/10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Quiet Ends</Label>
                            <Input
                              type="time"
                              value={editingSettings.quiet_hours_end}
                              onChange={(e) => 
                                setEditingSettings({ ...editingSettings, quiet_hours_end: e.target.value })
                              }
                              className="bg-white/5 border-white/10"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rate Limiting */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-amber-400" />
                      <div>
                        <Label className="text-base">Rate Limiting</Label>
                        <p className="text-sm text-slate-400">Prevent over-messaging contacts</p>
                      </div>
                    </div>
                    <div className="ml-8 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-4">
                        <Label className="text-sm whitespace-nowrap">Max messages per contact per day:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={editingSettings.max_messages_per_contact_per_day}
                          onChange={(e) => 
                            setEditingSettings({ 
                              ...editingSettings, 
                              max_messages_per_contact_per_day: parseInt(e.target.value) || 5 
                            })
                          }
                          className="w-20 bg-white/5 border-white/10"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                onClick={() => {
                  setEditingSettings(null);
                  setActiveTab('businesses');
                }}
              >
                ← Back to Businesses
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CloudAutomations;
