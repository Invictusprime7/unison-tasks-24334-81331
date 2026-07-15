
-- Role helper
CREATE OR REPLACE FUNCTION public.user_business_role(_user_id uuid, _business_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.owner_id = _user_id)
      THEN 'owner'
    ELSE (
      SELECT bm.role
        FROM public.business_members bm
       WHERE bm.business_id = _business_id
         AND bm.user_id = _user_id
       LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_business_role(_user_id, _business_id) IN ('owner','admin');
$$;

-- Reassignment RPC
CREATE OR REPLACE FUNCTION public.reassign_project_business(
  _project_id uuid,
  _target_business_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _current_business uuid;
  _owner uuid;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.business_id, p.owner_id
    INTO _current_business, _owner
    FROM public.projects p
   WHERE p.id = _project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Must be admin of the current business (if one is set) OR the project owner.
  IF _current_business IS NOT NULL
     AND NOT public.is_business_admin(_caller, _current_business)
     AND _owner <> _caller THEN
    RAISE EXCEPTION 'You must be an admin of the current business to move this project';
  END IF;

  -- Must be admin of the target business.
  IF NOT public.is_business_admin(_caller, _target_business_id) THEN
    RAISE EXCEPTION 'You must be an admin of the target business to move a project into it';
  END IF;

  UPDATE public.projects
     SET business_id = _target_business_id,
         updated_at  = now()
   WHERE id = _project_id;

  UPDATE public.builder_drafts
     SET business_id = _target_business_id,
         updated_at  = now()
   WHERE project_id = _project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_business_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_project_business(uuid, uuid) TO authenticated;
