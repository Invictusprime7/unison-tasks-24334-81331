CREATE TABLE public.builder_envelope_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  draft_id uuid,
  project_id uuid,
  business_id uuid,
  prompt text,
  envelope jsonb NOT NULL DEFAULT '{}'::jsonb,
  envelope_source text,
  request_kinds text[] NOT NULL DEFAULT '{}',
  domains text[] NOT NULL DEFAULT '{}',
  confidence numeric,
  verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification_checked boolean NOT NULL DEFAULT false,
  verification_passed boolean,
  unmet_count integer NOT NULL DEFAULT 0,
  out_of_scope_count integer NOT NULL DEFAULT 0,
  blocking_count integer NOT NULL DEFAULT 0,
  repair_attempted boolean NOT NULL DEFAULT false,
  repair_accepted boolean NOT NULL DEFAULT false,
  touched_files text[] NOT NULL DEFAULT '{}',
  model_used text,
  provider_used text,
  mode text,
  outcome text NOT NULL DEFAULT 'proposed',
  outcome_detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.builder_envelope_runs TO authenticated;
GRANT ALL ON public.builder_envelope_runs TO service_role;

ALTER TABLE public.builder_envelope_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own builder runs"
  ON public.builder_envelope_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own builder runs"
  ON public.builder_envelope_runs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own builder runs"
  ON public.builder_envelope_runs FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_builder_envelope_runs_draft ON public.builder_envelope_runs (draft_id, created_at DESC);
CREATE INDEX idx_builder_envelope_runs_user ON public.builder_envelope_runs (user_id, created_at DESC);

CREATE TRIGGER trg_builder_envelope_runs_updated_at
  BEFORE UPDATE ON public.builder_envelope_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();