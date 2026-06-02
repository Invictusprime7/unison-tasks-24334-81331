/**
 * RouteNavigationService — Single canonical resolver for all page navigation.
 * 
 * Every navigation source (PageRouteBar, preview links, button intents,
 * AI-generated CTAs, funnel next-step) calls resolveNavigationTarget().
 * This eliminates duplicated lookup logic across WebBuilder.tsx.
 */

import type { PageRegistry, BuilderPage } from '@/types/pageRegistry';

// ============================================================================
// Types
// ============================================================================

export interface NavigationRequest {
  /** Preferred: stable page ID */
  pageId?: string;
  /** Route path (e.g. "/contact") */
  route?: string;
  /** Button label or link text — weakest signal */
  label?: string;
  /** Intent that triggered navigation */
  sourceIntent?: string;
  /** Target page ID from data-ut-target-page-id */
  targetPageId?: string;
}

export interface ResolvedPageTarget {
  pageId: string | null;
  route: string | null;
  filePath: string | null;
  title: string | null;
  existsInRegistry: boolean;
  existsInVFS: boolean;
  isHome: boolean;
  page: BuilderPage | null;
}

// ============================================================================
// Core resolver
// ============================================================================

/**
 * Resolve a navigation request to a canonical page target.
 * Resolution priority: pageId → targetPageId → route → label/slug.
 */
export function resolveNavigationTarget(
  request: NavigationRequest,
  registry: PageRegistry,
  vfsFiles: Record<string, string>,
): ResolvedPageTarget {
  const empty: ResolvedPageTarget = {
    pageId: null,
    route: null,
    filePath: null,
    title: null,
    existsInRegistry: false,
    existsInVFS: false,
    isHome: false,
    page: null,
  };

  const pages = Object.values(registry.pages);

  // 1. Direct pageId lookup (strongest signal)
  const byId = request.pageId
    ? registry.pages[request.pageId]
    : request.targetPageId
      ? registry.pages[request.targetPageId]
      : null;

  if (byId) return buildResult(byId, vfsFiles);

  // 2. Route match
  if (request.route) {
    const normalizedRoute = request.route.replace(/^#/, '').replace(/\/$/, '') || '/';
    const byRoute = pages.find(p => {
      const nr = p.path.replace(/\/$/, '') || '/';
      return nr === normalizedRoute;
    });
    if (byRoute) return buildResult(byRoute, vfsFiles);
  }

  // 3. Label/slug fallback (weakest)
  if (request.label) {
    const slug = request.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();

    const byLabel = pages.find(p => {
      const titleSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const pathSlug = p.path.replace(/^\//, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      return titleSlug === slug || pathSlug === slug;
    });
    if (byLabel) return buildResult(byLabel, vfsFiles);
  }

  return empty;
}

// ============================================================================
// Derive filePath for a page (canonical)
// ============================================================================

export function deriveFilePath(page: BuilderPage): string {
  if (page.filePath) return page.filePath;

  // Home page body lives in /src/pages/Home.tsx — /src/App.tsx is reserved
  // for the canonical HashRouter generated from PageRegistry.
  if (page.isHome) return '/src/pages/Home.tsx';

  const slug = page.path.replace(/^\//, '') || 'custom';
  const componentName = slug
    .replace(/[-_\s]+(.)/g, (_: string, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_: string, c: string) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '') || 'Page';

  return `/src/pages/${componentName}.tsx`;
}

/**
 * Derive a route slug from a path string or label.
 */
export function deriveRouteFromLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `/${slug || 'page'}`;
}

// ============================================================================
// Helpers
// ============================================================================

function buildResult(page: BuilderPage, vfsFiles: Record<string, string>): ResolvedPageTarget {
  const filePath = page.filePath || deriveFilePath(page);
  return {
    pageId: page.pageId,
    route: page.path,
    filePath,
    title: page.title,
    existsInRegistry: true,
    existsInVFS: !!vfsFiles[filePath],
    isHome: page.isHome,
    page,
  };
}
