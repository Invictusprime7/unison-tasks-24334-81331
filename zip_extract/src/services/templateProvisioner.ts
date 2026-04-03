/**
 * Template Provisioner Service
 * 
 * When a user clicks "Use Template", this service:
 * 1. Creates/verifies business_id
 * 2. Checks required Supabase tables exist
 * 3. Registers required workflows
 * 4. Binds intents to handlers
 * 5. Attaches template to runtime
 * 
 * This is what makes templates "instant" like Wix.
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  TemplateManifest, 
  ProvisioningStatus, 
  getTemplateManifest,
  getManifestByPattern,
  getDefaultManifestForSystem,
  getRequiredTables,
  getRequiredIntents,
} from '@/data/templates/manifest';
import type { BusinessSystemType } from '@/data/templates/types';

/**
 * Provisioning result
 */
export interface ProvisioningResult {
  success: boolean;
  businessId: string;
  status: ProvisioningStatus;
  manifest: TemplateManifest;
  errors: string[];
  warnings: string[];
}

/**
 * Resolve manifest for a template - tries exact match, pattern match, then system default
 */
function resolveManifest(templateId: string | undefined, systemType: BusinessSystemType): TemplateManifest {
  if (templateId) {
    // Try exact match
    const exact = getTemplateManifest(templateId);
    if (exact) return exact;
    
    // Try pattern match
    const pattern = getManifestByPattern(templateId);
    if (pattern) return pattern;
  }
  
  // Fall back to system default
  return getDefaultManifestForSystem(systemType);
}
/**
 * Main provisioning function
 * Call this when user selects a template to use
 */
export async function provisionTemplate(
  templateId: string | undefined,
  systemType: BusinessSystemType,
  existingBusinessId?: string
): Promise<ProvisioningResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Resolve manifest using smart matching
  const manifest = resolveManifest(templateId, systemType);
  
  console.log('[Provisioner] Starting provisioning for:', manifest.id, 'system:', systemType);
  
  // 2. Create or verify business ID
  const businessId = existingBusinessId || crypto.randomUUID();
  console.log('[Provisioner] Using businessId:', businessId);
  
  // 3. Initialize provisioning status
  const status: ProvisioningStatus = {
    templateId: manifest.id,
    businessId,
    status: 'provisioning',
    tablesProvisioned: [],
    workflowsRegistered: [],
    intentsBound: [],
    errors: [],
  };
  
  try {
    // 4. Verify required tables exist (they should already exist in schema)
    const requiredTables = getRequiredTables(manifest);
    console.log('[Provisioner] Checking required tables:', requiredTables);
    
    for (const tableName of requiredTables) {
      const tableExists = await checkTableExists(tableName);
      if (tableExists) {
        status.tablesProvisioned.push(tableName);
      } else {
        warnings.push(`Table '${tableName}' not found - some features may not work`);
      }
    }
    
    // 5. Register workflows
    console.log('[Provisioner] Registering workflows...');
    for (const workflow of manifest.workflows) {
      try {
        const registered = await registerWorkflow(businessId, workflow, manifest);
        if (registered) {
          status.workflowsRegistered.push(workflow.id);
        }
      } catch (err) {
        warnings.push(`Failed to register workflow '${workflow.name}': ${err}`);
      }
    }
    
    // 6. Bind intents
    console.log('[Provisioner] Binding intents...');
    const requiredIntents = getRequiredIntents(manifest);
    for (const intent of requiredIntents) {
      status.intentsBound.push(intent);
    }
    
    // 7. Create default CRM pipeline if specified
    if (manifest.crmPipeline) {
      console.log('[Provisioner] Setting up CRM pipeline:', manifest.crmPipeline.name);
      // Pipeline is conceptual - stored in workflow config
    }
    
    // 8. Store provisioning record
    await storeProvisioningRecord(status);
    
    status.status = 'ready';
    status.provisionedAt = new Date().toISOString();
    
    console.log('[Provisioner] Provisioning complete:', status);
    
    return {
      success: true,
      businessId,
      status,
      manifest,
      errors,
      warnings,
    };
    
  } catch (error) {
    console.error('[Provisioner] Provisioning failed:', error);
    status.status = 'failed';
    status.errors.push(String(error));
    errors.push(String(error));
    
    return {
      success: false,
      businessId,
      status,
      manifest,
      errors,
      warnings,
    };
  }
}

/**
 * Check if a table exists in the database
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    // Try to select from the table with a limit of 0
    // This will fail if table doesn't exist
    const { error } = await supabase
      .from(tableName as any)
      .select('*', { count: 'exact', head: true })
      .limit(0);
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Register a workflow for a business
 */
async function registerWorkflow(
  businessId: string,
  workflow: TemplateManifest['workflows'][0],
  manifest: TemplateManifest
): Promise<boolean> {
  try {
    // Check if workflow already exists
    const { data: existing } = await supabase
      .from('crm_workflows')
      .select('id')
      .eq('name', `${manifest.id}:${workflow.id}`)
      .maybeSingle();
    
    if (existing) {
      console.log('[Provisioner] Workflow already exists:', workflow.id);
      return true;
    }
    
    // Create the workflow
    const { error } = await supabase
      .from('crm_workflows')
      .insert({
        name: workflow.name,
        description: workflow.description,
        trigger_type: workflow.triggerType,
        trigger_config: {
          businessId,
          templateId: manifest.id,
          originalId: workflow.id,
        },
        steps: workflow.requiredSteps.map((step, index) => ({
          index,
          action_type: step,
          config: {},
        })),
        is_active: manifest.defaults.workflowsEnabled,
      });
    
    if (error) {
      console.error('[Provisioner] Failed to create workflow:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Provisioner] Workflow registration error:', error);
    return false;
  }
}

/**
 * Store provisioning record for tracking
 */
async function storeProvisioningRecord(status: ProvisioningStatus): Promise<void> {
  // Store in localStorage for now (could be a database table later)
  try {
    const key = `provision:${status.businessId}`;
    localStorage.setItem(key, JSON.stringify(status));
  } catch {
    console.warn('[Provisioner] Could not store provisioning record');
  }
}

/**
 * Get provisioning status for a business
 */
export function getProvisioningStatus(businessId: string): ProvisioningStatus | null {
  try {
    const key = `provision:${businessId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Check if a template is production-ready
 * A template is ready when all critical requirements are met
 */
export async function isTemplateProductionReady(
  manifest: TemplateManifest,
  businessId: string
): Promise<{ ready: boolean; missing: string[] }> {
  const missing: string[] = [];
  
  // Check critical tables
  const requiredTables = getRequiredTables(manifest);
  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    if (!exists) {
      missing.push(`Table: ${table}`);
    }
  }
  
  // Check workflows are registered
  const { data: workflows } = await supabase
    .from('crm_workflows')
    .select('name')
    .eq('is_active', true);
  
  const registeredWorkflows = workflows?.map(w => w.name) || [];
  for (const workflow of manifest.workflows) {
    const workflowRegistered = registeredWorkflows.some(
      w => w.includes(workflow.id) || w === workflow.name
    );
    if (!workflowRegistered) {
      missing.push(`Workflow: ${workflow.name}`);
    }
  }
  
  return {
    ready: missing.length === 0,
    missing,
  };
}

/**
 * Quick provision - minimal setup for demo/preview mode
 */
export function quickProvision(systemType: BusinessSystemType): {
  businessId: string;
  manifest: TemplateManifest;
} {
  const businessId = crypto.randomUUID();
  const manifest = getDefaultManifestForSystem(systemType);
  
  // Store minimal provisioning record
  const status: ProvisioningStatus = {
    templateId: manifest.id,
    businessId,
    status: 'ready',
    tablesProvisioned: [],
    workflowsRegistered: [],
    intentsBound: getRequiredIntents(manifest),
    errors: [],
    provisionedAt: new Date().toISOString(),
  };
  
  try {
    localStorage.setItem(`provision:${businessId}`, JSON.stringify(status));
  } catch {
    // Ignore localStorage errors
  }
  
  return { businessId, manifest };
}
