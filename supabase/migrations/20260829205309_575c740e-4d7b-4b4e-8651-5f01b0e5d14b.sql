DROP POLICY IF EXISTS businesses_select_public ON public.businesses;

CREATE OR REPLACE VIEW public.businesses_public
WITH (security_invoker = off) AS
SELECT
  id,
  name,
  slug,
  industry,
  tagline,
  description,
  logo_url,
  brand_color,
  website,
  timezone,
  address,
  hours,
  social_links,
  updated_at
FROM public.businesses;

REVOKE ALL ON public.businesses_public FROM PUBLIC;
GRANT SELECT ON public.businesses_public TO anon, authenticated;
REVOKE SELECT ON public.businesses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;