-- Fix RLS policy for installed_recipe_packs to properly support INSERT/UPDATE
-- The original policy used FOR ALL USING which doesn't work correctly for INSERT
-- We need separate policies with proper WITH CHECK clauses

-- Drop existing policy
DROP POLICY IF EXISTS "installed_recipe_packs_owner" ON public.installed_recipe_packs;

-- Create proper policies for each operation
CREATE POLICY "installed_recipe_packs_select" ON public.installed_recipe_packs 
  FOR SELECT 
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "installed_recipe_packs_insert" ON public.installed_recipe_packs 
  FOR INSERT 
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "installed_recipe_packs_update" ON public.installed_recipe_packs 
  FOR UPDATE 
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "installed_recipe_packs_delete" ON public.installed_recipe_packs 
  FOR DELETE 
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );
