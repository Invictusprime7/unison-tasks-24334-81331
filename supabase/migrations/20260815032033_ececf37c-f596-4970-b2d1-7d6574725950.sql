-- Persist the platform-core commit and all launcher projections in one
-- transaction. No draft, bundle, build, or runtime surface may advance from a
-- payload that differs from SiteBundleSnapshot.vfsFiles.
ALTER TABLE public.site_revisions
	DROP CONSTRAINT IF EXISTS site_revisions_source_chk;

ALTER TABLE public.site_revisions
	ADD CONSTRAINT site_revisions_source_chk CHECK (source IN (
		'wizard-launch',
		'ai-builder',
		'playground-edit',
		'layout-fast-path',
		'preview-toolbar',
		'binding-fast-path',
		'ghl-binding',
		'theme-change',
		'republish',
		'system-restore'
	));

ALTER TABLE public.site_bundles
	ADD COLUMN IF NOT EXISTS revision_id uuid
	REFERENCES public.site_revisions(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS site_bundles_revision_id_idx
	ON public.site_bundles(revision_id)
	WHERE revision_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.commit_canonical_site_revision(
	p_project_id uuid,
	p_business_id uuid,
	p_draft_id uuid,
	p_parent_revision_id uuid,
	p_source text,
	p_status text,
	p_patch_json jsonb,
	p_vfs_files jsonb,
	p_site_bundle_snapshot jsonb,
	p_runtime_manifest jsonb,
	p_playground_state jsonb,
	p_readiness_report jsonb,
	p_diagnostics jsonb,
	p_publish_ready boolean,
	p_publish_blockers jsonb,
	p_backend_ops_applied jsonb,
	p_vfs_hash text,
	p_active_page_path text
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	v_user_id uuid := auth.uid();
	v_revision_id uuid;
	v_current_revision_id uuid;
	v_site_id uuid;
	v_build_id uuid;
	v_bundle_id uuid;
	v_metadata jsonb;
	v_active_page_path text;
BEGIN
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'Authentication is required to commit a canonical revision'
			USING ERRCODE = '42501';
	END IF;

	SELECT
		draft.last_revision_id,
		draft.site_id,
		draft.metadata,
		CASE
			WHEN COALESCE(draft.metadata->>'siteBuildId', '') ~*
				'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
			THEN (draft.metadata->>'siteBuildId')::uuid
			ELSE NULL
		END,
		CASE
			WHEN COALESCE(draft.metadata->>'siteBundleId', '') ~*
				'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
			THEN (draft.metadata->>'siteBundleId')::uuid
			ELSE NULL
		END
	INTO
		v_current_revision_id,
		v_site_id,
		v_metadata,
		v_build_id,
		v_bundle_id
	FROM public.builder_drafts AS draft
	WHERE draft.id = p_draft_id
		AND draft.project_id = p_project_id
		AND draft.business_id = p_business_id
		AND draft.user_id = v_user_id
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Canonical draft identity is unavailable or unauthorized'
			USING ERRCODE = '42501';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM public.projects AS project
		WHERE project.id = p_project_id
			AND project.business_id = p_business_id
			AND public.is_project_member(v_user_id, project.id)
	) THEN
		RAISE EXCEPTION 'Canonical project identity is unavailable or unauthorized'
			USING ERRCODE = '42501';
	END IF;

	IF p_status = 'committed' AND v_current_revision_id IS DISTINCT FROM p_parent_revision_id THEN
		RAISE EXCEPTION 'Canonical revision conflict: draft pointer changed before commit'
			USING ERRCODE = '40001';
	END IF;

	IF p_status = 'committed' THEN
		IF jsonb_typeof(p_vfs_files) <> 'object'
			OR jsonb_typeof(p_site_bundle_snapshot->'vfsFiles') <> 'object'
			OR p_site_bundle_snapshot->'vfsFiles' IS DISTINCT FROM p_vfs_files THEN
			RAISE EXCEPTION 'Canonical VFS must exactly match SiteBundleSnapshot.vfsFiles'
				USING ERRCODE = '23514';
		END IF;

		IF COALESCE(p_site_bundle_snapshot->>'snapshotId', '') = '' THEN
			RAISE EXCEPTION 'Canonical SiteBundleSnapshot is missing snapshotId'
				USING ERRCODE = '23514';
		END IF;
	END IF;

	v_active_page_path := COALESCE(
		NULLIF(BTRIM(p_active_page_path), ''),
		NULLIF(BTRIM(v_metadata->>'activePagePath'), '')
	);
	IF p_status = 'committed' AND (
		v_active_page_path IS NULL OR NOT (p_vfs_files ? v_active_page_path)
	) THEN
		RAISE EXCEPTION 'Canonical active page is missing from SiteBundleSnapshot.vfsFiles'
			USING ERRCODE = '23514';
	END IF;

	INSERT INTO public.site_revisions (
		project_id,
		business_id,
		draft_id,
		parent_revision_id,
		source,
		status,
		patch_json,
		vfs_files,
		site_bundle_snapshot,
		runtime_manifest,
		playground_state,
		readiness_report,
		diagnostics,
		publish_ready,
		publish_blockers,
		backend_ops_applied,
		vfs_hash,
		created_by
	) VALUES (
		p_project_id,
		p_business_id,
		p_draft_id,
		p_parent_revision_id,
		p_source,
		p_status,
		COALESCE(p_patch_json, '{}'::jsonb),
		p_vfs_files,
		COALESCE(p_site_bundle_snapshot, '{}'::jsonb),
		COALESCE(p_runtime_manifest, '{}'::jsonb),
		COALESCE(p_playground_state, '{}'::jsonb),
		COALESCE(p_readiness_report, '{}'::jsonb),
		COALESCE(p_diagnostics, '[]'::jsonb),
		COALESCE(p_publish_ready, false),
		COALESCE(p_publish_blockers, '[]'::jsonb),
		COALESCE(p_backend_ops_applied, '[]'::jsonb),
		p_vfs_hash,
		v_user_id
	)
	RETURNING id INTO v_revision_id;

	IF p_status <> 'committed' THEN
		RETURN v_revision_id;
	END IF;

	UPDATE public.builder_drafts
	SET
		last_revision_id = v_revision_id,
		vfs_files = p_vfs_files,
		metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
			'activePagePath', v_active_page_path,
			'siteBundleSnapshot', p_site_bundle_snapshot,
			'runtimeManifest', COALESCE(p_runtime_manifest, '{}'::jsonb)
		),
		updated_at = now()
	WHERE id = p_draft_id;

	IF v_site_id IS NOT NULL AND v_build_id IS NOT NULL AND v_bundle_id IS NOT NULL THEN
		INSERT INTO public.site_bundles (
			id,
			site_id,
			build_id,
			revision_id,
			version,
			schema_version,
			bundle
		) VALUES (
			v_bundle_id,
			v_site_id,
			v_build_id,
			v_revision_id,
			'1.0.0',
			1,
			p_site_bundle_snapshot
		)
		ON CONFLICT (id) DO UPDATE
		SET
			build_id = EXCLUDED.build_id,
			revision_id = EXCLUDED.revision_id,
			bundle = EXCLUDED.bundle;

		UPDATE public.site_builds
		SET
			status = 'completed',
			current_stage = 'canonical-commit',
			finished_at = now()
		WHERE id = v_build_id
			AND site_id = v_site_id;

		UPDATE public.sites
		SET
			current_build_id = v_build_id,
			status = 'preview',
			updated_at = now()
		WHERE id = v_site_id
			AND business_id = p_business_id;

		UPDATE public.site_runtime_configs
		SET
			public_runtime_enabled = true,
			settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
				'projectId', p_project_id,
				'runtimeManifest', COALESCE(p_runtime_manifest, '{}'::jsonb)
			),
			updated_at = now()
		WHERE site_id = v_site_id;
	END IF;

	RETURN v_revision_id;
END;
$$;

REVOKE ALL ON FUNCTION public.commit_canonical_site_revision(
	uuid, uuid, uuid, uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb,
	jsonb, jsonb, boolean, jsonb, jsonb, text, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.commit_canonical_site_revision(
	uuid, uuid, uuid, uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb,
	jsonb, jsonb, boolean, jsonb, jsonb, text, text
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assert_canonical_draft_projection()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	v_revision public.site_revisions%ROWTYPE;
	v_active_page_path text;
BEGIN
	IF NEW.last_revision_id IS NULL THEN
		IF COALESCE(NEW.vfs_files, '{}'::jsonb) <> '{}'::jsonb
			OR COALESCE(NEW.metadata, '{}'::jsonb) ? 'siteBundleSnapshot'
			OR COALESCE(NEW.metadata, '{}'::jsonb) ? 'runtimeManifest'
			OR COALESCE(NULLIF(BTRIM(NEW.metadata->>'activePagePath'), ''), '') <> '' THEN
			RAISE EXCEPTION 'builder_drafts content requires a canonical committed revision'
				USING ERRCODE = '23514';
		END IF;
		RETURN NEW;
	END IF;

	SELECT revision.*
	INTO v_revision
	FROM public.site_revisions AS revision
	WHERE revision.id = NEW.last_revision_id
		AND revision.project_id = NEW.project_id
		AND revision.business_id = NEW.business_id
		AND revision.draft_id = NEW.id
		AND revision.status = 'committed';

	IF NOT FOUND THEN
		RAISE EXCEPTION 'builder_drafts.last_revision_id must reference its committed canonical revision'
			USING ERRCODE = '23514';
	END IF;

	IF COALESCE(NEW.vfs_files, '{}'::jsonb) IS DISTINCT FROM v_revision.vfs_files THEN
		RAISE EXCEPTION 'builder_drafts.vfs_files cannot diverge from its canonical revision'
			USING ERRCODE = '23514';
	END IF;

	IF NEW.metadata ? 'siteBundleSnapshot'
		AND NEW.metadata->'siteBundleSnapshot' IS DISTINCT FROM v_revision.site_bundle_snapshot THEN
		RAISE EXCEPTION 'builder_drafts snapshot cannot diverge from its canonical revision'
			USING ERRCODE = '23514';
	END IF;

	IF NEW.metadata ? 'runtimeManifest'
		AND NEW.metadata->'runtimeManifest' IS DISTINCT FROM v_revision.runtime_manifest THEN
		RAISE EXCEPTION 'builder_drafts runtime manifest cannot diverge from its canonical revision'
			USING ERRCODE = '23514';
	END IF;

	v_active_page_path := NULLIF(BTRIM(NEW.metadata->>'activePagePath'), '');
	IF v_active_page_path IS NULL OR NOT (v_revision.vfs_files ? v_active_page_path) THEN
		RAISE EXCEPTION 'builder_drafts active page must exist in its canonical revision'
			USING ERRCODE = '23514';
	END IF;

	RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_canonical_draft_projection() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS builder_drafts_assert_canonical_projection ON public.builder_drafts;
CREATE TRIGGER builder_drafts_assert_canonical_projection
	BEFORE INSERT OR UPDATE OF last_revision_id, vfs_files, metadata, project_id, business_id
	ON public.builder_drafts
	FOR EACH ROW
	EXECUTE FUNCTION public.assert_canonical_draft_projection();

CREATE OR REPLACE FUNCTION public.assert_canonical_site_bundle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
	IF NEW.revision_id IS NULL THEN
		RAISE EXCEPTION 'site_bundles writes require a canonical committed revision'
			USING ERRCODE = '23514';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM public.site_revisions AS revision
		JOIN public.projects AS project ON project.id = revision.project_id
		WHERE revision.id = NEW.revision_id
			AND revision.status = 'committed'
			AND revision.site_bundle_snapshot = NEW.bundle
			AND project.site_id = NEW.site_id
	) THEN
		RAISE EXCEPTION 'site_bundles.bundle must equal its canonical committed revision snapshot'
			USING ERRCODE = '23514';
	END IF;

	RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_canonical_site_bundle() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS site_bundles_assert_canonical_revision ON public.site_bundles;
CREATE TRIGGER site_bundles_assert_canonical_revision
	BEFORE INSERT OR UPDATE OF revision_id, bundle, site_id
	ON public.site_bundles
	FOR EACH ROW
	EXECUTE FUNCTION public.assert_canonical_site_bundle();