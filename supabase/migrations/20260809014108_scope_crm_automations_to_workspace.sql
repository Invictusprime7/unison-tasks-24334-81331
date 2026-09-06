CREATE TABLE IF NOT EXISTS public.crm_automations (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	trigger_event text NOT NULL,
	conditions jsonb DEFAULT '[]'::jsonb,
	actions jsonb DEFAULT '[]'::jsonb,
	is_active boolean DEFAULT true,
	user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crm_automations
	ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_crm_automations_business_project
	ON public.crm_automations (business_id, project_id);

DROP POLICY IF EXISTS "Users can view own automations" ON public.crm_automations;
DROP POLICY IF EXISTS "Users can create automations" ON public.crm_automations;
DROP POLICY IF EXISTS "Users can update own automations" ON public.crm_automations;
DROP POLICY IF EXISTS "Users can delete own automations" ON public.crm_automations;

CREATE POLICY "crm_automations_select_scoped"
	ON public.crm_automations FOR SELECT
	TO authenticated
	USING (
		user_id = (SELECT auth.uid())
		OR (
			business_id IS NOT NULL
			AND public.is_business_member(business_id)
			AND (
				project_id IS NULL
				OR EXISTS (
					SELECT 1 FROM public.projects
					WHERE projects.id = crm_automations.project_id
						AND projects.business_id = crm_automations.business_id
				)
			)
		)
	);

CREATE POLICY "crm_automations_insert_scoped"
	ON public.crm_automations FOR INSERT
	TO authenticated
	WITH CHECK (
		user_id = (SELECT auth.uid())
		AND business_id IS NOT NULL
		AND project_id IS NOT NULL
		AND public.is_business_member(business_id)
		AND EXISTS (
			SELECT 1 FROM public.projects
			WHERE projects.id = crm_automations.project_id
				AND projects.business_id = crm_automations.business_id
		)
	);

CREATE POLICY "crm_automations_update_scoped"
	ON public.crm_automations FOR UPDATE
	TO authenticated
	USING (
		business_id IS NOT NULL
		AND public.is_business_member(business_id)
	)
	WITH CHECK (
		business_id IS NOT NULL
		AND project_id IS NOT NULL
		AND public.is_business_member(business_id)
		AND EXISTS (
			SELECT 1 FROM public.projects
			WHERE projects.id = crm_automations.project_id
				AND projects.business_id = crm_automations.business_id
		)
	);

CREATE POLICY "crm_automations_delete_scoped"
	ON public.crm_automations FOR DELETE
	TO authenticated
	USING (
		business_id IS NOT NULL
		AND public.is_business_member(business_id)
	);
