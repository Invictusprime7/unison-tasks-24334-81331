-- =============================================================================
-- SALON INTENT AUTOMATION WIRING
-- Wire all AI intents to salon booking for automation
-- =============================================================================

-- ============================================================================
-- INTENT RECIPE MAPPINGS FOR SALON INDUSTRY
-- Maps each intent to the workflows that should be triggered
-- ============================================================================

-- Clear any existing salon mappings
DELETE FROM public.intent_recipe_mappings WHERE industry = 'salon';

-- ACTION INTENTS: Trigger CRM + automation workflows
INSERT INTO public.intent_recipe_mappings (intent, industry, recipe_ids, priority, conditions) VALUES
-- Primary booking action - triggers confirmation workflow
('booking.create', 'salon', ARRAY['booking_confirmation', 'appointment_reminder_24h'], 10, '{"requiresEmail": true}'::jsonb),

-- Contact form submission - triggers lead nurture
('contact.submit', 'salon', ARRAY['lead_followup', 'consultation_offer'], 20, '{"requiresEmail": true}'::jsonb),

-- Newsletter signup - triggers welcome sequence  
('newsletter.subscribe', 'salon', ARRAY['newsletter_welcome', 'first_booking_offer'], 30, '{}'::jsonb);

-- AUTOMATION INTENTS: Event-driven workflow triggers
INSERT INTO public.intent_recipe_mappings (intent, industry, recipe_ids, priority, conditions) VALUES
-- Booking confirmed - send confirmation SMS/email
('booking.confirmed', 'salon', ARRAY['booking_confirmation_sms', 'add_to_calendar'], 5, '{}'::jsonb),

-- Booking reminder - 24h and 1h before
('booking.reminder', 'salon', ARRAY['reminder_24h_sms', 'reminder_1h_sms'], 10, '{"timing": "24h,1h"}'::jsonb),

-- Booking cancelled - offer rebooking
('booking.cancelled', 'salon', ARRAY['cancellation_confirmation', 'rebooking_offer'], 15, '{}'::jsonb),

-- No-show - follow up and optionally apply policy
('booking.noshow', 'salon', ARRAY['noshow_followup', 'rebooking_incentive'], 20, '{"applyNoShowFee": false}'::jsonb),

-- Job completed (service done) - request review
('job.completed', 'salon', ARRAY['service_complete_thankyou', 'review_request'], 25, '{"delayHours": 2}'::jsonb),

-- Generic form submission
('form.submit', 'salon', ARRAY['form_confirmation', 'lead_capture'], 50, '{}'::jsonb),

-- Generic button click (for tracking)
('button.click', 'salon', ARRAY[], 100, '{"trackOnly": true}'::jsonb);


-- ============================================================================
-- SALON-SPECIFIC WORKFLOWS (Recipes)
-- Pre-built automation workflows for salon businesses
-- ============================================================================

-- Booking Confirmation Workflow
INSERT INTO public.crm_workflows (
  name,
  industry,
  recipe_id,
  recipe_version,
  is_recipe,
  is_active,
  category,
  priority,
  trigger_type,
  trigger_config
) VALUES (
  'Salon Booking Confirmation',
  'salon',
  'booking_confirmation',
  1,
  true,
  true,
  'booking_confirmation',
  10,
  'booking.create',
  '{"sendEmail": true, "sendSms": true}'::jsonb
) ON CONFLICT DO NOTHING;

-- 24-Hour Appointment Reminder
INSERT INTO public.crm_workflows (
  name,
  industry,
  recipe_id,
  recipe_version,
  is_recipe,
  is_active,
  category,
  priority,
  trigger_type,
  trigger_config
) VALUES (
  'Salon 24hr Appointment Reminder',
  'salon',
  'appointment_reminder_24h',
  1,
  true,
  true,
  'booking_reminder',
  15,
  'booking.create',
  '{"delayHours": -24, "sendSms": true}'::jsonb
) ON CONFLICT DO NOTHING;

-- Post-Service Review Request
INSERT INTO public.crm_workflows (
  name,
  industry,
  recipe_id,
  recipe_version,
  is_recipe,
  is_active,
  category,
  priority,
  trigger_type,
  trigger_config
) VALUES (
  'Salon Review Request',
  'salon',
  'followup_review_request',
  1,
  true,
  true,
  'review_request',
  25,
  'job.completed',
  '{"delayHours": 2, "sendEmail": true, "includeGoogleLink": true}'::jsonb
) ON CONFLICT DO NOTHING;

-- Lead Follow-up Sequence
INSERT INTO public.crm_workflows (
  name,
  industry,
  recipe_id,
  recipe_version,
  is_recipe,
  is_active,
  category,
  priority,
  trigger_type,
  trigger_config
) VALUES (
  'Salon Lead Follow-up',
  'salon',
  'lead_followup',
  1,
  true,
  true,
  'lead_nurture',
  20,
  'contact.submit',
  '{"sendEmail": true, "sequence": ["initial_response", "offer_consultation", "booking_cta"]}'::jsonb
) ON CONFLICT DO NOTHING;

-- No-Show Recovery
INSERT INTO public.crm_workflows (
  name,
  industry,
  recipe_id,
  recipe_version,
  is_recipe,
  is_active,
  category,
  priority,
  trigger_type,
  trigger_config
) VALUES (
  'Salon No-Show Recovery',
  'salon',
  'noshow_followup',
  1,
  true,
  true,
  'noshow_recovery',
  30,
  'booking.noshow',
  '{"sendSms": true, "offerDiscount": false, "delayMinutes": 30}'::jsonb
) ON CONFLICT DO NOTHING;

-- Cancellation Rebooking
INSERT INTO public.crm_workflows (
  name,
  industry,
  recipe_id,
  recipe_version,
  is_recipe,
  is_active,
  category,
  priority,
  trigger_type,
  trigger_config
) VALUES (
  'Salon Cancellation Rebooking',
  'salon',
  'cancellation_rebooking',
  1,
  true,
  true,
  'cancellation_recovery',
  25,
  'booking.cancelled',
  '{"sendEmail": true, "suggestAlternatives": true}'::jsonb
) ON CONFLICT DO NOTHING;


-- ============================================================================
-- UPDATE SALON RECIPE PACK WITH FULL AUTOMATION COVERAGE
-- ============================================================================

UPDATE public.automation_recipe_packs 
SET recipes = '[
  {"id": "booking_confirmation", "name": "Booking Confirmation", "trigger": "booking.create", "description": "Send confirmation when appointment is booked", "actions": ["send_email", "send_sms"]},
  {"id": "appointment_reminder_24h", "name": "24hr Reminder", "trigger": "booking.create", "delay": "P1D", "description": "Reminder 24 hours before appointment", "actions": ["send_sms"]},
  {"id": "appointment_reminder_1h", "name": "1hr Reminder", "trigger": "booking.create", "delay": "PT1H", "description": "Reminder 1 hour before appointment", "actions": ["send_sms"]},
  {"id": "followup_review_request", "name": "Review Request", "trigger": "job.completed", "delay": "PT2H", "description": "Ask for review after service", "actions": ["send_email"]},
  {"id": "lead_followup", "name": "Lead Follow-up", "trigger": "contact.submit", "description": "Follow up with new leads", "actions": ["send_email", "create_task"]},
  {"id": "noshow_followup", "name": "No-Show Recovery", "trigger": "booking.noshow", "delay": "PT30M", "description": "Re-engage no-show clients", "actions": ["send_sms"]},
  {"id": "cancellation_rebooking", "name": "Cancellation Rebooking", "trigger": "booking.cancelled", "description": "Offer rebooking after cancellation", "actions": ["send_email"]}
]'::jsonb,
updated_at = now()
WHERE pack_id = 'salon_basic';


-- ============================================================================
-- GRANT EDGE FUNCTION ACCESS
-- ============================================================================

-- Ensure edge functions can read intent mappings
GRANT SELECT ON public.intent_recipe_mappings TO anon, authenticated, service_role;
GRANT SELECT ON public.automation_recipe_packs TO anon, authenticated, service_role;
GRANT SELECT ON public.crm_workflows TO anon, authenticated, service_role;

-- Edge functions need full access for automation
GRANT ALL ON public.automation_events TO service_role;
GRANT ALL ON public.automation_runs TO service_role;
GRANT ALL ON public.automation_jobs TO service_role;
GRANT ALL ON public.automation_logs TO service_role;
GRANT ALL ON public.automation_enrollments TO service_role;
