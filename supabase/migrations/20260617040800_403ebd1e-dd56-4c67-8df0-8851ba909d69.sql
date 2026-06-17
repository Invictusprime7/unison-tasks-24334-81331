-- Track 3: Re-enable RLS on core user tables.
-- The companion DISABLE statements have been moved from
-- supabase/migrations/ to supabase/dev-only/ so they no longer run
-- against production. This migration is idempotent.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'builder_drafts') THEN
    EXECUTE 'ALTER TABLE public.builder_drafts ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
    EXECUTE 'ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_subscriptions') THEN
    EXECUTE 'ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'onboarding_state') THEN
    EXECUTE 'ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'site_users') THEN
    EXECUTE 'ALTER TABLE public.site_users ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;