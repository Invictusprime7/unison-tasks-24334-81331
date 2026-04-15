/**
 * Feedback Logger — Layer 5: Captures interpretation misses and corrections.
 * 
 * Stores failed/corrected interpretations for continuous improvement.
 * Uses localStorage for client-side accumulation, with periodic flush
 * to the database when a business context is available.
 */

import type { InterpretationFeedback, NLRoute } from './nlTypes';

const STORAGE_KEY = 'unison_nl_feedback';
const MAX_LOCAL_ENTRIES = 100;

// ============================================================================
// In-memory buffer
// ============================================================================

let feedbackBuffer: InterpretationFeedback[] = [];

/**
 * Log an interpretation result for future analysis.
 */
export function logInterpretation(feedback: InterpretationFeedback): void {
  feedbackBuffer.push(feedback);

  // Persist to localStorage
  try {
    const existing = loadLocalFeedback();
    existing.push(feedback);

    // Keep only the most recent entries
    const trimmed = existing.slice(-MAX_LOCAL_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable or full — keep in memory only
  }
}

/**
 * Log a correction (user told us we got it wrong).
 */
export function logCorrection(
  originalFeedbackId: string,
  correctedRoute: NLRoute,
  correctedIntent?: string
): void {
  // Update in-memory
  const entry = feedbackBuffer.find(f => f.id === originalFeedbackId);
  if (entry) {
    entry.correctedRoute = correctedRoute;
    entry.correctedIntent = correctedIntent;
    entry.outcome = 'failure';
  }

  // Update in localStorage
  try {
    const all = loadLocalFeedback();
    const idx = all.findIndex(f => f.id === originalFeedbackId);
    if (idx !== -1) {
      all[idx].correctedRoute = correctedRoute;
      all[idx].correctedIntent = correctedIntent;
      all[idx].outcome = 'failure';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch {
    // Ignore
  }
}

/**
 * Get accumulated feedback for analysis.
 */
export function getFeedbackBuffer(): InterpretationFeedback[] {
  return [...feedbackBuffer];
}

/**
 * Get feedback from localStorage (persisted across sessions).
 */
export function loadLocalFeedback(): InterpretationFeedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Get misclassification stats for diagnostics.
 */
export function getMisclassificationStats(): {
  total: number;
  failures: number;
  failureRate: number;
  topMisclassifiedRoutes: Array<{ route: string; count: number }>;
  avgConfidenceOnFailure: number;
} {
  const all = loadLocalFeedback();
  const failures = all.filter(f => f.outcome === 'failure');

  const routeCounts: Record<string, number> = {};
  for (const f of failures) {
    const key = `${f.route.route} → ${f.correctedRoute ?? '?'}`;
    routeCounts[key] = (routeCounts[key] || 0) + 1;
  }

  const topMisclassifiedRoutes = Object.entries(routeCounts)
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const avgConfidenceOnFailure =
    failures.length > 0
      ? failures.reduce((sum, f) => sum + f.route.confidence, 0) / failures.length
      : 0;

  return {
    total: all.length,
    failures: failures.length,
    failureRate: all.length > 0 ? failures.length / all.length : 0,
    topMisclassifiedRoutes,
    avgConfidenceOnFailure,
  };
}

/**
 * Clear all stored feedback (for privacy or reset).
 */
export function clearFeedback(): void {
  feedbackBuffer = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
