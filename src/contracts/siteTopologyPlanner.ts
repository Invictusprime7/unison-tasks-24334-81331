/**
 * Site Topology Planner
 * 
 * Generates a structured site plan (GeneratedSitePlan) from industry profile
 * BEFORE any file generation occurs. This is the canonical source of truth
 * for what pages exist, which are navigable, and how CTAs resolve.
 * 
 * Flow:
 *   IndustryProfile → planSiteTopology() → GeneratedSitePlan
 *   GeneratedSitePlan → populateRegistryFromTopology() → PageRegistry
 *   PageRegistry → VFS scaffolding → Preview
 * 
 * RULE: The topology drives the files, not the other way around.
 */

import type { IndustryProfile, PageSpec } from './industryMatrix';
import { getIndustryProfile } from './industryMatrix';
import type {
  PageRegistry,
  BuilderPage,
  BuilderPageType,
  RedirectRule,
  FunnelType,
} from '@/types/pageRegistry';
import {
  createEmptyPageRegistry,
  createBuilderPage,
  inferPageRoleFromType,
} from '@/types/pageRegistry';
import { generateUUID } from '@/utils/uuid';

// ============================================================================
// Site Topology Types
// ============================================================================

export type PageRole =
  | 'home'
  | 'about'
  | 'services'
  | 'contact'
  | 'pricing'
  | 'gallery'
  | 'faq'
  | 'booking'
  | 'checkout'
  | 'thank_you'
  | 'blog'
  | 'shop'
  | 'custom';

export interface PageRouteNode {
  id: string;
  name: string;
  title: string;
  route: string;
  role: PageRole;
  filePath: string;
  visibleInNav: boolean;
  isHome: boolean;
  generatedBy: 'wizard' | 'ai' | 'manual';
  funnelId?: string | null;
  seo?: {
    title?: string;
    description?: string;
  };
}

export interface RedirectBinding {
  id: string;
  sourcePageId: string;
  sourceElementLabel: string;
  intent: 'nav.goto_page';
  targetPageId: string;
  targetRoute: string;
  fallbackRoute?: string;
}

export interface FunnelPlan {
  funnelId: string;
  name: string;
  funnelType?: FunnelType;
  steps: Array<{
    pageId: string;
    role: string;
    sortOrder: number;
  }>;
}

export interface GeneratedSitePlan {
  siteId: string;
  industry: string;
  businessName: string;
  homePageId: string;
  pages: PageRouteNode[];
  navItems: string[]; // page IDs visible in nav
  funnels: FunnelPlan[];
  redirects: RedirectBinding[];
  generatedAt: string;
  /** Validation errors detected during planning */
  validationErrors?: string[];

}

// ============================================================================
// Purpose-to-PageType mapping
// ============================================================================

const PURPOSE_TO_PAGE_TYPE: Record<string, BuilderPageType> = {
  landing: 'home',
  services: 'landing',     // services page uses landing layout
  portfolio: 'gallery',
  contact: 'contact',
  about: 'about',
  blog: 'blog',
  shop: 'shop',
  checkout: 'checkout',
  booking: 'booking',
};

const PURPOSE_TO_ROLE: Record<string, PageRole> = {
  landing: 'home',
  services: 'services',
  portfolio: 'gallery',
  contact: 'contact',
  about: 'about',
  blog: 'blog',
  shop: 'shop',
  checkout: 'checkout',
  booking: 'booking',
};

// ============================================================================
// CTA Redirect Inference
// ============================================================================

/** Maps hero CTA labels to their target page roles */
const CTA_TARGET_MAP: Record<string, PageRole> = {
  'Book Now': 'booking',
  'Book Appointment': 'booking',
  'Schedule': 'booking',
  'Get Quote': 'contact',
  'Get Started': 'contact',
  'Contact Us': 'contact',
  'View Services': 'services',
  'Our Services': 'services',
  'View Pricing': 'pricing',
  'See Pricing': 'pricing',
  'Shop Now': 'shop',
  'Browse Products': 'shop',
  'View Gallery': 'gallery',
  'See Our Work': 'gallery',
  'Learn More': 'about',
  'About Us': 'about',
};

// Hidden pages that should not appear in navigation
const HIDDEN_ROLES: Set<PageRole> = new Set([
  'thank_you',
  'checkout',
]);

const REQUIRED_PAGE_BY_ROLE: Partial<Record<PageRole, { title: string; route: string; filePath: string; visibleInNav: boolean }>> = {
  contact: { title: 'Contact', route: '/contact', filePath: '/src/pages/Contact.tsx', visibleInNav: true },
  booking: { title: 'Booking', route: '/booking', filePath: '/src/pages/Booking.tsx', visibleInNav: true },
  shop: { title: 'Shop', route: '/shop', filePath: '/src/pages/Shop.tsx', visibleInNav: true },
  checkout: { title: 'Checkout', route: '/checkout', filePath: '/src/pages/Checkout.tsx', visibleInNav: false },
  thank_you: { title: 'Thank You', route: '/thank-you', filePath: '/src/pages/ThankYou.tsx', visibleInNav: false },
};

// ============================================================================
// Core Planner
// ============================================================================

/**
 * Generate a site topology from an industry key + business name.
 * This runs BEFORE file generation.
 */
export function planSiteTopology(
  industryKey: string,
  businessName: string,
  options?: {
    additionalPages?: PageSpec[];
    primaryIntent?: string;
  }
): GeneratedSitePlan {
  const profile = getIndustryProfile(industryKey);
  if (!profile) {
    // Fallback: generic site with home + contact
    return planGenericTopology(businessName);
  }

  return planFromProfile(profile, businessName, options);
}

function planFromProfile(
  profile: IndustryProfile,
  businessName: string,
  options?: {
    additionalPages?: PageSpec[];
    primaryIntent?: string;
  }
): GeneratedSitePlan {
  const siteId = generateUUID();
  const pages: PageRouteNode[] = [];
  const redirects: RedirectBinding[] = [];
  const primaryIntent = options?.primaryIntent || profile.primaryIntent;
  let homePageId = '';

  // 1. Build pages from industry defaultPages
  const allPageSpecs = dedupePageSpecsByPath([
    ...profile.defaultPages,
    ...(options?.additionalPages || []),
  ]);

  for (const spec of allPageSpecs) {
    const pageId = generateUUID();
    const role = PURPOSE_TO_ROLE[spec.purpose] || 'custom';
    const isHome = spec.path === '/';
    const slug = spec.path.replace(/^\//, '') || 'index';

    if (isHome) homePageId = pageId;

    const node: PageRouteNode = {
      id: pageId,
      name: spec.title,
      title: spec.title,
      route: spec.path,
      role,
      filePath: isHome
        ? '/src/pages/Home.tsx'
        : `/src/pages/${capitalize(slug)}.tsx`,
      visibleInNav: !HIDDEN_ROLES.has(role),
      isHome,
      generatedBy: 'wizard',
      seo: {
        title: `${spec.title} | ${businessName}`,
        description: `${spec.title} page for ${businessName}`,
      },
    };

    pages.push(node);
  }

  // Ensure we have a home page
  if (!homePageId && pages.length > 0) {
    homePageId = pages[0].id;
    pages[0].isHome = true;
  }

  // Ensure funnel-critical pages always exist before we derive funnels/bindings.
  ensureFunnelPrerequisitePages(pages, businessName, primaryIntent);

  // Re-sync home page in case the initial loop produced none.
  const resolvedHomePage = pages.find((p) => p.isHome) || pages[0];
  if (resolvedHomePage) {
    homePageId = resolvedHomePage.id;
    resolvedHomePage.isHome = true;
  }

  // 2. Build funnels from industry conversion patterns
  const funnels: FunnelPlan[] = [];

  // Booking funnel: landing → booking → thank you
  if (primaryIntent.startsWith('booking.')) {
    const bookingPage = pages.find(p => p.role === 'booking');
    const thankYouPage = pages.find(p => p.role === 'thank_you');
    const homePage = pages.find(p => p.isHome);
    if (homePage && bookingPage) {
      const funnelId = generateUUID();
      const steps: FunnelPlan['steps'] = [
        { pageId: homePage.id, role: 'entry', sortOrder: 0 },
        { pageId: bookingPage.id, role: 'offer', sortOrder: 1 },
      ];
      if (thankYouPage) {
        steps.push({ pageId: thankYouPage.id, role: 'confirmation', sortOrder: 2 });
      }
      // Tag pages with funnelId
      bookingPage.funnelId = funnelId;
      if (thankYouPage) thankYouPage.funnelId = funnelId;
      funnels.push({ funnelId, name: 'Booking Funnel', funnelType: 'booking', steps });
    }
  }

  // E-commerce funnel: shop → checkout → thank you
  if (primaryIntent === 'cart.add') {
    const shopPage = pages.find(p => p.role === 'shop');
    const checkoutPage = pages.find(p => p.role === 'checkout');
    const thankYouPage = pages.find(p => p.role === 'thank_you');
    if (shopPage && checkoutPage) {
      const funnelId = generateUUID();
      const steps: FunnelPlan['steps'] = [
        { pageId: shopPage.id, role: 'offer', sortOrder: 0 },
        { pageId: checkoutPage.id, role: 'checkout', sortOrder: 1 },
      ];
      if (thankYouPage) {
        steps.push({ pageId: thankYouPage.id, role: 'confirmation', sortOrder: 2 });
      }
      shopPage.funnelId = funnelId;
      checkoutPage.funnelId = funnelId;
      if (thankYouPage) thankYouPage.funnelId = funnelId;
      funnels.push({ funnelId, name: 'Purchase Funnel', funnelType: 'checkout', steps });
    }
  }

  // Lead capture funnel: home → contact → thank you
  if (primaryIntent.startsWith('contact.') || primaryIntent.startsWith('quote.')) {
    const contactPage = pages.find(p => p.role === 'contact');
    const thankYouPage = pages.find(p => p.role === 'thank_you');
    const homePage = pages.find(p => p.isHome);
    if (homePage && contactPage) {
      const funnelId = generateUUID();
      const steps: FunnelPlan['steps'] = [
        { pageId: homePage.id, role: 'entry', sortOrder: 0 },
        { pageId: contactPage.id, role: 'offer', sortOrder: 1 },
      ];
      if (thankYouPage) {
        steps.push({ pageId: thankYouPage.id, role: 'confirmation', sortOrder: 2 });
      }
      contactPage.funnelId = funnelId;
      if (thankYouPage) thankYouPage.funnelId = funnelId;
      funnels.push({ funnelId, name: 'Lead Capture Funnel', funnelType: 'lead', steps });
    }
  }

  // 3. Infer CTA redirects based on industry primary intent
  const contactPage = pages.find(p => p.role === 'contact');
  const bookingPage = pages.find(p => p.role === 'booking');
  const servicesPage = pages.find(p => p.role === 'services');
  const homePage = pages.find(p => p.isHome);

  // Hero CTA → primary action page
  if (homePage) {
    let targetPage: PageRouteNode | undefined;
    if (primaryIntent.startsWith('booking.') && bookingPage) {
      targetPage = bookingPage;
    } else if (primaryIntent.startsWith('contact.') && contactPage) {
      targetPage = contactPage;
    } else if (primaryIntent.startsWith('quote.') && contactPage) {
      targetPage = contactPage;
    } else if (contactPage) {
      targetPage = contactPage;
    }

    if (targetPage) {
      redirects.push({
        id: generateUUID(),
        sourcePageId: homePage.id,
        sourceElementLabel: getCTALabel(primaryIntent),
        intent: 'nav.goto_page',
        targetPageId: targetPage.id,
        targetRoute: targetPage.route,
      });
    }

    // Secondary CTA: "View Services" → services page
    if (servicesPage) {
      redirects.push({
        id: generateUUID(),
        sourcePageId: homePage.id,
        sourceElementLabel: 'View Services',
        intent: 'nav.goto_page',
        targetPageId: servicesPage.id,
        targetRoute: servicesPage.route,
      });
    }
  }

  // Nav CTAs → their respective pages
  for (const [label, role] of Object.entries(CTA_TARGET_MAP)) {
    const target = pages.find(p => p.role === role);
    if (target && homePage) {
      const exists = redirects.some(
        r => r.sourcePageId === homePage.id && r.targetPageId === target.id
      );
      if (!exists) {
        redirects.push({
          id: generateUUID(),
          sourcePageId: homePage.id,
          sourceElementLabel: label,
          intent: 'nav.goto_page',
          targetPageId: target.id,
          targetRoute: target.route,
        });
      }
    }
  }

  const plan: GeneratedSitePlan = {
    siteId,
    industry: profile.industry,
    businessName,
    homePageId,
    pages,
    navItems: pages.filter((page) => page.visibleInNav).map((page) => page.id),
    funnels,
    redirects,
    generatedAt: new Date().toISOString(),
  };

  // 4. Validate the plan
  plan.validationErrors = validateSitePlan(plan);


  return plan;
}

function planGenericTopology(businessName: string): GeneratedSitePlan {
  const siteId = generateUUID();
  const homeId = generateUUID();
  const contactId = generateUUID();

  return {
    siteId,
    industry: 'general',
    businessName,
    homePageId: homeId,
    pages: [
      {
        id: homeId,
        name: 'Home',
        title: 'Home',
        route: '/',
        role: 'home',
        filePath: '/src/pages/Home.tsx',
        visibleInNav: true,
        isHome: true,
        generatedBy: 'wizard',
        seo: { title: `Home | ${businessName}` },
      },
      {
        id: contactId,
        name: 'Contact',
        title: 'Contact',
        route: '/contact',
        role: 'contact',
        filePath: '/src/pages/Contact.tsx',
        visibleInNav: true,
        isHome: false,
        generatedBy: 'wizard',
        seo: { title: `Contact | ${businessName}` },
      },
    ],
    navItems: [homeId, contactId],
    funnels: [],
    redirects: [{
      id: generateUUID(),
      sourcePageId: homeId,
      sourceElementLabel: 'Contact Us',
      intent: 'nav.goto_page',
      targetPageId: contactId,
      targetRoute: '/contact',
    }],
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Registry Population
// ============================================================================

/**
 * Convert a GeneratedSitePlan into a fully populated PageRegistry.
 * This is the canonical bridge between planning and runtime.
 */
export function populateRegistryFromTopology(plan: GeneratedSitePlan): PageRegistry {
  const registry = createEmptyPageRegistry();
  registry.homePageId = plan.homePageId;

  for (let i = 0; i < plan.pages.length; i++) {
    const node = plan.pages[i];
    const pageType = roleToPageType(node.role);

    // Build redirect rules from the plan's redirect bindings
    const pageRedirects: RedirectRule[] = plan.redirects
      .filter(r => r.sourcePageId === node.id)
      .map(r => ({
        ruleId: r.id,
        condition: 'manual' as const,
        to: r.targetPageId,
        targetType: 'page' as const,
        triggerIntentId: r.intent,
      }));

    const page = createBuilderPage(
      node.id,
      node.title,
      node.route,
      pageType,
      {
        filePath: node.filePath,
        showInNav: node.visibleInNav,
        navOrder: i * 10,
        isHome: node.isHome,
        createdBy: node.generatedBy === 'wizard' ? 'template' : node.generatedBy === 'ai' ? 'ai' : 'manual',
        seo: node.seo,
        redirectRules: pageRedirects.length > 0 ? pageRedirects : undefined,
        pageRole: node.role === 'services' ? 'service' : inferPageRoleFromType(pageType),
        routeState: 'generated',
        publishedStatus: 'unpublished',
        funnelId: node.funnelId || undefined,
        funnelIds: node.funnelId ? [node.funnelId] : [],
      }
    );

    registry.pages[node.id] = page;
  }

  // Add funnels
  for (const funnelPlan of plan.funnels) {
    registry.funnels[funnelPlan.funnelId] = {
      funnelId: funnelPlan.funnelId,
      name: funnelPlan.name,
      funnelType: funnelPlan.funnelType || 'custom',
      steps: funnelPlan.steps.map(s => ({
        stepId: generateUUID(),
        pageId: s.pageId,
        role: s.role as any,
        nextStepId: null,
        sortOrder: s.sortOrder,
      })),
      entryStepId: '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  for (const funnel of Object.values(registry.funnels)) {
    for (const step of funnel.steps) {
      const page = registry.pages[step.pageId];
      if (!page) continue;
      const funnelIds = new Set(page.funnelIds || []);
      funnelIds.add(funnel.funnelId);
      page.funnelIds = Array.from(funnelIds);
      page.funnelId = page.funnelId || funnel.funnelId;
      page.funnelRole = step.role;
    }
  }

  registry.version = 1;
  return registry;
}

// ============================================================================
// Helpers
// ============================================================================

function roleToPageType(role: PageRole): BuilderPageType {
  const map: Record<PageRole, BuilderPageType> = {
    home: 'home',
    about: 'about',
    services: 'landing',
    contact: 'contact',
    pricing: 'pricing',
    gallery: 'gallery',
    faq: 'faq',
    booking: 'booking',
    checkout: 'checkout',
    thank_you: 'thankyou',
    blog: 'blog',
    shop: 'shop',
    custom: 'custom',
  };
  return map[role] || 'custom';
}

function dedupePageSpecsByPath(specs: PageSpec[]): PageSpec[] {
  const byPath = new Map<string, PageSpec>();
  for (const spec of specs) {
    const normalizedPath = spec.path.startsWith('/') ? spec.path : `/${spec.path}`;
    if (!byPath.has(normalizedPath)) {
      byPath.set(normalizedPath, { ...spec, path: normalizedPath });
    }
  }
  return Array.from(byPath.values());
}

function ensurePageNodeByRole(
  pages: PageRouteNode[],
  role: PageRole,
  businessName: string,
): void {
  if (pages.some((page) => page.role === role)) {
    return;
  }

  const defaults = REQUIRED_PAGE_BY_ROLE[role];
  if (!defaults) {
    return;
  }

  pages.push({
    id: generateUUID(),
    name: defaults.title,
    title: defaults.title,
    route: defaults.route,
    role,
    filePath: defaults.filePath,
    visibleInNav: defaults.visibleInNav,
    isHome: false,
    generatedBy: 'wizard',
    seo: {
      title: `${defaults.title} | ${businessName}`,
      description: `${defaults.title} page for ${businessName}`,
    },
  });
}

function ensureFunnelPrerequisitePages(
  pages: PageRouteNode[],
  businessName: string,
  primaryIntent: string,
): void {
  if (primaryIntent.startsWith('booking.')) {
    ensurePageNodeByRole(pages, 'booking', businessName);
    ensurePageNodeByRole(pages, 'thank_you', businessName);
    return;
  }

  if (primaryIntent === 'cart.add' || primaryIntent === 'cart.checkout') {
    ensurePageNodeByRole(pages, 'shop', businessName);
    ensurePageNodeByRole(pages, 'checkout', businessName);
    ensurePageNodeByRole(pages, 'thank_you', businessName);
    return;
  }

  if (primaryIntent === 'pay.checkout') {
    ensurePageNodeByRole(pages, 'checkout', businessName);
    ensurePageNodeByRole(pages, 'thank_you', businessName);
    return;
  }

  if (primaryIntent.startsWith('contact.') || primaryIntent.startsWith('quote.')) {
    ensurePageNodeByRole(pages, 'contact', businessName);
    ensurePageNodeByRole(pages, 'thank_you', businessName);
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

function getCTALabel(intent: string): string {
  const map: Record<string, string> = {
    'booking.create': 'Book Now',
    'contact.submit': 'Contact Us',
    'quote.request': 'Get a Quote',
    'cart.add': 'Shop Now',
    'newsletter.subscribe': 'Subscribe',
    'pay.checkout': 'Donate Now',
  };
  return map[intent] || 'Get Started';
}

// ============================================================================
// Validation
// ============================================================================

function validateSitePlan(plan: GeneratedSitePlan): string[] {
  const errors: string[] = [];

  if (!plan.homePageId) {
    errors.push('No home page defined');
  } else if (!plan.pages.find(p => p.id === plan.homePageId)) {
    errors.push('Home page ID does not match any page');
  }

  // Duplicate slugs
  const slugs = new Map<string, string>();
  for (const page of plan.pages) {
    const existing = slugs.get(page.route);
    if (existing) {
      errors.push(`Duplicate route "${page.route}" on pages "${existing}" and "${page.name}"`);
    } else {
      slugs.set(page.route, page.name);
    }
  }

  // Orphan redirect targets
  const pageIds = new Set(plan.pages.map(p => p.id));
  for (const r of plan.redirects) {
    if (!pageIds.has(r.targetPageId)) {
      errors.push(`Redirect "${r.sourceElementLabel}" targets unknown page`);
    }
  }

  // Funnel step references
  for (const funnel of plan.funnels) {
    for (const step of funnel.steps) {
      if (!pageIds.has(step.pageId)) {
        errors.push(`Funnel "${funnel.name}" step references unknown page`);
      }
    }
  }

  return errors;
}
