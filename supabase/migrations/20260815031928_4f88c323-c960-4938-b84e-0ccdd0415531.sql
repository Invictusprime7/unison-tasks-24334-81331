ALTER TABLE public.projects
	ADD COLUMN IF NOT EXISTS active_published_revision_id uuid
	REFERENCES public.site_revisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_active_published_revision_idx
	ON public.projects(active_published_revision_id)
	WHERE active_published_revision_id IS NOT NULL;

COMMENT ON COLUMN public.projects.active_published_revision_id IS
	'Authoritative site_revisions row currently deployed for this project.';

CREATE OR REPLACE FUNCTION public.assert_project_published_revision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
	IF NEW.active_published_revision_id IS NULL THEN
		RETURN NEW;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM public.site_revisions revision
		WHERE revision.id = NEW.active_published_revision_id
			AND revision.project_id = NEW.id
			AND revision.business_id = NEW.business_id
			AND revision.status = 'committed'
			AND revision.publish_ready = true
	) THEN
		RAISE EXCEPTION
			'active_published_revision_id must reference a committed, publish-ready revision owned by this business and project'
			USING ERRCODE = '23514';
	END IF;

	RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_project_published_revision() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS projects_validate_active_published_revision ON public.projects;
CREATE TRIGGER projects_validate_active_published_revision
	BEFORE INSERT OR UPDATE OF active_published_revision_id ON public.projects
	FOR EACH ROW
	EXECUTE FUNCTION public.assert_project_published_revision();