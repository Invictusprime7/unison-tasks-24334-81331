-- Keep the durable builder draft and its Cloud project identity inseparable.
-- This migration repairs legacy rows, honors the project id supplied by the
-- Web Builder, and enables live workspace refreshes for draft writes.

CREATE OR REPLACE FUNCTION public.sync_draft_to_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  resolved_name text;
  requested_project_id uuid;
  linked_business_id uuid;
BEGIN
  resolved_name := COALESCE(
    NULLIF(BTRIM(NEW.name), ''),
    NULLIF(BTRIM(NEW.metadata->>'projectName'), ''),
    NULLIF(BTRIM(NEW.metadata->>'name'), ''),
    'Untitled project'
  );

  requested_project_id := NEW.project_id;
  IF requested_project_id IS NULL
     AND COALESCE(NEW.metadata->>'projectId', '') ~*
       '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    requested_project_id := (NEW.metadata->>'projectId')::uuid;
  END IF;

  -- A client-supplied id is accepted only when it belongs to the same user.
  -- Stale or foreign metadata is ignored and receives a new owned project.
  IF requested_project_id IS NOT NULL THEN
    SELECT p.business_id
      INTO linked_business_id
      FROM public.projects p
     WHERE p.id = requested_project_id
       AND p.owner_id = NEW.user_id;

    IF FOUND THEN
      NEW.project_id := requested_project_id;
      NEW.business_id := COALESCE(NEW.business_id, linked_business_id);

      UPDATE public.projects
         SET name = resolved_name,
             business_id = COALESCE(NEW.business_id, business_id),
             updated_at = now()
       WHERE id = requested_project_id;
    ELSE
      requested_project_id := NULL;
    END IF;
  END IF;

  IF requested_project_id IS NULL THEN
    INSERT INTO public.projects (
      name, description, owner_id, business_id, status, publish_status,
      settings, template_type
    )
    VALUES (
      resolved_name,
      NULLIF(NEW.metadata->>'description', ''),
      NEW.user_id,
      NEW.business_id,
      'draft',
      'draft',
      '{}'::jsonb,
      NEW.template_id::text
    )
    RETURNING id INTO NEW.project_id;
  END IF;

  NEW.name := resolved_name;
  NEW.metadata := jsonb_set(
    jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{projectId}', to_jsonb(NEW.project_id), true),
    '{projectName}',
    to_jsonb(resolved_name),
    true
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_draft_to_project() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_builder_draft_sync_project ON public.builder_drafts;
DROP TRIGGER IF EXISTS builder_drafts_sync_project ON public.builder_drafts;
CREATE TRIGGER builder_drafts_sync_project
BEFORE INSERT OR UPDATE OF name, metadata, business_id, project_id
ON public.builder_drafts
FOR EACH ROW
EXECUTE FUNCTION public.sync_draft_to_project();

-- Re-run the hardened trigger for every legacy draft. It links metadata-backed
-- project ids when valid and creates an owned project only when none exists.
UPDATE public.builder_drafts
   SET metadata = COALESCE(metadata, '{}'::jsonb),
       updated_at = updated_at;

CREATE INDEX IF NOT EXISTS idx_builder_drafts_project_updated
  ON public.builder_drafts (project_id, updated_at DESC);

-- Projects were already published in the original schema. Drafts also need to
-- emit changes so an open Cloud workspace refreshes immediately after autosave.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'builder_drafts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_drafts;
  END IF;
END;
$$;
