-- Enterprise Infrastructure: Team Invitations and Enhanced Profiles
-- This migration adds:
-- 1. Team invitations system
-- 2. Enhanced profile fields
-- 3. Session tracking
-- 4. Login history

-- ============================================
-- TEAM INVITATIONS
-- ============================================

-- Team invitations table for pending invites
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member', 'viewer', 'billing')),
    title TEXT,
    department TEXT,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One pending invite per email per organization
    UNIQUE(organization_id, email, status)
);

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for team invitations
CREATE POLICY "Organization members can view invitations"
    ON team_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = team_invitations.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can create invitations"
    ON team_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = team_invitations.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can update invitations"
    ON team_invitations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = team_invitations.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can delete invitations"
    ON team_invitations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = team_invitations.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- Index for looking up invitations by email
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status) WHERE status = 'pending';

-- ============================================
-- ENHANCED PROFILES
-- ============================================

-- Add new columns to profiles table if they don't exist
DO $$
BEGIN
    -- Phone number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
    
    -- Job title
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'job_title') THEN
        ALTER TABLE profiles ADD COLUMN job_title TEXT;
    END IF;
    
    -- Department
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'department') THEN
        ALTER TABLE profiles ADD COLUMN department TEXT;
    END IF;
    
    -- Timezone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'timezone') THEN
        ALTER TABLE profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';
    END IF;
    
    -- Locale
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'locale') THEN
        ALTER TABLE profiles ADD COLUMN locale TEXT DEFAULT 'en-US';
    END IF;
    
    -- Preferences (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'preferences') THEN
        ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{
            "theme": "system",
            "compactMode": false,
            "showTutorials": true,
            "defaultProjectView": "board",
            "emailDigest": "weekly"
        }'::jsonb;
    END IF;
    
    -- Notification settings (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'notification_settings') THEN
        ALTER TABLE profiles ADD COLUMN notification_settings JSONB DEFAULT '{
            "email": {
                "projectUpdates": true,
                "taskAssignments": true,
                "comments": true,
                "mentions": true,
                "weeklyDigest": true
            },
            "push": {
                "enabled": true,
                "taskReminders": true,
                "directMessages": true
            },
            "inApp": {
                "showDesktop": true,
                "playSound": true
            }
        }'::jsonb;
    END IF;
    
    -- Last active timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_active_at') THEN
        ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Onboarding completed flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ============================================
-- USER SESSIONS TRACKING
-- ============================================

-- Table to track active user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    country_code TEXT,
    city TEXT,
    is_active BOOLEAN DEFAULT true,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
    ON user_sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
    ON user_sessions FOR DELETE
    USING (user_id = auth.uid());

-- Indexes for session lookup
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;

-- ============================================
-- LOGIN HISTORY
-- ============================================

-- Track login attempts and history
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    country_code TEXT,
    city TEXT,
    auth_method TEXT, -- 'password', 'oauth:google', 'oauth:github', 'magic_link'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own login history
CREATE POLICY "Users can view own login history"
    ON login_history FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all login history in their org
CREATE POLICY "Admins can view org login history"
    ON login_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            JOIN organization_members om2 ON om.organization_id = om2.organization_id
            WHERE om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
            AND om2.user_id = login_history.user_id
        )
    );

-- Indexes for login history
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);
CREATE INDEX IF NOT EXISTS idx_login_history_failed ON login_history(email, success) WHERE success = false;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to accept a team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation team_invitations;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Find the invitation
    SELECT * INTO v_invitation
    FROM team_invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF v_invitation IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if user email matches invitation email
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = v_user_id AND email = v_invitation.email
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation was sent to a different email address');
    END IF;
    
    -- Check if already a member
    IF EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_invitation.organization_id
        AND user_id = v_user_id
    ) THEN
        -- Update invitation status
        UPDATE team_invitations
        SET status = 'accepted', accepted_at = NOW()
        WHERE id = v_invitation.id;
        
        RETURN jsonb_build_object('success', true, 'message', 'Already a member');
    END IF;
    
    -- Add user to organization
    INSERT INTO organization_members (
        organization_id,
        user_id,
        role,
        title,
        department,
        invited_by
    ) VALUES (
        v_invitation.organization_id,
        v_user_id,
        v_invitation.role,
        v_invitation.title,
        v_invitation.department,
        v_invitation.invited_by
    );
    
    -- Update invitation status
    UPDATE team_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Update organization member count
    UPDATE organizations
    SET member_count = member_count + 1
    WHERE id = v_invitation.organization_id;
    
    -- Log to audit
    INSERT INTO audit_logs (
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        v_invitation.organization_id,
        v_user_id,
        'create',
        'organization',
        v_invitation.organization_id,
        jsonb_build_object(
            'event', 'invitation_accepted',
            'role', v_invitation.role,
            'invited_by', v_invitation.invited_by
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'organization_id', v_invitation.organization_id
    );
END;
$$;

-- Function to expire old invitations (run via cron)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE team_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Function to log a login attempt
CREATE OR REPLACE FUNCTION log_login_attempt(
    p_email TEXT,
    p_success BOOLEAN,
    p_failure_reason TEXT DEFAULT NULL,
    p_auth_method TEXT DEFAULT 'password',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_country_code TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = lower(p_email);
    
    -- Insert login history
    INSERT INTO login_history (
        user_id,
        email,
        success,
        failure_reason,
        auth_method,
        ip_address,
        user_agent,
        country_code,
        city
    ) VALUES (
        v_user_id,
        lower(p_email),
        p_success,
        p_failure_reason,
        p_auth_method,
        p_ip_address,
        p_user_agent,
        p_country_code,
        p_city
    )
    RETURNING id INTO v_id;
    
    -- If failed login, check for brute force
    IF NOT p_success THEN
        -- Check for too many failed attempts
        IF (
            SELECT COUNT(*) 
            FROM login_history 
            WHERE email = lower(p_email) 
            AND success = false 
            AND created_at > NOW() - INTERVAL '15 minutes'
        ) >= 5 THEN
            -- Log security event
            INSERT INTO security_events (
                user_id,
                event_type,
                risk_level,
                ip_address,
                user_agent,
                details
            ) VALUES (
                v_user_id,
                'suspicious_activity',
                'high',
                p_ip_address,
                p_user_agent,
                jsonb_build_object(
                    'event', 'brute_force_detected',
                    'email', p_email,
                    'attempts', 5
                )
            );
        END IF;
    END IF;
    
    RETURN v_id;
END;
$$;

-- ============================================
-- GRANTS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION accept_team_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_login_attempt(TEXT, BOOLEAN, TEXT, TEXT, INET, TEXT, TEXT, TEXT) TO authenticated, anon;
