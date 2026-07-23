-- Canonical live form runtime: forms are business-owned definitions and every
-- submission records the tenant, rendered surface, consent, and dedupe key.

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
