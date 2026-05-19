
-- =========================================================
-- 1. Helper: caller-supplied session id from request header
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_session_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    current_setting('request.headers', true)::json->>'x-session-id',
    ''
  );
$$;

REVOKE EXECUTE ON FUNCTION public.current_session_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_session_id() TO anon, authenticated, service_role;

-- =========================================================
-- 2. ai_agent_registry — require auth for SELECT
-- =========================================================
DROP POLICY IF EXISTS ai_agent_registry_select_public ON public.ai_agent_registry;
CREATE POLICY ai_agent_registry_select_authenticated
  ON public.ai_agent_registry
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- =========================================================
-- 3. bookings — tighten guest SELECT to header-matched session
-- =========================================================
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings"
  ON public.bookings
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (
      session_id IS NOT NULL
      AND public.current_session_id() IS NOT NULL
      AND session_id = public.current_session_id()
    )
    OR (business_id IS NOT NULL AND public.is_business_member(business_id))
  );

-- =========================================================
-- 4. orders — same session-header pattern, drop business_id IS NULL catch-all
-- =========================================================
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS orders_select_member ON public.orders;
CREATE POLICY orders_select_scoped
  ON public.orders
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (
      session_id IS NOT NULL
      AND public.current_session_id() IS NOT NULL
      AND session_id = public.current_session_id()
    )
    OR (business_id IS NOT NULL AND public.is_business_member(business_id))
  );

-- =========================================================
-- 5. crm_activities — remove user_id IS NULL public read/insert
-- =========================================================
DROP POLICY IF EXISTS "Users can view own activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Users can create activities" ON public.crm_activities;
CREATE POLICY "Users can view own activities"
  ON public.crm_activities FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can create activities"
  ON public.crm_activities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- 6. crm_contacts — same
-- =========================================================
DROP POLICY IF EXISTS "Users can view own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can create contacts" ON public.crm_contacts;
CREATE POLICY "Users can view own contacts"
  ON public.crm_contacts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can create contacts"
  ON public.crm_contacts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- 7. crm_deals — same
-- =========================================================
DROP POLICY IF EXISTS "Users can view own deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Users can create deals" ON public.crm_deals;
CREATE POLICY "Users can view own deals"
  ON public.crm_deals FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can create deals"
  ON public.crm_deals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- 8. crm_leads — drop user_id IS NULL public read branch
-- =========================================================
DROP POLICY IF EXISTS crm_leads_select_member ON public.crm_leads;
CREATE POLICY crm_leads_select_member
  ON public.crm_leads FOR SELECT TO authenticated
  USING (
    (business_id IS NOT NULL AND public.is_business_member(business_id))
    OR (business_id IS NULL AND user_id IS NOT NULL AND user_id = auth.uid())
  );

-- =========================================================
-- 9. crm_form_submissions — restrict to admin role only
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can view submissions" ON public.crm_form_submissions;
CREATE POLICY crm_form_submissions_select_admin
  ON public.crm_form_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 10. file_access_tokens — require caller session header match
-- =========================================================
DROP POLICY IF EXISTS file_access_tokens_select_has_session ON public.file_access_tokens;
CREATE POLICY file_access_tokens_select_owner
  ON public.file_access_tokens FOR SELECT
  USING (
    session_id IS NOT NULL
    AND public.current_session_id() IS NOT NULL
    AND session_id = public.current_session_id()
  );

-- =========================================================
-- 11. generated_pages — drop anonymous mutate; auth-only manage
-- =========================================================
DROP POLICY IF EXISTS "Anonymous can create pages" ON public.generated_pages;
DROP POLICY IF EXISTS "Anonymous can delete their pages" ON public.generated_pages;
DROP POLICY IF EXISTS "Anonymous can update their pages" ON public.generated_pages;
DROP POLICY IF EXISTS "Anonymous can view their pages" ON public.generated_pages;

-- page_sections: tighten to authenticated owners only
DROP POLICY IF EXISTS "Users can manage sections of their pages" ON public.page_sections;
CREATE POLICY "Users can manage sections of their pages"
  ON public.page_sections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.generated_pages gp
    WHERE gp.id = page_sections.page_id
      AND gp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.generated_pages gp
    WHERE gp.id = page_sections.page_id
      AND gp.user_id = auth.uid()
  ));

-- =========================================================
-- 12. page_graphs — drop public-all policy, require auth
-- =========================================================
DROP POLICY IF EXISTS "Allow all access to page_graphs" ON public.page_graphs;
CREATE POLICY page_graphs_select_authenticated
  ON public.page_graphs FOR SELECT TO authenticated
  USING (true);
CREATE POLICY page_graphs_insert_authenticated
  ON public.page_graphs FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY page_graphs_update_authenticated
  ON public.page_graphs FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY page_graphs_delete_authenticated
  ON public.page_graphs FOR DELETE TO authenticated
  USING (true);

-- =========================================================
-- 13. businesses — add member SELECT
-- =========================================================
CREATE POLICY businesses_select_member
  ON public.businesses FOR SELECT TO authenticated
  USING (public.is_business_member(id));

-- =========================================================
-- 14. Revoke EXECUTE on internal SECURITY DEFINER helpers
--     from anon/authenticated (still callable inside RLS as owner)
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_member(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_file_share_token(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_pattern_usage(uuid) FROM anon, authenticated;
