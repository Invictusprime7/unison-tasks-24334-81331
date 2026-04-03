-- Phase 2: Activate Booking Agent with Production Hardening
-- Explicit transaction, row locks, defensive checks, dual intent routing

BEGIN;

-- 1) Existence assertions - fail fast if agents not seeded
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ai_agent_registry
    WHERE slug = 'booking_agent' AND version = '1.0.0'
  ) THEN
    RAISE EXCEPTION 'booking_agent 1.0.0 not found in ai_agent_registry';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ai_agent_registry
    WHERE slug = 'unison_ai' AND version = '1.0.0'
  ) THEN
    RAISE EXCEPTION 'unison_ai 1.0.0 not found in ai_agent_registry';
  END IF;
END $$;

-- 2) Lock rows to prevent concurrent config overwrites
SELECT 1
FROM public.ai_agent_registry
WHERE (slug, version) IN (('booking_agent','1.0.0'), ('unison_ai','1.0.0'))
FOR UPDATE;

-- 3) Activate booking_agent
UPDATE public.ai_agent_registry
SET is_active = true,
    updated_at = now()
WHERE slug = 'booking_agent' AND version = '1.0.0';

-- 4) Ensure unison_ai default_config is an object (defensive)
UPDATE public.ai_agent_registry
SET default_config = '{}'::jsonb,
    updated_at = now()
WHERE slug = 'unison_ai' AND version = '1.0.0'
  AND (default_config IS NULL OR jsonb_typeof(default_config) <> 'object');

-- 5) Patch routing for both booking.create AND booking.request intents
UPDATE public.ai_agent_registry
SET default_config =
  jsonb_set(
    jsonb_set(
      COALESCE(default_config, '{}'::jsonb),
      '{routing,booking.create}',
      '"booking_agent"'::jsonb,
      true
    ),
    '{routing,booking.request}',
    '"booking_agent"'::jsonb,
    true
  ),
  updated_at = now()
WHERE slug = 'unison_ai' AND version = '1.0.0';

COMMIT;