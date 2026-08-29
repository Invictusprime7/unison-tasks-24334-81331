ALTER VIEW public.businesses_public SET (security_invoker = on);

DROP POLICY IF EXISTS businesses_select_storefront ON public.businesses;
CREATE POLICY businesses_select_storefront
  ON public.businesses
  FOR SELECT
  TO anon
  USING (true);