import type { CoreIntent } from '@/coreIntents';

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
  if (intent === 'cart.add' || intent === 'cart.view') {
    return { kind: 'cart', step: 'cart' };
  }

  if (intent === 'checkout.start' || intent === 'cart.checkout') {
    return { kind: 'cart', step: 'checkout' };
  }

  if (intent === 'pay.checkout' && !hasExplicitCheckoutConfig(payload)) {
    return { kind: 'cart', step: 'checkout' };
  }

  if (hasInlineIntentTarget(intent, inventory)) {
    return { kind: 'inline' };
  }

  const overlayId = resolveDeterministicOverlayId(intent);
  if (overlayId) {
    return { kind: 'overlay', overlayId };
  }

  return { kind: 'none' };
}

export function isDeterministicOverlayIntent(intent: string): intent is CoreIntent {
  return resolveDeterministicOverlayId(intent) !== null;
}
