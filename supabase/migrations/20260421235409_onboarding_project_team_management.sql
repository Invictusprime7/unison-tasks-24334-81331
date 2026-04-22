-- ============================================================================
-- ONBOARDING, PROJECT SETTINGS & TEAM MANAGEMENT
-- Adds per-project isolated config + workspace member permissions
-- ============================================================================

-- ============================================================================
-- 1. project_settings — isolated CRM + automation config per project
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- CRM configuration (pipeline stages, custom fields, etc.)
  crm_config        JSONB NOT NULL DEFAULT '{
    "pipeline_stages": ["New Lead", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
    "custom_fields": [],
    "lead_sources": ["Website", "Referral", "Social Media", "Direct"],
    "auto_assign": false
  }'::jsonb,
  -- Automation rules
  automation_config JSONB NOT NULL DEFAULT '{
    "welcome_email": false,
    "lead_notification": true,
    "booking_confirmation": true,
    "follow_up_sequence": false,
    "workflows": []
  }'::jsonb,
  -- General project settings (integrations, domains, etc.)
  settings    JSONB NOT NULL DEFAULT '{
    "notifications": {"email": true, "sms": false},
    "integrations": {},
    "domain": null,
    "analytics_enabled": false
  }'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_settings_owner_full"
  ON public.project_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_project_settings_project_id
  ON public.project_settings(project_id);

-- Auto-create settings row when a project is created
CREATE OR REPLACE FUNCTION public.create_default_project_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_settings (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_project_created_init_settings'
      AND n.nspname = 'public' AND c.relname = 'projects'
  ) THEN
    CREATE TRIGGER on_project_created_init_settings
      AFTER INSERT ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.create_default_project_settings();
  END IF;
END $$;

-- Backfill existing projects
INSERT INTO public.project_settings (project_id)
SELECT id FROM public.projects
ON CONFLICT (project_id) DO NOTHING;

-- ============================================================================
-- 2. workspace_members — add permissions column for feature-level access control
-- ============================================================================
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{
    "crm": true,
    "automations": true,
    "web_builder": true,
    "analytics": false,
    "billing": false,
    "team_management": false,
    "file_storage": true,
    "design_studio": false
  }'::jsonb;

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS invited_email TEXT;

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Enable RLS if not already enabled
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace owner can manage all members
CREATE POLICY "workspace_members_owner_manage"
  ON public.workspace_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = workspace_id::uuid AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = workspace_id::uuid AND p.owner_id = auth.uid()
    )
  );

-- Members can view their own membership
CREATE POLICY "workspace_members_self_select"
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
  ON public.workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
  ON public.workspace_members(user_id);

-- ============================================================================
-- 3. onboarding_state — track where each user is in the onboarding funnel
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.onboarding_state (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed       BOOLEAN NOT NULL DEFAULT false,
  current_step    TEXT NOT NULL DEFAULT 'industry_selection',
  -- Steps: industry_selection → business_name → preview → launched
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  industry        TEXT,
  business_name   TEXT,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_state_own"
  ON public.onboarding_state
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-create onboarding state for new users
CREATE OR REPLACE FUNCTION public.create_onboarding_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.onboarding_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_auth_user_created_onboarding'
      AND n.nspname = 'public' AND c.relname = 'profiles'
  ) THEN
    CREATE TRIGGER on_auth_user_created_onboarding
      AFTER INSERT ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.create_onboarding_state();
  END IF;
END $$;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_project_settings_updated_at') THEN
    CREATE TRIGGER set_project_settings_updated_at
      BEFORE UPDATE ON public.project_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_onboarding_state_updated_at') THEN
    CREATE TRIGGER set_onboarding_state_updated_at
      BEFORE UPDATE ON public.onboarding_state
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
  END IF;
END $$;
