CREATE TYPE public.ai_builder_proposal_kind AS ENUM ('sql_migration', 'edge_function', 'config_change');
CREATE TYPE public.ai_builder_proposal_status AS ENUM ('pending', 'approved', 'rejected', 'applied', 'failed');

CREATE TABLE public.ai_builder_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind public.ai_builder_proposal_kind NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  rationale TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dry_run_report JSONB,
  status public.ai_builder_proposal_status NOT NULL DEFAULT 'pending',
  apply_result JSONB,
  applied_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_builder_proposals_project_idx ON public.ai_builder_proposals(project_id);
CREATE INDEX ai_builder_proposals_business_idx ON public.ai_builder_proposals(business_id);
CREATE INDEX ai_builder_proposals_status_idx ON public.ai_builder_proposals(status);
CREATE INDEX ai_builder_proposals_proposed_by_idx ON public.ai_builder_proposals(proposed_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_builder_proposals TO authenticated;
GRANT ALL ON public.ai_builder_proposals TO service_role;

ALTER TABLE public.ai_builder_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own or project-member proposals"
  ON public.ai_builder_proposals
  FOR SELECT
  TO authenticated
  USING (
    proposed_by = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_member(auth.uid(), project_id))
    OR (business_id IS NOT NULL AND public.is_business_member(business_id))
  );

CREATE POLICY "Users create own proposals"
  ON public.ai_builder_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (proposed_by = auth.uid());

CREATE POLICY "Owners or project members update proposals"
  ON public.ai_builder_proposals
  FOR UPDATE
  TO authenticated
  USING (
    proposed_by = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_member(auth.uid(), project_id))
    OR (business_id IS NOT NULL AND public.is_business_member(business_id))
  )
  WITH CHECK (
    proposed_by = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_member(auth.uid(), project_id))
    OR (business_id IS NOT NULL AND public.is_business_member(business_id))
  );

CREATE POLICY "Owners delete own proposals"
  ON public.ai_builder_proposals
  FOR DELETE
  TO authenticated
  USING (proposed_by = auth.uid());

CREATE TRIGGER ai_builder_proposals_updated_at
  BEFORE UPDATE ON public.ai_builder_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();