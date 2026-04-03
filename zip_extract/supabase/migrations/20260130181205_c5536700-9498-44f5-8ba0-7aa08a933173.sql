-- Fix infinite recursion in project_members RLS policy
DROP POLICY IF EXISTS "Owners can manage project members" ON project_members;
DROP POLICY IF EXISTS "Owners can view project members" ON project_members;

-- Recreate policies without recursion
CREATE POLICY "Owners can manage project members" ON project_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_members.project_id 
    AND projects.owner_id = auth.uid()
  )
);

-- Create automation_recipe_packs table
CREATE TABLE IF NOT EXISTS public.automation_recipe_packs (
  pack_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  tier TEXT DEFAULT 'free',
  recipes JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create business_automation_settings table
CREATE TABLE IF NOT EXISTS public.business_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  business_hours_enabled BOOLEAN DEFAULT false,
  business_hours_start TIME DEFAULT '09:00',
  business_hours_end TIME DEFAULT '17:00',
  business_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
  timezone TEXT DEFAULT 'UTC',
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '08:00',
  max_messages_per_contact_per_day INTEGER DEFAULT 5,
  dedupe_window_minutes INTEGER DEFAULT 60,
  default_sender_name TEXT,
  default_sender_email TEXT,
  default_sender_phone TEXT,
  require_consent_for_sms BOOLEAN DEFAULT true,
  require_consent_for_email BOOLEAN DEFAULT false,
  honor_stop_keywords BOOLEAN DEFAULT true,
  automations_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id)
);

-- Create installed_recipe_packs table
CREATE TABLE IF NOT EXISTS public.installed_recipe_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES automation_recipe_packs(pack_id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, pack_id)
);

-- Create business_recipe_toggles table
CREATE TABLE IF NOT EXISTS public.business_recipe_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  custom_config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, recipe_id)
);

-- Create automation_events table for event logging
CREATE TABLE IF NOT EXISTS public.automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  intent TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  dedupe_key TEXT,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE automation_recipe_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE installed_recipe_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_recipe_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_events ENABLE ROW LEVEL SECURITY;

-- RLS for automation_recipe_packs (public read for published packs)
CREATE POLICY "Anyone can view published recipe packs" ON automation_recipe_packs
FOR SELECT USING (is_published = true);

CREATE POLICY "Service role can manage recipe packs" ON automation_recipe_packs
FOR ALL USING (auth.role() = 'service_role');

-- RLS for business_automation_settings
CREATE POLICY "Business members can view settings" ON business_automation_settings
FOR SELECT USING (is_business_member(business_id));

CREATE POLICY "Business members can insert settings" ON business_automation_settings
FOR INSERT WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update settings" ON business_automation_settings
FOR UPDATE USING (is_business_member(business_id));

-- RLS for installed_recipe_packs
CREATE POLICY "Business members can view installed packs" ON installed_recipe_packs
FOR SELECT USING (is_business_member(business_id));

CREATE POLICY "Business members can install packs" ON installed_recipe_packs
FOR INSERT WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update installed packs" ON installed_recipe_packs
FOR UPDATE USING (is_business_member(business_id));

-- RLS for business_recipe_toggles
CREATE POLICY "Business members can view recipe toggles" ON business_recipe_toggles
FOR SELECT USING (is_business_member(business_id));

CREATE POLICY "Business members can manage recipe toggles" ON business_recipe_toggles
FOR ALL USING (is_business_member(business_id));

-- RLS for automation_events
CREATE POLICY "Business members can view events" ON automation_events
FOR SELECT USING (is_business_member(business_id));

CREATE POLICY "Service role can manage events" ON automation_events
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can insert events with valid business" ON automation_events
FOR INSERT WITH CHECK (business_id IS NOT NULL);

-- Seed default recipe packs
INSERT INTO automation_recipe_packs (pack_id, name, description, industry, icon, tier, is_published, recipes) VALUES
  (gen_random_uuid(), 'Salon Essentials', 'Booking confirmations, reminders, and review requests for salons', 'salon', '💅', 'free', true, 
   '[{"id": "salon_booking_confirm", "name": "Booking Confirmation", "description": "Send confirmation when appointment is booked", "trigger": "booking.create"},
     {"id": "salon_24hr_reminder", "name": "24hr Reminder", "description": "Send reminder 24 hours before appointment", "trigger": "booking.reminder"},
     {"id": "salon_review_request", "name": "Review Request", "description": "Ask for review after appointment", "trigger": "job.completed"}]'::jsonb),
  
  (gen_random_uuid(), 'Restaurant Pack', 'Reservation confirmations and reminders', 'restaurant', '🍽️', 'free', true,
   '[{"id": "resto_reservation_confirm", "name": "Reservation Confirmation", "description": "Confirm reservation immediately", "trigger": "booking.create"},
     {"id": "resto_2hr_reminder", "name": "2hr Reminder", "description": "Remind guests 2 hours before", "trigger": "booking.reminder"}]'::jsonb),
  
  (gen_random_uuid(), 'Contractor Pack', 'Quote follow-ups and job completion workflows', 'contractor', '🔨', 'free', true,
   '[{"id": "contractor_quote_followup", "name": "Quote Follow-up", "description": "Follow up on sent quotes", "trigger": "quote.request"},
     {"id": "contractor_job_complete", "name": "Job Completion", "description": "Thank customer after job", "trigger": "job.completed"}]'::jsonb),
  
  (gen_random_uuid(), 'Agency Pack', 'Lead nurturing and consultation workflows', 'agency', '💼', 'free', true,
   '[{"id": "agency_lead_nurture", "name": "Lead Nurture", "description": "Follow up with new leads", "trigger": "lead.capture"},
     {"id": "agency_consultation", "name": "Consultation Booked", "description": "Confirm consultation bookings", "trigger": "booking.create"}]'::jsonb),
  
  (gen_random_uuid(), 'E-commerce Pack', 'Order confirmations and abandoned cart recovery', 'ecommerce', '🛍️', 'free', true,
   '[{"id": "ecom_order_confirm", "name": "Order Confirmation", "description": "Confirm orders immediately", "trigger": "order.created"},
     {"id": "ecom_abandoned_cart", "name": "Abandoned Cart", "description": "Recover abandoned carts", "trigger": "cart.abandoned"}]'::jsonb),
  
  (gen_random_uuid(), 'General Pack', 'Basic lead capture and contact workflows', 'general', '📦', 'free', true,
   '[{"id": "general_lead_capture", "name": "Lead Capture", "description": "Respond to new leads", "trigger": "lead.capture"},
     {"id": "general_contact_response", "name": "Contact Response", "description": "Auto-respond to contact forms", "trigger": "contact.submit"}]'::jsonb);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_automation_events_business_id ON automation_events(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_events_status ON automation_events(status);
CREATE INDEX IF NOT EXISTS idx_installed_recipe_packs_business ON installed_recipe_packs(business_id);