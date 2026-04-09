/**
 * Playground Compiler — Compiles PlaygroundState into runtime artifacts.
 * 
 * Produces:
 *  - PageRouteRegistry (pass-through)
 *  - VFS files for all registered pages  
 *  - Canonical router file (App.tsx)
 *  - Binding manifest for runtime intent resolution
 *  - Preview manifest with routes and home route
 */

import type {
  PlaygroundState,
  PlaygroundCompileResult,
  PlaygroundBinding,
} from '@/types/playground';
import type { PageRegistry, BuilderPage } from '@/types/pageRegistry';
import { generateCanonicalRouter } from '@/utils/topologyRouterGenerator';
import { deriveFilePath } from './routeNavigationService';

// ============================================================================
// Core Compiler
// ============================================================================

export function compilePlayground(
  state: PlaygroundState,
  existingVfsFiles: Record<string, string> = {},
  businessName?: string,
): PlaygroundCompileResult {
  const registry = state.pageRegistry;
  const pages = Object.values(registry.pages);

  // 1. Ensure all pages have filePath
  for (const page of pages) {
    if (!page.filePath) {
      page.filePath = deriveFilePath(page);
    }
  }

  // 2. Generate canonical router
  const routerContent = generateCanonicalRouter(registry, businessName);
  const routerFile = {
    path: '/src/App.tsx',
    content: routerContent,
  };

  // 3. Collect VFS files — preserve existing, scaffold missing
  const vfsFiles: Record<string, string> = {};
  
  // Always include the router
  if (routerContent) {
    vfsFiles['/src/App.tsx'] = routerContent;
  }

  // For each page, check if file already exists in VFS
  for (const page of pages) {
    if (page.isHome) continue; // Home is part of router
    const fp = page.filePath!;
    if (existingVfsFiles[fp]) {
      // File exists — carry forward (don't overwrite AI-generated content)
      vfsFiles[fp] = existingVfsFiles[fp];
    }
    // If missing, we DON'T scaffold a stub — the AI generation pipeline handles it
  }

  // 4. Build binding manifest
  const bindingManifest: Record<string, PlaygroundBinding> = { ...state.bindings };

  // 5. Build preview manifest
  const homeRoute = pages.find(p => p.isHome)?.path || '/';
  const routes = pages
    .filter(p => !p.isHome)
    .map(p => p.path)
    .sort();

  return {
    pageRouteRegistry: registry,
    vfsFiles,
    routerFile,
    bindingManifest,
    previewManifest: {
      routes: ['/', ...routes],
      homeRoute,
    },
  };
}

// ============================================================================
// Binding Manifest Utilities
// ============================================================================

/**
 * Resolve a button click to its binding target.
 * Used by the preview intent bridge at runtime.
 */
export function resolveBindingForButton(
  manifest: Record<string, PlaygroundBinding>,
  sourcePageId: string,
  buttonLabel: string,
): PlaygroundBinding | null {
  const normalized = buttonLabel.toLowerCase().trim();
  for (const binding of Object.values(manifest)) {
    if (
      binding.sourcePageId === sourcePageId &&
      binding.sourceLabel.toLowerCase().trim() === normalized
    ) {
      return binding;
    }
  }
  return null;
}

/**
 * Get all bindings for a specific page.
 */
export function getPageBindings(
  manifest: Record<string, PlaygroundBinding>,
  pageId: string,
): PlaygroundBinding[] {
  return Object.values(manifest).filter(b => b.sourcePageId === pageId);
}
