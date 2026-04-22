
-- ============================================================================
-- 1. site_intent_bindings — Persists element-level intent wiring per project
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.site_intent_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  element_key TEXT NOT NULL,
  element_label TEXT,
  intent TEXT NOT NULL,
  intent_confidence NUMERIC NOT NULL DEFAULT 1.0,
  workflow_id UUID,
  recipe_ids TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  payload_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, page_path, element_key)
);

ALTER TABLE public.site_intent_bindings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_intent_bindings' AND policyname='site_intent_bindings_select_member') THEN
    CREATE POLICY "site_intent_bindings_select_member" ON public.site_intent_bindings FOR SELECT USING (is_business_member(business_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_intent_bindings' AND policyname='site_intent_bindings_insert_member') THEN
    CREATE POLICY "site_intent_bindings_insert_member" ON public.site_intent_bindings FOR INSERT WITH CHECK (is_business_member(business_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_intent_bindings' AND policyname='site_intent_bindings_update_member') THEN
    CREATE POLICY "site_intent_bindings_update_member" ON public.site_intent_bindings FOR UPDATE USING (is_business_member(business_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_intent_bindings' AND policyname='site_intent_bindings_delete_member') THEN
    CREATE POLICY "site_intent_bindings_delete_member" ON public.site_intent_bindings FOR DELETE USING (is_business_member(business_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_site_intent_bindings_project ON public.site_intent_bindings(project_id);
CREATE INDEX IF NOT EXISTS idx_site_intent_bindings_intent ON public.site_intent_bindings(intent);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_site_intent_bindings_updated_at') THEN
    CREATE TRIGGER update_site_intent_bindings_updated_at
      BEFORE UPDATE ON public.site_intent_bindings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
  END IF;
END $$;

-- ============================================================================
-- 2. intent_execution_log — Records every intent execution for analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.intent_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  project_id TEXT,
  binding_id UUID,
  intent TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'direct',
  source_url TEXT,
  result_status TEXT NOT NULL DEFAULT 'success',
  result_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  workflows_triggered TEXT[] NOT NULL DEFAULT '{}',
  recipes_triggered TEXT[] NOT NULL DEFAULT '{}',
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intent_execution_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='intent_execution_log' AND policyname='intent_execution_log_select_member') THEN
    CREATE POLICY "intent_execution_log_select_member" ON public.intent_execution_log FOR SELECT USING (is_business_member(business_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='intent_execution_log' AND policyname='intent_execution_log_insert_public') THEN
    CREATE POLICY "intent_execution_log_insert_public" ON public.intent_execution_log FOR INSERT WITH CHECK (business_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_intent_execution_log_business ON public.intent_execution_log(business_id);
CREATE INDEX IF NOT EXISTS idx_intent_execution_log_intent ON public.intent_execution_log(intent);
CREATE INDEX IF NOT EXISTS idx_intent_execution_log_created ON public.intent_execution_log(created_at DESC);
