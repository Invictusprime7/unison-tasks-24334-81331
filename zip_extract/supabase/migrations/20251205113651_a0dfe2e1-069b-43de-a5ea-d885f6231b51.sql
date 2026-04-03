-- CRM Workflows table
CREATE TABLE public.crm_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- manual, webhook, schedule, form_submit
  trigger_config JSONB DEFAULT '{}'::jsonb,
  steps JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Workflow Runs (execution history)
CREATE TABLE public.crm_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  trigger_data JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- CRM Workflow Jobs (job queue)
CREATE TABLE public.crm_workflow_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID REFERENCES public.crm_workflow_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'queued', -- queued, processing, completed, failed
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Form Submissions
CREATE TABLE public.crm_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT NOT NULL,
  form_name TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  workflow_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Contacts
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  source TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Leads
CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- new, contacted, qualified, proposal, won, lost
  value DECIMAL(12,2),
  source TEXT,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Deals
CREATE TABLE public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  stage TEXT DEFAULT 'prospecting', -- prospecting, negotiation, closed_won, closed_lost
  value DECIMAL(12,2),
  expected_close_date DATE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Activities
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL, -- email, call, meeting, note, task
  title TEXT NOT NULL,
  description TEXT,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Automations (rules)
CREATE TABLE public.crm_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- contact_created, lead_status_changed, form_submitted, etc.
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Email Templates
CREATE TABLE public.crm_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  variables TEXT[] DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_workflows
CREATE POLICY "Users can view own workflows" ON public.crm_workflows FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create workflows" ON public.crm_workflows FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own workflows" ON public.crm_workflows FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own workflows" ON public.crm_workflows FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for crm_workflow_runs
CREATE POLICY "Users can view own workflow runs" ON public.crm_workflow_runs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.crm_workflows WHERE id = workflow_id AND user_id = auth.uid()));
CREATE POLICY "Anyone can create workflow runs" ON public.crm_workflow_runs FOR INSERT WITH CHECK (true);

-- RLS Policies for crm_workflow_jobs
CREATE POLICY "Users can view own workflow jobs" ON public.crm_workflow_jobs FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.crm_workflow_runs r 
    JOIN public.crm_workflows w ON r.workflow_id = w.id 
    WHERE r.id = workflow_run_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "Anyone can create workflow jobs" ON public.crm_workflow_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workflow jobs" ON public.crm_workflow_jobs FOR UPDATE USING (true);

-- RLS Policies for crm_form_submissions (public for form submissions)
CREATE POLICY "Anyone can submit forms" ON public.crm_form_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can view submissions" ON public.crm_form_submissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for crm_contacts
CREATE POLICY "Users can view own contacts" ON public.crm_contacts FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can create contacts" ON public.crm_contacts FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update own contacts" ON public.crm_contacts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own contacts" ON public.crm_contacts FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for crm_leads
CREATE POLICY "Users can view own leads" ON public.crm_leads FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can create leads" ON public.crm_leads FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update own leads" ON public.crm_leads FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own leads" ON public.crm_leads FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for crm_deals
CREATE POLICY "Users can view own deals" ON public.crm_deals FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can create deals" ON public.crm_deals FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update own deals" ON public.crm_deals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own deals" ON public.crm_deals FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for crm_activities
CREATE POLICY "Users can view own activities" ON public.crm_activities FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can create activities" ON public.crm_activities FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update own activities" ON public.crm_activities FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own activities" ON public.crm_activities FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for crm_automations
CREATE POLICY "Users can view own automations" ON public.crm_automations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create automations" ON public.crm_automations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own automations" ON public.crm_automations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own automations" ON public.crm_automations FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for crm_email_templates
CREATE POLICY "Users can view own templates" ON public.crm_email_templates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create templates" ON public.crm_email_templates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own templates" ON public.crm_email_templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own templates" ON public.crm_email_templates FOR DELETE USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_crm_workflow_runs_workflow_id ON public.crm_workflow_runs(workflow_id);
CREATE INDEX idx_crm_workflow_runs_status ON public.crm_workflow_runs(status);
CREATE INDEX idx_crm_workflow_jobs_status ON public.crm_workflow_jobs(status);
CREATE INDEX idx_crm_workflow_jobs_scheduled_at ON public.crm_workflow_jobs(scheduled_at);
CREATE INDEX idx_crm_contacts_email ON public.crm_contacts(email);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage);
CREATE INDEX idx_crm_form_submissions_form_id ON public.crm_form_submissions(form_id);