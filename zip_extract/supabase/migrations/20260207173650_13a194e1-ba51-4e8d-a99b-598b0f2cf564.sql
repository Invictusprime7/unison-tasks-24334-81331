
-- Create Lucide Icon Registry for AI systems
CREATE TABLE public.lucide_icon_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  industry_relevance TEXT[] DEFAULT '{}',
  use_cases TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lucide_icon_registry ENABLE ROW LEVEL SECURITY;

-- Public read access (AI functions + any client can read)
CREATE POLICY "lucide_icons_select_public"
  ON public.lucide_icon_registry
  FOR SELECT
  USING (true);

-- Only service role can manage icons
CREATE POLICY "lucide_icons_manage_service"
  ON public.lucide_icon_registry
  FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Index for fast category/industry lookups
CREATE INDEX idx_lucide_icons_category ON public.lucide_icon_registry (category);
CREATE INDEX idx_lucide_icons_industry ON public.lucide_icon_registry USING GIN (industry_relevance);
CREATE INDEX idx_lucide_icons_tags ON public.lucide_icon_registry USING GIN (tags);
