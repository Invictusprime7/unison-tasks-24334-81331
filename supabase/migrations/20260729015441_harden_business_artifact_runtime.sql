-- Canonical Business Runtime, vertical slice 1:
-- make the existing component graph business-scoped and connect rendered
-- catalog artifacts to the site_data_bindings rows that hydrate them.

INSERT INTO public.component_definitions (
	slug,
	name,
	description,
	category,
	component_type,
	target_type,
	required_binding_keys,
	required_business_fields,
	required_setup_steps,
	output_events,
	is_system
)
VALUES (
	'service-grid',
	'Service Grid',
	'Live service catalog surface backed by the canonical services table.',
	'commerce',
	'ServiceGrid',
	'catalog',
	'["dataBindingId"]'::jsonb,
	'[]'::jsonb,
	'["services"]'::jsonb,
	'["booking.started","quote.requested","catalog.viewed"]'::jsonb,
	true
)
ON CONFLICT (slug) DO UPDATE
SET
	name = EXCLUDED.name,
	description = EXCLUDED.description,
	category = EXCLUDED.category,
	component_type = EXCLUDED.component_type,
	target_type = EXCLUDED.target_type,
	required_binding_keys = EXCLUDED.required_binding_keys,
	required_business_fields = EXCLUDED.required_business_fields,
	required_setup_steps = EXCLUDED.required_setup_steps,
	output_events = EXCLUDED.output_events,
	updated_at = now();

ALTER TABLE public.project_component_instances
	ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS published_at timestamptz,
	ADD COLUMN IF NOT EXISTS archived_at timestamptz,
	ADD COLUMN IF NOT EXISTS last_revision_id uuid REFERENCES public.site_revisions(id) ON DELETE SET NULL;

UPDATE public.project_component_instances pci
SET business_id = p.business_id
FROM public.projects p
WHERE p.id = pci.project_id
	AND pci.business_id IS NULL;

COMMENT ON COLUMN public.project_component_instances.business_id IS
	'Canonical tenant owner. NULL is reserved for read-only artifacts created before projects were business-scoped.';

ALTER TABLE public.project_component_instances
	DROP CONSTRAINT IF EXISTS project_component_instances_status_check;
ALTER TABLE public.project_component_instances
	ADD CONSTRAINT project_component_instances_status_check
	CHECK (status IN ('draft', 'ready', 'stubbed', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_project_component_instances_business_status
	ON public.project_component_instances (business_id, status, updated_at DESC);

ALTER TABLE public.project_component_bindings
	ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS site_data_binding_id uuid REFERENCES public.site_data_bindings(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS verified_at timestamptz;

UPDATE public.project_component_bindings pcb
SET business_id = pci.business_id
FROM public.project_component_instances pci
WHERE pci.id = pcb.component_instance_id
	AND pcb.business_id IS NULL;

COMMENT ON COLUMN public.project_component_bindings.business_id IS
	'Canonical tenant owner. NULL is reserved for read-only bindings created before projects were business-scoped.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_component_bindings_site_data_binding
	ON public.project_component_bindings (component_instance_id, site_data_binding_id)
	WHERE site_data_binding_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assert_component_artifact_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	project_business_id uuid;
	instance_business_id uuid;
	data_binding_business_id uuid;
	data_binding_project_id uuid;
BEGIN
	SELECT business_id INTO project_business_id
	FROM public.projects
	WHERE id = NEW.project_id;

	IF project_business_id IS NULL OR project_business_id <> NEW.business_id THEN
		RAISE EXCEPTION 'Artifact business_id must match its project business_id';
	END IF;

	IF TG_TABLE_NAME = 'project_component_bindings' THEN
		SELECT business_id INTO instance_business_id
		FROM public.project_component_instances
		WHERE id = NEW.component_instance_id;

		IF instance_business_id IS NULL OR instance_business_id <> NEW.business_id THEN
			RAISE EXCEPTION 'Binding business_id must match its component instance';
		END IF;

		IF NEW.site_data_binding_id IS NOT NULL THEN
			SELECT business_id, project_id
			INTO data_binding_business_id, data_binding_project_id
			FROM public.site_data_bindings
			WHERE id = NEW.site_data_binding_id;

			IF data_binding_business_id IS NULL
				OR data_binding_business_id <> NEW.business_id
				OR data_binding_project_id <> NEW.project_id THEN
				RAISE EXCEPTION 'Data binding must belong to the same business and project';
			END IF;
		END IF;
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_component_instance_ownership ON public.project_component_instances;
CREATE TRIGGER trg_component_instance_ownership
	BEFORE INSERT OR UPDATE OF business_id, project_id
	ON public.project_component_instances
	FOR EACH ROW EXECUTE FUNCTION public.assert_component_artifact_ownership();

DROP TRIGGER IF EXISTS trg_component_binding_ownership ON public.project_component_bindings;
CREATE TRIGGER trg_component_binding_ownership
	BEFORE INSERT OR UPDATE OF business_id, project_id, component_instance_id, site_data_binding_id
	ON public.project_component_bindings
	FOR EACH ROW EXECUTE FUNCTION public.assert_component_artifact_ownership();

CREATE OR REPLACE FUNCTION public.promote_project_artifacts_to_business()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
	IF OLD.business_id IS NULL AND NEW.business_id IS NOT NULL THEN
		UPDATE public.project_component_instances
		SET business_id = NEW.business_id
		WHERE project_id = NEW.id
			AND business_id IS NULL;

		UPDATE public.project_component_bindings
		SET business_id = NEW.business_id
		WHERE project_id = NEW.id
			AND business_id IS NULL;
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_project_artifacts_to_business ON public.projects;
CREATE TRIGGER trg_promote_project_artifacts_to_business
	AFTER UPDATE OF business_id
	ON public.projects
	FOR EACH ROW EXECUTE FUNCTION public.promote_project_artifacts_to_business();

DROP POLICY IF EXISTS "project_component_instances_owner_full" ON public.project_component_instances;
CREATE POLICY "project_component_instances_member_full"
	ON public.project_component_instances
	FOR ALL TO authenticated
	USING (public.is_business_member(business_id))
	WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "project_component_instances_legacy_owner_read"
	ON public.project_component_instances
	FOR SELECT TO authenticated
	USING (
		business_id IS NULL
		AND EXISTS (
			SELECT 1 FROM public.projects p
			WHERE p.id = project_id
				AND p.owner_id = auth.uid()
		)
	);

DROP POLICY IF EXISTS "project_component_bindings_owner_full" ON public.project_component_bindings;
CREATE POLICY "project_component_bindings_member_full"
	ON public.project_component_bindings
	FOR ALL TO authenticated
	USING (public.is_business_member(business_id))
	WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "project_component_bindings_legacy_owner_read"
	ON public.project_component_bindings
	FOR SELECT TO authenticated
	USING (
		business_id IS NULL
		AND EXISTS (
			SELECT 1 FROM public.projects p
			WHERE p.id = project_id
				AND p.owner_id = auth.uid()
		)
	);
