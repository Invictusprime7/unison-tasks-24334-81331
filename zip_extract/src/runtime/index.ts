/**
 * Unison Tasks Runtime Module
 * 
 * Universal Intent System - Deterministic click handling for generated UIs
 * 
 * Architecture:
 * 1. ACTION_CATALOG - Fixed, deterministic handlers (runtime execution)
 * 2. Intent Resolver - Rules-first, AI-fallback (build-time resolution)
 * 3. Universal Intent Router - Event delegation, single click handler
 */

// Action Catalog - The deterministic execution layer
export {
  ACTION_CATALOG,
  executeAction,
  isValidIntent,
  getAvailableIntents,
  configureActionCatalog,
  type ActionCatalogEntry,
  type ActionContext,
  type OverlayManager,
  type NavigationManager,
  type CommunicationManager,
} from './actionCatalog';

// Intent Resolver - The resolution layer (build-time)
export {
  resolveIntent,
  extractButtonContext,
  type ButtonContext,
  type ResolvedIntent,
} from './intentResolver';

// Universal Intent Router - The orchestration layer
export {
  UniversalIntentRouter,
  createIntentRouter,
  getActiveRouter,
  setupPreviewRouter,
  setupProductionRouter,
  type IntentRouterConfig,
} from './universalIntentRouter';

/**
 * Quick reference for intent values:
 * 
 * NAVIGATION
 * - nav.goto_page      Navigate to internal page
 * - nav.scroll_to      Scroll to anchor
 * - nav.external       Open external URL
 * - nav.back           Go back in history
 * 
 * COMMERCE
 * - shop.open_cart     Open cart overlay
 * - shop.add_to_cart   Add product to cart
 * - shop.remove_from_cart  Remove product from cart
 * - shop.checkout      Navigate to checkout
 * - shop.apply_coupon  Apply discount code
 * 
 * BOOKING
 * - booking.open       Open booking modal
 * - booking.submit     Submit booking form
 * - booking.cancel     Cancel booking
 * 
 * LEAD/CONTACT
 * - lead.open_form     Open contact/lead form
 * - lead.submit_form   Submit lead form
 * - quote.request      Request a quote
 * 
 * COMMUNICATION
 * - call.now           Initiate phone call
 * - email.now          Open email client
 * 
 * AUTHENTICATION
 * - auth.sign_in       Open sign in
 * - auth.sign_up       Open sign up
 * - auth.sign_out      Sign out user
 * 
 * NEWSLETTER/WAITLIST
 * - newsletter.submit  Subscribe to newsletter
 * - waitlist.join      Join waitlist
 * 
 * SOCIAL
 * - social.share       Share on social platform
 * - social.follow      Follow on social platform
 * - social.copy_link   Copy link to clipboard
 */
