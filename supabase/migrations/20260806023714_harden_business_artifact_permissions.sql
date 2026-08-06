
-- Business membership proves tenant visibility. It is intentionally not a
-- write grant: legacy `member` rows remain read-only until explicitly upgraded
-- to editor/manager/admin by the business owner.
CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id uuid)
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
	);
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT public.is_business_owner(p_business_id)
		OR EXISTS (
			SELECT 1
			FROM public.business_members bm
			WHERE bm.business_id = p_business_id
				AND bm.user_id = auth.uid()
				AND lower(bm.role) IN ('owner', 'admin')
		);
$$;

CREATE OR REPLACE FUNCTION public.is_business_editor(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT public.is_business_admin(p_business_id)
		OR EXISTS (
			SELECT 1
			FROM public.business_members bm
			WHERE bm.business_id = p_business_id
				AND bm.user_id = auth.uid()
				AND lower(bm.role) IN ('manager', 'editor')
		);
$$;

CREATE OR REPLACE FUNCTION public.business_has_permission(
	p_business_id uuid,
	p_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT CASE p_permission
		WHEN 'business.read' THEN public.is_business_member(p_business_id)
		WHEN 'project.read' THEN public.is_business_member(p_business_id)
		WHEN 'artifact.read' THEN public.is_business_member(p_business_id)
		WHEN 'catalog.read' THEN public.is_business_member(p_business_id)
		WHEN 'booking.read' THEN public.is_business_member(p_business_id)
		WHEN 'artifact.write' THEN public.is_business_editor(p_business_id)
		WHEN 'catalog.write' THEN public.is_business_editor(p_business_id)
		WHEN 'project.write' THEN public.is_business_editor(p_business_id)
		WHEN 'booking.manage' THEN public.is_business_editor(p_business_id)
		WHEN 'artifact.delete' THEN public.is_business_admin(p_business_id)
		WHEN 'catalog.delete' THEN public.is_business_admin(p_business_id)
		WHEN 'business.profile.write' THEN public.is_business_admin(p_business_id)
		WHEN 'team.manage' THEN public.is_business_admin(p_business_id)
		WHEN 'site.publish' THEN public.is_business_admin(p_business_id)
		ELSE false
	END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_business_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_business_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_business_editor(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.business_has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_editor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_has_permission(uuid, text) TO authenticated;

-- The component graph represents publishable generated-site behavior. Apply
-- operation-specific policies instead of granting every member `FOR ALL`.
DROP POLICY IF EXISTS "project_component_instances_member_full" ON public.project_component_instances;
DROP POLICY IF EXISTS "project_component_instances_member_read" ON public.project_component_instances;
DROP POLICY IF EXISTS "project_component_instances_editor_insert" ON public.project_component_instances;
DROP POLICY IF EXISTS "project_component_instances_editor_update" ON public.project_component_instances;
DROP POLICY IF EXISTS "project_component_instances_admin_delete" ON public.project_component_instances;

CREATE POLICY "project_component_instances_member_read"
	ON public.project_component_instances
	FOR SELECT TO authenticated
	USING (public.business_has_permission(business_id, 'artifact.read'));

CREATE POLICY "project_component_instances_editor_insert"
	ON public.project_component_instances
	FOR INSERT TO authenticated
	WITH CHECK (public.business_has_permission(business_id, 'artifact.write'));

CREATE POLICY "project_component_instances_editor_update"
	ON public.project_component_instances
	FOR UPDATE TO authenticated
	USING (public.business_has_permission(business_id, 'artifact.write'))
	WITH CHECK (public.business_has_permission(business_id, 'artifact.write'));

CREATE POLICY "project_component_instances_admin_delete"
	ON public.project_component_instances
	FOR DELETE TO authenticated
	USING (public.business_has_permission(business_id, 'artifact.delete'));

DROP POLICY IF EXISTS "project_component_bindings_member_full" ON public.project_component_bindings;
DROP POLICY IF EXISTS "project_component_bindings_member_read" ON public.project_component_bindings;
DROP POLICY IF EXISTS "project_component_bindings_editor_insert" ON public.project_component_bindings;
DROP POLICY IF EXISTS "project_component_bindings_editor_update" ON public.project_component_bindings;
DROP POLICY IF EXISTS "project_component_bindings_admin_delete" ON public.project_component_bindings;

CREATE POLICY "project_component_bindings_member_read"
	ON public.project_component_bindings
	FOR SELECT TO authenticated
	USING (public.business_has_permission(business_id, 'artifact.read'));

CREATE POLICY "project_component_bindings_editor_insert"
	ON public.project_component_bindings
	FOR INSERT TO authenticated
	WITH CHECK (public.business_has_permission(business_id, 'artifact.write'));

CREATE POLICY "project_component_bindings_editor_update"
	ON public.project_component_bindings
	FOR UPDATE TO authenticated
	USING (public.business_has_permission(business_id, 'artifact.write'))
	WITH CHECK (public.business_has_permission(business_id, 'artifact.write'));

CREATE POLICY "project_component_bindings_admin_delete"
	ON public.project_component_bindings
	FOR DELETE TO authenticated
	USING (public.business_has_permission(business_id, 'artifact.delete'));

-- Preserve public site reads, while catalog writes require an editor and
-- destructive changes require an admin/owner. These replace historical
-- member-wide write policies; do not collapse them back into `FOR ALL`.
DROP POLICY IF EXISTS "services_insert_member" ON public.services;
DROP POLICY IF EXISTS "services_update_member" ON public.services;
DROP POLICY IF EXISTS "services_delete_member" ON public.services;
CREATE POLICY "services_insert_editor" ON public.services FOR INSERT TO authenticated
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "services_update_editor" ON public.services FOR UPDATE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.write'))
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "services_delete_admin" ON public.services FOR DELETE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.delete'));

-- Some legacy deployments no longer have the optional products relation.
-- Harden it where present without preventing the rest of the catalog policy
-- migration from applying.
DO $$
BEGIN
	IF to_regclass('public.products') IS NOT NULL THEN
		DROP POLICY IF EXISTS "Users can manage own products" ON public.products;
		DROP POLICY IF EXISTS "products_manage_member" ON public.products;
		CREATE POLICY "products_insert_editor" ON public.products FOR INSERT TO authenticated
			WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
		CREATE POLICY "products_update_editor" ON public.products FOR UPDATE TO authenticated
			USING (public.business_has_permission(business_id, 'catalog.write'))
			WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
		CREATE POLICY "products_delete_admin" ON public.products FOR DELETE TO authenticated
			USING (public.business_has_permission(business_id, 'catalog.delete'));
	END IF;
END;
$$;

DROP POLICY IF EXISTS "menu_items_member_all" ON public.menu_items;
CREATE POLICY "menu_items_member_read" ON public.menu_items FOR SELECT TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.read'));
CREATE POLICY "menu_items_insert_editor" ON public.menu_items FOR INSERT TO authenticated
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "menu_items_update_editor" ON public.menu_items FOR UPDATE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.write'))
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "menu_items_delete_admin" ON public.menu_items FOR DELETE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.delete'));

DROP POLICY IF EXISTS "pricing_plans_member_all" ON public.pricing_plans;
CREATE POLICY "pricing_plans_member_read" ON public.pricing_plans FOR SELECT TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.read'));
CREATE POLICY "pricing_plans_insert_editor" ON public.pricing_plans FOR INSERT TO authenticated
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "pricing_plans_update_editor" ON public.pricing_plans FOR UPDATE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.write'))
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "pricing_plans_delete_admin" ON public.pricing_plans FOR DELETE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.delete'));

DROP POLICY IF EXISTS "members manage featured_offers" ON public.featured_offers;
CREATE POLICY "featured_offers_insert_editor" ON public.featured_offers FOR INSERT TO authenticated
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "featured_offers_update_editor" ON public.featured_offers FOR UPDATE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.write'))
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "featured_offers_delete_admin" ON public.featured_offers FOR DELETE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.delete'));

DROP POLICY IF EXISTS "members manage testimonials" ON public.testimonials;
CREATE POLICY "testimonials_insert_editor" ON public.testimonials FOR INSERT TO authenticated
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "testimonials_update_editor" ON public.testimonials FOR UPDATE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.write'))
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "testimonials_delete_admin" ON public.testimonials FOR DELETE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.delete'));

DROP POLICY IF EXISTS "members manage portfolio_projects" ON public.portfolio_projects;
CREATE POLICY "portfolio_projects_insert_editor" ON public.portfolio_projects FOR INSERT TO authenticated
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "portfolio_projects_update_editor" ON public.portfolio_projects FOR UPDATE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.write'))
	WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));
CREATE POLICY "portfolio_projects_delete_admin" ON public.portfolio_projects FOR DELETE TO authenticated
	USING (public.business_has_permission(business_id, 'catalog.delete'));
