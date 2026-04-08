/**
 * Topology Resolver — Runtime bridge between redirect intents and page routes.
 * 
 * Resolves `targetPageId` from RedirectBindings against the PageRegistry
 * so CTA buttons in preview navigate to the correct route.
 */

import type { PageRegistry } from '@/types/pageRegistry';
import type { GeneratedSitePlan, RedirectBinding } from '@/contracts/siteTopologyPlanner';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Route Resolution
// ============================================================================

/**
 * Resolve a targetPageId to a route string using the page registry.
 */
export function resolvePageRoute(
  registry: PageRegistry,
  targetPageId: string
): string | null {
  const page = registry.pages[targetPageId];
  return page ? page.path : null;
}

/**
 * Resolve a redirect binding to a concrete route.
 * Falls back to the binding's targetRoute if registry lookup fails.
 */
export function resolveRedirectBinding(
  registry: PageRegistry,
  binding: RedirectBinding
): string {
  const resolved = resolvePageRoute(registry, binding.targetPageId);
  return resolved || binding.targetRoute || binding.fallbackRoute || '/';
}

/**
 * Build a complete redirect map from a site plan + registry.
 * Returns: { [sourcePageId-label]: resolvedRoute }
 */
export function buildRedirectMap(
  registry: PageRegistry,
  redirects: RedirectBinding[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of redirects) {
    const key = `${r.sourcePageId}::${r.sourceElementLabel}`;
    map[key] = resolveRedirectBinding(registry, r);
  }
  return map;
}

/**
 * Given a button label and source page, find the target route.
 * Used by the INTENT_TRIGGER handler to resolve nav.goto_page intents.
 */
export function resolveIntentTarget(
  registry: PageRegistry,
  redirects: RedirectBinding[],
  sourcePageId: string | null,
  buttonLabel: string
): string | null {
  // Try exact match on source + label
  if (sourcePageId) {
    const binding = redirects.find(
      r => r.sourcePageId === sourcePageId &&
        r.sourceElementLabel.toLowerCase() === buttonLabel.toLowerCase()
    );
    if (binding) return resolveRedirectBinding(registry, binding);
  }

  // Try label-only match (any source page)
  const anyBinding = redirects.find(
    r => r.sourceElementLabel.toLowerCase() === buttonLabel.toLowerCase()
  );
  if (anyBinding) return resolveRedirectBinding(registry, anyBinding);

  // Try role-based resolution from label
  const roleFromLabel = inferRoleFromLabel(buttonLabel);
  if (roleFromLabel) {
    const targetPage = Object.values(registry.pages).find(
      p => inferRoleFromPageType(p.pageType) === roleFromLabel
    );
    if (targetPage) return targetPage.path;
  }

  return null;
}

// ============================================================================
// Topology Persistence
// ============================================================================

const TOPOLOGY_STORAGE_KEY = 'lovable_site_topology';

/**
 * Persist a site plan to sessionStorage so it survives page refreshes.
 */
export function persistTopology(plan: GeneratedSitePlan): void {
  try {
    sessionStorage.setItem(TOPOLOGY_STORAGE_KEY, JSON.stringify(plan));
  } catch {
    console.warn('[TopologyResolver] Failed to persist site plan');
  }
}

/**
 * Recover a persisted site plan from sessionStorage.
 */
export function recoverTopology(): GeneratedSitePlan | null {
  try {
    const raw = sessionStorage.getItem(TOPOLOGY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GeneratedSitePlan;
  } catch {
    return null;
  }
}

/**
 * Clear persisted topology.
 */
export function clearTopology(): void {
  try {
    sessionStorage.removeItem(TOPOLOGY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ============================================================================
// Database Persistence (builder_drafts.metadata)
// ============================================================================

/**
 * Save site plan to the database via builder_drafts metadata.
 * Requires authenticated user.
 */
export async function persistTopologyToDb(
  plan: GeneratedSitePlan,
  draftId?: string
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[TopologyResolver] No auth user, skipping DB persist');
      return null;
    }

    const metadata = JSON.parse(JSON.stringify({
      sitePlan: plan,
      persistedAt: new Date().toISOString(),
    }));

    if (draftId) {
      // Update existing draft
      const { error } = await supabase
        .from('builder_drafts')
        .update({ metadata, updated_at: new Date().toISOString() })
        .eq('id', draftId)
        .eq('user_id', user.id);
      if (error) throw error;
      return draftId;
    } else {
      // Create new draft with topology
      const { data, error } = await supabase
        .from('builder_drafts')
        .insert([{
          user_id: user.id,
          code: '',
          metadata,
        }])
        .select('id')
        .single();
      if (error) throw error;
      return data?.id || null;
    }
  } catch (err) {
    console.warn('[TopologyResolver] Failed to persist topology to DB:', err);
    return null;
  }
}

/**
 * Recover a site plan from the database.
 */
export async function recoverTopologyFromDb(
  draftId?: string
): Promise<GeneratedSitePlan | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let query = supabase
      .from('builder_drafts')
      .select('metadata')
      .eq('user_id', user.id);

    if (draftId) {
      query = query.eq('id', draftId);
    } else {
      query = query.order('updated_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();
    if (error || !data?.metadata) return null;

    const meta = data.metadata as Record<string, unknown>;
    if (meta.sitePlan) {
      return meta.sitePlan as GeneratedSitePlan;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate a site plan for common structural issues.
 */
export function validateSitePlanStructure(plan: GeneratedSitePlan): string[] {
  const errors: string[] = [];

  // Check for home page
  if (!plan.homePageId) {
    errors.push('No home page defined');
  } else if (!plan.pages.find(p => p.id === plan.homePageId)) {
    errors.push('Home page ID does not match any page');
  }

  // Check for duplicate slugs
  const slugs = new Map<string, string>();
  for (const page of plan.pages) {
    const existing = slugs.get(page.route);
    if (existing) {
      errors.push(`Duplicate route "${page.route}" on pages "${existing}" and "${page.name}"`);
    } else {
      slugs.set(page.route, page.name);
    }
  }

  // Check for orphan redirect targets
  const pageIds = new Set(plan.pages.map(p => p.id));
  for (const r of plan.redirects) {
    if (!pageIds.has(r.targetPageId)) {
      errors.push(`Redirect "${r.sourceElementLabel}" targets unknown page ID "${r.targetPageId}"`);
    }
    if (!pageIds.has(r.sourcePageId)) {
      errors.push(`Redirect "${r.sourceElementLabel}" sourced from unknown page ID "${r.sourcePageId}"`);
    }
  }

  // Check funnel step references
  for (const funnel of plan.funnels) {
    for (const step of funnel.steps) {
      if (!pageIds.has(step.pageId)) {
        errors.push(`Funnel "${funnel.name}" step references unknown page "${step.pageId}"`);
      }
    }
  }

  // Check nav items reference valid pages
  for (const navId of plan.navItems) {
    if (!pageIds.has(navId)) {
      errors.push(`Nav item references unknown page "${navId}"`);
    }
  }

  return errors;
}

// ============================================================================
// Helpers
// ============================================================================

function inferRoleFromLabel(label: string): string | null {
  const lower = label.toLowerCase().trim();
  if (/book|schedule|appointment/i.test(lower)) return 'booking';
  if (/contact|get in touch|reach/i.test(lower)) return 'contact';
  if (/service|what we do/i.test(lower)) return 'services';
  if (/pric|plan|package/i.test(lower)) return 'pricing';
  if (/shop|store|browse|product/i.test(lower)) return 'shop';
  if (/gallery|portfolio|work/i.test(lower)) return 'gallery';
  if (/about|learn more|who we are/i.test(lower)) return 'about';
  if (/faq|question/i.test(lower)) return 'faq';
  return null;
}

function inferRoleFromPageType(pageType: string): string | null {
  const map: Record<string, string> = {
    home: 'home',
    about: 'about',
    contact: 'contact',
    booking: 'booking',
    pricing: 'pricing',
    gallery: 'gallery',
    shop: 'shop',
    faq: 'faq',
    landing: 'services',
    blog: 'blog',
  };
  return map[pageType] || null;
}
