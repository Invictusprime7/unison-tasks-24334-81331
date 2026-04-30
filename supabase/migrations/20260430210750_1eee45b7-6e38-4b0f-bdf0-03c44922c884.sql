-- Convert recipe pack identifier from uuid to text to support slug-based pack IDs
-- like "salon-starter", "contractor-pack", etc.

-- Drop FK constraint first
ALTER TABLE public.installed_recipe_packs
  DROP CONSTRAINT IF EXISTS installed_recipe_packs_pack_id_fkey;

-- Convert installed_recipe_packs.pack_id to text
ALTER TABLE public.installed_recipe_packs
  ALTER COLUMN pack_id TYPE text USING pack_id::text;

-- Convert automation_recipe_packs.pack_id to text and drop the uuid default
ALTER TABLE public.automation_recipe_packs
  ALTER COLUMN pack_id DROP DEFAULT;

ALTER TABLE public.automation_recipe_packs
  ALTER COLUMN pack_id TYPE text USING pack_id::text;

-- Re-create FK
ALTER TABLE public.installed_recipe_packs
  ADD CONSTRAINT installed_recipe_packs_pack_id_fkey
  FOREIGN KEY (pack_id) REFERENCES public.automation_recipe_packs(pack_id) ON DELETE CASCADE;

-- Helpful index for lookups by industry
CREATE INDEX IF NOT EXISTS idx_automation_recipe_packs_industry
  ON public.automation_recipe_packs(industry);
