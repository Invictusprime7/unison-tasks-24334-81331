-- Drafts created from a legacy template can become projects without explicit
-- membership rows. Owners must retain the same access as explicit members.
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.businesses b
		WHERE b.id = p_business_id
			AND b.owner_id = auth.uid()
	) OR EXISTS (
		SELECT 1
		FROM public.business_members bm
		WHERE bm.business_id = p_business_id
			AND bm.user_id = auth.uid()
	);
$$;
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.projects p
		WHERE p.id = _project_id
			AND p.owner_id = _user_id
	) OR EXISTS (
		SELECT 1
		FROM public.project_members pm
		WHERE pm.project_id = _project_id
			AND pm.user_id = _user_id
	);
$$;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;