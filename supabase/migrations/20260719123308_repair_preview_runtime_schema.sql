-- Repair production schema drift discovered by the Web Builder preview.
-- This version is already present in the linked migration ledger; keeping the
-- source file locally restores parity after the clean baseline reset.

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  price_cents integer,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  business_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);
CREATE INDEX IF NOT EXISTS idx_availability_business_id ON public.availability_slots(business_id);
CREATE INDEX IF NOT EXISTS idx_availability_starts_at ON public.availability_slots(starts_at);
CREATE INDEX IF NOT EXISTS idx_availability_is_booked ON public.availability_slots(is_booked);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_public" ON public.services;
DROP POLICY IF EXISTS "services_insert_owner" ON public.services;
DROP POLICY IF EXISTS "services_update_owner" ON public.services;
DROP POLICY IF EXISTS "services_delete_owner" ON public.services;
DROP POLICY IF EXISTS "services_write_member" ON public.services;
DROP POLICY IF EXISTS "services_insert_member" ON public.services;
DROP POLICY IF EXISTS "services_update_member" ON public.services;
DROP POLICY IF EXISTS "services_delete_member" ON public.services;

CREATE POLICY "services_select_visible" ON public.services FOR SELECT
  TO anon, authenticated
  USING (is_active OR public.is_business_member(business_id));
CREATE POLICY "services_insert_member" ON public.services FOR INSERT
  TO authenticated WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "services_update_member" ON public.services FOR UPDATE
  TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "services_delete_member" ON public.services FOR DELETE
  TO authenticated USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "slots_select_public" ON public.availability_slots;
DROP POLICY IF EXISTS "slots_insert_owner" ON public.availability_slots;
DROP POLICY IF EXISTS "slots_update_owner" ON public.availability_slots;
DROP POLICY IF EXISTS "slots_delete_owner" ON public.availability_slots;
DROP POLICY IF EXISTS "slots_insert_member" ON public.availability_slots;
DROP POLICY IF EXISTS "slots_update_member" ON public.availability_slots;
DROP POLICY IF EXISTS "slots_delete_member" ON public.availability_slots;

CREATE POLICY "slots_select_public" ON public.availability_slots FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "slots_insert_member" ON public.availability_slots FOR INSERT
  TO authenticated WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "slots_update_member" ON public.availability_slots FOR UPDATE
  TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "slots_delete_member" ON public.availability_slots FOR DELETE
  TO authenticated USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "site_intent_bindings_own_read" ON public.site_intent_bindings;
DROP POLICY IF EXISTS "site_intent_bindings_own_insert" ON public.site_intent_bindings;
DROP POLICY IF EXISTS "site_intent_bindings_own_update" ON public.site_intent_bindings;
DROP POLICY IF EXISTS "site_intent_bindings_own_delete" ON public.site_intent_bindings;
DROP POLICY IF EXISTS "site_intent_bindings_select_member" ON public.site_intent_bindings;
DROP POLICY IF EXISTS "site_intent_bindings_insert_member" ON public.site_intent_bindings;
DROP POLICY IF EXISTS "site_intent_bindings_update_member" ON public.site_intent_bindings;
DROP POLICY IF EXISTS "site_intent_bindings_delete_member" ON public.site_intent_bindings;

CREATE POLICY "site_intent_bindings_select_member"
  ON public.site_intent_bindings FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));
CREATE POLICY "site_intent_bindings_insert_member"
  ON public.site_intent_bindings FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "site_intent_bindings_update_member"
  ON public.site_intent_bindings FOR UPDATE TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "site_intent_bindings_delete_member"
  ON public.site_intent_bindings FOR DELETE TO authenticated
  USING (public.is_business_member(business_id));

REVOKE ALL ON public.services FROM anon;
REVOKE ALL ON public.availability_slots FROM anon;
REVOKE ALL ON public.site_intent_bindings FROM anon;
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_intent_bindings TO authenticated;
GRANT ALL ON public.services TO service_role;
GRANT ALL ON public.availability_slots TO service_role;
GRANT ALL ON public.site_intent_bindings TO service_role;
