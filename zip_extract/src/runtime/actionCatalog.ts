/**
 * Action Catalog - Fixed, deterministic action handlers
 * 
 * The router ONLY calls from this catalog. No invented actions.
 * This guarantees consistent behavior for every intent.
 */

export type ActionContext = {
  payload?: Record<string, unknown>;
  element?: HTMLElement;
  businessId?: string;
  phone?: string;
  email?: string;
};

export type ActionHandler = (ctx: ActionContext) => void | Promise<void>;

export type ActionCatalogEntry = {
  handler: ActionHandler;
  description: string;
  requiresPayload?: string[];
  opensOverlay?: string;
  navigatesTo?: string;
};

// Overlay manager interface - will be provided by the host
export interface OverlayManager {
  open: (overlayId: string, payload?: Record<string, unknown>) => void;
  close: (overlayId: string) => void;
  isOpen: (overlayId: string) => boolean;
}

// Navigation manager interface
export interface NavigationManager {
  goto: (path: string, payload?: Record<string, unknown>) => void;
  external: (url: string) => void;
  back: () => void;
}

// Phone/communication manager
export interface CommunicationManager {
  call: (phone: string) => void;
  email: (email: string, subject?: string) => void;
  sms: (phone: string, message?: string) => void;
}

// Default implementations (can be overridden by host)
let overlays: OverlayManager = {
  open: (id, payload) => {
    console.log('[ActionCatalog] Opening overlay:', id, payload);
    window.postMessage({ type: 'OVERLAY_OPEN', overlayId: id, payload }, '*');
  },
  close: (id) => {
    console.log('[ActionCatalog] Closing overlay:', id);
    window.postMessage({ type: 'OVERLAY_CLOSE', overlayId: id }, '*');
  },
  isOpen: () => false,
};

let nav: NavigationManager = {
  goto: (path, payload) => {
    console.log('[ActionCatalog] Navigating to:', path);
    window.postMessage({ type: 'NAV_PAGE_GENERATE', pageName: path.replace(/^\/|\.html$/g, ''), pageContext: 'nav.goto', navLabel: path }, '*');
  },
  external: (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
  back: () => {
    window.history.back();
  },
};

let comm: CommunicationManager = {
  call: (phone) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  },
  email: (email, subject) => {
    const href = subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
    window.location.href = href;
  },
  sms: (phone, message) => {
    const href = message ? `sms:${phone}?body=${encodeURIComponent(message)}` : `sms:${phone}`;
    window.location.href = href;
  },
};

// Business data store
let businessData: Record<string, unknown> = {};

/**
 * Configure the action catalog with custom managers
 */
export function configureActionCatalog(config: {
  overlays?: OverlayManager;
  nav?: NavigationManager;
  comm?: CommunicationManager;
  businessData?: Record<string, unknown>;
}) {
  if (config.overlays) overlays = config.overlays;
  if (config.nav) nav = config.nav;
  if (config.comm) comm = config.comm;
  if (config.businessData) businessData = config.businessData;
}

/**
 * The Action Catalog - ~12 core intents that cover 90% of business templates
 * 
 * Every action is deterministic. No AI at runtime.
 */
export const ACTION_CATALOG: Record<string, ActionCatalogEntry> = {
  // ============ NAVIGATION ============
  'nav.goto_page': {
    handler: (ctx) => {
      const path = (ctx.payload?.path as string) || '/';
      nav.goto(path, ctx.payload);
    },
    description: 'Navigate to an internal page',
    navigatesTo: 'dynamic',
  },
  
  'nav.open_overlay': {
    handler: (ctx) => {
      const overlayId = (ctx.payload?.overlayId as string) || 'default';
      overlays.open(overlayId, ctx.payload);
    },
    description: 'Open a modal/overlay',
    opensOverlay: 'dynamic',
  },
  
  'nav.external': {
    handler: (ctx) => {
      const url = (ctx.payload?.url as string) || '';
      if (url) nav.external(url);
    },
    description: 'Open external link in new tab',
  },
  
  'nav.back': {
    handler: () => nav.back(),
    description: 'Go back to previous page',
  },

  // ============ COMMERCE ============
  'shop.open_cart': {
    handler: (ctx) => {
      overlays.open('cart', ctx.payload);
    },
    description: 'Open the shopping cart overlay',
    opensOverlay: 'cart',
  },
  
  'shop.add_to_cart': {
    handler: (ctx) => {
      const productId = ctx.payload?.productId || ctx.element?.dataset.productId;
      const productName = ctx.payload?.productName || ctx.element?.dataset.productName;
      const price = ctx.payload?.price || ctx.element?.dataset.price;
      const quantity = ctx.payload?.quantity || 1;
      
      console.log('[ActionCatalog] Adding to cart:', { productId, productName, price, quantity });
      
      // Dispatch cart event for cart component to handle
      window.postMessage({
        type: 'CART_ADD',
        payload: { productId, productName, price, quantity }
      }, '*');
      
      // Show feedback
      overlays.open('cart-toast', { message: `${productName || 'Item'} added to cart` });
    },
    description: 'Add product to cart',
    requiresPayload: ['productId'],
  },
  
  'shop.checkout': {
    handler: (ctx) => {
      nav.goto('/checkout', ctx.payload);
    },
    description: 'Go to checkout page',
    navigatesTo: '/checkout',
  },
  
  'shop.view_product': {
    handler: (ctx) => {
      const productId = ctx.payload?.productId;
      if (productId) {
        nav.goto(`/product/${productId}`, ctx.payload);
      } else {
        overlays.open('product-quick-view', ctx.payload);
      }
    },
    description: 'View product details',
  },

  // ============ BOOKING ============
  'booking.open': {
    handler: (ctx) => {
      overlays.open('booking', ctx.payload);
    },
    description: 'Open booking/appointment overlay',
    opensOverlay: 'booking',
  },
  
  'booking.submit': {
    handler: (ctx) => {
      console.log('[ActionCatalog] Submitting booking:', ctx.payload);
      window.postMessage({
        type: 'INTENT_TRIGGER',
        intent: 'booking.create',
        payload: ctx.payload
      }, '*');
    },
    description: 'Submit booking form',
  },
  
  'booking.select_service': {
    handler: (ctx) => {
      const serviceId = ctx.payload?.serviceId;
      overlays.open('booking', { serviceId, step: 'datetime' });
    },
    description: 'Select a service and open booking',
  },

  // ============ LEAD / CONTACT ============
  'lead.open_form': {
    handler: (ctx) => {
      overlays.open('contact', ctx.payload);
    },
    description: 'Open contact/lead form overlay',
    opensOverlay: 'contact',
  },
  
  'lead.submit_form': {
    handler: (ctx) => {
      console.log('[ActionCatalog] Submitting lead form:', ctx.payload);
      window.postMessage({
        type: 'INTENT_TRIGGER',
        intent: 'contact.submit',
        payload: ctx.payload
      }, '*');
    },
    description: 'Submit contact form',
  },
  
  'call.now': {
    handler: (ctx) => {
      const phone = (ctx.payload?.phone as string) || (businessData.phone as string) || '';
      if (phone) {
        comm.call(phone);
      } else {
        overlays.open('contact', { mode: 'callback' });
      }
    },
    description: 'Initiate phone call',
  },
  
  'email.now': {
    handler: (ctx) => {
      const email = (ctx.payload?.email as string) || (businessData.email as string) || '';
      const subject = ctx.payload?.subject as string;
      if (email) {
        comm.email(email, subject);
      } else {
        overlays.open('contact', { mode: 'email' });
      }
    },
    description: 'Open email client',
  },

  // ============ AUTH ============
  'auth.sign_in': {
    handler: (ctx) => {
      overlays.open('auth', { mode: 'signin', ...ctx.payload });
    },
    description: 'Open sign in overlay',
    opensOverlay: 'auth',
  },
  
  'auth.sign_up': {
    handler: (ctx) => {
      overlays.open('auth', { mode: 'signup', ...ctx.payload });
    },
    description: 'Open sign up overlay',
    opensOverlay: 'auth',
  },
  
  'auth.sign_out': {
    handler: () => {
      window.postMessage({ type: 'AUTH_SIGNOUT' }, '*');
    },
    description: 'Sign out user',
  },

  // ============ NEWSLETTER / WAITLIST ============
  'newsletter.open': {
    handler: (ctx) => {
      overlays.open('newsletter', ctx.payload);
    },
    description: 'Open newsletter signup overlay',
    opensOverlay: 'newsletter',
  },
  
  'newsletter.submit': {
    handler: (ctx) => {
      window.postMessage({
        type: 'INTENT_TRIGGER',
        intent: 'newsletter.subscribe',
        payload: ctx.payload
      }, '*');
    },
    description: 'Submit newsletter signup',
  },
  
  'waitlist.join': {
    handler: (ctx) => {
      window.postMessage({
        type: 'INTENT_TRIGGER',
        intent: 'join.waitlist',
        payload: ctx.payload
      }, '*');
    },
    description: 'Join waitlist',
  },

  // ============ QUOTE / INQUIRY ============
  'quote.request': {
    handler: (ctx) => {
      overlays.open('quote', ctx.payload);
    },
    description: 'Open quote request form',
    opensOverlay: 'quote',
  },
  
  'quote.submit': {
    handler: (ctx) => {
      window.postMessage({
        type: 'INTENT_TRIGGER',
        intent: 'quote.request',
        payload: ctx.payload
      }, '*');
    },
    description: 'Submit quote request',
  },

  // ============ SOCIAL / SHARE ============
  'social.share': {
    handler: (ctx) => {
      const url = (ctx.payload?.url as string) || window.location.href;
      const title = (ctx.payload?.title as string) || document.title;
      if (navigator.share) {
        navigator.share({ url, title }).catch(() => {});
      } else {
        overlays.open('share', { url, title });
      }
    },
    description: 'Share page/content',
  },
};

/**
 * Get all available intent keys (for validation)
 */
export function getAvailableIntents(): string[] {
  return Object.keys(ACTION_CATALOG);
}

/**
 * Check if an intent is valid
 */
export function isValidIntent(intent: string): boolean {
  return intent in ACTION_CATALOG;
}

/**
 * Execute an action from the catalog
 */
export function executeAction(intent: string, ctx: ActionContext = {}): boolean {
  const entry = ACTION_CATALOG[intent];
  if (!entry) {
    console.warn('[ActionCatalog] Unknown intent:', intent);
    return false;
  }
  
  try {
    entry.handler(ctx);
    return true;
  } catch (error) {
    console.error('[ActionCatalog] Action failed:', intent, error);
    return false;
  }
}
