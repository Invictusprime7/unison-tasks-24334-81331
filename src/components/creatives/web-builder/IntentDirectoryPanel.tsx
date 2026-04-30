/**
 * Intent Directory Panel
 * 
 * GoHighLevel-style intent directory panel for the WebBuilder.
 * Shows all detected intents on the page with their:
 * - Element labels (button text)
 * - Bound intent (explicit or inferred)
 * - Attached workflows/recipes
 * - Status (wired/missing businessId/demo-only)
 * - Quick actions to bind workflows
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Zap, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2, 
  AlertCircle, 
  FlaskConical,
  Search,
  Settings2,
  Play,
  Link2,
  Workflow,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CORE_INTENTS, AUTOMATION_INTENTS, ACTION_INTENTS, isAutomationIntent, isActionIntent } from "@/coreIntents";

// Types
interface DetectedIntent {
  elementKey: string;
  elementLabel: string;
  selector?: string;
  intent: string;
  confidence: number; // 1.0 = explicit data-ut-intent, <1.0 = inferred
  payloadKeys: string[];
  status: 'wired' | 'missing-business' | 'demo-only' | 'unbound';
  boundWorkflowId?: string;
  boundWorkflowName?: string;
  boundRecipeIds?: string[];
  enabled?: boolean;
  triggerCount?: number;
  lastTriggered?: string;
}

interface Workflow {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config?: Record<string, unknown>;
  is_active: boolean;
}

interface Recipe {
  id: string;
  name: string;
  trigger: string;
}

interface IntentDirectoryPanelProps {
  businessId?: string | null;
  projectId?: string | null;
  currentPagePath?: string;
  detectedIntents?: DetectedIntent[];
  onRefreshIntents?: () => void;
  onTestIntent?: (intent: string, payload: Record<string, unknown>) => void;
}

// Intent category colors
const intentCategoryColors: Record<string, string> = {
  'nav': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'pay': 'bg-green-500/20 text-green-400 border-green-500/30',
  'contact': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'booking': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'cart': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'auth': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'default': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

function getIntentCategory(intent: string): string {
  const prefix = intent.split('.')[0];
  return intentCategoryColors[prefix] || intentCategoryColors['default'];
}

function getStatusBadge(status: DetectedIntent['status']) {
  switch (status) {
    case 'wired':
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Wired
        </Badge>
      );
    case 'missing-business':
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
          <AlertCircle className="h-3 w-3 mr-1" />
          No Business
        </Badge>
      );
    case 'demo-only':
      return (
        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
          <FlaskConical className="h-3 w-3 mr-1" />
          Demo
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px]">
          Unbound
        </Badge>
      );
  }
}

export function IntentDirectoryPanel({
  businessId,
  projectId,
  currentPagePath = '/',
  detectedIntents = [],
  onRefreshIntents,
  onTestIntent,
}: IntentDirectoryPanelProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [bindings, setBindings] = useState<Map<string, DetectedIntent>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIntents, setExpandedIntents] = useState<Set<string>>(new Set());
  const [selectedIntent, setSelectedIntent] = useState<DetectedIntent | null>(null);
  const [bindDialogOpen, setBindDialogOpen] = useState(false);

  // Fetch workflows and recipes
  useEffect(() => {
    async function fetchData() {
      if (!businessId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch workflows
        const { data: workflowData } = await supabase
          .from("crm_workflows")
          .select("id, name, trigger_type, trigger_config, is_active")
          .eq("is_active", true)
          .order("name");
        
        setWorkflows((workflowData || []) as Workflow[]);

        // Fetch installed recipe packs
        const { data: packData } = await supabase
          .from("user_installed_packs")
          .select(`
            enabled,
            automation_recipe_packs (
              recipes
            )
          `)
          .eq("enabled", true);

        // Extract recipes from packs
        const allRecipes: Recipe[] = [];
        packData?.forEach((pack: unknown) => {
          const p = pack as { enabled: boolean; automation_recipe_packs?: { recipes?: Recipe[] } | null };
          if (p.automation_recipe_packs?.recipes) {
            allRecipes.push(...p.automation_recipe_packs.recipes);
          }
        });
        setRecipes(allRecipes);

        // Fetch existing bindings for this page
        if (projectId) {
          const { data: bindingData } = await supabase
            .from("site_intent_bindings")
            .select("*")
            .eq("project_id", projectId)
            .eq("page_path", currentPagePath);

          const bindingMap = new Map<string, DetectedIntent>();
          bindingData?.forEach((b: { 
            element_key: string; 
            element_label?: string;
            intent: string;
            intent_confidence: number;
            workflow_id?: string;
            recipe_ids?: string[];
            enabled: boolean;
            trigger_count: number;
            last_triggered_at?: string;
          }) => {
            const workflow = workflows.find(w => w.id === b.workflow_id);
            bindingMap.set(b.element_key, {
              elementKey: b.element_key,
              elementLabel: b.element_label || b.element_key,
              intent: b.intent,
              confidence: b.intent_confidence,
              payloadKeys: [],
              status: b.workflow_id ? 'wired' : (businessId ? 'unbound' : 'missing-business'),
              boundWorkflowId: b.workflow_id,
              boundWorkflowName: workflow?.name,
              boundRecipeIds: b.recipe_ids,
              enabled: b.enabled,
              triggerCount: b.trigger_count,
              lastTriggered: b.last_triggered_at,
            });
          });
          setBindings(bindingMap);
        }
      } catch (error) {
        console.error("Error fetching intent directory data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [businessId, projectId, currentPagePath]);

  // Merge detected intents with stored bindings
  const mergedIntents = useMemo(() => {
    const merged: DetectedIntent[] = [];
    const seen = new Set<string>();

    // First, add detected intents with binding data if available
    detectedIntents.forEach(detected => {
      const binding = bindings.get(detected.elementKey);
      if (binding) {
        merged.push({
          ...detected,
          ...binding,
          // Keep detected values if binding doesn't have them
          elementLabel: detected.elementLabel || binding.elementLabel,
          payloadKeys: detected.payloadKeys.length > 0 ? detected.payloadKeys : binding.payloadKeys,
        });
      } else {
        // Determine status based on businessId
        let status: DetectedIntent['status'] = 'unbound';
        if (!businessId) {
          status = 'demo-only';
        } else if (isAutomationIntent(detected.intent) || isActionIntent(detected.intent)) {
          status = 'wired'; // These go to backend automatically
        }
        merged.push({ ...detected, status });
      }
      seen.add(detected.elementKey);
    });

    // Add bindings for elements not currently detected (e.g., from other pages)
    bindings.forEach((binding, key) => {
      if (!seen.has(key)) {
        merged.push(binding);
      }
    });

    return merged;
  }, [detectedIntents, bindings, businessId]);

  // Filter by search term
  const filteredIntents = useMemo(() => {
    if (!searchTerm.trim()) return mergedIntents;
    const lower = searchTerm.toLowerCase();
    return mergedIntents.filter(
      i => i.elementLabel.toLowerCase().includes(lower) ||
           i.intent.toLowerCase().includes(lower)
    );
  }, [mergedIntents, searchTerm]);

  // Group by intent category
  const groupedIntents = useMemo(() => {
    const groups: Record<string, DetectedIntent[]> = {};
    filteredIntents.forEach(intent => {
      const category = intent.intent.split('.')[0];
      if (!groups[category]) groups[category] = [];
      groups[category].push(intent);
    });
    return groups;
  }, [filteredIntents]);

  // Save binding to database
  async function saveBinding(intent: DetectedIntent, workflowId?: string, recipeIds?: string[]) {
    if (!businessId || !projectId) {
      toast.error("Cannot save binding without business profile");
      return;
    }

    try {
      const { error } = await supabase
        .from("site_intent_bindings")
        .upsert({
          business_id: businessId,
          project_id: projectId,
          page_path: currentPagePath,
          element_key: intent.elementKey,
          element_label: intent.elementLabel,
          intent: intent.intent,
          intent_confidence: intent.confidence,
          workflow_id: workflowId || null,
          recipe_ids: recipeIds || [],
          enabled: true,
          payload_schema: Object.fromEntries(intent.payloadKeys.map(k => [k, true])),
        }, {
          onConflict: "project_id,page_path,element_key",
        });

      if (error) throw error;

      // Update local state
      const workflow = workflows.find(w => w.id === workflowId);
      setBindings(prev => new Map(prev).set(intent.elementKey, {
        ...intent,
        boundWorkflowId: workflowId,
        boundWorkflowName: workflow?.name,
        boundRecipeIds: recipeIds,
        status: workflowId ? 'wired' : 'unbound',
      }));

      toast.success("Automation binding saved");
    } catch (error) {
      console.error("Error saving binding:", error);
      toast.error("Failed to save binding");
    }
  }

  // Toggle binding enabled
  async function toggleBinding(intent: DetectedIntent, enabled: boolean) {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from("site_intent_bindings")
        .update({ enabled })
        .eq("project_id", projectId)
        .eq("page_path", currentPagePath)
        .eq("element_key", intent.elementKey);

      if (error) throw error;

      setBindings(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(intent.elementKey);
        if (existing) {
          newMap.set(intent.elementKey, { ...existing, enabled });
        }
        return newMap;
      });
    } catch (error) {
      console.error("Error toggling binding:", error);
    }
  }

  // Test fire an intent
  function testFireIntent(intent: DetectedIntent) {
    if (onTestIntent) {
      const testPayload: Record<string, unknown> = {
        _test: true,
        _elementKey: intent.elementKey,
      };
      // Add sample values for known payload keys
      intent.payloadKeys.forEach(key => {
        testPayload[key] = `test_${key}`;
      });
      onTestIntent(intent.intent, testPayload);
      toast.info(`Testing: ${intent.intent}`, {
        description: "Check console for automation result",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Intent Directory</span>
          </div>
          {onRefreshIntents && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRefreshIntents}
              title="Refresh detected intents"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Status summary */}
        <div className="flex gap-2 text-[10px] mb-2">
          <span className="text-green-400">{mergedIntents.filter(i => i.status === 'wired').length} wired</span>
          <span className="text-gray-400">|</span>
          <span className="text-yellow-400">{mergedIntents.filter(i => i.status === 'unbound').length} unbound</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">{mergedIntents.length} total</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search intents..."
            className="h-7 text-xs pl-7 bg-[#0a0a14] border-cyan-500/20"
          />
        </div>
      </div>

      {/* Intent List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {Object.entries(groupedIntents).map(([category, intents]) => (
            <Collapsible
              key={category}
              defaultOpen={true}
              className="border border-cyan-500/20 rounded-lg overflow-hidden"
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between p-2 hover:bg-cyan-500/5 transition-colors">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px] capitalize", getIntentCategory(`${category}.x`))}>
                    {category}
                  </Badge>
                  <span className="text-xs text-gray-400">{intents.length}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-gray-500" />
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border-t border-cyan-500/10">
                  {intents.map((intent, idx) => (
                    <div
                      key={intent.elementKey + idx}
                      className="p-2 border-b border-cyan-500/5 last:border-b-0 hover:bg-cyan-500/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Element label */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-white truncate" title={intent.elementLabel}>
                              {intent.elementLabel || intent.elementKey}
                            </span>
                            {intent.confidence < 1 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-[9px] bg-orange-500/10 text-orange-400 border-orange-500/20">
                                      ~{Math.round(intent.confidence * 100)}%
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Inferred intent (not explicit)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          {/* Intent name */}
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                              {intent.intent}
                            </code>
                            {getStatusBadge(intent.status)}
                          </div>

                          {/* Payload keys */}
                          {intent.payloadKeys.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {intent.payloadKeys.slice(0, 4).map(key => (
                                <span key={key} className="text-[9px] text-gray-500 bg-gray-800 px-1 rounded">
                                  {key}
                                </span>
                              ))}
                              {intent.payloadKeys.length > 4 && (
                                <span className="text-[9px] text-gray-500">
                                  +{intent.payloadKeys.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bound workflow/recipe */}
                          {intent.boundWorkflowName && (
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-green-400">
                              <Workflow className="h-3 w-3" />
                              <span>{intent.boundWorkflowName}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Test button */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => testFireIntent(intent)}
                                >
                                  <Play className="h-3 w-3 text-cyan-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Test fire this intent</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Bind workflow dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setSelectedIntent(intent)}
                              >
                                <Link2 className="h-3 w-3 text-purple-400" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#0d0d18] border-cyan-500/30">
                              <DialogHeader>
                                <DialogTitle className="text-cyan-400">Bind Automation</DialogTitle>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-xs text-gray-400">Element</Label>
                                  <p className="text-sm text-white">{intent.elementLabel}</p>
                                  <code className="text-xs text-cyan-400">{intent.intent}</code>
                                </div>

                                <div>
                                  <Label className="text-xs text-gray-400 mb-2 block">Attach Workflow</Label>
                                  <Select
                                    onValueChange={(value) => saveBinding(intent, value === 'none' ? undefined : value)}
                                    defaultValue={intent.boundWorkflowId || 'none'}
                                  >
                                    <SelectTrigger className="bg-[#0a0a14] border-cyan-500/20">
                                      <SelectValue placeholder="Select workflow..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">No workflow</SelectItem>
                                      {workflows.map(w => (
                                        <SelectItem key={w.id} value={w.id}>
                                          <div className="flex items-center gap-2">
                                            <Workflow className="h-3 w-3" />
                                            {w.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {recipes.length > 0 && (
                                  <div>
                                    <Label className="text-xs text-gray-400 mb-2 block">Or Attach Recipes</Label>
                                    <p className="text-[10px] text-gray-500">
                                      {recipes.length} recipes available from installed packs
                                    </p>
                                  </div>
                                )}

                                {businessId && (
                                  <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20">
                                    <Label className="text-xs text-gray-400">Enabled</Label>
                                    <Switch
                                      checked={intent.enabled !== false}
                                      onCheckedChange={(checked) => toggleBinding(intent, checked)}
                                    />
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Enable toggle */}
                          {intent.boundWorkflowId && (
                            <Switch
                              checked={intent.enabled !== false}
                              onCheckedChange={(checked) => toggleBinding(intent, checked)}
                              className="scale-75"
                            />
                          )}
                        </div>
                      </div>

                      {/* Stats (if triggered before) */}
                      {intent.triggerCount ? (
                        <div className="flex items-center gap-2 mt-2 text-[9px] text-gray-500">
                          <span>{intent.triggerCount} triggers</span>
                          {intent.lastTriggered && (
                            <span>• Last: {new Date(intent.lastTriggered).toLocaleDateString()}</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {filteredIntents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No intents detected yet</p>
              <p className="text-[10px] mt-1">Intents are auto-discovered from buttons and forms</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-2 border-t border-cyan-500/20 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs border-cyan-500/30 hover:bg-cyan-500/10"
          onClick={() => window.open('/crm?view=workflows', '_blank')}
        >
          <Workflow className="h-3 w-3 mr-2" />
          Manage Workflows
          <ExternalLink className="h-3 w-3 ml-auto" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs border-purple-500/30 hover:bg-purple-500/10 text-purple-400"
          onClick={() => window.open('/crm?view=recipes', '_blank')}
        >
          <Sparkles className="h-3 w-3 mr-2" />
          Recipe Packs
          <ExternalLink className="h-3 w-3 ml-auto" />
        </Button>
      </div>
    </div>
  );
}

export default IntentDirectoryPanel;
