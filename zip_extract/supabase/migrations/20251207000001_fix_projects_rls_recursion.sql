-- Fix infinite recursion in projects RLS policies
-- The issue is that projects policies reference project_members which references projects

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;
DROP POLICY IF EXISTS "Project admins can update projects" ON projects;

-- Recreate with simpler, non-recursive policies
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (owner_id = auth.uid());

-- Users can view projects where they are members
CREATE POLICY "Users can view projects they are members of" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_members.project_id = projects.id 
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage their projects" ON projects
    FOR ALL USING (owner_id = auth.uid());

-- For project_members table, ensure it doesn't create recursion
DROP POLICY IF EXISTS "Users can view project members for accessible projects" ON project_members;

CREATE POLICY "Users can view project members" ON project_members
    FOR SELECT USING (user_id = auth.uid());
