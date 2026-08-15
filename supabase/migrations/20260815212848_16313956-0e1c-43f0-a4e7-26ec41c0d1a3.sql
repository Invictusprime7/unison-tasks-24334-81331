INSERT INTO public.project_members (project_id, user_id, role)
SELECT p.id, p.owner_id, 'owner'
FROM public.projects AS p
WHERE p.owner_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE
SET role = 'owner';

CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects AS project
    WHERE project.id = _project_id
      AND project.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1
    FROM public.project_members AS member
    WHERE member.user_id = _user_id
      AND member.project_id = _project_id
  )
$$;

REVOKE ALL ON FUNCTION public.is_project_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated, service_role;