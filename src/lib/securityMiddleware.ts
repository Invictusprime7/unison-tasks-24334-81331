/**
 * Client-Side Security Middleware
 * 
 * Provides request/response interceptors, session monitoring,
 * and security event detection for the frontend application.
 */

import { supabase } from "@/integrations/supabase/client";
import { auditLogger } from "@/services/auditLogger";

// ============================================
// SESSION SECURITY MONITOR
// ============================================

/** Max idle time before warning (15 minutes) */
const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
/** Max session age before forced refresh (1 hour) */
const SESSION_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

let lastActivityTimestamp = Date.now();
let sessionCheckInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Track user activity to detect idle sessions.
 * Call from the app root to start monitoring.
 */
export function startSessionMonitor(): () => void {
  // Track user activity
  const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
  const onActivity = () => {
    lastActivityTimestamp = Date.now();
  };

  activityEvents.forEach((event) => {
    window.addEventListener(event, onActivity, { passive: true });
  });

  // Periodic session health check
  sessionCheckInterval = setInterval(async () => {
    const now = Date.now();
    const idleMs = now - lastActivityTimestamp;

    // Check if session is still valid
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return; // No active session
    }

    // Warn if idle too long (but don't force logout — that's UX)
    if (idleMs > SESSION_IDLE_TIMEOUT_MS) {
      console.info("[security] Session idle for", Math.round(idleMs / 60000), "minutes");
    }

    // Force token refresh if approaching expiry
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry > 0 && timeUntilExpiry < SESSION_REFRESH_INTERVAL_MS) {
      console.info("[security] Proactively refreshing session token");
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn("[security] Session refresh failed:", error.message);
        auditLogger.logSecurityEvent("session_refresh_failed", {
          error: error.message,
        }, "medium");
      }
    }
  }, 60_000); // Check every minute

  // Cleanup function
  return () => {
    activityEvents.forEach((event) => {
      window.removeEventListener(event, onActivity);
    });
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
  };
}

// ============================================
// CONCURRENT SESSION DETECTION
// ============================================

const SESSION_TAB_KEY = "unison_active_tab";
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

/**
 * Detect and manage concurrent tabs with the same session.
 * Returns a cleanup function.
 */
export function startTabMonitor(): () => void {
  // Register this tab
  sessionStorage.setItem(SESSION_TAB_KEY, TAB_ID);

  const onStorageChange = (e: StorageEvent) => {
    if (e.key === SESSION_TAB_KEY && e.newValue && e.newValue !== TAB_ID) {
      console.info("[security] Another tab detected with the same session");
    }
  };

  window.addEventListener("storage", onStorageChange);

  return () => {
    window.removeEventListener("storage", onStorageChange);
  };
}

// ============================================
// FAILED LOGIN ATTEMPT TRACKING
// ============================================

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const FAILED_ATTEMPTS_KEY = "unison_failed_logins";

interface FailedAttempts {
  count: number;
  lockedUntil: number | null;
}

function getFailedAttempts(): FailedAttempts {
  try {
    const stored = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch { /* ignore parse errors */ }
  return { count: 0, lockedUntil: null };
}

function setFailedAttempts(attempts: FailedAttempts): void {
  localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(attempts));
}

/**
 * Check if login is currently locked out due to too many failed attempts.
 * Returns { locked, remainingMs, attemptsLeft }.
 */
export function checkLoginLockout(): {
  locked: boolean;
  remainingMs: number;
  attemptsLeft: number;
} {
  const attempts = getFailedAttempts();
  const now = Date.now();

  if (attempts.lockedUntil && attempts.lockedUntil > now) {
    return {
      locked: true,
      remainingMs: attempts.lockedUntil - now,
      attemptsLeft: 0,
    };
  }

  // Reset if lockout expired
  if (attempts.lockedUntil && attempts.lockedUntil <= now) {
    setFailedAttempts({ count: 0, lockedUntil: null });
    return { locked: false, remainingMs: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }

  return {
    locked: false,
    remainingMs: 0,
    attemptsLeft: MAX_FAILED_ATTEMPTS - attempts.count,
  };
}

/**
 * Record a failed login attempt. Returns true if now locked out.
 */
export function recordFailedLogin(): boolean {
  const attempts = getFailedAttempts();
  attempts.count++;

  if (attempts.count >= MAX_FAILED_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    setFailedAttempts(attempts);

    auditLogger.logSecurityEvent("account_lockout", {
      attempts: attempts.count,
      lockout_minutes: LOCKOUT_DURATION_MS / 60000,
    }, "high");

    return true;
  }

  setFailedAttempts(attempts);
  return false;
}

/**
 * Clear failed login tracking on successful login.
 */
export function clearFailedLogins(): void {
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
}

// ============================================
// CONTENT SECURITY
// ============================================

/**
 * Validate that a URL is safe to navigate to or embed.
 * Blocks javascript:, data:, and vbscript: URLs.
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("javascript:")) return false;
  if (trimmed.startsWith("vbscript:")) return false;
  if (trimmed.startsWith("data:text/html")) return false;
  // Allow data: for images only
  if (trimmed.startsWith("data:") && !trimmed.startsWith("data:image/")) return false;
  return true;
}

/**
 * Sanitize user input to prevent XSS in dynamic string contexts.
 * For HTML content, use htmlSanitizer.ts instead.
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}
