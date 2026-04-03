-- CRITICAL FIX: Remove all self-referencing policies on project_members
-- The "Members can view fellow members" policy causes recursion because
-- it queries project_members in the USING clause

-- Drop the problematic policy we just created
DROP POLICY IF EXISTS "Members can view fellow members" ON project_members;

-- The remaining policies are safe:
-- - "Users can view own membership" - only checks auth.uid() = user_id
-- - "Owners can view project members" - joins to projects table only
-- - "Owners can manage project members" - joins to projects table only
