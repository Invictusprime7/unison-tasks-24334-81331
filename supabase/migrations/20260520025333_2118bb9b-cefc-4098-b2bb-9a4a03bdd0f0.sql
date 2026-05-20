
-- 1. ai_agent_registry: restrict reads to service_role only
DROP POLICY IF EXISTS "ai_agent_registry_select_authenticated" ON public.ai_agent_registry;
CREATE POLICY "ai_agent_registry_select_service"
  ON public.ai_agent_registry FOR SELECT
  USING (auth.role() = 'service_role');

-- 2. ai_learning_sessions: drop overly permissive insert policy
DROP POLICY IF EXISTS "ai_learning_sessions_insert_authenticated" ON public.ai_learning_sessions;

-- 3. availability_slots: use business membership
DROP POLICY IF EXISTS "slots_insert_owner" ON public.availability_slots;
DROP POLICY IF EXISTS "slots_update_owner" ON public.availability_slots;
DROP POLICY IF EXISTS "slots_delete_owner" ON public.availability_slots;
CREATE POLICY "slots_insert_member" ON public.availability_slots
  FOR INSERT WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "slots_update_member" ON public.availability_slots
  FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "slots_delete_member" ON public.availability_slots
  FOR DELETE USING (public.is_business_member(business_id));

-- 4. cart_items: require session header match
DROP POLICY IF EXISTS "cart_items_anon_session" ON public.cart_items;
CREATE POLICY "cart_items_anon_session" ON public.cart_items
  FOR ALL
  USING (
    auth.uid() IS NULL
    AND user_id IS NULL
    AND session_id IS NOT NULL
    AND session_id = public.current_session_id()
  )
  WITH CHECK (
    auth.uid() IS NULL
    AND user_id IS NULL
    AND session_id IS NOT NULL
    AND session_id = public.current_session_id()
  );

-- 5. files: anonymous token access requires matching session id
DROP POLICY IF EXISTS "Anonymous can view files with valid token" ON public.files;
CREATE POLICY "Anonymous can view files with valid token" ON public.files
  FOR SELECT
  USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.file_access_tokens fat
      WHERE fat.file_id = files.id
        AND fat.expires_at > now()
        AND fat.session_id IS NOT NULL
        AND fat.session_id = public.current_session_id()
    )
  );

-- 6. leads: use business membership
DROP POLICY IF EXISTS "leads_select_owner" ON public.leads;
DROP POLICY IF EXISTS "leads_update_owner" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_owner" ON public.leads;
CREATE POLICY "leads_select_member" ON public.leads
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "leads_update_member" ON public.leads
  FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "leads_delete_member" ON public.leads
  FOR DELETE USING (public.is_business_member(business_id));

-- 7. services: use business membership
DROP POLICY IF EXISTS "services_insert_owner" ON public.services;
DROP POLICY IF EXISTS "services_update_owner" ON public.services;
DROP POLICY IF EXISTS "services_delete_owner" ON public.services;
CREATE POLICY "services_insert_member" ON public.services
  FOR INSERT WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "services_update_member" ON public.services
  FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "services_delete_member" ON public.services
  FOR DELETE USING (public.is_business_member(business_id));

-- 8. storage shared_files: fix join condition
DROP POLICY IF EXISTS "Public can view shared files" ON storage.objects;
CREATE POLICY "Public can view shared files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-files'
    AND EXISTS (
      SELECT 1
      FROM public.shared_files sf
      JOIN public.files f ON f.id = sf.file_id
      WHERE f.storage_path = storage.objects.name
        AND sf.is_public = true
        AND (sf.expires_at IS NULL OR sf.expires_at > now())
    )
  );

-- 9. Remove ghl_webhook_events from realtime publication (prevents broadcast leakage)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ghl_webhook_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.ghl_webhook_events';
  END IF;
END $$;

-- 10. page_graphs: restrict mutations to admin role (drop always-true policies)
DROP POLICY IF EXISTS "page_graphs_insert_authenticated" ON public.page_graphs;
DROP POLICY IF EXISTS "page_graphs_update_authenticated" ON public.page_graphs;
DROP POLICY IF EXISTS "page_graphs_delete_authenticated" ON public.page_graphs;
DROP POLICY IF EXISTS "page_graphs_select_authenticated" ON public.page_graphs;
CREATE POLICY "page_graphs_select_admin" ON public.page_graphs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page_graphs_insert_admin" ON public.page_graphs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page_graphs_update_admin" ON public.page_graphs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page_graphs_delete_admin" ON public.page_graphs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 11. Revoke EXECUTE on remaining SECURITY DEFINER functions from anon/authenticated
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, authenticated, public',
                   fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;
