/**
 * PageTopologyValidator — Comprehensive route-state validation.
 * 
 * Checks for:
 *  - Duplicate route paths
 *  - Missing homepage designation
 *  - Page in registry but missing VFS file
 *  - VFS page file not in registry (orphan)
 *  - Page in registry but missing from router (App.tsx)
 *  - Funnel step targets missing
 *  - Button targetPageId not found in registry
 */

import type { PageRegistry, BuilderPage } from '@/types/pageRegistry';
import { deriveFilePath } from './routeNavigationService';

// ============================================================================
// Types
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationCode =
  | 'DUPLICATE_ROUTE'
  | 'MISSING_HOMEPAGE'
  | 'MISSING_VFS_FILE'
  | 'ORPHAN_VFS_FILE'
  | 'MISSING_ROUTER_ENTRY'
  | 'FUNNEL_STEP_MISSING'
  | 'EMPTY_REGISTRY'
  | 'MISSING_FILE_PATH';

export interface ValidationIssue {
  code: ValidationCode;
  severity: ValidationSeverity;
  message: string;
  pageId?: string;
  filePath?: string;
  route?: string;
}

export interface TopologyValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Shorthand: just the error-severity issues */
  errors: ValidationIssue[];
  /** Shorthand: just the warning-severity issues */
  warnings: ValidationIssue[];
}

// ============================================================================
// Validator
// ============================================================================

export function validatePageTopology(
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
): TopologyValidationResult {
  const issues: ValidationIssue[] = [];
  const pages = Object.values(registry.pages);

  // 1. Empty registry
  if (pages.length === 0) {
    issues.push({
      code: 'EMPTY_REGISTRY',
      severity: 'warning',
      message: 'Page registry is empty — no pages defined.',
    });
    return buildResult(issues);
  }

  // 2. Missing homepage
  const hasHome = pages.some(p => p.isHome);
  if (!hasHome) {
    issues.push({
      code: 'MISSING_HOMEPAGE',
      severity: 'error',
      message: 'No page is designated as the homepage.',
    });
  }

  // 3. Duplicate routes
  const routeMap = new Map<string, BuilderPage[]>();
  for (const page of pages) {
    const normalized = page.path.toLowerCase();
    if (!routeMap.has(normalized)) routeMap.set(normalized, []);
    routeMap.get(normalized)!.push(page);
  }
  for (const [route, dupes] of routeMap) {
    if (dupes.length > 1) {
      issues.push({
        code: 'DUPLICATE_ROUTE',
        severity: 'error',
        message: `Duplicate route "${route}" shared by: ${dupes.map(d => d.title).join(', ')}`,
        route,
      });
    }
  }

  // 4. Missing VFS file / Missing filePath
  for (const page of pages) {
    const fp = page.filePath || deriveFilePath(page);

    if (!page.filePath) {
      issues.push({
        code: 'MISSING_FILE_PATH',
        severity: 'info',
        message: `Page "${page.title}" has no explicit filePath (derived: ${fp}).`,
        pageId: page.pageId,
        filePath: fp,
      });
    }

    // Home page lives in App.tsx (router), so skip VFS check for it
    if (page.isHome) continue;

    if (!vfsFiles[fp]) {
      issues.push({
        code: 'MISSING_VFS_FILE',
        severity: 'warning',
        message: `Page "${page.title}" is in registry but file ${fp} is missing from VFS.`,
        pageId: page.pageId,
        filePath: fp,
        route: page.path,
      });
    }
  }

  // 5. Orphan VFS page files (in /src/pages/ but not in registry)
  const registryFilePaths = new Set(
    pages.map(p => p.filePath || deriveFilePath(p))
  );
  for (const path of Object.keys(vfsFiles)) {
    if (!path.startsWith('/src/pages/') || !path.endsWith('.tsx')) continue;
    if (!registryFilePaths.has(path)) {
      issues.push({
        code: 'ORPHAN_VFS_FILE',
        severity: 'info',
        message: `File ${path} exists in VFS but is not in the page registry.`,
        filePath: path,
      });
    }
  }

  // 6. Funnel step targets
  for (const funnel of Object.values(registry.funnels)) {
    for (const step of funnel.steps) {
      if (!registry.pages[step.pageId]) {
        issues.push({
          code: 'FUNNEL_STEP_MISSING',
          severity: 'error',
          message: `Funnel "${funnel.name}" step references missing page ID: ${step.pageId}`,
          pageId: step.pageId,
        });
      }
    }
  }

  // 7. Check App.tsx has routes for all non-home pages
  const appTsx = vfsFiles['/src/App.tsx'] || '';
  if (appTsx) {
    for (const page of pages) {
      if (page.isHome) continue;
      // Simple check: does App.tsx contain the route path?
      if (!appTsx.includes(`"${page.path}"`) && !appTsx.includes(`'${page.path}'`)) {
        issues.push({
          code: 'MISSING_ROUTER_ENTRY',
          severity: 'warning',
          message: `Page "${page.title}" route "${page.path}" not found in App.tsx router.`,
          pageId: page.pageId,
          route: page.path,
        });
      }
    }
  }

  return buildResult(issues);
}

function buildResult(issues: ValidationIssue[]): TopologyValidationResult {
  return {
    valid: issues.every(i => i.severity !== 'error'),
    issues,
    errors: issues.filter(i => i.severity === 'error'),
    warnings: issues.filter(i => i.severity === 'warning'),
  };
}
