-- =============================================================================
-- AUTOMATION RECIPES ENGINE
-- Industry + Intent mapped workflows with full event-driven execution
-- =============================================================================

-- ============================================================================
-- CORE: Automation Workflows (Enhanced "Recipes")
-- ============================================================================

-- Extend crm_workflows to support industry-based recipe system
ALTER TABLE public.crm_workflows 
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS recipe_id TEXT,
  ADD COLUMN IF NOT EXISTS recipe_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_recipe BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS category TEXT, -- 'lead_followup', 'booking_reminder', 'missed_call_textback', etc.
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50, -- execution priority (lower = higher priority)
  ADD COLUMN IF NOT EXISTS max_enrollments_per_contact INTEGER DEFAULT 1, -- how many times contact can enroll
  ADD COLUMN IF NOT EXISTS reenroll_after_days INTEGER, -- null = never reenroll
  ADD COLUMN IF NOT EXISTS suppression_tags TEXT[] DEFAULT '{}', -- tags that block enrollment
  ADD COLUMN IF NOT EXISTS suppression_stages TEXT[] DEFAULT '{}'; -- pipeline stages that block enrollment

-- Add index for industry-based lookups
CREATE INDEX IF NOT EXISTS idx_crm_workflows_industry ON public.crm_workflows(industry);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_business ON public.crm_workflows(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_recipe ON public.crm_workflows(recipe_id);

-- ============================================================================
-- AUTOMATION NODES (DAG-based workflow steps)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('trigger', 'action', 'condition', 'wait', 'goal')),
  action_type TEXT, -- 'send_email', 'send_sms', 'create_task', 'move_stage', etc.
  label TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  execution_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_nodes_workflow ON public.automation_nodes(workflow_id);

-- ============================================================================
-- AUTOMATION EDGES (DAG connections with branching)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES public.automation_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES public.automation_nodes(id) ON DELETE CASCADE,
  condition_key TEXT, -- for branching: 'yes', 'no', 'email_opened', 'link_clicked', etc.
  condition_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_node_id, to_node_id, condition_key)
);

CREATE INDEX IF NOT EXISTS idx_automation_edges_workflow ON public.automation_edges(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_edges_from_node ON public.automation_edges(from_node_id);

-- ============================================================================
-- AUTOMATION EVENTS (Event ingestion with deduplication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  intent TEXT NOT NULL, -- 'booking.create', 'lead.capture', 'contact.submit', etc.
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT, -- for preventing duplicate event processing
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  source TEXT, -- 'template', 'api', 'manual', 'webhook'
  source_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  processed BOOLEAN DEFAULT false,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dedupe index
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_events_dedupe 
  ON public.automation_events(business_id, dedupe_key) 
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automation_events_intent ON public.automation_events(business_id, intent);
CREATE INDEX IF NOT EXISTS idx_automation_events_unprocessed ON public.automation_events(processed) WHERE processed = false;

-- ============================================================================
-- AUTOMATION RUNS (Workflow execution instances)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.automation_events(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  current_node_id UUID REFERENCES public.automation_nodes(id) ON DELETE SET NULL,
  context JSONB DEFAULT '{}'::jsonb, -- accumulated data during run
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  paused_until TIMESTAMPTZ, -- for wait steps
  steps_completed INTEGER DEFAULT 0,
  max_steps INTEGER DEFAULT 100, -- loop prevention
  idempotency_key TEXT, -- prevent duplicate runs for same event+workflow
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_runs_idempotency 
  ON public.automation_runs(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automation_runs_workflow ON public.automation_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON public.automation_runs(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_contact ON public.automation_runs(contact_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_paused ON public.automation_runs(paused_until) WHERE status = 'paused';

-- ============================================================================
-- AUTOMATION JOBS (Delayed execution queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES public.automation_nodes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  execute_at TIMESTAMPTZ DEFAULT now(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_jobs_run ON public.automation_jobs(run_id);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_due ON public.automation_jobs(execute_at, status) WHERE status = 'queued';

-- ============================================================================
-- AUTOMATION LOGS (Observability)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  node_id UUID REFERENCES public.automation_nodes(id) ON DELETE SET NULL,
  level TEXT DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_run ON public.automation_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_level ON public.automation_logs(level) WHERE level IN ('warn', 'error');

-- ============================================================================
-- BUSINESS PROFILE SETTINGS (Workflow guardrails)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.business_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Business Hours
  business_hours_enabled BOOLEAN DEFAULT false,
  business_hours_start TIME DEFAULT '09:00',
  business_hours_end TIME DEFAULT '17:00',
  business_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=Sun, 1=Mon, etc.
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Quiet Hours (no SMS/calls)
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '08:00',
  
  -- Rate Limiting
  max_messages_per_contact_per_day INTEGER DEFAULT 5,
  dedupe_window_minutes INTEGER DEFAULT 60, -- don't re-trigger same workflow within X minutes
  
  -- Sender Identity Defaults
  default_sender_name TEXT,
  default_sender_email TEXT,
  default_sender_phone TEXT,
  
  -- Compliance
  require_consent_for_sms BOOLEAN DEFAULT true,
  require_consent_for_email BOOLEAN DEFAULT false,
  honor_stop_keywords BOOLEAN DEFAULT true,
  
  -- Global Toggles
  automations_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RECIPE PACKS (Industry-specific automation bundles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_recipe_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT UNIQUE NOT NULL, -- 'salon_pack', 'contractor_pack', 'restaurant_pack'
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT NOT NULL,
  icon TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business')),
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  recipes JSONB DEFAULT '[]'::jsonb, -- array of recipe definitions
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_packs_industry ON public.automation_recipe_packs(industry);

-- ============================================================================
-- INSTALLED RECIPE PACKS (Per-business)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.installed_recipe_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL REFERENCES public.automation_recipe_packs(pack_id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, pack_id)
);

-- ============================================================================
-- RECIPE TOGGLES (Per-business recipe enable/disable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.business_recipe_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL, -- matches crm_workflows.recipe_id
  enabled BOOLEAN DEFAULT true,
  custom_config JSONB DEFAULT '{}'::jsonb, -- business-specific overrides
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, recipe_id)
);

-- ============================================================================
-- CONTACT ENROLLMENT TRACKING (Re-enrollment logic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  enrollment_count INTEGER DEFAULT 1,
  first_enrolled_at TIMESTAMPTZ DEFAULT now(),
  last_enrolled_at TIMESTAMPTZ DEFAULT now(),
  last_completed_at TIMESTAMPTZ,
  blocked_until TIMESTAMPTZ, -- for re-enrollment cooldown
  UNIQUE(contact_id, workflow_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_enrollments_contact ON public.automation_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_workflow ON public.automation_enrollments(workflow_id);

-- ============================================================================
-- INTENT TO RECIPE MAPPING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.intent_recipe_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent TEXT NOT NULL, -- 'booking.create', 'lead.capture', etc.
  industry TEXT NOT NULL, -- 'restaurant', 'salon', 'contractor', etc.
  recipe_ids TEXT[] NOT NULL DEFAULT '{}', -- workflows to trigger
  priority INTEGER DEFAULT 50,
  conditions JSONB DEFAULT '{}'::jsonb, -- additional conditions for triggering
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(intent, industry)
);

CREATE INDEX IF NOT EXISTS idx_intent_recipe_industry ON public.intent_recipe_mappings(intent, industry);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.automation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_recipe_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installed_recipe_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_recipe_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intent_recipe_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Backend-only for core tables, user access for settings
CREATE POLICY "automation_nodes_backend_only" ON public.automation_nodes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.crm_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid())
);

CREATE POLICY "automation_edges_backend_only" ON public.automation_edges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.crm_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid())
);

CREATE POLICY "automation_events_insert_anon" ON public.automation_events FOR INSERT WITH CHECK (true);
CREATE POLICY "automation_events_select_owner" ON public.automation_events FOR SELECT USING (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);

CREATE POLICY "automation_runs_select_owner" ON public.automation_runs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.crm_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid())
);

CREATE POLICY "automation_jobs_select_owner" ON public.automation_jobs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.automation_runs r 
    JOIN public.crm_workflows w ON r.workflow_id = w.id 
    WHERE r.id = run_id AND w.user_id = auth.uid()
  )
);

CREATE POLICY "automation_logs_select_owner" ON public.automation_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.automation_runs r 
    JOIN public.crm_workflows w ON r.workflow_id = w.id 
    WHERE r.id = run_id AND w.user_id = auth.uid()
  )
);

CREATE POLICY "business_automation_settings_owner" ON public.business_automation_settings FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);

CREATE POLICY "recipe_packs_public_read" ON public.automation_recipe_packs FOR SELECT USING (is_published = true);

CREATE POLICY "installed_recipe_packs_owner" ON public.installed_recipe_packs FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);

CREATE POLICY "business_recipe_toggles_owner" ON public.business_recipe_toggles FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);

CREATE POLICY "automation_enrollments_backend_only" ON public.automation_enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.crm_contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
);

CREATE POLICY "intent_recipe_mappings_public_read" ON public.intent_recipe_mappings FOR SELECT USING (true);

-- ============================================================================
-- SEED: Default Recipe Packs
-- ============================================================================

INSERT INTO public.automation_recipe_packs (pack_id, name, description, industry, icon, tier, is_published, recipes) VALUES
-- Salon Pack
('salon_basic', 'Salon Essentials', 'Core automations for salons and spas', 'salon', '💇', 'free', true, '[
  {"id": "booking_confirmation", "name": "Booking Confirmation", "trigger": "booking.create", "description": "Send confirmation when appointment is booked"},
  {"id": "appointment_reminder_24h", "name": "24hr Reminder", "trigger": "booking.create", "delay": "P1D", "description": "Reminder 24 hours before appointment"},
  {"id": "followup_review_request", "name": "Review Request", "trigger": "booking.completed", "delay": "P1D", "description": "Ask for review after appointment"}
]'::jsonb),

-- Contractor Pack  
('contractor_basic', 'Contractor Essentials', 'Core automations for contractors and trades', 'contractor', '🔧', 'free', true, '[
  {"id": "quote_request_followup", "name": "Quote Follow-up", "trigger": "quote.request", "description": "Follow up on quote requests"},
  {"id": "lead_nurture_sequence", "name": "Lead Nurture", "trigger": "lead.capture", "description": "Multi-step lead nurturing"},
  {"id": "job_completion_review", "name": "Job Completion Review", "trigger": "job.completed", "description": "Request review after job completion"}
]'::jsonb),

-- Restaurant Pack
('restaurant_basic', 'Restaurant Essentials', 'Core automations for restaurants and dining', 'restaurant', '🍽️', 'free', true, '[
  {"id": "reservation_confirmation", "name": "Reservation Confirmation", "trigger": "booking.create", "description": "Confirm reservation via SMS"},
  {"id": "reservation_reminder", "name": "Reservation Reminder", "trigger": "booking.create", "delay": "PT2H", "description": "Reminder 2 hours before reservation"},
  {"id": "no_show_followup", "name": "No-Show Follow-up", "trigger": "reservation.noshow", "description": "Re-engage no-show guests"}
]'::jsonb),

-- Agency Pack
('agency_basic', 'Agency Essentials', 'Core automations for agencies and consultancies', 'agency', '🏢', 'free', true, '[
  {"id": "consultation_booked", "name": "Consultation Booked", "trigger": "booking.create", "description": "Confirmation + prep materials"},
  {"id": "proposal_followup", "name": "Proposal Follow-up", "trigger": "proposal.sent", "delay": "P3D", "description": "Follow up on proposals"},
  {"id": "onboarding_sequence", "name": "Client Onboarding", "trigger": "deal.won", "description": "New client onboarding sequence"}
]'::jsonb),

-- E-commerce Pack
('ecommerce_basic', 'E-commerce Essentials', 'Core automations for online stores', 'ecommerce', '🛒', 'free', true, '[
  {"id": "order_confirmation", "name": "Order Confirmation", "trigger": "order.created", "description": "Order confirmation email"},
  {"id": "abandoned_cart", "name": "Abandoned Cart Recovery", "trigger": "cart.abandoned", "description": "Recover abandoned carts"},
  {"id": "review_request", "name": "Post-Purchase Review", "trigger": "order.delivered", "delay": "P3D", "description": "Request product review"}
]'::jsonb)

ON CONFLICT (pack_id) DO UPDATE SET
  recipes = EXCLUDED.recipes,
  updated_at = now();

-- ============================================================================
-- SEED: Intent to Recipe Mappings
-- ============================================================================

INSERT INTO public.intent_recipe_mappings (intent, industry, recipe_ids, priority) VALUES
-- Booking intents
('booking.create', 'salon', ARRAY['booking_confirmation', 'appointment_reminder_24h'], 10),
('booking.create', 'restaurant', ARRAY['reservation_confirmation', 'reservation_reminder'], 10),
('booking.create', 'contractor', ARRAY['booking_confirmation'], 10),
('booking.create', 'agency', ARRAY['consultation_booked'], 10),

-- Lead capture intents
('lead.capture', 'contractor', ARRAY['lead_nurture_sequence'], 20),
('lead.capture', 'agency', ARRAY['lead_nurture_sequence'], 20),
('lead.capture', 'salon', ARRAY['lead_nurture_sequence'], 20),

-- Quote/proposal intents
('quote.request', 'contractor', ARRAY['quote_request_followup'], 15),

-- Contact form intents
('contact.submit', 'salon', ARRAY['lead_nurture_sequence'], 30),
('contact.submit', 'contractor', ARRAY['lead_nurture_sequence'], 30),
('contact.submit', 'restaurant', ARRAY['reservation_confirmation'], 30),
('contact.submit', 'agency', ARRAY['lead_nurture_sequence'], 30)

ON CONFLICT (intent, industry) DO UPDATE SET
  recipe_ids = EXCLUDED.recipe_ids,
  priority = EXCLUDED.priority;

-- ============================================================================
-- FUNCTION: Check business hours before sending
-- ============================================================================

CREATE OR REPLACE FUNCTION check_business_hours(p_business_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings business_automation_settings%ROWTYPE;
  v_current_time TIME;
  v_current_day INTEGER;
BEGIN
  SELECT * INTO v_settings FROM business_automation_settings WHERE business_id = p_business_id;
  
  IF v_settings IS NULL OR NOT v_settings.business_hours_enabled THEN
    RETURN true; -- No restrictions
  END IF;
  
  -- Get current time in business timezone
  v_current_time := (now() AT TIME ZONE COALESCE(v_settings.timezone, 'UTC'))::TIME;
  v_current_day := EXTRACT(DOW FROM now() AT TIME ZONE COALESCE(v_settings.timezone, 'UTC'));
  
  -- Check if current day is a business day
  IF NOT v_current_day = ANY(v_settings.business_days) THEN
    RETURN false;
  END IF;
  
  -- Check if within business hours
  RETURN v_current_time >= v_settings.business_hours_start 
     AND v_current_time <= v_settings.business_hours_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Check quiet hours before SMS/calls
-- ============================================================================

CREATE OR REPLACE FUNCTION check_quiet_hours(p_business_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings business_automation_settings%ROWTYPE;
  v_current_time TIME;
BEGIN
  SELECT * INTO v_settings FROM business_automation_settings WHERE business_id = p_business_id;
  
  IF v_settings IS NULL OR NOT v_settings.quiet_hours_enabled THEN
    RETURN false; -- Not in quiet hours
  END IF;
  
  v_current_time := (now() AT TIME ZONE COALESCE(v_settings.timezone, 'UTC'))::TIME;
  
  -- Handle overnight quiet hours (e.g., 21:00 to 08:00)
  IF v_settings.quiet_hours_start > v_settings.quiet_hours_end THEN
    RETURN v_current_time >= v_settings.quiet_hours_start 
        OR v_current_time <= v_settings.quiet_hours_end;
  ELSE
    RETURN v_current_time >= v_settings.quiet_hours_start 
       AND v_current_time <= v_settings.quiet_hours_end;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Check enrollment eligibility
-- ============================================================================

CREATE OR REPLACE FUNCTION check_enrollment_eligibility(
  p_contact_id UUID,
  p_workflow_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_workflow crm_workflows%ROWTYPE;
  v_enrollment automation_enrollments%ROWTYPE;
BEGIN
  SELECT * INTO v_workflow FROM crm_workflows WHERE id = p_workflow_id;
  
  IF v_workflow IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT * INTO v_enrollment 
  FROM automation_enrollments 
  WHERE contact_id = p_contact_id AND workflow_id = p_workflow_id;
  
  -- First enrollment is always allowed
  IF v_enrollment IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check max enrollments
  IF v_workflow.max_enrollments_per_contact IS NOT NULL 
     AND v_enrollment.enrollment_count >= v_workflow.max_enrollments_per_contact THEN
    RETURN false;
  END IF;
  
  -- Check re-enrollment cooldown
  IF v_workflow.reenroll_after_days IS NULL THEN
    RETURN false; -- Never re-enroll
  END IF;
  
  IF v_enrollment.blocked_until IS NOT NULL AND v_enrollment.blocked_until > now() THEN
    RETURN false;
  END IF;
  
  IF v_enrollment.last_enrolled_at + (v_workflow.reenroll_after_days || ' days')::INTERVAL > now() THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Create automation event with deduplication
-- ============================================================================

CREATE OR REPLACE FUNCTION create_automation_event(
  p_business_id UUID,
  p_intent TEXT,
  p_payload JSONB,
  p_dedupe_key TEXT DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'template'
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check for duplicate
  IF p_dedupe_key IS NOT NULL THEN
    SELECT id INTO v_existing_id 
    FROM automation_events 
    WHERE business_id = p_business_id AND dedupe_key = p_dedupe_key;
    
    IF v_existing_id IS NOT NULL THEN
      RETURN v_existing_id; -- Return existing event (idempotent)
    END IF;
  END IF;
  
  -- Create new event
  INSERT INTO automation_events (business_id, intent, payload, dedupe_key, contact_id, source)
  VALUES (p_business_id, p_intent, p_payload, p_dedupe_key, p_contact_id, p_source)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Upsert enrollment tracking
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_enrollment(
  p_contact_id UUID,
  p_workflow_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO automation_enrollments (contact_id, workflow_id, enrollment_count, first_enrolled_at, last_enrolled_at)
  VALUES (p_contact_id, p_workflow_id, 1, now(), now())
  ON CONFLICT (contact_id, workflow_id) 
  DO UPDATE SET 
    enrollment_count = automation_enrollments.enrollment_count + 1,
    last_enrolled_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Mark enrollment completed
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_enrollment(
  p_contact_id UUID,
  p_workflow_id UUID,
  p_cooldown_days INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE automation_enrollments 
  SET 
    last_completed_at = now(),
    blocked_until = CASE 
      WHEN p_cooldown_days IS NOT NULL 
      THEN now() + (p_cooldown_days || ' days')::INTERVAL 
      ELSE NULL 
    END
  WHERE contact_id = p_contact_id AND workflow_id = p_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get active automation runs for a contact
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contact_active_runs(p_contact_id UUID)
RETURNS TABLE (
  run_id UUID,
  workflow_id UUID,
  workflow_name TEXT,
  status TEXT,
  started_at TIMESTAMPTZ,
  steps_completed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as run_id,
    r.workflow_id,
    w.name as workflow_name,
    r.status,
    r.started_at,
    r.steps_completed
  FROM automation_runs r
  JOIN crm_workflows w ON w.id = r.workflow_id
  WHERE r.contact_id = p_contact_id
  AND r.status IN ('pending', 'running', 'paused')
  ORDER BY r.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
