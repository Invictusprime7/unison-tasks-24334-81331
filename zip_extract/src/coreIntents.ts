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
  'contact.submit',
  'newsletter.subscribe',
  'booking.create',
  'quote.request',
  'lead.capture',
] as const;

// Automation intents - event-driven workflow triggers
export const AUTOMATION_INTENTS = [
  'button.click',     // Generic button automation trigger
  'form.submit',      // Generic form automation trigger  
  'auth.login',       // Auth form submission
  'auth.register',    // Registration form
  'cart.add',         // Add to cart
  'cart.checkout',    // Begin checkout
  'cart.abandoned',   // Cart abandonment (timer-based)
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
