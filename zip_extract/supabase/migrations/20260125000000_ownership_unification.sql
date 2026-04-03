-- Ownership Unification Migration
-- Implements: profile/user → business → project → (assets + settings + intents + CRM + publish)
-- 
-- This migration establishes the canonical ownership chain for all cloud features

-- ============================================================================
-- 1. BUSINESSES TABLE (if not exists)
-- ============================================================================
-- Businesses are the top-level organizational unit. All projects, assets, 
-- and integrations belong to a business.

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    
    -- Owner (creator of the business)
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Business contact settings
    notification_email TEXT,
    notification_phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    
    -- Branding
    logo_url TEXT,
    brand_color TEXT,
    
    -- Settings blob for extensible configuration
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    industry TEXT,
    website TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. BUSINESS MEMBERS TABLE
-- ============================================================================
-- Enables agency teams: multiple users can belong to a business with roles

CREATE TABLE IF NOT EXISTS business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign keys
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role-based access
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    
    -- Permissions granularity (optional override)
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Invitation tracking
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one membership per user per business
    UNIQUE(business_id, user_id)
);

-- ============================================================================
-- 3. UPDATE PROJECTS TABLE
-- ============================================================================
-- Projects MUST be scoped by business_id, not just owner_id

-- Add business_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'business_id'
    ) THEN
        ALTER TABLE projects ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add slug column if it doesn't exist (for URL-friendly project identifiers)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'slug'
    ) THEN
        ALTER TABLE projects ADD COLUMN slug TEXT;
    END IF;
END $$;

-- Add publish_status for tracking site publication state
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'publish_status'
    ) THEN
        ALTER TABLE projects ADD COLUMN publish_status TEXT DEFAULT 'draft' 
            CHECK (publish_status IN ('draft', 'publishing', 'published', 'unpublished'));
    END IF;
END $$;

-- Add custom_domain for published sites
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'custom_domain'
    ) THEN
        ALTER TABLE projects ADD COLUMN custom_domain TEXT;
    END IF;
END $$;

-- Add published_at timestamp
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'published_at'
    ) THEN
        ALTER TABLE projects ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ============================================================================
-- 4. UPDATE PROJECT_ASSETS TABLE
-- ============================================================================
-- Assets MUST be scoped by business_id + project_id

-- Add business_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_assets' AND column_name = 'business_id'
    ) THEN
        ALTER TABLE project_assets ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add project_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_assets' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE project_assets ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add public_url for CDN/stable URLs (not signed URLs that expire)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_assets' AND column_name = 'public_url'
    ) THEN
        ALTER TABLE project_assets ADD COLUMN public_url TEXT;
    END IF;
END $$;

-- Add is_public flag to distinguish private vs published assets
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_assets' AND column_name = 'is_public'
    ) THEN
        ALTER TABLE project_assets ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ============================================================================
-- 5. SUBSCRIPTIONS & ENTITLEMENTS TABLES
-- ============================================================================
-- Enable pricing walls and feature gating

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to business (all pricing is at business level)
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Plan information
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'agency', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'paused', 'trialing')),
    
    -- Billing cycle
    billing_interval TEXT DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
    
    -- External references (Stripe, etc.)
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    
    -- Trial information
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Billing dates
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_id)
);

CREATE TABLE IF NOT EXISTS entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to business
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Entitlement key-value pairs
    -- Examples: 'projects_limit', 'published_sites_limit', 'storage_gb', 'team_members_limit'
    key TEXT NOT NULL,
    value JSONB NOT NULL, -- Can be number, boolean, or complex object
    
    -- Source of entitlement
    source TEXT DEFAULT 'plan' CHECK (source IN ('plan', 'addon', 'custom', 'trial')),
    
    -- Override expiration (for temporary overrides)
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_id, key)
);

-- ============================================================================
-- 6. INSTALLED PACKS TABLE
-- ============================================================================
-- Track which backend packs/integrations are installed per project

CREATE TABLE IF NOT EXISTS installed_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Scope: can be business-wide or project-specific
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL = business-wide
    
    -- Pack identification
    pack_id TEXT NOT NULL, -- e.g., 'crm', 'booking', 'email', 'analytics'
    pack_version TEXT DEFAULT '1.0.0',
    
    -- Configuration for this installation
    config JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'pending_setup')),
    
    -- Timestamps
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_id, project_id, pack_id)
);

-- ============================================================================
-- 7. INTENT EXECUTIONS TABLE
-- ============================================================================
-- Track all intent executions for audit, debugging, and analytics

CREATE TABLE IF NOT EXISTS intent_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Context
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Intent details
    intent_name TEXT NOT NULL, -- e.g., 'contact.submit', 'cta.primary'
    intent_payload JSONB NOT NULL,
    
    -- Source tracking
    source TEXT, -- 'preview', 'published', 'api'
    source_url TEXT,
    visitor_id TEXT, -- Anonymous tracking
    
    -- Execution result
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
    result JSONB,
    error_message TEXT,
    
    -- Performance
    duration_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_status ON business_members(status);

CREATE INDEX IF NOT EXISTS idx_projects_business_id ON projects(business_id);
CREATE INDEX IF NOT EXISTS idx_projects_publish_status ON projects(publish_status);

CREATE INDEX IF NOT EXISTS idx_project_assets_business_id ON project_assets(business_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_project_id ON project_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_is_public ON project_assets(is_public);

CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_entitlements_business_id ON entitlements(business_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_key ON entitlements(key);

CREATE INDEX IF NOT EXISTS idx_installed_packs_business_id ON installed_packs(business_id);
CREATE INDEX IF NOT EXISTS idx_installed_packs_project_id ON installed_packs(project_id);

CREATE INDEX IF NOT EXISTS idx_intent_executions_business_id ON intent_executions(business_id);
CREATE INDEX IF NOT EXISTS idx_intent_executions_intent_name ON intent_executions(intent_name);
CREATE INDEX IF NOT EXISTS idx_intent_executions_created_at ON intent_executions(created_at);

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE installed_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_executions ENABLE ROW LEVEL SECURITY;

-- Businesses: owner or member can see
CREATE POLICY "Users can view businesses they own or are members of"
ON businesses FOR SELECT
USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM business_members 
        WHERE business_members.business_id = businesses.id 
        AND business_members.user_id = auth.uid()
        AND business_members.status = 'active'
    )
);

CREATE POLICY "Users can create businesses"
ON businesses FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their businesses"
ON businesses FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their businesses"
ON businesses FOR DELETE
USING (owner_id = auth.uid());

-- Business Members: visible to business members
CREATE POLICY "Business members can view membership"
ON business_members FOR SELECT
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM businesses 
        WHERE businesses.id = business_members.business_id 
        AND businesses.owner_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM business_members bm2
        WHERE bm2.business_id = business_members.business_id
        AND bm2.user_id = auth.uid()
        AND bm2.status = 'active'
    )
);

CREATE POLICY "Business owners and admins can manage members"
ON business_members FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM businesses 
        WHERE businesses.id = business_id 
        AND businesses.owner_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM business_members bm
        WHERE bm.business_id = business_members.business_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'admin')
        AND bm.status = 'active'
    )
);

-- Subscriptions: visible to business members
CREATE POLICY "Business members can view subscription"
ON subscriptions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM businesses 
        WHERE businesses.id = subscriptions.business_id 
        AND (
            businesses.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM business_members 
                WHERE business_members.business_id = businesses.id 
                AND business_members.user_id = auth.uid()
                AND business_members.status = 'active'
            )
        )
    )
);

-- Entitlements: visible to business members
CREATE POLICY "Business members can view entitlements"
ON entitlements FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM businesses 
        WHERE businesses.id = entitlements.business_id 
        AND (
            businesses.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM business_members 
                WHERE business_members.business_id = businesses.id 
                AND business_members.user_id = auth.uid()
                AND business_members.status = 'active'
            )
        )
    )
);

-- Installed Packs: visible to business members
CREATE POLICY "Business members can view installed packs"
ON installed_packs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM businesses 
        WHERE businesses.id = installed_packs.business_id 
        AND (
            businesses.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM business_members 
                WHERE business_members.business_id = businesses.id 
                AND business_members.user_id = auth.uid()
                AND business_members.status = 'active'
            )
        )
    )
);

-- Intent Executions: visible to business members
CREATE POLICY "Business members can view intent executions"
ON intent_executions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM businesses 
        WHERE businesses.id = intent_executions.business_id 
        AND (
            businesses.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM business_members 
                WHERE business_members.business_id = businesses.id 
                AND business_members.user_id = auth.uid()
                AND business_members.status = 'active'
            )
        )
    )
);

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has access to a business
CREATE OR REPLACE FUNCTION user_has_business_access(p_business_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = p_business_id 
        AND owner_id = p_user_id
    ) OR EXISTS (
        SELECT 1 FROM business_members 
        WHERE business_id = p_business_id 
        AND user_id = p_user_id 
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a business
CREATE OR REPLACE FUNCTION get_user_business_role(p_business_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Check if owner
    IF EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = p_user_id) THEN
        RETURN 'owner';
    END IF;
    
    -- Check membership role
    SELECT role INTO v_role
    FROM business_members
    WHERE business_id = p_business_id AND user_id = p_user_id AND status = 'active';
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get business entitlement value
CREATE OR REPLACE FUNCTION get_entitlement(p_business_id UUID, p_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT value INTO v_value
    FROM entitlements
    WHERE business_id = p_business_id 
    AND key = p_key
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check entitlement limit
CREATE OR REPLACE FUNCTION check_entitlement_limit(p_business_id UUID, p_key TEXT, p_current_count INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    SELECT (value->>'limit')::INTEGER INTO v_limit
    FROM entitlements
    WHERE business_id = p_business_id 
    AND key = p_key
    AND (expires_at IS NULL OR expires_at > NOW());
    
    -- If no limit set, allow unlimited
    IF v_limit IS NULL THEN
        RETURN true;
    END IF;
    
    RETURN p_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. SEED DEFAULT ENTITLEMENTS FOR FREE PLAN
-- ============================================================================

-- This would typically be done via application code when a business is created,
-- but we define the defaults here for reference
COMMENT ON TABLE entitlements IS 
'Default entitlements by plan:
FREE: { projects_limit: 1, published_sites_limit: 1, storage_gb: 1, team_members_limit: 1 }
STARTER: { projects_limit: 5, published_sites_limit: 3, storage_gb: 10, team_members_limit: 3 }
PRO: { projects_limit: -1, published_sites_limit: 10, storage_gb: 50, team_members_limit: 10, custom_domain: true }
AGENCY: { projects_limit: -1, published_sites_limit: -1, storage_gb: 200, team_members_limit: -1, custom_domain: true, white_label: true }
(-1 means unlimited)';

-- ============================================================================
-- 12. UPDATE TRIGGERS
-- ============================================================================

CREATE TRIGGER update_businesses_updated_at 
    BEFORE UPDATE ON businesses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_members_updated_at 
    BEFORE UPDATE ON business_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entitlements_updated_at 
    BEFORE UPDATE ON entitlements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installed_packs_updated_at 
    BEFORE UPDATE ON installed_packs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. AUTO-CREATE BUSINESS MEMBERSHIP FOR OWNER
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO business_members (business_id, user_id, role, status, accepted_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_owner_membership
    AFTER INSERT ON businesses
    FOR EACH ROW EXECUTE FUNCTION auto_create_owner_membership();

-- ============================================================================
-- 14. AUTO-CREATE DEFAULT SUBSCRIPTION FOR NEW BUSINESS
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscriptions (business_id, plan, status)
    VALUES (NEW.id, 'free', 'active');
    
    -- Insert default free tier entitlements
    INSERT INTO entitlements (business_id, key, value, source) VALUES
    (NEW.id, 'projects_limit', '{"limit": 1}'::jsonb, 'plan'),
    (NEW.id, 'published_sites_limit', '{"limit": 1}'::jsonb, 'plan'),
    (NEW.id, 'storage_gb', '{"limit": 1}'::jsonb, 'plan'),
    (NEW.id, 'team_members_limit', '{"limit": 1}'::jsonb, 'plan'),
    (NEW.id, 'custom_domain', '{"enabled": false}'::jsonb, 'plan'),
    (NEW.id, 'ai_credits_monthly', '{"limit": 50}'::jsonb, 'plan');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_default_subscription
    AFTER INSERT ON businesses
    FOR EACH ROW EXECUTE FUNCTION auto_create_default_subscription();
