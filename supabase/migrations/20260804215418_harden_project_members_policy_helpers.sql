CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_project_owner(
	p_project_id uuid,
	p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.projects p
		WHERE p.id = p_project_id
			AND p.owner_id = p_user_id
	);
$$;

CREATE OR REPLACE FUNCTION private.check_project_membership_role(
	p_project_id uuid,
	p_user_id uuid,
	p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.project_members pm
		WHERE pm.project_id = p_project_id
			AND pm.user_id = p_user_id
			AND pm.role = ANY(p_roles)
	);
$$;

REVOKE ALL ON FUNCTION private.is_project_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.check_project_membership_role(uuid, uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_project_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.check_project_membership_role(uuid, uuid, text[]) TO authenticated, service_role;

ALTER POLICY project_members_select_access
	ON public.project_members
	USING (
		user_id = (SELECT auth.uid())
		OR private.is_project_owner(project_id, (SELECT auth.uid()))
		OR private.check_project_membership_role(
			project_id,
			(SELECT auth.uid()),
			ARRAY['owner', 'admin']::text[]
		)
	);

ALTER POLICY project_members_insert_managers
	ON public.project_members
	WITH CHECK (
		private.is_project_owner(project_id, (SELECT auth.uid()))
		OR (
			role IN ('member', 'viewer')
			AND private.check_project_membership_role(
				project_id,
				(SELECT auth.uid()),
				ARRAY['owner', 'admin']::text[]
			)
		)
	);

ALTER POLICY project_members_update_managers
	ON public.project_members
	USING (
		private.is_project_owner(project_id, (SELECT auth.uid()))
		OR (
			role IN ('member', 'viewer')
			AND private.check_project_membership_role(
				project_id,
				(SELECT auth.uid()),
				ARRAY['owner', 'admin']::text[]
			)
		)
	)
	WITH CHECK (
		private.is_project_owner(project_id, (SELECT auth.uid()))
		OR (
			role IN ('member', 'viewer')
			AND private.check_project_membership_role(
				project_id,
				(SELECT auth.uid()),
				ARRAY['owner', 'admin']::text[]
			)
		)
	);

ALTER POLICY project_members_delete_access
	ON public.project_members
	USING (
		user_id = (SELECT auth.uid())
		OR private.is_project_owner(project_id, (SELECT auth.uid()))
		OR (
			role IN ('member', 'viewer')
			AND private.check_project_membership_role(
				project_id,
				(SELECT auth.uid()),
				ARRAY['owner', 'admin']::text[]
			)
		)
	);

REVOKE ALL ON FUNCTION public.is_project_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_project_membership_role(uuid, uuid, text[]) FROM PUBLIC, anon, authenticated;

DROP INDEX IF EXISTS public.idx_project_members_project;
DROP INDEX IF EXISTS public.idx_project_members_user;
