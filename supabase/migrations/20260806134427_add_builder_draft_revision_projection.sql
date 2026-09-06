
-- builder_drafts is a resumable working projection. Canonical site content
-- remains in site_revisions; this pointer identifies the latest durable state.
ALTER TABLE public.builder_drafts
	ADD COLUMN IF NOT EXISTS last_revision_id uuid
	REFERENCES public.site_revisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_builder_drafts_last_revision_id
	ON public.builder_drafts(last_revision_id);
