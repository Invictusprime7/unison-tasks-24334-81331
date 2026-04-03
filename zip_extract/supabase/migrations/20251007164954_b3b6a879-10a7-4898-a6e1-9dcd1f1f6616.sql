-- Fix infinite recursion in RLS policies
-- The issue occurs when tasks query joins projects table, causing circular dependency

-- Drop existing problematic policies on tasks
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their projects" ON tasks;

-- Recreate simplified policies without subqueries that cause recursion
-- For SELECT: Allow viewing tasks where user is project owner OR project member
CREATE POLICY "Users can view tasks in their projects" ON tasks
FOR SELECT
TO public
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM project_members 
    WHERE user_id = auth.uid()
  )
);

-- For INSERT: Allow creating tasks in owned or member projects
CREATE POLICY "Users can create tasks in their projects" ON tasks
FOR INSERT
TO public
WITH CHECK (
  created_by = auth.uid() AND
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM project_members 
    WHERE user_id = auth.uid()
  )
);

-- For UPDATE: Allow updating tasks in owned or member projects
CREATE POLICY "Users can update tasks in their projects" ON tasks
FOR UPDATE
TO public
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM project_members 
    WHERE user_id = auth.uid()
  )
);