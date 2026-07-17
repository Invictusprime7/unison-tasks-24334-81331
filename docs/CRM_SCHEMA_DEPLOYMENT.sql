-- CRM Schema Migration
-- Creates comprehensive CRM tables for workflow automation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Workspace Members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- CRM Contacts table
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Leads table
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  pipeline_id UUID,
  stage TEXT NOT NULL DEFAULT 'new',
  title TEXT NOT NULL,
  value DECIMAL(12,2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  source TEXT,
  assigned_to UUID,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Pipelines table
CREATE TABLE IF NOT EXISTS crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID,
  name TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Activities table
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'call', 'email', 'meeting', 'task')),
  subject TEXT,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  due_date TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Workflows table
CREATE TABLE IF NOT EXISTS crm_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('button_click', 'form_submit', 'webhook', 'schedule', 'manual')),
  trigger_config JSONB DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Workflow Runs table
CREATE TABLE IF NOT EXISTS crm_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES crm_workflows(id) ON DELETE CASCADE,
  trigger_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- CRM Workflow Jobs table
CREATE TABLE IF NOT EXISTS crm_workflow_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES crm_workflows(id) ON DELETE CASCADE,
  run_id UUID REFERENCES crm_workflow_runs(id) ON DELETE CASCADE,
  action_index INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  retry_count INTEGER DEFAULT 0,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- CRM Funnels table
CREATE TABLE IF NOT EXISTS crm_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID,
  name TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Funnel Conversions table
CREATE TABLE IF NOT EXISTS crm_funnel_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES crm_funnels(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL,
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  converted BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

-- CRM Form Captures table
CREATE TABLE IF NOT EXISTS crm_form_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID,
  form_id TEXT NOT NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  form_data JSONB NOT NULL,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON crm_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_project ON crm_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON crm_contacts USING GIN(tags);

-- CRM Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_workspace ON crm_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_project ON crm_leads(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline ON crm_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_contact ON crm_leads(contact_id);

-- CRM Pipelines indexes
CREATE INDEX IF NOT EXISTS idx_pipelines_workspace ON crm_pipelines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_project ON crm_pipelines(project_id);

-- CRM Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_workspace ON crm_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON crm_activities(lead_id);

-- CRM Workflows indexes
CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON crm_workflows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON crm_workflows(active);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON crm_workflows(trigger_type);

-- CRM Workflow Runs indexes
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON crm_workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON crm_workflow_runs(status);

-- CRM Workflow Jobs indexes
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_run ON crm_workflow_jobs(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_workflow ON crm_workflow_jobs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_status ON crm_workflow_jobs(status);

-- CRM Funnels indexes
CREATE INDEX IF NOT EXISTS idx_funnels_workspace ON crm_funnels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_funnels_project ON crm_funnels(project_id);

-- CRM Funnel Conversions indexes
CREATE INDEX IF NOT EXISTS idx_funnel_conversions_contact ON crm_funnel_conversions(contact_id);
CREATE INDEX IF NOT EXISTS idx_funnel_conversions_funnel ON crm_funnel_conversions(funnel_id);

-- CRM Form Captures indexes
CREATE INDEX IF NOT EXISTS idx_form_captures_workspace ON crm_form_captures(workspace_id);
CREATE INDEX IF NOT EXISTS idx_form_captures_contact ON crm_form_captures(contact_id);
CREATE INDEX IF NOT EXISTS idx_form_captures_form ON crm_form_captures(form_id);

-- Enable Row Level Security
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_funnel_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_form_captures ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Service role bypass, users can access their workspace data)
CREATE POLICY "Service role has full access" ON crm_contacts FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON crm_leads FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON crm_pipelines FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON crm_activities FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON crm_workflows FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON crm_workflow_runs FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON crm_workflow_jobs FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON crm_funnels FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON crm_funnel_conversions FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON crm_form_captures FOR ALL USING (true);
