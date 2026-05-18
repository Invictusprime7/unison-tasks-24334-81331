DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
      AND policyname = 'bookings_insert_public_valid'
  ) THEN
    EXECUTE 'DROP POLICY "bookings_insert_public_valid" ON public.bookings';
  END IF;
END $$;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_customer_email_format,
  DROP CONSTRAINT IF EXISTS bookings_customer_name_meaningful;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_customer_email_format
    CHECK (
      customer_email IS NULL
      OR customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ) NOT VALID;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_customer_name_meaningful
    CHECK (
      customer_name IS NULL
      OR (char_length(btrim(customer_name)) >= 2 AND customer_name ~ '[A-Za-z]')
    ) NOT VALID;

CREATE POLICY "bookings_insert_public_valid"
ON public.bookings
FOR INSERT
WITH CHECK (
  business_id IS NOT NULL
  AND customer_email IS NOT NULL
  AND customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND customer_name IS NOT NULL
  AND char_length(btrim(customer_name)) >= 2
  AND customer_name ~ '[A-Za-z]'
);