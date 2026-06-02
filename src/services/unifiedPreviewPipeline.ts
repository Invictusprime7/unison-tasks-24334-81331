/**
 * Unified Preview Pipeline — THE single API for all preview/structure operations.
 * 
 * This is a thin facade that delegates to:
 *   - pageTopologyOrchestrator: structural changes (add/remove/rename pages)
 *   - canonicalPipeline: full wizard-to-preview generation
 *   - topologyRouterGenerator: router regeneration
 * 
 * Every consumer (WebBuilder, CreatorPlayground, AI generation) MUST go through
 * this module. Direct imports of pageTopologyOrchestrator or generateCanonicalRouter
 * from components are a code smell.
 * 
 * Lifecycle:  Registry Update → VFS Scaffold → Router Regeneration → Preview Reload
 */

import type { PageRegistry, BuilderPage } from '@/types/pageRegistry';
import type { PlaygroundState } from '@/types/playground';
import {
  applyTopologyChange,
  syncTopologyAndRouter,
  type TopologyChange,
  type TopologyChangeResult,
  type TopologyChangeType,
} from './pageTopologyOrchestrator';
import { generateCanonicalRouter, patchVFSWithRouter } from '@/utils/topologyRouterGenerator';
import { commitToPipeline } from '@/platform/core';
import {
  resolveNavigationTarget,
  deriveFilePath,
  deriveRouteFromLabel,
  type NavigationRequest,
  type ResolvedPageTarget,
} from './routeNavigationService';
import { validatePageTopology, type TopologyValidationResult } from './pageTopologyValidator';
import {
  scaffoldMissingTopologyPages,
  scaffoldMissingTopologyPagesWithRouter,
  getTopologyPagesForAIGeneration,
  getMissingTopologyPages,
} from '@/utils/topologyVFSScaffolder';

// ============================================================================
// Re-export types & functions so consumers only import from this module
// ============================================================================

export type { TopologyChange, TopologyChangeResult, TopologyChangeType };
export type { NavigationRequest, ResolvedPageTarget, TopologyValidationResult };
export type { BuilderPage };
export {
  resolveNavigationTarget,
  deriveFilePath,
  deriveRouteFromLabel,
  validatePageTopology,
  scaffoldMissingTopologyPages,
  scaffoldMissingTopologyPagesWithRouter,
  getTopologyPagesForAIGeneration,
  getMissingTopologyPages,
};

// ============================================================================
// Preview State
// ============================================================================

export interface PreviewState {
  activePageId: string | null;
  activeRoute: string;
  availableRoutes: string[];
  pendingGenerations: Set<string>;
  lastRouterUpdate: number;
}

export function createInitialPreviewState(): PreviewState {
  return {
    activePageId: null,
    activeRoute: '/',
    availableRoutes: ['/'],
    pendingGenerations: new Set(),
    lastRouterUpdate: Date.now(),
  };
}

// ============================================================================
// Structural Operations — delegate to pageTopologyOrchestrator
// ============================================================================

/**
 * Apply a structural topology change (add/remove/rename/reorder page).
 * This is the ONLY entry point for page mutations from the builder.
 */
export function applyStructuralChange(
  change: TopologyChange,
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
  businessName?: string,
): TopologyChangeResult {
  return applyTopologyChange(change, registry, vfsFiles, businessName);
}

/**
 * Regenerate router + validate after an external registry mutation.
 */
export function syncRouterAndValidate(
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
  businessName?: string,
) {
  return syncTopologyAndRouter(registry, vfsFiles, businessName);
}

/**
 * Generate just the router code from a registry.
 * Use sparingly — prefer applyStructuralChange which includes this.
 */
export function regenerateRouter(registry: PageRegistry, businessName?: string): string {
  return generateCanonicalRouter(registry, businessName);
}

// ============================================================================
// Full Rebuild — delegate to canonicalPipeline
// ============================================================================

/**
 * Full rebuild from a PlaygroundState. Used after bulk playground edits.
 * Returns the full compile result including SiteBundleSnapshot.
 */
export function fullRebuildFromPlayground(
  playground: PlaygroundState,
  existingVfsFiles: Record<string, string> = {},
  businessName?: string,
  industry?: string,
) {
  return commitToPipeline(
    { playground, existingVfsFiles, businessName, industry },
    'playground-edit',
  );
}

/**
 * Quick VFS + router patch. Does NOT recompile the full pipeline.
 * Used for cosmetic/content changes that don't affect structure.
 */
export function patchVFS(
  vfsFiles: Record<string, string>,
  registry: PageRegistry,
  businessName?: string,
): Record<string, string> {
  return patchVFSWithRouter(vfsFiles, registry, businessName);
}

// ============================================================================
// Preview State Derivation
// ============================================================================

export function derivePreviewStateFromRegistry(registry: PageRegistry): PreviewState {
  const pages = Object.values(registry.pages);
  const homePage = pages.find(p => p.isHome);

  const routes = pages
    .filter(p => !p.isHome)
    .map(p => p.path)
    .sort();

  return {
    activePageId: homePage?.pageId || null,
    activeRoute: '/',
    availableRoutes: ['/', ...routes],
    pendingGenerations: new Set(),
    lastRouterUpdate: Date.now(),
  };
}

/**
 * Navigate to a page — returns new preview state slice.
 */
export function navigateToPage(
  registry: PageRegistry,
  pageId: string,
): Partial<PreviewState> {
  const page = registry.pages[pageId];
  if (!page) return {};
  return { activePageId: pageId, activeRoute: page.path };
}
