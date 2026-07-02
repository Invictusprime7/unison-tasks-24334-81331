
-- A2: Extend businesses with live profile fields backing the runtime.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS slug         text,
  ADD COLUMN IF NOT EXISTS industry     text,
  ADD COLUMN IF NOT EXISTS tagline      text,
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS logo_url     text,
  ADD COLUMN IF NOT EXISTS brand_color  text,
  ADD COLUMN IF NOT EXISTS website      text,
  ADD COLUMN IF NOT EXISTS phone        text,
  ADD COLUMN IF NOT EXISTS email        text,
  ADD COLUMN IF NOT EXISTS timezone     text        NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS address      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hours        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS settings     jsonb       NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique
  ON public.businesses (slug)
  WHERE slug IS NOT NULL;

-- updated_at auto-refresh
DROP TRIGGER IF EXISTS trigger_businesses_updated_at ON public.businesses;
CREATE TRIGGER trigger_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Public read of business profile fields is required so generated sites can
-- render hero/contact/hours/brand for anonymous visitors. Writes remain
-- member-only (existing policies are unchanged).
DROP POLICY IF EXISTS businesses_select_public ON public.businesses;
CREATE POLICY businesses_select_public
  ON public.businesses
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL    ON public.businesses TO service_role;
