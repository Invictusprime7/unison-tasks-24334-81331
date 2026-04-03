-- Extend crm_leads to support business lead inbox fields
ALTER TABLE public.crm_leads
ADD COLUMN IF NOT EXISTS business_id uuid,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS intent text;

-- Ensure there's always a title even when created from generic intents
ALTER TABLE public.crm_leads
ALTER COLUMN title SET DEFAULT 'New lead';

CREATE INDEX IF NOT EXISTS idx_crm_leads_business_created_at
ON public.crm_leads (business_id, created_at DESC);

-- Replace RLS policies to support:
-- 1) public lead capture inserts (from website forms)
-- 2) business members reading their business lead inbox
DROP POLICY IF EXISTS "Users can view own leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Users can create leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.crm_leads;

-- View leads: business members can see leads for their businesses.
CREATE POLICY crm_leads_select_member
ON public.crm_leads
FOR SELECT
USING (
  (business_id IS NOT NULL AND is_business_member(business_id))
  OR (business_id IS NULL AND (user_id = auth.uid() OR user_id IS NULL))
);

-- Insert leads: allow public inserts when business_id + email are present.
CREATE POLICY crm_leads_insert_public_valid
ON public.crm_leads
FOR INSERT
WITH CHECK (
  business_id IS NOT NULL
  AND email IS NOT NULL
  AND length(email) > 3
);

-- Update/delete: restrict to business members.
CREATE POLICY crm_leads_update_member
ON public.crm_leads
FOR UPDATE
USING (business_id IS NOT NULL AND is_business_member(business_id));

CREATE POLICY crm_leads_delete_member
ON public.crm_leads
FOR DELETE
USING (business_id IS NOT NULL AND is_business_member(business_id));
