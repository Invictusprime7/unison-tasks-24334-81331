-- Enterprise CMS foundation. Content mutations remain service-owned through
-- cms-records until the command gateway is extended in the next milestone.

CREATE TABLE IF NOT EXISTS public.content_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  display_name text NOT NULL,
  description text,
  field_schema jsonb NOT NULL DEFAULT '{"fields":[]}'::jsonb,
  workflow jsonb NOT NULL DEFAULT '{"states":["draft","review","published","archived"]}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, api_key),
  CHECK (api_key ~ '^[a-z][a-z0-9_]{1,62}$'),
  CHECK (jsonb_typeof(field_schema) = 'object'),
  CHECK (jsonb_typeof(workflow) = 'object')
);

CREATE TABLE IF NOT EXISTS public.content_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  content_type_id uuid NOT NULL REFERENCES public.content_types(id) ON DELETE RESTRICT,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  locale text NOT NULL DEFAULT 'en',
  slug text,
  title text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  scheduled_publish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(data) = 'object'),
  CHECK (char_length(locale) BETWEEN 2 AND 35)
);

CREATE UNIQUE INDEX IF NOT EXISTS content_entries_business_type_locale_slug_idx
  ON public.content_entries (business_id, content_type_id, locale, slug)
  WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_entries_business_status_updated_idx
  ON public.content_entries (business_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS content_entries_site_status_idx
  ON public.content_entries (site_id, status, locale)
  WHERE site_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.content_entry_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.content_entries(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  snapshot jsonb NOT NULL,
  change_summary text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, revision_number),
  CHECK (jsonb_typeof(snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS content_entry_revisions_entry_created_idx
  ON public.content_entry_revisions (entry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.content_publish_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.content_entries(id) ON DELETE CASCADE,
  revision_id uuid REFERENCES public.content_entry_revisions(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('submitted', 'approved', 'published', 'unpublished', 'archived', 'restored')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS content_publish_events_entry_created_idx
  ON public.content_publish_events (entry_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.assert_content_entry_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.content_types content_type
    WHERE content_type.id = NEW.content_type_id
      AND content_type.business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Content entry must use a content type from the same business';
  END IF;

  IF NEW.site_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.sites site
    WHERE site.id = NEW.site_id
      AND site.business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Content entry must target a site from the same business';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_content_entry_scope() FROM PUBLIC;

DROP TRIGGER IF EXISTS assert_content_entry_scope ON public.content_entries;
CREATE TRIGGER assert_content_entry_scope
  BEFORE INSERT OR UPDATE OF business_id, content_type_id, site_id
  ON public.content_entries
  FOR EACH ROW EXECUTE FUNCTION public.assert_content_entry_scope();

CREATE OR REPLACE FUNCTION public.reject_content_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Content revisions are immutable';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_content_revision_mutation() FROM PUBLIC;

DROP TRIGGER IF EXISTS reject_content_revision_mutation ON public.content_entry_revisions;
CREATE TRIGGER reject_content_revision_mutation
  BEFORE UPDATE OR DELETE ON public.content_entry_revisions
  FOR EACH ROW EXECUTE FUNCTION public.reject_content_revision_mutation();

DROP TRIGGER IF EXISTS set_content_types_updated_at ON public.content_types;
CREATE TRIGGER set_content_types_updated_at
  BEFORE UPDATE ON public.content_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS set_content_entries_updated_at ON public.content_entries;
CREATE TRIGGER set_content_entries_updated_at
  BEFORE UPDATE ON public.content_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_entry_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_publish_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.content_types FROM anon, authenticated;
REVOKE ALL ON TABLE public.content_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.content_entry_revisions FROM anon, authenticated;
REVOKE ALL ON TABLE public.content_publish_events FROM anon, authenticated;