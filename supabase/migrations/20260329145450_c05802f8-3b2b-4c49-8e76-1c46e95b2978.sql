
-- 1) audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  resource_name text,
  changes jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2) security_events table
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  user_email text,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  risk_level text NOT NULL DEFAULT 'low',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_events_insert_authenticated" ON public.security_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "security_events_select_own" ON public.security_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3) vfs_snapshots table for persisting VFS state
CREATE TABLE public.vfs_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Auto-save',
  source text NOT NULL DEFAULT 'auto',
  files jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vfs_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vfs_snapshots_insert_own" ON public.vfs_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vfs_snapshots_select_own" ON public.vfs_snapshots
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "vfs_snapshots_delete_own" ON public.vfs_snapshots
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4) builder_drafts table for persisting auto-save drafts
CREATE TABLE public.builder_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  template_id text,
  code text NOT NULL,
  editor_code text,
  vfs_files jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_drafts_all_own" ON public.builder_drafts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5) image_slot_events for tracking image replacements
CREATE TABLE public.image_slot_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  slot_id text NOT NULL,
  slot_type text,
  old_src text,
  new_src text,
  section text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_slot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "image_slot_events_insert_auth" ON public.image_slot_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "image_slot_events_select_own" ON public.image_slot_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_vfs_snapshots_user ON public.vfs_snapshots(user_id, created_at DESC);
CREATE INDEX idx_builder_drafts_user ON public.builder_drafts(user_id, updated_at DESC);
