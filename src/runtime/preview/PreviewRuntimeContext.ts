/**
 * Preview Runtime Context
 * 
 * Separated for Fast Refresh compatibility.
 */

import { createContext } from 'react';
import type { IntentResult, IntentContext } from '@/runtime/intentExecutor';
import type { SiteBundle, PageBundle, IntentBinding } from '@/types/siteBundle';

// ============================================================================
// Types
// ============================================================================

export type PreviewMode = 'preview' | 'edit' | 'live' | 'publish';

export interface CMSMockState {
  /** Shopping cart items */
  cart: {
    items: Array<{ id: string; productId: string; name: string; price: number; quantity: number }>;
    total: number;
  };
  /** Form submissions (in-memory) */
  formSubmissions: Array<{
    formId: string;
    data: Record<string, unknown>;
    timestamp: number;
  }>;
  /** Auth state */
  auth: {
    isLoggedIn: boolean;
    user: { id: string; email: string; name: string } | null;
  };
  /** Booking simulation */
  bookings: Array<{
    id: string;
    service: string;
    date: string;
    time: string;
    status: 'pending' | 'confirmed';
  }>;
  /** Custom state (for templates) */
  custom: Record<string, unknown>;
}

export interface OverlayState {
  active: string | null;
  payload: Record<string, unknown>;
  stack: Array<{ type: string; payload: Record<string, unknown> }>;
}

export interface PreviewRuntimeConfig {
  mode: PreviewMode;
  siteBundle: SiteBundle;
  /** Draft asset base URL (Supabase storage) */
  assetBaseUrl?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Callback when navigation occurs */
  onNavigate?: (path: string, reason: string) => void;
  /** Callback when intent executes */
  onIntentExecute?: (intent: string, result: IntentResult) => void;
  /** Callback when overlay opens */
  onOverlayOpen?: (type: string, payload?: Record<string, unknown>) => void;
}

export interface PreviewRuntimeContextValue {
  // Configuration
  config: PreviewRuntimeConfig;
  siteBundle: SiteBundle;
  mode: PreviewMode;
  
  // Navigation
  navigate: (path: string, reason?: string) => void;
  scrollTo: (anchor: string) => void;
  goBack: () => void;
  currentPath: string;
  
  // Intent execution
  executeIntent: (intent: string, payload?: Record<string, unknown>, context?: IntentContext) => Promise<IntentResult>;
  resolveIntent: (element: HTMLElement) => string | null;
  
  // Overlay management
  openOverlay: (type: string, payload?: Record<string, unknown>) => void;
  closeOverlay: (type?: string) => void;
  overlayState: OverlayState;
  
  // CMS mock state
  cmsState: CMSMockState;
  updateCMSState: <K extends keyof CMSMockState>(key: K, value: CMSMockState[K]) => void;
  
  // Cart shortcuts
  addToCart: (item: { productId: string; name: string; price: number; quantity?: number }) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  
  // Form shortcuts
  submitForm: (formId: string, data: Record<string, unknown>) => Promise<IntentResult>;
  
  // Page access
  getPage: (pageId: string) => PageBundle | undefined;
  getPageByPath: (path: string) => PageBundle | undefined;
  getPageBindings: (pageId: string) => IntentBinding[];
  
  // Asset resolution
  resolveAssetUrl: (assetId: string) => string;
}

// ============================================================================
// Context
// ============================================================================

export const PreviewRuntimeContext = createContext<PreviewRuntimeContextValue | null>(null);
