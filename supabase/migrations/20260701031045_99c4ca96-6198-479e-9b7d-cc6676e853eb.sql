
CREATE INDEX IF NOT EXISTS idx_builder_drafts_user_updated
  ON public.builder_drafts (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_design_templates_user_updated
  ON public.design_templates (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_learning_sessions_user_success_created
  ON public.ai_learning_sessions (user_id, was_successful, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_learning_sessions_user_created
  ON public.ai_learning_sessions (user_id, created_at DESC);

ANALYZE public.builder_drafts;
ANALYZE public.design_templates;
ANALYZE public.ai_learning_sessions;
