-- Canonical live form runtime: forms are business-owned definitions and every
-- submission records the tenant, rendered surface, consent, and dedupe key.

-- Earlier CRM migrations may be present in migration history even when a
-- restored environment no longer contains their tables. Recreate the canonical
-- tenant-safe foundations before extending them below.
CREATE TABLE IF NOT EXISTS public.crm_contacts (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
	project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
	email text,
	first_name text,
	last_name text,
	phone text,
	company text,
	tags text[] NOT NULL DEFAULT '{}',
	custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
	source text,
	user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_leads (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
	project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
	contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
	title text NOT NULL DEFAULT 'New lead',
	status text NOT NULL DEFAULT 'new',
	value numeric(12, 2),
	source text,
	notes text,
	email text,
	name text,
	intent text,
	metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_form_submissions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
	form_id text NOT NULL,
	form_name text,
	data jsonb NOT NULL DEFAULT '{}'::jsonb,
	source_url text,
	ip_address text,
	user_agent text,
	workflow_triggered boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_contacts
	ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.crm_leads
	ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS email text,
	ADD COLUMN IF NOT EXISTS name text,
	ADD COLUMN IF NOT EXISTS intent text,
	ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.crm_form_submissions
	ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_business_id
	ON public.crm_contacts (business_id);

CREATE INDEX IF NOT EXISTS idx_crm_leads_business_created_at
	ON public.crm_leads (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_leads_metadata_gin
	ON public.crm_leads USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_crm_form_submissions_business_id
	ON public.crm_form_submissions (business_id);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_form_submissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts, public.crm_leads TO authenticated;
GRANT SELECT ON public.crm_form_submissions TO authenticated;
GRANT ALL ON public.crm_contacts, public.crm_leads, public.crm_form_submissions TO service_role;

DROP POLICY IF EXISTS "crm_contacts_business_member" ON public.crm_contacts;
CREATE POLICY "crm_contacts_business_member"
	ON public.crm_contacts FOR ALL TO authenticated
	USING (business_id IS NOT NULL AND public.is_business_member(business_id))
	WITH CHECK (business_id IS NOT NULL AND public.is_business_member(business_id));

DROP POLICY IF EXISTS "crm_leads_business_member" ON public.crm_leads;
CREATE POLICY "crm_leads_business_member"
	ON public.crm_leads FOR ALL TO authenticated
	USING (business_id IS NOT NULL AND public.is_business_member(business_id))
	WITH CHECK (business_id IS NOT NULL AND public.is_business_member(business_id));

CREATE TABLE IF NOT EXISTS public.form_definitions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
	project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
	site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
	external_id TEXT NOT NULL,
	name TEXT NOT NULL,
	intent TEXT NOT NULL CHECK (intent IN (
		'contact.submit',
		'quote.request',
		'booking.request',
		'newsletter.subscribe',
		'application.submit'
	)),
	fields JSONB NOT NULL DEFAULT '[]'::jsonb,
	destination JSONB NOT NULL DEFAULT '{}'::jsonb,
	success_behavior JSONB NOT NULL DEFAULT '{}'::jsonb,
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (business_id, project_id, site_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_form_definitions_business_project
	ON public.form_definitions (business_id, project_id, site_id)
	WHERE is_active = true;

ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_definitions TO authenticated;
GRANT ALL ON public.form_definitions TO service_role;

CREATE POLICY "form_definitions_member_read"
	ON public.form_definitions FOR SELECT TO authenticated
	USING (public.is_business_member(business_id));

CREATE POLICY "form_definitions_member_write"
	ON public.form_definitions FOR ALL TO authenticated
	USING (public.is_business_member(business_id))
	WITH CHECK (public.is_business_member(business_id));

ALTER TABLE public.crm_form_submissions
	ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS snapshot_id TEXT,
	ADD COLUMN IF NOT EXISTS page_id TEXT,
	ADD COLUMN IF NOT EXISTS component_id TEXT,
	ADD COLUMN IF NOT EXISTS intent TEXT,
	ADD COLUMN IF NOT EXISTS referrer TEXT,
	ADD COLUMN IF NOT EXISTS utm_source TEXT,
	ADD COLUMN IF NOT EXISTS utm_medium TEXT,
	ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
	ADD COLUMN IF NOT EXISTS consent_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
	ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.crm_contacts
	ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.crm_leads
	ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_form_submissions_tenant
	ON public.crm_form_submissions (business_id, project_id, site_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_email
	ON public.crm_contacts (business_id, project_id, lower(email));

CREATE INDEX IF NOT EXISTS idx_crm_leads_tenant
	ON public.crm_leads (business_id, project_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_form_submissions_idempotency
	ON public.crm_form_submissions (business_id, idempotency_key)
	WHERE idempotency_key IS NOT NULL;

-- Browser clients may submit only through the Edge Function. Service-role
-- execution is server-controlled and performs tenant validation below.
REVOKE INSERT, UPDATE, DELETE ON public.crm_form_submissions FROM anon, authenticated;

CREATE POLICY "crm_form_submissions_select_business_member"
	ON public.crm_form_submissions FOR SELECT TO authenticated
	USING (business_id IS NOT NULL AND public.is_business_member(business_id));
