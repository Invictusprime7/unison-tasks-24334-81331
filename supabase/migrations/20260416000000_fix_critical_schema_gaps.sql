-- ============================================================================
-- CRITICAL SCHEMA GAPS — Security & Integrity Hardening
-- ============================================================================
-- Fixes identified in full schema audit (2025-04). Covers:
--   1. user_settings table (missing from DB, used throughout app)
--   2. builder_drafts RLS (created in dashboard, no RLS applied)
--   3. page_graphs open policy (FOR ALL USING true)
--   4. CRM data-leak SELECT policies (OR user_id IS NULL)
--   5. crm_form_submissions open SELECT + missing business scoping
--   6. crm_workflow_jobs open UPDATE USING (true)
--   7. crm_workflow_runs anonymous INSERT
--   8. site_users.password_hash column exposure
--   9. Missing indexes on critical FK/lookup columns
--  10. Missing updated_at trigger on builder_drafts
--  11. user_subscriptions FK to auth.users
-- ============================================================================

-- ============================================================================
-- 1. user_settings — Create missing table used throughout the app
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own settings
CREATE POLICY "user_settings_select_own"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_settings_insert_own"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update_own"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_delete_own"
  ON public.user_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ============================================================================
-- 2. builder_drafts — Create if not exists, then enable RLS + user-scoped policies
--    (Table may have been created through Supabase dashboard without any RLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.builder_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  code        TEXT NOT NULL DEFAULT '',
  editor_code TEXT,
  vfs_files   JSONB,
  metadata    JSONB,
  template_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_drafts ENABLE ROW LEVEL SECURITY;

-- Drop any accidental open policies that may exist
DROP POLICY IF EXISTS "Allow all access to builder_drafts" ON public.builder_drafts;
DROP POLICY IF EXISTS "builder_drafts_open" ON public.builder_drafts;

CREATE POLICY "builder_drafts_select_own"
  ON public.builder_drafts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "builder_drafts_insert_own"
  ON public.builder_drafts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "builder_drafts_update_own"
  ON public.builder_drafts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "builder_drafts_delete_own"
  ON public.builder_drafts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for the primary access pattern
CREATE INDEX IF NOT EXISTS idx_builder_drafts_user_id ON public.builder_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_drafts_business_id ON public.builder_drafts(business_id);

-- Add updated_at auto-trigger if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'builder_drafts'
      AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'builder_drafts_updated_at'
      AND tgrelid = 'public.builder_drafts'::regclass
  ) THEN
    CREATE TRIGGER builder_drafts_updated_at
      BEFORE UPDATE ON public.builder_drafts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
  END IF;
END $$;

-- ============================================================================
-- 3. page_graphs — Replace open-all policy with business-member scoped policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to page_graphs" ON public.page_graphs;

-- Scope to business members using the existing is_business_member() function
-- Falls back to owner-based check when is_business_member is not available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_business_member'
  ) THEN
    -- is_business_member() function exists; use it
    EXECUTE $policy$
      CREATE POLICY "page_graphs_select_member"
        ON public.page_graphs FOR SELECT
        TO authenticated
        USING (is_business_member(business_id::uuid))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "page_graphs_insert_member"
        ON public.page_graphs FOR INSERT
        TO authenticated
        WITH CHECK (is_business_member(business_id::uuid))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "page_graphs_update_member"
        ON public.page_graphs FOR UPDATE
        TO authenticated
        USING (is_business_member(business_id::uuid))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "page_graphs_delete_member"
        ON public.page_graphs FOR DELETE
        TO authenticated
        USING (is_business_member(business_id::uuid))
    $policy$;
  ELSE
    -- Fallback: scope via businesses.owner_id
    EXECUTE $policy$
      CREATE POLICY "page_graphs_select_owner"
        ON public.page_graphs FOR SELECT
        TO authenticated
        USING (
          business_id IN (
            SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
          )
        )
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "page_graphs_write_owner"
        ON public.page_graphs FOR ALL
        TO authenticated
        USING (
          business_id IN (
            SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- ============================================================================
-- 4. crm_contacts — Ensure user_id column exists, then fix SELECT data-leak
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_contacts') THEN
    ALTER TABLE public.crm_contacts
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    DROP POLICY IF EXISTS "Users can view own contacts" ON public.crm_contacts;
    DROP POLICY IF EXISTS "Users can create contacts" ON public.crm_contacts;
    DROP POLICY IF EXISTS "crm_contacts_select_own" ON public.crm_contacts;
    DROP POLICY IF EXISTS "crm_contacts_insert_own" ON public.crm_contacts;

    EXECUTE $p$
      CREATE POLICY "crm_contacts_select_own"
        ON public.crm_contacts FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $p$;

    EXECUTE $p$
      CREATE POLICY "crm_contacts_insert_own"
        ON public.crm_contacts FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 5. crm_leads — Ensure user_id column exists, then fix SELECT data-leak
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_leads') THEN
    ALTER TABLE public.crm_leads
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    DROP POLICY IF EXISTS "Users can view own leads" ON public.crm_leads;
    DROP POLICY IF EXISTS "Users can create leads" ON public.crm_leads;
    DROP POLICY IF EXISTS "crm_leads_select_own" ON public.crm_leads;
    DROP POLICY IF EXISTS "crm_leads_insert_own" ON public.crm_leads;

    EXECUTE $p$
      CREATE POLICY "crm_leads_select_own"
        ON public.crm_leads FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $p$;

    EXECUTE $p$
      CREATE POLICY "crm_leads_insert_own"
        ON public.crm_leads FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 6. crm_deals — Ensure user_id column exists, then fix SELECT data-leak
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_deals') THEN
    ALTER TABLE public.crm_deals
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    DROP POLICY IF EXISTS "Users can view own deals" ON public.crm_deals;
    DROP POLICY IF EXISTS "Users can create deals" ON public.crm_deals;
    DROP POLICY IF EXISTS "crm_deals_select_own" ON public.crm_deals;
    DROP POLICY IF EXISTS "crm_deals_insert_own" ON public.crm_deals;

    EXECUTE $p$
      CREATE POLICY "crm_deals_select_own"
        ON public.crm_deals FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $p$;

    EXECUTE $p$
      CREATE POLICY "crm_deals_insert_own"
        ON public.crm_deals FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 7. crm_activities — Ensure user_id column exists, then fix SELECT data-leak
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_activities') THEN
    ALTER TABLE public.crm_activities
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    DROP POLICY IF EXISTS "Users can view own activities" ON public.crm_activities;
    DROP POLICY IF EXISTS "Users can create activities" ON public.crm_activities;
    DROP POLICY IF EXISTS "crm_activities_select_own" ON public.crm_activities;
    DROP POLICY IF EXISTS "crm_activities_insert_own" ON public.crm_activities;

    EXECUTE $p$
      CREATE POLICY "crm_activities_select_own"
        ON public.crm_activities FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $p$;

    EXECUTE $p$
      CREATE POLICY "crm_activities_insert_own"
        ON public.crm_activities FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 8. crm_form_submissions — Fix SELECT to scope by workflow owner.
--    Public INSERT stays open (needed for website contact forms).
--    Add business_id column so submissions can be business-scoped.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_form_submissions') THEN
    ALTER TABLE public.crm_form_submissions
      ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_crm_form_submissions_business_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_form_submissions_business_id ON public.crm_form_submissions(business_id)';
    END IF;

    DROP POLICY IF EXISTS "Authenticated users can view submissions" ON public.crm_form_submissions;
    DROP POLICY IF EXISTS "crm_form_submissions_select_owner" ON public.crm_form_submissions;

    EXECUTE $p$
      CREATE POLICY "crm_form_submissions_select_owner"
        ON public.crm_form_submissions FOR SELECT
        TO authenticated
        USING (
          business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.crm_workflows w
            WHERE w.id::text = form_id
              AND w.user_id = auth.uid()
          )
        )
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 9. crm_workflow_runs — Replace open anonymous INSERT with auth-required
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_workflow_runs') THEN
    -- Ensure crm_workflows has user_id before we reference it in the policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_workflows') THEN
      ALTER TABLE public.crm_workflows
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    DROP POLICY IF EXISTS "Anyone can create workflow runs" ON public.crm_workflow_runs;
    DROP POLICY IF EXISTS "crm_workflow_runs_insert_auth" ON public.crm_workflow_runs;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_workflows' AND column_name='user_id') THEN
      EXECUTE $p$
        CREATE POLICY "crm_workflow_runs_insert_auth"
          ON public.crm_workflow_runs FOR INSERT
          TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.crm_workflows w
              WHERE w.id = workflow_id AND w.user_id = auth.uid()
            )
          )
      $p$;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 10. crm_workflow_jobs — Replace open UPDATE with owner-scoped
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_workflow_jobs') THEN
    DROP POLICY IF EXISTS "Anyone can update workflow jobs" ON public.crm_workflow_jobs;
    DROP POLICY IF EXISTS "crm_workflow_jobs_update_owner" ON public.crm_workflow_jobs;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_workflows' AND column_name='user_id') THEN
      EXECUTE $p$
        CREATE POLICY "crm_workflow_jobs_update_owner"
          ON public.crm_workflow_jobs FOR UPDATE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.crm_workflow_runs r
              JOIN public.crm_workflows w ON r.workflow_id = w.id
              WHERE r.id = workflow_run_id AND w.user_id = auth.uid()
            )
          )
      $p$;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 11. site_users — Revoke password_hash column from web-facing roles
--     Password hashes must never be exposed via the PostgREST API.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_users' AND column_name = 'password_hash'
  ) THEN
    EXECUTE 'REVOKE SELECT (password_hash) ON public.site_users FROM anon';
    EXECUTE 'REVOKE SELECT (password_hash) ON public.site_users FROM authenticated';
  END IF;
END $$;

-- ============================================================================
-- 12. user_subscriptions — Add FK to auth.users (was missing)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_subscriptions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE c.conname = 'user_subscriptions_user_id_fkey'
        AND n.nspname = 'public'
        AND t.relname = 'user_subscriptions'
    ) THEN
      ALTER TABLE public.user_subscriptions
        ADD CONSTRAINT user_subscriptions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 13. Missing performance indexes on critical lookup columns
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_contacts') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_crm_contacts_user_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_contacts_user_id ON public.crm_contacts(user_id)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_leads') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_crm_leads_user_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_leads_user_id ON public.crm_leads(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='business_id')
      AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_crm_leads_business_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_leads_business_id ON public.crm_leads(business_id)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_deals') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_crm_deals_user_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_deals_user_id ON public.crm_deals(user_id)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_activities') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_crm_activities_user_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_activities_user_id ON public.crm_activities(user_id)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_automations') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_crm_automations_user_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_automations_user_id ON public.crm_automations(user_id)';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_orders_user_id') THEN
      EXECUTE 'CREATE INDEX idx_orders_user_id ON public.orders(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='business_id')
      AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_orders_business_id') THEN
      EXECUTE 'CREATE INDEX idx_orders_business_id ON public.orders(business_id)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_user_id') THEN
      EXECUTE 'CREATE INDEX idx_products_user_id ON public.products(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='business_id')
      AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_business_id') THEN
      EXECUTE 'CREATE INDEX idx_products_business_id ON public.products(business_id)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='design_templates') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='design_templates' AND column_name='user_id')
      AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_design_templates_user_id') THEN
      EXECUTE 'CREATE INDEX idx_design_templates_user_id ON public.design_templates(user_id)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vfs_snapshots') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_vfs_snapshots_user_id') THEN
      EXECUTE 'CREATE INDEX idx_vfs_snapshots_user_id ON public.vfs_snapshots(user_id)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_subscriptions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_user_subscriptions_user_id') THEN
      EXECUTE 'CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id)';
    END IF;
  END IF;
END $$;
