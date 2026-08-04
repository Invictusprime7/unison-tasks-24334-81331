CREATE TABLE IF NOT EXISTS public.bookings (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	session_id text,
	business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
	site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
	service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
	availability_slot_id uuid REFERENCES public.availability_slots(id) ON DELETE SET NULL,
	idempotency_key text,
	service_name text NOT NULL,
	customer_name text NOT NULL,
	customer_email text NOT NULL,
	customer_phone text,
	booking_date date NOT NULL,
	booking_time time NOT NULL,
	starts_at timestamptz NOT NULL,
	ends_at timestamptz NOT NULL,
	duration_minutes integer NOT NULL DEFAULT 60,
	status text NOT NULL DEFAULT 'pending',
	notes text,
	metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings
	ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS availability_slot_id uuid REFERENCES public.availability_slots(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_public_valid" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS bookings_select_scoped ON public.bookings;
DROP POLICY IF EXISTS bookings_update_member ON public.bookings;

CREATE POLICY bookings_select_scoped
	ON public.bookings
	FOR SELECT
	TO anon, authenticated
	USING (
		(auth.uid() IS NOT NULL AND user_id = auth.uid())
		OR (
			session_id IS NOT NULL
			AND NULLIF(NULLIF(current_setting('request.headers', true), '')::jsonb ->> 'x-session-id', '') = session_id
		)
		OR (business_id IS NOT NULL AND public.is_business_member(business_id))
	);

CREATE POLICY bookings_update_member
	ON public.bookings
	FOR UPDATE
	TO authenticated
	USING (business_id IS NOT NULL AND public.is_business_member(business_id))
	WITH CHECK (business_id IS NOT NULL AND public.is_business_member(business_id));

REVOKE INSERT, DELETE ON public.bookings FROM anon, authenticated;
GRANT SELECT ON public.bookings TO anon, authenticated;
GRANT UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

CREATE INDEX IF NOT EXISTS bookings_site_session_created_idx
	ON public.bookings (site_id, session_id, created_at DESC)
	WHERE site_id IS NOT NULL AND session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_site_idempotency_unique
	ON public.bookings (site_id, idempotency_key)
	WHERE site_id IS NOT NULL AND idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_availability_slot_unique
	ON public.bookings (availability_slot_id)
	WHERE availability_slot_id IS NOT NULL
		AND status NOT IN ('cancelled', 'declined');

CREATE INDEX IF NOT EXISTS availability_slots_service_id_idx
	ON public.availability_slots (service_id)
	WHERE service_id IS NOT NULL;