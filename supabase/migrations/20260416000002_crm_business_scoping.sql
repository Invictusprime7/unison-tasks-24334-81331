-- ============================================================================
-- SCHEMA HARDENING PART 3 — CRM Multi-Tenancy + builder_drafts FK
-- ============================================================================
-- Remaining gaps:
--   1. crm_contacts / crm_deals / crm_activities — no business_id column
--      Teams cannot share CRM data; data is isolated per user only
--   2. builder_drafts.template_id — no FK to design_templates
--      Orphan drafts accumulate silently; template deletes don't cascade
--   3. crm_automations — user_id FK missing; scoped but no FK constraint
--   4. Ensure auto-creation of business_members row when business is created
-- ============================================================================

-- ============================================================================
-- 1. crm_contacts — Add business_id for team-level visibility
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_contacts') THEN
    ALTER TABLE public.crm_contacts
      ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_crm_contacts_business_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_contacts_business_id ON public.crm_contacts(business_id)';
    END IF;

    DROP POLICY IF EXISTS "crm_contacts_select_own" ON public.crm_contacts;
    DROP POLICY IF EXISTS "crm_contacts_select" ON public.crm_contacts;
    DROP POLICY IF EXISTS "crm_contacts_insert_own" ON public.crm_contacts;
    DROP POLICY IF EXISTS "crm_contacts_insert" ON public.crm_contacts;

    EXECUTE $p$
      CREATE POLICY "crm_contacts_select"
        ON public.crm_contacts FOR SELECT
        TO authenticated
        USING (
          user_id = auth.uid()
          OR (business_id IS NOT NULL AND public.is_business_member(business_id))
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY "crm_contacts_insert"
        ON public.crm_contacts FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR (business_id IS NOT NULL AND public.is_business_member(business_id))
        )
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 2. crm_deals — Add business_id for team-level visibility
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_deals') THEN
    ALTER TABLE public.crm_deals
      ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;
    ALTER TABLE public.crm_deals
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_crm_deals_business_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_deals_business_id ON public.crm_deals(business_id)';
    END IF;

    DROP POLICY IF EXISTS "crm_deals_select_own" ON public.crm_deals;
    DROP POLICY IF EXISTS "crm_deals_select" ON public.crm_deals;
    DROP POLICY IF EXISTS "crm_deals_insert_own" ON public.crm_deals;
    DROP POLICY IF EXISTS "crm_deals_insert" ON public.crm_deals;

    EXECUTE $p$
      CREATE POLICY "crm_deals_select"
        ON public.crm_deals FOR SELECT
        TO authenticated
        USING (
          user_id = auth.uid()
          OR (business_id IS NOT NULL AND public.is_business_member(business_id))
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY "crm_deals_insert"
        ON public.crm_deals FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR (business_id IS NOT NULL AND public.is_business_member(business_id))
        )
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 3. crm_activities — Add business_id for team-level visibility
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_activities') THEN
    ALTER TABLE public.crm_activities
      ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;
    ALTER TABLE public.crm_activities
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_crm_activities_business_id') THEN
      EXECUTE 'CREATE INDEX idx_crm_activities_business_id ON public.crm_activities(business_id)';
    END IF;

    DROP POLICY IF EXISTS "crm_activities_select_own" ON public.crm_activities;
    DROP POLICY IF EXISTS "crm_activities_select" ON public.crm_activities;
    DROP POLICY IF EXISTS "crm_activities_insert_own" ON public.crm_activities;
    DROP POLICY IF EXISTS "crm_activities_insert" ON public.crm_activities;

    EXECUTE $p$
      CREATE POLICY "crm_activities_select"
        ON public.crm_activities FOR SELECT
        TO authenticated
        USING (
          user_id = auth.uid()
          OR (business_id IS NOT NULL AND public.is_business_member(business_id))
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY "crm_activities_insert"
        ON public.crm_activities FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR (business_id IS NOT NULL AND public.is_business_member(business_id))
        )
    $p$;
  END IF;
END $$;

-- ============================================================================
-- 4. builder_drafts — Add FK from template_id to design_templates
--    Orphan drafts accumulate when templates are deleted. The FK ensures
--    referential integrity and enables proper cascade/set-null behavior.
-- ============================================================================
DO $$
BEGIN
  -- builder_drafts is created in migration 000000 (CREATE TABLE IF NOT EXISTS)
  -- so it will exist by the time this runs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='builder_drafts')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='design_templates') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE c.conname = 'builder_drafts_template_id_fkey'
        AND n.nspname = 'public' AND t.relname = 'builder_drafts'
    ) THEN
      ALTER TABLE public.builder_drafts
        ADD CONSTRAINT builder_drafts_template_id_fkey
        FOREIGN KEY (template_id)
        REFERENCES public.design_templates(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_builder_drafts_template_id') THEN
      EXECUTE 'CREATE INDEX idx_builder_drafts_template_id ON public.builder_drafts(template_id)';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 5. crm_automations — Add FK from user_id to auth.users
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_automations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE c.conname = 'crm_automations_user_id_fkey'
        AND n.nspname = 'public' AND t.relname = 'crm_automations'
    ) THEN
      ALTER TABLE public.crm_automations
        ADD CONSTRAINT crm_automations_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 6. Auto-add owner as business_member when a business is created
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='business_members')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='businesses') THEN

    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.auto_add_business_owner()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        INSERT INTO public.business_members (business_id, user_id, role, created_at)
        VALUES (NEW.id, NEW.owner_id, 'owner', now())
        ON CONFLICT (business_id, user_id) DO NOTHING;
        RETURN NEW;
      END;
      $body$
    $f$;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE t.tgname = 'on_business_created_add_owner'
        AND n.nspname = 'public' AND c.relname = 'businesses'
    ) THEN
      EXECUTE $t$
        CREATE TRIGGER on_business_created_add_owner
          AFTER INSERT ON public.businesses
          FOR EACH ROW EXECUTE FUNCTION public.auto_add_business_owner()
      $t$;
    END IF;
  END IF;
END $$;

-- Backfill: ensure every existing business owner is in business_members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='business_members')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='businesses') THEN
    INSERT INTO public.business_members (business_id, user_id, role, created_at)
    SELECT b.id, b.owner_id, 'owner', b.created_at
    FROM public.businesses b
    WHERE NOT EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.business_id = b.id AND bm.user_id = b.owner_id
    )
    ON CONFLICT (business_id, user_id) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 7. ai_learning_sessions — Add user_id column + FK to auth.users
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_learning_sessions') THEN
    -- Add user_id column if it doesn't exist (original table has none)
    ALTER TABLE public.ai_learning_sessions
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_ai_learning_sessions_user_id') THEN
      EXECUTE 'CREATE INDEX idx_ai_learning_sessions_user_id ON public.ai_learning_sessions(user_id) WHERE user_id IS NOT NULL';
    END IF;
  END IF;
END $$;
