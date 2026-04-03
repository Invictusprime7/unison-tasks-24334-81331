-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;

-- Create new non-recursive policy for projects
CREATE POLICY "Users can view own projects"
ON public.projects
FOR SELECT
USING (owner_id = auth.uid());

-- Create policy to also allow viewing projects where user is a member (no subquery to projects)
CREATE POLICY "Members can view joined projects"
ON public.projects
FOR SELECT
USING (
  id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- Create simple policy for project_members - users can view memberships they're part of
CREATE POLICY "Users can view own memberships"
ON public.project_members
FOR SELECT
USING (user_id = auth.uid());

-- Allow project owners to view all members of their projects
CREATE POLICY "Owners can view project members"
ON public.project_members
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
  )
);

-- Allow project owners to manage (insert/update/delete) members
CREATE POLICY "Owners can manage project members"
ON public.project_members
FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
  )
);