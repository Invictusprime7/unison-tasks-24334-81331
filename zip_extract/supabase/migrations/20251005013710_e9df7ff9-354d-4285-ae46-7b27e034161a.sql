-- Fix infinite recursion in projects RLS policy
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;

-- Recreate the policy with correct table reference
CREATE POLICY "Users can view projects they are members of"
ON projects
FOR SELECT
USING (
  (owner_id = auth.uid()) OR 
  (EXISTS (
    SELECT 1 
    FROM project_members 
    WHERE project_members.project_id = projects.id 
    AND project_members.user_id = auth.uid()
  ))
);