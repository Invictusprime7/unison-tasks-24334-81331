/**
 * Playground Compiler - compiles PlaygroundState into runtime artifacts.
 *
 * Wizard-registered pages are scaffolded here so the canonical router and VFS
 * are structurally complete before the launch reaches WebBuilder readiness.
 */

import type {
  PlaygroundState,
  PlaygroundCompileResult,
  PlaygroundBinding,
} from '@/types/playground';
import { generateCanonicalRouterForFiles } from '@/utils/topologyRouterGenerator';
import { generateTopologyPlaceholder } from '@/utils/topologyVFSScaffolder';
import { PreviewPipelineError } from './previewPipelineError';
import { deriveFilePath } from './routeNavigationService';
import { ensureViteRootFiles } from './previewSession';
import type { LayoutCategory } from '@/data/templates/types';
import type { BuilderPage } from '@/types/pageRegistry';
import type { GeneratedSitePlan, PageRole, PageRouteNode } from '@/platform/core/siteTopologyPlanner';

export interface CompilePlaygroundOptions {
  /** Selected template used to generate real role-filtered page scaffolds. */
  selectedTemplateId?: string;
  /** Selected theme id retained for pipeline compatibility. */
  selectedThemeId?: string;
  /** Resolved wizard ThemePreset id used for route-level token seeding. */
  themePresetId?: string;
  /** Industry overlay used by template/page scaffolding. */
  industry?: LayoutCategory | string | null;
}

export function compilePlayground(
  state: PlaygroundState,
  existingVfsFiles: Record<string, string> = {},
  businessName?: string,
  options?: CompilePlaygroundOptions,
): PlaygroundCompileResult {
  const registry = state.pageRegistry;
  const pages = Object.values(registry.pages);

  for (const page of pages) {
    if (!page.filePath) {
      page.filePath = deriveFilePath(page);
    }
  }

  const scaffoldPlan = buildScaffoldPlan(registry.homePageId, pages, businessName, options);

  const vfsFiles: Record<string, string> = {};

  for (const page of pages) {
    const fp = page.filePath!;
    const existingPageFile = existingVfsFiles[fp];

    if (existingPageFile) {
      vfsFiles[fp] = existingPageFile;
      continue;
    }

    if (page.isHome) {
      // Legacy compatibility: rebase an inherited `/src/App.tsx` into the
      // Home page module so older imports keep working. Skip this shortcut
      // whenever the wizard threaded a Style/Template selection — those
      // SiteBundleSnapshot-driven launches MUST scaffold Home from the same
      // themed `generateTopologyPlaceholder(...)` path used by every other
      // page, otherwise Home renders the un-themed AI seed while subpages
      // render the wizard's themed composition (visible drift).
      const hasWizardTheming =
        !!options?.selectedTemplateId ||
        !!options?.selectedThemeId ||
        !!options?.industry;
      if (!hasWizardTheming) {
        const legacyHomeSource = existingVfsFiles['/src/App.tsx'] || existingVfsFiles['/App.tsx'];
        if (legacyHomeSource) {
          vfsFiles[fp] = rebaseHomeModuleForPageFile(legacyHomeSource);
          continue;
        }
      }
    }

    const node = scaffoldPlan.pages.find((p) => p.id === page.pageId);
    if (node) {
      vfsFiles[fp] = generateTopologyPlaceholder(node, scaffoldPlan);
    }
  }

  const routerContent = generateCanonicalRouterForFiles(registry, vfsFiles, businessName);
  const routerFile = {
    path: '/src/App.tsx',
    content: routerContent,
  };

  if (routerContent) {
    vfsFiles['/src/App.tsx'] = routerContent;
  }

  // Inject canonical root config files (.json + tooling) so the wizard runtime
  // VFS always has package.json/tsconfig/vite/tailwind/postcss, matching what
  // canonical launch and live preview expect. Idempotent — won't overwrite
  // existing user-authored config files.
  const hydratedVfsFiles = ensureViteRootFiles(vfsFiles);
  for (const [p, c] of Object.entries(hydratedVfsFiles)) {
    if (!(p in vfsFiles)) vfsFiles[p] = c;
  }

  const homeRoute = pages.find((p) => p.isHome)?.path || '/';
  const routes = pages
    .filter((p) => !p.isHome)
    .filter((p) => Boolean(p.filePath && vfsFiles[p.filePath]))
    .map((p) => p.path)
    .sort();

  return {
    pageRouteRegistry: registry,
    vfsFiles,
    routerFile,
    bindingManifest: { ...state.bindings },
    previewManifest: {
      routes: ['/', ...routes],
      homeRoute,
    },
  };
}

function buildScaffoldPlan(
  homePageId: string | null | undefined,
  pages: BuilderPage[],
  businessName?: string,
  options?: CompilePlaygroundOptions,
): GeneratedSitePlan {
  const pageNodes: PageRouteNode[] = pages
    .slice()
    .sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0))
    .map((page) => ({
      id: page.pageId,
      name: page.title,
      title: page.title,
      route: page.path,
      role: inferTopologyRole(page),
      filePath: page.filePath || deriveFilePath(page),
      visibleInNav: page.showInNav,
      isHome: page.isHome,
      generatedBy: page.createdBy === 'ai' ? 'ai' : page.createdBy === 'manual' ? 'manual' : 'wizard',
      funnelId: page.funnelId || null,
      seo: page.seo,
    }));

  return {
    siteId: 'playground-compile',
    industry: String(options?.industry || 'general'),
    businessName: businessName || 'Company',
    homePageId: homePageId || pageNodes.find((p) => p.isHome)?.id || pageNodes[0]?.id || 'home',
    pages: pageNodes,
    navItems: pageNodes.filter((p) => p.visibleInNav).map((p) => p.id),
    funnels: [],
    redirects: [],
    generatedAt: new Date().toISOString(),
    selectedTemplateId: options?.selectedTemplateId,
    selectedThemePresetId: options?.themePresetId || options?.selectedThemeId,
  };
}

function inferTopologyRole(page: BuilderPage): PageRole {
  const raw = (page.pageRole || page.pageType || '').toString();
  if (raw === 'service' || raw === 'landing') return 'services';
  if (raw === 'thankyou' || raw === 'thank_you') return 'thank_you';
  if (raw === 'home') return 'home';
  if (raw === 'about') return 'about';
  if (raw === 'contact') return 'contact';
  if (raw === 'pricing') return 'pricing';
  if (raw === 'gallery') return 'gallery';
  if (raw === 'faq') return 'faq';
  if (raw === 'booking') return 'booking';
  if (raw === 'checkout') return 'checkout';
  if (raw === 'blog') return 'blog';
  if (raw === 'shop') return 'shop';

  const path = page.path.toLowerCase();
  if (path.includes('service')) return 'services';
  if (path.includes('confirmation') || path.includes('thank')) return 'thank_you';
  if (path.includes('contact')) return 'contact';
  if (path.includes('pricing')) return 'pricing';
  if (path.includes('gallery')) return 'gallery';
  if (path.includes('faq')) return 'faq';
  if (path.includes('book')) return 'booking';
  if (path.includes('checkout')) return 'checkout';
  if (path.includes('about')) return 'about';
  return 'custom';
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
  return Object.values(manifest).filter((binding) => binding.sourcePageId === pageId);
}

/**
 * Get all V2 bindings (with elementKey) for a page.
 */
export function getPageSlotBindings(
  manifest: Record<string, PlaygroundBinding>,
  pageId: string,
): PlaygroundBinding[] {
  return Object.values(manifest).filter(
    (binding) => binding.sourcePageId === pageId && !!binding.elementKey,
  );
}
