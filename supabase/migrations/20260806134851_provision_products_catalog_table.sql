-- Restore the catalog table used by ProductGrid, CMS resource operations, and
-- checkout tooling. The table may be absent on legacy deployments even when
-- older product migrations are recorded.
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'USD',
  image_url text,
  category text,
  inventory_count integer NOT NULL DEFAULT 0 CHECK (inventory_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  slug text,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_business_featured
  ON public.products (business_id, is_active, featured, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_business_slug
  ON public.products (business_id, slug)
  WHERE slug IS NOT NULL;

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;
DROP POLICY IF EXISTS "products_select_member_or_public" ON public.products;
DROP POLICY IF EXISTS "products_manage_member" ON public.products;
DROP POLICY IF EXISTS "products_select_public_active" ON public.products;
DROP POLICY IF EXISTS "products_member_read" ON public.products;
DROP POLICY IF EXISTS "products_insert_editor" ON public.products;
DROP POLICY IF EXISTS "products_update_editor" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;

CREATE POLICY "products_select_public_active"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "products_member_read"
  ON public.products FOR SELECT TO authenticated
  USING (public.business_has_permission(business_id, 'catalog.read'));

CREATE POLICY "products_insert_editor"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));

CREATE POLICY "products_update_editor"
  ON public.products FOR UPDATE TO authenticated
  USING (public.business_has_permission(business_id, 'catalog.write'))
  WITH CHECK (public.business_has_permission(business_id, 'catalog.write'));

CREATE POLICY "products_delete_admin"
  ON public.products FOR DELETE TO authenticated
  USING (public.business_has_permission(business_id, 'catalog.delete'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.products'::regclass
      AND tgname = 'trg_products_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
  END IF;
END;
$$;