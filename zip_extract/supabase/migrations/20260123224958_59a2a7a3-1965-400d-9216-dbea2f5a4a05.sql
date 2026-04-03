-- Add metadata column to store source context (page, intent, timestamp, etc.)
ALTER TABLE public.crm_leads
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_crm_leads_business_created_at
ON public.crm_leads (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_leads_metadata_gin
ON public.crm_leads USING gin (metadata);