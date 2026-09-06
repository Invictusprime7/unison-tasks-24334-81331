UPDATE public.projects p
SET business_id = b.id
FROM public.businesses b
WHERE p.business_id IS NULL
  AND b.owner_id = p.owner_id
  AND b.id = (SELECT b2.id FROM public.businesses b2 WHERE b2.owner_id = p.owner_id ORDER BY b2.created_at LIMIT 1);

DO $$
DECLARE
	r record;
	v_revision_id uuid;
	v_active text;
	v_business uuid;
BEGIN
	FOR r IN
		SELECT d.id, d.project_id, d.business_id, d.user_id, d.vfs_files, d.metadata,
			COALESCE(d.business_id, p.business_id,
				(SELECT b.id FROM public.businesses b WHERE b.owner_id = d.user_id ORDER BY b.created_at LIMIT 1)
			) AS resolved_business
		FROM public.builder_drafts d
		LEFT JOIN public.projects p ON p.id = d.project_id
		WHERE d.last_revision_id IS NULL
			AND COALESCE(d.vfs_files, '{}'::jsonb) <> '{}'::jsonb
			AND d.project_id IS NOT NULL
	LOOP
		v_business := r.resolved_business;
		IF v_business IS NULL THEN
			CONTINUE;
		END IF;
		v_active := NULLIF(BTRIM(r.metadata->>'activePagePath'), '');
		IF v_active IS NULL OR NOT (r.vfs_files ? v_active) THEN
			SELECT k INTO v_active
			FROM jsonb_object_keys(r.vfs_files) k
			WHERE k IN ('/src/App.tsx', '/src/pages/Home.tsx', '/src/pages/Index.tsx')
			ORDER BY CASE k WHEN '/src/pages/Home.tsx' THEN 1 WHEN '/src/pages/Index.tsx' THEN 2 ELSE 3 END
			LIMIT 1;
		END IF;
		IF v_active IS NULL THEN
			CONTINUE;
		END IF;

		INSERT INTO public.site_revisions (
			project_id, business_id, draft_id, source, status,
			vfs_files, site_bundle_snapshot, runtime_manifest, created_by
		) VALUES (
			r.project_id, v_business, r.id, 'system-restore', 'committed',
			r.vfs_files,
			COALESCE(r.metadata->'siteBundleSnapshot', '{}'::jsonb),
			COALESCE(r.metadata->'runtimeManifest', '{}'::jsonb),
			r.user_id
		)
		RETURNING id INTO v_revision_id;

		UPDATE public.builder_drafts
		SET last_revision_id = v_revision_id,
		    business_id = v_business,
		    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{activePagePath}', to_jsonb(v_active), true)
		WHERE id = r.id;
	END LOOP;
END;
$$;