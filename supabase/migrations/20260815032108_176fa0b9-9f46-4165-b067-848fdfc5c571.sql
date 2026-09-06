DO $$
DECLARE
	r record;
	v_revision_id uuid;
	v_active text;
BEGIN
	FOR r IN
		SELECT id, project_id, business_id, user_id, vfs_files, metadata
		FROM public.builder_drafts
		WHERE last_revision_id IS NULL
			AND COALESCE(vfs_files, '{}'::jsonb) <> '{}'::jsonb
			AND project_id IS NOT NULL
			AND business_id IS NOT NULL
	LOOP
		v_active := NULLIF(BTRIM(r.metadata->>'activePagePath'), '');
		IF v_active IS NULL OR NOT (r.vfs_files ? v_active) THEN
			CONTINUE;
		END IF;

		INSERT INTO public.site_revisions (
			project_id, business_id, draft_id, source, status,
			vfs_files, site_bundle_snapshot, runtime_manifest,
			created_by
		) VALUES (
			r.project_id, r.business_id, r.id, 'system-restore', 'committed',
			r.vfs_files,
			COALESCE(r.metadata->'siteBundleSnapshot', '{}'::jsonb),
			COALESCE(r.metadata->'runtimeManifest', '{}'::jsonb),
			r.user_id
		)
		RETURNING id INTO v_revision_id;

		UPDATE public.builder_drafts
		SET last_revision_id = v_revision_id
		WHERE id = r.id;
	END LOOP;
END;
$$;