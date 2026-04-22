-- ============================================================================
-- SCHEMA HARDENING PART 2 — Policy Logic Bugs & Remaining Open Tables
-- ============================================================================
-- Fixes identified in post-audit review:
--   1. leads policies: business_id = auth.uid() is wrong — always false
--   2. orders/bookings: OR session_id IS NOT NULL exposes all session rows
--   3. cart_items: FOR ALL USING (true) is fully open
--   4. ai_learning_sessions: SELECT open to everyone (contains user prompts)
--   5. profiles auto-creation trigger (prevents FK breaks on signup)
-- ============================================================================

-- ============================================================================
-- 1. leads — Fix broken SELECT/UPDATE/DELETE policies
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leads') THEN
    DROP POLICY IF EXISTS "leads_select_owner"   ON public.leads;
    DROP POLICY IF EXISTS "leads_update_owner"   ON public.leads;
    DROP POLICY IF EXISTS "leads_delete_owner"   ON public.leads;
    DROP POLICY IF EXISTS "leads_select_member"  ON public.leads;
    DROP POLICY IF EXISTS "leads_update_member"  ON public.leads;
    DROP POLICY IF EXISTS "leads_delete_member"  ON public.leads;

    EXECUTE $p$
      CREATE POLICY "leads_select_member"
        ON public.leads FOR SELECT
        TO authenticated
        USING (
          public.is_business_member(business_id)
          OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        )
    $p$;
    EXECUTE $p$
      CREATE POLICY "leads_update_member"
        ON public.leads FOR UPDATE
        TO authenticated
        USING (
          public.is_business_member(business_id)
          OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        )
    $p$;
    EXECUTE $p$
      CREATE POLICY "leads_delete_member"
        ON public.leads FOR DELETE
        TO authenticated
        USING (
          business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        )
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 2. orders — Fix anonymous session data leak
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    DROP POLICY IF EXISTS "Users can view own orders"    ON public.orders;
    DROP POLICY IF EXISTS "Users can update own orders"  ON public.orders;
    DROP POLICY IF EXISTS "orders_select_own"            ON public.orders;
    DROP POLICY IF EXISTS "orders_select_business"       ON public.orders;
    DROP POLICY IF EXISTS "orders_update_own"            ON public.orders;

    EXECUTE $p$
      CREATE POLICY "orders_select_own"
        ON public.orders FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $p$;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='business_id') THEN
      EXECUTE $p$
        CREATE POLICY "orders_select_business"
          ON public.orders FOR SELECT
          TO authenticated
          USING (
            business_id IS NOT NULL AND business_id IN (
              SELECT id FROM public.businesses WHERE owner_id = auth.uid()
            )
          )
      $p$;
    END IF;

    EXECUTE $p$
      CREATE POLICY "orders_update_own"
        ON public.orders FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 3. bookings — Fix anonymous session data leak
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bookings') THEN
    DROP POLICY IF EXISTS "Users can view own bookings"    ON public.bookings;
    DROP POLICY IF EXISTS "Users can update own bookings"  ON public.bookings;
    DROP POLICY IF EXISTS "bookings_select_own"            ON public.bookings;
    DROP POLICY IF EXISTS "bookings_select_business"       ON public.bookings;
    DROP POLICY IF EXISTS "bookings_update_own"            ON public.bookings;

    EXECUTE $p$
      CREATE POLICY "bookings_select_own"
        ON public.bookings FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $p$;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services') THEN
      EXECUTE $p$
        CREATE POLICY "bookings_select_business"
          ON public.bookings FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.services s
              JOIN public.businesses b ON b.id = s.business_id
              WHERE s.id = service_id AND b.owner_id = auth.uid()
            )
          )
      $p$;
    END IF;

    EXECUTE $p$
      CREATE POLICY "bookings_update_own"
        ON public.bookings FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 4. cart_items — Scope to owner instead of FOR ALL USING (true)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cart_items') THEN
    DROP POLICY IF EXISTS "Anyone can manage cart by session" ON public.cart_items;
    DROP POLICY IF EXISTS "cart_items_access_own"            ON public.cart_items;

    EXECUTE $p$
      CREATE POLICY "cart_items_access_own"
        ON public.cart_items FOR ALL
        USING (
          (user_id IS NOT NULL AND user_id = auth.uid())
          OR (user_id IS NULL AND auth.uid() IS NULL)
        )
        WITH CHECK (
          (user_id IS NOT NULL AND user_id = auth.uid())
          OR (user_id IS NULL AND auth.uid() IS NULL)
        )
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 5. ai_learning_sessions — Restrict SELECT to authenticated only
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_learning_sessions') THEN
    DROP POLICY IF EXISTS "Anyone can view learning sessions"    ON public.ai_learning_sessions;
    DROP POLICY IF EXISTS "ai_learning_sessions_select_own"     ON public.ai_learning_sessions;

    -- Table has no user_id column; restrict to authenticated only so anon
    -- cannot read prompts/responses which may contain sensitive content
    EXECUTE $p$
      CREATE POLICY "ai_learning_sessions_select_auth"
        ON public.ai_learning_sessions FOR SELECT
        TO authenticated
        USING (true)
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 6. profiles — Auto-creation trigger on new auth.users signup
--    Prevents FK breaks in tasks, projects, project_members when a new
--    user signs up without a corresponding profiles row.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: won't fail if profile already exists
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Backfill: create profiles for any existing auth.users that have none
INSERT INTO public.profiles (id, full_name, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.created_at,
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. services — Fix UPDATE/DELETE to scope by business ownership
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services') THEN
    DROP POLICY IF EXISTS "services_insert_owner"  ON public.services;
    DROP POLICY IF EXISTS "services_update_owner"  ON public.services;
    DROP POLICY IF EXISTS "services_delete_owner"  ON public.services;
    DROP POLICY IF EXISTS "services_write_member"  ON public.services;
    DROP POLICY IF EXISTS "services_update_member" ON public.services;
    DROP POLICY IF EXISTS "services_delete_member" ON public.services;

    EXECUTE $p$
      CREATE POLICY "services_write_member"
        ON public.services FOR INSERT
        TO authenticated
        WITH CHECK (
          public.is_business_member(business_id)
          OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        )
    $p$;
    EXECUTE $p$
      CREATE POLICY "services_update_member"
        ON public.services FOR UPDATE
        TO authenticated
        USING (
          public.is_business_member(business_id)
          OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        )
    $p$;
    EXECUTE $p$
      CREATE POLICY "services_delete_member"
        ON public.services FOR DELETE
        TO authenticated
        USING (
          business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        )
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 8. businesses — Ensure is_business_member() is consistent with RLS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='business_members') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT EXISTS(
          SELECT 1
          FROM public.business_members bm
          WHERE bm.business_id = p_business_id
            AND bm.user_id = auth.uid()
        );
      $body$
    $f$;
  END IF;
END $$;
