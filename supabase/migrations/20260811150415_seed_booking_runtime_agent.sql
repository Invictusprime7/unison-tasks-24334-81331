-- Booking-enabled generated sites install this agent during the confirmed
-- launch transaction. Keep the registry entry available before provisioning.
INSERT INTO public.ai_agent_registry (
  slug,
  name,
  description,
  tier,
  system_prompt,
  allowed_tools,
  default_config,
  is_active
)
VALUES (
  'booking_agent',
  'Booking Agent',
  'Checks availability and creates bookings for generated booking-enabled sites.',
  'free',
  'You are a booking agent. Use only calendar.check and calendar.book to help customers find and reserve available appointment times. Always return valid JSON with the availability or booking outcome.',
  '["calendar.check", "calendar.book"]'::jsonb,
  '{"settings": {}, "bindings": {}, "capabilities": {"booking": true}}'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  allowed_tools = EXCLUDED.allowed_tools,
  default_config = EXCLUDED.default_config,
  is_active = true,
  updated_at = now();