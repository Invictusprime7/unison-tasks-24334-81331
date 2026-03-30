/**
 * PreviewRuntime - Intent-Driven Preview Engine
 * 
 * This is the core runtime that sits between the WebBuilder and Sandpack.
 * Instead of raw HTML, we inject a React runtime that:
 * 
 * 1. Interprets SiteBundle schema
 * 2. Routes all navigation via HashRouter
 * 3. Resolves all button clicks through intent system
 * 4. Manages mock CMS state (cart, forms, auth)
 * 5. Handles draft assets from Supabase storage
 * 
 * Architecture:
 * Editor (SiteBundle) → PreviewRuntime → Sandpack Iframe
 * 
 * This enables enterprise-level preview behavior without relying on
 * raw anchor tags or server-side routing.
 */

import React, { useCallback, useMemo, useReducer, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type { SiteBundle, PageBundle, IntentBinding } from '@/types/siteBundle';
import { executeIntent, type IntentResult, type IntentContext } from '../intentExecutor';
import { normalizeIntent } from '../intentAliases';
import { PreviewRuntimeContext, type PreviewRuntimeContextValue, type CMSMockState, type OverlayState, type PreviewMode, type PreviewRuntimeConfig } from './PreviewRuntimeContext';

// Re-export types from context for backward compatibility
export type { PreviewRuntimeContextValue, PreviewMode, CMSMockState, OverlayState, PreviewRuntimeConfig } from './PreviewRuntimeContext';

// ============================================================================
// State Reducers
// ============================================================================

type CMSAction =
  | { type: 'CART_ADD'; item: { productId: string; name: string; price: number; quantity?: number } }
  | { type: 'CART_REMOVE'; productId: string }
  | { type: 'CART_CLEAR' }
  | { type: 'FORM_SUBMIT'; formId: string; data: Record<string, unknown> }
  | { type: 'AUTH_LOGIN'; user: { id: string; email: string; name: string } }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'BOOKING_CREATE'; booking: Omit<CMSMockState['bookings'][0], 'id' | 'status'> }
  | { type: 'SET_CUSTOM'; key: string; value: unknown }
  | { type: 'RESET' };

const initialCMSState: CMSMockState = {
  cart: { items: [], total: 0 },
  formSubmissions: [],
  auth: { isLoggedIn: false, user: null },
  bookings: [],
  custom: {},
};

function cmsReducer(state: CMSMockState, action: CMSAction): CMSMockState {
  switch (action.type) {
    case 'CART_ADD': {
      const existing = state.cart.items.find(i => i.productId === action.item.productId);
      let items: CMSMockState['cart']['items'];
      
      if (existing) {
        items = state.cart.items.map(i =>
          i.productId === action.item.productId
            ? { ...i, quantity: i.quantity + (action.item.quantity || 1) }
            : i
        );
      } else {
        items = [
          ...state.cart.items,
          {
            id: `cart-${Date.now()}`,
            productId: action.item.productId,
            name: action.item.name,
            price: action.item.price,
            quantity: action.item.quantity || 1,
          },
        ];
      }
      
      const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return { ...state, cart: { items, total } };
    }
    
    case 'CART_REMOVE': {
      const items = state.cart.items.filter(i => i.productId !== action.productId);
      const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return { ...state, cart: { items, total } };
    }
    
    case 'CART_CLEAR':
      return { ...state, cart: { items: [], total: 0 } };
    
    case 'FORM_SUBMIT':
      return {
        ...state,
        formSubmissions: [
          ...state.formSubmissions,
          { formId: action.formId, data: action.data, timestamp: Date.now() },
        ],
      };
    
    case 'AUTH_LOGIN':
      return { ...state, auth: { isLoggedIn: true, user: action.user } };
    
    case 'AUTH_LOGOUT':
      return { ...state, auth: { isLoggedIn: false, user: null } };
    
    case 'BOOKING_CREATE':
      return {
        ...state,
        bookings: [
          ...state.bookings,
          { ...action.booking, id: `booking-${Date.now()}`, status: 'pending' },
        ],
      };
    
    case 'SET_CUSTOM':
      return { ...state, custom: { ...state.custom, [action.key]: action.value } };
    
    case 'RESET':
      return initialCMSState;
    
    default:
      return state;
  }
}

type OverlayAction =
  | { type: 'OPEN'; overlayType: string; payload?: Record<string, unknown> }
  | { type: 'CLOSE'; overlayType?: string }
  | { type: 'CLOSE_ALL' };

const initialOverlayState: OverlayState = {
  active: null,
  payload: {},
  stack: [],
};

function overlayReducer(state: OverlayState, action: OverlayAction): OverlayState {
  switch (action.type) {
    case 'OPEN':
      return {
        active: action.overlayType,
        payload: action.payload || {},
        stack: [...state.stack, { type: action.overlayType, payload: action.payload || {} }],
      };
    
    case 'CLOSE': {
      if (action.overlayType && state.active !== action.overlayType) {
        return state;
      }
      const stack = state.stack.slice(0, -1);
      const last = stack[stack.length - 1];
      return {
        active: last?.type || null,
        payload: last?.payload || {},
        stack,
      };
    }
    
    case 'CLOSE_ALL':
      return initialOverlayState;
    
    default:
      return state;
  }
}

// ============================================================================
// Runtime Provider Component (Inner - with router hooks)
// ============================================================================

interface RuntimeProviderInnerProps {
  children: React.ReactNode;
  config: PreviewRuntimeConfig;
}

const RuntimeProviderInner: React.FC<RuntimeProviderInnerProps> = ({ children, config }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [cmsState, dispatchCMS] = useReducer(cmsReducer, initialCMSState);
  const [overlayState, dispatchOverlay] = useReducer(overlayReducer, initialOverlayState);
  
  const { siteBundle, debug, onNavigate, onIntentExecute, onOverlayOpen, assetBaseUrl } = config;
  
  // Logging helper
  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) console.log('[PreviewRuntime]', ...args);
    },
    [debug]
  );
  
  // Navigation handler
  const handleNavigate = useCallback(
    (path: string, reason: string = 'intent') => {
      log('Navigate:', path, 'Reason:', reason);
      navigate(path);
      onNavigate?.(path, reason);
    },
    [navigate, log, onNavigate]
  );
  
  // Scroll to anchor
  const scrollTo = useCallback(
    (anchor: string) => {
      const el = document.querySelector(`#${anchor}, [data-section="${anchor}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        log('ScrollTo:', anchor);
      }
    },
    [log]
  );
  
  // Go back
  const goBack = useCallback(() => {
    window.history.back();
  }, []);
  
  // Overlay management
  const openOverlay = useCallback(
    (type: string, payload?: Record<string, unknown>) => {
      log('OpenOverlay:', type, payload);
      dispatchOverlay({ type: 'OPEN', overlayType: type, payload });
      onOverlayOpen?.(type, payload);
    },
    [log, onOverlayOpen]
  );
  
  const closeOverlay = useCallback(
    (type?: string) => {
      log('CloseOverlay:', type);
      dispatchOverlay({ type: 'CLOSE', overlayType: type });
    },
    [log]
  );
  
  // Cart operations
  const addToCart = useCallback(
    (item: { productId: string; name: string; price: number; quantity?: number }) => {
      log('AddToCart:', item);
      dispatchCMS({ type: 'CART_ADD', item });
      // Emit event for UI reactivity
      window.dispatchEvent(new CustomEvent('preview:cart.add', { detail: item }));
    },
    [log]
  );
  
  const removeFromCart = useCallback(
    (productId: string) => {
      log('RemoveFromCart:', productId);
      dispatchCMS({ type: 'CART_REMOVE', productId });
    },
    [log]
  );
  
  const clearCart = useCallback(() => {
    log('ClearCart');
    dispatchCMS({ type: 'CART_CLEAR' });
  }, [log]);
  
  // Intent execution
  const handleExecuteIntent = useCallback(
    async (
      intent: string,
      payload: Record<string, unknown> = {},
      context: IntentContext = {}
    ): Promise<IntentResult> => {
      const normalized = normalizeIntent(intent);
      log('ExecuteIntent:', intent, '→', normalized, payload);
      
      // Handle navigation intents locally
      if (normalized.startsWith('nav.')) {
        if (normalized === 'nav.goto' && payload.path) {
          handleNavigate(String(payload.path), 'intent');
          return { ok: true };
        }
        if (normalized === 'nav.anchor' && payload.anchor) {
          scrollTo(String(payload.anchor));
          return { ok: true };
        }
        if (normalized === 'nav.back') {
          goBack();
          return { ok: true };
        }
        if (normalized === 'nav.external' && payload.url) {
          window.open(String(payload.url), '_blank');
          return { ok: true };
        }
      }
      
      // Handle overlay intents
      if (normalized.startsWith('overlay.')) {
        if (normalized === 'overlay.open' && payload.type) {
          openOverlay(String(payload.type), payload);
          return { ok: true };
        }
        if (normalized === 'overlay.close') {
          closeOverlay(payload.type ? String(payload.type) : undefined);
          return { ok: true };
        }
      }
      
      // Handle cart intents (mock)
      if (normalized === 'cart.add' && payload.productId) {
        addToCart({
          productId: String(payload.productId),
          name: String(payload.name || 'Product'),
          price: Number(payload.price || 0),
          quantity: Number(payload.quantity || 1),
        });
        openOverlay('cart');
        return { ok: true, toast: { type: 'success', message: 'Added to cart' } };
      }
      
      if (normalized === 'cart.view') {
        openOverlay('cart');
        return { ok: true };
      }
      
      // Handle auth intents (mock)
      if (normalized === 'auth.signin' || normalized === 'auth.login') {
        openOverlay('auth', { mode: 'login' });
        return { ok: true };
      }
      
      if (normalized === 'auth.signup' || normalized === 'auth.register') {
        openOverlay('auth', { mode: 'register' });
        return { ok: true };
      }
      
      // Handle booking intents (mock)
      if (normalized === 'booking.create' || normalized === 'booking.book') {
        openOverlay('booking', payload);
        return { ok: true, toast: { type: 'success', message: 'Booking opened' } };
      }
      
      // Default: execute through intent executor
      const result = await executeIntent(normalized, {
        ...context,
        payload,
      });
      
      onIntentExecute?.(normalized, result);
      
      // Handle UI directives from result
      if (result.ui?.navigate) {
        handleNavigate(result.ui.navigate, 'intent');
      }
      if (result.ui?.openModal) {
        openOverlay(result.ui.openModal);
      }
      
      return result;
    },
    [log, handleNavigate, scrollTo, goBack, openOverlay, closeOverlay, addToCart, onIntentExecute]
  );
  
  // Resolve intent from element
  const resolveIntentFromElement = useCallback(
    (element: HTMLElement): string | null => {
      // Check data-ut-intent attribute
      const dataIntent = element.getAttribute('data-ut-intent');
      if (dataIntent) return dataIntent;
      
      // Check onclick attribute for intent
      const onclick = element.getAttribute('onclick');
      if (onclick?.includes('intent:')) {
        const match = onclick.match(/intent:([^\s'"]+)/);
        if (match) return match[1];
      }
      
      // Check href for navigation
      const href = element.getAttribute('href');
      if (href) {
        if (href.startsWith('#')) {
          return `nav.anchor:${href.slice(1)}`;
        }
        if (href.startsWith('http')) {
          return `nav.external:${href}`;
        }
        if (href.startsWith('/')) {
          return `nav.goto:${href}`;
        }
      }
      
      // Analyze text content for common patterns
      const text = element.textContent?.toLowerCase().trim() || '';
      if (text.includes('sign in') || text.includes('login')) return 'auth.signin';
      if (text.includes('sign up') || text.includes('register')) return 'auth.signup';
      if (text.includes('add to cart')) return 'cart.add';
      if (text.includes('view cart')) return 'cart.view';
      if (text.includes('book') || text.includes('schedule')) return 'booking.create';
      if (text.includes('contact') || text.includes('get in touch')) return 'overlay.open:contact';
      if (text.includes('learn more')) return 'nav.anchor:features';
      
      return null;
    },
    []
  );
  
  // Form submission handler
  const submitForm = useCallback(
    async (formId: string, data: Record<string, unknown>): Promise<IntentResult> => {
      log('FormSubmit:', formId, data);
      dispatchCMS({ type: 'FORM_SUBMIT', formId, data });
      
      // Determine intent from form
      const intent = formId.includes('contact')
        ? 'contact.submit'
        : formId.includes('newsletter')
          ? 'newsletter.subscribe'
          : 'lead.capture';
      
      return handleExecuteIntent(intent, { ...data, formId });
    },
    [log, handleExecuteIntent]
  );
  
  // Page access helpers
  const getPage = useCallback(
    (pageId: string): PageBundle | undefined => {
      return siteBundle?.pages?.[pageId];
    },
    [siteBundle]
  );
  
  const getPageByPath = useCallback(
    (path: string): PageBundle | undefined => {
      if (!siteBundle?.pages) return undefined;
      return Object.values(siteBundle.pages).find(p => p.path === path);
    },
    [siteBundle]
  );
  
  const getPageBindings = useCallback(
    (pageId: string): IntentBinding[] => {
      const page = getPage(pageId);
      if (!page?.intentBindings) return [];
      return Object.values(page.intentBindings);
    },
    [getPage]
  );
  
  // Asset resolution
  const resolveAssetUrl = useCallback(
    (assetId: string): string => {
      const asset = siteBundle?.assets?.[assetId];
      if (!asset) return '';
      
      // Draft assets use Supabase storage
      if (asset.storage.kind === 'supabase' && assetBaseUrl) {
        return `${assetBaseUrl}/${asset.storage.path}`;
      }
      
      // Inline base64
      if (asset.storage.kind === 'inline' && asset.storage.inlineBase64) {
        return asset.storage.inlineBase64;
      }
      
      // External URLs
      if (asset.storage.url) {
        return asset.storage.url;
      }
      
      return '';
    },
    [siteBundle, assetBaseUrl]
  );
  
  // Update CMS state helper
  const updateCMSState = useCallback(
    <K extends keyof CMSMockState>(key: K, value: CMSMockState[K]) => {
      log('UpdateCMSState:', key, value);
      // For now, just dispatch SET_CUSTOM for generic updates
      dispatchCMS({ type: 'SET_CUSTOM', key: String(key), value });
    },
    [log]
  );
  
  // Context value
  const contextValue = useMemo<PreviewRuntimeContextValue>(
    () => ({
      config,
      siteBundle,
      mode: config.mode,
      navigate: handleNavigate,
      scrollTo,
      goBack,
      currentPath: location.pathname,
      executeIntent: handleExecuteIntent,
      resolveIntent: resolveIntentFromElement,
      openOverlay,
      closeOverlay,
      overlayState,
      cmsState,
      updateCMSState,
      addToCart,
      removeFromCart,
      clearCart,
      submitForm,
      getPage,
      getPageByPath,
      getPageBindings,
      resolveAssetUrl,
    }),
    [
      config,
      siteBundle,
      location.pathname,
      handleNavigate,
      scrollTo,
      goBack,
      handleExecuteIntent,
      resolveIntentFromElement,
      openOverlay,
      closeOverlay,
      overlayState,
      cmsState,
      updateCMSState,
      addToCart,
      removeFromCart,
      clearCart,
      submitForm,
      getPage,
      getPageByPath,
      getPageBindings,
      resolveAssetUrl,
    ]
  );
  
  return (
    <PreviewRuntimeContext.Provider value={contextValue}>
      {children}
    </PreviewRuntimeContext.Provider>
  );
};

// ============================================================================
// Main PreviewRuntime Component
// ============================================================================

export interface PreviewRuntimeProps {
  config: PreviewRuntimeConfig;
  children: React.ReactNode;
}

/**
 * PreviewRuntime - Wrap your preview content with this.
 * 
 * @example
 * ```tsx
 * <PreviewRuntime config={{ mode: 'preview', siteBundle }}>
 *   <PageRenderer />
 * </PreviewRuntime>
 * ```
 */
export const PreviewRuntime: React.FC<PreviewRuntimeProps> = ({ config, children }) => {
  // Use HashRouter for preview, BrowserRouter for publish
  // (BrowserRouter would be set up at the publish build level)
  
  return (
    <HashRouter>
      <RuntimeProviderInner config={config}>
        {children}
      </RuntimeProviderInner>
    </HashRouter>
  );
};

export default PreviewRuntime;
