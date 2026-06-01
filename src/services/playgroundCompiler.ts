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
import type { PageRole } from '@/platform/core/siteTopologyPlanner';

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
  home:      ['navbar', 'hero', 'services', 'testimonials', 'stats', 'cta', 'footer'],
  services:  ['navbar', 'hero', 'services', 'pricing', 'testimonials', 'cta', 'footer'],
  pricing:   ['navbar', 'hero', 'pricing', 'faq', 'cta', 'footer'],
  about:     ['navbar', 'hero', 'about', 'team', 'stats', 'testimonials', 'cta', 'footer'],
  contact:   ['navbar', 'hero', 'contact', 'cta', 'footer'],
  gallery:   ['navbar', 'hero', 'gallery', 'testimonials', 'cta', 'footer'],
  faq:       ['navbar', 'hero', 'faq', 'cta', 'footer'],
  booking:   ['navbar', 'hero', 'services', 'testimonials', 'contact', 'footer'],
  shop:      ['navbar', 'hero', 'services', 'testimonials', 'cta', 'footer'],
  checkout:  ['navbar', 'hero', 'contact', 'footer'],
  thank_you: ['navbar', 'hero', 'cta', 'footer'],
  blog:      ['navbar', 'hero', 'services', 'cta', 'footer'],
  custom:    ['navbar', 'hero', 'services', 'cta', 'footer'],
};

/**
 * Build a section-type → SectionEntry lookup from the active template,
 * falling back to other compositions of the same industry, then any composition.
 * This guarantees every pool slot has real content even when the chosen template
 * lacks a particular section type.
 */
function buildSectionLookup(
  template: TemplateComposition,
): Map<SectionType, SectionEntry> {
  const lookup = new Map<SectionType, SectionEntry>();
  // 1. Primary: the active template
  for (const s of template.sections) {
    if (!lookup.has(s.type)) lookup.set(s.type, s);
  }
  // 2. Same-industry siblings
  const siblings = ALL_COMPOSITIONS.filter(
    (c) => c.id !== template.id && (c.industry === template.industry || c.category === template.category),
  );
  for (const sib of siblings) {
    for (const s of sib.sections) {
      if (!lookup.has(s.type)) lookup.set(s.type, s);
    }
  }
  // 3. Universal fallback: any composition
  for (const c of ALL_COMPOSITIONS) {
    if (c.id === template.id) continue;
    for (const s of c.sections) {
      if (!lookup.has(s.type)) lookup.set(s.type, s);
    }
  }
  return lookup;
}

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

  const lookup = buildSectionLookup(template);

  const filtered: SectionEntry[] = [];
  const usedTypes = new Set<SectionType>();
  pool.forEach((type, idx) => {
    if (usedTypes.has(type)) return; // dedupe within pool
    const source = lookup.get(type);
    if (!source) return;
    usedTypes.add(type);
    let next: SectionEntry = { ...source, id: `${page.pageId}-${type}-${idx}` };
    if ((type === 'navbar' || type === 'footer') && brand) {
      next = { ...next, props: { ...(next.props as Record<string, unknown>), brand } } as SectionEntry;
    }
    filtered.push(next);
  });

  // Guarantee structural minimum: navbar + hero + footer at minimum
  const ensure = (type: SectionType) => {
    if (filtered.some((s) => s.type === type)) return;
    const source = lookup.get(type);
    if (!source) return;
    const entry = { ...source, id: `${page.pageId}-${type}-ensure` } as SectionEntry;
    if (type === 'navbar') filtered.unshift(entry);
    else if (type === 'footer') filtered.push(entry);
    else filtered.splice(1, 0, entry);
  };
  ensure('navbar');
  ensure('hero');
  ensure('footer');

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

  // 1. Ensure all pages have filePath (registry retains the planned topology
  //    so AI Builder prompts can reason about it later as site context).
  for (const page of pages) {
    if (!page.filePath) {
      page.filePath = deriveFilePath(page);
    }
  }

  const homePage = pages.find((page) => page.isHome) || pages[0] || null;

  // 2. Generate canonical router — HOME ONLY. Sub-page scaffolding is removed
  //    from the wizard launch; the AI Builder will add additional pages (and
  //    extend the router) on demand when the user prompts for them. Routing
  //    sub-pages now would import files we no longer generate, breaking the
  //    preview.
  const homeOnlyRegistry = homePage
    ? { ...registry, pages: { [homePage.pageId]: homePage } }
    : registry;
  const routerContent = generateCanonicalRouter(homeOnlyRegistry, businessName);
  const routerFile = {
    path: '/src/App.tsx',
    content: routerContent,
  };

  // 3. Resolve the deterministic Template+Theme used to scaffold the Home page.
  //    Sub-pages no longer ship at launch, so the composition is only used for
  //    Home (and as theme context the AI Builder reads later).
  const activeTemplate = resolveActiveTemplate(options);
  const themedComposition = (() => {
    if (!activeTemplate) return null;
    const explicitPreset =
      options?.selectedThemeId
        ? THEME_PRESETS.find((p) => p.id === options.selectedThemeId) ?? null
        : null;
    const preset = resolveThemePreset(
      explicitPreset,
      (options?.industry as LayoutCategory | undefined) ?? null,
    );
    const themedTokens = themePresetToThemeTokens(preset);
    return { ...activeTemplate, theme: themedTokens } as TemplateComposition;
  })();

  // 4. Collect VFS files — HOME ONLY. Other registered pages are intentionally
  //    not scaffolded; AI Builder will create them later in response to user
  //    prompts using the current site context.
  const vfsFiles: Record<string, string> = {};

  if (routerContent) {
    vfsFiles['/src/App.tsx'] = routerContent;
  }

  if (homePage) {
    const fp = homePage.filePath!;
    const existingPageFile = existingVfsFiles[fp];

    if (existingPageFile) {
      vfsFiles[fp] = existingPageFile;
    } else {
      const legacyHomeSource = existingVfsFiles['/src/App.tsx'] || existingVfsFiles['/App.tsx'];
      if (legacyHomeSource) {
        vfsFiles[fp] = rebaseHomeModuleForPageFile(legacyHomeSource);
      } else if (themedComposition) {
        const subComposition = buildRoleComposition(themedComposition, homePage, businessName);
        if (subComposition) {
          vfsFiles[fp] = compositionToReactCode(subComposition);
        } else {
          vfsFiles[fp] = generatePlaygroundPagePlaceholder(homePage, businessName, homePage);
        }
      } else {
        vfsFiles[fp] = generatePlaygroundPagePlaceholder(homePage, businessName, homePage);
      }
    }
  }

  // 5. Preserve any pre-existing AI-authored page files the caller passed in
  //    (e.g. pages the AI Builder created in a previous turn). We only skip
  //    auto-scaffolding new placeholders; we do not delete real content.
  for (const page of pages) {
    if (page === homePage) continue;
    const fp = page.filePath!;
    if (existingVfsFiles[fp]) {
      vfsFiles[fp] = existingVfsFiles[fp];
    }
  }

  // 6. Build binding manifest
  const bindingManifest: Record<string, PlaygroundBinding> = { ...state.bindings };

  // 7. Build preview manifest — only routes whose file we shipped.
  const homeRoute = homePage?.path || '/';
  const routes = pages
    .filter((p) => !p.isHome && vfsFiles[p.filePath!])
    .map((p) => p.path)
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
