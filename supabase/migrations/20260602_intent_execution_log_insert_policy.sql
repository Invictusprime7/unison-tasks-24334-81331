-- Fix: ensure intent_execution_log has an INSERT policy for authenticated users.
-- The original migration defined this policy but it was not applied to the live DB.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'intent_execution_log'
      AND policyname = 'intent_execution_log_insert_public'
  ) THEN
    CREATE POLICY "intent_execution_log_insert_public"
      ON public.intent_execution_log
      FOR INSERT
      WITH CHECK (business_id IS NOT NULL);
  END IF;
END
$$;
