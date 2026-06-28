/**
 * Topology → VFS Scaffolder
 *
 * Ensures every page declared in the site topology has a corresponding
 * .tsx file in the VFS. Generates starter React components for missing pages
 * based on their role/type from the topology plan.
 *
 * **Template-driven scaffolding (Phase 1):**
 * When the active site plan carries a `selectedTemplateId` (set by the Wizard
 * Launcher chip selection), sub-pages are scaffolded as **role-filtered subsets
 * of the template's section pool** — not generic spinners. This makes the chip
 * selection the single authority over CSS layouts, navigation structure, and
 * page scaffolding direction.
 */

import type { GeneratedSitePlan, PageRouteNode, PageRole } from '@/platform/core/siteTopologyPlanner';
import { generateCanonicalRouter, generateCanonicalRouterFromPlan } from './topologyRouterGenerator';
import type { PageRegistry } from '@/types/pageRegistry';
import type { SectionEntry, SectionType, TemplateComposition, TemplatePageRole } from '@/sections/types';
import { ALL_COMPOSITIONS, getCompositionById, getCompositionsByIndustry } from '@/sections/templates';
import { compositionToReactCode } from '@/sections/PageRenderer';
import { compositionToReactFileSet } from '@/sections/compositionToFileSet';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import { themePresetToThemeTokens } from '@/components/onboarding/themePresetToTokens';
import { PreviewPipelineError } from '@/services/previewPipelineError';

/**
 * Options shared by the scaffolding entry points.
 *
 * Spinner / minimal placeholder scaffolds have been REMOVED from Unison.
 * Every page MUST render from the site/page topology + SiteBundleSnapshot
 * composition (industry template + theme preset). If a topology page has no
 * resolvable composition, the scaffolder throws PreviewPipelineError so the
 * runtime surfaces the drift via PreviewRuntimeError instead of emitting a
 * loading/minimal placeholder.
 *
 * `strictWizardComposition` is retained for callsite compatibility but is now
 * effectively always-on — there is no legacy spinner path to opt out to.
 */
export interface ScaffoldOptions {
  /** @deprecated Strict composition is now the only supported mode. */
  strictWizardComposition?: boolean;
}


// ============================================================================
// Default per-role section pool — used when a template doesn't define its own.
// Keeps every chip-selected industry getting consistent sub-page structure.
// ============================================================================

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
  blog:      ['navbar', 'hero', 'blog-preview', 'cta', 'footer'],
  custom:    ['navbar', 'hero', 'cta', 'footer'],
};

// ============================================================================
// Template resolution — chip → composition
// ============================================================================

/**
 * Resolve which TemplateComposition drives this site plan.
 * Priority: explicit selectedTemplateId → industry-matched composition → null.
 */
function resolveActiveTemplate(plan: GeneratedSitePlan): TemplateComposition | null {
  // The plan carries selectedTemplateId via planSiteTopology options (see planner).
  const selectedId = (plan as GeneratedSitePlan & { selectedTemplateId?: string }).selectedTemplateId;
  if (selectedId) {
    const direct = getCompositionById(selectedId);
    if (direct) return direct;
  }

  // Industry fallback — use first composition matching the plan's industry.
  const byIndustry = getCompositionsByIndustry(plan.industry);
  if (byIndustry.length > 0) return byIndustry[0];

  // Last-resort lexical scan against composition.industry/category.
  const fuzzy = ALL_COMPOSITIONS.find(
    c => c.industry === plan.industry || c.category === plan.industry
  );
  return fuzzy ?? null;
}

function applyPlanThemeToTemplate(
  template: TemplateComposition | null,
  plan: GeneratedSitePlan,
): TemplateComposition | null {
  if (!template) return null;
  const presetId = (plan as GeneratedSitePlan & { selectedThemePresetId?: string }).selectedThemePresetId;
  if (!presetId) return template;
  const preset = THEME_PRESETS.find((p) => p.id === presetId);
  if (!preset) return template;
  return {
    ...template,
    theme: themePresetToThemeTokens(preset),
  };
}

/**
 * Build a synthetic sub-composition for a given page role by filtering the
 * template's source sections through the per-role pool.
 *
 * **Authority rule (Execution Hierarchy):** SiteBundle / template composition
 * owns section *presence* and *count*. The role pool is used **only as a filter
 * set** — we iterate every section in `template.sections` in source order and
 * keep it if its type is allowed for this role. This preserves repeated
 * sections (e.g. multiple feature-card grids, product collections, gallery
 * tiles) and their full `items` / `cards` / `products` / `layout` payloads.
 *
 * Previously this function used a `Map<SectionType, SectionEntry>` with
 * "first match wins", collapsing every duplicate into a single section and
 * producing sparse skeleton pages regardless of bundle richness. Do not
 * reintroduce that pattern.
 *
 * Returns null if no usable sections can be assembled (caller falls back to spinner).
 */
function buildRoleComposition(
  template: TemplateComposition,
  role: PageRole,
  page: PageRouteNode
): TemplateComposition | null {
  const poolList: SectionType[] =
    template.sectionPool?.[role as TemplatePageRole] ??
    DEFAULT_ROLE_SECTION_POOL[role] ??
    DEFAULT_ROLE_SECTION_POOL.custom;
  const allowedTypes = new Set<SectionType>(poolList);

  // Iterate template sections in source order and keep every section whose
  // type is in the allowed set. Duplicates are preserved with unique ids so
  // React keys + intent slots stay distinct. All section payload fields
  // (items, cards, products, gallery, layout, props) are passed through.
  const filtered: SectionEntry[] = [];
  const typeCounters = new Map<SectionType, number>();
  for (const source of template.sections) {
    if (!allowedTypes.has(source.type)) continue;
    const idx = typeCounters.get(source.type) ?? 0;
    typeCounters.set(source.type, idx + 1);
    filtered.push({
      ...source,
      id: `${page.id}-${source.type}-${idx}`,
    });
  }

  if (filtered.length === 0) return null;

  return {
    ...template,
    id: `${template.id}--${role}`,
    name: `${template.name} · ${page.title}`,
    sections: filtered,
  };
}


// ============================================================================
// Core: Scaffold missing pages from topology
// ============================================================================

/**
 * Given a site plan and existing VFS files, returns a map of files that
 * need to be created to satisfy the topology.
 *
 * When `template` is provided (or resolvable from the plan), missing pages
 * are scaffolded as role-filtered slices of the template's composition via
 * `buildRoleComposition` + `compositionToReactCode`, so sub-pages added
 * post-wizard inherit the same section vocabulary and styling as the seed
 * `/src/App.tsx`. Without a usable composition, this throws; wizard previews
 * must never render spinner/minimal placeholders that mask a broken SiteBundle.
 */
export function scaffoldMissingTopologyPages(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>,
  template?: TemplateComposition | null,
  options?: ScaffoldOptions,
): Record<string, string> {
  const out: Record<string, string> = {};
  const activeTemplate = applyPlanThemeToTemplate(template ?? resolveActiveTemplate(plan), plan);
  const missing = getMissingTopologyPages(plan, existingFiles);

  const blocked: string[] = [];
  for (const page of missing) {
    const compositional = tryComposeTopologyPageFiles(page, plan, activeTemplate);
    if (compositional) {
      Object.assign(out, compositional);
      continue;
    }
    blocked.push(page.filePath);
  }

  if (blocked.length > 0) {
    throw new PreviewPipelineError(
      'vfs',
      `SiteBundleSnapshot has no composition for ${blocked.length} wizard page(s); refusing to emit minimal scaffold.`,
      { blockedFiles: blocked, recoverableByRelaunch: true },
    );
  }

  return out;
}


/**
 * Scaffold missing pages AND regenerate the canonical router (App.tsx).
 * This is the preferred entry point — it guarantees every scaffolded
 * page is also routable in the preview.
 */
export function scaffoldMissingTopologyPagesWithRouter(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>,
  registry: PageRegistry,
  template?: TemplateComposition | null,
  options?: ScaffoldOptions,
): Record<string, string> {
  const newFiles = scaffoldMissingTopologyPages(plan, existingFiles, template, options);

  const registryPages = Object.values(registry.pages);
  const routerCode = registryPages.length > 0
    ? generateCanonicalRouter(registry, plan.businessName)
    : generateCanonicalRouterFromPlan(plan);

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
// Page Generator
// ============================================================================

/**
 * Generate a page file (LEGACY: single self-contained string) for a topology
 * node. Retained for callers that need a single string (Builder reference,
 * sectionSwapper). Wizard scaffolding uses `generateTopologyPlaceholderFiles`
 * to emit per-component files for navigability.
 */
export function generateTopologyPlaceholder(
  page: PageRouteNode,
  plan: GeneratedSitePlan,
  template?: TemplateComposition | null
): string {
  const composed = tryComposeTopologyPage(page, plan, template);
  if (composed) return composed;
  throw new PreviewPipelineError(
    'vfs',
    `SiteBundleSnapshot has no composition for page "${page.title}" (${page.filePath}); refusing to emit minimal scaffold.`,
    { blockedFiles: [page.filePath], recoverableByRelaunch: true },
  );
}

/**
 * Multi-file variant. Returns the page file + extracted section components
 * under `/src/components/`. Throws PreviewPipelineError if no composition.
 */
export function generateTopologyPlaceholderFiles(
  page: PageRouteNode,
  plan: GeneratedSitePlan,
  template?: TemplateComposition | null,
): Record<string, string> {
  const composed = tryComposeTopologyPageFiles(page, plan, template);
  if (composed) return composed;
  throw new PreviewPipelineError(
    'vfs',
    `SiteBundleSnapshot has no composition for page "${page.title}" (${page.filePath}); refusing to emit minimal scaffold.`,
    { blockedFiles: [page.filePath], recoverableByRelaunch: true },
  );
}

/**
 * Attempt to compose a page (single-string form) from the active template.
 * Returns null when composition is unavailable.
 */
export function tryComposeTopologyPage(
  page: PageRouteNode,
  plan: GeneratedSitePlan,
  template?: TemplateComposition | null,
): string | null {
  const active = applyPlanThemeToTemplate(template ?? resolveActiveTemplate(plan), plan);
  if (!active) return null;
  const sub = buildRoleComposition(active, page.role, page);
  if (!sub) return null;
  try {
    return compositionToReactCode(sub);
  } catch {
    return null;
  }
}

/**
 * Attempt to compose a page (multi-file form). Emits the page module plus
 * the shared `/src/components/*` files. Section component files are
 * idempotent across pages within a generation — safe to merge by Object.assign.
 */
export function tryComposeTopologyPageFiles(
  page: PageRouteNode,
  plan: GeneratedSitePlan,
  template?: TemplateComposition | null,
): Record<string, string> | null {
  const active = applyPlanThemeToTemplate(template ?? resolveActiveTemplate(plan), plan);
  if (!active) return null;
  const sub = buildRoleComposition(active, page.role, page);
  if (!sub) return null;
  try {
    return compositionToReactFileSet(sub, page.filePath);
  } catch {
    return null;
  }
}



function extractComponentName(filePath: string): string {
  const fileName = filePath.split('/').pop()?.replace('.tsx', '') || 'Page';
  return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

/**
 * Returns the list of non-home pages from a topology plan
 * that need AI generation (missing from VFS).
 *
 * Note: when a template-driven scaffold is in play, these pages already have
 * real industry composition content — AI is only needed if the user explicitly
 * asks to enrich them.
 */
export function getTopologyPagesForAIGeneration(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>
): PageRouteNode[] {
  return plan.pages.filter(p => !existingFiles[p.filePath] && !p.isHome);
}
