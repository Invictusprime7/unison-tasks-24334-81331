-- Allow multiple builder drafts per (user, business) by including project_id in uniqueness.
-- The previous constraint (user_id, business_id) prevented saving a second project for the same business.
ALTER TABLE public.builder_drafts
  DROP CONSTRAINT IF EXISTS uq_builder_drafts_user_business;

-- Use a partial unique index: when project_id is set, enforce uniqueness per (user, business, project).
CREATE UNIQUE INDEX IF NOT EXISTS uq_builder_drafts_user_business_project
  ON public.builder_drafts (user_id, COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid), project_id)
  WHERE project_id IS NOT NULL;

-- For drafts without a project_id yet (transient), keep the old behavior to avoid runaway duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_builder_drafts_user_business_nullproject
  ON public.builder_drafts (user_id, COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE project_id IS NULL;