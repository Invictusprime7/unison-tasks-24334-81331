/**
 * PreviewClickResolver - Centralized Click Handler for Preview
 * 
 * This module provides a universal click handler that:
 * 1. Intercepts all clicks on buttons/links
 * 2. Resolves intent from element context
 * 3. Executes through the intent system
 * 4. Never relies on raw anchor behavior
 * 
 * Can be injected into any preview iframe as a script.
 */

import { normalizeIntent } from '../intentAliases';
import { executeIntent, type IntentResult, type IntentContext } from '../intentExecutor';

// ============================================================================
// Types
// ============================================================================

export interface ClickResolverConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Custom navigation handler (for HashRouter integration) */
  onNavigate?: (path: string) => void;
  /** Custom overlay handler */
  onOverlay?: (type: string, payload?: Record<string, unknown>) => void;
  /** Custom scroll handler */
  onScroll?: (anchor: string) => void;
  /** Intent execution callback */
  onIntent?: (intent: string, result: IntentResult) => void;
  /** Business context */
  businessId?: string;
  /** Project context */
  projectId?: string;
}

// Singleton instance
let resolver: PreviewClickResolver | null = null;

// ============================================================================
// Click Resolver Class
// ============================================================================

export class PreviewClickResolver {
  private config: ClickResolverConfig;
  private root: HTMLElement | null = null;
  private handler: ((e: MouseEvent) => void) | null = null;
  
  constructor(config: ClickResolverConfig = {}) {
    this.config = config;
  }
  
  private log(...args: unknown[]) {
    if (this.config.debug) {
      console.log('[ClickResolver]', ...args);
    }
  }
  
  /**
   * Attach to a root element (document.body or iframe body)
   */
  attach(root: HTMLElement = document.body): void {
    if (this.root) this.detach();
    
    this.root = root;
    this.handler = this.handleClick.bind(this);
    root.addEventListener('click', this.handler, true);
    
    this.log('Attached to', root.tagName);
  }
  
  /**
   * Detach from current root
   */
  detach(): void {
    if (this.root && this.handler) {
      this.root.removeEventListener('click', this.handler, true);
      this.root = null;
      this.handler = null;
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
    
    // Prevent default
    e.preventDefault();
    e.stopPropagation();
    
    // Resolve intent
    const resolved = this.resolveIntent(clickable);
    if (!resolved) {
      this.log('No intent resolved for', clickable);
      return;
    }
    
    this.log('Resolved:', resolved.intent, resolved.payload);
    
    // Execute
    await this.executeResolvedIntent(resolved);
  }
  
  /**
   * Find the clickable element (button, link, or intent-annotated element)
   */
  private findClickable(target: HTMLElement): HTMLElement | null {
    return target.closest('a, button, [data-ut-intent], [role="button"], [onclick]');
  }
  
  /**
   * Check if we should handle this click
   */
  private shouldHandle(el: HTMLElement): boolean {
    // Skip if explicitly marked to pass through
    if (el.hasAttribute('data-ut-passthrough')) return false;
    
    // Skip if modifier key pressed (user wants default behavior)
    // This is checked in handleClick via event but we can add more rules here
    
    // Skip file downloads
    const href = el.getAttribute('href');
    if (href && (href.endsWith('.pdf') || href.endsWith('.zip') || el.hasAttribute('download'))) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Resolve intent from element context
   */
  resolveIntent(el: HTMLElement): { intent: string; payload: Record<string, unknown> } | null {
    // 1. Check explicit data-ut-intent
    const explicit = el.getAttribute('data-ut-intent');
    if (explicit) {
      return {
        intent: explicit,
        payload: this.extractDataPayload(el),
      };
    }
    
    // 2. Check href for navigation intents
    const href = el.getAttribute('href');
    if (href) {
      // Anchor links
      if (href.startsWith('#')) {
        const anchor = href.slice(1);
        // Skip empty hash
        if (!anchor) return null;
        return { intent: 'nav.anchor', payload: { anchor } };
      }
      
      // External links
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return { intent: 'nav.external', payload: { url: href } };
      }
      
      // Relative paths (internal navigation)
      if (href.startsWith('/') || !href.includes(':')) {
        return { intent: 'nav.goto', payload: { path: href } };
      }
      
      // Special protocols
      if (href.startsWith('mailto:')) {
        return { intent: 'comm.email', payload: { email: href.replace('mailto:', '') } };
      }
      if (href.startsWith('tel:')) {
        return { intent: 'comm.call', payload: { phone: href.replace('tel:', '') } };
      }
    }
    
    // 3. Analyze button/element context
    return this.inferIntentFromContext(el);
  }
  
  /**
   * Extract data-* attributes as payload
   */
  private extractDataPayload(el: HTMLElement): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-') && attr.name !== 'data-ut-intent') {
        const key = attr.name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        
        // Try to parse as JSON
        try {
          payload[key] = JSON.parse(attr.value);
        } catch {
          payload[key] = attr.value;
        }
      }
    }
    
    // Add context
    payload.businessId = payload.businessId || this.config.businessId;
    payload.projectId = payload.projectId || this.config.projectId;
    
    return payload;
  }
  
  /**
   * Infer intent from element text/context
   */
  private inferIntentFromContext(el: HTMLElement): { intent: string; payload: Record<string, unknown> } | null {
    const text = (el.textContent || '').toLowerCase().trim();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const combined = `${text} ${ariaLabel}`;
    
    // Common CTA patterns
    const patterns: Array<[RegExp, string, Record<string, unknown>?]> = [
      // Auth
      [/sign\s*in|log\s*in|login/i, 'auth.signin'],
      [/sign\s*up|register|create\s*account/i, 'auth.signup'],
      [/sign\s*out|log\s*out|logout/i, 'auth.signout'],
      
      // Cart/Shop
      [/add\s*to\s*cart/i, 'cart.add'],
      [/view\s*cart|shopping\s*cart/i, 'cart.view'],
      [/checkout|buy\s*now|purchase/i, 'pay.checkout'],
      [/shop\s*now|start\s*shopping/i, 'shop.browse'],
      
      // Booking
      [/book\s*(now|appointment|session)|schedule/i, 'booking.create'],
      [/reserve|make\s*reservation/i, 'booking.create'],
      
      // Contact/Lead
      [/contact\s*(us|me)?|get\s*in\s*touch/i, 'overlay.open', { type: 'contact' }],
      [/request\s*quote|get\s*quote/i, 'quote.request'],
      [/subscribe|newsletter/i, 'newsletter.subscribe'],
      [/join\s*waitlist|early\s*access/i, 'lead.capture'],
      
      // Navigation
      [/learn\s*more|read\s*more/i, 'nav.anchor', { anchor: 'features' }],
      [/see\s*pricing|view\s*plans/i, 'nav.anchor', { anchor: 'pricing' }],
      [/view\s*work|see\s*portfolio/i, 'nav.anchor', { anchor: 'work' }],
      [/view\s*menu|see\s*menu/i, 'nav.anchor', { anchor: 'menu' }],
      [/get\s*started|start\s*now/i, 'nav.goto', { path: '/signup' }],
      
      // Communication
      [/call\s*(us|now)|phone/i, 'comm.call'],
      [/email\s*(us)?/i, 'comm.email'],
      
      // Downloads
      [/download|get\s*pdf/i, 'download.start'],
      
      // Social
      [/share|tweet|post/i, 'social.share'],
      [/follow\s*(us)?/i, 'social.follow'],
    ];
    
    for (const [pattern, intent, extraPayload] of patterns) {
      if (pattern.test(combined)) {
        return {
          intent,
          payload: { ...this.extractDataPayload(el), ...extraPayload },
        };
      }
    }
    
    // No match - check if it's a navigation element
    if (el.tagName === 'A' || el.closest('nav')) {
      // Probably a nav link - try to infer destination
      const possiblePath = '/' + text.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      return { intent: 'nav.goto', payload: { path: possiblePath } };
    }
    
    return null;
  }
  
  /**
   * Execute the resolved intent
   */
  private async executeResolvedIntent(resolved: { intent: string; payload: Record<string, unknown> }): Promise<void> {
    const { intent, payload } = resolved;
    const normalized = normalizeIntent(intent);
    
    this.log('Executing:', normalized, payload);
    
    // Handle navigation locally for instant response
    if (normalized === 'nav.goto' && payload.path) {
      const path = String(payload.path);
      if (this.config.onNavigate) {
        this.config.onNavigate(path);
      } else {
        // Default: HashRouter navigation
        window.location.hash = path;
      }
      return;
    }
    
    if (normalized === 'nav.anchor' && payload.anchor) {
      const anchor = String(payload.anchor);
      if (this.config.onScroll) {
        this.config.onScroll(anchor);
      } else {
        // Default: scroll to element
        const el = document.querySelector(`#${anchor}, [data-section="${anchor}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    
    if (normalized === 'nav.external' && payload.url) {
      window.open(String(payload.url), '_blank', 'noopener,noreferrer');
      return;
    }
    
    if (normalized === 'nav.back') {
      window.history.back();
      return;
    }
    
    // Handle overlay intents
    if (normalized === 'overlay.open') {
      if (this.config.onOverlay) {
        this.config.onOverlay(String(payload.type || 'default'), payload);
      } else {
        // Emit event for overlay system
        window.dispatchEvent(new CustomEvent('preview:overlay.open', { detail: payload }));
      }
      return;
    }
    
    if (normalized === 'overlay.close') {
      window.dispatchEvent(new CustomEvent('preview:overlay.close'));
      return;
    }
    
    // Handle communication
    if (normalized === 'comm.call' && payload.phone) {
      window.location.href = `tel:${payload.phone}`;
      return;
    }
    
    if (normalized === 'comm.email' && payload.email) {
      window.location.href = `mailto:${payload.email}`;
      return;
    }
    
    // Execute through general intent system
    const context: IntentContext = {
      businessId: payload.businessId ? String(payload.businessId) : undefined,
      siteId: payload.siteId ? String(payload.siteId) : undefined,
      payload,
    };
    
    const result = await executeIntent(normalized, context);
    
    this.log('Result:', result);
    this.config.onIntent?.(normalized, result);
    
    // Handle UI directives
    if (result.ui?.navigate && this.config.onNavigate) {
      this.config.onNavigate(result.ui.navigate);
    }
    if (result.ui?.openModal && this.config.onOverlay) {
      this.config.onOverlay(result.ui.openModal);
    }
    if (result.toast) {
      // Emit toast event
      window.dispatchEvent(new CustomEvent('preview:toast', { detail: result.toast }));
    }
  }
  
  /**
   * Update configuration
   */
  configure(config: Partial<ClickResolverConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get or create the global click resolver instance
 */
export function getClickResolver(config?: ClickResolverConfig): PreviewClickResolver {
  if (!resolver) {
    resolver = new PreviewClickResolver(config);
  } else if (config) {
    resolver.configure(config);
  }
  return resolver;
}

/**
 * Initialize click resolver and attach to document
 */
export function initClickResolver(config?: ClickResolverConfig): PreviewClickResolver {
  const r = getClickResolver(config);
  r.attach(document.body);
  return r;
}

/**
 * Generate an inline script that can be injected into preview iframe
 * This is a self-contained click handler for iframes
 */
export function generateClickHandlerScript(config?: { debug?: boolean }): string {
  return `
(function() {
  'use strict';
  
  var DEBUG = ${config?.debug || false};
  
  function log() {
    if (DEBUG) console.log.apply(console, ['[ClickResolver]'].concat(Array.from(arguments)));
  }
  
  function findClickable(el) {
    return el.closest('a, button, [data-ut-intent], [role="button"]');
  }
  
  function resolveIntent(el) {
    // Explicit intent
    var explicit = el.getAttribute('data-ut-intent');
    if (explicit) {
      return { intent: explicit, payload: {} };
    }
    
    // Href analysis
    var href = el.getAttribute('href');
    if (href) {
      if (href.startsWith('#')) {
        var anchor = href.slice(1);
        if (anchor) return { intent: 'nav.anchor', payload: { anchor: anchor } };
      }
      if (href.startsWith('http')) {
        return { intent: 'nav.external', payload: { url: href } };
      }
      if (href.startsWith('/') || !href.includes(':')) {
        return { intent: 'nav.goto', payload: { path: href } };
      }
    }
    
    // Text analysis
    var text = (el.textContent || '').toLowerCase().trim();
    
    if (/sign\\s*in|login/.test(text)) return { intent: 'auth.signin', payload: {} };
    if (/sign\\s*up|register/.test(text)) return { intent: 'auth.signup', payload: {} };
    if (/add\\s*to\\s*cart/.test(text)) return { intent: 'cart.add', payload: {} };
    if (/view\\s*cart/.test(text)) return { intent: 'cart.view', payload: {} };
    if (/book|schedule/.test(text)) return { intent: 'booking.create', payload: {} };
    if (/contact/.test(text)) return { intent: 'overlay.open', payload: { type: 'contact' } };
    if (/learn\\s*more/.test(text)) return { intent: 'nav.anchor', payload: { anchor: 'features' } };
    if (/get\\s*started/.test(text)) return { intent: 'nav.goto', payload: { path: '/signup' } };
    
    return null;
  }
  
  function handleClick(e) {
    var clickable = findClickable(e.target);
    if (!clickable) return;
    
    var resolved = resolveIntent(clickable);
    if (!resolved) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    log('Intent:', resolved.intent, resolved.payload);
    
    // Post to parent
    window.parent.postMessage({
      type: 'INTENT_EXECUTE',
      intent: resolved.intent,
      payload: resolved.payload,
      timestamp: Date.now()
    }, '*');
  }
  
  document.addEventListener('click', handleClick, true);
  log('Initialized');
})();
`;
}

export default PreviewClickResolver;
