/**
 * Route Policy — Canonical route contracts
 * 
 * Routes are part of the business contract, not a template concern.
 * The compiler decides which routes exist, which intents map to routes,
 * and which routes map to overlays instead of navigation.
 * 
 * Themes NEVER invent route semantics. Only the blueprint does.
 */

import type { CoreIntent } from '@/coreIntents';
import type { BlueprintPage } from './blueprintSchema';
import type { CapabilityId } from './capabilityRegistry';

// ============================================================================
// Types
// ============================================================================

export interface RouteEntry {
  /** URL path */
  path: string;
  /** Human label for nav */
  label: string;
  /** Is this a real page or an overlay trigger? */
  kind: 'page' | 'overlay' | 'external' | 'anchor';
  /** Intent that navigating here resolves to */
  intent?: CoreIntent;
  /** Which capability owns this route (if any) */
  ownedBy?: CapabilityId;
  /** Is this a system-reserved route? */
  reserved?: boolean;
}

export interface RoutePolicy {
  /** All valid routes for this site */
  routes: RouteEntry[];
  /** CTA → route mapping (intent → path or overlay) */
  ctaRouteMap: Record<string, string>;
  /** Routes that should open overlays instead of navigating */
  overlayRoutes: string[];
  /** Reserved system routes (auth, checkout, etc.) */
  reservedRoutes: RouteEntry[];
  /** Fallback route for unknown paths */
  fallbackRoute: string;
}

// ============================================================================
// Reserved system routes (always available)
// ============================================================================

const SYSTEM_RESERVED_ROUTES: RouteEntry[] = [
  { path: '/auth/login', label: 'Login', kind: 'overlay', intent: 'auth.login', ownedBy: 'auth', reserved: true },
  { path: '/auth/register', label: 'Register', kind: 'overlay', intent: 'auth.register', ownedBy: 'auth', reserved: true },
];

// ============================================================================
// Capability-owned routes
// ============================================================================

const CAPABILITY_ROUTES: Partial<Record<CapabilityId, RouteEntry[]>> = {
  booking: [
    { path: '/book', label: 'Book Now', kind: 'overlay', intent: 'booking.create', ownedBy: 'booking' },
  ],
  commerce: [
    { path: '/shop', label: 'Shop', kind: 'page', intent: 'nav.goto', ownedBy: 'commerce' },
    { path: '/cart', label: 'Cart', kind: 'overlay', intent: 'cart.checkout', ownedBy: 'commerce' },
    { path: '/checkout', label: 'Checkout', kind: 'page', intent: 'pay.checkout', ownedBy: 'commerce' },
  ],
  quoting: [
    { path: '/request-quote', label: 'Request Quote', kind: 'overlay', intent: 'quote.request', ownedBy: 'quoting' },
  ],
  donation: [
    { path: '/donate', label: 'Donate', kind: 'overlay', intent: 'pay.checkout', ownedBy: 'donation' },
  ],
};

// ============================================================================
// CTA → Route/Overlay resolution
// ============================================================================

/** Map of intents that resolve to overlays instead of page navigation */
const OVERLAY_INTENTS: CoreIntent[] = [
  'booking.create',
  'quote.request',
  'cart.checkout',
  'auth.login',
  'auth.register',
];

// ============================================================================
// Builder
// ============================================================================

export function buildRoutePolicy(
  pages: BlueprintPage[],
  capabilities: CapabilityId[],
): RoutePolicy {
  const routes: RouteEntry[] = [];
  const ctaRouteMap: Record<string, string> = {};
  const overlayRoutes: string[] = [];

  // 1. Add page routes from blueprint
  for (const page of pages) {
    routes.push({
      path: page.path,
      label: page.title,
      kind: 'page',
      intent: 'nav.goto',
    });
  }

  // 2. Add capability-owned routes
  for (const capId of capabilities) {
    const capRoutes = CAPABILITY_ROUTES[capId];
    if (capRoutes) {
      for (const route of capRoutes) {
        // Don't duplicate if blueprint already has this path
        if (!routes.some(r => r.path === route.path)) {
          routes.push(route);
        }
        // Map intent → route
        if (route.intent) {
          ctaRouteMap[route.intent] = route.path;
        }
        if (route.kind === 'overlay') {
          overlayRoutes.push(route.path);
        }
      }
    }
  }

  // 3. Add reserved system routes
  const reservedRoutes = SYSTEM_RESERVED_ROUTES.filter(r =>
    capabilities.includes(r.ownedBy as CapabilityId) || r.ownedBy === 'auth'
  );
  for (const route of reservedRoutes) {
    if (!routes.some(r => r.path === route.path)) {
      routes.push(route);
    }
    if (route.intent) {
      ctaRouteMap[route.intent] = route.path;
    }
    if (route.kind === 'overlay') {
      overlayRoutes.push(route.path);
    }
  }

  return {
    routes,
    ctaRouteMap,
    overlayRoutes,
    reservedRoutes,
    fallbackRoute: '/',
  };
}

/**
 * Validate that all page links in the site resolve to real routes.
 */
export function validateRouteLinks(
  routePolicy: RoutePolicy,
  referencedPaths: string[],
): { valid: boolean; missingPaths: string[] } {
  const validPaths = new Set(routePolicy.routes.map(r => r.path));
  const missing = referencedPaths.filter(p => !validPaths.has(p));
  return { valid: missing.length === 0, missingPaths: missing };
}

/**
 * Check if an intent should open an overlay or navigate to a page.
 */
export function isOverlayIntent(intent: CoreIntent): boolean {
  return OVERLAY_INTENTS.includes(intent);
}
