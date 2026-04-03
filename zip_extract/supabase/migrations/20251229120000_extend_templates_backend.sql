-- Migration: Extend templates table for backend features (redirects, scheduling, authentication, payment)
-- Date: 2025-12-29

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create templates table if it doesn't exist (safe idempotent creation)
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    owner_id UUID NOT NULL,
    project_id UUID,
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

-- Add new backend feature columns
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS redirects JSONB DEFAULT '[]'::jsonb;

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS scheduling JSONB DEFAULT '{}'::jsonb;

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS requires_auth BOOLEAN DEFAULT false;

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS payment JSONB DEFAULT '{}'::jsonb;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_templates_requires_auth ON templates(requires_auth);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_owner_id ON templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- Create updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_templates_updated_at();
