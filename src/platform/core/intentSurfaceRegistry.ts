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

  // ── Account (universal) ────────────────────────────────────────────────
  'account.open': {
    name: 'account.open',
    namespace: 'account',
    surface: 'overlay',
    overlayId: 'account',
    handler: 'client',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['account.menu', 'profile.open'],
    description: 'Open the account menu; routes to login/register when signed out.',
  },
  'auth.logout': {
    name: 'auth.logout',
    namespace: 'auth',
    surface: 'client',
    handler: 'client',
    capability: 'auth',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['auth.signout', 'auth.sign_out', 'logout'],
    description: 'Sign the current user out.',
  },

  // ── Commerce (store) ───────────────────────────────────────────────────
  'cart.add': {
    name: 'cart.add',
    namespace: 'commerce',
    surface: 'inline',
    handler: 'client',
    capability: 'commerce',
    triggerType: 'user-action',
    status: 'stable',
    description: 'Add a product to the cart.',
  },
  'cart.view': {
    name: 'cart.view',
    namespace: 'commerce',
    surface: 'overlay',
    overlayId: 'cart',
    handler: 'client',
    capability: 'commerce',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['cart.open'],
    description: 'Open the cart drawer.',
  },
  'cart.update': {
    name: 'cart.update',
    namespace: 'commerce',
    surface: 'inline',
    handler: 'client',
    capability: 'commerce',
    triggerType: 'user-action',
    status: 'preview',
    description: 'Update quantity of an item in the cart.',
  },
  'cart.remove': {
    name: 'cart.remove',
    namespace: 'commerce',
    surface: 'inline',
    handler: 'client',
    capability: 'commerce',
    triggerType: 'user-action',
    status: 'preview',
    description: 'Remove an item from the cart.',
  },
  'cart.checkout': {
    name: 'cart.checkout',
    namespace: 'commerce',
    surface: 'redirect',
    handler: 'stripe-checkout',
    capability: 'commerce',
    requiredCapabilities: ['commerce', 'payments'],
    triggerType: 'user-action',
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
    triggerType: 'system-event',
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
    triggerType: 'user-action',
    status: 'stable',
    description: 'Start a payment / subscription checkout.',
  },
  'pay.success': {
    name: 'pay.success',
    namespace: 'commerce',
    surface: 'client',
    handler: 'client',
    capability: 'payments',
    triggerType: 'system-event',
    status: 'stable',
    description: 'Post-checkout success handler.',
  },
  'pay.cancel': {
    name: 'pay.cancel',
    namespace: 'commerce',
    surface: 'client',
    handler: 'client',
    capability: 'payments',
    triggerType: 'system-event',
    status: 'stable',
    description: 'Post-checkout cancellation handler.',
  },
  'product.view': {
    name: 'product.view',
    namespace: 'commerce',
    surface: 'client',
    handler: 'client',
    capability: 'commerce',
    triggerType: 'user-action',
    status: 'preview',
    description: 'Open a product detail view.',
  },
  'favorite.toggle': {
    name: 'favorite.toggle',
    namespace: 'commerce',
    surface: 'inline',
    handler: 'client',
    triggerType: 'user-action',
    status: 'preview',
    aliases: ['product.favorite', 'wishlist.toggle'],
    description: 'Toggle favorite / wishlist on an item.',
  },
  'order.created': {
    name: 'order.created',
    namespace: 'commerce',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'commerce',
    triggerType: 'system-event',
    status: 'preview',
    description: 'Order placed automation trigger.',
  },
  'order.shipped': {
    name: 'order.shipped',
    namespace: 'commerce',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'commerce',
    triggerType: 'workflow-event',
    status: 'preview',
    description: 'Order shipped automation trigger.',
  },
  'order.delivered': {
    name: 'order.delivered',
    namespace: 'commerce',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'commerce',
    triggerType: 'workflow-event',
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
    triggerType: 'user-action',
    status: 'stable',
    aliases: [
      'reservation.submit',
      'booking.book',
      'booking.start',
      'calendar.open',
      'reservation.create',
    ],
    description: 'Open the booking flow.',
  },
  'booking.reschedule': {
    name: 'booking.reschedule',
    namespace: 'booking',
    surface: 'overlay',
    overlayId: 'booking',
    handler: 'intent-exec',
    capability: 'booking',
    triggerType: 'user-action',
    status: 'preview',
    description: 'Reschedule an existing booking.',
  },
  'booking.cancel': {
    name: 'booking.cancel',
    namespace: 'booking',
    surface: 'inline',
    handler: 'intent-exec',
    capability: 'booking',
    triggerType: 'user-action',
    status: 'preview',
    description: 'Cancel an existing booking.',
  },
  'booking.confirmed': {
    name: 'booking.confirmed',
    namespace: 'booking',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'booking',
    triggerType: 'system-event',
    status: 'preview',
    description: 'Booking confirmation automation trigger.',
  },
  'booking.reminder': {
    name: 'booking.reminder',
    namespace: 'booking',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'booking',
    triggerType: 'workflow-event',
    status: 'preview',
    description: 'Reminder automation trigger.',
  },
  'booking.cancelled': {
    name: 'booking.cancelled',
    namespace: 'booking',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'booking',
    triggerType: 'system-event',
    status: 'preview',
    description: 'Booking cancellation automation trigger.',
  },
  'booking.noshow': {
    name: 'booking.noshow',
    namespace: 'booking',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'booking',
    triggerType: 'workflow-event',
    status: 'preview',
    description: 'No-show automation trigger.',
  },

  // ── Lead (sales / pipeline) ────────────────────────────────────────────
  'lead.capture': {
    name: 'lead.capture',
    namespace: 'lead',
    surface: 'overlay',
    overlayId: 'lead',
    handler: 'intent-exec',
    capability: 'lead-capture',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['demo.request', 'consultation.request'],
    description: 'Capture a lead via overlay form (also covers demo / consultation requests).',
  },
  'quote.request': {
    name: 'quote.request',
    namespace: 'lead',
    surface: 'overlay',
    overlayId: 'quote',
    handler: 'intent-exec',
    capability: 'quoting',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['proposal.request', 'estimate.request'],
    description: 'Request a quote / estimate / proposal.',
  },
  'deal.won': {
    name: 'deal.won',
    namespace: 'lead',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'lead-capture',
    triggerType: 'system-event',
    status: 'preview',
    description: 'Deal-won automation trigger.',
  },
  'deal.lost': {
    name: 'deal.lost',
    namespace: 'lead',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'lead-capture',
    triggerType: 'system-event',
    status: 'preview',
    description: 'Deal-lost automation trigger.',
  },
  'proposal.sent': {
    name: 'proposal.sent',
    namespace: 'lead',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'lead-capture',
    triggerType: 'workflow-event',
    status: 'preview',
    description: 'Proposal-sent automation trigger.',
  },
  'job.completed': {
    name: 'job.completed',
    namespace: 'lead',
    surface: 'client',
    handler: 'workflow-trigger',
    capability: 'lead-capture',
    triggerType: 'system-event',
    status: 'preview',
    description: 'Job-completed automation trigger.',
  },

  // ── Contact (local business — universal) ───────────────────────────────
  'contact.submit': {
    name: 'contact.submit',
    namespace: 'contact',
    surface: 'overlay',
    overlayId: 'contact',
    handler: 'intent-exec',
    capability: 'contact',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['form.open', 'popup.open', 'inquiry.submit'],
    description: 'Submit the contact form / open contact overlay.',
  },
  'contact.call': {
    name: 'contact.call',
    namespace: 'contact',
    surface: 'redirect',
    handler: 'client',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['phone.call', 'click.call'],
    description: 'Initiate a phone call via tel: redirect.',
  },
  'contact.email': {
    name: 'contact.email',
    namespace: 'contact',
    surface: 'redirect',
    handler: 'client',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['mailto.open'],
    description: 'Open the user\'s email client via mailto: redirect.',
  },
  'contact.sms': {
    name: 'contact.sms',
    namespace: 'contact',
    surface: 'redirect',
    handler: 'client',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['sms.send', 'text.us'],
    description: 'Start an SMS via sms: redirect.',
  },
  'location.directions': {
    name: 'location.directions',
    namespace: 'contact',
    surface: 'redirect',
    handler: 'client',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['map.open', 'directions.open'],
    description: 'Open external map / directions to the business.',
  },

  // ── Content / Marketing (universal) ────────────────────────────────────
  'newsletter.subscribe': {
    name: 'newsletter.subscribe',
    namespace: 'content',
    surface: 'overlay',
    overlayId: 'newsletter',
    handler: 'intent-exec',
    capability: 'newsletter',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['waitlist.join', 'subscribe'],
    description: 'Subscribe to a newsletter / waitlist.',
  },
  'content.download': {
    name: 'content.download',
    namespace: 'content',
    surface: 'inline',
    handler: 'intent-exec',
    capability: 'lead-capture',
    triggerType: 'user-action',
    status: 'preview',
    aliases: ['lead-magnet.download', 'asset.download'],
    description: 'Download a lead magnet / gated asset (captures lead).',
  },
  'coupon.claim': {
    name: 'coupon.claim',
    namespace: 'content',
    surface: 'overlay',
    overlayId: 'newsletter',
    handler: 'intent-exec',
    capability: 'newsletter',
    triggerType: 'user-action',
    status: 'preview',
    aliases: ['promo.claim', 'discount.claim'],
    description: 'Claim a promo / discount code (captures email).',
  },

  // ── Donation / Nonprofit ───────────────────────────────────────────────
  'donation.start': {
    name: 'donation.start',
    namespace: 'commerce',
    surface: 'redirect',
    overlayId: 'donation',
    handler: 'stripe-checkout',
    capability: 'donation',
    requiredCapabilities: ['donation', 'payments'],
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['donate.start', 'donate.now'],
    description: 'Begin a donation checkout flow.',
  },
  'volunteer.signup': {
    name: 'volunteer.signup',
    namespace: 'lead',
    surface: 'overlay',
    overlayId: 'lead',
    handler: 'intent-exec',
    capability: 'lead-capture',
    triggerType: 'user-action',
    status: 'preview',
    description: 'Sign up to volunteer (nonprofit).',
  },

  // ── UI behavior (client-only, no backend) ──────────────────────────────
  'menu.open': {
    name: 'menu.open',
    namespace: 'ui',
    surface: 'overlay',
    overlayId: 'menu',
    handler: 'client',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['nav.menu', 'drawer.open', 'hamburger.open'],
    description: 'Open the mobile navigation drawer.',
  },
  'search.open': {
    name: 'search.open',
    namespace: 'ui',
    surface: 'overlay',
    overlayId: 'search',
    handler: 'client',
    triggerType: 'user-action',
    status: 'stable',
    aliases: ['search.toggle'],
    description: 'Open the search overlay / input.',
  },
  'filter.open': {
    name: 'filter.open',
    namespace: 'ui',
    surface: 'overlay',
    overlayId: 'filter',
    handler: 'client',
    triggerType: 'user-action',
    status: 'preview',
    description: 'Open the filter panel.',
  },
  'sort.open': {
    name: 'sort.open',
    namespace: 'ui',
    surface: 'overlay',
    overlayId: 'sort',
    handler: 'client',
    triggerType: 'user-action',
    status: 'preview',
    description: 'Open the sort dropdown.',
  },
  'share.open': {
    name: 'share.open',
    namespace: 'ui',
    surface: 'overlay',
    overlayId: 'share',
    handler: 'client',
    triggerType: 'user-action',
    status: 'preview',
    description: 'Open the share sheet.',
  },
  'chat.open': {
    name: 'chat.open',
    namespace: 'ui',
    surface: 'overlay',
    overlayId: 'chat',
    handler: 'client',
    triggerType: 'user-action',
    status: 'preview',
    aliases: ['support.open', 'livechat.open'],
    description: 'Open the chat / support widget.',
  },

  // ── Utility automation triggers (generic) ──────────────────────────────
  'button.click': {
    name: 'button.click',
    namespace: 'utility',
    surface: 'client',
    handler: 'workflow-trigger',
    triggerType: 'user-action',
    status: 'stable',
    description: 'Generic button click automation trigger.',
  },
  'form.submit': {
    name: 'form.submit',
    namespace: 'utility',
    surface: 'client',
    handler: 'workflow-trigger',
    triggerType: 'user-action',
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

/** All intents safe to auto-bind to interactive UI elements (defaults to user-action). */
export function userActionIntents(): IntentDef[] {
  return Object.values(INTENT_REGISTRY).filter(
    (d) => (d.triggerType ?? 'user-action') === 'user-action' && d.status !== 'deprecated',
  );
}

/** Returns true when the intent is bindable to a UI element (not a lifecycle event). */
export function isUserActionIntent(input: string): boolean {
  const def = getIntentDef(input);
  if (!def) return false;
  return (def.triggerType ?? 'user-action') === 'user-action';
}

/** All capabilities (incl. requiredCapabilities) needed by this intent. */
export function getIntentCapabilities(input: string): string[] {
  const def = getIntentDef(input);
  if (!def) return [];
  const out = new Set<string>();
  if (def.capability) out.add(def.capability);
  for (const cap of def.requiredCapabilities ?? []) out.add(cap);
  return Array.from(out);
}

// Convenience alias — lets consumers spell the import as the namespace name.
export { INTENT_REGISTRY as intentSurfaceRegistry };
