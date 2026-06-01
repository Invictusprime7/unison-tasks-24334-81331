/**
 * Industry Intent Profiles — declarative per-industry intent contracts.
 *
 * Each profile declares which coreIntents are:
 *  - required:  MUST be present at publish time (validator should warn if missing)
 *  - primary:   should appear as hero/navbar primary CTA when possible
 *  - secondary: acceptable supporting CTAs
 *  - optional:  allowed but not promoted
 *  - forbidden: stripped from generated bindings (wizard / AI hallucinations)
 *
 * The resolver consumes this layer AFTER MODEL_BINDINGS_V2 + INDUSTRY_AUGMENTS
 * to keep behavior data-driven instead of prompt-driven.
 *
 * NOTE: This is a pure registry — no AI, no randomness. Adding/changing an
 * industry's behavior happens here, not in the AI prompt.
 */

import type { BusinessModel, IndustryOverlay } from './playground';

/** A single industry's intent contract. */
export interface IndustryIntentProfile {
  /** coreIntents that must be present at publish time. */
  required: string[];
  /** Preferred coreIntent for hero/navbar primary CTA. */
  primary?: string;
  /** Acceptable secondary CTA coreIntents (hero secondary, repeated CTAs). */
  secondary?: string[];
  /** Allowed but not promoted. */
  optional?: string[];
  /** coreIntents that must be stripped if encountered. */
  forbidden?: string[];
}

// ============================================================================
// Industry-level profiles (specific verticals)
// ============================================================================

const INDUSTRY_PROFILES: Partial<Record<IndustryOverlay, IndustryIntentProfile>> = {
  // ── Booking-led verticals ─────────────────────────────────────────────
  salon: {
    required: ['booking.create', 'contact.submit'],
    primary: 'booking.create',
    secondary: ['nav.goto', 'contact.call'],
    optional: ['newsletter.subscribe', 'contact.email'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  barber: {
    required: ['booking.create', 'contact.submit'],
    primary: 'booking.create',
    secondary: ['nav.goto', 'contact.call'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  medspa: {
    required: ['booking.create', 'lead.capture'],
    primary: 'booking.create',
    secondary: ['nav.goto', 'contact.call'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  wellness: {
    required: ['booking.create'],
    primary: 'booking.create',
    secondary: ['nav.goto', 'contact.submit'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  dental: {
    required: ['booking.create', 'contact.submit'],
    primary: 'booking.create',
    secondary: ['contact.call', 'nav.goto'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  fitness: {
    required: ['booking.create'],
    primary: 'booking.create',
    secondary: ['nav.goto', 'lead.capture'],
    forbidden: ['donation.start'],
  },
  photographer: {
    required: ['booking.create', 'lead.capture'],
    primary: 'booking.create',
    secondary: ['nav.goto'],
    forbidden: ['cart.checkout', 'donation.start'],
  },
  coaching: {
    required: ['booking.create', 'lead.capture'],
    primary: 'booking.create',
    secondary: ['nav.goto', 'newsletter.subscribe'],
    forbidden: ['donation.start'],
  },

  // ── Quote / lead verticals ────────────────────────────────────────────
  contractor: {
    required: ['quote.request', 'contact.submit'],
    primary: 'quote.request',
    secondary: ['contact.call', 'nav.goto'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  hvac: {
    required: ['quote.request', 'contact.call'],
    primary: 'quote.request',
    secondary: ['contact.call', 'nav.goto'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  cleaning: {
    required: ['quote.request'],
    primary: 'quote.request',
    secondary: ['booking.create', 'contact.call'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  landscaping: {
    required: ['quote.request'],
    primary: 'quote.request',
    secondary: ['contact.call', 'nav.goto'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  auto_detailing: {
    required: ['quote.request'],
    primary: 'quote.request',
    secondary: ['booking.create', 'contact.call'],
    forbidden: ['donation.start'],
  },
  moving: {
    required: ['quote.request', 'contact.submit'],
    primary: 'quote.request',
    secondary: ['contact.call', 'nav.goto'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  legal: {
    required: ['booking.create', 'lead.capture'],
    primary: 'booking.create',
    secondary: ['contact.call', 'contact.submit'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },

  // ── Restaurant / hospitality ──────────────────────────────────────────
  restaurant: {
    required: ['booking.create'],
    primary: 'booking.create',
    secondary: ['nav.goto', 'menu.open', 'location.directions'],
    optional: ['contact.call'],
    forbidden: ['cart.checkout', 'donation.start'],
  },
  cafe: {
    required: [],
    primary: 'booking.create',
    secondary: ['menu.open', 'location.directions', 'nav.goto'],
    forbidden: ['donation.start'],
  },
  bakery: {
    required: ['quote.request'],
    primary: 'quote.request',
    secondary: ['menu.open', 'nav.goto'],
    forbidden: ['donation.start'],
  },

  // ── Commerce ──────────────────────────────────────────────────────────
  ecommerce: {
    required: ['cart.add', 'cart.checkout'],
    primary: 'nav.goto', // "Shop Now" lands on shop page
    secondary: ['cart.view', 'favorite.toggle'],
    optional: ['account.open', 'newsletter.subscribe', 'search.open'],
    forbidden: ['booking.create', 'quote.request', 'donation.start'],
  },
  real_estate: {
    required: ['lead.capture'],
    primary: 'nav.goto',
    secondary: ['contact.submit', 'contact.call', 'location.directions'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },

  // ── Creator / agency ──────────────────────────────────────────────────
  creator: {
    required: ['lead.capture'],
    primary: 'nav.goto',
    secondary: ['lead.capture', 'newsletter.subscribe'],
    forbidden: ['donation.start'],
  },
  agency: {
    required: ['quote.request', 'booking.create'],
    primary: 'quote.request',
    secondary: ['booking.create', 'lead.capture'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },

  // ── Nonprofit (donation is REQUIRED here, never elsewhere) ────────────
  nonprofit: {
    required: ['donation.start', 'lead.capture'],
    primary: 'donation.start',
    secondary: ['lead.capture', 'contact.submit', 'newsletter.subscribe'],
    forbidden: ['cart.add', 'cart.checkout', 'quote.request'],
  },

  // ── Generic ───────────────────────────────────────────────────────────
  general: {
    required: ['contact.submit'],
    primary: 'contact.submit',
    secondary: ['nav.goto'],
    forbidden: ['donation.start'],
  },
};

// ============================================================================
// Business-model fallbacks (when no industry overlay matches)
// ============================================================================

const MODEL_PROFILES: Record<BusinessModel, IndustryIntentProfile> = {
  appointment_service: {
    required: ['booking.create'],
    primary: 'booking.create',
    secondary: ['nav.goto', 'contact.submit'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  quote_lead: {
    required: ['quote.request'],
    primary: 'quote.request',
    secondary: ['nav.goto', 'contact.submit'],
    forbidden: ['cart.add', 'cart.checkout', 'donation.start'],
  },
  ecommerce: {
    required: ['cart.add', 'cart.checkout'],
    primary: 'nav.goto',
    secondary: ['cart.view', 'favorite.toggle'],
    forbidden: ['booking.create', 'quote.request', 'donation.start'],
  },
  portfolio_creator: {
    required: ['lead.capture'],
    primary: 'nav.goto',
    secondary: ['lead.capture'],
    forbidden: ['cart.checkout', 'donation.start'],
  },
  restaurant_hospitality: {
    required: ['booking.create'],
    primary: 'booking.create',
    secondary: ['nav.goto', 'menu.open'],
    forbidden: ['donation.start'],
  },
  saas_digital: {
    required: ['auth.register', 'lead.capture'],
    primary: 'auth.register',
    secondary: ['lead.capture', 'nav.goto'],
    forbidden: ['donation.start'],
  },
  nonprofit: {
    required: ['donation.start', 'lead.capture'],
    primary: 'donation.start',
    secondary: ['lead.capture', 'contact.submit'],
    forbidden: ['cart.add', 'cart.checkout', 'quote.request'],
  },
  general: {
    required: ['contact.submit'],
    primary: 'contact.submit',
    secondary: ['nav.goto'],
    forbidden: ['donation.start'],
  },
};

// ============================================================================
// Lookups
// ============================================================================

/**
 * Resolve the active profile for a (model, overlay) pair.
 * Industry overlay wins; falls back to business model.
 */
export function getIntentProfile(
  model: BusinessModel,
  overlay?: IndustryOverlay,
): IndustryIntentProfile {
  if (overlay && INDUSTRY_PROFILES[overlay]) {
    return INDUSTRY_PROFILES[overlay] as IndustryIntentProfile;
  }
  return MODEL_PROFILES[model] || MODEL_PROFILES.general;
}

/** True when the coreIntent is explicitly forbidden for this profile. */
export function isIntentForbidden(
  coreIntent: string,
  profile: IndustryIntentProfile,
): boolean {
  return (profile.forbidden ?? []).includes(coreIntent);
}

/** Return the list of required coreIntents not yet covered. */
export function missingRequiredIntents(
  coveredCoreIntents: Iterable<string>,
  profile: IndustryIntentProfile,
): string[] {
  const covered = new Set(coveredCoreIntents);
  return (profile.required ?? []).filter((ci) => !covered.has(ci));
}

/**
 * IntentBindingRecipe — describes how a profile's intents should be wired
 * to standard slots when the resolver needs to synthesize a missing binding.
 *
 * The resolver consults this when a required intent has no candidate binding
 * (e.g. the user removed the matching template section); used to auto-insert
 * a navbar/hero CTA so publish-readiness can be satisfied deterministically.
 */
export interface IntentBindingRecipe {
  coreIntent: string;
  preferredSection: 'hero' | 'navbar' | 'services' | 'pricing' | 'footer';
  preferredSlot: 'primary-cta' | 'secondary-cta' | 'card-cta';
  targetRef: string;
  uiAction: 'navigate' | 'overlay' | 'state' | 'toast';
}

/** Standard recipes used when synthesizing a fallback binding for a required intent. */
export const FALLBACK_RECIPES: Record<string, IntentBindingRecipe> = {
  'booking.create': {
    coreIntent: 'booking.create',
    preferredSection: 'hero',
    preferredSlot: 'primary-cta',
    targetRef: 'main_booking',
    uiAction: 'overlay',
  },
  'quote.request': {
    coreIntent: 'quote.request',
    preferredSection: 'hero',
    preferredSlot: 'primary-cta',
    targetRef: 'quote_request',
    uiAction: 'overlay',
  },
  'lead.capture': {
    coreIntent: 'lead.capture',
    preferredSection: 'hero',
    preferredSlot: 'secondary-cta',
    targetRef: 'contact',
    uiAction: 'overlay',
  },
  'contact.submit': {
    coreIntent: 'contact.submit',
    preferredSection: 'hero',
    preferredSlot: 'primary-cta',
    targetRef: 'contact',
    uiAction: 'overlay',
  },
  'donation.start': {
    coreIntent: 'donation.start',
    preferredSection: 'hero',
    preferredSlot: 'primary-cta',
    targetRef: 'donation',
    uiAction: 'overlay',
  },
  'cart.add': {
    coreIntent: 'cart.add',
    preferredSection: 'services',
    preferredSlot: 'card-cta',
    targetRef: 'cart',
    uiAction: 'state',
  },
  'cart.checkout': {
    coreIntent: 'cart.checkout',
    preferredSection: 'navbar',
    preferredSlot: 'primary-cta',
    targetRef: 'cart-overlay',
    uiAction: 'overlay',
  },
  'auth.register': {
    coreIntent: 'auth.register',
    preferredSection: 'hero',
    preferredSlot: 'primary-cta',
    targetRef: 'auth-register',
    uiAction: 'overlay',
  },
};
