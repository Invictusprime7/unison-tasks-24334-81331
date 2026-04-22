-- Core Schema for Complete Project Management System
-- This migration creates all tables needed for the comprehensive schema system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (enhanced)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    
    -- Profile Information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT,
    bio TEXT,
    title TEXT,
    company TEXT,
    location TEXT,
    
    -- Avatar & Media
    avatar TEXT,
    cover_image TEXT,
    
    -- Contact Information
    phone TEXT,
    
    -- System Information
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'designer', 'developer', 'client', 'viewer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended', 'deleted')),
    
    -- Account Settings
    is_email_verified BOOLEAN DEFAULT false,
    is_phone_verified BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    
    -- Subscription & Billing
    subscription JSONB,
    
    -- Preferences & Settings
    preferences JSONB,
    
    -- Social & Professional
    social_links JSONB,
    skills JSONB DEFAULT '[]'::jsonb,
    
    -- Activity & Analytics
    activity JSONB,
    
    -- Team & Collaboration
    team_ids TEXT[] DEFAULT '{}',
    project_ids TEXT[] DEFAULT '{}',
    
    -- Security
    last_password_change_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Contact information
    website TEXT,
    email TEXT,
    phone TEXT,
    
    -- Address
    address JSONB,
    
    -- Visual identity
    logo TEXT,
    avatar TEXT,
    
    -- Status and plan
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'canceled', 'deleted')),
    
    -- Owner
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Billing and subscription
    billing JSONB,
    
    -- Settings and configuration
    settings JSONB,
    
    -- Metadata
    industry TEXT,
    size TEXT CHECK (size IN ('1-10', '11-50', '51-200', '201-1000', '1000+')),
    
    -- Statistics
    project_count INTEGER DEFAULT 0,
    member_count INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer', 'billing')),
    permissions TEXT[] DEFAULT '{}',
    title TEXT,
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES users(id),
    
    UNIQUE(organization_id, user_id)
);

-- Projects table (enhanced)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Classification
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'canceled', 'archived')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    category TEXT,
    
    -- Dates and Timeline
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Ownership and Organization
    owner_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Team and Access
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'organization', 'public')),
    
    -- Progress and Metrics
    progress REAL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 100.0),
    budget DECIMAL(12, 2),
    
    -- Settings and Configuration
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Visual and Branding
    color TEXT,
    icon TEXT,
    cover_image TEXT,
    
    -- Metadata and Tags
    tags TEXT[] DEFAULT '{}',
    
    -- Analytics and Timeline
    analytics JSONB DEFAULT '{}'::jsonb,
    timeline_events JSONB DEFAULT '[]'::jsonb,
    
    -- Templates and Inheritance
    template_id UUID,
    is_template BOOLEAN DEFAULT false,
    
    -- Status flags
    is_archived BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project members
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions TEXT[] DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES users(id),
    
    UNIQUE(project_id, user_id)
);

-- Tasks table (enhanced)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Classification and Status
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'blocked', 'completed', 'canceled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    type TEXT DEFAULT 'task' CHECK (type IN ('task', 'bug', 'feature', 'improvement', 'research', 'design')),
    
    -- Assignment and Ownership
    assignee_id UUID REFERENCES users(id),
    reporter_id UUID NOT NULL REFERENCES users(id),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Dates and Time Management
    due_date TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- Estimation and Tracking
    estimated_hours REAL,
    actual_hours REAL DEFAULT 0,
    story_points INTEGER,
    
    -- Progress and Completion
    progress REAL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 100.0),
    
    -- Dependencies and Relationships
    parent_task_id UUID REFERENCES tasks(id),
    dependencies JSONB DEFAULT '[]'::jsonb,
    
    -- Organization and Categorization
    labels TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Attachments and Files
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Custom fields and metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task comments
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES task_comments(id),
    
    -- Attachments and mentions
    attachments JSONB DEFAULT '[]'::jsonb,
    mentions JSONB DEFAULT '[]'::jsonb,
    
    -- Status and visibility
    is_internal BOOLEAN DEFAULT false,
    is_edited BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time tracking sessions
CREATE TABLE time_tracking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    description TEXT,
    
    -- Time tracking
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    
    -- Billing and rates
    billable BOOLEAN DEFAULT false,
    hourly_rate DECIMAL(8, 2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files and folders
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES folders(id),
    path TEXT NOT NULL,
    depth INTEGER DEFAULT 0,
    
    -- Ownership
    owner_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    
    -- Permissions
    permission TEXT DEFAULT 'private' CHECK (permission IN ('private', 'team', 'project', 'public')),
    
    -- Organization
    tags JSONB DEFAULT '[]'::jsonb,
    color TEXT,
    icon TEXT,
    
    -- Statistics
    file_count INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0,
    
    -- Settings
    is_archived BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    description TEXT,
    
    -- File Properties
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'document', 'archive', 'code', 'font', 'other')),
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL,
    hash TEXT,
    
    -- Storage
    url TEXT NOT NULL,
    path TEXT NOT NULL,
    bucket TEXT DEFAULT 'files',
    
    -- Status & Permissions
    status TEXT DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'failed', 'deleted')),
    permission TEXT DEFAULT 'private' CHECK (permission IN ('private', 'team', 'project', 'public')),
    
    -- Ownership
    owner_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    folder_id UUID REFERENCES folders(id),
    
    -- Versioning
    versions JSONB DEFAULT '[]'::jsonb,
    current_version TEXT,
    
    -- Metadata
    metadata JSONB,
    
    -- Organization
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Analytics
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Settings
    is_public BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    
    -- AI Enhancement
    ai_analysis JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- File comments
CREATE TABLE file_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    coordinates JSONB, -- for image annotations
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table (enhanced from existing schema)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Template content and structure
    layers JSONB NOT NULL DEFAULT '[]'::jsonb,
    frames JSONB DEFAULT '[]'::jsonb,
    
    -- Dimensions and canvas
    width REAL NOT NULL DEFAULT 800,
    height REAL NOT NULL DEFAULT 600,
    background_color TEXT DEFAULT '#ffffff',
    
    -- Metadata and classification
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Ownership and visibility
    owner_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'organization', 'public')),
    
    -- Template specific properties
    is_premium BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    version TEXT DEFAULT '1.0.0',
    
    -- Usage analytics
    usage_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    -- Thumbnails and preview
    thumbnail TEXT,
    preview_images TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Page layouts
CREATE TABLE page_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Layout type and category
    type TEXT NOT NULL CHECK (type IN ('dashboard', 'project_detail', 'task_detail', 'design_studio', 'file_manager', 'user_profile', 'team_management', 'analytics', 'settings', 'auth', 'landing', 'pricing', 'documentation', 'custom')),
    category TEXT,
    
    -- Layout structure
    components JSONB DEFAULT '[]'::jsonb,
    
    -- Global layout settings
    settings JSONB,
    
    -- Layout metadata
    metadata JSONB,
    
    -- Access control
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'organization', 'public')),
    permissions JSONB,
    
    -- Ownership
    owner_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    template_id UUID REFERENCES templates(id),
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    is_template BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    
    -- Usage analytics
    analytics JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Content
    title TEXT NOT NULL,
    message TEXT,
    
    -- Classification
    type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_completed', 'task_overdue', 'task_comment', 'project_created', 'project_updated', 'project_deleted', 'team_invitation', 'team_member_added', 'team_member_removed', 'file_uploaded', 'file_shared', 'template_shared', 'system_update', 'billing_update', 'security_alert', 'mention', 'like', 'follow', 'custom')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    category TEXT,
    
    -- Recipients
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    
    -- Status & State
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'deleted')),
    channels TEXT[] DEFAULT '{"in_app"}',
    
    -- Metadata & Context
    metadata JSONB,
    
    -- Interaction
    actions JSONB DEFAULT '[]'::jsonb,
    
    -- Delivery
    scheduled_for TIMESTAMP WITH TIME ZONE,
    delivered_at JSONB,
    
    -- Engagement
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Settings
    is_groupable BOOLEAN DEFAULT true,
    is_actionable BOOLEAN DEFAULT false,
    requires_confirmation BOOLEAN DEFAULT false
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    
    -- Channel preferences
    in_app BOOLEAN DEFAULT true,
    email BOOLEAN DEFAULT true,
    push BOOLEAN DEFAULT false,
    sms BOOLEAN DEFAULT false,
    
    -- Timing preferences
    immediate BOOLEAN DEFAULT true,
    digest BOOLEAN DEFAULT false,
    digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('hourly', 'daily', 'weekly')),
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    
    -- Filtering
    priority TEXT[] DEFAULT '{"medium", "high", "critical"}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, type)
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_files_owner_id ON files(owner_id);
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_templates_owner_id ON templates(owner_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_page_layouts_updated_at BEFORE UPDATE ON page_layouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();