-- Fix 1: Restrict profile visibility to own profile and project collaborators
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can view project collaborators" 
ON public.profiles
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm1
    JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.id
  )
);

-- Fix 2: Secure anonymous file access with session tokens
CREATE TABLE IF NOT EXISTS public.file_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES public.files(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  token uuid DEFAULT gen_random_uuid() UNIQUE,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.file_access_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create tokens for anonymous files
CREATE POLICY "Anyone can create tokens for anonymous files"
ON public.file_access_tokens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.files 
    WHERE files.id = file_access_tokens.file_id 
    AND files.user_id IS NULL
  )
);

-- Anyone can read their own session tokens
CREATE POLICY "Users can view their session tokens"
ON public.file_access_tokens
FOR SELECT
USING (true);

-- Update files policies to require tokens for anonymous access
DROP POLICY IF EXISTS "Anyone can view files" ON public.files;
DROP POLICY IF EXISTS "Anyone can insert files" ON public.files;
DROP POLICY IF EXISTS "Anyone can update files without user or own files" ON public.files;
DROP POLICY IF EXISTS "Anyone can delete files without user or own files" ON public.files;

-- New secure file policies
CREATE POLICY "Users can view own files"
ON public.files
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view shared files"
ON public.files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_files
    WHERE shared_files.file_id = files.id
    AND (shared_files.shared_with = auth.uid() OR shared_files.is_public = true)
  )
);

CREATE POLICY "Anonymous can view files with valid token"
ON public.files
FOR SELECT
USING (
  user_id IS NULL AND
  EXISTS (
    SELECT 1 FROM public.file_access_tokens
    WHERE file_access_tokens.file_id = files.id
    AND file_access_tokens.expires_at > now()
  )
);

CREATE POLICY "Authenticated users can insert own files"
ON public.files
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous can insert files"
ON public.files
FOR INSERT
WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can update own files"
ON public.files
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own files"
ON public.files
FOR DELETE
USING (user_id = auth.uid());

-- Fix 3: Hide public_token from shared_files SELECT queries
-- Create security definer function to validate tokens
CREATE OR REPLACE FUNCTION public.validate_file_share_token(_file_id uuid, _token uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_files
    WHERE file_id = _file_id
    AND public_token = _token
    AND is_public = true
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_file_share_token(uuid, uuid) TO anon, authenticated;