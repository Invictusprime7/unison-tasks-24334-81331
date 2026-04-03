/**
 * Intent Router - Central handler for all button/form intents
 * Maps user actions to backend Edge Functions
 * 
 * Supports full end-to-end CTA handling across all template categories:
 * - Landing: trials, demos, signups
 * - Portfolio: project inquiries, contact
 * - Restaurant: reservations, orders
 * - E-commerce: cart, checkout, wishlist
 * - Blog: subscriptions, comments
 * - Contractor: quotes, service booking
 * - Agency: project briefs, consultations
 * - Startup: waitlists, beta signups
 */

import { supabase } from "@/integrations/supabase/client";
import { getDemoResponse, type BusinessSystemType } from "@/data/templates";
import { 
  CORE_INTENTS, 
  type CoreIntent, 
  type ActionIntent,
  type NavIntent,
  type PayIntent,
  isCoreIntent,
  isNavIntent,
  isPayIntent,
  isActionIntent,
} from "@/coreIntents";


export interface IntentPayload {
  businessId?: string;
  path?: string;      // nav.goto
  anchor?: string;    // nav.anchor
  url?: string;       // nav.external
  priceId?: string;   // pay.checkout
  plan?: string;      // pay.checkout
  [key: string]: unknown;
}

export type IntentResult = {
  success: boolean;
  status?: "ok" | "unsupported" | "redirect" | "navigate";
  message?: string;
  data?: unknown;
  error?: string;
  redirectUrl?: string;
};

type BackendHandler = 'create-lead' | 'create-booking' | 'create-checkout';

// Locked: ActionIntent -> authoritative backend handler
const ACTION_HANDLERS: Record<ActionIntent, BackendHandler> = {
  'contact.submit': 'create-lead',
  'newsletter.subscribe': 'create-lead',
  'quote.request': 'create-lead',
  'lead.capture': 'create-lead',
  'booking.create': 'create-booking',
};

const LEAD_SOURCE_MAP: Record<ActionIntent, string> = {
  'contact.submit': 'contact_form',
  'newsletter.subscribe': 'newsletter',
  'quote.request': 'quote_request',
  'lead.capture': 'lead_capture',
  'booking.create': 'booking',
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function assertBusinessId(payload: IntentPayload): { ok: true; businessId: string } | { ok: false; error: string } {
  const businessId = typeof payload.businessId === 'string' ? payload.businessId : '';
  if (!businessId) return { ok: false as const, error: 'Missing businessId (this site is not configured for a business yet).' };
  if (!isUuid(businessId)) return { ok: false as const, error: 'Invalid businessId.' };
  return { ok: true as const, businessId };
}

function normalizeLeadPayload(intent: CoreIntent, payload: IntentPayload) {
  // Basic contact fields may come from various form names
  const email = String(payload.email ?? payload.customerEmail ?? '').trim();
  const name = String(payload.name ?? payload.fullName ?? payload.customerName ?? '').trim() || undefined;
  const phone = String(payload.phone ?? payload.customerPhone ?? '').trim() || undefined;
  const message = String(payload.message ?? payload.notes ?? '').trim() || undefined;

  const now = new Date().toISOString();
  const page = typeof window !== 'undefined' ? window.location.href : undefined;

  const metadata = {
    intent,
    timestamp: now,
    page,
    templateId: typeof payload.templateId === 'string' ? payload.templateId : undefined,
    source: payload._source ?? undefined,
  };

  return {
    // create-lead expects these keys
    businessId: payload.businessId,
    intent,
    source: payload.source || LEAD_SOURCE_MAP[intent],
    email,
    name,
    phone,
    message,
    metadata,
  };
}

/**
 * Handle authentication intents using Supabase Auth directly
 */
async function handleAuthIntent(intent: string, payload: IntentPayload): Promise<IntentResult> {
  const { email, password } = payload as { email: string; password: string };
  
  switch (intent) {
    case "auth.signup": {
      if (!email || !password) {
        return { success: false, error: "Email and password are required" };
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      return error ? { success: false, error: error.message } : { success: true, data };
    }
    
    case "auth.signin": {
      if (!email || !password) {
        return { success: false, error: "Email and password are required" };
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { success: false, error: error.message } : { success: true, data };
    }
    
    case "auth.signout": {
      const { error } = await supabase.auth.signOut();
      return error ? { success: false, error: error.message } : { success: true };
    }
    
    default:
      return { success: false, error: "Unknown auth intent" };
  }
}

/**
 * Handle navigation intents
 */
function handleNavigationIntent(intent: string, payload: IntentPayload): IntentResult {
  const { target, action } = payload as { target?: string; action?: string };
  
  switch (intent) {
    case "dashboard.open":
      window.location.href = "/dashboard";
      return { success: true, data: { navigatedTo: "/dashboard" } };
    
    case "cart.view":
      // Emit cart view event for listeners
      window.dispatchEvent(new CustomEvent('intent:cart.view'));
      return { success: true, data: { action: 'cart_opened' } };
    
    case "menu.view":
      // Scroll to menu section or emit event
      const menuEl = document.querySelector('#menu, [data-section="menu"]');
      if (menuEl) {
        menuEl.scrollIntoView({ behavior: 'smooth' });
      }
      return { success: true, data: { action: 'scrolled_to_menu' } };
    
    case "pricing.view":
      const pricingEl = document.querySelector('#pricing, [data-section="pricing"]');
      if (pricingEl) {
        pricingEl.scrollIntoView({ behavior: 'smooth' });
      }
      return { success: true, data: { action: 'scrolled_to_pricing' } };
    
    case "portfolio.view":
      const workEl = document.querySelector('#work, #portfolio, [data-section="work"]');
      if (workEl) {
        workEl.scrollIntoView({ behavior: 'smooth' });
      }
      return { success: true, data: { action: 'scrolled_to_work' } };
    
    case "shop.browse":
      window.dispatchEvent(new CustomEvent('intent:shop.browse'));
      return { success: true, data: { action: 'shop_opened' } };
    
    case "content.read":
      if (target) {
        window.location.href = target;
      }
      return { success: true, data: { action: 'navigated_to_content' } };
    
    case "case.study":
      if (target) {
        window.location.href = target;
      }
      return { success: true, data: { action: 'navigated_to_case_study' } };
    
    case "call.now":
      const phone = payload.phone || payload.phoneNumber;
      if (phone) {
        window.location.href = `tel:${phone}`;
      }
      return { success: true, data: { action: 'phone_call_initiated' } };
    
    default:
      return { success: false, error: "Unknown navigation intent" };
  }
}

/**
 * Handle workflow trigger intents (cart, orders, etc.)
 */
async function handleWorkflowIntent(intent: string, payload: IntentPayload): Promise<IntentResult> {
  console.log("[IntentRouter] Triggering workflow:", intent, payload);
  
  try {
    const { data, error } = await supabase.functions.invoke('workflow-trigger', {
      body: {
        eventType: 'button_click',
        buttonId: intent,
        buttonLabel: intent.split('.').pop(),
        payload,
      }
    });
    
    if (error) {
      console.error("[IntentRouter] Workflow error:", error);
      // Don't fail - emit event for local handling
      window.dispatchEvent(new CustomEvent(`intent:${intent}`, { detail: payload }));
      return { success: true, data: { handled: 'local', intent } };
    }
    
    window.dispatchEvent(new CustomEvent(`intent:${intent}`, { detail: { ...payload, workflowResult: data } }));
    return { success: true, data };
  } catch {
    // Fallback to local event
    window.dispatchEvent(new CustomEvent(`intent:${intent}`, { detail: payload }));
    return { success: true, data: { handled: 'local', intent } };
  }
}

// Default businessId for templates (can be overridden by location state or template config)
let defaultBusinessId: string | null = null;
let defaultProjectId: string | null = null;
let currentSystemType: BusinessSystemType | null = null;
let isDemoMode: boolean = false;
let useUnifiedRouter: boolean = true; // Use the new intent-router Edge Function

/**
 * Set the default business ID for intent routing
 * Called from WebBuilder when loading a template with context
 */
export function setDefaultBusinessId(businessId: string | null): void {
  defaultBusinessId = businessId;
  console.log("[IntentRouter] Default businessId set:", businessId);
}

/**
 * Set the default project ID for intent routing
 */
export function setDefaultProjectId(projectId: string | null): void {
  defaultProjectId = projectId;
  console.log("[IntentRouter] Default projectId set:", projectId);
}

/**
 * Get the current default business ID
 */
export function getDefaultBusinessId(): string | null {
  return defaultBusinessId;
}

/**
 * Get the current default project ID
 */
export function getDefaultProjectId(): string | null {
  return defaultProjectId;
}

/**
 * Set the current system type for demo mode responses
 */
export function setCurrentSystemType(systemType: BusinessSystemType | null): void {
  currentSystemType = systemType;
  console.log("[IntentRouter] System type set:", systemType);
}

/**
 * Enable or disable demo mode
 * In demo mode, intents return mocked success responses instead of calling backend
 */
export function setDemoMode(enabled: boolean): void {
  isDemoMode = enabled;
  console.log("[IntentRouter] Demo mode:", enabled ? "enabled" : "disabled");
}

/**
 * Check if demo mode is active
 */
export function isDemoModeActive(): boolean {
  return isDemoMode;
}

// ============================================================================
// PAGE MAP - Project page registry for multi-page navigation
// ============================================================================
interface PageMapEntry {
  slug: string;
  title: string;
  templateId?: string;
  isHome?: boolean;
}

let currentPageMap: PageMapEntry[] = [];
let currentPath: string = '/';

/**
 * Set the page map for navigation resolution
 */
export function setPageMap(pages: PageMapEntry[]): void {
  currentPageMap = pages;
  console.log("[IntentRouter] Page map set:", pages);
}

/**
 * Get the current page map
 */
export function getPageMap(): PageMapEntry[] {
  return currentPageMap;
}

/**
 * Set current path (for preview router state)
 */
export function setCurrentPath(path: string): void {
  currentPath = path;
  console.log("[IntentRouter] Current path:", path);
}

/**
 * Get current path
 */
export function getCurrentPath(): string {
  return currentPath;
}

// ============================================================================
// NAVIGATION INTENT HANDLERS (Client-side, no backend needed)
// ============================================================================

/**
 * Handle nav.goto - Internal route navigation
 */
function handleNavGoto(payload: IntentPayload): IntentResult {
  const path = payload.path as string;
  if (!path) {
    return { success: false, error: "nav.goto requires a 'path' payload" };
  }
  
  // In preview mode: update preview router state
  // In published mode: navigate to real route
  const page = currentPageMap.find(p => p.slug === path);
  
  if (page || path.startsWith('/')) {
    setCurrentPath(path);
    
    // Emit navigation event for preview router
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('intent:nav.goto', { 
        detail: { path, page } 
      }));
    }
    
    return { 
      success: true, 
      status: 'navigate',
      message: `Navigating to ${path}`,
      data: { path, page }
    };
  }
  
  return { success: false, error: `Page not found: ${path}` };
}

/**
 * Handle nav.anchor - Scroll to anchor within page
 */
function handleNavAnchor(payload: IntentPayload): IntentResult {
  const anchor = payload.anchor as string;
  if (!anchor) {
    return { success: false, error: "nav.anchor requires an 'anchor' payload" };
  }
  
  const targetId = anchor.startsWith('#') ? anchor.slice(1) : anchor;
  
  if (typeof window !== 'undefined') {
    const element = document.getElementById(targetId) || 
                    document.querySelector(`[data-section="${targetId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      return { 
        success: true, 
        status: 'navigate',
        message: `Scrolled to ${anchor}`,
        data: { anchor }
      };
    }
  }
  
  // Emit event even if element not found (preview might handle differently)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('intent:nav.anchor', { 
      detail: { anchor } 
    }));
  }
  
  return { 
    success: true, 
    status: 'navigate',
    message: `Anchor navigation to ${anchor}`,
    data: { anchor }
  };
}

/**
 * Handle nav.external - Open external URL
 */
function handleNavExternal(payload: IntentPayload): IntentResult {
  const url = payload.url as string;
  if (!url) {
    return { success: false, error: "nav.external requires a 'url' payload" };
  }
  
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  
  return { 
    success: true, 
    status: 'redirect',
    message: `Opening ${url}`,
    data: { url }
  };
}

// ============================================================================
// PAYMENT INTENT HANDLERS (Backend creates checkout session)
// ============================================================================

/**
 * Handle pay.checkout - Begin checkout flow
 * Creates a Stripe checkout session via backend and returns redirect URL
 */
async function handlePayCheckout(payload: IntentPayload, businessId: string): Promise<IntentResult> {
  const priceId = payload.priceId as string;
  const plan = payload.plan as string;
  
  if (!priceId && !plan) {
    return { success: false, error: "pay.checkout requires 'priceId' or 'plan' payload" };
  }
  
  try {
    // Call backend to create checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        businessId,
        priceId,
        plan,
        successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        metadata: {
          source: window.location.href,
          timestamp: new Date().toISOString(),
        },
      },
    });
    
    if (error) throw error;
    
    if (data?.url) {
      // Redirect to checkout
      window.location.href = data.url;
      return { 
        success: true, 
        status: 'redirect',
        message: 'Redirecting to checkout...',
        redirectUrl: data.url,
        data
      };
    }
    
    return { success: true, data };
  } catch (err: any) {
    console.error('[IntentRouter] Checkout error:', err);
    return { 
      success: false, 
      error: err.message || 'Failed to create checkout session'
    };
  }
}

/**
 * Handle pay.success - Payment success handler
 */
function handlePaySuccess(payload: IntentPayload): IntentResult {
  const sessionId = payload.sessionId as string;
  
  // Emit success event for UI to handle
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('intent:pay.success', { 
      detail: { sessionId } 
    }));
  }
  
  return { 
    success: true, 
    message: 'Payment successful!',
    data: { sessionId }
  };
}

/**
 * Handle pay.cancel - Payment cancelled handler
 */
function handlePayCancel(payload: IntentPayload): IntentResult {
  // Emit cancel event for UI to handle
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('intent:pay.cancel', { 
      detail: payload 
    }));
  }
  
  return { 
    success: true, 
    message: 'Payment cancelled',
    data: {}
  };
}

/**
 * Main intent handler - routes intents to appropriate handlers/functions
 * 
 * - NAV intents: Client-side routing (no backend)
 * - PAY intents: Backend checkout session creation + redirect
 * - ACTION intents: CRM persistence + notifications via unified router
 */
export async function handleIntent(intent: string, payload: IntentPayload): Promise<IntentResult> {
  console.log("[IntentRouter] Handling intent:", intent, payload, { isDemoMode, currentSystemType, useUnifiedRouter });
  
  // ========================================================================
  // NAVIGATION INTENTS - Handled client-side (no backend needed)
  // ========================================================================
  if (isNavIntent(intent)) {
    switch (intent) {
      case 'nav.goto':
        return handleNavGoto(payload);
      case 'nav.anchor':
        return handleNavAnchor(payload);
      case 'nav.external':
        return handleNavExternal(payload);
    }
  }
  
  // Handle demo mode - return mocked responses for action intents
  if (isDemoMode && currentSystemType && isActionIntent(intent)) {
    const demoResponse = getDemoResponse(currentSystemType, intent);
    if (demoResponse) {
      console.log("[IntentRouter] Demo mode response:", demoResponse);
      return {
        success: demoResponse.success,
        data: demoResponse.data,
        message: demoResponse.message,
        error: demoResponse.success ? undefined : demoResponse.message,
      };
    }
  }
  
  // Inject default businessId if not provided
  if (!payload.businessId && defaultBusinessId) {
    payload.businessId = defaultBusinessId;
    console.log("[IntentRouter] Injected default businessId:", defaultBusinessId);
  }

  // Inject default projectId if not provided
  if (!payload.projectId && defaultProjectId) {
    payload.projectId = defaultProjectId;
    console.log("[IntentRouter] Injected default projectId:", defaultProjectId);
  }

  // Locked surface (authoritative).
  // Non-core intents may still exist in templates, but they are preview-only and cannot persist/publish.
  if (!isCoreIntent(intent)) {
    const message = "This intent is not production-supported yet";
    console.warn("[IntentRouter] Unsupported intent (not CoreIntent):", intent);
    return { success: false, status: "unsupported", message, error: message };
  }

  // Production safety: require real businessId for action/pay intents
  const biz = assertBusinessId(payload);
  if (!biz.ok) return { success: false, error: ('error' in biz ? biz.error : 'Invalid businessId') };
  
  // Validate email for action intents that require it (lead capture, contact, newsletter, quote)
  if (isActionIntent(intent) && intent !== 'booking.create') {
    const email = String(payload.email ?? payload.customerEmail ?? '').trim();
    if (!email) {
      return { success: false, error: 'Email is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }
  }
  
  // ========================================================================
  // PAYMENT INTENTS - Backend creates checkout session
  // ========================================================================
  if (isPayIntent(intent)) {
    switch (intent) {
      case 'pay.checkout':
        return handlePayCheckout(payload, biz.businessId);
      case 'pay.success':
        return handlePaySuccess(payload);
      case 'pay.cancel':
        return handlePayCancel(payload);
    }
  }
  
  try {
    // Determine source context
    const source = isDemoMode ? 'preview' : 'published';
    const sourceUrl = typeof window !== 'undefined' ? window.location.href : undefined;

    // ========================================================================
    // UNIFIED INTENT ROUTER - Single backend entrypoint for all CoreIntents
    // ========================================================================
    // This is the canonical execution surface that:
    // - Validates businessId and CoreIntent
    // - Persists CRM records (leads, contacts, etc.)
    // - Sends notifications using business settings
    // - Records analytics
    if (useUnifiedRouter) {
      console.log("[IntentRouter] Using unified intent-router Edge Function");
      
      const routerPayload = {
        intent,
        businessId: biz.businessId,
        projectId: (payload.projectId as string) || defaultProjectId || undefined,
        data: payload,
        source,
        sourceUrl,
        visitorId: (payload.visitorId as string) || undefined,
      };
      
      const { data, error } = await supabase.functions.invoke('intent-router', {
        body: routerPayload,
      });
      
      if (error) {
        console.error("[IntentRouter] Unified router error:", error);
        // Fall back to legacy handlers if unified router fails
        console.log("[IntentRouter] Falling back to legacy handlers...");
      } else {
        // Unified router returns { success, message, data, error }
        if (data && typeof data === 'object') {
          console.log("[IntentRouter] Unified router success:", data);
          return data as IntentResult;
        }
        return { success: true, data };
      }
    }

    // ========================================================================
    // LEGACY HANDLERS (fallback for action intents only)
    // ========================================================================
    if (!isActionIntent(intent)) {
      return { success: false, error: `Intent ${intent} not handled by legacy router` };
    }
    
    const handler = ACTION_HANDLERS[intent];

    // Normalize payload per intent, then call authoritative backend handler.
    let body: Record<string, unknown> = { ...payload };
    if (intent === 'contact.submit' || intent === 'newsletter.subscribe' || intent === 'quote.request') {
      body = normalizeLeadPayload(intent, payload);
    }

    if (intent === 'booking.create') {
      body = {
        ...payload,
        businessId: payload.businessId,
        action: 'create',
        // Transform pipeline field names to edge function expected format
        customerName: (payload.customerName || payload.name) ?? undefined,
        customerEmail: (payload.customerEmail || payload.email) ?? undefined,
        customerPhone: (payload.customerPhone || payload.phone) ?? undefined,
        startsAt:
          payload.startsAt ||
          (payload.date && payload.time ? new Date(`${payload.date}T${payload.time}:00`).toISOString() : undefined),
        serviceName: (payload.serviceName || payload.service) ?? undefined,
        metadata: {
          intent,
          timestamp: new Date().toISOString(),
          page: typeof window !== 'undefined' ? window.location.href : undefined,
          templateId: typeof payload.templateId === 'string' ? payload.templateId : undefined,
          source: payload._source ?? undefined,
        },
      };
    }

    const { data, error } = await supabase.functions.invoke(handler, { body });
    
    if (error) {
      console.error("[IntentRouter] Edge function error:", error);
      return { success: false, error: error.message };
    }
    
    // Edge functions return { success, data, error } format
    if (data && typeof data === 'object') {
      if ('success' in data) {
        return data as IntentResult;
      }
      return { success: true, data };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("[IntentRouter] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get all available intents (for AI assistant)
 */
export function getAvailableIntents(): string[] {
  return [...CORE_INTENTS];
}

/**
 * Check if an intent exists
 */
export function isValidIntent(intent: string): boolean {
  return isCoreIntent(intent);
}

/**
 * True if this intent has a registered backend handler.
 * Used for publish gating.
 */
export function hasBackendHandler(intent: string): boolean {
  return isActionIntent(intent) && !!ACTION_HANDLERS[intent];
}

/**
 * Get the pack name for an intent
 */
export function getIntentPack(intent: string): string | null {
  if (intent === 'booking.create') return 'booking';
  if (intent === 'newsletter.subscribe' || intent === 'contact.submit' || intent === 'quote.request') return 'leads';
  if (isPayIntent(intent)) return 'payments';
  return null;
}

/**
 * Get the function name for an intent
 */
export function getIntentFunction(intent: string): string | null {
  if (!isActionIntent(intent)) return null;
  return ACTION_HANDLERS[intent] || null;
}

// Export for use in templates and AI assistant
export const AVAILABLE_INTENTS = getAvailableIntents();
export const INTENT_PACKS = {
  leads: ['contact.submit', 'newsletter.subscribe', 'quote.request'],
  booking: ['booking.create'],
  payments: ['pay.checkout', 'pay.success', 'pay.cancel'],
  navigation: ['nav.goto', 'nav.anchor', 'nav.external'],
};
