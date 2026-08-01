
-- Missing site-graph tables required by the confirmed launch provisioner
CREATE TABLE IF NOT EXISTS public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  status text NOT NULL DEFAULT 'preview',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_build_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sites_member_all" ON public.sites FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_business_member(business_id))
  WITH CHECK (owner_user_id = auth.uid() OR public.is_business_member(business_id));

CREATE TABLE IF NOT EXISTS public.site_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'preview',
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  current_stage text,
  started_at timestamptz,
  finished_at timestamptz,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_builds TO authenticated;
GRANT ALL ON public.site_builds TO service_role;
ALTER TABLE public.site_builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_builds_member_all" ON public.site_builds FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND (s.owner_user_id = auth.uid() OR public.is_business_member(s.business_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND (s.owner_user_id = auth.uid() OR public.is_business_member(s.business_id))));

CREATE TABLE IF NOT EXISTS public.site_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  build_id uuid REFERENCES public.site_builds(id) ON DELETE SET NULL,
  version text NOT NULL DEFAULT '1.0.0',
  schema_version integer NOT NULL DEFAULT 1,
  bundle jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_bundles TO authenticated;
GRANT ALL ON public.site_bundles TO service_role;
ALTER TABLE public.site_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_bundles_member_all" ON public.site_bundles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND (s.owner_user_id = auth.uid() OR public.is_business_member(s.business_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND (s.owner_user_id = auth.uid() OR public.is_business_member(s.business_id))));

CREATE TABLE IF NOT EXISTS public.site_runtime_configs (
  site_id uuid PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  api_version text NOT NULL DEFAULT '2026-07-27',
  public_runtime_enabled boolean NOT NULL DEFAULT true,
  external_deploy_allowed boolean NOT NULL DEFAULT true,
  attribution_required boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_runtime_configs TO authenticated;
GRANT ALL ON public.site_runtime_configs TO service_role;
ALTER TABLE public.site_runtime_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_runtime_configs_member_all" ON public.site_runtime_configs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND (s.owner_user_id = auth.uid() OR public.is_business_member(s.business_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND (s.owner_user_id = auth.uid() OR public.is_business_member(s.business_id))));

CREATE TABLE IF NOT EXISTS public.site_capabilities (
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  capability_id text NOT NULL,
  status text NOT NULL DEFAULT 'enabled',
  enabled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, capability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_capabilities TO authenticated;
GRANT ALL ON public.site_capabilities TO service_role;
ALTER TABLE public.site_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_capabilities_member_all" ON public.site_capabilities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND (s.owner_user_id = auth.uid() OR public.is_business_member(s.business_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND (s.owner_user_id = auth.uid() OR public.is_business_member(s.business_id))));

CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_events_member_read" ON public.usage_events FOR SELECT TO authenticated
  USING (business_id IS NOT NULL AND public.is_business_member(business_id));
CREATE POLICY "usage_events_member_insert" ON public.usage_events FOR INSERT TO authenticated
  WITH CHECK (business_id IS NOT NULL AND public.is_business_member(business_id));

CREATE TABLE IF NOT EXISTS public.form_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  project_id uuid,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  intent text NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  destination jsonb NOT NULL DEFAULT '{}'::jsonb,
  success_behavior jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_definitions TO authenticated;
GRANT SELECT ON public.form_definitions TO anon;
GRANT ALL ON public.form_definitions TO service_role;
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_definitions_member_all" ON public.form_definitions FOR ALL TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "form_definitions_public_read" ON public.form_definitions FOR SELECT TO anon
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.onboarding_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  current_step text,
  industry text,
  business_name text,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_state TO authenticated;
GRANT ALL ON public.onboarding_state TO service_role;
ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_state_self" ON public.onboarding_state FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Site linkage columns expected by the provisioner
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE public.builder_drafts ADD COLUMN IF NOT EXISTS site_id uuid;
CREATE INDEX IF NOT EXISTS builder_drafts_site_id_idx ON public.builder_drafts(site_id);
CREATE INDEX IF NOT EXISTS projects_site_id_idx ON public.projects(site_id);

-- Restore EXECUTE privileges on helper functions used inside RLS policies
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_business_role(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
