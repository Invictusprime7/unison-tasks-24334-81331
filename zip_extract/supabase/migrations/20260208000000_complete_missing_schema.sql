-- Complete Missing Schema Tables Migration
-- Adds all missing tables from the comprehensive schema plan

-- ============================================================================
-- Lane B: Project Versioning & Files
-- ============================================================================

-- Project Revisions (version control for projects)
CREATE TABLE IF NOT EXISTS project_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT,
  description TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, version)
);

-- Project Files (file tree for projects)
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
  mime_type TEXT,
  size BIGINT DEFAULT 0,
  parent_id UUID REFERENCES project_files(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Lane D: AI Design Knowledge
-- ============================================================================

-- Design Schemas (style patterns, tailwind utilities, design guidelines)
CREATE TABLE IF NOT EXISTS design_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  schema_type TEXT NOT NULL CHECK (schema_type IN ('color', 'typography', 'spacing', 'component', 'layout', 'animation', 'gradient', 'shadow', 'utility')),
  pattern JSONB NOT NULL DEFAULT '{}',
  tailwind_classes TEXT[] DEFAULT '{}',
  css_properties JSONB DEFAULT '{}',
  guidelines TEXT,
  usage_examples JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Lane E: CRM Pipelines, Funnels & Form Captures
-- ============================================================================

-- CRM Pipelines
CREATE TABLE IF NOT EXISTS crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Funnels
CREATE TABLE IF NOT EXISTS crm_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  pipeline_id UUID REFERENCES crm_pipelines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('sales', 'marketing', 'onboarding', 'support', 'custom')),
  steps JSONB NOT NULL DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Funnel Conversions (tracks conversions through funnel steps)
CREATE TABLE IF NOT EXISTS crm_funnel_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES crm_funnels(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  step_from TEXT,
  step_to TEXT NOT NULL,
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- CRM Form Captures (maps HTML forms to pipeline/stage/workflows)
CREATE TABLE IF NOT EXISTS crm_form_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  form_selector TEXT NOT NULL,
  page_url_pattern TEXT,
  field_mappings JSONB NOT NULL DEFAULT '{}',
  pipeline_id UUID REFERENCES crm_pipelines(id) ON DELETE SET NULL,
  default_stage TEXT DEFAULT 'new',
  default_tags TEXT[] DEFAULT '{}',
  workflow_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_project_revisions_project ON project_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_parent ON project_files(parent_id);
CREATE INDEX IF NOT EXISTS idx_design_schemas_type ON design_schemas(schema_type);
CREATE INDEX IF NOT EXISTS idx_design_schemas_tags ON design_schemas USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_business ON crm_pipelines(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_funnels_business ON crm_funnels(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_funnels_pipeline ON crm_funnels(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_funnel_conversions_funnel ON crm_funnel_conversions(funnel_id);
CREATE INDEX IF NOT EXISTS idx_crm_form_captures_business ON crm_form_captures(business_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE project_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_funnel_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_form_captures ENABLE ROW LEVEL SECURITY;

-- Project Revisions policies
CREATE POLICY "project_revisions_select" ON project_revisions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = project_revisions.project_id AND pm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_revisions.project_id AND p.owner_id = auth.uid()
  ));

CREATE POLICY "project_revisions_insert" ON project_revisions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = project_revisions.project_id AND pm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_revisions.project_id AND p.owner_id = auth.uid()
  ));

-- Project Files policies
CREATE POLICY "project_files_select" ON project_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = project_files.project_id AND pm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_files.project_id AND p.owner_id = auth.uid()
  ));

CREATE POLICY "project_files_all" ON project_files FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = project_files.project_id AND pm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_files.project_id AND p.owner_id = auth.uid()
  ));

-- Design Schemas policies
CREATE POLICY "design_schemas_select" ON design_schemas FOR SELECT USING (is_active = true);

-- CRM Pipelines policies
CREATE POLICY "crm_pipelines_select" ON crm_pipelines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM business_members bm WHERE bm.business_id = crm_pipelines.business_id AND bm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = crm_pipelines.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "crm_pipelines_all" ON crm_pipelines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM business_members bm WHERE bm.business_id = crm_pipelines.business_id AND bm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = crm_pipelines.business_id AND b.owner_id = auth.uid()
  ));

-- CRM Funnels policies
CREATE POLICY "crm_funnels_select" ON crm_funnels FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM business_members bm WHERE bm.business_id = crm_funnels.business_id AND bm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = crm_funnels.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "crm_funnels_all" ON crm_funnels FOR ALL
  USING (EXISTS (
    SELECT 1 FROM business_members bm WHERE bm.business_id = crm_funnels.business_id AND bm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = crm_funnels.business_id AND b.owner_id = auth.uid()
  ));

-- CRM Funnel Conversions policies
CREATE POLICY "crm_funnel_conversions_select" ON crm_funnel_conversions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM crm_funnels f
    JOIN business_members bm ON bm.business_id = f.business_id
    WHERE f.id = crm_funnel_conversions.funnel_id AND bm.user_id = auth.uid()
  ));

CREATE POLICY "crm_funnel_conversions_insert" ON crm_funnel_conversions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM crm_funnels f
    JOIN business_members bm ON bm.business_id = f.business_id
    WHERE f.id = crm_funnel_conversions.funnel_id AND bm.user_id = auth.uid()
  ));

-- CRM Form Captures policies
CREATE POLICY "crm_form_captures_select" ON crm_form_captures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM business_members bm WHERE bm.business_id = crm_form_captures.business_id AND bm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = crm_form_captures.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "crm_form_captures_all" ON crm_form_captures FOR ALL
  USING (EXISTS (
    SELECT 1 FROM business_members bm WHERE bm.business_id = crm_form_captures.business_id AND bm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = crm_form_captures.business_id AND b.owner_id = auth.uid()
  ));

-- ============================================================================
-- Seed Design Schemas with Common Patterns
-- ============================================================================

INSERT INTO design_schemas (name, schema_type, pattern, tailwind_classes, guidelines, tags) VALUES
('Primary Button', 'component', '{"variant": "primary", "size": "md"}', ARRAY['bg-primary', 'text-primary-foreground', 'hover:bg-primary/90', 'px-4', 'py-2', 'rounded-md'], 'Use for main CTAs', ARRAY['button', 'cta', 'action']),
('Gradient Hero', 'gradient', '{"from": "primary", "to": "secondary", "direction": "br"}', ARRAY['bg-gradient-to-br', 'from-primary', 'to-secondary'], 'Hero sections and feature highlights', ARRAY['gradient', 'hero', 'background']),
('Card Shadow', 'shadow', '{"elevation": "md"}', ARRAY['shadow-md', 'hover:shadow-lg', 'transition-shadow'], 'Standard card elevation', ARRAY['shadow', 'card', 'elevation']),
('Responsive Grid', 'layout', '{"columns": {"sm": 1, "md": 2, "lg": 3}}', ARRAY['grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6'], 'Responsive content grid', ARRAY['grid', 'layout', 'responsive']),
('Fade In Animation', 'animation', '{"type": "fadeIn", "duration": "300ms"}', ARRAY['animate-in', 'fade-in', 'duration-300'], 'Subtle entrance animation', ARRAY['animation', 'fade', 'entrance'])
ON CONFLICT DO NOTHING;
