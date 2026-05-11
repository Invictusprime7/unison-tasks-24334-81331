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
import type { PageRegistry, BuilderPage, BuilderPageType, BuilderPageRole } from '@/types/pageRegistry';
import { generateCanonicalRouter } from '@/utils/topologyRouterGenerator';
import { deriveFilePath } from './routeNavigationService';
import type { TemplateComposition, SectionEntry, SectionType, TemplatePageRole } from '@/sections/types';
import { getCompositionById, getCompositionsByIndustry, ALL_COMPOSITIONS } from '@/sections/templates';
import { compositionToReactCode } from '@/sections/PageRenderer';
import { resolveThemePreset } from '@/components/onboarding/industryThemePresetMap';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import { themePresetToThemeTokens } from '@/components/onboarding/themePresetToTokens';
import type { LayoutCategory } from '@/data/templates/types';
import type { PageRole } from '@/contracts/siteTopologyPlanner';

// ============================================================================
// Compile Options — drives deterministic full-site scaffolding from the
// Wizard's Template card + Style card, instead of generic placeholders.
// ============================================================================

export interface CompilePlaygroundOptions {
  /** Template card chosen by the wizard (drives section composition per page). */
  selectedTemplateId?: string;
  /** Style card chosen by the wizard (drives theme tokens used in scaffolds). */
  selectedThemeId?: string;
  /** Industry/category for fallback composition + theme resolution. */
  industry?: LayoutCategory | string | null;
}

// Map BuilderPageType / BuilderPageRole → topology PageRole used by sectionPool lookup.
const BUILDER_TYPE_TO_PAGE_ROLE: Record<BuilderPageType, PageRole> = {
  landing: 'home',
  home: 'home',
  about: 'about',
  contact: 'contact',
  shop: 'shop',
  product: 'shop',
  checkout: 'checkout',
  cart: 'checkout',
  thankyou: 'thank_you',
  booking: 'booking',
  gallery: 'gallery',
  blog: 'blog',
  faq: 'faq',
  pricing: 'pricing',
  legal: 'custom',
  custom: 'custom',
};

const BUILDER_ROLE_TO_PAGE_ROLE: Partial<Record<BuilderPageRole, PageRole>> = {
  home: 'home',
  landing: 'home',
  service: 'services',
  contact: 'contact',
  checkout: 'checkout',
  thank_you: 'thank_you',
  upsell: 'custom',
  booking: 'booking',
  shop: 'shop',
  gallery: 'gallery',
  faq: 'faq',
  blog: 'blog',
  about: 'about',
  pricing: 'pricing',
  legal: 'custom',
  custom: 'custom',
};

const DEFAULT_ROLE_SECTION_POOL: Record<PageRole, SectionType[]> = {
  home:      ['navbar', 'hero', 'services', 'features', 'testimonials', 'cta', 'footer'],
  services:  ['navbar', 'hero', 'services', 'pricing', 'cta', 'footer'],
  pricing:   ['navbar', 'hero', 'pricing', 'faq', 'cta', 'footer'],
  about:     ['navbar', 'hero', 'about', 'team', 'stats', 'footer'],
  contact:   ['navbar', 'hero', 'contact', 'footer'],
  gallery:   ['navbar', 'hero', 'gallery', 'cta', 'footer'],
  faq:       ['navbar', 'hero', 'faq', 'cta', 'footer'],
  booking:   ['navbar', 'hero', 'services', 'contact', 'footer'],
  shop:      ['navbar', 'hero', 'services', 'cta', 'footer'],
  checkout:  ['navbar', 'hero', 'contact', 'footer'],
  thank_you: ['navbar', 'hero', 'cta', 'footer'],
  blog:      ['navbar', 'hero', 'cta', 'footer'],
  custom:    ['navbar', 'hero', 'cta', 'footer'],
};

function pageToTopologyRole(page: BuilderPage): PageRole {
  if (page.pageRole && BUILDER_ROLE_TO_PAGE_ROLE[page.pageRole]) {
    return BUILDER_ROLE_TO_PAGE_ROLE[page.pageRole]!;
  }
  return BUILDER_TYPE_TO_PAGE_ROLE[page.pageType] || 'custom';
}

function resolveActiveTemplate(
  options?: CompilePlaygroundOptions,
): TemplateComposition | null {
  if (options?.selectedTemplateId) {
    const direct = getCompositionById(options.selectedTemplateId);
    if (direct) return direct;
  }
  const industry = options?.industry;
  if (industry) {
    const byIndustry = getCompositionsByIndustry(String(industry));
    if (byIndustry.length > 0) return byIndustry[0];
    const fuzzy = ALL_COMPOSITIONS.find(
      (c) => c.industry === industry || c.category === industry,
    );
    if (fuzzy) return fuzzy;
  }
  return null;
}

function buildRoleComposition(
  template: TemplateComposition,
  page: BuilderPage,
  brand: string | undefined,
): TemplateComposition | null {
  const role = pageToTopologyRole(page);
  const pool: SectionType[] =
    template.sectionPool?.[role as TemplatePageRole] ??
    DEFAULT_ROLE_SECTION_POOL[role] ??
    DEFAULT_ROLE_SECTION_POOL.custom;

  const byType = new Map<SectionType, SectionEntry>();
  for (const s of template.sections) {
    if (!byType.has(s.type)) byType.set(s.type, s);
  }

  const filtered: SectionEntry[] = [];
  pool.forEach((type, idx) => {
    const source = byType.get(type);
    if (!source) return;
    let next: SectionEntry = { ...source, id: `${page.pageId}-${type}-${idx}` };
    if ((type === 'navbar' || type === 'footer') && brand) {
      next = { ...next, props: { ...(next.props as Record<string, unknown>), brand } } as SectionEntry;
    }
    filtered.push(next);
  });

  if (filtered.length === 0) return null;

  return {
    ...template,
    id: `${template.id}--${role}-${page.pageId.slice(0, 6)}`,
    name: `${template.name} · ${page.title}`,
    sections: filtered,
  };
}

export function compilePlayground(
  state: PlaygroundState,
  existingVfsFiles: Record<string, string> = {},
  businessName?: string,
  options?: CompilePlaygroundOptions,
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

  // 3. Resolve the deterministic Template+Theme used to scaffold every page.
  //    The Wizard's Template card and Style card are the single, durable source
  //    of truth for non-AI page bodies. If a composition exists, we ALWAYS
  //    render real role-filtered content (themed by the resolved style preset)
  //    instead of a generic placeholder.
  const activeTemplate = resolveActiveTemplate(options);
  const themedComposition = (() => {
    if (!activeTemplate) return null;
    const preset = resolveThemePreset(
      options?.selectedThemeId
        ? ({ id: options.selectedThemeId } as Parameters<typeof resolveThemePreset>[0])
        : null,
      (options?.industry as LayoutCategory | undefined) ?? null,
    );
    const themedTokens = themePresetToThemeTokens(preset);
    return { ...activeTemplate, theme: themedTokens } as TemplateComposition;
  })();

  // 4. Collect VFS files — preserve existing, scaffold missing
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

    // Preferred path: render a real role-filtered themed composition for this page.
    if (themedComposition) {
      const subComposition = buildRoleComposition(themedComposition, page, businessName);
      if (subComposition) {
        vfsFiles[fp] = compositionToReactCode(subComposition);
        continue;
      }
    }

    // Last-resort fallback (no template/composition resolvable): generic placeholder.
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
