import { describe, expect, it } from 'vitest';

import {
  hasInlineIntentTarget,
  resolveDeterministicIntentSurface,
  type PreviewIntentInventory,
} from '@/runtime/deterministicIntentUi';
import { buildRoutePolicy } from '@/contracts/routePolicy';
import { resolvePreviewAction } from '@/utils/previewActionResolver';

const emptyInventory: PreviewIntentInventory = {
  sectionIntents: [],
  presentIds: [],
  formIntents: [],
  navHrefs: [],
};

describe('deterministicIntentUi', () => {
  it('prefers inline handling when a matching form already exists', () => {
    const inventory: PreviewIntentInventory = {
      ...emptyInventory,
      formIntents: ['contact.submit'],
      presentIds: ['contact'],
    };

    expect(hasInlineIntentTarget('contact.submit', inventory)).toBe(true);
    expect(resolveDeterministicIntentSurface('contact.submit', {}, inventory)).toEqual({ kind: 'inline' });
  });

  it('falls back to canonical overlays for form-driven intents without inline targets', () => {
    expect(resolveDeterministicIntentSurface('quote.request', {}, emptyInventory)).toEqual({
      kind: 'overlay',
      overlayId: 'quote',
    });
    expect(resolveDeterministicIntentSurface('newsletter.subscribe', {}, emptyInventory)).toEqual({
      kind: 'overlay',
      overlayId: 'newsletter',
    });
  });

  it('routes generic checkout buttons through the cart drawer', () => {
    expect(resolveDeterministicIntentSurface('checkout.start', {}, emptyInventory)).toEqual({
      kind: 'cart',
      step: 'checkout',
    });
    expect(resolveDeterministicIntentSurface('pay.checkout', {}, emptyInventory)).toEqual({
      kind: 'cart',
      step: 'checkout',
    });
  });

  it('keeps explicit subscription or plan checkout on the canonical checkout surface', () => {
    expect(resolveDeterministicIntentSurface('pay.checkout', { plan: 'starter' }, emptyInventory)).toEqual({
      kind: 'overlay',
      overlayId: 'checkout',
    });
  });
});

describe('resolvePreviewAction', () => {
  const neutralClassification = {
    category: 'general',
    suggestedPageType: null,
  } as const;

  it('scrolls to existing inline targets before opening overlays', () => {
    const inventory: PreviewIntentInventory = {
      ...emptyInventory,
      formIntents: ['contact.submit'],
      presentIds: ['contact'],
    };

    expect(resolvePreviewAction(
      'contact.submit',
      'Contact Us',
      inventory,
      {},
      neutralClassification as never,
      false,
      {},
    )).toEqual({
      action: 'scroll',
      command: 'contact.scroll',
    });
  });

  it('opens canonical overlay fallback when no inline target exists', () => {
    expect(resolvePreviewAction(
      'contact.submit',
      'Contact Us',
      emptyInventory,
      {},
      neutralClassification as never,
      false,
      {},
    )).toEqual({
      action: 'overlay',
      overlayId: 'contact',
    });
  });

  it('uses the cart drawer for checkout-intent fallbacks', () => {
    expect(resolvePreviewAction(
      'pay.checkout',
      'Checkout',
      emptyInventory,
      {},
      neutralClassification as never,
      false,
      {},
    )).toEqual({
      action: 'cart',
      step: 'checkout',
    });
  });
});

describe('buildRoutePolicy', () => {
  it('maps commerce checkout intents to the single canonical checkout route', () => {
    const policy = buildRoutePolicy(
      [{ path: '/', title: 'Home' } as never],
      ['commerce'],
    );

    expect(policy.ctaRouteMap['cart.checkout']).toBe('/checkout');
    expect(policy.ctaRouteMap['pay.checkout']).toBe('/checkout');
    expect(policy.overlayRoutes).toContain('/checkout');
  });
});
