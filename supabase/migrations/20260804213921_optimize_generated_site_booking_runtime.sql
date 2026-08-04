DROP POLICY IF EXISTS bookings_select_scoped ON public.bookings;

CREATE POLICY bookings_select_scoped
	ON public.bookings
	FOR SELECT
	TO anon, authenticated
	USING (
		((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
		OR (
			session_id IS NOT NULL
			AND (
				SELECT NULLIF(
					NULLIF(current_setting('request.headers', true), '')::jsonb ->> 'x-session-id',
					''
				)
			) = session_id
		)
		OR (business_id IS NOT NULL AND public.is_business_member(business_id))
	);

CREATE INDEX IF NOT EXISTS bookings_business_id_idx
	ON public.bookings (business_id)
	WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_service_id_idx
	ON public.bookings (service_id)
	WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_user_id_idx
	ON public.bookings (user_id)
	WHERE user_id IS NOT NULL;