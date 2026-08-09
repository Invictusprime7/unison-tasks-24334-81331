-- Generated sites are canonically identified by public.sites. Legacy
-- site_users rows referenced projects, which lets the visitor-auth contract
-- disagree with published runtime identity. Preserve only rows with a
-- deterministic project -> site mapping; fail closed for ambiguous legacy
-- accounts rather than silently assigning them to another site.
ALTER TABLE public.site_users
  ADD COLUMN IF NOT EXISTS canonical_site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

UPDATE public.site_users AS visitor
SET canonical_site_id = project.site_id
FROM public.projects AS project
WHERE visitor.canonical_site_id IS NULL
  AND visitor.site_id = project.id
  AND project.site_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.site_users
    WHERE canonical_site_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot migrate site_users: one or more visitor accounts have no canonical linked site';
  END IF;
END;
$$;

ALTER TABLE public.site_users
  ALTER COLUMN canonical_site_id SET NOT NULL;

DROP INDEX IF EXISTS public.idx_site_users_site_email;
ALTER TABLE public.site_users
  DROP CONSTRAINT IF EXISTS site_users_site_id_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_users_canonical_site_email
  ON public.site_users (canonical_site_id, email);

ALTER TABLE public.site_users
  DROP CONSTRAINT IF EXISTS site_users_site_id_fkey;

ALTER TABLE public.site_users
  DROP COLUMN site_id;

ALTER TABLE public.site_users
  RENAME COLUMN canonical_site_id TO site_id;

ALTER INDEX public.idx_site_users_canonical_site_email
  RENAME TO idx_site_users_site_email;

COMMENT ON COLUMN public.site_users.site_id IS
  'Canonical public.sites identity for the generated site this visitor belongs to.';