
CREATE TABLE IF NOT EXISTS public.ghl_event_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  event_type text NOT NULL,
  stage_filter text,
  pipeline_filter text,
  workflow_filter text,
  action_type text NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghl_reactions_business_event
  ON public.ghl_event_reactions(business_id, event_type) WHERE enabled = true;

ALTER TABLE public.ghl_event_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read reactions"
  ON public.ghl_event_reactions FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "Business members can insert reactions"
  ON public.ghl_event_reactions FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can update reactions"
  ON public.ghl_event_reactions FOR UPDATE TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can delete reactions"
  ON public.ghl_event_reactions FOR DELETE TO authenticated
  USING (public.is_business_member(business_id));

CREATE TRIGGER trg_ghl_reactions_updated_at
  BEFORE UPDATE ON public.ghl_event_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
