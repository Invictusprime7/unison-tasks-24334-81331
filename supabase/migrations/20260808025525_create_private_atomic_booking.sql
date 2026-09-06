CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.create_atomic_booking(
	p_business_id uuid,
	p_site_id uuid,
	p_service_id uuid,
	p_availability_slot_id uuid,
	p_session_id text,
	p_idempotency_key text,
	p_customer_name text,
	p_customer_email text,
	p_customer_phone text DEFAULT NULL,
	p_notes text DEFAULT NULL,
	p_source text DEFAULT 'site-runtime@1.0'
)
RETURNS TABLE (
	booking_id uuid,
	starts_at timestamptz,
	ends_at timestamptz,
	service_name text,
	status text,
	duplicate boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
	existing_booking public.bookings%ROWTYPE;
	selected_slot public.availability_slots%ROWTYPE;
	selected_service public.services%ROWTYPE;
	inserted_booking public.bookings%ROWTYPE;
BEGIN
	IF p_business_id IS NULL
		OR p_site_id IS NULL
		OR p_service_id IS NULL
		OR p_availability_slot_id IS NULL
		OR length(trim(COALESCE(p_session_id, ''))) < 8
		OR length(p_session_id) > 200
		OR length(trim(COALESCE(p_idempotency_key, ''))) < 8
		OR length(p_idempotency_key) > 200
		OR length(trim(COALESCE(p_customer_name, ''))) < 2
		OR length(p_customer_name) > 120
		OR length(trim(COALESCE(p_customer_email, ''))) < 3
		OR length(p_customer_email) > 255
		OR length(COALESCE(p_customer_phone, '')) > 40
		OR length(COALESCE(p_notes, '')) > 2000
		OR length(trim(COALESCE(p_source, ''))) < 1
		OR length(p_source) > 120
	THEN
		RAISE EXCEPTION 'BOOKING_INPUT_INVALID';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM public.sites AS site
		WHERE site.id = p_site_id
			AND site.business_id = p_business_id
			AND site.status IN ('preview', 'published')
	) THEN
		RAISE EXCEPTION 'BOOKING_SITE_UNAVAILABLE';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM public.site_capabilities AS capability
		WHERE capability.site_id = p_site_id
			AND capability.capability_id = 'booking'
			AND capability.status = 'enabled'
	) THEN
		RAISE EXCEPTION 'BOOKING_CAPABILITY_UNAVAILABLE';
	END IF;

	PERFORM pg_catalog.pg_advisory_xact_lock(
		pg_catalog.hashtextextended(p_site_id::text || ':' || p_idempotency_key, 0)
	);

	SELECT booking.*
	INTO existing_booking
	FROM public.bookings AS booking
	WHERE booking.site_id = p_site_id
		AND booking.idempotency_key = p_idempotency_key
	FOR UPDATE;

	IF FOUND THEN
		RETURN QUERY SELECT
			existing_booking.id,
			existing_booking.starts_at,
			existing_booking.ends_at,
			existing_booking.service_name,
			existing_booking.status,
			true;
		RETURN;
	END IF;

	SELECT slot.*
	INTO selected_slot
	FROM public.availability_slots AS slot
	WHERE slot.id = p_availability_slot_id
		AND slot.business_id = p_business_id
	FOR UPDATE;

	IF NOT FOUND OR selected_slot.is_booked THEN
		RAISE EXCEPTION 'BOOKING_SLOT_UNAVAILABLE';
	END IF;
	IF selected_slot.service_id IS NOT NULL AND selected_slot.service_id <> p_service_id THEN
		RAISE EXCEPTION 'BOOKING_SLOT_SERVICE_MISMATCH';
	END IF;

	SELECT service.*
	INTO selected_service
	FROM public.services AS service
	WHERE service.id = p_service_id
		AND service.business_id = p_business_id
		AND service.is_active = true;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'BOOKING_SERVICE_UNAVAILABLE';
	END IF;

	UPDATE public.availability_slots AS slot
	SET is_booked = true
	WHERE slot.id = selected_slot.id
		AND slot.business_id = p_business_id
		AND slot.is_booked = false;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'BOOKING_SLOT_UNAVAILABLE';
	END IF;

	INSERT INTO public.bookings (
		business_id,
		site_id,
		service_id,
		availability_slot_id,
		session_id,
		idempotency_key,
		service_name,
		customer_name,
		customer_email,
		customer_phone,
		booking_date,
		booking_time,
		starts_at,
		ends_at,
		duration_minutes,
		status,
		notes,
		metadata
	)
	VALUES (
		p_business_id,
		p_site_id,
		selected_service.id,
		selected_slot.id,
		p_session_id,
		p_idempotency_key,
		selected_service.name,
		trim(p_customer_name),
		lower(trim(p_customer_email)),
		NULLIF(trim(COALESCE(p_customer_phone, '')), ''),
		selected_slot.starts_at::date,
		selected_slot.starts_at::time,
		selected_slot.starts_at,
		selected_slot.ends_at,
		selected_service.duration_minutes,
		'confirmed',
		NULLIF(trim(COALESCE(p_notes, '')), ''),
		jsonb_build_object(
			'siteId', p_site_id,
			'slotId', selected_slot.id,
			'source', p_source
		)
	)
	RETURNING * INTO inserted_booking;

	RETURN QUERY SELECT
		inserted_booking.id,
		inserted_booking.starts_at,
		inserted_booking.ends_at,
		inserted_booking.service_name,
		inserted_booking.status,
		false;
END;
$$;

REVOKE ALL ON FUNCTION private.create_atomic_booking(
	uuid, uuid, uuid, uuid, text, text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_atomic_booking(
	uuid, uuid, uuid, uuid, text, text, text, text, text, text, text
) TO service_role;
