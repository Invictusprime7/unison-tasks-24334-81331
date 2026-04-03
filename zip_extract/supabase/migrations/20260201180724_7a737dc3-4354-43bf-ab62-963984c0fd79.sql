-- ============================================================
-- AI AGENT INFRASTRUCTURE: Complete Foundation + Polish
-- ============================================================

-- 1) Create ENUMs (idempotent)
DO $$ BEGIN
  CREATE TYPE public.agent_event_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) ai_agent_registry: Global agent definitions
CREATE TABLE IF NOT EXISTS public.ai_agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  tier public.agent_tier NOT NULL DEFAULT 'free',
  system_prompt TEXT NOT NULL,
  allowed_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_slug ON public.ai_agent_registry(slug);
CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_tier ON public.ai_agent_registry(tier);

-- 3) ai_plugin_instances: Per-business agent installations
CREATE TABLE IF NOT EXISTS public.ai_plugin_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agent_registry(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  placement_key TEXT NOT NULL DEFAULT 'default',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_business_project_placement_agent UNIQUE (business_id, project_id, placement_key, agent_id)
);

COMMENT ON COLUMN public.ai_plugin_instances.config IS 
'JSONB config with standard structure: { "settings": {...}, "bindings": {...}, "capabilities": {...} }';

CREATE INDEX IF NOT EXISTS idx_ai_plugin_instances_business ON public.ai_plugin_instances(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_plugin_instances_agent ON public.ai_plugin_instances(agent_id);

-- Config must be object constraint (idempotent)
DO $$ BEGIN
  ALTER TABLE public.ai_plugin_instances
    ADD CONSTRAINT config_is_object CHECK (jsonb_typeof(config) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) ai_plugin_state: Real-time state store
CREATE TABLE IF NOT EXISTS public.ai_plugin_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_instance_id UUID NOT NULL REFERENCES public.ai_plugin_instances(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL DEFAULT 'default',
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_instance_state_key UNIQUE (plugin_instance_id, state_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_plugin_state_instance ON public.ai_plugin_state(plugin_instance_id);

-- 5) ai_events: Idempotent event queue
CREATE TABLE IF NOT EXISTS public.ai_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plugin_instance_id UUID REFERENCES public.ai_plugin_instances(id) ON DELETE SET NULL,
  intent TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT,
  status public.agent_event_status NOT NULL DEFAULT 'pending',
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  claimed_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_events_pending ON public.ai_events(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ai_events_business ON public.ai_events(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_dedupe ON public.ai_events(business_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_events_lock ON public.ai_events(status, locked_at) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_ai_events_claimed_run ON public.ai_events(claimed_run_id);

-- Intent validation (idempotent)
DO $$ BEGIN
  ALTER TABLE public.ai_events
    ADD CONSTRAINT ai_events_intent_nonempty CHECK (length(trim(intent)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6) ai_runs: Audit trail of agent executions
CREATE TABLE IF NOT EXISTS public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.ai_events(id) ON DELETE SET NULL,
  plugin_instance_id UUID REFERENCES public.ai_plugin_instances(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status public.agent_event_status NOT NULL DEFAULT 'pending',
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  tokens_used INTEGER,
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_event ON public.ai_runs(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_instance ON public.ai_runs(plugin_instance_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_business ON public.ai_runs(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_status ON public.ai_runs(status) WHERE status IN ('pending', 'processing');

-- Add FK for claimed_run_id now that ai_runs exists
DO $$ BEGIN
  ALTER TABLE public.ai_events
    ADD CONSTRAINT ai_events_claimed_run_fk 
    FOREIGN KEY (claimed_run_id) REFERENCES public.ai_runs(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7) RLS Policies
ALTER TABLE public.ai_agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_plugin_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_plugin_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;

-- Registry: public read
DO $$ BEGIN
  CREATE POLICY "ai_agent_registry_select_public" ON public.ai_agent_registry
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Plugin instances: member access
DO $$ BEGIN
  CREATE POLICY "ai_plugin_instances_select_member" ON public.ai_plugin_instances
    FOR SELECT USING (public.is_business_member(business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_plugin_instances_insert_member" ON public.ai_plugin_instances
    FOR INSERT WITH CHECK (public.is_business_member(business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_plugin_instances_update_member" ON public.ai_plugin_instances
    FOR UPDATE USING (public.is_business_member(business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_plugin_instances_delete_member" ON public.ai_plugin_instances
    FOR DELETE USING (public.is_business_member(business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Plugin state: member read, service_role write
DO $$ BEGIN
  CREATE POLICY "ai_plugin_state_select_member" ON public.ai_plugin_state
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.ai_plugin_instances pi
        WHERE pi.id = plugin_instance_id
        AND public.is_business_member(pi.business_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_plugin_state_modify_service" ON public.ai_plugin_state
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Events: service_role insert, member read
DO $$ BEGIN
  CREATE POLICY "ai_events_insert_service" ON public.ai_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_events_select_member" ON public.ai_events
    FOR SELECT USING (public.is_business_member(business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_events_update_service" ON public.ai_events
    FOR UPDATE USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Runs: member read, service_role write
DO $$ BEGIN
  CREATE POLICY "ai_runs_select_member" ON public.ai_runs
    FOR SELECT USING (public.is_business_member(business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_runs_modify_service" ON public.ai_runs
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8) Updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS ai_agent_registry_updated_at ON public.ai_agent_registry;
CREATE TRIGGER ai_agent_registry_updated_at
  BEFORE UPDATE ON public.ai_agent_registry
  FOR EACH ROW EXECUTE FUNCTION public.handle_ai_updated_at();

DROP TRIGGER IF EXISTS ai_plugin_instances_updated_at ON public.ai_plugin_instances;
CREATE TRIGGER ai_plugin_instances_updated_at
  BEFORE UPDATE ON public.ai_plugin_instances
  FOR EACH ROW EXECUTE FUNCTION public.handle_ai_updated_at();

DROP TRIGGER IF EXISTS ai_plugin_state_updated_at ON public.ai_plugin_state;
CREATE TRIGGER ai_plugin_state_updated_at
  BEFORE UPDATE ON public.ai_plugin_state
  FOR EACH ROW EXECUTE FUNCTION public.handle_ai_updated_at();

-- 9) Enable Realtime for plugin state
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_plugin_state;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
  WHEN object_in_use THEN NULL;
END $$;

-- 10) Seed lead_qualifier agent (upsert)
INSERT INTO public.ai_agent_registry (slug, name, description, tier, system_prompt, allowed_tools, default_config)
VALUES (
  'lead_qualifier',
  'Lead Qualification Agent',
  'Analyzes incoming form submissions and scores leads automatically',
  'free',
  'You are a lead qualification agent. Analyze incoming form submissions and score leads.

ALWAYS respond with valid JSON:
{
  "score": 0-100,
  "tags": ["tag1", "tag2"],
  "stage": "new" | "qualified" | "hot_lead" | "needs_followup" | "not_qualified",
  "notes": "Brief explanation",
  "proposedToolCalls": [
    {
      "tool": "crm.lead.create",
      "payload": { "name": "...", "email": "...", "score": 85 }
    }
  ]
}

Tool IDs use namespace.resource.action format:
- crm.lead.create - Create a new CRM lead
- notify.team - Send notification to business owner
- pipeline.stage.set - Update pipeline stage

proposedToolCalls may be empty [] if no action is appropriate (spam, missing data, etc.).',
  '["crm.lead.create", "notify.team", "pipeline.stage.set"]'::jsonb,
  '{"settings": {"min_score_for_notification": 70}, "bindings": {}, "capabilities": {}}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  allowed_tools = EXCLUDED.allowed_tools,
  default_config = EXCLUDED.default_config,
  updated_at = now();