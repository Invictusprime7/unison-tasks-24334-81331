-- Create storage bucket for user files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  false,
  52428800, -- 50MB limit
  ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/x-zip-compressed']
);

-- Create files table for metadata
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  folder_path text DEFAULT '/',
  is_favorite boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create shared_files table for sharing
CREATE TABLE public.shared_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
  is_public boolean DEFAULT false,
  public_token uuid DEFAULT gen_random_uuid(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Create file_versions table for version history
CREATE TABLE public.file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  storage_path text NOT NULL,
  size bigint NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for files table
CREATE POLICY "Users can view their own files"
  ON public.files FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view files shared with them"
  ON public.files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_files
      WHERE file_id = files.id
      AND (shared_with = auth.uid() OR is_public = true)
    )
  );

CREATE POLICY "Users can insert their own files"
  ON public.files FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own files"
  ON public.files FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own files"
  ON public.files FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for shared_files table
CREATE POLICY "Users can view shares of their files"
  ON public.shared_files FOR SELECT
  USING (
    shared_by = auth.uid() 
    OR shared_with = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = shared_files.file_id
      AND files.user_id = auth.uid()
    )
  );

CREATE POLICY "File owners can create shares"
  ON public.shared_files FOR INSERT
  WITH CHECK (
    shared_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = file_id
      AND files.user_id = auth.uid()
    )
  );

CREATE POLICY "File owners can delete shares"
  ON public.shared_files FOR DELETE
  USING (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = shared_files.file_id
      AND files.user_id = auth.uid()
    )
  );

-- RLS Policies for file_versions table
CREATE POLICY "Users can view versions of their files"
  ON public.file_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = file_versions.file_id
      AND files.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions of their files"
  ON public.file_versions FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = file_id
      AND files.user_id = auth.uid()
    )
  );

-- Storage policies for user-files bucket
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger for updated_at
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_folder_path ON public.files(folder_path);
CREATE INDEX idx_shared_files_file_id ON public.shared_files(file_id);
CREATE INDEX idx_shared_files_shared_with ON public.shared_files(shared_with);
CREATE INDEX idx_file_versions_file_id ON public.file_versions(file_id);