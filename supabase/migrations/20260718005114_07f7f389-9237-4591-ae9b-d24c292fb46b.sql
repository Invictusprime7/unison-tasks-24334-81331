-- Drop overly-restrictive partial unique indexes on builder_drafts that
-- prevented users from having multiple in-progress drafts and broke autosave
-- with duplicate-key errors during draft recovery.
DROP INDEX IF EXISTS public.idx_builder_drafts_user_unique;
DROP INDEX IF EXISTS public.uq_builder_drafts_user_business_nullproject;