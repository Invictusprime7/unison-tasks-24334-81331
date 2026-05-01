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

import type { GeneratedSitePlan, PageRouteNode, PageRole } from '@/contracts/siteTopologyPlanner';
import { generateCanonicalRouter, generateCanonicalRouterFromPlan } from './topologyRouterGenerator';
import type { PageRegistry } from '@/types/pageRegistry';
import type { SectionEntry, SectionType, TemplateComposition, TemplatePageRole } from '@/sections/types';
import { ALL_COMPOSITIONS, getCompositionById, getCompositionsByIndustry } from '@/sections/templates';
import { compositionToReactCode } from '@/sections/PageRenderer';

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

/**
 * Build a synthetic sub-composition for a given page role by filtering the
 * template's source sections through the per-role pool. Sections retain their
 * original props (so industry copy, chips, intents survive), but the page
 * shows only the role-appropriate subset in pool order.
 *
 * Returns null if no usable sections can be assembled (caller falls back to spinner).
 */
function buildRoleComposition(
  template: TemplateComposition,
  role: PageRole,
  page: PageRouteNode
): TemplateComposition | null {
  const pool: SectionType[] =
    template.sectionPool?.[role as TemplatePageRole] ??
    DEFAULT_ROLE_SECTION_POOL[role] ??
    DEFAULT_ROLE_SECTION_POOL.custom;

  // Index template sections by type. First match wins for each type slot.
  const byType = new Map<SectionType, SectionEntry>();
  for (const s of template.sections) {
    if (!byType.has(s.type)) byType.set(s.type, s);
  }

  const filtered: SectionEntry[] = [];
  pool.forEach((type, idx) => {
    const source = byType.get(type);
    if (!source) return;
    // Clone with a unique id per page so React keys + intent slots stay distinct.
    filtered.push({
      ...source,
      id: `${page.id}-${type}-${idx}`,
    });
  });

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
 */
export function scaffoldMissingTopologyPages(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>
): Record<string, string> {
  const newFiles: Record<string, string> = {};
  const template = resolveActiveTemplate(plan);

  for (const page of plan.pages) {
    if (!existingFiles[page.filePath]) {
      newFiles[page.filePath] = generateTopologyPlaceholder(page, plan, template);
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

  // Always regenerate the canonical router so all pages are routable.
  // IMPORTANT: Use plan-based router generation instead of registry-based,
  // because the registry may not be populated yet (React state updates are async).
  // The plan is the authoritative source of truth for page structure.
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
 * Generate a page file for a topology node.
 *
 * If the active template can produce a role-filtered sub-composition, the
 * page is rendered as a real industry-styled layout via the section registry.
 * Otherwise falls back to a minimal loading placeholder so the route still
 * imports cleanly while AI fills in content on demand.
 */
export function generateTopologyPlaceholder(
  page: PageRouteNode,
  plan: GeneratedSitePlan,
  template?: TemplateComposition | null
): string {
  const activeTemplate = template ?? resolveActiveTemplate(plan);

  // Preferred path: serialize a real role-filtered sub-composition.
  if (activeTemplate) {
    const subComposition = buildRoleComposition(activeTemplate, page.role, page);
    if (subComposition) {
      return compositionToReactCode(subComposition);
    }
  }

  // Fallback: minimal navigable placeholder (preserves prior behavior).
  return generateSpinnerPlaceholder(page, plan);
}

function generateSpinnerPlaceholder(page: PageRouteNode, plan: GeneratedSitePlan): string {
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
