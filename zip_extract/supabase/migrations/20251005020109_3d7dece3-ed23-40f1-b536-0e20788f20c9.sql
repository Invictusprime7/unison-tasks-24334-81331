-- Fix infinite recursion in shared_files RLS policy
DROP POLICY IF EXISTS "Users can view shares of their files" ON shared_files;

CREATE POLICY "Users can view shares of their files"
ON shared_files
FOR SELECT
USING (
  shared_by = auth.uid() 
  OR shared_with = auth.uid() 
  OR is_public = true
);

-- Fix infinite recursion in projects RLS policy
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;

CREATE POLICY "Users can view projects they are members of"
ON projects
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = projects.id 
    AND pm.user_id = auth.uid()
  )
);