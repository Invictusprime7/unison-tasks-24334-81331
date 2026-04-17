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

  const homePage = pages.find((page) => page.isHome) || null;

  // For each page, check if file already exists in VFS
  for (const page of pages) {
    const fp = page.filePath!;
    const existingPageFile = existingVfsFiles[fp];

    if (existingPageFile) {
      vfsFiles[fp] = existingVfsFiles[fp];
      continue;
    }

    // Preserve pre-router single-page launcher output by moving App.tsx into the home page file.
    if (page.isHome) {
      const legacyHomeSource = existingVfsFiles['/src/App.tsx'] || existingVfsFiles['/App.tsx'];
      if (legacyHomeSource) {
        vfsFiles[fp] = rebaseHomeModuleForPageFile(legacyHomeSource);
        continue;
      }
    }

    vfsFiles[fp] = generatePlaygroundPagePlaceholder(page, businessName, homePage);
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

function rebaseHomeModuleForPageFile(content: string): string {
  return content.replace(
    /(from\s+['"])\.\/([^'"]+['"])/g,
    (_match, prefix, target) => `${prefix}../${target}`,
  ).replace(
    /(import\s+['"])\.\/([^'"]+['"])/g,
    (_match, prefix, target) => `${prefix}../${target}`,
  );
}

function generatePlaygroundPagePlaceholder(
  page: BuilderPage,
  businessName?: string,
  homePage?: BuilderPage | null,
): string {
  const homePath = homePage?.path || '/';
  const homeTarget = page.isHome ? '#' : `#${homePath}`;

  return `import React from 'react';

export default function ${toComponentName(page.filePath || page.path || page.title)}() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="${homeTarget}" className="text-lg font-semibold">
            ${escapeTemplateLiteral(businessName || 'Business')}
          </a>
          <span className="text-sm text-muted-foreground">${escapeTemplateLiteral(page.title)}</span>
        </div>
      </header>

      <main className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-muted-foreground">Page Ready</p>
        <h1 className="mb-3 text-4xl font-semibold">${escapeTemplateLiteral(page.title)}</h1>
        <p className="max-w-xl text-muted-foreground">
          This page was scaffolded from the canonical playground so routing, bindings, and preview stay wired while content generation catches up.
        </p>
      </main>
    </div>
  );
}
`;
}

function toComponentName(value: string): string {
  const fileName = value.split('/').pop() || value;
  return fileName
    .replace(/\.(tsx|jsx|ts|js)$/i, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('') || 'Page';
}

function escapeTemplateLiteral(value: string): string {
  return value.replace(/[`$\\]/g, (char) => `\\${char}`);
}

// ============================================================================
// Binding Manifest Utilities
// ============================================================================

/**
 * Resolve a button click to its binding target.
 * V2: Prefers elementKey/slot-based resolution, falls back to label matching.
 */
export function resolveBindingForButton(
  manifest: Record<string, PlaygroundBinding>,
  sourcePageId: string,
  buttonLabel: string,
  elementKey?: string,
): PlaygroundBinding | null {
  // 1. Prefer slot-bound resolution by elementKey (stable)
  if (elementKey) {
    for (const binding of Object.values(manifest)) {
      if (
        binding.sourcePageId === sourcePageId &&
        binding.elementKey === elementKey
      ) {
        return binding;
      }
    }
  }

  // 2. Fallback: label-based matching (legacy compat)
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
 * Resolve a binding by slot identity (section + slot).
 * This is the preferred V2 resolution path.
 */
export function resolveBindingBySlot(
  manifest: Record<string, PlaygroundBinding>,
  sourcePageId: string,
  section: string,
  slot: string,
): PlaygroundBinding | null {
  for (const binding of Object.values(manifest)) {
    if (
      binding.sourcePageId === sourcePageId &&
      binding.sourceSection === section &&
      binding.sourceSlot === slot
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

/**
 * Get all V2 bindings (with elementKey) for a page.
 */
export function getPageSlotBindings(
  manifest: Record<string, PlaygroundBinding>,
  pageId: string,
): PlaygroundBinding[] {
  return Object.values(manifest).filter(
    b => b.sourcePageId === pageId && !!b.elementKey
  );
}
