/**
 * intentSurfaceRegistry — canonical home for the Unison intent registry.
 *
 * Single source of truth for every intent the platform recognizes.
 * Every guard (CoreIntent surface, TemplateIntentButton, deterministicIntentUi,
 * aiBindingTool, publish gate) reads from this file.
 *
 * Adding a new intent: append an IntentDef here, optionally extend an alias.
 * Do NOT add to any other guard — they all read this map.
 */
export type IntentNamespace =
  | 'nav'
  | 'commerce'
  | 'booking'
  | 'auth'
  | 'account'
  | 'lead'
  | 'contact'
  | 'content'
  | 'ui'
  | 'utility'
  | 'automation';

export type IntentSurface = 'inline' | 'overlay' | 'redirect' | 'client';

export type IntentHandler =
  | 'client'              // Pure client-side (nav, scroll, open drawer)
  | 'intent-exec'         // Generic backend executor edge fn
  | 'workflow-trigger'    // Triggers a configured automation workflow
  | 'stripe-checkout'     // Creates checkout session, redirects
  | 'auth-overlay'        // Opens local auth overlay
  | 'webhook';            // User-defined webhook (custom integrations)

export type IntentStatus = 'stable' | 'preview' | 'deprecated';

/**
 * Who/what triggers this intent.
 * - user-action: bound to UI elements (buttons, links, icons) by the Wizard
 * - system-event: emitted by the platform after a state change (order.created etc.)
 * - workflow-event: emitted by automation pipelines (booking.reminder etc.)
 *
 * Wizard auto-binding MUST only emit user-action intents on interactive elements.
 */
export type IntentTriggerType = 'user-action' | 'system-event' | 'workflow-event';

export interface IntentDef {
  /** Canonical name, dot-namespaced (e.g. "commerce.cart.add") */
  name: string;
  namespace: IntentNamespace;
  /** Where the user sees the result */
  surface: IntentSurface;
  /** Optional overlay component id when surface === 'overlay' */
  overlayId?:
    | 'auth-login'
    | 'auth-register'
    | 'booking'
    | 'contact'
    | 'quote'
    | 'newsletter'
    | 'checkout'
    | 'donation'
    | 'lead'
    | 'search'
    | 'menu'
    | 'cart'
    | 'account'
    | 'share'
    | 'chat'
    | 'filter'
    | 'sort';
  handler: IntentHandler;
  /**
   * Single capability this intent needs to be publish-ready.
   * Values should map to a CapabilityId in capabilityRegistry.ts.
   */
  capability?: string;
  /** Additional capabilities required (e.g. donation → ['donation','payments']). */
  requiredCapabilities?: string[];
  /** Default: 'user-action'. Lifecycle/workflow intents must be tagged. */
  triggerType?: IntentTriggerType;
  status: IntentStatus;
  /** Legacy intent names that resolve to this one */
  aliases?: string[];
  /** Human-readable summary surfaced in the binding inspector */
  description: string;
}

// ============================================================================
// Registry — every recognized intent
// ============================================================================

export const INTENT_REGISTRY: Record<string, IntentDef> = {
  // ── Navigation (universal, client-only) ────────────────────────────────
  'nav.goto': {
    name: 'nav.goto',
    namespace: 'nav',
    surface: 'client',
    handler: 'client',
    status: 'stable',
    description: 'Navigate to an internal route via HashRouter.',
  },
  'nav.external': {
    name: 'nav.external',
    namespace: 'nav',
    surface: 'client',
    handler: 'client',
    status: 'stable',
    description: 'Open an external URL in a new tab.',
  },
  'nav.anchor': {
    name: 'nav.anchor',
    namespace: 'nav',
    surface: 'client',
    handler: 'client',
    status: 'stable',
    description: 'Smooth-scroll to an in-page anchor.',
  },

  // ── Auth ───────────────────────────────────────────────────────────────
  'auth.login': {
    name: 'auth.login',
    namespace: 'auth',
    surface: 'overlay',
    overlayId: 'auth-login',
    handler: 'auth-overlay',
    capability: 'auth',
    status: 'stable',
    aliases: ['auth.signin', 'auth.sign_in', 'login'],
    description: 'Open the sign-in overlay.',
  },
  'auth.register': {
    name: 'auth.register',
    namespace: 'auth',
    surface: 'overlay',
    overlayId: 'auth-register',
    handler: 'auth-overlay',
    capability: 'auth',
    status: 'stable',
    aliases: ['auth.signup', 'auth.sign_up', 'signup', 'register'],
    description: 'Open the registration overlay.',
  },

  // ── Commerce (store) ───────────────────────────────────────────────────
  'cart.add': {
    name: 'cart.add',
    namespace: 'commerce',
    surface: 'inline',
    handler: 'client',
    capability: 'commerce',
    status: 'stable',
    description: 'Add a product to the cart.',
  },
  'cart.view': {
    name: 'cart.view',
    namespace: 'commerce',
    surface: 'overlay',
    handler: 'client',
    capability: 'commerce',
    status: 'stable',
    description: 'Open the cart drawer.',
  },
  'cart.checkout': {
    name: 'cart.checkout',
    namespace: 'commerce',
    surface: 'redirect',
    handler: 'stripe-checkout',
    capability: 'commerce',
    status: 'stable',
    aliases: ['checkout.start'],
    description: 'Begin checkout from the current cart.',
  },
  'cart.abandoned': {
    name: 'cart.abandoned',
    namespace: 'commerce',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'commerce',
    status: 'preview',
    description: 'Timer-based cart abandonment automation trigger.',
  },
  'pay.checkout': {
    name: 'pay.checkout',
    namespace: 'commerce',
    surface: 'redirect',
    overlayId: 'checkout',
    handler: 'stripe-checkout',
    capability: 'payments',
    status: 'stable',
    description: 'Start a payment / subscription checkout.',
  },
  'pay.success': {
    name: 'pay.success',
    namespace: 'commerce',
    surface: 'client',
    handler: 'client',
    capability: 'payments',
    status: 'stable',
    description: 'Post-checkout success handler.',
  },
  'pay.cancel': {
    name: 'pay.cancel',
    namespace: 'commerce',
    surface: 'client',
    handler: 'client',
    capability: 'payments',
    status: 'stable',
    description: 'Post-checkout cancellation handler.',
  },
  'product.view': {
    name: 'product.view',
    namespace: 'commerce',
    surface: 'client',
    handler: 'client',
    capability: 'commerce',
    status: 'preview',
    description: 'Open a product detail view.',
  },
  'order.created': {
    name: 'order.created',
    namespace: 'commerce',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'commerce',
    status: 'preview',
    description: 'Order placed automation trigger.',
  },
  'order.shipped': {
    name: 'order.shipped',
    namespace: 'commerce',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'commerce',
    status: 'preview',
    description: 'Order shipped automation trigger.',
  },
  'order.delivered': {
    name: 'order.delivered',
    namespace: 'commerce',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'commerce',
    status: 'preview',
    description: 'Order delivered automation trigger.',
  },

  // ── Booking ────────────────────────────────────────────────────────────
  'booking.create': {
    name: 'booking.create',
    namespace: 'booking',
    surface: 'overlay',
    overlayId: 'booking',
    handler: 'intent-exec',
    capability: 'booking',
    status: 'stable',
    aliases: ['reservation.submit', 'booking.book', 'booking.start'],
    description: 'Open the booking flow.',
  },
  'booking.confirmed': {
    name: 'booking.confirmed',
    namespace: 'booking',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'booking',
    status: 'preview',
    description: 'Booking confirmation automation trigger.',
  },
  'booking.reminder': {
    name: 'booking.reminder',
    namespace: 'booking',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'booking',
    status: 'preview',
    description: 'Reminder automation trigger.',
  },
  'booking.cancelled': {
    name: 'booking.cancelled',
    namespace: 'booking',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'booking',
    status: 'preview',
    description: 'Booking cancellation automation trigger.',
  },
  'booking.noshow': {
    name: 'booking.noshow',
    namespace: 'booking',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'booking',
    status: 'preview',
    description: 'No-show automation trigger.',
  },

  // ── Lead (agency / portfolio / contact-driven flows) ───────────────────
  'lead.capture': {
    name: 'lead.capture',
    namespace: 'lead',
    surface: 'overlay',
    overlayId: 'contact',
    handler: 'intent-exec',
    capability: 'crm',
    status: 'stable',
    description: 'Capture a lead via overlay form.',
  },
  'contact.submit': {
    name: 'contact.submit',
    namespace: 'lead',
    surface: 'overlay',
    overlayId: 'contact',
    handler: 'intent-exec',
    capability: 'crm',
    status: 'stable',
    description: 'Submit the contact form.',
  },
  'quote.request': {
    name: 'quote.request',
    namespace: 'lead',
    surface: 'overlay',
    overlayId: 'quote',
    handler: 'intent-exec',
    capability: 'crm',
    status: 'stable',
    description: 'Request a quote / estimate.',
  },
  'deal.won': {
    name: 'deal.won',
    namespace: 'lead',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'crm',
    status: 'preview',
    description: 'Deal-won automation trigger.',
  },
  'deal.lost': {
    name: 'deal.lost',
    namespace: 'lead',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'crm',
    status: 'preview',
    description: 'Deal-lost automation trigger.',
  },
  'proposal.sent': {
    name: 'proposal.sent',
    namespace: 'lead',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'crm',
    status: 'preview',
    description: 'Proposal-sent automation trigger.',
  },
  'job.completed': {
    name: 'job.completed',
    namespace: 'lead',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'crm',
    status: 'preview',
    description: 'Job-completed automation trigger.',
  },

  // ── Content (universal) ────────────────────────────────────────────────
  'newsletter.subscribe': {
    name: 'newsletter.subscribe',
    namespace: 'content',
    surface: 'overlay',
    overlayId: 'newsletter',
    handler: 'intent-exec',
    capability: 'marketing',
    status: 'stable',
    aliases: ['waitlist.join'],
    description: 'Subscribe to a newsletter / waitlist.',
  },

  // ── Utility automation triggers (generic) ──────────────────────────────
  'button.click': {
    name: 'button.click',
    namespace: 'utility',
    surface: 'client',
    handler: 'workflow-trigger',
    status: 'stable',
    description: 'Generic button click automation trigger.',
  },
  'form.submit': {
    name: 'form.submit',
    namespace: 'utility',
    surface: 'client',
    handler: 'workflow-trigger',
    status: 'stable',
    description: 'Generic form submit automation trigger.',
  },
};

// ============================================================================
// Alias lookup — flatten every alias into a single resolver map
// ============================================================================

const ALIAS_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const def of Object.values(INTENT_REGISTRY)) {
    map[def.name.toLowerCase()] = def.name;
    for (const alias of def.aliases ?? []) {
      map[alias.toLowerCase()] = def.name;
    }
  }
  return map;
})();

/** Resolve any intent string (canonical or legacy alias) to its canonical name, or null. */
export function resolveIntentName(input: string): string | null {
  if (!input) return null;
  return ALIAS_MAP[input.toLowerCase()] ?? null;
}

/** True when input maps to any registered intent (alias-aware, case-insensitive). */
export function isRegisteredIntent(input: string): boolean {
  return resolveIntentName(input) !== null;
}

/** Look up the canonical IntentDef by name or alias. */
export function getIntentDef(input: string): IntentDef | null {
  const canonical = resolveIntentName(input);
  return canonical ? INTENT_REGISTRY[canonical] : null;
}

/** All canonical intent names in registry order. */
export function allIntentNames(): string[] {
  return Object.keys(INTENT_REGISTRY);
}

/** Names that should appear in the CoreIntent enum (status !== deprecated). */
export function activeIntentNames(): string[] {
  return Object.values(INTENT_REGISTRY)
    .filter((d) => d.status !== 'deprecated')
    .map((d) => d.name);
}

/** Intent names filtered by namespace. */
export function intentsByNamespace(ns: IntentNamespace): IntentDef[] {
  return Object.values(INTENT_REGISTRY).filter((d) => d.namespace === ns);
}

// Convenience alias — lets consumers spell the import as the namespace name.
export { INTENT_REGISTRY as intentSurfaceRegistry };
