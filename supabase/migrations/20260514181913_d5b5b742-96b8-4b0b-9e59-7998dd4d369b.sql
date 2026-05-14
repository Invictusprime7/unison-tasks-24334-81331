-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- AI request logs
CREATE TABLE public.ai_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL,
  model text NOT NULL,
  status_code int,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  latency_ms int,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_logs_created ON public.ai_request_logs (created_at DESC);
CREATE INDEX idx_ai_logs_provider ON public.ai_request_logs (provider);
CREATE INDEX idx_ai_logs_model ON public.ai_request_logs (model);

ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all ai logs" ON public.ai_request_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own ai logs" ON public.ai_request_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());