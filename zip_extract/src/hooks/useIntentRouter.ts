/**
 * useIntentRouter Hook
 * 
 * Integrates the Universal Intent Router with React components.
 * Use in WebBuilder, SimplePreview, or any component that renders interactive HTML.
 * 
 * Features:
 * - Automatic router setup/teardown on iframe load
 * - Builder mode: lazy-annotate buttons, AI fallback
 * - Production mode: deterministic execution only
 * - Event callbacks for tracking/debugging
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  createIntentRouter,
  type IntentRouterConfig,
  type UniversalIntentRouter,
} from '@/runtime/universalIntentRouter';
import type { ResolvedIntent, ActionContext } from '@/runtime';

export interface UseIntentRouterOptions {
  /** Router mode - builder allows AI resolution, production is deterministic only */
  mode?: 'builder' | 'production';
  
  /** Enable verbose logging */
  debug?: boolean;
  
  /** Callback when a button's intent is resolved */
  onIntentResolved?: (element: HTMLElement, result: ResolvedIntent) => void;
  
  /** Callback when an action is executed */
  onActionExecuted?: (intent: string, ctx: ActionContext, result: unknown) => void;
  
  /** Callback for navigation actions */
  onNavigate?: (path: string, payload?: Record<string, unknown>) => void;
  
  /** Callback for overlay actions (cart, booking, contact, auth) */
  onOverlayOpen?: (type: string, payload?: Record<string, unknown>) => void;
  
  /** Callback for communication actions */
  onCommunication?: (type: 'call' | 'email', target: string) => void;
  
  /** Custom action handlers - override default behavior */
  customHandlers?: Partial<IntentRouterConfig>;
}

export interface UseIntentRouterResult {
  /** Attach router to an iframe document */
  attachToIframe: (iframe: HTMLIFrameElement) => void;
  
  /** Detach router from current element */
  detach: () => void;
  
  /** Pre-annotate all buttons (for build-time processing) */
  annotateAll: () => Promise<Map<HTMLElement, ResolvedIntent>>;
  
  /** Get annotated HTML with intents embedded */
  getAnnotatedHTML: () => string;
  
  /** Get router instance (callback to avoid render-time ref access) */
  getRouter: () => UniversalIntentRouter | null;
  
  /** Whether a router is currently attached */
  isAttached: boolean;
  
  /** Last resolved intent for debugging */
  lastIntent: ResolvedIntent | null;
}

export function useIntentRouter(options: UseIntentRouterOptions = {}): UseIntentRouterResult {
  const {
    mode = 'builder',
    debug = false,
    onIntentResolved,
    onActionExecuted,
    onNavigate,
    onOverlayOpen,
    onCommunication,
    customHandlers,
  } = options;

  const navigate = useNavigate();
  const routerRef = useRef<UniversalIntentRouter | null>(null);
  const [isAttached, setIsAttached] = useState(false);
  const [lastIntent, setLastIntent] = useState<ResolvedIntent | null>(null);

  // Build router configuration
  const buildConfig = useCallback((): IntentRouterConfig => {
    return {
      mode,
      
      // Navigation manager
      navigationManager: {
        goto: (path, payload) => {
          if (debug) console.log('[IntentRouter] Navigate:', path, payload);
          if (onNavigate) {
            onNavigate(path, payload);
          } else {
            navigate(path, { state: payload });
          }
        },
        scrollTo: (anchor) => {
          if (debug) console.log('[IntentRouter] Scroll to:', anchor);
          const target = document.getElementById(anchor) || 
                        document.querySelector(`[name="${anchor}"]`);
          target?.scrollIntoView({ behavior: 'smooth' });
        },
        external: (url, newTab = true) => {
          if (debug) console.log('[IntentRouter] External:', url);
          if (newTab) {
            window.open(url, '_blank', 'noopener,noreferrer');
          } else {
            window.location.href = url;
          }
        },
      },
      
      // Overlay manager
      overlayManager: {
        open: (type, payload) => {
          if (debug) console.log('[IntentRouter] Open overlay:', type, payload);
          if (onOverlayOpen) {
            onOverlayOpen(type, payload);
          } else {
            // Default: show toast
            toast(`Opening ${type}...`, {
              description: payload ? JSON.stringify(payload) : undefined,
            });
          }
        },
        close: (type) => {
          if (debug) console.log('[IntentRouter] Close overlay:', type);
        },
      },
      
      // Cart manager (stub - override with real implementation)
      cartManager: {
        add: (productId, quantity = 1) => {
          if (debug) console.log('[IntentRouter] Add to cart:', productId, quantity);
          toast.success('Added to cart');
        },
        remove: (productId) => {
          if (debug) console.log('[IntentRouter] Remove from cart:', productId);
        },
        clear: () => {
          if (debug) console.log('[IntentRouter] Clear cart');
        },
        getItems: () => [],
      },
      
      // Auth manager (stub - override with real implementation)
      authManager: {
        signIn: async () => {
          if (debug) console.log('[IntentRouter] Sign in');
          if (onOverlayOpen) {
            onOverlayOpen('auth', { mode: 'signin' });
          } else {
            navigate('/auth');
          }
        },
        signUp: async () => {
          if (debug) console.log('[IntentRouter] Sign up');
          if (onOverlayOpen) {
            onOverlayOpen('auth', { mode: 'signup' });
          } else {
            navigate('/auth/signup');
          }
        },
        signOut: async () => {
          if (debug) console.log('[IntentRouter] Sign out');
          await supabase.auth.signOut();
          toast('Signed out');
        },
        isAuthenticated: () => false,
      },
      
      // Form manager
      formManager: {
        submit: async (formId, data) => {
          if (debug) console.log('[IntentRouter] Form submit:', formId, data);
          toast.success('Form submitted');
        },
      },
      
      // Communication manager
      communicationManager: {
        call: (phone) => {
          if (debug) console.log('[IntentRouter] Call:', phone);
          if (onCommunication) {
            onCommunication('call', phone);
          } else {
            window.location.href = `tel:${phone}`;
          }
        },
        email: (address) => {
          if (debug) console.log('[IntentRouter] Email:', address);
          if (onCommunication) {
            onCommunication('email', address);
          } else {
            window.location.href = `mailto:${address}`;
          }
        },
      },
      
      // Share manager
      shareManager: {
        share: (platform, url, text) => {
          if (debug) console.log('[IntentRouter] Share:', platform, url);
          const shareUrl = url || window.location.href;
          const shareText = text || document.title;
          
          const urls: Record<string, string> = {
            twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          };
          
          if (urls[platform]) {
            window.open(urls[platform], '_blank', 'width=600,height=400');
          }
        },
        copy: async (text) => {
          try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
            return true;
          } catch {
            toast.error('Failed to copy');
            return false;
          }
        },
      },
      
      // Event callbacks
      onIntentResolved: (element, result) => {
        if (debug) console.log('[IntentRouter] Intent resolved:', result);
        setLastIntent(result);
        onIntentResolved?.(element, result);
      },
      
      onActionExecuted: (intent, ctx, result) => {
        if (debug) console.log('[IntentRouter] Action executed:', intent, result);
        onActionExecuted?.(intent, ctx, result);
      },
      
      onError: (error, intent, element) => {
        console.error('[IntentRouter] Error:', error, intent, element);
        toast.error(`Action failed: ${error.message}`);
      },
      
      // Merge custom handlers
      ...customHandlers,
    };
  }, [mode, debug, navigate, onIntentResolved, onActionExecuted, onNavigate, onOverlayOpen, onCommunication, customHandlers]);

  // Attach router to an iframe
  const attachToIframe = useCallback((iframe: HTMLIFrameElement) => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc?.body) {
        console.warn('[useIntentRouter] Iframe document not ready');
        return;
      }
      
      // Detach existing router
      if (routerRef.current) {
        routerRef.current.detach();
      }
      
      // Create new router with config
      const config = buildConfig();
      const router = createIntentRouter(config);
      router.attach(iframeDoc.body);
      
      routerRef.current = router;
      setIsAttached(true);
      
      if (debug) console.log('[useIntentRouter] Attached to iframe');
    } catch (error) {
      console.error('[useIntentRouter] Failed to attach:', error);
    }
  }, [buildConfig, debug]);

  // Detach router
  const detach = useCallback(() => {
    if (routerRef.current) {
      routerRef.current.detach();
      routerRef.current = null;
      setIsAttached(false);
      if (debug) console.log('[useIntentRouter] Detached');
    }
  }, [debug]);

  // Pre-annotate all buttons
  const annotateAll = useCallback(async (): Promise<Map<HTMLElement, ResolvedIntent>> => {
    if (!routerRef.current) {
      console.warn('[useIntentRouter] No router attached');
      return new Map();
    }
    return routerRef.current.annotateAll();
  }, []);

  // Get annotated HTML
  const getAnnotatedHTML = useCallback((): string => {
    if (!routerRef.current) return '';
    return routerRef.current.getAnnotatedHTML();
  }, []);

  // Get router instance (via callback to avoid render-time access)
  const getRouter = useCallback((): UniversalIntentRouter | null => {
    return routerRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (routerRef.current) {
        routerRef.current.detach();
      }
    };
  }, []);

  return {
    attachToIframe,
    detach,
    annotateAll,
    getAnnotatedHTML,
    getRouter,
    isAttached,
    lastIntent,
  };
}
