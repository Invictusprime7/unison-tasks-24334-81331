-- Fix infinite recursion in project_members RLS policies
-- Drop ALL existing policies on project_members to start fresh
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can view project members for accessible projects" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can manage members" ON project_members;
DROP POLICY IF EXISTS "Owners can manage project members" ON project_members;
DROP POLICY IF EXISTS "Owners can view project members" ON project_members;

-- Create simple, non-recursive policies
-- 1. Users can see their own membership
CREATE POLICY "Users can view own membership" ON project_members
    FOR SELECT USING (user_id = auth.uid());

-- 2. Project owners can see all members of their projects (uses projects.owner_id, not project_members)
CREATE POLICY "Owners can view project members" ON project_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_members.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- 3. Project owners can manage members (add/remove)
CREATE POLICY "Owners can manage project members" ON project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_members.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- 4. Members can see other members of the same project (simple self-join, no recursion)
CREATE POLICY "Members can view fellow members" ON project_members
    FOR SELECT USING (
        project_id IN (
            SELECT pm.project_id FROM project_members pm 
            WHERE pm.user_id = auth.uid()
        )
    );
