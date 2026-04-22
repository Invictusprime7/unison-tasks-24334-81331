-- ============================================================================
-- LINK builder_drafts ↔ projects
-- Eliminates conflicting data clusters:
--   Before: CreateProjectDialog created a projects row, then the wizard
--           created a builder_drafts row — no FK between them.
--   After:  builder_drafts is the source of truth for the home page.
--           A project row is auto-created/linked when a draft is saved.
--           The home-page flow no longer pre-creates orphaned project rows.
-- ============================================================================

-- 1. Add project_id FK column to builder_drafts so each draft can be
--    linked to a projects row (nullable – legacy drafts won't have one).
ALTER TABLE public.builder_drafts
  ADD COLUMN IF NOT EXISTS project_id UUID
    REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_builder_drafts_project_id
  ON public.builder_drafts(project_id);

-- 2. Function: when a builder_draft is inserted or its metadata changes,
--    ensure a linked projects row exists and update the project_id back.
--    This removes the need to pre-create the project row from UI code.
CREATE OR REPLACE FUNCTION public.sync_draft_to_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name        TEXT;
  v_description TEXT;
  v_project_id  UUID;
BEGIN
  -- Only act when the draft has a name in metadata
  v_name := COALESCE(
    (NEW.metadata ->> 'name'),
    (NEW.metadata ->> 'projectName'),
    (NEW.metadata ->> 'business_name')
  );

  IF v_name IS NULL OR v_name = '' THEN
    RETURN NEW;
  END IF;

  v_description := COALESCE(
    (NEW.metadata ->> 'description'),
    (NEW.metadata ->> 'industry')
  );

  -- If the draft already has a project_id, just update the project name
  IF NEW.project_id IS NOT NULL THEN
    UPDATE public.projects
    SET name        = v_name,
        description = COALESCE(v_description, description),
        updated_at  = now()
    WHERE id = NEW.project_id;
    RETURN NEW;
  END IF;

  -- Otherwise look for an existing project owned by this user with the same name
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE owner_id = NEW.user_id
    AND name     = v_name
  LIMIT 1;

  -- Create a new project row if none found
  IF v_project_id IS NULL THEN
    INSERT INTO public.projects (name, description, owner_id)
    VALUES (v_name, v_description, NEW.user_id)
    RETURNING id INTO v_project_id;
  END IF;

  -- Link draft to project
  NEW.project_id := v_project_id;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_builder_draft_sync_project'
      AND n.nspname = 'public' AND c.relname = 'builder_drafts'
  ) THEN
    CREATE TRIGGER on_builder_draft_sync_project
      BEFORE INSERT OR UPDATE OF metadata ON public.builder_drafts
      FOR EACH ROW EXECUTE FUNCTION public.sync_draft_to_project();
  END IF;
END $$;

-- 3. Backfill: link existing named drafts to projects (or create rows).
--    Run only for drafts that have a name in metadata but no project_id.
DO $$
DECLARE
  r RECORD;
  v_name        TEXT;
  v_description TEXT;
  v_project_id  UUID;
BEGIN
  FOR r IN
    SELECT id, user_id, metadata
    FROM public.builder_drafts
    WHERE project_id IS NULL
      AND metadata IS NOT NULL
      AND (metadata ->> 'name') IS NOT NULL
      AND (metadata ->> 'name') <> ''
  LOOP
    v_name        := r.metadata ->> 'name';
    v_description := COALESCE(r.metadata ->> 'description', r.metadata ->> 'industry');

    -- Find or create project
    SELECT id INTO v_project_id
    FROM public.projects
    WHERE owner_id = r.user_id AND name = v_name
    LIMIT 1;

    IF v_project_id IS NULL THEN
      INSERT INTO public.projects (name, description, owner_id)
      VALUES (v_name, v_description, r.user_id)
      RETURNING id INTO v_project_id;
    END IF;

    UPDATE public.builder_drafts
    SET project_id = v_project_id
    WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Delete orphaned project rows that have no content:
--    These were created by the old CreateProjectDialog flow before the wizard
--    ran, resulting in empty shell projects with no builder_draft.
--    Only delete rows where: no linked draft, no description, template_type is null.
DELETE FROM public.projects
WHERE id NOT IN (SELECT DISTINCT project_id FROM public.builder_drafts WHERE project_id IS NOT NULL)
  AND description IS NULL
  AND template_type IS NULL
  AND created_at > now() - interval '90 days';

-- 5. Also ensure project_settings rows exist for any new projects created
--    via the backfill above (trigger handles future ones).
INSERT INTO public.project_settings (project_id)
SELECT p.id
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_settings ps WHERE ps.project_id = p.id
)
ON CONFLICT (project_id) DO NOTHING;
