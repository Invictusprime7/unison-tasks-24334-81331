-- 1. Promote `projects` into the canonical metadata table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS business_id      uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS slug             text,
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_status   text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS template_type    text,
  ADD COLUMN IF NOT EXISTS published_at     timestamptz,
  ADD COLUMN IF NOT EXISTS custom_domain    text,
  ADD COLUMN IF NOT EXISTS settings         jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS projects_business_id_idx ON public.projects(business_id);
CREATE INDEX IF NOT EXISTS projects_owner_id_idx    ON public.projects(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_slug_uniq
  ON public.projects(owner_id, slug) WHERE slug IS NOT NULL;

-- Allow owners to insert/update with business_id; existing policies stay in place
DROP POLICY IF EXISTS "Owners can update their projects" ON public.projects;
CREATE POLICY "Owners can update their projects" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- 2. Link builder_drafts to projects (1:1) and add a denormalised name for fast list views
ALTER TABLE public.builder_drafts
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name       text;

CREATE INDEX IF NOT EXISTS builder_drafts_project_id_idx ON public.builder_drafts(project_id);
CREATE INDEX IF NOT EXISTS builder_drafts_business_id_idx ON public.builder_drafts(business_id);

-- 3. Trigger: when a draft is inserted or its name/business changes, ensure a matching project exists
CREATE OR REPLACE FUNCTION public.sync_draft_to_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_name text;
  resolved_project uuid;
BEGIN
  resolved_name := COALESCE(
    NULLIF(NEW.name, ''),
    NULLIF(NEW.metadata->>'projectName', ''),
    NULLIF(NEW.metadata->>'name', ''),
    'Untitled project'
  );

  IF NEW.project_id IS NULL THEN
    INSERT INTO public.projects (name, owner_id, business_id, status, publish_status, settings, template_type)
    VALUES (
      resolved_name,
      NEW.user_id,
      NEW.business_id,
      'draft',
      'draft',
      '{}'::jsonb,
      NULLIF(NEW.template_id, '')
    )
    RETURNING id INTO resolved_project;

    NEW.project_id := resolved_project;
    NEW.name := resolved_name;
  ELSE
    UPDATE public.projects
       SET name        = resolved_name,
           business_id = COALESCE(NEW.business_id, business_id),
           updated_at  = now()
     WHERE id = NEW.project_id;
    NEW.name := resolved_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS builder_drafts_sync_project ON public.builder_drafts;
CREATE TRIGGER builder_drafts_sync_project
BEFORE INSERT OR UPDATE OF name, metadata, business_id
ON public.builder_drafts
FOR EACH ROW
EXECUTE FUNCTION public.sync_draft_to_project();

-- 4. Reverse trigger: renaming a project updates its draft name + metadata
CREATE OR REPLACE FUNCTION public.sync_project_to_drafts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.builder_drafts
       SET name = NEW.name,
           metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{projectName}', to_jsonb(NEW.name), true)
     WHERE project_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_sync_drafts ON public.projects;
CREATE TRIGGER projects_sync_drafts
AFTER UPDATE OF name ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_to_drafts();

-- 5. Backfill: every existing draft gets a project row
DO $$
DECLARE
  d RECORD;
  new_project_id uuid;
  resolved_name text;
BEGIN
  FOR d IN
    SELECT id, user_id, business_id, metadata, template_id
      FROM public.builder_drafts
     WHERE project_id IS NULL
  LOOP
    resolved_name := COALESCE(
      NULLIF(d.metadata->>'projectName', ''),
      NULLIF(d.metadata->>'name', ''),
      'Untitled project'
    );

    INSERT INTO public.projects (name, owner_id, business_id, status, publish_status, template_type, settings)
    VALUES (resolved_name, d.user_id, d.business_id, 'draft', 'draft', NULLIF(d.template_id, ''), '{}'::jsonb)
    RETURNING id INTO new_project_id;

    UPDATE public.builder_drafts
       SET project_id = new_project_id,
           name = resolved_name
     WHERE id = d.id;
  END LOOP;
END $$;

-- 6. Touch projects.updated_at whenever its draft is saved
CREATE OR REPLACE FUNCTION public.touch_project_on_draft_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    UPDATE public.projects SET updated_at = now() WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS builder_drafts_touch_project ON public.builder_drafts;
CREATE TRIGGER builder_drafts_touch_project
AFTER UPDATE OF code, editor_code, vfs_files
ON public.builder_drafts
FOR EACH ROW
EXECUTE FUNCTION public.touch_project_on_draft_write();