-- Active RLS policies invoke these SECURITY DEFINER membership helpers. PostgreSQL
-- still checks EXECUTE before evaluating an RLS expression, so revoking these
-- grants made all project and business reads fail with permission denied.
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;
