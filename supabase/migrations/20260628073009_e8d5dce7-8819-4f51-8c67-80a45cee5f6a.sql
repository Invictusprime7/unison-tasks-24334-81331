
ALTER TABLE public.site_revisions
  ADD COLUMN IF NOT EXISTS publish_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS publish_blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS backend_ops_applied jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vfs_hash text NULL;

CREATE INDEX IF NOT EXISTS site_revisions_project_publish_ready_idx
  ON public.site_revisions (project_id, publish_ready, created_at DESC);
