/**
 * useGhlWebhookEvents
 *
 * Subscribes to `ghl_webhook_events` for the current business and exposes a
 * live tail of incoming GHL webhook events (contact created, opportunity
 * stage changed, workflow fired, etc). Use this in task views, CRM
 * dashboards, or builder panels to react to GHL stage changes in real time.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GhlWebhookEvent {
  id: string;
  business_id: string | null;
  project_id: string | null;
  event_type: string;
  location_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  workflow_id: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  previous_stage_id: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  created_at: string;
}

interface Options {
  businessId?: string | null;
  limit?: number;
  eventTypes?: string[];
  onEvent?: (event: GhlWebhookEvent) => void;
}

export function useGhlWebhookEvents({
  businessId,
  limit = 50,
  eventTypes,
  onEvent,
}: Options) {
  const [events, setEvents] = useState<GhlWebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    let q = supabase
      .from('ghl_webhook_events')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (eventTypes && eventTypes.length) q = q.in('event_type', eventTypes);
    const { data, error: err } = await q;
    if (err) setError(err.message);
    else setEvents((data || []) as GhlWebhookEvent[]);
    setLoading(false);
  }, [businessId, limit, eventTypes]);

  const markProcessed = useCallback(async (id: string) => {
    await supabase
      .from('ghl_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', id);
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, processed: true } : e)),
    );
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`ghl-webhook-events-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ghl_webhook_events',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const evt = payload.new as GhlWebhookEvent;
          if (eventTypes && eventTypes.length && !eventTypes.includes(evt.event_type)) {
            return;
          }
          setEvents((prev) => [evt, ...prev].slice(0, limit));
          onEvent?.(evt);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, limit, eventTypes, onEvent]);

  return { events, loading, error, refresh, markProcessed };
}
