/**
 * Unified Preview Pipeline — THE single rendering path for all preview operations.
 * 
 * Every route change, page creation, page deletion, and AI generation MUST
 * flow through this pipeline. It enforces the lifecycle:
 * 
 *   Registry Update → VFS Scaffold → Router Regeneration → Preview Reload
 * 
 * No preview state can exist outside this lifecycle.
 */

import type { PageRegistry, BuilderPage } from '@/types/pageRegistry';
import type { PlaygroundState, PlaygroundBinding } from '@/types/playground';
import { createBuilderPage } from '@/types/pageRegistry';
import { generateCanonicalRouter, patchVFSWithRouter } from '@/utils/topologyRouterGenerator';
import { deriveFilePath } from './routeNavigationService';
import { nanoid } from 'nanoid';

// ============================================================================
// Preview State — Single source for all preview concerns
// ============================================================================

export interface PreviewState {
  /** Currently active page ID */
  activePageId: string | null;
  /** Currently active preview route */
  activeRoute: string;
  /** All available routes */
  availableRoutes: string[];
  /** Pages pending AI generation */
  pendingGenerations: Set<string>;
  /** Last router regeneration timestamp */
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
// Lifecycle Operations — Atomic, transactional updates
// ============================================================================

export interface PreviewLifecycleResult {
  /** Updated VFS files (includes router) */
  vfsFiles: Record<string, string>;
  /** Updated page registry */
  registry: PageRegistry;
  /** Updated preview state */
  previewState: Partial<PreviewState>;
  /** Whether the preview should reload */
  shouldReload: boolean;
  /** New router content (if changed) */
  routerContent?: string;
}

/**
 * Add a page to the site — atomic operation that updates registry, VFS, and router.
 */
export function addPage(
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
  options: {
    title: string;
    path: string;
    pageType: BuilderPage['pageType'];
    isHome?: boolean;
    initialContent?: string;
    businessName?: string;
  },
): PreviewLifecycleResult {
  const pageId = `page_${nanoid(8)}`;
  const page = createBuilderPage(pageId, options.title, options.path, options.pageType, {
    isHome: options.isHome || false,
    showInNav: true,
    navOrder: Object.keys(registry.pages).length,
    createdBy: 'manual',
  });
  page.filePath = deriveFilePath(page);

  // 1. Update registry
  const updatedRegistry: PageRegistry = {
    ...registry,
    pages: { ...registry.pages, [pageId]: page },
    homePageId: options.isHome ? pageId : registry.homePageId,
    version: registry.version + 1,
  };

  // 2. Update VFS
  const updatedVfs = { ...vfsFiles };
  if (options.initialContent) {
    updatedVfs[page.filePath] = options.initialContent;
  }

  // 3. Regenerate router
  const routerContent = generateCanonicalRouter(updatedRegistry, options.businessName);
  if (routerContent) {
    updatedVfs['/src/App.tsx'] = routerContent;
  }

  return {
    vfsFiles: updatedVfs,
    registry: updatedRegistry,
    previewState: {
      availableRoutes: deriveAvailableRoutes(updatedRegistry),
      lastRouterUpdate: Date.now(),
    },
    shouldReload: true,
    routerContent,
  };
}

/**
 * Remove a page from the site — atomic operation.
 */
export function removePage(
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
  pageId: string,
  businessName?: string,
): PreviewLifecycleResult {
  const page = registry.pages[pageId];
  if (!page) {
    return { vfsFiles, registry, previewState: {}, shouldReload: false };
  }

  // 1. Update registry
  const updatedPages = { ...registry.pages };
  delete updatedPages[pageId];

  const updatedFunnels = { ...registry.funnels };
  for (const [fid, funnel] of Object.entries(updatedFunnels)) {
    const hasPage = funnel.steps.some(s => s.pageId === pageId);
    if (hasPage) {
      updatedFunnels[fid] = {
        ...funnel,
        steps: funnel.steps.filter(s => s.pageId !== pageId),
      };
    }
  }

  const updatedRegistry: PageRegistry = {
    pages: updatedPages,
    funnels: updatedFunnels,
    homePageId: registry.homePageId === pageId ? '' : registry.homePageId,
    version: registry.version + 1,
  };

  // 2. Remove from VFS
  const updatedVfs = { ...vfsFiles };
  const filePath = page.filePath || deriveFilePath(page);
  delete updatedVfs[filePath];

  // 3. Regenerate router
  const routerContent = generateCanonicalRouter(updatedRegistry, businessName);
  if (routerContent) {
    updatedVfs['/src/App.tsx'] = routerContent;
  }

  return {
    vfsFiles: updatedVfs,
    registry: updatedRegistry,
    previewState: {
      availableRoutes: deriveAvailableRoutes(updatedRegistry),
      activeRoute: '/',
      activePageId: updatedRegistry.homePageId || null,
      lastRouterUpdate: Date.now(),
    },
    shouldReload: true,
    routerContent,
  };
}

/**
 * Navigate to a page — resolves to canonical route and updates preview state.
 */
export function navigateToPage(
  registry: PageRegistry,
  pageId: string,
): Partial<PreviewState> {
  const page = registry.pages[pageId];
  if (!page) return {};

  return {
    activePageId: pageId,
    activeRoute: page.path,
  };
}

/**
 * Update page content in VFS and regenerate router if paths changed.
 */
export function updatePageContent(
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
  pageId: string,
  content: string,
  businessName?: string,
): PreviewLifecycleResult {
  const page = registry.pages[pageId];
  if (!page) {
    return { vfsFiles, registry, previewState: {}, shouldReload: false };
  }

  const filePath = page.filePath || deriveFilePath(page);
  const updatedVfs = { ...vfsFiles, [filePath]: content };

  return {
    vfsFiles: updatedVfs,
    registry,
    previewState: {},
    shouldReload: true,
  };
}

/**
 * Full rebuild — regenerate VFS and router from current registry state.
 * Used after bulk operations or AI generation completion.
 */
export function fullRebuild(
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
  businessName?: string,
): PreviewLifecycleResult {
  // Regenerate router from registry
  const updatedVfs = patchVFSWithRouter(vfsFiles, registry, businessName);
  const routerContent = generateCanonicalRouter(registry, businessName);

  return {
    vfsFiles: updatedVfs,
    registry,
    previewState: {
      availableRoutes: deriveAvailableRoutes(registry),
      lastRouterUpdate: Date.now(),
    },
    shouldReload: true,
    routerContent,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function deriveAvailableRoutes(registry: PageRegistry): string[] {
  const pages = Object.values(registry.pages);
  const routes = pages
    .filter(p => !p.isHome)
    .map(p => p.path)
    .sort();
  return ['/', ...routes];
}

/**
 * Derive complete preview state from a registry.
 * Used for initial hydration.
 */
export function derivePreviewStateFromRegistry(registry: PageRegistry): PreviewState {
  const pages = Object.values(registry.pages);
  const homePage = pages.find(p => p.isHome);

  return {
    activePageId: homePage?.pageId || null,
    activeRoute: '/',
    availableRoutes: deriveAvailableRoutes(registry),
    pendingGenerations: new Set(),
    lastRouterUpdate: Date.now(),
  };
}
