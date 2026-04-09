/**
 * Topology Router Generator
 * 
 * Generates/patches a canonical App.tsx in VFS that includes a HashRouter
 * with routes for ALL pages in the PageRegistry. This ensures scaffolded
 * pages are truly live — not just files in the VFS.
 * 
 * Called whenever:
 *   - A page is scaffolded (topologyVFSScaffolder)
 *   - A page is added/removed via PageRouteBar or CreatorPlayground
 *   - The site topology is initialized from a GeneratedSitePlan
 */

import type { PageRegistry, BuilderPage } from '@/types/pageRegistry';
import type { GeneratedSitePlan } from '@/contracts/siteTopologyPlanner';

// ============================================================================
// Types
// ============================================================================

interface RouteEntry {
  route: string;
  componentName: string;
  importPath: string;
  isHome: boolean;
}

// ============================================================================
// Core: Generate canonical App.tsx with HashRouter
// ============================================================================

/**
 * Generate a canonical App.tsx that routes all registered pages via HashRouter.
 * This replaces the VFS /src/App.tsx so the preview renders a real multi-page site.
 */
export function generateCanonicalRouter(
  registry: PageRegistry,
  businessName?: string
): string {
  const pages = Object.values(registry.pages).sort((a, b) => a.navOrder - b.navOrder);
  if (pages.length === 0) return '';

  const routes = pagesToRoutes(pages);
  return buildRouterCode(routes, businessName);
}

/**
 * Generate a canonical App.tsx from a GeneratedSitePlan (before registry is populated).
 */
export function generateCanonicalRouterFromPlan(plan: GeneratedSitePlan): string {
  const routes: RouteEntry[] = plan.pages.map(p => ({
    route: p.route,
    componentName: extractComponentName(p.filePath),
    importPath: vfsPathToImport(p.filePath),
    isHome: p.isHome,
  }));
  return buildRouterCode(routes, plan.businessName);
}

/**
 * Given existing VFS files and a registry, returns updated files map
 * with the canonical router patched into /src/App.tsx.
 */
export function patchVFSWithRouter(
  existingFiles: Record<string, string>,
  registry: PageRegistry,
  businessName?: string
): Record<string, string> {
  const routerCode = generateCanonicalRouter(registry, businessName);
  if (!routerCode) return existingFiles;
  return { ...existingFiles, '/src/App.tsx': routerCode };
}

// ============================================================================
// Helpers
// ============================================================================

function pagesToRoutes(pages: BuilderPage[]): RouteEntry[] {
  return pages.map(p => {
    // Prefer filePath from registry (set by topology planner)
    if (p.filePath) {
      const componentName = extractComponentName(p.filePath);
      return {
        route: p.path,
        componentName,
        importPath: vfsPathToImport(p.filePath),
        isHome: p.isHome,
      };
    }

    // Fallback: derive from route slug
    const slug = p.path.replace(/^\//, '') || 'Home';
    const componentName = slug
      .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
      .replace(/^(.)/, (_, c: string) => c.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '') || 'Page';
    
    return {
      route: p.path,
      componentName,
      importPath: `./pages/${componentName}`,
      isHome: p.isHome,
    };
  });
}

function extractComponentName(filePath: string): string {
  const fileName = filePath.split('/').pop()?.replace(/\.(tsx|jsx|ts|js)$/, '') || 'Page';
  return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

function vfsPathToImport(filePath: string): string {
  // /src/pages/Contact.tsx → ./pages/Contact
  return filePath
    .replace(/^\/src\//, './')
    .replace(/\.(tsx|jsx|ts|js)$/, '');
}

function buildRouterCode(routes: RouteEntry[], businessName?: string): string {
  if (routes.length === 0) return '';

  // Deduplicate by componentName
  const seen = new Set<string>();
  const uniqueRoutes = routes.filter(r => {
    if (seen.has(r.componentName)) return false;
    seen.add(r.componentName);
    return true;
  });

  const homeRoute = uniqueRoutes.find(r => r.isHome) || uniqueRoutes[0];

  const imports = uniqueRoutes.map(r =>
    `import ${r.componentName} from '${r.importPath}';`
  ).join('\n');

  const routeElements: string[] = [];

  // Home route always gets "/"
  routeElements.push(`        <Route path="/" element={<${homeRoute.componentName} />} />`);

  // Non-home routes
  for (const r of uniqueRoutes) {
    if (r === homeRoute || r.isHome) continue;
    routeElements.push(`        <Route path="${r.route}" element={<${r.componentName} />} />`);
  }

  // Add catch-all
  routeElements.push(`        <Route path="*" element={<Navigate to="/" replace />} />`);

  return `import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
${imports}

export default function App() {
  return (
    <HashRouter>
      <Routes>
${routeElements.join('\n')}
      </Routes>
    </HashRouter>
  );
}
`;
}
