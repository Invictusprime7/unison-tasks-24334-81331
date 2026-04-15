/**
 * PageTopologyOrchestrator — Atomic page topology changes.
 * 
 * Every page add/remove/rename/home-toggle atomically:
 *  1. Updates PageRegistry
 *  2. Scaffolds/moves/deletes VFS file
 *  3. Regenerates App.tsx via canonical router
 *  4. Runs conflict validation
 *  5. Navigates preview if needed
 * 
 * This replaces scattered inline logic across WebBuilder.tsx.
 */

import type { PageRegistry, BuilderPage, BuilderPageType } from '@/types/pageRegistry';
import { createBuilderPage } from '@/types/pageRegistry';
import { generateCanonicalRouter } from '@/utils/topologyRouterGenerator';
import { deriveFilePath } from './routeNavigationService';
import { validatePageTopology, type TopologyValidationResult } from './pageTopologyValidator';

// ============================================================================
// Types
// ============================================================================

export type TopologyChangeType =
  | 'add_page'
  | 'remove_page'
  | 'rename_page'
  | 'set_home'
  | 'toggle_nav'
  | 'reorder';

export interface TopologyChange {
  type: TopologyChangeType;
  pageId?: string;
  /** For add_page */
  title?: string;
  route?: string;
  pageType?: BuilderPageType;
  /** For rename */
  newTitle?: string;
  newRoute?: string;
  /** For toggle_nav */
  showInNav?: boolean;
  /** For reorder */
  navOrder?: number;
}

export interface TopologyChangeResult {
  /** Updated registry (caller should persist) */
  updatedRegistry: PageRegistry;
  /** Updated VFS files to import */
  filesToImport: Record<string, string>;
  /** Files to delete from VFS */
  filesToDelete: string[];
  /** Validation result */
  validation: TopologyValidationResult;
  /** Route to navigate preview to (if applicable) */
  navigateToRoute: string | null;
  /** File to open in editor (if applicable) */
  editorFilePath: string | null;
  /** New page ID (for add_page) */
  newPageId: string | null;
}

// ============================================================================
// Core orchestrator
// ============================================================================

export function applyTopologyChange(
  change: TopologyChange,
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
  businessName?: string,
): TopologyChangeResult {
  // Clone registry to avoid mutation
  const updated: PageRegistry = {
    ...registry,
    pages: { ...registry.pages },
    funnels: { ...registry.funnels },
    version: registry.version + 1,
  };

  const filesToImport: Record<string, string> = {};
  const filesToDelete: string[] = [];
  let navigateToRoute: string | null = null;
  let editorFilePath: string | null = null;
  let newPageId: string | null = null;

  switch (change.type) {
    case 'add_page': {
      const pageId = `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const title = change.title || 'New Page';
      const route = change.route || `/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const pageType = change.pageType || 'custom';

      const page = createBuilderPage(pageId, title, route, pageType, {
        showInNav: true,
        navOrder: Object.keys(updated.pages).length,
        createdBy: 'manual',
      });

      // Set canonical filePath
      page.filePath = deriveFilePath(page);

      updated.pages[pageId] = page;
      newPageId = pageId;
      navigateToRoute = route;
      editorFilePath = page.filePath;
      break;
    }

    case 'remove_page': {
      if (!change.pageId) break;
      const page = updated.pages[change.pageId];
      if (!page) break;
      
      const fp = page.filePath || deriveFilePath(page);
      filesToDelete.push(fp);
      delete updated.pages[change.pageId];

      // If we removed the home page, reassign
      if (page.isHome) {
        const remaining = Object.values(updated.pages);
        if (remaining.length > 0) {
          remaining[0].isHome = true;
          updated.homePageId = remaining[0].pageId;
        }
      }
      break;
    }

    case 'set_home': {
      if (!change.pageId) break;
      for (const p of Object.values(updated.pages)) {
        p.isHome = p.pageId === change.pageId;
      }
      updated.homePageId = change.pageId;
      break;
    }

    case 'toggle_nav': {
      if (!change.pageId) break;
      const page = updated.pages[change.pageId];
      if (page) {
        updated.pages[change.pageId] = {
          ...page,
          showInNav: change.showInNav ?? !page.showInNav,
        };
      }
      break;
    }

    case 'rename_page': {
      if (!change.pageId) break;
      const page = updated.pages[change.pageId];
      if (!page) break;
      
      const oldFilePath = page.filePath || deriveFilePath(page);
      
      if (change.newTitle) page.title = change.newTitle;
      if (change.newRoute) page.path = change.newRoute;
      page.filePath = deriveFilePath(page);
      
      // Move file if path changed
      if (oldFilePath !== page.filePath && vfsFiles[oldFilePath]) {
        filesToImport[page.filePath] = vfsFiles[oldFilePath];
        filesToDelete.push(oldFilePath);
      }
      
      updated.pages[change.pageId] = { ...page };
      editorFilePath = page.filePath;
      navigateToRoute = page.path;
      break;
    }

    case 'reorder': {
      if (!change.pageId || change.navOrder === undefined) break;
      const page = updated.pages[change.pageId];
      if (page) {
        updated.pages[change.pageId] = { ...page, navOrder: change.navOrder };
      }
      break;
    }
  }

  // Regenerate canonical router
  const routerCode = generateCanonicalRouter(updated, businessName);
  if (routerCode) {
    filesToImport['/src/App.tsx'] = routerCode;
  }

  // Validate
  const validation = validatePageTopology(updated, { ...vfsFiles, ...filesToImport });

  return {
    updatedRegistry: updated,
    filesToImport,
    filesToDelete,
    validation,
    navigateToRoute,
    editorFilePath,
    newPageId,
  };
}

/**
 * Convenience: regenerate router + validate without changing pages.
 * Call after any external registry mutation (e.g. playground updates).
 */
export function syncTopologyAndRouter(
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
  businessName?: string,
): { routerCode: string; validation: TopologyValidationResult } {
  const routerCode = generateCanonicalRouter(registry, businessName);
  const mergedFiles = routerCode ? { ...vfsFiles, '/src/App.tsx': routerCode } : vfsFiles;
  const validation = validatePageTopology(registry, mergedFiles);
  return { routerCode, validation };
}
