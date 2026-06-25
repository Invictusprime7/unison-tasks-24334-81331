
CREATE TABLE IF NOT EXISTS public.site_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  business_id uuid NOT NULL,
  draft_id uuid NOT NULL,
  parent_revision_id uuid NULL REFERENCES public.site_revisions(id) ON DELETE SET NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'committed',
  patch_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  vfs_files jsonb NOT NULL DEFAULT '{}'::jsonb,
  site_bundle_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  runtime_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  playground_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  readiness_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  diagnostics jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_revisions_source_chk CHECK (source IN (
    'wizard-launch','ai-builder','playground-edit','layout-fast-path',
    'binding-fast-path','ghl-binding','theme-change','republish','system-restore'
  )),
  CONSTRAINT site_revisions_status_chk CHECK (status IN (
    'committed','rejected','quarantined'
  ))
);

CREATE INDEX IF NOT EXISTS site_revisions_project_created_idx
  ON public.site_revisions (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS site_revisions_draft_idx
  ON public.site_revisions (draft_id);
CREATE INDEX IF NOT EXISTS site_revisions_parent_idx
  ON public.site_revisions (parent_revision_id);

GRANT SELECT, INSERT ON public.site_revisions TO authenticated;
GRANT ALL ON public.site_revisions TO service_role;

ALTER TABLE public.site_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can read site revisions"
  ON public.site_revisions
  FOR SELECT
  TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can create site revisions as themselves"
  ON public.site_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_project_member(auth.uid(), project_id)
    AND created_by = auth.uid()
  );
