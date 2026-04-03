-- Fix prior partial migration: ensure policies are in the intended state

CREATE TABLE IF NOT EXISTS public.business_design_preferences (
  business_id UUID PRIMARY KEY,
  template_category TEXT NULL,
  design_preset TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_design_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_design_preferences_select_member" ON public.business_design_preferences;
DROP POLICY IF EXISTS "business_design_preferences_insert_member" ON public.business_design_preferences;
DROP POLICY IF EXISTS "business_design_preferences_update_member" ON public.business_design_preferences;

CREATE POLICY "business_design_preferences_select_member"
ON public.business_design_preferences
FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "business_design_preferences_insert_member"
ON public.business_design_preferences
FOR INSERT
WITH CHECK (is_business_member(business_id));

CREATE POLICY "business_design_preferences_update_member"
ON public.business_design_preferences
FOR UPDATE
USING (is_business_member(business_id))
WITH CHECK (is_business_member(business_id));

CREATE INDEX IF NOT EXISTS idx_business_design_preferences_business_id
ON public.business_design_preferences (business_id);