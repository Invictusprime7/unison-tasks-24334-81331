/**
 * CoreIntent surface (locked)
 *
 * Templates may ONLY emit these intents.
 * If you want to add a new intent, it must be explicitly added here and
 * registered with a backend handler.
 * 
 * ARCHITECTURE:
 * - NAV_INTENTS: Client-side routing (no backend needed)
 * - PAY_INTENTS: Payment redirects (backend creates checkout session)
 * - ACTION_INTENTS: Business workflows (CRM, notifications, etc.)
 * - AUTOMATION_INTENTS: Event-driven automation triggers
 * 
 * RULE: All templates use only CORE_INTENTS. Legacy intents are normalized
 * via INTENT_ALIASES (see runtime/intentAliases.ts).
 */

// Navigation intents - handle routing within projects (CLIENT-SIDE)
export const NAV_INTENTS = [
  'nav.goto',      // Internal route: { path: "/about" }
  'nav.external',  // External URL: { url: "https://..." }
  'nav.anchor',    // Same-page anchor: { anchor: "#pricing" }
] as const;

// Payment intents - handle checkout redirects (BACKEND)
export const PAY_INTENTS = [
  'pay.checkout',  // Begin checkout: { priceId: "price_xxx", plan: "starter" }
  'pay.success',   // Success redirect handler
  'pay.cancel',    // Cancel redirect handler
] as const;

// Business/action intents - trigger backend workflows
export const ACTION_INTENTS = [
  'contact.submit',        // Submit contact form
  'newsletter.subscribe',  // Subscribe to newsletter/waitlist
  'booking.create',        // Create booking/appointment
  'quote.request',         // Request a quote/estimate
  'lead.capture',          // Capture lead data
] as const;

// Automation intents - event-driven workflow triggers
export const AUTOMATION_INTENTS = [
  'button.click',      // Generic button automation trigger
  'form.submit',       // Generic form automation trigger  
  'auth.login',        // Auth form submission
  'auth.register',     // Registration form
  'cart.add',          // Add to cart
  'cart.checkout',     // Begin checkout
  'cart.abandoned',    // Cart abandonment (timer-based)
  'booking.confirmed', // Booking confirmed
  'booking.reminder',  // Booking reminder trigger
  'booking.cancelled', // Booking cancelled
  'booking.noshow',    // No-show event
  'order.created',     // Order placed
  'order.shipped',     // Order shipped
  'order.delivered',   // Order delivered
  'deal.won',          // Deal closed won
  'deal.lost',         // Deal closed lost
  'proposal.sent',     // Proposal sent to prospect
  'job.completed',     // Job/service completed
] as const;

// Combined core intents
export const CORE_INTENTS = [
  ...NAV_INTENTS,
  ...PAY_INTENTS,
  ...ACTION_INTENTS,
  ...AUTOMATION_INTENTS,
] as const;

export type NavIntent = (typeof NAV_INTENTS)[number];
export type PayIntent = (typeof PAY_INTENTS)[number];
export type ActionIntent = (typeof ACTION_INTENTS)[number];
export type AutomationIntent = (typeof AUTOMATION_INTENTS)[number];
export type CoreIntent = (typeof CORE_INTENTS)[number];

export function isCoreIntent(intent: string): intent is CoreIntent {
  return (CORE_INTENTS as readonly string[]).includes(intent);
}

export function isNavIntent(intent: string): intent is NavIntent {
  return (NAV_INTENTS as readonly string[]).includes(intent);
}

export function isPayIntent(intent: string): intent is PayIntent {
  return (PAY_INTENTS as readonly string[]).includes(intent);
}

export function isActionIntent(intent: string): intent is ActionIntent {
  return (ACTION_INTENTS as readonly string[]).includes(intent);
}

export function isAutomationIntent(intent: string): intent is AutomationIntent {
  return (AUTOMATION_INTENTS as readonly string[]).includes(intent);
}

// ============================================================================
// Element Affinity — Maps intents to the elements that typically carry them
// ============================================================================

/**
 * Which site elements typically trigger each intent.
 * Used by the AI to auto-wire elements when generating full-stack pages.
 *
 * Structure: intent → { elements, ctaLabels, payloadKeys }
 */
export const INTENT_ELEMENT_AFFINITY: Record<string, {
  /** Element IDs that commonly carry this intent */
  elements: string[];
  /** CTA tracking labels for these elements */
  ctaLabels: string[];
  /** Required data-* payload attributes */
  payloadKeys: string[];
  /** Human-readable description of what this wiring does */
  description: string;
}> = {
  // Navigation
  'nav.goto': {
    elements: ['navbar-standard', 'mobile-menu-drawer', 'breadcrumb-standard', 'footer-multi-column'],
    ctaLabels: ['cta.nav', 'cta.footer'],
    payloadKeys: ['data-ut-path'],
    description: 'Internal page navigation via HashRouter',
  },
  'nav.anchor': {
    elements: ['hero-centered', 'hero-split', 'hero-fullbleed', 'announcement-bar', 'cta-banner'],
    ctaLabels: ['cta.hero-secondary', 'cta.secondary'],
    payloadKeys: ['data-ut-anchor'],
    description: 'Smooth-scroll to section on same page',
  },
  'nav.external': {
    elements: ['footer-multi-column', 'team-grid'],
    ctaLabels: [],
    payloadKeys: [],
    description: 'Open external URL in new tab',
  },

  // Payment
  'pay.checkout': {
    elements: ['pricing-3-tier', 'cart-overlay'],
    ctaLabels: ['cta.primary'],
    payloadKeys: ['data-plan', 'data-price-id'],
    description: 'Begin checkout / payment flow',
  },

  // Actions
  'contact.submit': {
    elements: ['contact-form-section', 'hero-centered', 'hero-split', 'cta-banner', 'faq-accordion', 'pricing-3-tier'],
    ctaLabels: ['cta.primary', 'cta.hero', 'cta.secondary'],
    payloadKeys: [],
    description: 'Submit contact form / open contact overlay',
  },
  'newsletter.subscribe': {
    elements: ['newsletter-signup', 'footer-multi-column'],
    ctaLabels: ['cta.primary'],
    payloadKeys: [],
    description: 'Subscribe to newsletter / mailing list',
  },
  'booking.create': {
    elements: ['hero-centered', 'hero-split', 'hero-fullbleed', 'service-cards', 'navbar-standard', 'cta-banner'],
    ctaLabels: ['cta.hero', 'cta.nav', 'cta.primary'],
    payloadKeys: ['data-service'],
    description: 'Create booking / appointment',
  },
  'quote.request': {
    elements: ['hero-centered', 'hero-fullbleed', 'service-cards', 'contact-form-section', 'cta-banner'],
    ctaLabels: ['cta.hero', 'cta.primary'],
    payloadKeys: [],
    description: 'Request a quote or estimate',
  },
  'lead.capture': {
    elements: ['hero-split', 'contact-form-section', 'cta-banner'],
    ctaLabels: ['cta.hero', 'cta.primary'],
    payloadKeys: [],
    description: 'Capture lead information',
  },

  // Automation
  'auth.signup': {
    elements: ['hero-centered', 'hero-split', 'navbar-standard', 'cta-banner', 'footer-multi-column'],
    ctaLabels: ['cta.hero', 'cta.nav', 'cta.primary'],
    payloadKeys: [],
    description: 'Open auth overlay (register)',
  },
  'cart.add': {
    elements: ['product-card-grid', 'service-cards'],
    ctaLabels: ['cta.primary'],
    payloadKeys: ['data-product-id', 'data-product-name', 'data-price'],
    description: 'Add item to shopping cart',
  },
  'cart.view': {
    elements: ['navbar-standard'],
    ctaLabels: ['cta.nav'],
    payloadKeys: [],
    description: 'Open cart overlay',
  },
};
