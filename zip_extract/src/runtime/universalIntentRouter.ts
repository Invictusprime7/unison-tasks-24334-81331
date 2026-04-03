/**
 * Universal Intent Router
 * 
 * ONE click handler that sits behind ANY button/link in the canvas.
 * Uses event delegation - single listener on canvas root.
 * 
 * Two modes:
 * 1. BUILDER MODE: Lazy-annotate buttons, resolve intents via rules+AI
 * 2. PRODUCTION MODE: Deterministic execution from ACTION_CATALOG only
 */

import { executeAction, isValidIntent, configureActionCatalog, type ActionContext } from './actionCatalog';
import { resolveIntent, extractButtonContext, type ResolvedIntent } from './intentResolver';

export interface IntentRouterConfig {
  mode: 'builder' | 'production';
  
  // Callbacks for builder mode
  onIntentResolved?: (element: HTMLElement, result: ResolvedIntent) => void;
  onActionExecuted?: (intent: string, ctx: ActionContext, result: unknown) => void;
  onError?: (error: Error, intent: string, element: HTMLElement) => void;
  
  // Custom action providers (to configure ACTION_CATALOG)
  navigationManager?: {
    goto: (path: string, payload?: Record<string, unknown>) => void | Promise<void>;
    scrollTo: (anchor: string) => void;
    external: (url: string, newTab?: boolean) => void;
  };
  overlayManager?: {
    open: (type: string, payload?: Record<string, unknown>) => void | Promise<void>;
    close: (type?: string) => void;
  };
  cartManager?: {
    add: (productId: string, quantity?: number) => void | Promise<void>;
    remove: (productId: string) => void;
    clear: () => void;
    getItems: () => Array<{ id: string; quantity: number }>;
  };
  authManager?: {
    signIn: () => void | Promise<void>;
    signUp: () => void | Promise<void>;
    signOut: () => void | Promise<void>;
    isAuthenticated: () => boolean;
  };
  formManager?: {
    submit: (formId: string, data: Record<string, unknown>) => void | Promise<void>;
  };
  communicationManager?: {
    call: (phone: string) => void;
    email: (address: string) => void;
  };
  shareManager?: {
    share: (platform: string, url?: string, text?: string) => void;
    copy: (text: string) => Promise<boolean>;
  };
}

// Track resolved intents to avoid re-resolving
const resolvedIntentCache = new WeakMap<HTMLElement, ResolvedIntent>();

// Active router instance
let activeRouter: UniversalIntentRouter | null = null;

export class UniversalIntentRouter {
  private config: IntentRouterConfig;
  private rootElement: HTMLElement | null = null;
  private boundHandler: ((e: MouseEvent) => void) | null = null;
  
  constructor(config: IntentRouterConfig) {
    this.config = config;
    
    // Configure the action catalog with provided managers
    // Map our config to the catalog's expected format
    configureActionCatalog({
      nav: config.navigationManager ? {
        goto: config.navigationManager.goto,
        external: config.navigationManager.external,
        back: () => window.history.back(),
      } : undefined,
      overlays: config.overlayManager ? {
        open: config.overlayManager.open,
        close: (id) => config.overlayManager?.close(id),
        isOpen: () => false,
      } : undefined,
      comm: config.communicationManager ? {
        call: config.communicationManager.call,
        email: config.communicationManager.email,
        sms: () => {}, // Not typically used
      } : undefined,
    });
  }
  
  /**
   * Attach the router to a root element (iframe body or preview container)
   */
  attach(root: HTMLElement): void {
    if (this.rootElement) {
      this.detach();
    }
    
    this.rootElement = root;
    this.boundHandler = this.handleClick.bind(this);
    
    // Event delegation - single listener on root
    root.addEventListener('click', this.boundHandler, true);
    
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    activeRouter = this;
    console.log('[IntentRouter] Attached to', root.tagName);
  }
  
  /**
   * Detach the router from the current root
   */
  detach(): void {
    if (this.rootElement && this.boundHandler) {
      this.rootElement.removeEventListener('click', this.boundHandler, true);
      this.rootElement = null;
      this.boundHandler = null;
      activeRouter = null;
      console.log('[IntentRouter] Detached');
    }
  }
  
  /**
   * Main click handler - the ONE universal handler
   */
  private async handleClick(e: MouseEvent): Promise<void> {
    const target = e.target as HTMLElement;
    
    // Find the clickable element (button, link, or element with data-ut-intent)
    const clickable = this.findClickableElement(target);
    if (!clickable) return;
    
    // Check if this click should be handled
    const shouldHandle = this.shouldHandle(clickable);
    if (!shouldHandle) return;
    
    // Prevent default navigation for links we're handling
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await this.routeClick(clickable);
    } catch (error) {
      console.error('[IntentRouter] Error routing click:', error);
      this.config.onError?.(error as Error, '', clickable);
    }
  }
  
  /**
   * Find the actual clickable element from click target
   */
  private findClickableElement(target: HTMLElement): HTMLElement | null {
    // Walk up to find button, link, or intent-bearing element
    let current: HTMLElement | null = target;
    
    while (current && current !== this.rootElement) {
      const tag = current.tagName.toLowerCase();
      
      // Standard clickables
      if (tag === 'button' || tag === 'a') {
        return current;
      }
      
      // Has explicit intent
      if (current.dataset.utIntent || current.dataset.intent) {
        return current;
      }
      
      // Has role="button" or tabindex
      if (current.getAttribute('role') === 'button') {
        return current;
      }
      
      // Has onClick-ish class names (common patterns)
      if (current.classList.contains('btn') || 
          current.classList.contains('button') ||
          current.classList.contains('cta') ||
          current.classList.contains('link')) {
        return current;
      }
      
      current = current.parentElement;
    }
    
    return null;
  }
  
  /**
   * Determine if we should handle this click
   */
  private shouldHandle(element: HTMLElement): boolean {
    // Always handle elements with explicit intent
    if (element.dataset.utIntent || element.dataset.intent) {
      return true;
    }
    
    // Skip anchor links (scroll to section)
    const href = element.getAttribute('href');
    if (href && href.startsWith('#') && href.length > 1) {
      // Let anchor links work naturally unless they have intent
      return false;
    }
    
    // Skip external links in production mode (let them work)
    if (this.config.mode === 'production' && href?.startsWith('http')) {
      return false;
    }
    
    // Skip disabled elements
    if (element.hasAttribute('disabled')) {
      return false;
    }
    
    // Skip form submits (let form handle it unless intent specified)
    if (element.getAttribute('type') === 'submit' && !element.dataset.utIntent) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Route the click to the appropriate action
   */
  private async routeClick(element: HTMLElement): Promise<void> {
    // Step 1: Get or resolve intent
    let resolved = resolvedIntentCache.get(element);
    
    if (!resolved) {
      // Extract context
      const ctx = extractButtonContext(element);
      
      // Resolve intent (AI only in builder mode)
      resolved = await resolveIntent(ctx, this.config.mode === 'builder');
      
      // Cache for future clicks
      if (resolved.confidence >= 0.7) {
        resolvedIntentCache.set(element, resolved);
        
        // In builder mode, annotate the element for persistence
        if (this.config.mode === 'builder') {
          this.annotateElement(element, resolved);
          this.config.onIntentResolved?.(element, resolved);
        }
      }
    }
    
    // Step 2: Execute action if we have a valid intent
    if (resolved.intent && isValidIntent(resolved.intent)) {
      const actionContext: ActionContext = {
        payload: resolved.payload || {},
        element,
      };
      
      const result = await executeAction(resolved.intent, actionContext);
      this.config.onActionExecuted?.(resolved.intent, actionContext, result);
    } else if (!resolved.intent) {
      console.log('[IntentRouter] No intent resolved for:', element.textContent?.trim());
    }
  }
  
  /**
   * Annotate element with resolved intent (builder mode)
   */
  private annotateElement(element: HTMLElement, resolved: ResolvedIntent): void {
    element.dataset.utIntent = resolved.intent;
    if (resolved.payload) {
      element.dataset.utPayload = JSON.stringify(resolved.payload);
    }
    element.dataset.utConfidence = resolved.confidence.toString();
    element.dataset.utSource = resolved.source;
  }
  
  /**
   * Pre-annotate all buttons on the page (for build-time processing)
   */
  async annotateAll(): Promise<Map<HTMLElement, ResolvedIntent>> {
    if (!this.rootElement) {
      throw new Error('Router not attached to any element');
    }
    
    const results = new Map<HTMLElement, ResolvedIntent>();
    const clickables = this.rootElement.querySelectorAll<HTMLElement>(
      'button, a, [role="button"], [data-ut-intent], .btn, .button, .cta'
    );
    
    for (const element of clickables) {
      // Skip if already resolved
      if (element.dataset.utIntent) {
        const cached: ResolvedIntent = {
          intent: element.dataset.utIntent,
          confidence: parseFloat(element.dataset.utConfidence || '1'),
          payload: element.dataset.utPayload ? JSON.parse(element.dataset.utPayload) : undefined,
          source: (element.dataset.utSource as 'explicit' | 'rule' | 'ai' | 'fallback') || 'explicit',
        };
        results.set(element, cached);
        continue;
      }
      
      const ctx = extractButtonContext(element);
      const resolved = await resolveIntent(ctx, true); // Allow AI in annotation mode
      
      if (resolved.confidence >= 0.5) {
        this.annotateElement(element, resolved);
        resolvedIntentCache.set(element, resolved);
        results.set(element, resolved);
      }
    }
    
    return results;
  }
  
  /**
   * Get annotated HTML with all intents embedded
   */
  getAnnotatedHTML(): string {
    if (!this.rootElement) return '';
    return this.rootElement.innerHTML;
  }
  
  /**
   * Update configuration (e.g., switch modes or update managers)
   */
  updateConfig(partial: Partial<IntentRouterConfig>): void {
    this.config = { ...this.config, ...partial };
    
    // Re-configure action catalog if managers changed
    if (partial.navigationManager || partial.overlayManager || partial.communicationManager) {
      const config = this.config;
      configureActionCatalog({
        nav: config.navigationManager ? {
          goto: config.navigationManager.goto,
          external: config.navigationManager.external,
          back: () => window.history.back(),
        } : undefined,
        overlays: config.overlayManager ? {
          open: config.overlayManager.open,
          close: (id) => config.overlayManager?.close(id),
          isOpen: () => false,
        } : undefined,
        comm: config.communicationManager ? {
          call: config.communicationManager.call,
          email: config.communicationManager.email,
          sms: () => {},
        } : undefined,
      });
    }
  }
}

/**
 * Create and return a new intent router instance
 */
export function createIntentRouter(config: IntentRouterConfig): UniversalIntentRouter {
  return new UniversalIntentRouter(config);
}

/**
 * Get the currently active router instance
 */
export function getActiveRouter(): UniversalIntentRouter | null {
  return activeRouter;
}

/**
 * Quick setup for preview/iframe contexts
 */
export function setupPreviewRouter(
  iframeDocument: Document,
  config: Omit<IntentRouterConfig, 'mode'>
): UniversalIntentRouter {
  const router = new UniversalIntentRouter({
    ...config,
    mode: 'builder',
  });
  
  if (iframeDocument.body) {
    router.attach(iframeDocument.body);
  }
  
  return router;
}

/**
 * Quick setup for production deployments
 */
export function setupProductionRouter(
  rootElement: HTMLElement,
  config: Omit<IntentRouterConfig, 'mode'>
): UniversalIntentRouter {
  const router = new UniversalIntentRouter({
    ...config,
    mode: 'production',
  });
  
  router.attach(rootElement);
  return router;
}
