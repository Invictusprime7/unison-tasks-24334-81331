-- Row Level Security Policies for Complete Project Management System
-- This migration adds comprehensive RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (true); -- Allow viewing basic public info

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization owners can manage their organization" ON organizations
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Organization admins can update organization" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- Organization members policies
CREATE POLICY "Users can view organization members they belong to" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization owners and admins can manage members" ON organization_members
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- Projects policies
CREATE POLICY "Users can view projects they have access to" ON projects
    FOR SELECT USING (
        owner_id = auth.uid() OR
        visibility = 'public' OR
        id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = auth.uid()
        ) OR
        (visibility = 'organization' AND organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        ))
    );

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners can manage their projects" ON projects
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Project admins can update projects" ON projects
    FOR UPDATE USING (
        id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Project members policies
CREATE POLICY "Users can view project members for accessible projects" ON project_members
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = auth.uid() OR
            visibility = 'public' OR
            id IN (
                SELECT project_id 
                FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Project owners and admins can manage members" ON project_members
    FOR ALL USING (
        project_id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        ) OR
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Tasks policies
CREATE POLICY "Users can view tasks in accessible projects" ON tasks
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = auth.uid() OR
            visibility = 'public' OR
            id IN (
                SELECT project_id 
                FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create tasks in accessible projects" ON tasks
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = auth.uid()
        ) OR
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tasks they created or are assigned to" ON tasks
    FOR UPDATE USING (
        reporter_id = auth.uid() OR
        assignee_id = auth.uid() OR
        project_id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Task comments policies
CREATE POLICY "Users can view comments on accessible tasks" ON task_comments
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE project_id IN (
                SELECT id FROM projects 
                WHERE owner_id = auth.uid() OR
                visibility = 'public' OR
                id IN (
                    SELECT project_id 
                    FROM project_members 
                    WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can create comments on accessible tasks" ON task_comments
    FOR INSERT WITH CHECK (
        task_id IN (
            SELECT id FROM tasks 
            WHERE project_id IN (
                SELECT project_id 
                FROM project_members 
                WHERE user_id = auth.uid()
            ) OR
            project_id IN (
                SELECT id FROM projects WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own comments" ON task_comments
    FOR UPDATE USING (author_id = auth.uid());

-- Time tracking policies
CREATE POLICY "Users can view time sessions for accessible tasks" ON time_tracking_sessions
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE project_id IN (
                SELECT project_id 
                FROM project_members 
                WHERE user_id = auth.uid()
            ) OR
            project_id IN (
                SELECT id FROM projects WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create their own time sessions" ON time_tracking_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own time sessions" ON time_tracking_sessions
    FOR ALL USING (user_id = auth.uid());

-- Folders policies
CREATE POLICY "Users can view accessible folders" ON folders
    FOR SELECT USING (
        owner_id = auth.uid() OR
        project_id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = auth.uid()
        ) OR
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        ) OR
        permission = 'public'
    );

CREATE POLICY "Users can create folders" ON folders
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Folder owners can manage their folders" ON folders
    FOR ALL USING (owner_id = auth.uid());

-- Files policies
CREATE POLICY "Users can view accessible files" ON files
    FOR SELECT USING (
        owner_id = auth.uid() OR
        project_id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = auth.uid()
        ) OR
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        ) OR
        permission = 'public'
    );

CREATE POLICY "Users can create files" ON files
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "File owners can manage their files" ON files
    FOR ALL USING (owner_id = auth.uid());

-- File comments policies
CREATE POLICY "Users can view comments on accessible files" ON file_comments
    FOR SELECT USING (
        file_id IN (
            SELECT id FROM files 
            WHERE owner_id = auth.uid() OR
            project_id IN (
                SELECT project_id 
                FROM project_members 
                WHERE user_id = auth.uid()
            ) OR
            permission = 'public'
        )
    );

CREATE POLICY "Users can comment on accessible files" ON file_comments
    FOR INSERT WITH CHECK (
        file_id IN (
            SELECT id FROM files 
            WHERE owner_id = auth.uid() OR
            project_id IN (
                SELECT project_id 
                FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own file comments" ON file_comments
    FOR UPDATE USING (author_id = auth.uid());

-- Templates policies
CREATE POLICY "Users can view accessible templates" ON templates
    FOR SELECT USING (
        owner_id = auth.uid() OR
        visibility = 'public' OR
        (visibility = 'organization' AND project_id IN (
            SELECT id FROM projects 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid() AND is_active = true
            )
        ))
    );

CREATE POLICY "Users can create templates" ON templates
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Template owners can manage their templates" ON templates
    FOR ALL USING (owner_id = auth.uid());

-- Page layouts policies
CREATE POLICY "Users can view accessible layouts" ON page_layouts
    FOR SELECT USING (
        owner_id = auth.uid() OR
        visibility = 'public' OR
        project_id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create layouts" ON page_layouts
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Layout owners can manage their layouts" ON page_layouts
    FOR ALL USING (owner_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can only see their own notifications" ON notifications
    FOR ALL USING (user_id = auth.uid());

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());