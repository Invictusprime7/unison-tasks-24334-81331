-- Drop existing INSERT policy
DROP POLICY IF EXISTS "ai_plugin_instances_insert_member" ON public.ai_plugin_instances;

-- Create new INSERT policy that allows business owners OR members
CREATE POLICY "ai_plugin_instances_insert_owner_or_member" 
ON public.ai_plugin_instances 
FOR INSERT 
WITH CHECK (
  is_business_member(business_id) 
  OR EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_id AND b.owner_id = auth.uid()
  )
);

-- Also update SELECT policy to include owners
DROP POLICY IF EXISTS "ai_plugin_instances_select_member" ON public.ai_plugin_instances;
CREATE POLICY "ai_plugin_instances_select_owner_or_member" 
ON public.ai_plugin_instances 
FOR SELECT 
USING (
  is_business_member(business_id) 
  OR EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_id AND b.owner_id = auth.uid()
  )
);

-- Update UPDATE policy
DROP POLICY IF EXISTS "ai_plugin_instances_update_member" ON public.ai_plugin_instances;
CREATE POLICY "ai_plugin_instances_update_owner_or_member" 
ON public.ai_plugin_instances 
FOR UPDATE 
USING (
  is_business_member(business_id) 
  OR EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_id AND b.owner_id = auth.uid()
  )
);

-- Update DELETE policy
DROP POLICY IF EXISTS "ai_plugin_instances_delete_member" ON public.ai_plugin_instances;
CREATE POLICY "ai_plugin_instances_delete_owner_or_member" 
ON public.ai_plugin_instances 
FOR DELETE 
USING (
  is_business_member(business_id) 
  OR EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_id AND b.owner_id = auth.uid()
  )
);