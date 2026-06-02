/**
 * LaunchState Type
 * 
 * Represents the complete metadata and context of a site launch operation.
 * This is the intermediate representation that SystemLauncher creates and
 * passes to WebBuilder to stabilize the preview contract.
 * 
 * Eventually this becomes the basis for a full SiteBundle, but during
 * the launch phase, it's the source of truth for preview-and-edit.
 */

import type { SiteBundleVersion } from './siteBundle';
import type { LauncherHandoff, RuntimeManifest } from './runtimeManifest';
import type { SystemsBuildContext } from './systemsBuildContext';
import type { GeneratedSitePlan } from '@/platform/core/siteTopologyPlanner';
import type { LayoutCategory } from '@/data/templates/types';
import type { PlaygroundCompileResult, PlaygroundState, WizardSelections } from './playground';
import type { SiteBundleSnapshot } from '@/services/canonicalPipeline';

// ============================================================================
// Core Launch State
// ============================================================================

export type SystemType = 'booking' | 'agency' | 'store' | 'saas' | 'portfolio' | 'content';
export type IndustryTag = 
  | 'salon' | 'local-service' | 'coaching' | 'restaurant' 
  | 'ecommerce' | 'fitness' | 'legal' | 'realestate' 
  | 'photography' | 'universal';

export interface LaunchBlueprint {
  version: '1.0';
  identity: {
    industry: IndustryTag;
    business_model: SystemType;
    primary_goal: string;
  };
  brand: {
    business_name: string;
    tagline: string;
    tone: string;
    typography: {
      headingFont: string;
      bodyFont: string;
    };
  };
  design: {
    dominantStyle?: string;
    colorScheme?: string;
    imageryStyle?: string;
  };
  intents: Array<{ intent: string }>;
  template_sections?: string[];
  template_intents?: string[];
}

export interface LaunchState {
  // Core launch metadata (from SystemLauncher)
  systemType: SystemType;
  systemName: string;
  businessName: string;
  templateName: string;
  templateCategory: LayoutCategory;
  
  // Blueprint (structured guidance for AI)
  blueprint: LaunchBlueprint;
  
  // VSF files (editable source)
  vfsFiles: Record<string, string>;
  
  // Aesthetic/theme info
  aesthetic?: string;
  
  // Intent system binding
  preloadedIntents: string[];
  
  // Runtime settings
  startInPreview: boolean;
  intentRuntime: boolean;

  // Shared preview/builder handoff metadata
  businessId?: string;
  projectId?: string;
  manifestId?: string;
  entryPoint?: string;
  runtimeManifest?: RuntimeManifest;
  siteBundle?: LauncherHandoff['siteBundle'];
  sitePlan?: GeneratedSitePlan;
  systemsBuildContext?: SystemsBuildContext;
  siteBundleSnapshot?: SiteBundleSnapshot;
  materializedPlayground?: PlaygroundState;
  compiledPlayground?: PlaygroundCompileResult;
  pipelineManifest?: RuntimeManifest;
  wizardSelections?: WizardSelections;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  
  // Derived manifest data (for preview routing)
  routes?: Array<{ path: string; label: string }>;
}

// ============================================================================
// Launch Context Type (for React Context)
// ============================================================================

export interface LaunchContextType {
  // Current launch state
  launch: LaunchState | null;
  
  // Set/update launch state
  setLaunch: (state: LaunchState | null) => void;
  
  // Update specific fields
  updateLaunch: (updates: Partial<LaunchState>) => void;
  
  // Check if we're in a fresh launch (not editing existing site)
  isFreshLaunch: boolean;
  
  // Clear launch state when transitioning away
  clearLaunch: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a minimal LaunchState from SystemLauncher data
 */
export function createLaunchState(
  input: Pick<LaunchState, 
    | 'systemType' | 'systemName' | 'businessName' | 'templateName' 
    | 'templateCategory' | 'aesthetic' | 'vfsFiles' | 'preloadedIntents'
  > & Partial<LaunchState>
): LaunchState {
  return {
    systemType: input.systemType,
    systemName: input.systemName,
    businessName: input.businessName,
    templateName: input.templateName,
    templateCategory: input.templateCategory,
    aesthetic: input.aesthetic,
    vfsFiles: input.vfsFiles,
    preloadedIntents: input.preloadedIntents || [],
    startInPreview: input.startInPreview ?? true,
    intentRuntime: input.intentRuntime ?? true,
    businessId: input.businessId,
    projectId: input.projectId,
    manifestId: input.manifestId,
    entryPoint: input.entryPoint,
    runtimeManifest: input.runtimeManifest,
    siteBundle: input.siteBundle,
    sitePlan: input.sitePlan,
    systemsBuildContext: input.systemsBuildContext,
    siteBundleSnapshot: input.siteBundleSnapshot,
    materializedPlayground: input.materializedPlayground,
    compiledPlayground: input.compiledPlayground,
    pipelineManifest: input.pipelineManifest,
    wizardSelections: input.wizardSelections,
    blueprint: input.blueprint || {
      version: '1.0',
      identity: {
        industry: 'universal',
        business_model: input.systemType,
        primary_goal: `Grow ${input.businessName}`,
      },
      brand: {
        business_name: input.businessName,
        tagline: `Professional ${input.systemName.toLowerCase()} services`,
        tone: 'professional',
        typography: {
          headingFont: 'system',
          bodyFont: 'system',
        },
      },
      design: {
        dominantStyle: input.aesthetic || 'modern',
      },
      intents: input.preloadedIntents.map(i => ({ intent: i })),
    },
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}
