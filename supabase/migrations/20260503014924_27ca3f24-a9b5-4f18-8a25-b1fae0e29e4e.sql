-- GHL webhook event ingestion
CREATE TABLE IF NOT EXISTS public.ghl_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  location_id text,
  contact_id text,
  opportunity_id text,
  workflow_id text,
  pipeline_id text,
  stage_id text,
  previous_stage_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature text,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  process_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghl_webhook_events_business_created
  ON public.ghl_webhook_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ghl_webhook_events_event_type
  ON public.ghl_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ghl_webhook_events_contact
  ON public.ghl_webhook_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_ghl_webhook_events_opportunity
  ON public.ghl_webhook_events(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_ghl_webhook_events_processed
  ON public.ghl_webhook_events(processed, created_at) WHERE processed = false;

ALTER TABLE public.ghl_webhook_events ENABLE ROW LEVEL SECURITY;

-- Members of the business can read their webhook events
CREATE POLICY "Business members can read GHL webhook events"
  ON public.ghl_webhook_events
  FOR SELECT
  TO authenticated
  USING (
    business_id IS NOT NULL
    AND public.is_business_member(business_id)
  );

-- Only service role inserts (edge function). No public/authenticated insert policy => denied.
-- Service role bypasses RLS entirely.

-- Allow business members to mark events as processed (e.g., from in-app handlers)
CREATE POLICY "Business members can update GHL webhook events"
  ON public.ghl_webhook_events
  FOR UPDATE
  TO authenticated
  USING (business_id IS NOT NULL AND public.is_business_member(business_id))
  WITH CHECK (business_id IS NOT NULL AND public.is_business_member(business_id));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ghl_webhook_events;