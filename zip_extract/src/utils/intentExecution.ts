/**
 * =========================================
 * Intent Execution Utilities
 * =========================================
 * 
 * Utilities for working with intents in the PageNode system.
 * Provides helpers to:
 * - Parse intent strings
 * - Extract intents from pages
 * - Create intent attributes for DOM elements
 * - Wire up intent click handlers
 */

import type { PageNode } from "@/schemas/SiteGraph";

/**
 * Intent execution result
 */
export interface IntentExecutionResult {
  success: boolean;
  intent: string;
  payload: Record<string, unknown>;
  error?: Error;
}

/**
 * Intent execution options
 */
export interface IntentExecutionOptions {
  /** Callback before execution */
  onBeforeExecute?: (intent: string, payload: Record<string, unknown>) => boolean | void;
  
  /** Callback after execution */
  onAfterExecute?: (result: IntentExecutionResult) => void;
  
  /** Debug mode */
  debug?: boolean;
}

/**
 * Parse an intent string to get category and action
 * Format: "category.action" (e.g., "booking.open_modal", "nav.goto_page")
 */
export function parseIntent(intent: string): { category: string; action: string } {
  const [category, ...rest] = intent.split(".");
  return {
    category: category || "unknown",
    action: rest.join(".") || intent,
  };
}

/**
 * Check if an intent is a navigation intent
 */
export function isNavIntent(intent: string): boolean {
  const navIntents = [
    "nav.goto_page",
    "nav.scroll_to",
    "nav.external",
    "navigate",
    "goto",
  ];
  return navIntents.some(n => intent.includes(n) || intent.startsWith(n));
}

/**
 * Check if an intent opens an overlay
 */
export function isOverlayIntent(intent: string): boolean {
  const overlayIntents = [
    "booking.open_modal",
    "cart.open",
    "auth.open",
    "contact.open_form",
    "modal.open",
    "overlay.open",
  ];
  return overlayIntents.some(o => intent.includes(o) || intent.startsWith(o));
}

/**
 * Check if an intent is a form submission
 */
export function isFormIntent(intent: string): boolean {
  return intent.includes("submit") || intent.includes("form") || intent === "contact.submit";
}

/**
 * Extracted intent info from a page
 */
export interface ExtractedIntent {
  sectionId: string;
  sectionType: string;
  intentId: string;
  label?: string;
  payload?: Record<string, unknown>;
}

/**
 * Extract all intents from a page
 */
export function extractPageIntents(page: PageNode): ExtractedIntent[] {
  const intents: ExtractedIntent[] = [];
  
  for (const section of page.sections) {
    if (section.bindings?.intents) {
      for (const intent of section.bindings.intents) {
        intents.push({
          sectionId: section.id,
          sectionType: section.type,
          intentId: intent.intentId,
          label: intent.label,
          payload: intent.payload,
        });
      }
    }
  }
  
  return intents;
}

/**
 * Wire up click handlers for intent-annotated elements in a document
 */
export function wireIntentClicks(
  document: Document,
  onIntent: (intent: string, payload: Record<string, unknown>) => void,
  options: IntentExecutionOptions = {}
): () => void {
  const { debug, onBeforeExecute, onAfterExecute } = options;
  
  const handleClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const intentElement = target.closest("[data-intent]") as HTMLElement | null;
    
    if (!intentElement) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const intent = intentElement.getAttribute("data-intent");
    if (!intent) return;
    
    let payload: Record<string, unknown> = {};
    const payloadAttr = intentElement.getAttribute("data-payload");
    if (payloadAttr) {
      try {
        payload = JSON.parse(payloadAttr);
      } catch (e) {
        if (debug) console.warn("[IntentExecution] Invalid payload JSON:", payloadAttr);
      }
    }
    
    // Check if should proceed
    if (onBeforeExecute) {
      const shouldProceed = onBeforeExecute(intent, payload);
      if (shouldProceed === false) return;
    }
    
    if (debug) {
      console.log("[IntentExecution] Intent triggered:", intent, payload);
    }
    
    onIntent(intent, payload);
    
    onAfterExecute?.({
      success: true,
      intent,
      payload,
    });
  };
  
  document.addEventListener("click", handleClick, true);
  
  // Return cleanup function
  return () => {
    document.removeEventListener("click", handleClick, true);
  };
}

/**
 * Create intent data attributes for an element
 */
export function createIntentAttributes(
  intent: string,
  payload?: Record<string, unknown>
): Record<string, string> {
  const attrs: Record<string, string> = {
    "data-intent": intent,
  };
  
  if (payload && Object.keys(payload).length > 0) {
    attrs["data-payload"] = JSON.stringify(payload);
  }
  
  return attrs;
}

/**
 * Create React props for an intent-enabled element
 */
export function createIntentProps(
  intent: string,
  payload?: Record<string, unknown>,
  onClick?: (e: React.MouseEvent) => void
): {
  "data-intent": string;
  "data-payload"?: string;
  onClick: (e: React.MouseEvent) => void;
} {
  return {
    "data-intent": intent,
    ...(payload && Object.keys(payload).length > 0
      ? { "data-payload": JSON.stringify(payload) }
      : {}),
    onClick: (e: React.MouseEvent) => {
      onClick?.(e);
    },
  };
}

/**
 * Intent categories and their common actions
 */
export const INTENT_CATEGORIES = {
  nav: ["goto_page", "scroll_to", "external", "back", "forward"],
  booking: ["open_modal", "select_service", "select_time", "confirm", "cancel"],
  cart: ["add", "remove", "update_quantity", "checkout", "clear"],
  auth: ["sign_in", "sign_up", "sign_out", "open_modal", "forgot_password"],
  contact: ["open_form", "submit", "call", "email"],
  subscription: ["select_plan", "upgrade", "cancel", "manage"],
  social: ["share", "follow", "like"],
} as const;

/**
 * Get common intents for a page type
 */
export function getCommonIntentsForPage(pageIntent: string): string[] {
  const commonIntents: Record<string, string[]> = {
    "nav.home": ["nav.goto_page", "nav.scroll_to", "booking.open_modal", "contact.open_form"],
    "nav.services": ["nav.goto_page", "booking.open_modal", "cart.add"],
    "nav.about": ["nav.goto_page", "nav.scroll_to", "contact.open_form"],
    "nav.contact": ["contact.submit", "contact.call", "contact.email"],
    "nav.booking": ["booking.open_modal", "booking.select_service", "booking.confirm"],
    "nav.menu": ["cart.add", "nav.scroll_to"],
    "nav.products": ["cart.add", "nav.goto_page"],
    "nav.pricing": ["subscription.select_plan", "contact.open_form"],
    "nav.gallery": ["nav.scroll_to", "nav.external"],
  };
  
  return commonIntents[pageIntent] || ["nav.goto_page"];
}
