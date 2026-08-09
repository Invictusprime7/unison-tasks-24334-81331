-- Browser writes may persist Wizard selections, but tenant attachment and
-- lifecycle/provisioning fields are exclusively server-owned.

DROP POLICY IF EXISTS "onboarding_sessions_insert_own_draft" ON public.onboarding_sessions;
CREATE POLICY "onboarding_sessions_insert_own_draft"
  ON public.onboarding_sessions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'draft'
    AND business_id IS NULL
    AND project_id IS NULL
    AND provisioning_progress = '{}'::jsonb
    AND last_error IS NULL
  );

CREATE OR REPLACE FUNCTION public.reject_untrusted_onboarding_session_transitions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' AND (
      NEW.business_id IS NOT NULL
      OR NEW.project_id IS NOT NULL
      OR NEW.provisioning_progress <> '{}'::jsonb
      OR NEW.last_error IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Only the server may attach an onboarding session to a tenant or provisioning state';
    END IF;

    IF TG_OP = 'UPDATE' AND (
      NEW.business_id IS DISTINCT FROM OLD.business_id
      OR NEW.project_id IS DISTINCT FROM OLD.project_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.provisioning_progress IS DISTINCT FROM OLD.provisioning_progress
      OR NEW.last_error IS DISTINCT FROM OLD.last_error
    ) THEN
      RAISE EXCEPTION 'Only the server may change onboarding tenant or lifecycle fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_untrusted_onboarding_session_transitions() FROM PUBLIC;

DROP TRIGGER IF EXISTS reject_untrusted_onboarding_session_transitions ON public.onboarding_sessions;
CREATE TRIGGER reject_untrusted_onboarding_session_transitions
  BEFORE INSERT OR UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.reject_untrusted_onboarding_session_transitions();