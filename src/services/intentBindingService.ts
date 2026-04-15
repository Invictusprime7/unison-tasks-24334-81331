/**
 * Intent Binding Service
 * 
 * Queries site_intent_bindings to determine which workflows and recipes
 * should fire when an intent is executed on a specific element.
 * 
 * This is the bridge between:
 * - UI elements (buttons, forms)
 * - Intents (cart.add, booking.create)
 * - Workflows (CRM automations)
 * - Recipes (industry-specific automation packs)
 */

import { supabase } from '@/integrations/supabase/client';
import { BUILT_IN_RECIPE_PACKS } from '@/services/recipeManagerService';

// ============ TYPES ============

export interface IntentBinding {
  id: string;
  businessId: string;
  projectId: string;
  pagePath: string;
  elementKey: string;
  elementLabel: string | null;
  intent: string;
  intentConfidence: number;
  workflowId: string | null;
  recipeIds: string[];
  enabled: boolean;
  payloadSchema: Record<string, unknown>;
  lastTriggeredAt: string | null;
  triggerCount: number;
}

export interface WorkflowInfo {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
  industry: string | null;
  category: string | null;
}

export interface RecipeInfo {
  id: string;
  name: string;
  trigger: string;
  packId: string;
  packName: string;
}

export interface BindingLookupResult {
  binding: IntentBinding | null;
  workflow: WorkflowInfo | null;
  recipes: RecipeInfo[];
  shouldFireAutomation: boolean;
}

// ============ CACHE ============

const bindingCache = new Map<string, { binding: IntentBinding | null; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(projectId: string, pagePath: string, elementKey: string): string {
  return `${projectId}:${pagePath}:${elementKey}`;
}

// ============ SERVICE FUNCTIONS ============

/**
 * Look up intent binding for a specific element
 */
export async function lookupIntentBinding(
  projectId: string,
  pagePath: string,
  elementKey: string,
  options: { skipCache?: boolean } = {}
): Promise<BindingLookupResult> {
  const cacheKey = getCacheKey(projectId, pagePath, elementKey);
  
  // Check cache
  if (!options.skipCache) {
    const cached = bindingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return buildLookupResult(cached.binding);
    }
  }

  try {
    // Query site_intent_bindings
    const { data: binding, error } = await (supabase
      .from('site_intent_bindings' as any)
      .select('*')
      .eq('project_id', projectId)
      .eq('page_path', pagePath)
      .eq('element_key', elementKey)
      .single() as any);

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('[IntentBindingService] Lookup error:', error);
    }

    // Transform to IntentBinding type
    const transformed: IntentBinding | null = binding ? {
      id: binding.id,
      businessId: binding.business_id,
      projectId: binding.project_id,
      pagePath: binding.page_path,
      elementKey: binding.element_key,
      elementLabel: binding.element_label,
      intent: binding.intent,
      intentConfidence: binding.intent_confidence ?? 1.0,
      workflowId: binding.workflow_id,
      recipeIds: (binding.recipe_ids as string[]) ?? [],
      enabled: binding.enabled ?? true,
      payloadSchema: (binding.payload_schema as Record<string, unknown>) ?? {},
      lastTriggeredAt: binding.last_triggered_at,
      triggerCount: binding.trigger_count ?? 0,
    } : null;

    // Update cache
    bindingCache.set(cacheKey, { binding: transformed, timestamp: Date.now() });

    return buildLookupResult(transformed);
  } catch (error) {
    console.error('[IntentBindingService] Failed to lookup binding:', error);
    return { binding: null, workflow: null, recipes: [], shouldFireAutomation: false };
  }
}

/**
 * Look up binding by intent (for cases where we don't know the element)
 */
export async function lookupBindingsByIntent(
  projectId: string,
  intent: string
): Promise<IntentBinding[]> {
  try {
    const { data, error } = await (supabase
      .from('site_intent_bindings' as any)
      .select('*')
      .eq('project_id', projectId)
      .eq('intent', intent)
      .eq('enabled', true) as any);

    if (error) {
      console.error('[IntentBindingService] Intent lookup error:', error);
      return [];
    }

    return (data || []).map(binding => ({
      id: binding.id,
      businessId: binding.business_id,
      projectId: binding.project_id,
      pagePath: binding.page_path,
      elementKey: binding.element_key,
      elementLabel: binding.element_label,
      intent: binding.intent,
      intentConfidence: binding.intent_confidence ?? 1.0,
      workflowId: binding.workflow_id,
      recipeIds: (binding.recipe_ids as string[]) ?? [],
      enabled: binding.enabled ?? true,
      payloadSchema: (binding.payload_schema as Record<string, unknown>) ?? {},
      lastTriggeredAt: binding.last_triggered_at,
      triggerCount: binding.trigger_count ?? 0,
    }));
  } catch (error) {
    console.error('[IntentBindingService] Failed to lookup bindings by intent:', error);
    return [];
  }
}

/**
 * Create or update an intent binding
 */
export async function upsertIntentBinding(
  binding: Partial<IntentBinding> & {
    businessId: string;
    projectId: string;
    pagePath: string;
    elementKey: string;
    intent: string;
  }
): Promise<IntentBinding | null> {
  try {
    const { data, error } = await (supabase
      .from('site_intent_bindings' as any)
      .upsert({
        business_id: binding.businessId,
        project_id: binding.projectId,
        page_path: binding.pagePath,
        element_key: binding.elementKey,
        element_label: binding.elementLabel ?? null,
        intent: binding.intent,
        intent_confidence: binding.intentConfidence ?? 1.0,
        workflow_id: binding.workflowId ?? null,
        recipe_ids: binding.recipeIds ?? [],
        enabled: binding.enabled ?? true,
        payload_schema: binding.payloadSchema ?? {},
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,page_path,element_key'
      })
      .select()
      .single() as any);

    if (error) {
      console.error('[IntentBindingService] Upsert error:', error);
      return null;
    }

    // Invalidate cache
    const cacheKey = getCacheKey(binding.projectId, binding.pagePath, binding.elementKey);
    bindingCache.delete(cacheKey);

    return data ? {
      id: data.id,
      businessId: data.business_id,
      projectId: data.project_id,
      pagePath: data.page_path,
      elementKey: data.element_key,
      elementLabel: data.element_label,
      intent: data.intent,
      intentConfidence: data.intent_confidence ?? 1.0,
      workflowId: data.workflow_id,
      recipeIds: (data.recipe_ids as string[]) ?? [],
      enabled: data.enabled ?? true,
      payloadSchema: (data.payload_schema as Record<string, unknown>) ?? {},
      lastTriggeredAt: data.last_triggered_at,
      triggerCount: data.trigger_count ?? 0,
    } : null;
  } catch (error) {
    console.error('[IntentBindingService] Failed to upsert binding:', error);
    return null;
  }
}

/**
 * Record that a binding was triggered
 */
export async function recordBindingTriggered(bindingId: string): Promise<void> {
  try {
    // Get current count and increment
    const { data } = await (supabase
      .from('site_intent_bindings' as any)
      .select('trigger_count')
      .eq('id', bindingId)
      .single() as any);
    
    const newCount = ((data?.trigger_count as number) || 0) + 1;
    
    await (supabase
      .from('site_intent_bindings' as any)
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: newCount,
      })
      .eq('id', bindingId) as any);
  } catch (error) {
    console.warn('[IntentBindingService] Failed to record trigger:', error);
  }
}

/**
 * Get all bindings for a project
 */
export async function getProjectBindings(projectId: string): Promise<IntentBinding[]> {
  try {
    const { data, error } = await (supabase
      .from('site_intent_bindings' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('page_path', { ascending: true }) as any);

    if (error) {
      console.error('[IntentBindingService] Project bindings error:', error);
      return [];
    }

    return (data || []).map(binding => ({
      id: binding.id,
      businessId: binding.business_id,
      projectId: binding.project_id,
      pagePath: binding.page_path,
      elementKey: binding.element_key,
      elementLabel: binding.element_label,
      intent: binding.intent,
      intentConfidence: binding.intent_confidence ?? 1.0,
      workflowId: binding.workflow_id,
      recipeIds: (binding.recipe_ids as string[]) ?? [],
      enabled: binding.enabled ?? true,
      payloadSchema: (binding.payload_schema as Record<string, unknown>) ?? {},
      lastTriggeredAt: binding.last_triggered_at,
      triggerCount: binding.trigger_count ?? 0,
    }));
  } catch (error) {
    console.error('[IntentBindingService] Failed to get project bindings:', error);
    return [];
  }
}

/**
 * Toggle binding enabled/disabled
 */
export async function toggleBindingEnabled(bindingId: string, enabled: boolean): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('site_intent_bindings' as any)
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', bindingId) as any);

    if (error) {
      console.error('[IntentBindingService] Toggle error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[IntentBindingService] Failed to toggle binding:', error);
    return false;
  }
}

/**
 * Delete a binding
 */
export async function deleteBinding(bindingId: string): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('site_intent_bindings' as any)
      .delete()
      .eq('id', bindingId) as any);

    if (error) {
      console.error('[IntentBindingService] Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[IntentBindingService] Failed to delete binding:', error);
    return false;
  }
}

// ============ HELPERS ============

async function buildLookupResult(binding: IntentBinding | null): Promise<BindingLookupResult> {
  if (!binding) {
    return { binding: null, workflow: null, recipes: [], shouldFireAutomation: false };
  }

  let workflow: WorkflowInfo | null = null;
  let recipes: RecipeInfo[] = [];

  // Fetch workflow details if bound
  if (binding.workflowId) {
    const { data } = await supabase
      .from('crm_workflows')
      .select('id, name, trigger_type, is_active')
      .eq('id', binding.workflowId)
      .single();

    if (data) {
      workflow = {
        id: data.id,
        name: data.name,
        triggerType: data.trigger_type,
        isActive: data.is_active,
        industry: null,
        category: null,
      };
    }
  }

  // Fetch recipe details if bound
  if (binding.recipeIds.length > 0) {
    recipes = binding.recipeIds.map(recipeId => {
      // Look up from built-in packs for full info
      for (const pack of BUILT_IN_RECIPE_PACKS) {
        const recipe = pack.recipes.find(r => r.id === recipeId);
        if (recipe) {
          return {
            id: recipe.id,
            name: recipe.name,
            trigger: recipe.trigger,
            packId: pack.id,
            packName: pack.name,
          };
        }
      }
      return {
        id: recipeId,
        name: recipeId.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()),
        trigger: binding.intent,
        packId: '',
        packName: 'Custom',
      };
    });
  }

  // Determine if automation should fire
  const shouldFireAutomation = binding.enabled && (
    (workflow?.isActive) ||
    recipes.length > 0
  );

  return { binding, workflow, recipes, shouldFireAutomation };
}

/**
 * Clear binding cache (useful after bulk updates)
 */
export function clearBindingCache(): void {
  bindingCache.clear();
}
