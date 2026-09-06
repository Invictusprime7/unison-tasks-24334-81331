-- The setup wizard is derived per confirmed site, not per business. A business
-- can operate several sites with different industries and capability packs.
CREATE TABLE IF NOT EXISTS public.site_setup_steps (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
	business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
	project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
	step_id text NOT NULL,
	category text NOT NULL CHECK (category IN ('core', 'growth', 'advanced')),
	required boolean NOT NULL DEFAULT false,
	status text NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
	config jsonb NOT NULL DEFAULT '{}'::jsonb,
	completed_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (site_id, step_id)
);

CREATE INDEX IF NOT EXISTS site_setup_steps_site_id_idx
	ON public.site_setup_steps (site_id, status);

ALTER TABLE public.site_setup_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_setup_steps_business_member" ON public.site_setup_steps;
CREATE POLICY "site_setup_steps_business_member"
	ON public.site_setup_steps FOR ALL TO authenticated
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

DROP TRIGGER IF EXISTS set_site_setup_steps_updated_at ON public.site_setup_steps;
CREATE TRIGGER set_site_setup_steps_updated_at
	BEFORE UPDATE ON public.site_setup_steps
	FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
		AND NOT EXISTS (
			SELECT 1 FROM pg_publication_tables
			WHERE pubname = 'supabase_realtime'
				AND schemaname = 'public'
				AND tablename = 'site_setup_steps'
		) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.site_setup_steps;
	END IF;
END $$;
