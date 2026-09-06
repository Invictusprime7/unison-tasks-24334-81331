DROP POLICY IF EXISTS bookings_select_scoped ON public.bookings;

CREATE POLICY bookings_select_scoped
	ON public.bookings
	FOR SELECT
	TO anon, authenticated
	USING (
		((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
		OR (
			session_id IS NOT NULL
			AND session_id = (SELECT public.current_session_id())
		)
		OR (business_id IS NOT NULL AND public.is_business_member(business_id))
	);