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
import { normalizeIntent } from './intentAliases';
import { classifyIntent } from './intentClassifier';
import {
  closeBrowserCartOverlay,
  createBrowserCartManager,
  openBrowserCartOverlay,
} from './browserCartManager';
import { createCheckoutSession, resolveCheckoutSessionBody } from './checkoutClient';
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
  isAutomationIntent,
} from "@/platform/core/coreIntents";


export interface IntentPayload {
  businessId?: string;
  siteId?: string;
  projectId?: string;
  pageId?: string;
  pagePath?: string;
  bindingId?: string;
  elementKey?: string;
  _elementKey?: string;
  sessionId?: string;
  userId?: string;
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
  /** UI directives for the caller */
  ui?: {
    openModal?: string;
    navigate?: string;
    toast?: { type: 'success' | 'error' | 'info'; message: string };
  };
};

const LEAD_SOURCE_MAP: Record<ActionIntent, string> = {
  'contact.submit': 'contact_form',
  'newsletter.subscribe': 'newsletter',
  'quote.request': 'quote_request',
  'lead.capture': 'lead_capture',
  'booking.create': 'booking',
};

const CANONICAL_ACTION_INTENTS = new Set<ActionIntent>([
  'contact.submit',
  'lead.capture',
  'newsletter.subscribe',
  'quote.request',
  'booking.create',
]);

interface CanonicalIntentExecResponse {
  ok: boolean;
  result?: unknown;
  clientActions?: Array<Record<string, unknown>>;
  error?: {
    code?: string;
    message?: string;
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getPageId(payload: IntentPayload): string {
  const pageId =
    getStringValue(payload.pageId) ||
    getStringValue(payload.pagePath) ||
    (typeof payload.path === 'string' && payload.path.startsWith('/') ? getStringValue(payload.path) : undefined) ||
    (typeof window !== 'undefined' ? getStringValue(window.location.pathname) : undefined);

  return pageId || '/';
}

function getBindingId(payload: IntentPayload): string | undefined {
  return getStringValue(payload.bindingId) || getStringValue(payload._bindingId);
}

function getElementKey(payload: IntentPayload): string | undefined {
  return getStringValue(payload.elementKey) || getStringValue(payload._elementKey);
}

function getSiteId(payload: IntentPayload): string | undefined {
  return getStringValue(payload.siteId) || getStringValue(payload.projectId);
}

function getCanonicalSiteId(payload: IntentPayload): string | undefined {
  const siteId = getSiteId(payload);
  return siteId && isUuid(siteId) ? siteId : undefined;
}

function toDateTimeParts(value: unknown): { date?: string; time?: string } {
  const raw = getStringValue(value);
  if (!raw) return {};

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return {};

  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
  };
}

function buildCanonicalIntentParams(intent: ActionIntent, payload: IntentPayload): Record<string, unknown> {
  const elementKey = getElementKey(payload);
  const pagePath = getStringValue(payload.pagePath) || getPageId(payload);

  if (intent === 'booking.create') {
    const bookingStart = toDateTimeParts(payload.startsAt);

    return {
      ...payload,
      email: getStringValue(payload.customerEmail) || getStringValue(payload.email),
      name: getStringValue(payload.customerName) || getStringValue(payload.name) || getStringValue(payload.fullName),
      phone: getStringValue(payload.customerPhone) || getStringValue(payload.phone),
      message: getStringValue(payload.notes) || getStringValue(payload.message),
      service: getStringValue(payload.service) || getStringValue(payload.serviceName),
      date: getStringValue(payload.date) || bookingStart.date,
      time: getStringValue(payload.time) || bookingStart.time,
      pagePath,
      ...(elementKey ? { elementKey } : {}),
    };
  }

  return {
    ...payload,
    email: getStringValue(payload.email) || getStringValue(payload.customerEmail),
    name: getStringValue(payload.name) || getStringValue(payload.fullName) || getStringValue(payload.customerName),
    phone: getStringValue(payload.phone) || getStringValue(payload.customerPhone),
    message: getStringValue(payload.message) || getStringValue(payload.notes),
    source: payload.source || LEAD_SOURCE_MAP[intent],
    pagePath,
    ...(elementKey ? { elementKey } : {}),
  };
}

function adaptIntentExecResult(result: CanonicalIntentExecResponse): IntentResult {
  const clientActions = Array.isArray(result.clientActions) ? result.clientActions : [];
  const toastAction = clientActions.find(
    (action) => action?.type === 'TOAST' && typeof action.message === 'string'
  );
  const navigateAction = clientActions.find(
    (action) => action?.type === 'NAVIGATE' && typeof action.to === 'string'
  );
  const externalAction = clientActions.find(
    (action) => action?.type === 'EXTERNAL' && typeof action.url === 'string'
  );

  let toastType: 'success' | 'error' | 'info' | undefined;
  if (toastAction && typeof toastAction.level === 'string') {
    toastType =
      toastAction.level === 'warning'
        ? 'info'
        : (toastAction.level as 'success' | 'error' | 'info');
  }

  return {
    success: result.ok,
    data: result.result,
    error: result.error?.message,
    message: typeof toastAction?.message === 'string' ? toastAction.message : undefined,
    redirectUrl: typeof externalAction?.url === 'string' ? externalAction.url : undefined,
    ui: toastAction || navigateAction
      ? {
          navigate: typeof navigateAction?.to === 'string' ? navigateAction.to : undefined,
          toast: toastType && typeof toastAction?.message === 'string'
            ? { type: toastType, message: toastAction.message as string }
            : undefined,
        }
      : undefined,
  };
}

async function invokeCanonicalIntent(intent: ActionIntent, payload: IntentPayload): Promise<IntentResult | null> {
  if (!CANONICAL_ACTION_INTENTS.has(intent)) {
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('intent-exec', {
      body: {
        siteId: getCanonicalSiteId(payload),
        businessId: payload.businessId,
        intentId: intent,
        bindingId: getBindingId(payload),
        pageId: getPageId(payload),
        params: buildCanonicalIntentParams(intent, payload),
        context: {
          sessionId: getStringValue(payload.sessionId),
          userId: getStringValue(payload.userId),
        },
      },
    });

    if (error) {
      console.error('[IntentRouter] intent-exec error:', error);
      return { success: false, error: error.message || 'Intent execution failed' };
    }

    if (data && typeof data === 'object' && 'ok' in data) {
      return adaptIntentExecResult(data as CanonicalIntentExecResponse);
    }
  } catch (err) {
    console.error('[IntentRouter] intent-exec exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Intent execution failed',
    };
  }

  return {
    success: false,
    error: `No canonical handler configured for ${intent}`,
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
 * Handle automation intent triggers (cart, orders, booking events, etc.)
 * Routes to automation-event Edge Function which:
 * 1) Stores event in automation_events
 * 2) Looks up matching workflows via intent_recipe_mappings + crm_workflows
 * 3) Triggers workflow execution
 */
async function handleAutomationIntent(
  intent: string, 
  payload: IntentPayload,
  elementKey?: string
): Promise<IntentResult> {
  console.log("[IntentRouter] Triggering automation:", intent, payload);
  
  const businessId = payload.businessId || defaultBusinessId;
  const projectId = payload.projectId || defaultProjectId;
  
  // Always emit local event for UI reactivity
  window.dispatchEvent(new CustomEvent(`intent:${intent}`, { detail: payload }));
  
  // If no businessId, handle locally only (demo mode)
  if (!businessId) {
    console.log("[IntentRouter] No businessId, automation handled locally only");
    return { 
      success: true, 
      data: { handled: 'local', intent, demo: true },
      message: `Demo: ${intent} triggered`,
    };
  }
  
  try {
    // Call automation-event Edge Function
    const { data, error } = await supabase.functions.invoke('automation-event', {
      body: {
        businessId,
        intent,
        payload: {
          ...payload,
          projectId,
          elementKey,
          sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          timestamp: new Date().toISOString(),
        },
      }
    });
    
    if (error) {
      console.error("[IntentRouter] Automation-event error:", error);
      return { 
        success: true, 
        data: { handled: 'local', intent, backendError: true },
        message: `${intent} triggered (offline mode)`,
      };
    }
    
    console.log("[IntentRouter] Automation-event success:", data);
    
    // Re-emit with backend result attached
    window.dispatchEvent(new CustomEvent(`intent:${intent}`, { 
      detail: { ...payload, automationResult: data } 
    }));
    
    return { 
      success: true, 
      data,
      message: data?.triggered > 0 
        ? `Triggered ${data.triggered} workflow(s)`
        : `${intent} processed`,
    };
  } catch (err) {
    console.error("[IntentRouter] Automation-event exception:", err);
    return { 
      success: true, 
      data: { handled: 'local', intent },
      message: `${intent} triggered (offline mode)`,
    };
  }
}

// Default businessId for templates (can be overridden by location state or template config)
let defaultBusinessId: string | null = null;
let defaultProjectId: string | null = null;
let currentSystemType: BusinessSystemType | null = null;
let isDemoMode: boolean = false;

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
  // Check multiple possible sources for the anchor value
  const anchor = (payload.anchor || payload.utAnchor || payload.target || payload.href) as string;
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
 * Handle nav.external - Route external URL through VFS (no new tab)
 */
function handleNavExternal(payload: IntentPayload): IntentResult {
  const url = payload.url as string;
  if (!url) {
    return { success: false, error: "nav.external requires a 'url' payload" };
  }
  
  // Emit event for VFS-based navigation instead of opening new tab
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('intent:nav.external', { 
      detail: { url, ...payload } 
    }));
  }
  
  return { 
    success: true, 
    status: 'redirect',
    message: `Navigating to ${url}`,
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
async function handlePayCheckout(payload: IntentPayload): Promise<IntentResult> {
  const checkoutBody = resolveCheckoutSessionBody({
    priceId: payload.priceId,
    plan: payload.plan,
    billingCycle: payload.billingCycle,
    successPath: '/payment/success?session_id={CHECKOUT_SESSION_ID}',
    cancelPath: '/payment/cancel',
  });

  if (!checkoutBody) {
    return { success: false, error: "pay.checkout requires 'priceId' or 'plan' payload" };
  }
  
  try {
    const data = await createCheckoutSession(checkoutBody);

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
 * - ACTION intents: canonical execution via intent-exec
 */
export async function handleIntent(intent: string, payload: IntentPayload): Promise<IntentResult> {
  // Step 1: Normalize via alias system (handles messy template intents)
  const normalized = normalizeIntent(intent);
  const classification = classifyIntent(normalized);
  console.log("[IntentRouter] Handling intent:", intent, { normalized, lane: classification.lane, payload });
  
  // Step 2: Handle demo mode - return mocked responses
  if (isDemoMode && currentSystemType && classification.lane === 'automatable') {
    const demoResponse = getDemoResponse(currentSystemType, normalized);
    if (demoResponse) {
      console.log("[IntentRouter] Demo mode response:", demoResponse);
      return {
        success: demoResponse.success,
        data: demoResponse.data,
        message: demoResponse.message,
        error: demoResponse.success ? undefined : demoResponse.message,
      };
    }
    return {
      success: true,
      data: { demo: true, intent: normalized },
      message: `Demo: ${normalized} triggered successfully`,
    };
  }

  // Step 3: Inject defaults
  if (!payload.businessId && defaultBusinessId) {
    payload.businessId = defaultBusinessId;
  }
  if (!payload.projectId && defaultProjectId) {
    payload.projectId = defaultProjectId;
  }

  // =========================================================================
  // LANE-BASED ROUTING — The classifier is the single source of truth.
  //   immediate  → client-side only, zero network, zero automation
  //   backend    → one-shot edge function (pay, auth), NO automation pipeline
  //   automatable → execute handler + dispatch automation
  // =========================================================================

  // ── IMMEDIATE LANE ──────────────────────────────────────────────────────
  if (classification.lane === 'immediate') {
    // Nav intents handled locally
    if (isNavIntent(normalized)) {
      switch (normalized) {
        case 'nav.goto':    return handleNavGoto(payload);
        case 'nav.anchor':  return handleNavAnchor(payload);
        case 'nav.external': return handleNavExternal(payload);
      }
    }

    // All other immediate intents → executeIntent (client-side handlers)
    const { executeIntent } = await import('./intentExecutor');
    const ctx = buildIntentContext(payload);
    const result = await executeIntent(normalized, ctx);
    return adaptExecutorResult(result);
  }

  // ── BACKEND LANE ────────────────────────────────────────────────────────
  // One-shot API calls: payments, auth, uploads, search.
  // These NEVER enter the automation pipeline.
  if (classification.lane === 'backend') {
    // Payment intents → deterministic checkout/modal flow
    if (isPayIntent(normalized)) {
      if (classification.requiresBusinessId && !payload.businessId) {
        return {
          success: false,
          error: 'Business profile not configured yet',
          ui: { toast: { type: 'info', message: 'Setting up your business profile…' } },
        };
      }
      switch (normalized) {
        case 'pay.checkout':
          return handlePayCheckout(payload);
        case 'pay.success':
          return handlePaySuccess(payload);
        case 'pay.cancel':
          return handlePayCancel(payload);
      }
    }

    // Auth intents → open auth modals via executor (no automation)
    // cart.checkout → delegates to pay.checkout via executor (no automation)
    const { executeIntent } = await import('./intentExecutor');
    const ctx = buildIntentContext(payload);
    const result = await executeIntent(normalized, ctx);
    return adaptExecutorResult(result);
  }

  // ── AUTOMATABLE LANE ────────────────────────────────────────────────────
  // Business events that feed the automation pipeline:
  //   CRM writes, bookings, deals, orders, lifecycle events.

  // Require businessId for automation intents
  if (!payload.businessId) {
    console.warn("[IntentRouter] Missing businessId for automatable intent");
    return {
      success: false,
      error: 'Business profile not configured yet',
      ui: { toast: { type: 'info', message: 'Setting up your business profile…' } },
    };
  }

  // Pure automation events (booking.confirmed, deal.won, etc.) → automation-event Edge Function
  if (isAutomationIntent(normalized) && !isActionIntent(normalized)) {
    const elementKey = typeof payload._elementKey === 'string' ? payload._elementKey : undefined;
    return handleAutomationIntent(normalized, payload, elementKey);
  }

  // Action intents (contact.submit, booking.create, etc.) → unified backend router
  if (isActionIntent(normalized)) {
    const canonicalResult = await invokeCanonicalIntent(normalized, payload);
    if (canonicalResult) {
      return canonicalResult;
    }

    return {
      success: false,
      error: `No canonical handler configured for ${normalized}`,
    };
  }

  // Fallback for any remaining automatable intents → executeIntent
  const { executeIntent } = await import('./intentExecutor');
  const ctx = buildIntentContext(payload);
  const result = await executeIntent(normalized, ctx);
  return adaptExecutorResult(result);
}

/**
 * Build an IntentContext from the router's payload.
 * Centralizes manager wiring so every lane uses the same context shape.
 */
function buildIntentContext(payload: IntentPayload): import('./intentExecutor').IntentContext {
  const pagePath = getStringValue(payload.pagePath) || getPageId(payload);
  const elementKey = getElementKey(payload);
  const businessId = typeof payload.businessId === 'string' ? payload.businessId : undefined;
  const siteId = getSiteId(payload);
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : undefined;
  const cartManager = createBrowserCartManager({
    businessId,
    siteId,
    sessionId,
  });

  return {
    payload: {
      ...payload,
      pagePath,
      ...(elementKey ? { elementKey } : {}),
    },
    businessId,
    siteId,
    userId: typeof payload.userId === 'string' ? payload.userId : undefined,
    sessionId,
    managers: {
      navigation: {
        goto: (path, p) => {
          setCurrentPath(path);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('intent:nav.goto', { detail: { path, ...p } }));
          }
        },
        external: (url) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('intent:nav.external', { detail: { url } }));
          }
        },
        back: () => { if (typeof window !== 'undefined') window.history.back(); },
        scrollTo: (anchor) => {
          const targetId = anchor.startsWith('#') ? anchor.slice(1) : anchor;
          const el = document.getElementById(targetId) || document.querySelector(`[data-section="${targetId}"]`);
          el?.scrollIntoView({ behavior: 'smooth' });
        },
      },
      overlay: {
        open: (id, overlayPayload) => {
          if (id === 'cart') {
            openBrowserCartOverlay(
              {
                businessId,
                siteId,
                sessionId,
              },
              overlayPayload,
            );
            return;
          }

          if (typeof window !== 'undefined') {
            window.postMessage({ type: 'OVERLAY_OPEN', overlayId: id, payload: overlayPayload }, '*');
          }
        },
        close: (id) => {
          if (id === 'cart' || !id) {
            closeBrowserCartOverlay();
            return;
          }

          if (typeof window !== 'undefined') {
            window.postMessage({ type: 'OVERLAY_CLOSE', overlayId: id }, '*');
          }
        },
        isOpen: () => false,
      },
      cart: cartManager,
    },
  };
}

/**
 * Adapt IntentExecutor result (ok-based) to IntentRouter result (success-based)
 */
function adaptExecutorResult(result: import('./intentExecutor').IntentResult): IntentResult {
  return {
    success: result.ok,
    data: result.data,
    error: result.error?.message,
    message: result.toast?.message,
    ui: result.ui ? {
      openModal: result.ui.openModal,
      navigate: result.ui.navigate,
      toast: result.toast ? { type: result.toast.type === 'warning' ? 'info' as const : result.toast.type, message: result.toast.message } : undefined,
    } : undefined,
  };
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
  return isActionIntent(intent) && CANONICAL_ACTION_INTENTS.has(intent);
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
  return CANONICAL_ACTION_INTENTS.has(intent) ? 'intent-exec' : null;
}

// Export for use in templates and AI assistant
export const AVAILABLE_INTENTS = getAvailableIntents();
export const INTENT_PACKS = {
  leads: ['contact.submit', 'newsletter.subscribe', 'quote.request'],
  booking: ['booking.create'],
  payments: ['pay.checkout', 'pay.success', 'pay.cancel'],
  navigation: ['nav.goto', 'nav.anchor', 'nav.external'],
};
