/**
 * Preview UTP Bridge
 * 
 * Translates legacy postMessage types to standardized UTP/1 messages.
 * All preview components should use this bridge for host communication.
 * 
 * Legacy Messages → UTP/1:
 * - PREVIEW_READY → UTP/PREVIEW_READY
 * - PREVIEW_ERROR → UTP/LOG_EVENT (level: error)
 * - INTENT_TRIGGER → UTP/INTENT_EXECUTE
 * - RESEARCH_OPEN → UTP/OVERLAY_OPEN
 * - NAV_REQUEST → UTP/NAV_REQUEST
 */

import { nanoid } from "nanoid";
import type {
  UTPMessage,
  PreviewReadyPayload,
  IntentExecutePayload,
  NavRequestPayload,
  OverlayOpenPayload,
  LogEventPayload,
  ProtocolErrorPayload,
} from "@/types/siteBundle";

// Log level type (matches LogEventPayload.level)
type LogLevel = "info" | "warn" | "error";

// ============================================================================
// Types
// ============================================================================

/** Site context for UTP messages */
export interface PreviewContext {
  siteId: string;
  buildId?: string;
  pageId: string;
  sessionId?: string;
}

/** Capabilities reported by preview (maps to UTP capabilities) */
export interface PreviewCapabilities {
  canNavigate: boolean;
  canOverlay: boolean;
  canState: boolean;
}

/** Legacy message types (to be deprecated) */
export type LegacyMessageType =
  | "PREVIEW_READY"
  | "PREVIEW_ERROR"
  | "PREVIEW_ERRORS_RESPONSE"
  | "INTENT_TRIGGER"
  | "INTENT_RESULT"
  | "RESEARCH_OPEN"
  | "NAV_REQUEST"
  | "ELEMENT_SELECT"
  | "ELEMENT_UPDATE"
  | "ELEMENT_DELETE"
  | "ELEMENT_DUPLICATE";

// ============================================================================
// UTP Message Factory
// ============================================================================

function createUTPBase<T extends string, P>(
  type: T,
  siteId: string,
  payload: P
): UTPMessage<T, P> {
  return {
    protocol: "UTP/1",
    type,
    requestId: nanoid(),
    siteId,
    ts: Date.now(),
    payload,
  };
}

// ============================================================================
// Message Creation Functions
// ============================================================================

export function createPreviewReady(
  siteId: string,
  capabilities: PreviewCapabilities
): UTPMessage<"UTP/PREVIEW_READY", PreviewReadyPayload> {
  return createUTPBase("UTP/PREVIEW_READY", siteId, {
    capabilities,
  });
}

export function createIntentExecute(
  siteId: string,
  intentId: string,
  params: Record<string, unknown>,
  bindingId?: string
): UTPMessage<"UTP/INTENT_EXECUTE", IntentExecutePayload> {
  return createUTPBase("UTP/INTENT_EXECUTE", siteId, {
    intentId,
    params,
    bindingId,
  });
}

export function createNavRequest(
  siteId: string,
  to: string,
  reason: "user" | "intent" | "system" = "user"
): UTPMessage<"UTP/NAV_REQUEST", NavRequestPayload> {
  return createUTPBase("UTP/NAV_REQUEST", siteId, {
    to,
    reason,
  });
}

export function createOverlayOpen(
  siteId: string,
  overlayId: string,
  data?: unknown
): UTPMessage<"UTP/OVERLAY_OPEN", OverlayOpenPayload> {
  return createUTPBase("UTP/OVERLAY_OPEN", siteId, {
    overlayId,
    data,
  });
}

export function createLogEvent(
  siteId: string,
  level: LogLevel,
  event: string,
  data?: unknown
): UTPMessage<"UTP/LOG_EVENT", LogEventPayload> {
  return createUTPBase("UTP/LOG_EVENT", siteId, {
    level,
    event,
    data,
  });
}

export function createProtocolError(
  siteId: string,
  code: string,
  message: string,
  data?: unknown
): UTPMessage<"UTP/PROTOCOL_ERROR", ProtocolErrorPayload> {
  return createUTPBase("UTP/PROTOCOL_ERROR", siteId, {
    code,
    message,
    data,
  });
}

// ============================================================================
// Legacy → UTP Translation
// ============================================================================

export function translateLegacyToUTP(
  legacyMessage: { type: string; [key: string]: unknown },
  context: PreviewContext
): UTPMessage<string, unknown> | null {
  const { type } = legacyMessage;
  const { siteId } = context;

  switch (type) {
    case "PREVIEW_READY":
      return createPreviewReady(siteId, {
        canNavigate: true,
        canOverlay: true,
        canState: false,
      });

    case "PREVIEW_ERROR":
      return createLogEvent(
        siteId,
        "error",
        "preview.error",
        { error: legacyMessage.error }
      );

    case "INTENT_TRIGGER":
      return createIntentExecute(
        siteId,
        legacyMessage.intent as string,
        legacyMessage.payload as Record<string, unknown> || {},
        legacyMessage.bindingId as string
      );

    case "RESEARCH_OPEN":
      return createOverlayOpen(
        siteId,
        "research",
        legacyMessage.payload
      );

    case "NAV_REQUEST":
      return createNavRequest(
        siteId,
        legacyMessage.path as string || legacyMessage.to as string,
        "user"
      );

    default:
      // Unknown message type - log as warning
      console.warn("[UTP Bridge] Unknown legacy message:", type);
      return null;
  }
}

// ============================================================================
// UTP Bridge Class
// ============================================================================

export class PreviewUTPBridge {
  private context: PreviewContext;
  private targetOrigin: string;
  private listeners: Map<string, Set<(msg: UTPMessage<string, unknown>) => void>>;

  constructor(context: PreviewContext, targetOrigin: string = "*") {
    this.context = context;
    this.targetOrigin = targetOrigin;
    this.listeners = new Map();
  }

  /**
   * Update context (e.g., when page changes)
   */
  updateContext(updates: Partial<PreviewContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Send UTP message to host
   */
  send<T extends string, P>(message: UTPMessage<T, P>): void {
    window.parent.postMessage(message, this.targetOrigin);
  }

  /**
   * Send preview ready message
   */
  sendReady(capabilities?: Partial<PreviewCapabilities>): void {
    this.send(createPreviewReady(this.context.siteId, {
      canNavigate: capabilities?.canNavigate ?? true,
      canOverlay: capabilities?.canOverlay ?? true,
      canState: capabilities?.canState ?? false,
    }));
  }

  /**
   * Send intent execute request
   */
  sendIntent(intentId: string, params: Record<string, unknown>, bindingId?: string): void {
    this.send(createIntentExecute(this.context.siteId, intentId, params, bindingId));
  }

  /**
   * Send navigation request
   */
  sendNavRequest(to: string, reason: "user" | "intent" | "system" = "user"): void {
    this.send(createNavRequest(this.context.siteId, to, reason));
  }

  /**
   * Send overlay open request
   */
  sendOverlayOpen(overlayId: string, data?: unknown): void {
    this.send(createOverlayOpen(this.context.siteId, overlayId, data));
  }

  /**
   * Send log event
   */
  sendLog(level: LogLevel, event: string, data?: unknown): void {
    this.send(createLogEvent(this.context.siteId, level, event, data));
  }

  /**
   * Send error
   */
  sendError(code: string, message: string, data?: unknown): void {
    this.send(createProtocolError(this.context.siteId, code, message, data));
  }

  /**
   * Listen for UTP messages from host
   */
  on<T extends string>(type: T, handler: (msg: UTPMessage<T, unknown>) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler as (msg: UTPMessage<string, unknown>) => void);

    // Return cleanup function
    return () => {
      this.listeners.get(type)?.delete(handler as (msg: UTPMessage<string, unknown>) => void);
    };
  }

  /**
   * Process incoming message
   */
  handleMessage(event: MessageEvent): void {
    const message = event.data;

    // Validate UTP message
    if (!message || message.protocol !== "UTP/1" || !message.type) {
      return;
    }

    // Dispatch to listeners
    const handlers = this.listeners.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  /**
   * Start listening for messages
   */
  start(): () => void {
    const handler = (event: MessageEvent) => this.handleMessage(event);
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }
}

// ============================================================================
// Iframe Injection Script Generator
// ============================================================================

/**
 * Generate a script to be injected into preview iframes
 * This provides UTP messaging capabilities to the preview content
 */
export function generateUTPInjectionScript(context: PreviewContext): string {
  return `
(function() {
  'use strict';
  
  // Simple UUID generator for requestId
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // UTP Bridge for preview content
  window.__UTP_CONTEXT__ = ${JSON.stringify(context)};
  
  // Send UTP message to host
  window.__UTP_SEND__ = function(type, payload) {
    var msg = {
      protocol: 'UTP/1',
      type: type,
      requestId: generateId(),
      siteId: window.__UTP_CONTEXT__.siteId,
      ts: Date.now(),
      payload: payload
    };
    window.parent.postMessage(msg, '*');
    return msg;
  };
  
  // Convenience methods
  window.__UTP__ = {
    sendReady: function(capabilities) {
      return window.__UTP_SEND__('UTP/PREVIEW_READY', {
        capabilities: capabilities || { canNavigate: true, canOverlay: true, canState: false }
      });
    },
    
    sendIntent: function(intentId, params, bindingId) {
      return window.__UTP_SEND__('UTP/INTENT_EXECUTE', {
        intentId: intentId,
        params: params || {},
        bindingId: bindingId
      });
    },
    
    sendNavRequest: function(to, reason) {
      return window.__UTP_SEND__('UTP/NAV_REQUEST', {
        to: to,
        reason: reason || 'user'
      });
    },
    
    sendOverlayOpen: function(overlayId, data) {
      return window.__UTP_SEND__('UTP/OVERLAY_OPEN', {
        overlayId: overlayId,
        data: data
      });
    },
    
    sendLog: function(level, event, data) {
      return window.__UTP_SEND__('UTP/LOG_EVENT', {
        level: level,
        event: event,
        data: data
      });
    },
    
    sendError: function(code, message, data) {
      return window.__UTP_SEND__('UTP/PROTOCOL_ERROR', {
        code: code,
        message: message,
        data: data
      });
    }
  };
  
  // Listen for host messages
  window.addEventListener('message', function(event) {
    var msg = event.data;
    if (!msg || msg.protocol !== 'UTP/1') return;
    
    // Dispatch custom event for easy handling
    window.dispatchEvent(new CustomEvent('utp:' + msg.type, { detail: msg }));
  });
  
  // Legacy support: intercept data-intent clicks and convert to UTP
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-intent]');
    if (!el) return;
    
    var intent = el.getAttribute('data-intent');
    var bindingId = el.getAttribute('data-ut-id') || el.id;
    
    // Collect parameters from data-* attributes
    var params = {};
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-param-')) {
        params[attr.name.replace('data-param-', '')] = attr.value;
      }
    });
    
    window.__UTP__.sendIntent(intent, params, bindingId);
    e.preventDefault();
  });
  
  // Legacy support: intercept internal links and convert to UTP
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href^="/"]');
    if (!link) return;
    if (link.hasAttribute('data-intent')) return; // Already handled
    
    var href = link.getAttribute('href');
    window.__UTP__.sendNavRequest(href);
    e.preventDefault();
  });
  
  console.log('[UTP] Preview bridge initialized for site:', window.__UTP_CONTEXT__.siteId);
})();
`;
}

// ============================================================================
// React Hook for UTP Bridge
// ============================================================================

import { useRef, useEffect, useCallback, useState } from "react";

export function usePreviewUTP(context: PreviewContext, targetOrigin: string = "*") {
  const bridgeRef = useRef<PreviewUTPBridge | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize bridge
  useEffect(() => {
    bridgeRef.current = new PreviewUTPBridge(context, targetOrigin);
    const cleanup = bridgeRef.current.start();
    setIsInitialized(true);

    return cleanup;
  }, [context.siteId, targetOrigin]);

  // Update context when it changes
  useEffect(() => {
    if (bridgeRef.current) {
      bridgeRef.current.updateContext(context);
    }
  }, [context]);

  const send = useCallback(<T extends string, P>(message: UTPMessage<T, P>) => {
    bridgeRef.current?.send(message);
  }, []);

  const sendReady = useCallback((capabilities?: Partial<PreviewCapabilities>) => {
    bridgeRef.current?.sendReady(capabilities);
  }, []);

  const sendIntent = useCallback((intentId: string, params: Record<string, unknown>, bindingId?: string) => {
    bridgeRef.current?.sendIntent(intentId, params, bindingId);
  }, []);

  const sendNavRequest = useCallback((to: string) => {
    bridgeRef.current?.sendNavRequest(to);
  }, []);

  const sendOverlayOpen = useCallback((overlayId: string, data?: unknown) => {
    bridgeRef.current?.sendOverlayOpen(overlayId, data);
  }, []);

  const sendLog = useCallback((level: LogLevel, event: string, data?: unknown) => {
    bridgeRef.current?.sendLog(level, event, data);
  }, []);

  const sendError = useCallback((code: string, message: string, data?: unknown) => {
    bridgeRef.current?.sendError(code, message, data);
  }, []);

  const on = useCallback(<T extends string>(type: T, handler: (msg: UTPMessage<T, unknown>) => void) => {
    return bridgeRef.current?.on(type, handler) || (() => {});
  }, []);

  return {
    isInitialized,
    send,
    sendReady,
    sendIntent,
    sendNavRequest,
    sendOverlayOpen,
    sendLog,
    sendError,
    on,
    getInjectionScript: () => generateUTPInjectionScript(context),
  };
}
