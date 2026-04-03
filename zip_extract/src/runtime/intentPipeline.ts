/**
 * Intent Pipeline Configuration
 * 
 * Defines how each intent type should be handled in terms of UI/UX:
 * - Form intents: Autorun when triggered from form submit buttons
 * - Redirect intents: Navigate to specific pages
 * - Modal intents: Show overlay UI (auth, confirmation)
 * - Autorun intents: Execute immediately with toast feedback
 */

import type { CoreIntent } from '@/coreIntents';
import type { TemplateCategory } from './templateIntentConfig';

// ============================================================================
// PIPELINE MODE TYPES
// ============================================================================

export type PipelineMode = 
  | 'autorun'     // Execute immediately, show toast
  | 'redirect'    // Navigate to a specific page
  | 'modal'       // Show modal overlay
  | 'confirm'     // Show confirmation dialog before executing
  | 'form-scroll' // Scroll to form on page, or redirect if not found
  | 'checkout'    // Redirect to checkout page with context
  ;

export interface PipelineConfig {
  mode: PipelineMode;
  /** For redirect/checkout: target path */
  redirectPath?: string;
  /** For modal: modal type to show */
  modalType?: 'auth' | 'confirmation' | 'booking-picker';
  /** For confirm: fields to display in summary */
  confirmFields?: string[];
  /** Toast message on success */
  successMessage?: string;
  /** Toast message on error */
  errorMessage?: string;
  /** Whether to show loading state */
  showLoading?: boolean;
}

// ============================================================================
// INTENT PIPELINE REGISTRY
// ============================================================================

/**
 * Default pipeline configurations for each CoreIntent
 * These define the default UX behavior when an intent is triggered
 */
export const INTENT_PIPELINE_CONFIG: Partial<Record<CoreIntent, PipelineConfig>> = {
  // =========================================
  // NAVIGATION - Client-side, immediate
  // =========================================
  'nav.goto': {
    mode: 'autorun',
    showLoading: false,
  },
  'nav.anchor': {
    mode: 'autorun',
    showLoading: false,
  },
  'nav.external': {
    mode: 'autorun',
    showLoading: false,
  },

  // =========================================
  // PAYMENT - Redirect to checkout page
  // =========================================
  'pay.checkout': {
    mode: 'checkout',
    redirectPath: '/checkout',
    showLoading: true,
    successMessage: 'Redirecting to checkout...',
  },
  'pay.success': {
    mode: 'autorun',
    successMessage: 'Payment successful!',
  },
  'pay.cancel': {
    mode: 'autorun',
    successMessage: 'Payment cancelled',
  },

  // =========================================
  // BOOKING - Smart form detection
  // =========================================
  'booking.create': {
    mode: 'form-scroll',
    redirectPath: '/book',
    successMessage: 'Booking confirmed!',
    showLoading: true,
  },

  // =========================================
  // QUOTES - Summary confirmation
  // =========================================
  'quote.request': {
    mode: 'confirm',
    confirmFields: ['name', 'email', 'phone', 'message', 'service'],
    successMessage: 'Quote request submitted! We\'ll be in touch soon.',
    showLoading: true,
  },

  // =========================================
  // CONTACT - Summary confirmation  
  // =========================================
  'contact.submit': {
    mode: 'confirm',
    confirmFields: ['name', 'email', 'message'],
    successMessage: 'Message sent! We\'ll get back to you soon.',
    showLoading: true,
  },

  // =========================================
  // NEWSLETTER - Autorun with toast
  // =========================================
  'newsletter.subscribe': {
    mode: 'autorun',
    successMessage: 'You\'re subscribed!',
    showLoading: true,
  },

  // =========================================
  // LEAD CAPTURE - Autorun with toast
  // =========================================
  'lead.capture': {
    mode: 'autorun',
    successMessage: 'Submitted successfully!',
    showLoading: true,
  },
};

// ============================================================================
// INDUSTRY-SPECIFIC OVERRIDES
// ============================================================================

/**
 * Industry-specific pipeline overrides
 * These override the default behavior for specific template categories
 */
export const INDUSTRY_PIPELINE_OVERRIDES: Partial<Record<TemplateCategory, Partial<Record<CoreIntent, Partial<PipelineConfig>>>>> = {
  restaurant: {
    'booking.create': {
      redirectPath: '/reserve',
      successMessage: 'Reservation confirmed!',
    },
  },
  contractor: {
    'quote.request': {
      successMessage: 'We\'ll call you back with a free estimate!',
    },
  },
  agency: {
    'contact.submit': {
      successMessage: 'Thanks for reaching out! We\'ll be in touch soon.',
    },
  },
};

// ============================================================================
// AUTH MODAL CONFIGURATION
// ============================================================================

export interface AuthModalConfig {
  mode: 'signin' | 'signup';
  redirectOnSuccess?: string;
  title?: string;
  subtitle?: string;
}

export const AUTH_INTENT_CONFIG: Record<string, AuthModalConfig> = {
  'auth.signin': {
    mode: 'signin',
    redirectOnSuccess: '/',
    title: 'Sign In',
    subtitle: 'Welcome back! Sign in to your account.',
  },
  'auth.signup': {
    mode: 'signup',
    redirectOnSuccess: '/',
    title: 'Create Account',
    subtitle: 'Get started with a free account.',
  },
  'auth.login': {
    mode: 'signin',
    redirectOnSuccess: '/',
    title: 'Log In',
    subtitle: 'Welcome back!',
  },
  'auth.register': {
    mode: 'signup',
    redirectOnSuccess: '/',
    title: 'Register',
    subtitle: 'Create your account to get started.',
  },
};

// ============================================================================
// FORM DETECTION SELECTORS
// ============================================================================

/**
 * CSS selectors to detect forms on the page for each intent type
 */
export const FORM_DETECTION_SELECTORS: Record<string, string[]> = {
  'booking.create': [
    'form[data-intent="booking.create"]',
    'form[data-booking]',
    '#booking-form',
    '#reservation-form',
    '#appointment-form',
    '.booking-form',
    '.reservation-form',
    'form:has([name="date"]):has([name="time"])',
    'form:has([name="service"])',
  ],
  'contact.submit': [
    'form[data-intent="contact.submit"]',
    'form[data-contact]',
    '#contact-form',
    '.contact-form',
    'form:has([name="message"]):has([name="email"])',
  ],
  'quote.request': [
    'form[data-intent="quote.request"]',
    'form[data-quote]',
    '#quote-form',
    '#estimate-form',
    '.quote-form',
  ],
  'newsletter.subscribe': [
    'form[data-intent="newsletter.subscribe"]',
    'form[data-newsletter]',
    '#newsletter-form',
    '.newsletter-form',
    'form:has([name="email"]):not(:has([name="message"]))',
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get pipeline config for an intent, with optional industry override
 */
export function getPipelineConfig(
  intent: CoreIntent, 
  category?: TemplateCategory
): PipelineConfig {
  const baseConfig = INTENT_PIPELINE_CONFIG[intent] || { mode: 'autorun' as const };
  
  if (category) {
    const overrides = INDUSTRY_PIPELINE_OVERRIDES[category];
    if (overrides && overrides[intent]) {
      return { ...baseConfig, ...overrides[intent] };
    }
  }
  
  return baseConfig;
}

/**
 * Check if a form exists on the page for the given intent
 */
export function findFormForIntent(intent: string): HTMLFormElement | null {
  const selectors = FORM_DETECTION_SELECTORS[intent];
  if (!selectors) return null;
  
  for (const selector of selectors) {
    try {
      const form = document.querySelector<HTMLFormElement>(selector);
      if (form) return form;
    } catch {
      // Invalid selector, skip
    }
  }
  
  return null;
}

/**
 * Scroll to a form on the page, or return false if not found
 */
export function scrollToForm(intent: string): boolean {
  const form = findFormForIntent(intent);
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focus first input after scroll
    setTimeout(() => {
      const firstInput = form.querySelector<HTMLInputElement>('input:not([type="hidden"]), textarea, select');
      firstInput?.focus();
    }, 500);
    return true;
  }
  return false;
}

/**
 * Get auth modal config for an intent
 */
export function getAuthModalConfig(intent: string): AuthModalConfig | null {
  return AUTH_INTENT_CONFIG[intent] || null;
}

/**
 * Check if an intent should show auth modal
 */
export function isAuthIntent(intent: string): boolean {
  return intent.startsWith('auth.');
}

/**
 * Determine the pipeline action for a button click
 */
export function determinePipelineAction(
  intent: CoreIntent,
  hasFormContext: boolean,
  category?: TemplateCategory
): { action: 'execute' | 'scroll' | 'redirect' | 'modal' | 'confirm'; target?: string } {
  const config = getPipelineConfig(intent, category);
  
  // If triggered from within a form, always execute
  if (hasFormContext) {
    return { action: 'execute' };
  }
  
  switch (config.mode) {
    case 'autorun':
      return { action: 'execute' };
    
    case 'redirect':
    case 'checkout':
      return { action: 'redirect', target: config.redirectPath };
    
    case 'modal':
      return { action: 'modal', target: config.modalType };
    
    case 'confirm':
      return { action: 'confirm' };
    
    case 'form-scroll': {
      // Try to find and scroll to form first
      const formExists = findFormForIntent(intent);
      if (formExists) {
        return { action: 'scroll' };
      }
      // No form found, redirect to booking page
      return { action: 'redirect', target: config.redirectPath };
    }
    
    default:
      return { action: 'execute' };
  }
}

export default INTENT_PIPELINE_CONFIG;
