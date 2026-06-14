/**
 * E-commerce UI Intent Profile.
 * Cart + checkout + product browsing utilities are the core surfaces.
 */
import type { UIIntentProfile } from '../uiIntentProfile';

export const ECOMMERCE_UI_INTENT_PROFILE: UIIntentProfile = {
  industry: 'ecommerce',
  intents: {
    'cart.add': {
      placements: [
        { pageRole: 'shop', section: 'shop-grid', slot: 'card-cta',
          affordance: 'card-cta', variant: 'primary',
          icon: ['ShoppingCart', 'Plus'],
          labelOptions: ['Add to Cart', 'Add to Bag', 'Buy Now'],
          required: true, ifPageExists: true },
        { pageRole: 'home', section: 'services', slot: 'card-cta',
          affordance: 'card-cta', variant: 'primary',
          icon: ['ShoppingCart'],
          labelOptions: ['Add to Cart', 'Shop Now'],
          required: false },
      ],
    },
    'cart.view': {
      placements: [
        { pageRole: '*', section: 'navbar', slot: 'cart-trigger',
          affordance: 'icon-button', variant: 'ghost', size: 'md',
          icon: ['ShoppingCart', 'ShoppingBag'],
          labelOptions: ['Cart', 'Bag'],
          required: true },
      ],
    },
    'cart.checkout': {
      placements: [
        { pageRole: 'checkout', section: 'cart', slot: 'checkout-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['CreditCard', 'Lock'],
          labelOptions: ['Checkout', 'Proceed to Checkout', 'Complete Order'],
          required: true, ifPageExists: true },
      ],
    },
    'search.open': {
      placements: [
        { pageRole: '*', section: 'navbar', slot: 'icon-search',
          affordance: 'icon-button', variant: 'ghost', size: 'md',
          icon: ['Search'],
          labelOptions: ['Search'],
          required: false },
      ],
    },
    'favorite.toggle': {
      placements: [
        { pageRole: 'shop', section: 'shop-grid', slot: 'icon-favorite',
          affordance: 'icon-button', variant: 'ghost', size: 'sm',
          icon: ['Heart'],
          labelOptions: ['Save', 'Wishlist'],
          required: false, ifPageExists: true },
      ],
    },
    'auth.login': {
      placements: [
        { pageRole: '*', section: 'navbar', slot: 'icon-user',
          affordance: 'icon-button', variant: 'ghost', size: 'md',
          icon: ['User', 'CircleUser'],
          labelOptions: ['Account', 'Sign In'],
          required: false },
      ],
    },
    'newsletter.subscribe': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'newsletter-submit',
          affordance: 'form-submit', variant: 'default',
          icon: ['Mail'],
          labelOptions: ['Subscribe', 'Get Updates', 'Join'],
          required: false },
      ],
    },
  },
};
