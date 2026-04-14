/**
 * Topology → VFS Scaffolder
 * 
 * Ensures every page declared in the site topology has a corresponding
 * .tsx file in the VFS. Generates starter React components for missing pages
 * based on their role/type from the topology plan.
 */

import type { GeneratedSitePlan, PageRouteNode } from '@/contracts/siteTopologyPlanner';
import { generateCanonicalRouter, generateCanonicalRouterFromPlan } from './topologyRouterGenerator';
import type { PageRegistry } from '@/types/pageRegistry';
// NOTE: This module is re-exported through unifiedPreviewPipeline.
// Consumers should import from there, not directly from this file.

// ============================================================================
// Core: Scaffold missing pages from topology
// ============================================================================

/**
 * Given a site plan and existing VFS files, returns a map of files that
 * need to be created to satisfy the topology.
 */
export function scaffoldMissingTopologyPages(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>
): Record<string, string> {
  const newFiles: Record<string, string> = {};

  for (const page of plan.pages) {
    if (!existingFiles[page.filePath]) {
      newFiles[page.filePath] = generateTopologyPlaceholder(page, plan);
    }
  }

  return newFiles;
}

/**
 * Scaffold missing pages AND regenerate the canonical router (App.tsx).
 * This is the preferred entry point — it guarantees every scaffolded
 * page is also routable in the preview.
 */
export function scaffoldMissingTopologyPagesWithRouter(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>,
  registry: PageRegistry
): Record<string, string> {
  const newFiles = scaffoldMissingTopologyPages(plan, existingFiles);
  
  // Always regenerate the canonical router so all pages are routable
  const mergedFiles = { ...existingFiles, ...newFiles };
  const routerCode = generateCanonicalRouter(registry, plan.businessName);
  if (routerCode) {
    newFiles['/src/App.tsx'] = routerCode;
  }
  
  return newFiles;
}

/**
 * Check which topology pages are missing from the VFS.
 */
export function getMissingTopologyPages(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>
): PageRouteNode[] {
  return plan.pages.filter(p => !existingFiles[p.filePath]);
}

// ============================================================================
// Page Generator — Lightweight placeholder (AI will populate real content)
// ============================================================================

/**
 * Generate a minimal loading placeholder for a topology page.
 * This ensures the router can import the file immediately while
 * AI generation populates the real content asynchronously.
 */
export function generateTopologyPlaceholder(
  page: PageRouteNode,
  plan: GeneratedSitePlan
): string {
  const componentName = extractComponentName(page.filePath);
  const navPages = plan.pages.filter(p => plan.navItems.includes(p.id));

  const navLinks = navPages.map(p =>
    `          <a href="#${p.route}" data-ut-intent="nav.goto_page" data-ut-path="${p.route}" data-ut-target-page-id="${p.id}" className="text-sm ${p.id === page.id ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-colors">${p.title}</a>`
  ).join('\n');

  return `import React from 'react';

export default function ${componentName}() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <a href="#/" className="text-xl font-bold">${plan.businessName || 'Home'}</a>
          <nav className="hidden md:flex items-center gap-6">
${navLinks}
          </nav>
        </div>
      </header>

      {/* Loading — AI is generating this page */}
      <main className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-6" />
          <h1 className="text-2xl font-semibold mb-2">${page.title}</h1>
          <p className="text-muted-foreground">Generating page content...</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ${plan.businessName || 'Company'}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
`;
}

function extractComponentName(filePath: string): string {
  const fileName = filePath.split('/').pop()?.replace('.tsx', '') || 'Page';
  return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

/**
 * Returns the list of non-home pages from a topology plan
 * that need AI generation (missing from VFS).
 */
export function getTopologyPagesForAIGeneration(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>
): PageRouteNode[] {
  return plan.pages.filter(p => !existingFiles[p.filePath] && !p.isHome);
}
