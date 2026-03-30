/**
 * SandpackIntentBridge - Button Intent Handler System for Sandpack Integration
 * 
 * This module provides a comprehensive system for handling button clicks in Sandpack
 * previews and routing them to the appropriate intent handlers. It intercepts clicks,
 * resolves intents from element context, and communicates with the parent frame.
 * 
 * Features:
 * - Comprehensive button pattern recognition
 * - Intent normalization via alias system
 * - ProjectSetup navigation for business configuration
 * - Form submission handling
 * - Multi-page VFS navigation
 * - External link routing
 * 
 * Architecture:
 * ```
 * Sandpack Preview (iframe)
 *   ↓ click event
 * SandpackIntentBridge.handleClick()
 *   ↓ resolveIntent()
 * ButtonPatternMatcher
 *   ↓ matched intent
 * postMessage to parent
 *   ↓
 * SimplePreview/WebBuilder
 *   ↓ executeIntent()
 * IntentRouter → Action
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface ButtonIntentConfig {
  /** Pattern to match against button text/label */
  pattern: RegExp;
  /** The intent to trigger */
  intent: string;
  /** Default payload for this intent */
  payload?: Record<string, unknown>;
  /** Confidence score 0-1 */
  confidence: number;
  /** Category for grouping */
  category: ButtonIntentCategory;
}

export type ButtonIntentCategory = 
  | 'navigation'
  | 'auth'
  | 'commerce'
  | 'booking'
  | 'contact'
  | 'content'
  | 'social'
  | 'settings'
  | 'overlay';

export interface ResolvedButtonIntent {
  intent: string;
  payload: Record<string, unknown>;
  confidence: number;
  category: ButtonIntentCategory;
  source: 'explicit' | 'href' | 'pattern' | 'inference';
}

export interface IntentBridgeConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Business ID for context */
  businessId?: string;
  /** Project ID for context */
  projectId?: string;
  /** Site ID for context */
  siteId?: string;
  /** Custom intent handlers (run before postMessage) */
  localHandlers?: Map<string, (payload: Record<string, unknown>) => boolean>;
  /** Callback when intent is triggered */
  onIntentTrigger?: (intent: string, payload: Record<string, unknown>) => void;
}

// ============================================================================
// Button Intent Patterns
// ============================================================================

/**
 * Comprehensive button pattern mappings for intent resolution.
 * Ordered by priority (more specific patterns first).
 */
export const BUTTON_INTENT_PATTERNS: ButtonIntentConfig[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION & ACCOUNT
  // ─────────────────────────────────────────────────────────────────────────
  { pattern: /^(sign|log)\s*in$/i, intent: 'auth.signin', confidence: 1, category: 'auth' },
  { pattern: /^login$/i, intent: 'auth.signin', confidence: 1, category: 'auth' },
  { pattern: /^(sign|create)\s*(up|account)$/i, intent: 'auth.signup', confidence: 1, category: 'auth' },
  { pattern: /^register$/i, intent: 'auth.signup', confidence: 1, category: 'auth' },
  { pattern: /^(sign|log)\s*out$/i, intent: 'auth.signout', confidence: 1, category: 'auth' },
  { pattern: /^logout$/i, intent: 'auth.signout', confidence: 1, category: 'auth' },
  { pattern: /^(my\s+)?account$/i, intent: 'auth.account', confidence: 0.9, category: 'auth' },
  { pattern: /^(my\s+)?profile$/i, intent: 'auth.profile', confidence: 0.9, category: 'auth' },
  { pattern: /^(my\s+)?dashboard$/i, intent: 'nav.goto', confidence: 0.9, category: 'navigation', payload: { path: '/dashboard' } },
  { pattern: /^forgot\s+password$/i, intent: 'auth.reset', confidence: 1, category: 'auth' },
  
  // ─────────────────────────────────────────────────────────────────────────
  // COMMERCE & CART
  // ─────────────────────────────────────────────────────────────────────────
  { pattern: /^add\s+to\s+cart$/i, intent: 'cart.add', confidence: 1, category: 'commerce' },
  { pattern: /^add\s+to\s+bag$/i, intent: 'cart.add', confidence: 1, category: 'commerce' },
  { pattern: /^(view|go\s+to)\s+cart$/i, intent: 'cart.view', confidence: 1, category: 'commerce' },
  { pattern: /^(my\s+)?cart$/i, intent: 'cart.view', confidence: 0.9, category: 'commerce' },
  { pattern: /^checkout$/i, intent: 'checkout.start', confidence: 1, category: 'commerce' },
  { pattern: /^(proceed\s+to|go\s+to)\s+checkout$/i, intent: 'checkout.start', confidence: 1, category: 'commerce' },
  { pattern: /^buy\s+now$/i, intent: 'checkout.buy', confidence: 1, category: 'commerce' },
  { pattern: /^purchase$/i, intent: 'checkout.buy', confidence: 0.95, category: 'commerce' },
  { pattern: /^pay\s+now$/i, intent: 'pay.checkout', confidence: 1, category: 'commerce' },
  { pattern: /^complete\s+(order|purchase)$/i, intent: 'checkout.complete', confidence: 1, category: 'commerce' },
  { pattern: /^place\s+order$/i, intent: 'checkout.complete', confidence: 1, category: 'commerce' },
  { pattern: /^shop\s+now$/i, intent: 'nav.goto', confidence: 0.95, category: 'commerce', payload: { path: '/shop' } },
  { pattern: /^(browse|view)\s+(products?|collection|shop)$/i, intent: 'nav.goto', confidence: 0.9, category: 'commerce', payload: { path: '/products' } },
  { pattern: /^(view|see)\s+all$/i, intent: 'nav.goto', confidence: 0.85, category: 'commerce', payload: { path: '/products' } },
  { pattern: /^explore\s+(collection|products?)$/i, intent: 'nav.goto', confidence: 0.85, category: 'commerce', payload: { path: '/products' } },
  
  // ─────────────────────────────────────────────────────────────────────────
  // BOOKING & SCHEDULING
  // ─────────────────────────────────────────────────────────────────────────
  { pattern: /^book\s+(now|appointment|session|call|demo)$/i, intent: 'booking.create', confidence: 1, category: 'booking' },
  { pattern: /^book\s+a?\s*(table|reservation)$/i, intent: 'booking.create', confidence: 1, category: 'booking', payload: { type: 'table' } },
  { pattern: /^schedule\s+(a?\s*)?(call|meeting|consultation|demo)$/i, intent: 'booking.create', confidence: 1, category: 'booking' },
  { pattern: /^(make|set)\s+appointment$/i, intent: 'booking.create', confidence: 1, category: 'booking' },
  { pattern: /^reserve\s+(now|a?\s*spot|table|seat)$/i, intent: 'booking.create', confidence: 1, category: 'booking' },
  { pattern: /^(view|my)\s+bookings?$/i, intent: 'booking.list', confidence: 0.95, category: 'booking' },
  { pattern: /^(view|my)\s+appointments?$/i, intent: 'booking.list', confidence: 0.95, category: 'booking' },
  { pattern: /^manage\s+bookings?$/i, intent: 'booking.manage', confidence: 0.95, category: 'booking' },
  { pattern: /^cancel\s+(booking|appointment|reservation)$/i, intent: 'booking.cancel', confidence: 0.95, category: 'booking' },
  { pattern: /^reschedule$/i, intent: 'booking.reschedule', confidence: 0.9, category: 'booking' },
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONTACT & LEAD CAPTURE
  // ─────────────────────────────────────────────────────────────────────────
  { pattern: /^contact\s*(us)?$/i, intent: 'overlay.open', confidence: 1, category: 'contact', payload: { type: 'contact' } },
  { pattern: /^(get\s+in\s+)?touch$/i, intent: 'overlay.open', confidence: 0.95, category: 'contact', payload: { type: 'contact' } },
  { pattern: /^send\s+(us\s+a\s+)?message$/i, intent: 'overlay.open', confidence: 0.95, category: 'contact', payload: { type: 'contact' } },
  { pattern: /^(request|get)\s+(a?\s*)?(free\s+)?quote$/i, intent: 'quote.request', confidence: 1, category: 'contact' },
  { pattern: /^(request|get)\s+(a?\s*)?consultation$/i, intent: 'booking.create', confidence: 0.95, category: 'booking', payload: { type: 'consultation' } },
  { pattern: /^subscribe$/i, intent: 'newsletter.subscribe', confidence: 1, category: 'contact' },
  { pattern: /^(newsletter|updates?)\s*(subscribe|sign\s*up)?$/i, intent: 'newsletter.subscribe', confidence: 0.95, category: 'contact' },
  { pattern: /^join\s+waitlist$/i, intent: 'lead.capture', confidence: 1, category: 'contact', payload: { type: 'waitlist' } },
  { pattern: /^(notify|tell)\s*me$/i, intent: 'lead.capture', confidence: 0.9, category: 'contact' },
  { pattern: /^(early|beta)\s+access$/i, intent: 'lead.capture', confidence: 0.9, category: 'contact', payload: { type: 'beta' } },
  { pattern: /^download\s+(guide|ebook|resource|pdf)$/i, intent: 'lead.capture', confidence: 0.85, category: 'contact', payload: { type: 'download' } },
  
  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION & CONTENT
  // ─────────────────────────────────────────────────────────────────────────
  { pattern: /^(learn|read)\s+more$/i, intent: 'nav.anchor', confidence: 0.85, category: 'content', payload: { anchor: 'features' } },
  { pattern: /^see\s+details$/i, intent: 'nav.goto', confidence: 0.85, category: 'content', payload: { path: '/details' } },
  { pattern: /^view\s+details$/i, intent: 'nav.goto', confidence: 0.85, category: 'content', payload: { path: '/details' } },
  { pattern: /^get\s+started$/i, intent: 'nav.goto', confidence: 0.9, category: 'navigation', payload: { path: '/signup' } },
  { pattern: /^start\s+(free\s+)?trial$/i, intent: 'nav.goto', confidence: 0.9, category: 'navigation', payload: { path: '/signup' } },
  { pattern: /^join\s+(now|us)$/i, intent: 'auth.signup', confidence: 0.85, category: 'auth' },
  { pattern: /^(see|view)\s+pricing$/i, intent: 'nav.anchor', confidence: 0.9, category: 'navigation', payload: { anchor: 'pricing' } },
  { pattern: /^(view|compare)\s+plans?$/i, intent: 'nav.anchor', confidence: 0.9, category: 'navigation', payload: { anchor: 'pricing' } },
  { pattern: /^(view|see)\s+(our\s+)?(work|portfolio)$/i, intent: 'nav.anchor', confidence: 0.9, category: 'content', payload: { anchor: 'work' } },
  { pattern: /^(view|see)\s+case\s+stud(y|ies)$/i, intent: 'nav.goto', confidence: 0.9, category: 'content', payload: { path: '/case-studies' } },
  { pattern: /^(see|view)\s+menu$/i, intent: 'nav.anchor', confidence: 0.9, category: 'content', payload: { anchor: 'menu' } },
  { pattern: /^(view|watch)\s+(demo|video)$/i, intent: 'overlay.open', confidence: 0.85, category: 'content', payload: { type: 'video' } },
  
  // ─────────────────────────────────────────────────────────────────────────
  // PROJECT SETUP NAVIGATION (for Unison Tasks)
  // ─────────────────────────────────────────────────────────────────────────
  { pattern: /^(setup|configure)\s+payments?$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'payments' } },
  { pattern: /^connect\s+stripe$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'payments' } },
  { pattern: /^(setup|configure)\s+database$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'database' } },
  { pattern: /^connect\s+supabase$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'database' } },
  { pattern: /^(setup|configure)\s+email$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'email' } },
  { pattern: /^connect\s+resend$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'email' } },
  { pattern: /^(setup|configure)\s+calendar$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'calendar' } },
  { pattern: /^connect\s+google\s+calendar$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'calendar' } },
  { pattern: /^(setup|configure)\s+content$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'content' } },
  { pattern: /^(setup|configure)\s+cms$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'content' } },
  { pattern: /^(setup|configure)\s+domain$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'domain' } },
  { pattern: /^connect\s+domain$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'domain' } },
  { pattern: /^(setup|configure)\s+analytics$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'analytics' } },
  { pattern: /^connect\s+google\s+analytics$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'analytics' } },
  { pattern: /^(setup|configure)\s+automations?$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'automations' } },
  { pattern: /^connect\s+inngest$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'automations' } },
  { pattern: /^open\s+project\s+settings$/i, intent: 'setup.navigate', confidence: 1, category: 'settings', payload: { section: 'overview' } },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SOCIAL & COMMUNICATION
  // ─────────────────────────────────────────────────────────────────────────
  { pattern: /^call\s+(us|now)$/i, intent: 'comm.call', confidence: 1, category: 'social' },
  { pattern: /^(email|mail)\s+us$/i, intent: 'comm.email', confidence: 1, category: 'social' },
  { pattern: /^share$/i, intent: 'social.share', confidence: 0.9, category: 'social' },
  { pattern: /^tweet$/i, intent: 'social.share', confidence: 0.95, category: 'social', payload: { platform: 'twitter' } },
  { pattern: /^follow\s+(us)?$/i, intent: 'social.follow', confidence: 0.9, category: 'social' },
  { pattern: /^(connect|follow)\s+on\s+/i, intent: 'social.follow', confidence: 0.9, category: 'social' },
  
  // ─────────────────────────────────────────────────────────────────────────
  // OVERLAY & MODAL TRIGGERS
  // ─────────────────────────────────────────────────────────────────────────
  { pattern: /^(open|show)\s+modal$/i, intent: 'overlay.open', confidence: 0.8, category: 'overlay' },
  { pattern: /^(close|dismiss)$/i, intent: 'overlay.close', confidence: 0.85, category: 'overlay' },
  { pattern: /^cancel$/i, intent: 'overlay.close', confidence: 0.7, category: 'overlay' },
  { pattern: /^(view|open)\s+gallery$/i, intent: 'overlay.open', confidence: 0.85, category: 'overlay', payload: { type: 'gallery' } },
  { pattern: /^(view|see)\s+(full\s+)?image$/i, intent: 'overlay.open', confidence: 0.8, category: 'overlay', payload: { type: 'lightbox' } },
  
  // ─────────────────────────────────────────────────────────────────────────
  // MISC / FALLBACKS
  // ─────────────────────────────────────────────────────────────────────────
  { pattern: /^explore$/i, intent: 'nav.anchor', confidence: 0.7, category: 'navigation', payload: { anchor: 'features' } },
  { pattern: /^discover$/i, intent: 'nav.anchor', confidence: 0.7, category: 'navigation', payload: { anchor: 'features' } },
  { pattern: /^continue$/i, intent: 'nav.next', confidence: 0.7, category: 'navigation' },
  { pattern: /^next$/i, intent: 'nav.next', confidence: 0.65, category: 'navigation' },
  { pattern: /^back$/i, intent: 'nav.back', confidence: 0.7, category: 'navigation' },
  { pattern: /^previous$/i, intent: 'nav.back', confidence: 0.7, category: 'navigation' },
  { pattern: /^submit$/i, intent: 'form.submit', confidence: 0.8, category: 'contact' },
  { pattern: /^(send|confirm)$/i, intent: 'form.submit', confidence: 0.75, category: 'contact' },
];

// ============================================================================
// Intent Bridge Class
// ============================================================================

export class SandpackIntentBridge {
  private config: IntentBridgeConfig;
  private root: HTMLElement | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private submitHandler: ((e: SubmitEvent) => void) | null = null;
  
  constructor(config: IntentBridgeConfig = {}) {
    this.config = config;
  }
  
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[SandpackIntentBridge]', ...args);
    }
  }
  
  /**
   * Attach the bridge to a root element
   */
  attach(root: HTMLElement = document.body): void {
    if (this.root) this.detach();
    
    this.root = root;
    this.clickHandler = this.handleClick.bind(this);
    this.submitHandler = this.handleSubmit.bind(this);
    
    root.addEventListener('click', this.clickHandler, true);
    root.addEventListener('submit', this.submitHandler, true);
    
    this.log('Attached to', root.tagName);
  }
  
  /**
   * Detach from current root
   */
  detach(): void {
    if (this.root) {
      if (this.clickHandler) {
        this.root.removeEventListener('click', this.clickHandler, true);
      }
      if (this.submitHandler) {
        this.root.removeEventListener('submit', this.submitHandler, true);
      }
      this.root = null;
      this.clickHandler = null;
      this.submitHandler = null;
      this.log('Detached');
    }
  }
  
  /**
   * Main click handler
   */
  private async handleClick(e: MouseEvent): Promise<void> {
    const target = e.target as HTMLElement;
    
    // Find clickable element
    const clickable = this.findClickable(target);
    if (!clickable) return;
    
    // Check if we should handle
    if (!this.shouldHandle(clickable)) return;
    
    // Resolve intent
    const resolved = this.resolveIntent(clickable);
    if (!resolved) {
      this.log('No intent resolved for', clickable.textContent?.trim());
      return;
    }
    
    // Prevent default
    e.preventDefault();
    e.stopPropagation();
    
    this.log('Resolved:', resolved.intent, resolved.payload);
    
    // Check for local handlers first
    const handler = this.config.localHandlers?.get(resolved.intent);
    if (handler && handler(resolved.payload)) {
      this.log('Handled locally');
      return;
    }
    
    // Execute the intent
    await this.executeIntent(clickable, resolved);
  }
  
  /**
   * Form submission handler
   */
  private async handleSubmit(e: SubmitEvent): Promise<void> {
    const form = e.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    
    // Get intent from form or submit button
    let intent = form.getAttribute('data-ut-intent') || form.getAttribute('data-intent');
    if (!intent) {
      const submitBtn = form.querySelector('button[type="submit"], button:not([type])') as HTMLElement;
      if (submitBtn) {
        const resolved = this.resolveIntent(submitBtn);
        if (resolved) {
          intent = resolved.intent;
        }
      }
    }
    
    // Infer intent from form ID/class
    if (!intent) {
      const id = (form.id || '').toLowerCase();
      const className = (form.className || '').toLowerCase();
      const combined = `${id} ${className}`;
      
      if (/contact/.test(combined)) intent = 'contact.submit';
      else if (/newsletter|subscribe/.test(combined)) intent = 'newsletter.subscribe';
      else if (/waitlist/.test(combined)) intent = 'lead.capture';
      else if (/booking|reservation/.test(combined)) intent = 'booking.create';
      else if (/quote/.test(combined)) intent = 'quote.request';
      else if (/login|signin/.test(combined)) intent = 'auth.signin';
      else if (/signup|register/.test(combined)) intent = 'auth.signup';
    }
    
    if (!intent) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Collect form data
    const payload: Record<string, unknown> = {};
    const formData = new FormData(form);
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        payload[key] = value;
      }
    });
    
    this.log('Form submit:', intent, payload);
    
    // Post to parent
    this.postIntent(intent, payload);
    
    // Visual feedback
    const submitBtn = form.querySelector('button[type="submit"], button:not([type])') as HTMLElement;
    if (submitBtn) {
      submitBtn.classList.add('intent-loading');
      setTimeout(() => {
        submitBtn.classList.remove('intent-loading');
        submitBtn.classList.add('intent-success');
        setTimeout(() => submitBtn.classList.remove('intent-success'), 2000);
      }, 300);
    }
    
    // Reset form
    form.reset();
  }
  
  /**
   * Find the clickable element from the event target
   */
  private findClickable(target: HTMLElement): HTMLElement | null {
    return target.closest('a, button, [role="button"], [data-ut-intent], [data-intent], [onclick]') as HTMLElement | null;
  }
  
  /**
   * Check if we should handle this element
   */
  private shouldHandle(el: HTMLElement): boolean {
    // Skip if explicitly marked to ignore
    if (el.getAttribute('data-ut-intent') === 'none' || el.getAttribute('data-ut-intent') === 'ignore') {
      return false;
    }
    if (el.hasAttribute('data-no-intent') || el.hasAttribute('data-ut-passthrough')) {
      return false;
    }
    
    // Skip downloads
    const href = el.getAttribute('href');
    if (href && (href.endsWith('.pdf') || href.endsWith('.zip') || el.hasAttribute('download'))) {
      return false;
    }
    
    // Skip disabled elements
    if (el.hasAttribute('disabled')) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Resolve intent from element context
   */
  resolveIntent(el: HTMLElement): ResolvedButtonIntent | null {
    // 1. Check explicit data-ut-intent
    const explicit = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
    if (explicit && explicit !== 'none' && explicit !== 'ignore') {
      return {
        intent: explicit,
        payload: this.extractDataPayload(el),
        confidence: 1,
        category: this.inferCategory(explicit),
        source: 'explicit',
      };
    }
    
    // 2. Check href for navigation intents
    const href = el.getAttribute('href');
    if (href) {
      const hrefIntent = this.resolveFromHref(href, el);
      if (hrefIntent) return hrefIntent;
    }
    
    // 3. Match against button patterns
    const text = this.getButtonText(el);
    if (text) {
      const patternIntent = this.matchPattern(text);
      if (patternIntent) {
        return {
          ...patternIntent,
          payload: { ...patternIntent.payload, ...this.extractDataPayload(el) },
        };
      }
    }
    
    // 4. Context-based inference
    return this.inferFromContext(el);
  }
  
  /**
   * Get the text content of a button
   */
  private getButtonText(el: HTMLElement): string {
    const text = (el.textContent || '').trim();
    const ariaLabel = el.getAttribute('aria-label') || '';
    const title = el.getAttribute('title') || '';
    const value = el.getAttribute('value') || '';
    
    // Prefer text content, fall back to attributes
    return text || ariaLabel || title || value;
  }
  
  /**
   * Resolve intent from href attribute
   */
  private resolveFromHref(href: string, el: HTMLElement): ResolvedButtonIntent | null {
    // Anchor links
    if (href.startsWith('#')) {
      const anchor = href.slice(1);
      if (!anchor) return null;
      return {
        intent: 'nav.anchor',
        payload: { anchor },
        confidence: 0.95,
        category: 'navigation',
        source: 'href',
      };
    }
    
    // External links
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return {
        intent: 'nav.external',
        payload: { url: href },
        confidence: 0.95,
        category: 'navigation',
        source: 'href',
      };
    }
    
    // Mailto
    if (href.startsWith('mailto:')) {
      return {
        intent: 'comm.email',
        payload: { email: href.replace('mailto:', '').split('?')[0] },
        confidence: 1,
        category: 'social',
        source: 'href',
      };
    }
    
    // Tel
    if (href.startsWith('tel:')) {
      return {
        intent: 'comm.call',
        payload: { phone: href.replace('tel:', '') },
        confidence: 1,
        category: 'social',
        source: 'href',
      };
    }
    
    // Internal paths
    if (href.startsWith('/') || !href.includes(':')) {
      return {
        intent: 'nav.goto',
        payload: { path: href },
        confidence: 0.9,
        category: 'navigation',
        source: 'href',
      };
    }
    
    return null;
  }
  
  /**
   * Match button text against patterns
   */
  private matchPattern(text: string): ResolvedButtonIntent | null {
    const normalized = text.toLowerCase().trim();
    
    for (const config of BUTTON_INTENT_PATTERNS) {
      if (config.pattern.test(normalized)) {
        return {
          intent: config.intent,
          payload: config.payload || {},
          confidence: config.confidence,
          category: config.category,
          source: 'pattern',
        };
      }
    }
    
    return null;
  }
  
  /**
   * Infer intent from element context
   */
  private inferFromContext(el: HTMLElement): ResolvedButtonIntent | null {
    // Check if it's in a nav element
    const isInNav = !!el.closest('nav, header');
    const text = this.getButtonText(el);
    
    if (isInNav && text) {
      // Navigation item
      const path = '/' + text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      return {
        intent: 'nav.goto',
        payload: { path },
        confidence: 0.6,
        category: 'navigation',
        source: 'inference',
      };
    }
    
    // Check if it's the primary CTA (first prominent button)
    const isPrimary = el.classList.contains('primary') || 
                      el.classList.contains('cta') ||
                      el.classList.contains('btn-primary');
    
    if (isPrimary) {
      return {
        intent: 'cta.primary',
        payload: { text },
        confidence: 0.5,
        category: 'navigation',
        source: 'inference',
      };
    }
    
    return null;
  }
  
  /**
   * Extract data-* attributes as payload
   */
  private extractDataPayload(el: HTMLElement): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-') && 
          attr.name !== 'data-ut-intent' && 
          attr.name !== 'data-intent') {
        const key = attr.name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        
        try {
          payload[key] = JSON.parse(attr.value);
        } catch {
          payload[key] = attr.value;
        }
      }
    }
    
    // Add context from config
    if (this.config.businessId) payload.businessId = this.config.businessId;
    if (this.config.projectId) payload.projectId = this.config.projectId;
    if (this.config.siteId) payload.siteId = this.config.siteId;
    
    return payload;
  }
  
  /**
   * Infer category from intent string
   */
  private inferCategory(intent: string): ButtonIntentCategory {
    const prefix = intent.split('.')[0];
    const categoryMap: Record<string, ButtonIntentCategory> = {
      auth: 'auth',
      cart: 'commerce',
      checkout: 'commerce',
      pay: 'commerce',
      shop: 'commerce',
      booking: 'booking',
      reservation: 'booking',
      contact: 'contact',
      quote: 'contact',
      newsletter: 'contact',
      lead: 'contact',
      nav: 'navigation',
      comm: 'social',
      social: 'social',
      overlay: 'overlay',
      setup: 'settings',
    };
    
    return categoryMap[prefix] || 'navigation';
  }
  
  /**
   * Execute the resolved intent
   */
  private async executeIntent(el: HTMLElement, resolved: ResolvedButtonIntent): Promise<void> {
    const { intent, payload } = resolved;
    
    // Handle local navigation for instant response
    if (intent === 'nav.anchor' && payload.anchor) {
      const anchor = String(payload.anchor);
      const targetEl = document.querySelector(`#${anchor}, [data-section="${anchor}"], [name="${anchor}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.showSuccess(el);
        return;
      }
    }
    
    if (intent === 'nav.goto' && payload.path) {
      // Use hash router for in-preview navigation
      window.location.hash = String(payload.path);
      this.showSuccess(el);
      // Still post to parent for VFS generation
      this.postIntent(intent, payload);
      return;
    }
    
    if (intent === 'nav.external' && payload.url) {
      // Route through parent for page generation
      const url = String(payload.url);
      const pageName = url.replace(/^https?:\/\/[^/]+\/?/, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'external';
      this.postIntent('nav.external', { ...payload, path: '/' + pageName + '.html', buttonLabel: this.getButtonText(el) });
      this.showSuccess(el);
      return;
    }
    
    if (intent === 'nav.back') {
      window.history.back();
      return;
    }
    
    if (intent === 'overlay.close') {
      window.dispatchEvent(new CustomEvent('preview:overlay.close'));
      return;
    }
    
    // For all other intents, post to parent
    this.showLoading(el);
    this.postIntent(intent, payload);
    
    // Simulate completion for UX
    setTimeout(() => {
      this.hideLoading(el);
      this.showSuccess(el);
    }, 300);
  }
  
  /**
   * Post intent to parent frame
   */
  private postIntent(intent: string, payload: Record<string, unknown>): void {
    window.parent.postMessage({
      type: 'INTENT_TRIGGER',
      intent,
      payload,
      timestamp: Date.now(),
    }, '*');
    
    this.config.onIntentTrigger?.(intent, payload);
  }
  
  /**
   * Visual feedback helpers
   */
  private showLoading(el: HTMLElement): void {
    el.classList.add('intent-loading');
    if ('disabled' in el) (el as HTMLButtonElement).disabled = true;
  }
  
  private hideLoading(el: HTMLElement): void {
    el.classList.remove('intent-loading');
    if ('disabled' in el) (el as HTMLButtonElement).disabled = false;
  }
  
  private showSuccess(el: HTMLElement): void {
    el.classList.add('intent-success');
    setTimeout(() => el.classList.remove('intent-success'), 2000);
  }
  
  /**
   * Update configuration
   */
  configure(config: Partial<IntentBridgeConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Factory & Helpers
// ============================================================================

let bridgeInstance: SandpackIntentBridge | null = null;

/**
 * Get or create the global bridge instance
 */
export function getSandpackIntentBridge(config?: IntentBridgeConfig): SandpackIntentBridge {
  if (!bridgeInstance) {
    bridgeInstance = new SandpackIntentBridge(config);
  } else if (config) {
    bridgeInstance.configure(config);
  }
  return bridgeInstance;
}

/**
 * Initialize the bridge and attach to document body
 */
export function initSandpackIntentBridge(config?: IntentBridgeConfig): SandpackIntentBridge {
  const bridge = getSandpackIntentBridge(config);
  bridge.attach(document.body);
  return bridge;
}

/**
 * Generate an inline script for injection into Sandpack iframes.
 * This is a self-contained version that doesn't require module imports.
 */
export function generateSandpackIntentScript(config?: { 
  debug?: boolean;
  businessId?: string;
  projectId?: string;
  siteId?: string;
}): string {
  // Generate pattern array as string
  const patternsStr = BUTTON_INTENT_PATTERNS.map(p => {
    const payload = p.payload ? JSON.stringify(p.payload) : '{}';
    return `{re:${p.pattern.toString()},intent:'${p.intent}',conf:${p.confidence},cat:'${p.category}',pay:${payload}}`;
  }).join(',\n    ');
  
  return `
(function() {
  'use strict';
  
  var DEBUG = ${config?.debug || false};
  var BUSINESS_ID = ${config?.businessId ? `'${config.businessId}'` : 'null'};
  var PROJECT_ID = ${config?.projectId ? `'${config.projectId}'` : 'null'};
  var SITE_ID = ${config?.siteId ? `'${config.siteId}'` : 'null'};
  
  var PATTERNS = [
    ${patternsStr}
  ];
  
  function log() {
    if (DEBUG) console.log.apply(console, ['[IntentBridge]'].concat(Array.from(arguments)));
  }
  
  function findClickable(el) {
    return el.closest('a, button, [role="button"], [data-ut-intent], [data-intent]');
  }
  
  function shouldHandle(el) {
    var utIntent = el.getAttribute('data-ut-intent');
    if (utIntent === 'none' || utIntent === 'ignore') return false;
    if (el.hasAttribute('data-no-intent') || el.hasAttribute('data-ut-passthrough')) return false;
    if (el.hasAttribute('disabled')) return false;
    var href = el.getAttribute('href');
    if (href && (href.endsWith('.pdf') || href.endsWith('.zip') || el.hasAttribute('download'))) return false;
    return true;
  }
  
  function getButtonText(el) {
    return (el.textContent || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
  }
  
  function resolveFromHref(href) {
    if (href.startsWith('#')) {
      var anchor = href.slice(1);
      return anchor ? { intent: 'nav.anchor', payload: { anchor: anchor } } : null;
    }
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return { intent: 'nav.external', payload: { url: href } };
    }
    if (href.startsWith('mailto:')) {
      return { intent: 'comm.email', payload: { email: href.replace('mailto:', '').split('?')[0] } };
    }
    if (href.startsWith('tel:')) {
      return { intent: 'comm.call', payload: { phone: href.replace('tel:', '') } };
    }
    if (href.startsWith('/') || !href.includes(':')) {
      return { intent: 'nav.goto', payload: { path: href } };
    }
    return null;
  }
  
  function matchPattern(text) {
    var normalized = text.toLowerCase().trim();
    for (var i = 0; i < PATTERNS.length; i++) {
      var p = PATTERNS[i];
      if (p.re.test(normalized)) {
        return { intent: p.intent, payload: p.pay, confidence: p.conf, category: p.cat };
      }
    }
    return null;
  }
  
  function resolveIntent(el) {
    // Explicit intent
    var explicit = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
    if (explicit && explicit !== 'none' && explicit !== 'ignore') {
      return { intent: explicit, payload: {} };
    }
    
    // Href
    var href = el.getAttribute('href');
    if (href) {
      var hrefIntent = resolveFromHref(href);
      if (hrefIntent) return hrefIntent;
    }
    
    // Pattern match
    var text = getButtonText(el);
    if (text) {
      var matched = matchPattern(text);
      if (matched) return { intent: matched.intent, payload: matched.payload || {} };
    }
    
    // Nav context inference
    if (el.closest('nav, header') && text) {
      var path = '/' + text.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]/g, '');
      return { intent: 'nav.goto', payload: { path: path } };
    }
    
    return null;
  }
  
  function collectPayload(el) {
    var payload = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var attr = el.attributes[i];
      if (attr.name.startsWith('data-') && attr.name !== 'data-ut-intent' && attr.name !== 'data-intent') {
        var key = attr.name.slice(5).replace(/-([a-z])/g, function(_, c) { return c.toUpperCase(); });
        try { payload[key] = JSON.parse(attr.value); } catch(e) { payload[key] = attr.value; }
      }
    }
    if (BUSINESS_ID) payload.businessId = BUSINESS_ID;
    if (PROJECT_ID) payload.projectId = PROJECT_ID;
    if (SITE_ID) payload.siteId = SITE_ID;
    return payload;
  }
  
  function handleClick(e) {
    var clickable = findClickable(e.target);
    if (!clickable || !shouldHandle(clickable)) return;
    
    var resolved = resolveIntent(clickable);
    if (!resolved) {
      log('No intent for:', getButtonText(clickable));
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    var payload = Object.assign({}, resolved.payload, collectPayload(clickable));
    log('Intent:', resolved.intent, payload);
    
    // Handle local nav
    if (resolved.intent === 'nav.anchor' && payload.anchor) {
      var target = document.querySelector('#' + payload.anchor + ', [data-section="' + payload.anchor + '"]');
      if (target) { target.scrollIntoView({ behavior: 'smooth' }); return; }
    }
    
    // Post to parent
    clickable.classList.add('intent-loading');
    window.parent.postMessage({ type: 'INTENT_TRIGGER', intent: resolved.intent, payload: payload, timestamp: Date.now() }, '*');
    
    setTimeout(function() {
      clickable.classList.remove('intent-loading');
      clickable.classList.add('intent-success');
      setTimeout(function() { clickable.classList.remove('intent-success'); }, 2000);
    }, 300);
  }
  
  function handleSubmit(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    
    var intent = form.getAttribute('data-ut-intent') || form.getAttribute('data-intent');
    if (!intent) {
      var btn = form.querySelector('button[type="submit"], button:not([type])');
      if (btn) {
        var resolved = resolveIntent(btn);
        if (resolved) intent = resolved.intent;
      }
    }
    if (!intent) {
      var id = (form.id || '').toLowerCase();
      if (/contact/.test(id)) intent = 'contact.submit';
      else if (/newsletter|subscribe/.test(id)) intent = 'newsletter.subscribe';
      else if (/booking|reservation/.test(id)) intent = 'booking.create';
      else if (/quote/.test(id)) intent = 'quote.request';
    }
    if (!intent) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    var payload = {};
    var formData = new FormData(form);
    formData.forEach(function(v, k) { if (typeof v === 'string') payload[k] = v; });
    if (BUSINESS_ID) payload.businessId = BUSINESS_ID;
    if (PROJECT_ID) payload.projectId = PROJECT_ID;
    
    log('Form submit:', intent, payload);
    window.parent.postMessage({ type: 'INTENT_TRIGGER', intent: intent, payload: payload }, '*');
    form.reset();
  }
  
  document.addEventListener('click', handleClick, true);
  document.addEventListener('submit', handleSubmit, true);
  
  log('Initialized');
})();
`;
}

/**
 * Generate CSS for intent loading/success states
 */
export function generateIntentStyles(): string {
  return `
<style>
  .intent-loading {
    opacity: 0.6;
    pointer-events: none;
    cursor: wait;
  }
  .intent-success {
    animation: intent-pulse 0.3s ease-out;
  }
  @keyframes intent-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }
</style>
`;
}

export default SandpackIntentBridge;
