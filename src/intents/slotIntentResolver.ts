/**
 * Slot Intent Resolver
 *
 * Deterministically maps (systemType, sectionVariant, buttonLabel, placement)
 * to a canonical intent name from INTENT_REGISTRY. No LLM, no IO.
 *
 * Called from:
 *  - jsxTemplates.renderButtons() — stamps data-ut-intent at generation time
 *  - persistGeneratedBindings — fallback when scanned TSX has no explicit intent
 */
import { getIntentDef, resolveIntentName } from './registry';

export type LauncherSystemType =
  | 'booking'
  | 'store'
  | 'content'
  | 'agency'
  | 'portfolio'
  | 'saas'
  | string;

export type SectionKind =
  | 'hero'
  | 'navbar'
  | 'footer'
  | 'cta'
  | 'pricing'
  | 'services'
  | 'features'
  | 'contact'
  | 'newsletter'
  | 'faq'
  | 'gallery'
  | 'team'
  | 'product'
  | 'unknown';

export type SlotPlacement = 'primary' | 'secondary' | 'nav' | 'footer' | 'card';

export interface SlotContext {
  systemType: LauncherSystemType;
  section: SectionKind;
  placement: SlotPlacement;
  label?: string;
}

const COMMERCE_LABEL_RE = /\b(buy|shop|add to cart|purchase|order now)\b/i;
const CART_LABEL_RE = /\b(cart|basket|bag)\b/i;
const CHECKOUT_LABEL_RE = /\b(checkout|pay|subscribe)\b/i;
const BOOK_LABEL_RE = /\b(book|reserve|schedule|appointment)\b/i;
const QUOTE_LABEL_RE = /\b(quote|estimate)\b/i;
const NEWSLETTER_LABEL_RE = /\b(subscribe|newsletter|join.*list|waitlist)\b/i;
const CONTACT_LABEL_RE = /\b(contact|message|get in touch|reach)\b/i;
const SIGNIN_LABEL_RE = /\b(sign\s*in|log\s*in|login)\b/i;
const SIGNUP_LABEL_RE = /\b(sign\s*up|register|get started|start free|try free|create account)\b/i;

/**
 * Pure deterministic resolver. Same input → same output, always.
 * Returns a canonical intent name from INTENT_REGISTRY, never null —
 * fallback is `contact.submit` (the safest "get in touch" surface).
 */
export function resolveIntentForSlot(ctx: SlotContext): string {
  const label = (ctx.label || '').trim();

  // 1. Label-driven rules (highest priority — author intent is explicit).
  if (label) {
    if (NEWSLETTER_LABEL_RE.test(label)) return 'newsletter.subscribe';
    if (BOOK_LABEL_RE.test(label)) return 'booking.create';
    if (QUOTE_LABEL_RE.test(label)) return 'quote.request';
    if (SIGNIN_LABEL_RE.test(label)) return 'auth.login';
    if (SIGNUP_LABEL_RE.test(label)) return 'auth.register';
    if (CART_LABEL_RE.test(label) && !COMMERCE_LABEL_RE.test(label)) return 'cart.view';
    if (COMMERCE_LABEL_RE.test(label)) return 'cart.add';
    if (CHECKOUT_LABEL_RE.test(label)) return 'cart.checkout';
    if (CONTACT_LABEL_RE.test(label)) return 'contact.submit';
  }

  // 2. Section + placement + systemType rules.
  switch (ctx.section) {
    case 'navbar': {
      if (ctx.systemType === 'saas') return 'auth.register';
      if (ctx.systemType === 'store') return 'cart.view';
      if (ctx.systemType === 'booking') return 'booking.create';
      return 'contact.submit';
    }
    case 'hero': {
      if (ctx.placement === 'secondary') return 'nav.anchor';
      if (ctx.systemType === 'booking') return 'booking.create';
      if (ctx.systemType === 'store') return 'cart.add';
      if (ctx.systemType === 'saas') return 'auth.register';
      if (ctx.systemType === 'agency' || ctx.systemType === 'portfolio') return 'lead.capture';
      return 'contact.submit';
    }
    case 'pricing': {
      return ctx.systemType === 'store' ? 'cart.checkout' : 'pay.checkout';
    }
    case 'cta': {
      if (ctx.systemType === 'store') return 'cart.add';
      if (ctx.systemType === 'booking') return 'booking.create';
      if (ctx.systemType === 'saas') return 'auth.register';
      return 'contact.submit';
    }
    case 'services':
      return ctx.systemType === 'booking' ? 'booking.create' : 'quote.request';
    case 'product':
      return 'cart.add';
    case 'contact':
      return 'contact.submit';
    case 'newsletter':
      return 'newsletter.subscribe';
    case 'footer':
      return ctx.placement === 'nav' ? 'nav.goto' : 'newsletter.subscribe';
    case 'faq':
    case 'features':
    case 'gallery':
    case 'team':
    case 'unknown':
    default:
      return 'contact.submit';
  }
}

/**
 * Resolve and assert the intent is registered. Returns null if the resolver
 * produced an unregistered intent (defensive — should be impossible).
 */
export function resolveAndValidateIntent(ctx: SlotContext): string | null {
  const name = resolveIntentForSlot(ctx);
  const canonical = resolveIntentName(name);
  if (!canonical) return null;
  return getIntentDef(canonical) ? canonical : null;
}
