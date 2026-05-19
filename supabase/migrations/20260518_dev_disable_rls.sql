-- Development: Disable RLS for local testing
-- This allows unauthenticated access to tables during development
-- DO NOT use this in production

ALTER TABLE public.builder_drafts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_users DISABLE ROW LEVEL SECURITY;
