-- ============================================================================
-- CLEANUP LEGACY ORPHAN PROJECT SHELLS
-- ----------------------------------------------------------------------------
-- Problem:
-- Older flows created owner-only draft project rows before the workspace model
-- fully required business_id. Those rows can linger after a business is gone
-- and appear as stale "draft projects" in legacy surfaces.
--
-- Scope:
-- Delete only the safest orphan shells:
-- - no business_id
-- - still draft/unpublished
-- - no description/template/custom domain
-- - no linked builder_draft
-- - no uploaded project assets
--
-- This intentionally avoids deleting any project row that still has draft
-- content attached, because those are now cleaned up at business-delete time
-- in the application layer.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'builder_drafts'
      AND column_name = 'project_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'business_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'status'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'publish_status'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'custom_domain'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'published_at'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'description'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'template_type'
  ) THEN
    DELETE FROM public.projects p
    WHERE p.business_id IS NULL
      AND COALESCE(p.status, 'draft') = 'draft'
      AND COALESCE(p.publish_status, 'draft') = 'draft'
      AND p.custom_domain IS NULL
      AND p.published_at IS NULL
      AND COALESCE(NULLIF(BTRIM(p.description), ''), NULL) IS NULL
      AND p.template_type IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.builder_drafts d
        WHERE d.project_id = p.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.project_assets a
        WHERE a.project_id = p.id
      );
  END IF;
END $$;
