import type { CoreIntent } from '@/platform/core/coreIntents';

export interface PreviewIntentInventory {
  sectionIntents: string[];
  presentIds: string[];
  formIntents: string[];
  navHrefs: string[];
}

export type DeterministicOverlayId =
  | 'auth-login'
  | 'auth-register'
  | 'booking'
  | 'contact'
  | 'quote'
  | 'newsletter'
  | 'checkout';

export type DeterministicIntentSurface =
  | { kind: 'inline' }
  | { kind: 'overlay'; overlayId: DeterministicOverlayId }
  | { kind: 'cart'; step: 'cart' | 'checkout' }
  | { kind: 'none' };

interface InlineTargetDef {
  matchIntents: string[];
  matchIds: string[];
}

const INLINE_TARGETS: Partial<Record<string, InlineTargetDef>> = {
  'booking.create': {
    matchIntents: ['booking.create'],
    matchIds: ['booking', 'book', 'reservation', 'schedule', 'reserve'],
  },
  'contact.submit': {
    matchIntents: ['contact.submit'],
    matchIds: ['contact', 'contact-form', 'get-in-touch', 'reach-out'],
  },
  'newsletter.subscribe': {
    matchIntents: ['newsletter.subscribe'],
    matchIds: ['newsletter', 'subscribe', 'waitlist'],
  },
  'quote.request': {
    matchIntents: ['quote.request'],
    matchIds: ['quote', 'estimate', 'get-a-quote'],
  },
  'lead.capture': {
    matchIntents: ['lead.capture', 'contact.submit'],
    matchIds: ['lead', 'contact', 'contact-form'],
  },
  'auth.login': {
    matchIntents: ['auth.login'],
    matchIds: ['login', 'auth', 'signin', 'sign-in'],
  },
  'auth.register': {
    matchIntents: ['auth.register'],
    matchIds: ['register', 'signup', 'sign-up', 'auth'],
  },
  'pay.checkout': {
    matchIntents: ['pay.checkout', 'cart.checkout'],
    matchIds: ['pricing', 'plans', 'checkout', 'subscribe'],
  },
};

export function hasExplicitCheckoutConfig(payload?: Record<string, unknown>): boolean {
  return typeof payload?.priceId === 'string' || typeof payload?.plan === 'string';
}

export function hasInlineIntentTarget(
  intent: string,
  inventory: PreviewIntentInventory | null | undefined,
): boolean {
  const target = INLINE_TARGETS[intent];
  if (!target || !inventory) return false;

  return target.matchIntents.some((matchIntent) =>
    inventory.formIntents.includes(matchIntent) || inventory.sectionIntents.includes(matchIntent),
  ) || target.matchIds.some((matchId) => inventory.presentIds.includes(matchId));
}

export function resolveDeterministicOverlayId(
  intent: string,
): DeterministicOverlayId | null {
  switch (intent) {
    case 'booking.create':
      return 'booking';
    case 'contact.submit':
    case 'lead.capture':
      return 'contact';
    case 'quote.request':
      return 'quote';
    case 'newsletter.subscribe':
      return 'newsletter';
    case 'auth.login':
      return 'auth-login';
    case 'auth.register':
      return 'auth-register';
    case 'pay.checkout':
      return 'checkout';
    default:
      return null;
  }
}

export function resolveDeterministicIntentSurface(
  intent: string,
  payload?: Record<string, unknown>,
  inventory?: PreviewIntentInventory | null,
): DeterministicIntentSurface {
  // Cart-class intents → open the cart sheet at the right step so
  // AI-generated "Add to cart" / "View cart" / "Checkout" buttons fire.
  if (intent === 'cart.add' || intent === 'cart.view') {
    return { kind: 'cart', step: 'cart' };
  }
  if (intent === 'cart.checkout') {
    return { kind: 'cart', step: 'checkout' };
  }

  // If the matching form/section already lives on this page, prefer
  // smooth-scrolling to it over opening an overlay.
  if (hasInlineIntentTarget(intent, inventory)) {
    return { kind: 'inline' };
  }

  // Otherwise fall back to the deterministic overlay (booking, contact,
  // quote, newsletter, auth, checkout) so AI-generated CTAs actually fire
  // on click instead of silently acknowledging.
  const overlayId = resolveDeterministicOverlayId(intent);
  if (overlayId) {
    // pay.checkout only auto-opens checkout when a concrete plan/price
    // was supplied via data-ut-* attributes; otherwise stay inert and let
    // the resolver scroll/navigate to a pricing surface.
    if (intent === 'pay.checkout' && !hasExplicitCheckoutConfig(payload)) {
      return { kind: 'none' };
    }
    return { kind: 'overlay', overlayId };
  }

  return { kind: 'none' };
}

export function isDeterministicOverlayIntent(intent: string): intent is CoreIntent {
  return resolveDeterministicOverlayId(intent) !== null;
}
