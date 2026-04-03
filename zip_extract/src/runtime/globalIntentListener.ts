/**
 * Global Intent Listener
 * 
 * Provides automatic button-to-intent wiring without requiring custom components.
 * Attaches a single click listener that:
 * 1. Detects clicks on buttons and anchors
 * 2. Reads data-ut-intent (preferred) / data-intent (legacy) OR infers intent from label text
 * 3. Collects payload from data-* attributes and form context
 * 4. Routes to the intent handler
 * 
 * This allows existing templates to work without any modifications.
 */

import { handleIntent, IntentPayload } from './intentRouter';
import { isCoreIntent, isNavIntent, isPayIntent, type CoreIntent } from '@/coreIntents';
import { matchLabelToIntent, TemplateCategory } from './templateIntentConfig';
import { 
  findFormForIntent, 
  scrollToForm, 
  determinePipelineAction, 
  getPipelineConfig 
} from './intentPipeline';

// ============================================================================
// Types
// ============================================================================

export interface GlobalListenerConfig {
  /** Template category for better intent inference */
  category?: TemplateCategory;
  /** Business ID to include in all payloads */
  businessId?: string;
  /** Template/page ID for analytics */
  templateId?: string;
  /** Workspace ID for context */
  workspaceId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Callback when intent is triggered */
  onIntentTriggered?: (intent: string, payload: IntentPayload, result: unknown) => void;
  /** Callback when intent fails */
  onIntentError?: (intent: string, error: string) => void;
  /** Callback when navigation intent is triggered (for preview mode routing) */
  onNavigate?: (type: 'goto' | 'external' | 'anchor', target: string) => void;
  /** Show visual feedback (loading states, toasts) */
  showFeedback?: boolean;
  /** Debug mode - logs all clicks */
  debug?: boolean;
}

interface ListenerState {
  active: boolean;
  config: GlobalListenerConfig;
  cleanup: (() => void) | null;
}

// ============================================================================
// Module State
// ============================================================================

const state: ListenerState = {
  active: false,
  config: {},
  cleanup: null,
};

// ============================================================================
// Intent Inference
// ============================================================================

/**
 * Infer intent from button/anchor text
 */
function inferIntentFromText(text: string, category?: TemplateCategory): string | null {
  if (!text || text.trim().length === 0) return null;
  
  const config = matchLabelToIntent(text, category);
  return config?.intent || null;
}

/**
 * Check if element should be ignored (has data-intent="none" or similar)
 */
function shouldIgnoreElement(el: HTMLElement): boolean {
  const intent = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
  if (intent === 'none' || intent === 'ignore' || intent === 'false') {
    return true;
  }
  
  // Ignore elements marked as non-interactive
  if (el.hasAttribute('data-no-intent')) {
    return true;
  }
  
  // Check for nav intents - these should NOT be ignored even if they have href
  const explicitIntent = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
  if (explicitIntent?.startsWith('nav.')) {
    return false; // Never ignore explicit nav intents
  }
  
  // Ignore navigation links that are external or download (unless they have nav intent)
  if (el.tagName === 'A') {
    const href = el.getAttribute('href');
    // Allow links with data-ut-path, data-ut-url, data-ut-anchor (nav intent markers)
    if (el.hasAttribute('data-ut-path') || el.hasAttribute('data-ut-url') || el.hasAttribute('data-ut-anchor')) {
      return false;
    }
    if (href?.startsWith('http') || href?.startsWith('//') || el.hasAttribute('download')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect navigation intent from element attributes
 * Returns { intent, target } if nav intent found, null otherwise
 */
function detectNavIntent(el: HTMLElement): { intent: string; target: string } | null {
  const explicitIntent = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
  
  // Explicit nav intent with payload attributes
  if (explicitIntent === 'nav.goto') {
    const path = el.getAttribute('data-ut-path') || el.getAttribute('href') || '/';
    return { intent: 'nav.goto', target: path };
  }
  if (explicitIntent === 'nav.external') {
    const url = el.getAttribute('data-ut-url') || el.getAttribute('href') || '';
    return { intent: 'nav.external', target: url };
  }
  if (explicitIntent === 'nav.anchor') {
    const anchor = el.getAttribute('data-ut-anchor') || el.getAttribute('href') || '';
    return { intent: 'nav.anchor', target: anchor };
  }
  
  // Infer nav intent from data attributes (without explicit intent)
  if (el.hasAttribute('data-ut-path')) {
    return { intent: 'nav.goto', target: el.getAttribute('data-ut-path')! };
  }
  if (el.hasAttribute('data-ut-url')) {
    return { intent: 'nav.external', target: el.getAttribute('data-ut-url')! };
  }
  if (el.hasAttribute('data-ut-anchor')) {
    return { intent: 'nav.anchor', target: el.getAttribute('data-ut-anchor')! };
  }
  
  // Infer from href for anchor elements
  if (el.tagName === 'A') {
    const href = el.getAttribute('href');
    if (href) {
      // Anchor scroll
      if (href.startsWith('#')) {
        return { intent: 'nav.anchor', target: href };
      }
      // External link
      if (href.startsWith('http') || href.startsWith('//')) {
        return { intent: 'nav.external', target: href };
      }
      // Internal route (starts with / but not //)
      if (href.startsWith('/') && !href.startsWith('//')) {
        return { intent: 'nav.goto', target: href };
      }
    }
  }
  
  return null;
}

/**
 * Detect payment intent from element attributes
 * Returns { intent, payload } if pay intent found, null otherwise
 */
function detectPayIntent(el: HTMLElement): { intent: string; payload: Record<string, unknown> } | null {
  const explicitIntent = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
  
  // Explicit pay.checkout intent
  if (explicitIntent === 'pay.checkout') {
    const priceId = el.getAttribute('data-ut-price_id') || el.getAttribute('data-ut-priceid') || el.getAttribute('data-price-id');
    const plan = el.getAttribute('data-ut-plan');
    return { 
      intent: 'pay.checkout', 
      payload: { 
        priceId: priceId || undefined, 
        plan: plan || undefined 
      } 
    };
  }
  
  if (explicitIntent === 'pay.success') {
    return { intent: 'pay.success', payload: {} };
  }
  
  if (explicitIntent === 'pay.cancel') {
    return { intent: 'pay.cancel', payload: {} };
  }
  
  // Infer pay intent from data attributes (without explicit intent)
  if (el.hasAttribute('data-ut-price_id') || el.hasAttribute('data-ut-priceid') || el.hasAttribute('data-price-id')) {
    const priceId = el.getAttribute('data-ut-price_id') || el.getAttribute('data-ut-priceid') || el.getAttribute('data-price-id');
    const plan = el.getAttribute('data-ut-plan');
    return { 
      intent: 'pay.checkout', 
      payload: { 
        priceId: priceId || undefined, 
        plan: plan || undefined 
      } 
    };
  }
  
  return null;
}

/**
 * Handle navigation intent execution
 */
function executeNavIntent(
  intent: string, 
  target: string, 
  config: GlobalListenerConfig
): void {
  if (config.debug) {
    console.log('[GlobalIntent] Navigation:', intent, target);
  }
  
  switch (intent) {
    case 'nav.goto':
      // Notify parent/handler about internal navigation
      if (config.onNavigate) {
        config.onNavigate('goto', target);
      } else {
        // Default: use window location for published sites
        window.location.href = target;
      }
      break;
      
    case 'nav.external':
      // Open external URLs in new tab
      if (config.onNavigate) {
        config.onNavigate('external', target);
      } else {
        window.open(target, '_blank', 'noopener,noreferrer');
      }
      break;
      
    case 'nav.anchor':
      // Smooth scroll to anchor
      if (config.onNavigate) {
        config.onNavigate('anchor', target);
      } else {
        const anchorId = target.startsWith('#') ? target.slice(1) : target;
        const element = document.getElementById(anchorId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Fallback: try hash navigation
          window.location.hash = target;
        }
      }
      break;
  }
}

/**
 * Decide whether we should infer an intent from the element's label text.
 *
 * Important: inference is intentionally conservative to avoid turning UI selectors
 * (filters, tabs, time slot pickers, etc.) into conversion actions.
 */
function shouldInferIntentFromElement(el: HTMLElement): boolean {
  // If it is explicitly wired, no need to infer.
  if (el.getAttribute('data-ut-intent') || el.getAttribute('data-intent')) return false;

  // Only infer for explicit CTA-marked elements.
  if (el.hasAttribute('data-ut-cta')) return true;

  // Anchors are often navigation CTAs.
  if (el.tagName === 'A') return true;

  // Submit buttons are typically conversion actions.
  if (el.tagName === 'BUTTON') {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'submit') return true;
  }

  return false;
}

// ============================================================================
// Payload Collection
// ============================================================================

/**
 * Collect payload from element's data-* attributes
 */
function collectDataAttributes(el: HTMLElement): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  
  // Get all data attributes except intent control attributes
  Array.from(el.attributes).forEach(attr => {
    if (
      attr.name.startsWith('data-') &&
      attr.name !== 'data-intent' &&
      attr.name !== 'data-ut-intent' &&
      attr.name !== 'data-no-intent'
    ) {
      // Convert data-product-id to productId
      const key = attr.name
        .replace('data-', '')
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Try to parse as JSON for complex values
      try {
        payload[key] = JSON.parse(attr.value);
      } catch {
        payload[key] = attr.value;
      }
    }
  });
  
  return payload;
}

/**
 * Collect form data if element is inside a form
 */
function collectFormData(el: HTMLElement): Record<string, unknown> | null {
  const form = el.closest('form');
  if (!form) return null;
  
  const formData = new FormData(form);
  const payload: Record<string, string> = {};
  
  formData.forEach((value, key) => {
    if (typeof value === 'string') {
      payload[key] = value;
    }
  });
  
  // Also collect form's data attributes
  const formAttrs = collectDataAttributes(form);
  
  return { ...formAttrs, ...payload };
}

/**
 * Collect complete payload for an element
 */
function collectPayload(el: HTMLElement, config: GlobalListenerConfig): IntentPayload {
  // Start with data attributes from the element
  const elementData = collectDataAttributes(el);
  
  // Add form data if inside a form
  const formData = collectFormData(el);
  
  // Merge with global context
  const payload: IntentPayload = {
    ...elementData,
    ...(formData || {}),
  };
  
  // Add global context
  if (config.businessId) payload.businessId = config.businessId;
  if (config.templateId) payload.templateId = config.templateId;
  if (config.workspaceId) payload.workspaceId = config.workspaceId;
  if (config.userId) payload.userId = config.userId;
  
  // Add element context
  payload._source = {
    tagName: el.tagName,
    id: el.id || undefined,
    className: el.className || undefined,
    text: el.textContent?.trim().substring(0, 100),
  };
  
  return payload;
}

// ============================================================================
// Visual Feedback
// ============================================================================

/**
 * Show loading state on element
 */
function showLoading(el: HTMLElement): () => void {
  const originalText = el.textContent;
  const originalDisabled = (el as HTMLButtonElement).disabled;
  
  el.classList.add('intent-loading');
  (el as HTMLButtonElement).disabled = true;
  
  // Add spinner if possible
  if (el.tagName === 'BUTTON') {
    const spinner = document.createElement('span');
    spinner.className = 'intent-spinner';
    spinner.innerHTML = '⏳ ';
    el.prepend(spinner);
  }
  
  return () => {
    el.classList.remove('intent-loading');
    (el as HTMLButtonElement).disabled = originalDisabled;
    const spinner = el.querySelector('.intent-spinner');
    if (spinner) spinner.remove();
  };
}

/**
 * Show success feedback
 */
function showSuccess(el: HTMLElement): void {
  el.classList.add('intent-success');
  setTimeout(() => el.classList.remove('intent-success'), 2000);
}

/**
 * Show error feedback
 */
function showError(el: HTMLElement): void {
  el.classList.add('intent-error');
  setTimeout(() => el.classList.remove('intent-error'), 2000);
}

// ============================================================================
// Click Handler
// ============================================================================

/**
 * Main click handler - processes all clicks and routes to intents
 */
async function handleClick(e: MouseEvent, config: GlobalListenerConfig): Promise<void> {
  // Find the nearest button or anchor
  const el = (e.target as HTMLElement).closest('button, a, [role="button"], [data-ut-intent], [data-intent]') as HTMLElement | null;
  
  if (!el) return;
  
  // Check if should be ignored
  if (shouldIgnoreElement(el)) {
    if (config.debug) {
      console.log('[GlobalIntent] Ignoring element:', el);
    }
    return;
  }
  
  // PRIORITY: Check for navigation intents first
  const navIntent = detectNavIntent(el);
  if (navIntent) {
    e.preventDefault();
    e.stopPropagation();
    executeNavIntent(navIntent.intent, navIntent.target, config);
    return;
  }
  
  // Get intent - prefer explicit data-ut-intent, fallback to legacy data-intent, then inference
  let intent = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
  
  if (!intent) {
    if (shouldInferIntentFromElement(el)) {
      const text = el.textContent || el.getAttribute('aria-label') || '';
      intent = inferIntentFromText(text, config.category);
    }
  }
  
  if (!intent) {
    if (config.debug) {
      console.log('[GlobalIntent] No intent found for:', el.textContent?.trim());
    }
    return;
  }
  
  // Validate intent exists (non-core = preview-only)
  if (!isCoreIntent(intent)) {
    if (config.debug) {
      console.log('[GlobalIntent] Unsupported (non-core) intent:', intent);
    }
    // Still emit custom event for potential local handling
    window.dispatchEvent(new CustomEvent(`intent:${intent}`, { 
      detail: collectPayload(el, config) 
    }));
    return;
  }
  
  // Prevent default behavior for handled intents
  e.preventDefault();
  e.stopPropagation();
  
  if (config.debug) {
    console.log('[GlobalIntent] Handling intent:', intent);
  }
  
  // Collect payload
  const payload = collectPayload(el, config);
  
  // Check if we're inside a form context
  const form = el.closest('form');
  const hasFormContext = !!form;
  
  // =========================================================================
  // PIPELINE-AWARE ROUTING
  // Determine the correct action based on pipeline config
  // =========================================================================
  try {
    const action = determinePipelineAction(intent as CoreIntent, hasFormContext, config.category);
    
    if (config.debug) {
      console.log('[GlobalIntent] Pipeline action:', action);
    }
    
    switch (action.action) {
      case 'scroll': {
        // Try to scroll to form on page
        const scrolled = scrollToForm(intent);
        if (scrolled) {
          showSuccess(el);
          return;
        }
        // Fall through to redirect if scroll failed
      }
      // falls through
      
      case 'redirect': {
        // Redirect to target page
        const target = action.target || '/';
        if (config.onNavigate) {
          config.onNavigate('goto', target);
        } else {
          // Pass intent context via URL params
          const url = new URL(target, window.location.origin);
          url.searchParams.set('intent', intent);
          if (payload.service) url.searchParams.set('service', String(payload.service));
          if (payload.serviceId) url.searchParams.set('serviceId', String(payload.serviceId));
          window.location.href = url.toString();
        }
        return;
      }
      
      case 'modal':
      case 'confirm': {
        // Dispatch to pipeline provider for modal/confirm handling
        window.dispatchEvent(new CustomEvent('pipeline:execute', {
          detail: { intent, payload }
        }));
        return;
      }
      
      case 'execute':
      default:
        // Continue to execute directly below
        break;
    }
  } catch {
    // Intent not in CoreIntent registry, fall through to direct execution
  }
  
  // =========================================================================
  // DIRECT EXECUTION (autorun mode or fallback)
  // =========================================================================
  
  // Show loading feedback
  let clearLoading: (() => void) | null = null;
  if (config.showFeedback !== false) {
    clearLoading = showLoading(el);
  }
  
  try {
    // Handle the intent
    const result = await handleIntent(intent, payload);
    
    // Clear loading
    if (clearLoading) clearLoading();
    
    if (result.success) {
      if (config.showFeedback !== false) {
        showSuccess(el);
      }
      // Show success toast from pipeline config
      try {
        const pipelineConfig = getPipelineConfig(intent as CoreIntent, config.category);
        if (pipelineConfig.successMessage) {
          // Dispatch toast event for any listener
          window.dispatchEvent(new CustomEvent('intent:success', {
            detail: { intent, message: pipelineConfig.successMessage }
          }));
        }
      } catch {
        // Not a core intent, no toast
      }
      config.onIntentTriggered?.(intent, payload, result.data);
    } else {
      if (config.showFeedback !== false) {
        showError(el);
      }
      config.onIntentError?.(intent, result.error || 'Unknown error');
    }
  } catch (error) {
    // Clear loading
    if (clearLoading) clearLoading();
    
    if (config.showFeedback !== false) {
      showError(el);
    }
    config.onIntentError?.(intent, error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// Form Submit Handler
// ============================================================================

/**
 * Handle form submissions
 */
async function handleFormSubmit(e: SubmitEvent, config: GlobalListenerConfig): Promise<void> {
  const form = e.target as HTMLFormElement;
  if (!form) return;
  
  // Get intent from form
  let intent = form.getAttribute('data-ut-intent') || form.getAttribute('data-intent');
  
  // If no form intent, check submit button
  if (!intent) {
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
    if (submitButton) {
      intent = submitButton.getAttribute('data-ut-intent') || submitButton.getAttribute('data-intent');
      if (!intent) {
        const text = submitButton.textContent || submitButton.getAttribute('value') || '';
        intent = inferIntentFromText(text, config.category);
      }
    }
  }
  
  // Default form intents based on form patterns
  if (!intent) {
    const formId = form.id?.toLowerCase() || '';
    const formClass = form.className?.toLowerCase() || '';
    const formAction = form.action?.toLowerCase() || '';
    
    if (formId.includes('contact') || formClass.includes('contact')) {
      intent = 'contact.submit';
    } else if (formId.includes('newsletter') || formClass.includes('newsletter') || formClass.includes('subscribe') || formId.includes('waitlist') || formClass.includes('waitlist')) {
      // Locked intent surface: waitlist/beta/etc map to newsletter.subscribe
      intent = 'newsletter.subscribe';
    } else if (formId.includes('booking') || formClass.includes('booking') || formId.includes('reservation')) {
      intent = 'booking.create';
    } else if (formId.includes('quote') || formClass.includes('quote')) {
      intent = 'quote.request';
    }
  }
  
  if (!intent || !isCoreIntent(intent)) {
    if (config.debug) {
      console.log('[GlobalIntent] No valid intent for form:', form);
    }
    return; // Let form submit normally
  }
  
  // Prevent default form submission
  e.preventDefault();
  
  if (config.debug) {
    console.log('[GlobalIntent] Handling form intent:', intent);
  }
  
  // Collect payload from form
  const formData = new FormData(form);
  const payload: IntentPayload = {
    ...collectDataAttributes(form),
  };
  
  formData.forEach((value, key) => {
    if (typeof value === 'string') {
      payload[key] = value;
    }
  });
  
  // Add global context
  if (config.businessId) payload.businessId = config.businessId;
  if (config.templateId) payload.templateId = config.templateId;
  
  // Find submit button for feedback
  const submitButton = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
  
  let clearLoading: (() => void) | null = null;
  if (submitButton && config.showFeedback !== false) {
    clearLoading = showLoading(submitButton);
  }
  
  try {
    const result = await handleIntent(intent, payload);
    
    if (clearLoading) clearLoading();
    
    if (result.success) {
      if (submitButton && config.showFeedback !== false) {
        showSuccess(submitButton);
      }
      // Reset form on success
      form.reset();
      config.onIntentTriggered?.(intent, payload, result.data);
    } else {
      if (submitButton && config.showFeedback !== false) {
        showError(submitButton);
      }
      config.onIntentError?.(intent, result.error || 'Unknown error');
    }
  } catch (error) {
    if (clearLoading) clearLoading();
    if (submitButton && config.showFeedback !== false) {
      showError(submitButton);
    }
    config.onIntentError?.(intent, error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// CSS Injection
// ============================================================================

/**
 * Inject CSS for visual feedback
 */
function injectStyles(doc: Document): void {
  const styleId = 'global-intent-styles';
  if (doc.getElementById(styleId)) return;
  
  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
    .intent-loading {
      opacity: 0.7;
      pointer-events: none;
      position: relative;
    }
    .intent-loading::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: intent-spin 0.6s linear infinite;
    }
    .intent-spinner {
      display: inline-block;
      animation: intent-spin 0.6s linear infinite;
    }
    .intent-success {
      animation: intent-pulse-success 0.3s ease-out;
    }
    .intent-error {
      animation: intent-shake 0.3s ease-out;
    }
    @keyframes intent-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes intent-pulse-success {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    @keyframes intent-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `;
  doc.head.appendChild(style);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Install the global intent listener on a document
 * Can be used on main document or iframe contentDocument
 */
export function installGlobalIntentListener(
  doc: Document = document,
  config: GlobalListenerConfig = {}
): () => void {
  // Store config
  state.config = config;
  
  // Inject styles
  injectStyles(doc);
  
  // Create handlers bound to config
  const clickHandler = (e: MouseEvent) => handleClick(e, config);
  const submitHandler = (e: SubmitEvent) => handleFormSubmit(e, config);
  
  // Add listeners with capture to intercept before other handlers
  doc.addEventListener('click', clickHandler, { capture: true });
  doc.addEventListener('submit', submitHandler as EventListener, { capture: true });
  
  if (config.debug) {
    console.log('[GlobalIntent] Listener installed on document');
  }
  
  state.active = true;
  
  // Return cleanup function
  const cleanup = () => {
    doc.removeEventListener('click', clickHandler, { capture: true });
    doc.removeEventListener('submit', submitHandler as EventListener, { capture: true });
    state.active = false;
    if (config.debug) {
      console.log('[GlobalIntent] Listener removed from document');
    }
  };
  
  state.cleanup = cleanup;
  return cleanup;
}

/**
 * Update listener configuration without reinstalling
 */
export function updateListenerConfig(updates: Partial<GlobalListenerConfig>): void {
  state.config = { ...state.config, ...updates };
}

/**
 * Check if listener is currently active
 */
export function isListenerActive(): boolean {
  return state.active;
}

/**
 * Remove the global listener
 */
export function removeGlobalIntentListener(): void {
  if (state.cleanup) {
    state.cleanup();
    state.cleanup = null;
  }
}

/**
 * Generate script content for injection into iframes/previews
 * This creates a standalone script that can work without imports
 */
export function generateIntentListenerScript(config: GlobalListenerConfig = {}): string {
  return `
<script>
(function() {
  // Intent Listener - Auto-wires buttons to backend
  const CONFIG = ${JSON.stringify(config)};
  
  // Label to intent mapping
  const LABEL_INTENTS = {
    'subscribe': 'newsletter.subscribe',
    'get updates': 'newsletter.subscribe',
    'join waitlist': 'newsletter.subscribe',
    'contact': 'contact.submit',
    'contact us': 'contact.submit',
    'get in touch': 'contact.submit',
    'send message': 'contact.submit',
    'book now': 'booking.create',
    'reserve': 'booking.create',
    'reserve table': 'booking.create',
    'get quote': 'quote.request',
    'request quote': 'quote.request',
    'free estimate': 'quote.request'
  };
  
  function inferIntent(text) {
    if (!text) return null;
    const lower = text.toLowerCase().trim();
    if (LABEL_INTENTS[lower]) return LABEL_INTENTS[lower];
    for (const [key, intent] of Object.entries(LABEL_INTENTS)) {
      if (lower.includes(key) || key.includes(lower)) return intent;
    }
    return null;
  }
  
  function collectPayload(el) {
    const payload = {};
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-') && attr.name !== 'data-intent' && attr.name !== 'data-ut-intent') {
        const key = attr.name.replace('data-', '').replace(/-([a-z])/g, (_, l) => l.toUpperCase());
        try { payload[key] = JSON.parse(attr.value); } catch { payload[key] = attr.value; }
      }
    });
    const form = el.closest('form');
    if (form) {
      new FormData(form).forEach((v, k) => { if (typeof v === 'string') payload[k] = v; });
    }
    if (CONFIG.businessId) payload.businessId = CONFIG.businessId;
    if (CONFIG.templateId) payload.templateId = CONFIG.templateId;
    return payload;
  }
  
  async function handleIntent(intent, payload) {
    console.log('[Intent] Triggering:', intent, payload);
    
    // Post message to parent window for handling
    window.parent.postMessage({
      type: 'INTENT_TRIGGER',
      intent: intent,
      payload: payload
    }, '*');
    
    return { success: true };
  }
  
  document.addEventListener('click', async function(e) {
    const el = e.target.closest('button, a, [role="button"], [data-ut-intent], [data-intent]');
    if (!el) return;
    
    const intentAttr = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
    if (intentAttr === 'none' || intentAttr === 'ignore') return;
    
    let intent = intentAttr || inferIntent(el.textContent || el.getAttribute('aria-label'));
    if (!intent) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    el.classList.add('intent-loading');
    el.disabled = true;
    
    try {
      await handleIntent(intent, collectPayload(el));
      el.classList.remove('intent-loading');
      el.classList.add('intent-success');
      el.disabled = false;
      setTimeout(() => el.classList.remove('intent-success'), 2000);
    } catch (err) {
      el.classList.remove('intent-loading');
      el.classList.add('intent-error');
      el.disabled = false;
      setTimeout(() => el.classList.remove('intent-error'), 2000);
    }
  }, { capture: true });
  
  document.addEventListener('submit', async function(e) {
    const form = e.target;
    if (!form) return;
    
    let intent = form.getAttribute('data-ut-intent') || form.getAttribute('data-intent');
    if (!intent) {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) intent = btn.getAttribute('data-ut-intent') || btn.getAttribute('data-intent') || inferIntent(btn.textContent);
    }
    if (!intent) {
      const id = (form.id || '').toLowerCase();
      const cls = (form.className || '').toLowerCase();
       if (id.includes('contact') || cls.includes('contact')) intent = 'contact.submit';
       else if (id.includes('newsletter') || cls.includes('subscribe') || id.includes('waitlist')) intent = 'newsletter.subscribe';
       else if (id.includes('booking') || id.includes('reservation')) intent = 'booking.create';
       else if (id.includes('quote')) intent = 'quote.request';
    }
    
    if (!intent) return;
    
    e.preventDefault();
    
    const payload = {};
    new FormData(form).forEach((v, k) => { if (typeof v === 'string') payload[k] = v; });
    if (CONFIG.businessId) payload.businessId = CONFIG.businessId;
    if (CONFIG.templateId) payload.templateId = CONFIG.templateId;
    
    try {
      await handleIntent(intent, payload);
      form.reset();
    } catch (err) {
      console.error('[Intent] Form error:', err);
    }
  }, { capture: true });
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = \`
    .intent-loading { opacity: 0.7; pointer-events: none; }
    .intent-success { animation: intent-pulse 0.3s; }
    .intent-error { animation: intent-shake 0.3s; }
    @keyframes intent-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    @keyframes intent-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
  \`;
  document.head.appendChild(style);
  
  console.log('[Intent] Global listener installed');
})();
</script>
`;
}

export default {
  installGlobalIntentListener,
  removeGlobalIntentListener,
  updateListenerConfig,
  isListenerActive,
  generateIntentListenerScript,
};
