-- Atomic content commands back the enterprise CMS gateway. Browser roles have
-- no execute grant; cms-records calls this only after its own tenant and
-- capability checks have completed.

CREATE OR REPLACE FUNCTION public.cms_apply_content_entry_command(
  p_action text,
  p_business_id uuid,
  p_actor_id uuid,
  p_entry_id uuid DEFAULT NULL,
  p_content_type_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL,
  p_locale text DEFAULT 'en',
  p_slug text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_target_status text DEFAULT NULL,
  p_change_summary text DEFAULT NULL
)
RETURNS public.content_entries
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  entry_row public.content_entries%ROWTYPE;
  revision_id uuid;
  revision_number integer;
  event_type text;
  previous_status text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Content command requires an authenticated actor';
  END IF;
  IF p_action NOT IN ('create', 'update', 'transition') THEN
    RAISE EXCEPTION 'Unsupported content command';
  END IF;
  IF p_locale IS NULL OR char_length(p_locale) NOT BETWEEN 2 AND 35 THEN
    RAISE EXCEPTION 'Content locale is invalid';
  END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Content data must be an object';
  END IF;

  IF p_action = 'create' THEN
    IF p_content_type_id IS NULL OR coalesce(btrim(p_title), '') = '' THEN
      RAISE EXCEPTION 'Content creation requires a type and title';
    END IF;
    INSERT INTO public.content_entries (
      business_id, content_type_id, site_id, locale, slug, title, data,
      created_by, updated_by
    ) VALUES (
      p_business_id, p_content_type_id, p_site_id, p_locale, p_slug,
      btrim(p_title), p_data, p_actor_id, p_actor_id
    ) RETURNING * INTO entry_row;
  ELSE
    IF p_entry_id IS NULL THEN
      RAISE EXCEPTION 'Content command requires an entry id';
    END IF;
    SELECT * INTO entry_row
    FROM public.content_entries
    WHERE id = p_entry_id AND business_id = p_business_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Content entry was not found in this business';
    END IF;

    IF p_action = 'update' THEN
      IF coalesce(btrim(p_title), '') = '' THEN
        RAISE EXCEPTION 'Content update requires a title';
      END IF;
      UPDATE public.content_entries
      SET site_id = p_site_id,
          locale = p_locale,
          slug = p_slug,
          title = btrim(p_title),
          data = p_data,
          updated_by = p_actor_id
      WHERE id = entry_row.id
      RETURNING * INTO entry_row;
    ELSE
      previous_status := entry_row.status;
      IF p_target_status NOT IN ('draft', 'review', 'published', 'archived') THEN
        RAISE EXCEPTION 'Content status is invalid';
      END IF;
      IF NOT (
        (entry_row.status = 'draft' AND p_target_status = 'review') OR
        (entry_row.status = 'review' AND p_target_status IN ('draft', 'published')) OR
        (entry_row.status = 'published' AND p_target_status IN ('draft', 'archived')) OR
        (entry_row.status = 'archived' AND p_target_status = 'draft')
      ) THEN
        RAISE EXCEPTION 'Content workflow transition from % to % is not allowed', entry_row.status, p_target_status;
      END IF;
      event_type := CASE
        WHEN p_target_status = 'review' THEN 'submitted'
        WHEN p_target_status = 'published' THEN 'published'
        WHEN p_target_status = 'archived' THEN 'archived'
        ELSE 'unpublished'
      END;
      UPDATE public.content_entries
      SET status = p_target_status,
          published_at = CASE WHEN p_target_status = 'published' THEN now() ELSE published_at END,
          archived_at = CASE WHEN p_target_status = 'archived' THEN now() ELSE archived_at END,
          updated_by = p_actor_id
      WHERE id = entry_row.id
      RETURNING * INTO entry_row;
    END IF;
  END IF;

  SELECT coalesce(max(revision.revision_number), 0) + 1
  INTO revision_number
  FROM public.content_entry_revisions revision
  WHERE revision.entry_id = entry_row.id;

  INSERT INTO public.content_entry_revisions (
    entry_id, business_id, revision_number, snapshot, change_summary, created_by
  ) VALUES (
    entry_row.id, p_business_id, revision_number, to_jsonb(entry_row), p_change_summary, p_actor_id
  ) RETURNING id INTO revision_id;

  IF event_type = 'published' AND previous_status = 'review' THEN
    INSERT INTO public.content_publish_events (
      business_id, entry_id, revision_id, event_type, actor_id, metadata
    ) VALUES (
      p_business_id, entry_row.id, revision_id, 'approved', p_actor_id,
      jsonb_build_object('fromStatus', previous_status, 'toStatus', entry_row.status)
    );
  END IF;

  IF event_type IS NOT NULL THEN
    INSERT INTO public.content_publish_events (
      business_id, entry_id, revision_id, event_type, actor_id, metadata
    ) VALUES (
      p_business_id, entry_row.id, revision_id, event_type, p_actor_id,
      jsonb_build_object('fromStatus', previous_status, 'toStatus', entry_row.status)
    );
  END IF;

  RETURN entry_row;
END;
$$;

REVOKE ALL ON FUNCTION public.cms_apply_content_entry_command(
  text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cms_apply_content_entry_command(
  text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text, text
) TO service_role;

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
    WHEN 'content.read' THEN public.is_business_member(p_business_id)
    WHEN 'artifact.write' THEN public.is_business_editor(p_business_id)
    WHEN 'catalog.write' THEN public.is_business_editor(p_business_id)
    WHEN 'project.write' THEN public.is_business_editor(p_business_id)
    WHEN 'booking.manage' THEN public.is_business_editor(p_business_id)
    WHEN 'content.write' THEN public.is_business_editor(p_business_id)
    WHEN 'artifact.delete' THEN public.is_business_admin(p_business_id)
    WHEN 'catalog.delete' THEN public.is_business_admin(p_business_id)
    WHEN 'business.profile.write' THEN public.is_business_admin(p_business_id)
    WHEN 'team.manage' THEN public.is_business_admin(p_business_id)
    WHEN 'site.publish' THEN public.is_business_admin(p_business_id)
    WHEN 'content.publish' THEN public.is_business_admin(p_business_id)
    WHEN 'backend.connect' THEN public.is_business_admin(p_business_id)
    ELSE false
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.business_has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_has_permission(uuid, text) TO authenticated;