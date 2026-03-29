
-- Add unique constraint so upsert by user works for drafts
CREATE UNIQUE INDEX idx_builder_drafts_user_unique ON public.builder_drafts(user_id) WHERE business_id IS NULL;
ALTER TABLE public.builder_drafts ADD CONSTRAINT uq_builder_drafts_user_business UNIQUE (user_id, business_id);
