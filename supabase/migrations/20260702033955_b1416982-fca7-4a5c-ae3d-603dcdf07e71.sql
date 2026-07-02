-- Track B: Universal Catalog Runtime — foundational schema
-- Adds catalog_collections + site_data_bindings and normalizes catalog tables
-- so generated sections can bind to live business data.

-- ────────────────────────────────────────────────────────────────
-- 1. catalog_collections — Shopify-style collection abstraction that
--    works for products, services, menu_items, pricing_plans, offers…
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalog_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL,               -- 'product' | 'service' | 'menu_item' | 'pricing_plan' | 'offer' | 'project' | 'testimonial'
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_item_ids uuid[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, kind, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_collections TO authenticated;
GRANT SELECT ON public.catalog_collections TO anon;
GRANT ALL ON public.catalog_collections TO service_role;

ALTER TABLE public.catalog_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_collections_select_public_active"
  ON public.catalog_collections FOR SELECT
  USING (is_active = true);

CREATE POLICY "catalog_collections_member_all"
  ON public.catalog_collections FOR ALL
  TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE TRIGGER trg_catalog_collections_updated_at
  BEFORE UPDATE ON public.catalog_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_catalog_collections_business_kind
  ON public.catalog_collections (business_id, kind, is_active);

-- ────────────────────────────────────────────────────────────────
-- 2. site_data_bindings — connects a generated section/slot to a
--    live catalog data source. This is the missing "data intent"
--    counterpart to site_intent_bindings.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_data_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_id text,
  page_path text NOT NULL,
  section_id text NOT NULL,
  slot_key text,
  binding_type text NOT NULL DEFAULT 'section',   -- 'section' | 'slot' | 'card'
  source_kind text NOT NULL,                      -- CatalogKind
  source_table text NOT NULL,                     -- physical table
  collection_id uuid REFERENCES public.catalog_collections(id) ON DELETE SET NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort jsonb NOT NULL DEFAULT '{}'::jsonb,
  limit_count int,
  display_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  fallback_mode text NOT NULL DEFAULT 'empty_state', -- 'empty_state' | 'hide_section' | 'show_placeholder'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, page_path, section_id, slot_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_data_bindings TO authenticated;
GRANT SELECT ON public.site_data_bindings TO anon;
GRANT ALL ON public.site_data_bindings TO service_role;

ALTER TABLE public.site_data_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_data_bindings_select_public"
  ON public.site_data_bindings FOR SELECT
  USING (true);

CREATE POLICY "site_data_bindings_member_write"
  ON public.site_data_bindings FOR ALL
  TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE TRIGGER trg_site_data_bindings_updated_at
  BEFORE UPDATE ON public.site_data_bindings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_site_data_bindings_project_page
  ON public.site_data_bindings (project_id, page_path);

-- ────────────────────────────────────────────────────────────────
-- 3. Normalize catalog rows for universal binding
--    (services + products get slug/featured/sort_order/image_url when missing)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_services_business_featured
  ON public.services (business_id, is_active, featured, sort_order);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_business_featured
  ON public.products (business_id, is_active, featured, sort_order);

-- ────────────────────────────────────────────────────────────────
-- 4. menu_items and pricing_plans — new universal catalog tables
--    for restaurant + saas/agency verticals.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  description text,
  price_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  category text,
  image_url text,
  dietary_tags text[] NOT NULL DEFAULT '{}',
  available boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT SELECT ON public.menu_items TO anon;
GRANT ALL ON public.menu_items TO service_role;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_items_select_public_available"
  ON public.menu_items FOR SELECT USING (available = true);

CREATE POLICY "menu_items_member_all"
  ON public.menu_items FOR ALL TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_menu_items_business_available
  ON public.menu_items (business_id, available, featured, sort_order);

CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  description text,
  price_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  billing_interval text,           -- 'month' | 'year' | 'one_time'
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlighted boolean NOT NULL DEFAULT false,
  cta_intent text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_plans TO authenticated;
GRANT SELECT ON public.pricing_plans TO anon;
GRANT ALL ON public.pricing_plans TO service_role;

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_plans_select_public_active"
  ON public.pricing_plans FOR SELECT USING (is_active = true);

CREATE POLICY "pricing_plans_member_all"
  ON public.pricing_plans FOR ALL TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE TRIGGER trg_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_pricing_plans_business_active
  ON public.pricing_plans (business_id, is_active, highlighted, sort_order);
