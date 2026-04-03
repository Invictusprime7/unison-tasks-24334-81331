-- Fix infinite recursion in profiles RLS policy
-- The "Users can view project collaborators" policy causes recursion because
-- it queries project_members, which has policies that may query back to profiles

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view project collaborators" ON public.profiles;

-- Create a simpler policy that allows viewing all profiles (common pattern for user directories)
-- This is safe because profiles only contain public info (name, avatar)
CREATE POLICY "Users can view all profiles" 
ON public.profiles
FOR SELECT 
USING (auth.uid() IS NOT NULL);
