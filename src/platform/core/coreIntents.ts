/**
 * CoreIntent surface — DERIVED from src/intents/registry.ts.
 *
 * This file remains the public type/value surface that the rest of the
 * codebase imports (the in-flight refactor leaves ~50 call-sites pointing at
 * `@/coreIntents`). The registry is the single source of truth; legacy
 * exports here are computed views over it.
 *
 * To add a new intent: edit `src/intents/registry.ts` ONLY.
 */
import {
  INTENT_REGISTRY,
  activeIntentNames,
  intentsByNamespace,
  isRegisteredIntent,
  resolveIntentName,
} from '@/intents/registry';

// ============================================================================
// Derived intent name lists (kept as runtime arrays for back-compat)
// ============================================================================

export const NAV_INTENTS = intentsByNamespace('nav').map((d) => d.name);
export const PAY_INTENTS = Object.values(INTENT_REGISTRY)
  .filter((d) => d.name.startsWith('pay.'))
  .map((d) => d.name);
export const ACTION_INTENTS = Object.values(INTENT_REGISTRY)
  .filter(
    (d) =>
      (d.namespace === 'lead' && d.surface !== 'client') ||
      d.name === 'newsletter.subscribe' ||
      d.name === 'booking.create',
  )
  .map((d) => d.name);
export const AUTOMATION_INTENTS = Object.values(INTENT_REGISTRY)
  .filter(
    (d) =>
      d.namespace === 'utility' ||
      d.namespace === 'auth' ||
      (d.namespace === 'commerce' && d.surface !== 'redirect' && !d.name.startsWith('pay.')) ||
      (d.namespace === 'booking' && d.name !== 'booking.create') ||
      (d.namespace === 'lead' && d.surface === 'client'),
  )
  .map((d) => d.name);

export const CORE_INTENTS = activeIntentNames();

export type NavIntent = string;
export type PayIntent = string;
export type ActionIntent = string;
export type AutomationIntent = string;
export type CoreIntent = string;

export function isCoreIntent(intent: string): boolean {
  return isRegisteredIntent(intent);
}

export function isNavIntent(intent: string): boolean {
  const canonical = resolveIntentName(intent);
  return !!canonical && (NAV_INTENTS as string[]).includes(canonical);
}

export function isPayIntent(intent: string): boolean {
  const canonical = resolveIntentName(intent);
  return !!canonical && (PAY_INTENTS as string[]).includes(canonical);
}

export function isActionIntent(intent: string): boolean {
  const canonical = resolveIntentName(intent);
  return !!canonical && (ACTION_INTENTS as string[]).includes(canonical);
}

export function isAutomationIntent(intent: string): boolean {
  const canonical = resolveIntentName(intent);
  return !!canonical && (AUTOMATION_INTENTS as string[]).includes(canonical);
}

// ============================================================================
// Element Affinity — unchanged static map (consumed by AI auto-wire heuristics)
// ============================================================================

export const INTENT_ELEMENT_AFFINITY: Record<string, {
  elements: string[];
  ctaLabels: string[];
  payloadKeys: string[];
  description: string;
}> = {
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
  'pay.checkout': {
    elements: ['pricing-3-tier', 'cart-overlay'],
    ctaLabels: ['cta.primary'],
    payloadKeys: ['data-plan', 'data-price-id'],
    description: 'Begin checkout / payment flow',
  },
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
  'auth.register': {
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
