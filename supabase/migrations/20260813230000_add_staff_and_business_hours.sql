-- Stage 2 (Backend-To-UI Wiring): add the staff and business_hours tables
-- named in the roadmap's scope ("services, staff, locations, hours,
-- availability") that were previously entirely missing. Purely additive:
-- two new tables plus one nullable FK column on availability_slots. No
-- existing table, function, or RLS policy is modified. Availability
-- generation and Business Center UI wiring are deliberately deferred to a
-- follow-up slice -- this migration only establishes the durable, tenant-
-- scoped schema so that follow-up work has a real table to write to
-- instead of another seed/placeholder.

CREATE TABLE IF NOT EXISTS public.business_hours (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
	day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
	opens_at time,
	closes_at time,
	is_closed boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CHECK (is_closed OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_hours_business_day
	ON public.business_hours (business_id, day_of_week);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.business_hours TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT ALL ON public.business_hours TO service_role;

-- Public/anon read: a visitor must be able to see stated operating hours on
-- a published site before booking, same as the existing services_select_public
-- policy on public.services.
DROP POLICY IF EXISTS "business_hours_select_public" ON public.business_hours;
CREATE POLICY "business_hours_select_public"
	ON public.business_hours FOR SELECT
	TO anon, authenticated
	USING (true);

DROP POLICY IF EXISTS "business_hours_write_member" ON public.business_hours;
CREATE POLICY "business_hours_write_member"
	ON public.business_hours FOR ALL
	TO authenticated
	USING (public.is_business_member(business_id))
	WITH CHECK (public.is_business_member(business_id));

CREATE TABLE IF NOT EXISTS public.staff (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
	user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	name text NOT NULL,
	email text,
	role text,
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_business_id ON public.staff (business_id);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;

-- No public/anon policy: staff records carry an email (PII) and are not yet
-- proven necessary on a public storefront. Business members only until a
-- concrete generated-site surface needs a public staff directory/picker.
DROP POLICY IF EXISTS "staff_member_access" ON public.staff;
CREATE POLICY "staff_member_access"
	ON public.staff FOR ALL
	TO authenticated
	USING (public.is_business_member(business_id))
	WITH CHECK (public.is_business_member(business_id));

-- Nullable so every existing availability_slots row remains valid; lets a
-- future slice assign a specific staff member to a slot without a backfill.
ALTER TABLE public.availability_slots
	ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_availability_slots_staff_id
	ON public.availability_slots (staff_id)
	WHERE staff_id IS NOT NULL;
