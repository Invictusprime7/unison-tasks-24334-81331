CREATE OR REPLACE FUNCTION public.is_project_owner(
	p_project_id uuid,
	p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.projects p
		WHERE p.id = p_project_id
			AND p.owner_id = p_user_id
	);
$$;

REVOKE ALL ON FUNCTION public.is_project_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_project_membership_role(uuid, uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_project_membership_role(uuid, uuid, text[]) TO authenticated, service_role;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
	policy_record record;
BEGIN
	FOR policy_record IN
		SELECT policyname
		FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'project_members'
	LOOP
		EXECUTE format(
			'DROP POLICY IF EXISTS %I ON public.project_members',
			policy_record.policyname
		);
	END LOOP;
END;
$$;

CREATE POLICY project_members_select_access
	ON public.project_members
	FOR SELECT
	TO authenticated
	USING (
		user_id = (SELECT auth.uid())
		OR public.is_project_owner(project_id, (SELECT auth.uid()))
		OR public.check_project_membership_role(
			project_id,
			(SELECT auth.uid()),
			ARRAY['owner', 'admin']::text[]
		)
	);

CREATE POLICY project_members_insert_managers
	ON public.project_members
	FOR INSERT
	TO authenticated
	WITH CHECK (
		public.is_project_owner(project_id, (SELECT auth.uid()))
		OR (
			role IN ('member', 'viewer')
			AND public.check_project_membership_role(
				project_id,
				(SELECT auth.uid()),
				ARRAY['owner', 'admin']::text[]
			)
		)
	);

CREATE POLICY project_members_update_managers
	ON public.project_members
	FOR UPDATE
	TO authenticated
	USING (
		public.is_project_owner(project_id, (SELECT auth.uid()))
		OR (
			role IN ('member', 'viewer')
			AND public.check_project_membership_role(
				project_id,
				(SELECT auth.uid()),
				ARRAY['owner', 'admin']::text[]
			)
		)
	)
	WITH CHECK (
		public.is_project_owner(project_id, (SELECT auth.uid()))
		OR (
			role IN ('member', 'viewer')
			AND public.check_project_membership_role(
				project_id,
				(SELECT auth.uid()),
				ARRAY['owner', 'admin']::text[]
			)
		)
	);

CREATE POLICY project_members_delete_access
	ON public.project_members
	FOR DELETE
	TO authenticated
	USING (
		user_id = (SELECT auth.uid())
		OR public.is_project_owner(project_id, (SELECT auth.uid()))
		OR (
			role IN ('member', 'viewer')
			AND public.check_project_membership_role(
				project_id,
				(SELECT auth.uid()),
				ARRAY['owner', 'admin']::text[]
			)
		)
	);

REVOKE ALL ON public.project_members FROM anon;
REVOKE ALL ON public.project_members FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
