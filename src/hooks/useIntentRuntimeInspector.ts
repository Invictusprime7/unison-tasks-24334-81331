/**
 * useIntentRuntimeInspector — In-memory tail of intent runtime events.
 *
 * Subscribes to the existing intent success + failure buses and keeps a
 * bounded history with per-intent counters. Used by the Business OS shell's
 * Intent Runtime Inspector panel.
 *
 * Pure runtime — no network, no DB.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onIntentSuccess, type IntentSuccessEvent } from "@/runtime/intentSuccessBus";
import { onIntentFailure, type IntentFailureEvent } from "@/runtime/intentFailureBus";

export interface IntentRuntimeEvent {
  id: string;
  kind: "success" | "failure";
  intent: string;
  normalizedIntent?: string;
  timestamp: number;
  source: string;
  errorCode?: string;
  errorMessage?: string;
  actionLabel?: string;
  payload: Record<string, unknown>;
}

export interface IntentRuntimeStats {
  totalEvents: number;
  totalSuccess: number;
  totalFailure: number;
  successRate: number; // 0-100
  /** Per-intent rollup, sorted by total desc */
  perIntent: Array<{
    intent: string;
    success: number;
    failure: number;
    lastSeen: number;
  }>;
}

export interface UseIntentRuntimeInspectorReturn {
  events: IntentRuntimeEvent[];
  stats: IntentRuntimeStats;
  isPaused: boolean;
  setPaused: (paused: boolean) => void;
  clear: () => void;
}

const DEFAULT_LIMIT = 100;

export function useIntentRuntimeInspector(limit = DEFAULT_LIMIT): UseIntentRuntimeInspectorReturn {
  const [events, setEvents] = useState<IntentRuntimeEvent[]>([]);
  const [isPaused, setPaused] = useState(false);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  useEffect(() => {
    const offSuccess = onIntentSuccess((evt: IntentSuccessEvent) => {
      if (pausedRef.current) return;
      setEvents((prev) => prependBounded(prev, {
        id: `s-${evt.timestamp}-${evt.intent}-${prev.length}`,
        kind: "success",
        intent: evt.intent,
        timestamp: evt.timestamp,
        source: evt.source,
        actionLabel: evt.actionLabel,
        payload: evt.payload,
      }, limit));
    });
    const offFailure = onIntentFailure((evt: IntentFailureEvent) => {
      if (pausedRef.current) return;
      setEvents((prev) => prependBounded(prev, {
        id: `f-${evt.timestamp}-${evt.intent}-${prev.length}`,
        kind: "failure",
        intent: evt.intent,
        normalizedIntent: evt.normalizedIntent,
        timestamp: evt.timestamp,
        source: evt.source,
        errorCode: evt.error.code,
        errorMessage: evt.error.message,
        actionLabel: evt.userAction,
        payload: evt.payload,
      }, limit));
    });
    return () => {
      offSuccess();
      offFailure();
    };
  }, [limit]);

  const stats = useMemo<IntentRuntimeStats>(() => {
    const map = new Map<string, { success: number; failure: number; lastSeen: number }>();
    let totalSuccess = 0;
    let totalFailure = 0;
    for (const e of events) {
      const cur = map.get(e.intent) || { success: 0, failure: 0, lastSeen: 0 };
      if (e.kind === "success") {
        cur.success += 1;
        totalSuccess += 1;
      } else {
        cur.failure += 1;
        totalFailure += 1;
      }
      cur.lastSeen = Math.max(cur.lastSeen, e.timestamp);
      map.set(e.intent, cur);
    }
    const total = totalSuccess + totalFailure;
    const perIntent = Array.from(map.entries())
      .map(([intent, v]) => ({ intent, ...v }))
      .sort((a, b) => (b.success + b.failure) - (a.success + a.failure));
    return {
      totalEvents: total,
      totalSuccess,
      totalFailure,
      successRate: total === 0 ? 100 : Math.round((totalSuccess / total) * 100),
      perIntent,
    };
  }, [events]);

  const clear = useCallback(() => setEvents([]), []);

  return { events, stats, isPaused, setPaused, clear };
}

function prependBounded<T>(prev: T[], item: T, limit: number): T[] {
  const next = [item, ...prev];
  if (next.length > limit) next.length = limit;
  return next;
}
