-- ============================================================================
-- CANONICAL COMPONENT GRAPH
-- Establishes a durable graph for reusable playground primitives so forms,
-- booking, checkout, chat, and future widgets share the same project-linked
-- component model, bindings, and emitted events.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_canonical_component_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. Registry of reusable component definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.component_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  component_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  required_binding_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_business_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_setup_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  html_template TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.component_definitions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'component_definitions'
      AND policyname = 'component_definitions_select_authenticated'
  ) THEN
    CREATE POLICY "component_definitions_select_authenticated"
      ON public.component_definitions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'component_definitions'
      AND policyname = 'component_definitions_owner_manage'
  ) THEN
    CREATE POLICY "component_definitions_owner_manage"
      ON public.component_definitions
      FOR ALL
      TO authenticated
      USING (is_system = false)
      WITH CHECK (is_system = false);
  END IF;
END $$;

INSERT INTO public.component_definitions (
  slug,
  name,
  description,
  category,
  component_type,
  target_type,
  required_binding_keys,
  required_business_fields,
  required_setup_steps,
  output_events,
  html_template,
  is_system
)
VALUES
  (
    'contact-form',
    'Contact Form',
    'Lead capture form wired to CRM and owner notifications.',
    'leads',
    'contact-form',
    'form',
    '["formId"]'::jsonb,
    '["notificationEmail","crmDestination"]'::jsonb,
    '[]'::jsonb,
    '["lead.created","form.submitted","contact.submitted"]'::jsonb,
    null,
    true
  ),
  (
    'request-quote',
    'Request Quote',
    'Quote request form for service businesses and agencies.',
    'leads',
    'request-quote',
    'form',
    '["formId"]'::jsonb,
    '["notificationEmail","crmDestination"]'::jsonb,
    '[]'::jsonb,
    '["quote.requested","lead.created","form.submitted"]'::jsonb,
    null,
    true
  ),
  (
    'newsletter-signup',
    'Newsletter Signup',
    'Newsletter capture with a canonical subscription event.',
    'leads',
    'newsletter-signup',
    'form',
    '["formId"]'::jsonb,
    '["notificationEmail"]'::jsonb,
    '[]'::jsonb,
    '["newsletter.subscribed","lead.created","form.submitted"]'::jsonb,
    null,
    true
  ),
  (
    'booking-scheduler',
    'Book Now Scheduler',
    'Service selection and booking intent for appointment flows.',
    'booking',
    'booking-scheduler',
    'calendar',
    '["calendarId"]'::jsonb,
    '["notificationEmail","bookingOwner"]'::jsonb,
    '["booking_calendar"]'::jsonb,
    '["booking.requested","booking.confirmed","calendar.opened"]'::jsonb,
    null,
    true
  ),
  (
    'checkout-cta',
    'Checkout CTA',
    'Canonical purchase action wired to payment readiness.',
    'commerce',
    'checkout-cta',
    'checkout',
    '["productId"]'::jsonb,
    '["paymentProvider"]'::jsonb,
    '["payments"]'::jsonb,
    '["checkout.started","checkout.completed","order.created"]'::jsonb,
    null,
    true
  ),
  (
    'chat-widget',
    'Chat Widget',
    'Persistent customer conversation entry point.',
    'support',
    'chat-widget',
    'chat',
    '[]'::jsonb,
    '["followUpChannel"]'::jsonb,
    '[]'::jsonb,
    '["conversation.started","message.received","lead.created"]'::jsonb,
    null,
    true
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  component_type = EXCLUDED.component_type,
  target_type = EXCLUDED.target_type,
  required_binding_keys = EXCLUDED.required_binding_keys,
  required_business_fields = EXCLUDED.required_business_fields,
  required_setup_steps = EXCLUDED.required_setup_steps,
  output_events = EXCLUDED.output_events,
  updated_at = now();

DROP TRIGGER IF EXISTS trigger_component_definitions_updated_at ON public.component_definitions;
CREATE TRIGGER trigger_component_definitions_updated_at
  BEFORE UPDATE ON public.component_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_canonical_component_updated_at();

-- ============================================================================
-- 2. Project-linked component instances
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_component_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  builder_draft_id UUID REFERENCES public.builder_drafts(id) ON DELETE SET NULL,
  definition_slug TEXT REFERENCES public.component_definitions(slug) ON DELETE SET NULL,
  component_type TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  source TEXT NOT NULL DEFAULT 'builder',
  page_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_component_instances_project_id
  ON public.project_component_instances(project_id);

CREATE INDEX IF NOT EXISTS idx_project_component_instances_definition_slug
  ON public.project_component_instances(definition_slug);

ALTER TABLE public.project_component_instances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_component_instances'
      AND policyname = 'project_component_instances_owner_full'
  ) THEN
    CREATE POLICY "project_component_instances_owner_full"
      ON public.project_component_instances
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = project_id
            AND p.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = project_id
            AND p.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DROP TRIGGER IF EXISTS trigger_project_component_instances_updated_at ON public.project_component_instances;
CREATE TRIGGER trigger_project_component_instances_updated_at
  BEFORE UPDATE ON public.project_component_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_canonical_component_updated_at();

-- ============================================================================
-- 3. Explicit per-component bindings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_component_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  component_instance_id UUID NOT NULL REFERENCES public.project_component_instances(id) ON DELETE CASCADE,
  binding_key TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (component_instance_id, binding_key, target_ref)
);

CREATE INDEX IF NOT EXISTS idx_project_component_bindings_project_id
  ON public.project_component_bindings(project_id);

CREATE INDEX IF NOT EXISTS idx_project_component_bindings_instance_id
  ON public.project_component_bindings(component_instance_id);

ALTER TABLE public.project_component_bindings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_component_bindings'
      AND policyname = 'project_component_bindings_owner_full'
  ) THEN
    CREATE POLICY "project_component_bindings_owner_full"
      ON public.project_component_bindings
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = project_id
            AND p.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = project_id
            AND p.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DROP TRIGGER IF EXISTS trigger_project_component_bindings_updated_at ON public.project_component_bindings;
CREATE TRIGGER trigger_project_component_bindings_updated_at
  BEFORE UPDATE ON public.project_component_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_canonical_component_updated_at();

-- ============================================================================
-- 4. Canonical project event log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  component_instance_id UUID REFERENCES public.project_component_instances(id) ON DELETE SET NULL,
  page_id TEXT,
  event_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'playground',
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_event_log_project_id
  ON public.project_event_log(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_event_log_component_instance_id
  ON public.project_event_log(component_instance_id, created_at DESC);

ALTER TABLE public.project_event_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_event_log'
      AND policyname = 'project_event_log_owner_full'
  ) THEN
    CREATE POLICY "project_event_log_owner_full"
      ON public.project_event_log
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = project_id
            AND p.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = project_id
            AND p.owner_id = auth.uid()
        )
      );
  END IF;
END $$;
