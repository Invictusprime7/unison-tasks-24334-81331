-- Resumable wizard state and encrypted third-party Supabase connection records.
-- OAuth tokens never receive browser-readable RLS policies.

CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  current_step integer NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'awaiting_backend_connection',
    'ready_to_provision',
    'provisioning',
    'generating',
    'completed',
    'failed'
  )),
  backend_mode text CHECK (backend_mode IN ('unison_managed', 'connected_supabase')),
  selections jsonb NOT NULL DEFAULT '{}'::jsonb,
  provisioning_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_sessions_user_status_updated_idx
  ON public.onboarding_sessions (user_id, status, updated_at DESC);

ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_sessions_select_own"
  ON public.onboarding_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "onboarding_sessions_insert_own_draft"
  ON public.onboarding_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'draft');

CREATE POLICY "onboarding_sessions_update_own_draft"
  ON public.onboarding_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('draft', 'awaiting_backend_connection', 'failed'))
  WITH CHECK (user_id = auth.uid() AND status IN ('draft', 'awaiting_backend_connection', 'failed'));

DROP TRIGGER IF EXISTS set_onboarding_sessions_updated_at ON public.onboarding_sessions;
CREATE TRIGGER set_onboarding_sessions_updated_at
  BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS public.supabase_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'supabase' CHECK (provider = 'supabase'),
  supabase_user_id text,
  access_token_ciphertext text NOT NULL,
  refresh_token_ciphertext text NOT NULL,
  token_expires_at timestamptz,
  granted_scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  token_version integer NOT NULL DEFAULT 1,
  refresh_lock_until timestamptz,
  last_refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supabase_connections_user_status_idx
  ON public.supabase_connections (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS supabase_connections_business_idx
  ON public.supabase_connections (business_id) WHERE business_id IS NOT NULL;

ALTER TABLE public.supabase_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.supabase_connections FROM anon, authenticated;

DROP TRIGGER IF EXISTS set_supabase_connections_updated_at ON public.supabase_connections;
CREATE TRIGGER set_supabase_connections_updated_at
  BEFORE UPDATE ON public.supabase_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS public.connected_supabase_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.supabase_connections(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  unison_project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_slug text NOT NULL,
  project_ref text NOT NULL,
  project_name text NOT NULL,
  region text,
  project_url text,
  publishable_key_ciphertext text,
  secret_key_ciphertext text,
  schema_version integer NOT NULL DEFAULT 0,
  provisioning_status text NOT NULL DEFAULT 'selected' CHECK (provisioning_status IN (
    'selected', 'verifying', 'provisioning', 'ready', 'failed', 'disconnected'
  )),
  backend_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  health_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, project_ref)
);

CREATE UNIQUE INDEX IF NOT EXISTS connected_supabase_projects_active_business_idx
  ON public.connected_supabase_projects (business_id)
  WHERE provisioning_status <> 'disconnected';
CREATE INDEX IF NOT EXISTS connected_supabase_projects_unison_project_idx
  ON public.connected_supabase_projects (unison_project_id)
  WHERE unison_project_id IS NOT NULL;

ALTER TABLE public.connected_supabase_projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.connected_supabase_projects FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_connected_supabase_project_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.supabase_connections connection
    WHERE connection.id = NEW.connection_id
      AND connection.business_id IS NOT DISTINCT FROM NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Connected Supabase project must use a connection for the same business';
  END IF;

  IF NEW.unison_project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.projects project
    WHERE project.id = NEW.unison_project_id
      AND project.business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Connected Supabase project must target a Unison project for the same business';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_connected_supabase_project_scope() FROM PUBLIC;

DROP TRIGGER IF EXISTS assert_connected_supabase_project_scope ON public.connected_supabase_projects;
CREATE TRIGGER assert_connected_supabase_project_scope
  BEFORE INSERT OR UPDATE OF connection_id, business_id, unison_project_id
  ON public.connected_supabase_projects
  FOR EACH ROW EXECUTE FUNCTION public.assert_connected_supabase_project_scope();

DROP TRIGGER IF EXISTS set_connected_supabase_projects_updated_at ON public.connected_supabase_projects;
CREATE TRIGGER set_connected_supabase_projects_updated_at
  BEFORE UPDATE ON public.connected_supabase_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- A server-side API returns a sanitized projection; the view itself is not
-- granted to browser roles because those roles must not query token-bearing
-- tables directly, even through a future view change.
CREATE OR REPLACE VIEW public.supabase_connection_summaries
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  business_id,
  status,
  granted_scopes,
  token_expires_at,
  created_at,
  updated_at
FROM public.supabase_connections;

REVOKE ALL ON TABLE public.supabase_connection_summaries FROM anon, authenticated;

-- A connected backend is an administrator-level business action. Keep this
-- separate from platform administration and subscription entitlements.
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
    WHEN 'backend.connect' THEN public.is_business_admin(p_business_id)
    ELSE false
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.business_has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_has_permission(uuid, text) TO authenticated;