
ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_crm_activities_business ON public.crm_activities(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_business ON public.tasks(business_id, status, due_date);

DROP POLICY IF EXISTS "business members read activities" ON public.crm_activities;
CREATE POLICY "business members read activities" ON public.crm_activities FOR SELECT TO authenticated
  USING (business_id IS NULL OR public.is_business_member(business_id));

DROP POLICY IF EXISTS "business members write activities" ON public.crm_activities;
CREATE POLICY "business members write activities" ON public.crm_activities FOR INSERT TO authenticated
  WITH CHECK (business_id IS NULL OR public.is_business_member(business_id));

DROP POLICY IF EXISTS "business members read tasks" ON public.tasks;
CREATE POLICY "business members read tasks" ON public.tasks FOR SELECT TO authenticated
  USING (business_id IS NULL OR public.is_business_member(business_id));

DROP POLICY IF EXISTS "business members write tasks" ON public.tasks;
CREATE POLICY "business members write tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (business_id IS NULL OR public.is_business_member(business_id));

DROP POLICY IF EXISTS "business members update tasks" ON public.tasks;
CREATE POLICY "business members update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (business_id IS NULL OR public.is_business_member(business_id));
