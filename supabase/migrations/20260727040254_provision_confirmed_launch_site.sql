-- Confirmed launches create one durable, tenant-scoped root for the generated
-- site. The browser never creates a partial project then tries to infer its
-- site identity later: project, site, draft, build, bundle and runtime policy
-- are all linked from the first committed launch.

ALTER TABLE public.projects
	ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;

ALTER TABLE public.builder_drafts
	ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS projects_site_id_unique
	ON public.projects(site_id) WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS builder_drafts_site_id_idx
	ON public.builder_drafts(site_id);

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

CREATE TABLE IF NOT EXISTS public.site_capabilities (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
	capability_id text NOT NULL,
	status text NOT NULL DEFAULT 'enabled'
		CHECK (status IN ('enabled', 'disabled', 'provisioning', 'failed')),
	configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
	enabled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE(site_id, capability_id)
);

CREATE INDEX IF NOT EXISTS site_capabilities_site_id_idx
	ON public.site_capabilities(site_id);

ALTER TABLE public.site_runtime_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_runtime_configs_business_member" ON public.site_runtime_configs;
CREATE POLICY "site_runtime_configs_business_member"
	ON public.site_runtime_configs FOR ALL TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	);

DROP POLICY IF EXISTS "site_capabilities_business_member" ON public.site_capabilities;
CREATE POLICY "site_capabilities_business_member"
	ON public.site_capabilities FOR ALL TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	);

-- The original SiteBundle migration scoped these resources to the legacy
-- direct business owner only. Sites now support developer agencies and client
-- collaborators through business_members, so the canonical runtime uses that
-- shared tenant boundary consistently.
DROP POLICY IF EXISTS "sites_business_isolation" ON public.sites;
CREATE POLICY "sites_business_member" ON public.sites
	FOR ALL TO authenticated
	USING (public.is_business_member(business_id))
	WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "site_builds_business_isolation" ON public.site_builds;
CREATE POLICY "site_builds_business_member" ON public.site_builds
	FOR ALL TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	);

DROP POLICY IF EXISTS "site_bundles_business_isolation" ON public.site_bundles;
CREATE POLICY "site_bundles_business_member" ON public.site_bundles
	FOR ALL TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	);

DROP POLICY IF EXISTS "publish_artifacts_business_isolation" ON public.publish_artifacts;
CREATE POLICY "publish_artifacts_business_member" ON public.publish_artifacts
	FOR ALL TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.sites s
			WHERE s.id = site_id AND public.is_business_member(s.business_id)
		)
	);
