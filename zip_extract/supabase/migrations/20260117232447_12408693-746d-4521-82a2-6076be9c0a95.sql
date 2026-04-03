-- ================================================
-- Leads Pack: Contact forms, newsletter signups, waitlist
-- ================================================

-- Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  business_id uuid NOT NULL,
  name text,
  email text NOT NULL,
  phone text,
  source text,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Public can insert a lead (contact form), but can't read
CREATE POLICY "leads_insert_public"
ON public.leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Business owners can view their leads
CREATE POLICY "leads_select_owner"
ON public.leads FOR SELECT
TO authenticated
USING (business_id = auth.uid());

-- Business owners can update their leads
CREATE POLICY "leads_update_owner"
ON public.leads FOR UPDATE
TO authenticated
USING (business_id = auth.uid());

-- Business owners can delete their leads
CREATE POLICY "leads_delete_owner"
ON public.leads FOR DELETE
TO authenticated
USING (business_id = auth.uid());

-- Index for business queries
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- ================================================
-- Booking Pack: Services, availability, bookings
-- ================================================

-- Services table
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 30,
  price_cents int,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Anyone can view active services
CREATE POLICY "services_select_public"
ON public.services FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Business owners can manage their services
CREATE POLICY "services_insert_owner"
ON public.services FOR INSERT
TO authenticated
WITH CHECK (business_id = auth.uid());

CREATE POLICY "services_update_owner"
ON public.services FOR UPDATE
TO authenticated
USING (business_id = auth.uid());

CREATE POLICY "services_delete_owner"
ON public.services FOR DELETE
TO authenticated
USING (business_id = auth.uid());

-- Availability slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  business_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- Anyone can view available (unbooked) slots
CREATE POLICY "slots_select_public"
ON public.availability_slots FOR SELECT
TO anon, authenticated
USING (true);

-- Business owners can manage their slots
CREATE POLICY "slots_insert_owner"
ON public.availability_slots FOR INSERT
TO authenticated
WITH CHECK (business_id = auth.uid());

CREATE POLICY "slots_update_owner"
ON public.availability_slots FOR UPDATE
TO authenticated
USING (business_id = auth.uid());

CREATE POLICY "slots_delete_owner"
ON public.availability_slots FOR DELETE
TO authenticated
USING (business_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);
CREATE INDEX IF NOT EXISTS idx_availability_business_id ON public.availability_slots(business_id);
CREATE INDEX IF NOT EXISTS idx_availability_starts_at ON public.availability_slots(starts_at);
CREATE INDEX IF NOT EXISTS idx_availability_is_booked ON public.availability_slots(is_booked);

-- ================================================
-- Updated Bookings table (enhance existing)
-- ================================================

-- Add business_id to existing bookings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN business_id uuid;
  END IF;
END
$$;

-- Add service_id reference if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'service_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Add starts_at/ends_at if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN starts_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN ends_at timestamptz;
  END IF;
END
$$;

-- Create additional RLS policies for business owner access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND policyname = 'bookings_select_owner'
  ) THEN
    CREATE POLICY "bookings_select_owner"
    ON public.bookings FOR SELECT
    TO authenticated
    USING (business_id = auth.uid());
  END IF;
END
$$;

-- Indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_starts_at ON public.bookings(starts_at);

-- ================================================
-- Trigger for updated_at on services
-- ================================================

CREATE OR REPLACE FUNCTION public.update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_services_updated_at ON public.services;
CREATE TRIGGER trigger_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_services_updated_at();