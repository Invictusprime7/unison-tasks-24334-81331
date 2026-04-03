-- ============================================
-- ENTERPRISE HARDENING MIGRATION
-- ============================================
-- This migration adds enterprise-grade governance, audit logging,
-- resource quotas, and security controls

-- ============================================
-- 1. AUDIT LOGS TABLE
-- ============================================
-- Tracks who changed what, when, from where

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who performed the action
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    
    -- Organization context
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- What happened
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'access', 'export', etc.
    resource_type TEXT NOT NULL, -- 'project', 'task', 'file', 'user', 'organization', 'preview_session', etc.
    resource_id UUID,
    resource_name TEXT,
    
    -- Change details
    changes JSONB, -- { field: { old: value, new: value } }
    metadata JSONB, -- Additional context
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    session_id TEXT,
    
    -- Geo information
    country_code TEXT,
    city TEXT,
    
    -- Status
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
    error_message TEXT,
    
    -- Timing
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);

-- ============================================
-- 2. ORGANIZATION QUOTAS & USAGE
-- ============================================
-- Per-organization resource limits and tracking

CREATE TABLE organization_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Plan-based limits
    plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'business', 'enterprise')),
    
    -- Project limits
    max_projects INTEGER DEFAULT 1,
    max_projects_storage_gb DECIMAL(10, 2) DEFAULT 0.1,
    
    -- Preview session limits
    max_concurrent_sessions INTEGER DEFAULT 2,
    max_session_duration_minutes INTEGER DEFAULT 30,
    max_sessions_per_day INTEGER DEFAULT 20,
    
    -- AI generation limits
    max_ai_generations_per_month INTEGER DEFAULT 10,
    
    -- Team limits
    max_team_members INTEGER DEFAULT 1,
    
    -- File limits
    max_file_size_mb INTEGER DEFAULT 10,
    max_total_storage_gb DECIMAL(10, 2) DEFAULT 0.1,
    
    -- API rate limits
    api_rate_limit_per_minute INTEGER DEFAULT 60,
    
    -- Feature flags
    features JSONB DEFAULT '{
        "custom_domains": false,
        "white_label": false,
        "sso": false,
        "advanced_analytics": false,
        "priority_support": false,
        "api_access": false,
        "webhooks": false,
        "audit_logs_access": false
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- Real-time usage tracking
CREATE TABLE organization_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Period tracking
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Current usage
    projects_count INTEGER DEFAULT 0,
    active_sessions_count INTEGER DEFAULT 0,
    sessions_today INTEGER DEFAULT 0,
    ai_generations_this_month INTEGER DEFAULT 0,
    team_members_count INTEGER DEFAULT 0,
    storage_used_bytes BIGINT DEFAULT 0,
    api_calls_this_minute INTEGER DEFAULT 0,
    api_calls_last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Historical aggregates
    total_sessions_this_period INTEGER DEFAULT 0,
    total_session_minutes_this_period INTEGER DEFAULT 0,
    total_api_calls_this_period BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, period_start)
);

-- ============================================
-- 3. PREVIEW SESSIONS TABLE
-- ============================================
-- Persistent session tracking for governance

CREATE TABLE preview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token TEXT UNIQUE NOT NULL, -- Opaque token, not guessable UUID
    
    -- Ownership (sessions must be owned)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Session state
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'starting', 'running', 'stopped', 'error', 'timeout', 'quota_exceeded'
    )),
    
    -- Container info
    container_id TEXT,
    container_port INTEGER,
    worker_node TEXT, -- For multi-node deployments
    
    -- URLs
    preview_url TEXT,
    
    -- Resource usage
    cpu_usage_percent DECIMAL(5, 2),
    memory_usage_mb INTEGER,
    network_egress_bytes BIGINT DEFAULT 0,
    disk_usage_mb INTEGER,
    
    -- Limits applied to this session
    max_cpu_percent DECIMAL(5, 2) DEFAULT 25.0,
    max_memory_mb INTEGER DEFAULT 256,
    max_disk_mb INTEGER DEFAULT 100,
    max_duration_minutes INTEGER DEFAULT 30,
    
    -- Activity tracking
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_ping_at TIMESTAMP WITH TIME ZONE,
    files_patched_count INTEGER DEFAULT 0,
    
    -- Error tracking
    error_message TEXT,
    error_code TEXT,
    
    -- Request context (for audit)
    created_from_ip INET,
    created_user_agent TEXT,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_preview_sessions_user ON preview_sessions(user_id);
CREATE INDEX idx_preview_sessions_org ON preview_sessions(organization_id);
CREATE INDEX idx_preview_sessions_status ON preview_sessions(status);
CREATE INDEX idx_preview_sessions_token ON preview_sessions(session_token);
CREATE INDEX idx_preview_sessions_activity ON preview_sessions(last_activity_at);

-- ============================================
-- 4. ENVIRONMENTS TABLE
-- ============================================
-- Separation of dev/staging/prod

CREATE TABLE environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Environment info
    name TEXT NOT NULL CHECK (name IN ('development', 'staging', 'production')),
    slug TEXT NOT NULL, -- e.g., 'dev', 'staging', 'prod'
    
    -- Deployment info
    url TEXT,
    custom_domain TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deploying', 'failed', 'suspended')),
    last_deployed_at TIMESTAMP WITH TIME ZONE,
    last_deployed_by UUID REFERENCES users(id),
    
    -- Version tracking
    current_version TEXT,
    previous_version TEXT,
    
    -- Environment variables (encrypted in practice)
    env_vars JSONB DEFAULT '{}'::jsonb,
    
    -- Access control
    protection_level TEXT DEFAULT 'none' CHECK (protection_level IN ('none', 'password', 'auth', 'ip_whitelist')),
    allowed_ips INET[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, name)
);

-- ============================================
-- 5. API KEYS TABLE
-- ============================================
-- For programmatic access

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Ownership
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Key info
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    key_hash TEXT NOT NULL, -- Hashed full key
    
    -- Permissions
    scopes TEXT[] DEFAULT '{}', -- ['read:projects', 'write:files', etc.]
    
    -- Limits
    rate_limit_per_minute INTEGER DEFAULT 60,
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_ip INET,
    total_requests BIGINT DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);

-- ============================================
-- 6. SECURITY EVENTS TABLE
-- ============================================
-- Tracks security-relevant events

CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event type
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login_success', 'login_failure', 'logout',
        'password_change', 'password_reset_request',
        'mfa_enabled', 'mfa_disabled', 'mfa_challenge_success', 'mfa_challenge_failure',
        'api_key_created', 'api_key_revoked',
        'permission_change', 'role_change',
        'suspicious_activity', 'rate_limit_exceeded',
        'session_created', 'session_terminated',
        'data_export', 'bulk_delete'
    )),
    
    -- Actor
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    
    -- Target (if different from actor)
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_resource_type TEXT,
    target_resource_id UUID,
    
    -- Context
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    country_code TEXT,
    
    -- Event details
    details JSONB,
    
    -- Risk scoring
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Follow-up
    requires_action BOOLEAN DEFAULT false,
    action_taken TEXT,
    action_taken_by UUID REFERENCES users(id),
    action_taken_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_org ON security_events(organization_id);
CREATE INDEX idx_security_events_risk ON security_events(risk_level);
CREATE INDEX idx_security_events_created ON security_events(created_at DESC);

-- ============================================
-- 7. RBAC PERMISSIONS TABLE
-- ============================================
-- Custom permissions beyond basic roles

CREATE TABLE rbac_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- The permission
    name TEXT UNIQUE NOT NULL, -- e.g., 'projects:create', 'files:delete', 'billing:view'
    description TEXT,
    category TEXT, -- 'projects', 'files', 'team', 'billing', 'admin'
    
    -- Hierarchy
    parent_permission TEXT REFERENCES rbac_permissions(name),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom roles beyond org defaults
CREATE TABLE rbac_custom_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Permissions granted by this role
    permissions TEXT[] DEFAULT '{}',
    
    -- System or custom
    is_system BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, name)
);

-- User custom role assignments
CREATE TABLE rbac_user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES rbac_custom_roles(id) ON DELETE CASCADE,
    
    -- Project-scoped roles (optional)
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Assignment info
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, organization_id, role_id, project_id)
);

-- ============================================
-- 8. INSERT DEFAULT PERMISSIONS
-- ============================================

INSERT INTO rbac_permissions (name, description, category) VALUES
    -- Projects
    ('projects:view', 'View projects', 'projects'),
    ('projects:create', 'Create new projects', 'projects'),
    ('projects:edit', 'Edit existing projects', 'projects'),
    ('projects:delete', 'Delete projects', 'projects'),
    ('projects:publish', 'Publish projects', 'projects'),
    ('projects:manage_members', 'Manage project members', 'projects'),
    
    -- Files
    ('files:view', 'View files', 'files'),
    ('files:upload', 'Upload files', 'files'),
    ('files:edit', 'Edit files', 'files'),
    ('files:delete', 'Delete files', 'files'),
    ('files:share', 'Share files externally', 'files'),
    
    -- Preview
    ('preview:create', 'Create preview sessions', 'preview'),
    ('preview:view', 'View preview sessions', 'preview'),
    ('preview:manage', 'Manage preview sessions', 'preview'),
    
    -- Team
    ('team:view', 'View team members', 'team'),
    ('team:invite', 'Invite team members', 'team'),
    ('team:remove', 'Remove team members', 'team'),
    ('team:manage_roles', 'Manage team roles', 'team'),
    
    -- Billing
    ('billing:view', 'View billing information', 'billing'),
    ('billing:manage', 'Manage billing and subscriptions', 'billing'),
    
    -- Admin
    ('admin:view_audit_logs', 'View audit logs', 'admin'),
    ('admin:manage_settings', 'Manage organization settings', 'admin'),
    ('admin:manage_security', 'Manage security settings', 'admin'),
    ('admin:impersonate', 'Impersonate other users', 'admin')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Check if user has permission in organization
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_organization_id UUID,
    p_permission TEXT,
    p_project_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN := false;
    v_member_role TEXT;
BEGIN
    -- Get member role
    SELECT role INTO v_member_role
    FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_organization_id AND is_active = true;
    
    IF v_member_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Owner and admin have all permissions
    IF v_member_role IN ('owner', 'admin') THEN
        RETURN true;
    END IF;
    
    -- Check custom roles
    SELECT EXISTS (
        SELECT 1 FROM rbac_user_roles ur
        JOIN rbac_custom_roles cr ON ur.role_id = cr.id
        WHERE ur.user_id = p_user_id
        AND ur.organization_id = p_organization_id
        AND (ur.project_id IS NULL OR ur.project_id = p_project_id)
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND p_permission = ANY(cr.permissions)
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log an audit event
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_organization_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_changes JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, 
        organization_id, 
        action, 
        resource_type, 
        resource_id, 
        changes, 
        metadata
    ) VALUES (
        p_user_id,
        p_organization_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_changes,
        p_metadata
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check organization quota
CREATE OR REPLACE FUNCTION check_org_quota(
    p_organization_id UUID,
    p_resource_type TEXT,
    p_increment INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
    v_quota RECORD;
    v_usage RECORD;
    v_result JSONB;
BEGIN
    -- Get quota
    SELECT * INTO v_quota FROM organization_quotas WHERE organization_id = p_organization_id;
    
    IF v_quota IS NULL THEN
        -- Create default free tier quota
        INSERT INTO organization_quotas (organization_id) VALUES (p_organization_id)
        RETURNING * INTO v_quota;
    END IF;
    
    -- Get current usage
    SELECT * INTO v_usage 
    FROM organization_usage 
    WHERE organization_id = p_organization_id 
    AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE;
    
    IF v_usage IS NULL THEN
        -- Create usage record for this period
        INSERT INTO organization_usage (
            organization_id, 
            period_start, 
            period_end
        ) VALUES (
            p_organization_id,
            DATE_TRUNC('month', CURRENT_DATE),
            (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
        ) RETURNING * INTO v_usage;
    END IF;
    
    -- Check specific quota
    CASE p_resource_type
        WHEN 'session' THEN
            v_result := jsonb_build_object(
                'allowed', v_usage.active_sessions_count + p_increment <= v_quota.max_concurrent_sessions,
                'current', v_usage.active_sessions_count,
                'limit', v_quota.max_concurrent_sessions,
                'resource', 'concurrent_sessions'
            );
        WHEN 'session_daily' THEN
            v_result := jsonb_build_object(
                'allowed', v_usage.sessions_today + p_increment <= v_quota.max_sessions_per_day,
                'current', v_usage.sessions_today,
                'limit', v_quota.max_sessions_per_day,
                'resource', 'sessions_today'
            );
        WHEN 'ai_generation' THEN
            v_result := jsonb_build_object(
                'allowed', v_usage.ai_generations_this_month + p_increment <= v_quota.max_ai_generations_per_month,
                'current', v_usage.ai_generations_this_month,
                'limit', v_quota.max_ai_generations_per_month,
                'resource', 'ai_generations'
            );
        WHEN 'project' THEN
            v_result := jsonb_build_object(
                'allowed', v_usage.projects_count + p_increment <= v_quota.max_projects,
                'current', v_usage.projects_count,
                'limit', v_quota.max_projects,
                'resource', 'projects'
            );
        WHEN 'team_member' THEN
            v_result := jsonb_build_object(
                'allowed', v_usage.team_members_count + p_increment <= v_quota.max_team_members,
                'current', v_usage.team_members_count,
                'limit', v_quota.max_team_members,
                'resource', 'team_members'
            );
        ELSE
            v_result := jsonb_build_object('allowed', true, 'error', 'Unknown resource type');
    END CASE;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. RLS POLICIES FOR NEW TABLES
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE preview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_user_roles ENABLE ROW LEVEL SECURITY;

-- Audit logs: Only admins/owners can view
CREATE POLICY audit_logs_view ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = audit_logs.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- Organization quotas: Viewable by org members, editable by admins
CREATE POLICY org_quotas_view ON organization_quotas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organization_quotas.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

-- Preview sessions: Users can see their own sessions
CREATE POLICY preview_sessions_view ON preview_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY preview_sessions_insert ON preview_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY preview_sessions_update ON preview_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- API keys: Users can manage their own
CREATE POLICY api_keys_own ON api_keys
    FOR ALL USING (user_id = auth.uid());

-- Security events: Only admins can view
CREATE POLICY security_events_view ON security_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = security_events.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);

-- ============================================
-- 12. TRIGGER FOR AUTO-CREATING QUOTAS
-- ============================================

CREATE OR REPLACE FUNCTION create_org_quota_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO organization_quotas (organization_id, plan_tier)
    VALUES (NEW.id, 'free')
    ON CONFLICT (organization_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_org_quota
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION create_org_quota_on_insert();
