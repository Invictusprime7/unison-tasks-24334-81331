-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. The
-- original role-specific revoke did not remove that inherited capability.
REVOKE EXECUTE ON FUNCTION public.is_business_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_business_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_business_editor(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.business_has_permission(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_editor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_has_permission(uuid, text) TO authenticated;