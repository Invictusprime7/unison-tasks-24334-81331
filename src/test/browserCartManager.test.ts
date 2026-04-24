import { beforeEach, describe, expect, it } from 'vitest';
import { createBrowserCartManager, readBrowserCart } from '@/runtime/browserCartManager';

describe('browserCartManager', () => {
  const context = {
    businessId: 'biz_test',
    siteId: 'site_test',
    sessionId: 'session_test',
  };

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('adds items and merges duplicate products', async () => {
    const cart = createBrowserCartManager(context);

    await cart.add({ productId: 'prod_1', name: 'Starter Kit', price: 29, quantity: 1 });
    await cart.add({ productId: 'prod_1', name: 'Starter Kit', price: 29, quantity: 2 });

    const stored = await cart.get();
    expect(stored?.items).toHaveLength(1);
    expect(stored?.items[0].quantity).toBe(3);
    expect(stored?.total).toBe(87);
  });

  it('updates and removes items by product id', async () => {
    const cart = createBrowserCartManager(context);

    await cart.add({ productId: 'prod_1', name: 'Starter Kit', price: 29, quantity: 1 });
    await cart.add({ productId: 'prod_2', name: 'Pro Kit', price: 59, quantity: 1 });
    await cart.update('prod_1', 4);
    await cart.remove('prod_2');

    const stored = readBrowserCart(context);
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0].productId).toBe('prod_1');
    expect(stored.items[0].quantity).toBe(4);
    expect(stored.total).toBe(116);
  });
});
