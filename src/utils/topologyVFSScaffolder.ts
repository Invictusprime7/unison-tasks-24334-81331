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
import type { WizardDesignIntervention } from '@/services/wizardDesignIntervention';

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
  /** Canonical, opt-in visual recipes projected into generated page modules. */
  designIntervention?: Pick<WizardDesignIntervention, 'motionRecipes' | 'sectionVariants' | 'activeVariants'> & Partial<Pick<WizardDesignIntervention, 'industry' | 'themePresetId' | 'layoutRecipe' | 'interactionRecipes'>>;
}


// ============================================================================
// Default per-role section pool — used when a template doesn't define its own.
// Keeps every chip-selected industry getting consistent sub-page structure.
// ============================================================================

const DEFAULT_ROLE_SECTION_POOL: Record<PageRole, SectionType[]> = {
  home:      ['navbar', 'hero', 'services', 'features', 'testimonials', 'cta', 'footer'],
  services:  ['navbar', 'hero', 'services', 'features', 'pricing', 'testimonials', 'cta', 'footer'],
  pricing:   ['navbar', 'hero', 'pricing', 'services', 'faq', 'testimonials', 'cta', 'footer'],
  about:     ['navbar', 'hero', 'about', 'team', 'stats', 'testimonials', 'cta', 'footer'],
  contact:   ['navbar', 'hero', 'contact', 'faq', 'testimonials', 'cta', 'footer'],
  gallery:   ['navbar', 'hero', 'gallery', 'testimonials', 'cta', 'footer'],
  faq:       ['navbar', 'hero', 'faq', 'services', 'testimonials', 'cta', 'footer'],
  booking:   ['navbar', 'hero', 'services', 'testimonials', 'contact', 'cta', 'footer'],
  shop:      ['navbar', 'hero', 'services', 'gallery', 'testimonials', 'cta', 'footer'],
  checkout:  ['navbar', 'hero', 'services', 'contact', 'faq', 'cta', 'footer'],
  thank_you: ['navbar', 'hero', 'stats', 'testimonials', 'cta', 'footer'],
  blog:      ['navbar', 'hero', 'blog-preview', 'testimonials', 'cta', 'footer'],
  custom:    ['navbar', 'hero', 'services', 'testimonials', 'faq', 'cta', 'footer'],
};

const MINIMUM_ROUTE_BODY_SECTIONS = 4;

const ROLE_SUPPLEMENT_PRIORITY: Record<PageRole, SectionType[]> = {
  home: ['services', 'features', 'testimonials', 'cta'],
  services: ['features', 'pricing', 'testimonials', 'faq', 'cta'],
  pricing: ['services', 'faq', 'testimonials', 'cta'],
  about: ['team', 'stats', 'testimonials', 'cta'],
  contact: ['faq', 'testimonials', 'services', 'cta'],
  gallery: ['testimonials', 'services', 'cta', 'faq'],
  faq: ['services', 'testimonials', 'cta', 'contact'],
  booking: ['services', 'testimonials', 'contact', 'cta'],
  shop: ['services', 'gallery', 'testimonials', 'cta'],
  checkout: ['services', 'contact', 'faq', 'cta'],
  thank_you: ['stats', 'testimonials', 'cta', 'services'],
  blog: ['blog-preview', 'testimonials', 'services', 'cta'],
  custom: ['services', 'testimonials', 'faq', 'cta'],
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

// ============================================================================
// Wizard-seed → composition brand/content injection
//
// The WizardSeed (persisted at `/.unison/wizard-seed.json`) is the durable
// record of every wizard selection (business name, industry, tagline, social
// links, intents). Template compositions ship with neutral sample copy —
// without this overlay, sub-pages render generic "Brand" / "Welcome" content
// even though the seed file is present in the VFS. This helper threads seed
// values into a TemplateComposition immediately before it is split into per-
// section files, so every page hash route reflects the wizard selections.
//
// Substitution rules (conservative — never clobber rich AI/user content):
//   • navbar/footer `brand`              → always overwritten with seed.business.name
//   • hero `headline` (empty/placeholder)→ filled from seed.business.tagline
//   • hero `subheadline` (empty)         → filled from seed.business.tagline
//   • contact email / phone (empty)      → filled from seed.generation.socials
//   • footer copyright (empty)           → filled with `© <year> <brand>`
//   • any string field containing the literal `{{businessName}}` is replaced
// ============================================================================

const BRAND_PLACEHOLDER_RE = /\{\{\s*businessName\s*\}\}/gi;
const TEMPLATE_BRAND_LITERALS = new Set([
  'Brand', 'BRAND', 'Your Brand', 'Your Business', 'Acme', 'Acme Inc.',
  'Company', 'Your Company', 'Lorem', 'Lorem Ipsum',
]);

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function looksLikePlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  return TEMPLATE_BRAND_LITERALS.has(trimmed);
}

function substituteBrandTokens<T>(value: T, brand: string): T {
  if (typeof value === 'string') {
    return value.replace(BRAND_PLACEHOLDER_RE, brand) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => substituteBrandTokens(item, brand)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substituteBrandTokens(v, brand);
    }
    return out as T;
  }
  return value;
}

interface NormalizedSeed {
  brand?: string;
  tagline?: string;
  industry?: string;
  email?: string;
  phone?: string;
  address?: string;
  socials?: Array<{ platform?: string; href?: string }>;
}

function normalizeWizardSeed(seed: Record<string, unknown> | undefined): NormalizedSeed {
  if (!seed || typeof seed !== 'object') return {};
  const business = (seed.business as Record<string, unknown> | undefined) || {};
  const generation = (seed.generation as Record<string, unknown> | undefined) || {};
  const socials = Array.isArray(generation.socials)
    ? (generation.socials as Array<{ platform?: string; href?: string; email?: string; phone?: string }>)
    : [];
  const findSocial = (kind: string) =>
    socials.find((s) => String(s?.platform || '').toLowerCase() === kind)?.href;
  return {
    brand: typeof business.name === 'string' ? business.name : undefined,
    tagline: typeof business.tagline === 'string' ? business.tagline : undefined,
    industry: typeof business.industry === 'string' ? business.industry : undefined,
    email: findSocial('email') || (socials.find((s) => s.email)?.email as string | undefined),
    phone: findSocial('phone') || (socials.find((s) => s.phone)?.phone as string | undefined),
    address: findSocial('address'),
    socials,
  };
}

function applyWizardSeedToComposition(
  composition: TemplateComposition,
  plan: GeneratedSitePlan,
): TemplateComposition {
  const seed = normalizeWizardSeed(
    (plan as GeneratedSitePlan & { wizardSeed?: Record<string, unknown> }).wizardSeed,
  );
  const brand = seed.brand || plan.businessName;
  if (!brand && !seed.tagline && !seed.email && !seed.phone) return composition;

  // 1. Recursively substitute `{{businessName}}` tokens across every section.
  let nextSections = brand
    ? composition.sections.map((s) => substituteBrandTokens(s, brand))
    : composition.sections.slice();

  // 2. Per-section structural overrides for brand-critical fields.
  nextSections = nextSections.map((section) => {
    const props = { ...(section.props as Record<string, unknown> | undefined) } as Record<string, unknown>;
    switch (section.type) {
      case 'navbar':
      case 'footer': {
        if (brand && (looksLikePlaceholder(props.brand) || isBlank(props.brand))) {
          props.brand = brand;
        }
        if (section.type === 'footer') {
          if (isBlank(props.copyright) && brand) {
            props.copyright = `© ${new Date().getFullYear()} ${brand}. All rights reserved.`;
          }
          if (isBlank(props.tagline) && seed.tagline) {
            props.tagline = seed.tagline;
          }
          // Merge wizard-seed socials into footer.socials so that the runtime
          // Footer renders lucide icons even when the composition step was
          // bypassed. Seed uses `href`; Footer runtime uses `url`.
          if (Array.isArray(seed.socials) && seed.socials.length > 0) {
            const existing = (Array.isArray(props.socials) ? props.socials : []) as Array<{ platform?: string; url?: string; href?: string }>;
            const byPlatform = new Map<string, { platform: string; url: string }>();
            for (const s of existing) {
              const p = String(s?.platform || '').toLowerCase();
              if (p) byPlatform.set(p, { platform: p, url: (s.url || s.href || '#') });
            }
            for (const s of seed.socials) {
              const p = String(s?.platform || '').toLowerCase();
              if (!p) continue;
              const url = s.href || (s as { url?: string }).url || '#';
              byPlatform.set(p, { platform: p, url });
            }
            props.socials = Array.from(byPlatform.values());
          }
        }
        break;
      }
      case 'hero': {
        if (looksLikePlaceholder(props.headline) && seed.tagline) {
          props.headline = seed.tagline;
        }
        if (isBlank(props.subheadline) && seed.tagline) {
          props.subheadline = seed.tagline;
        }
        break;
      }
      case 'contact': {
        if (isBlank(props.email) && seed.email) props.email = seed.email;
        if (isBlank(props.phone) && seed.phone) props.phone = seed.phone;
        if (isBlank(props.address) && seed.address) props.address = seed.address;
        if (isBlank(props.headline) && brand) {
          props.headline = `Contact ${brand}`;
        }
        break;
      }
      default:
        break;
    }
    return { ...section, props } as SectionEntry;
  });

  return { ...composition, sections: nextSections };
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
  page: PageRouteNode,
): TemplateComposition | null {
  const poolList: SectionType[] =
    template.sectionPool?.[role as TemplatePageRole] ??
    DEFAULT_ROLE_SECTION_POOL[role] ??
    DEFAULT_ROLE_SECTION_POOL.custom;
  const allowedTypes = new Set<SectionType>(poolList);
  const alternateMedia = !page.isHome ? collectAlternateHeroMedia(template) : [];
  const alternateHeroMedia = alternateMedia[stableStringHash(page.id) % Math.max(1, alternateMedia.length)];

  // Iterate template sections in source order and keep every section whose
  // type is in the allowed set. Duplicates are preserved with unique ids so
  // React keys + intent slots stay distinct. All section payload fields
  // (items, cards, products, gallery, layout, props) are passed through.
  const filtered: SectionEntry[] = [];
  const typeCounters = new Map<SectionType, number>();
  const selectedSourceIds = new Set<string>();
  const appendSection = (source: SectionEntry) => {
    const idx = typeCounters.get(source.type) ?? 0;
    typeCounters.set(source.type, idx + 1);
    const props = { ...(source.props as Record<string, unknown>) };
    if (source.type === 'hero' && !page.isHome) {
      const roleLabel = page.title.trim() || page.role.replace(/_/g, ' ');
      props.headline = roleLabel;
      props.subheadline = `Explore ${roleLabel.toLowerCase()} from ${template.name}.`;
      props.badge = roleLabel;
      if (alternateHeroMedia) {
        if (typeof props.image === 'string') props.image = alternateHeroMedia;
        else props.backgroundImage = alternateHeroMedia;
      }
    }
    filtered.push({
      ...source,
      id: `${page.id}-${source.type}-${idx}`,
      sourceSectionId: source.sourceSectionId || source.id,
      props: props as SectionEntry['props'],
    });
    selectedSourceIds.add(source.id);
  };
  for (const source of template.sections) {
    if (!allowedTypes.has(source.type)) continue;
    appendSection(source);
  }

  if (!page.isHome && filtered.length < MINIMUM_ROUTE_BODY_SECTIONS) {
    const priority = ROLE_SUPPLEMENT_PRIORITY[role] || ROLE_SUPPLEMENT_PRIORITY.custom;
    const candidates = template.sections
      .map((section, index) => ({ section, index, priority: priority.indexOf(section.type) }))
      .filter(({ section }) => (
        section.type !== 'navbar' && section.type !== 'footer' && section.type !== 'hero' && !selectedSourceIds.has(section.id)
      ))
      .sort((left, right) => {
        const leftPriority = left.priority === -1 ? Number.MAX_SAFE_INTEGER : left.priority;
        const rightPriority = right.priority === -1 ? Number.MAX_SAFE_INTEGER : right.priority;
        return leftPriority - rightPriority || left.index - right.index;
      });
    for (const { section } of candidates) {
      appendSection(section);
      if (filtered.length >= MINIMUM_ROUTE_BODY_SECTIONS) break;
    }
  }

  if (filtered.length === 0) return null;

  return {
    ...template,
    id: `${template.id}--${role}`,
    name: `${template.name} · ${page.title}`,
    sections: filtered,
  };
}

function stableStringHash(value: string): number {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function collectAlternateHeroMedia(template: TemplateComposition): string[] {
  const media = new Set<string>();
  for (const section of template.sections) {
    if (section.type === 'hero') continue;
    const props = section.props as Record<string, unknown>;
    for (const key of ['image', 'backgroundImage']) {
      if (typeof props[key] === 'string' && props[key]) media.add(props[key]);
    }
    if (Array.isArray(props.items)) {
      for (const item of props.items) {
        if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).image === 'string') {
          media.add((item as Record<string, string>).image);
        }
      }
    }
  }
  return [...media];
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
    const compositional = tryComposeTopologyPageFiles(page, plan, activeTemplate, options);
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
  options?: ScaffoldOptions,
): Record<string, string> {
  const composed = tryComposeTopologyPageFiles(page, plan, template, options);
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
  const seeded = applyWizardSeedToComposition(sub, plan);
  try {
    return compositionToReactCode(seeded);
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
  options?: ScaffoldOptions,
): Record<string, string> | null {
  const active = applyPlanThemeToTemplate(template ?? resolveActiveTemplate(plan), plan);
  if (!active) return null;
  const sub = buildRoleComposition(active, page.role, page);
  if (!sub) return null;
  const seeded = applyWizardSeedToComposition(sub, plan);
  try {
    return compositionToReactFileSet(seeded, page.filePath, {
      designIntervention: options?.designIntervention,
    });
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
