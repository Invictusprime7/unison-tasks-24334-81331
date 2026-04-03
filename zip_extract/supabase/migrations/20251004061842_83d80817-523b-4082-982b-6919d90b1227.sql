-- Update RLS policies to allow optional authentication
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
DROP POLICY IF EXISTS "Users can view files shared with them" ON public.files;
DROP POLICY IF EXISTS "Users can insert their own files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;

-- Create new policies that work with or without authentication
CREATE POLICY "Anyone can view files"
  ON public.files FOR SELECT
  USING (
    user_id IS NULL 
    OR user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.shared_files
      WHERE file_id = files.id
      AND (shared_with = auth.uid() OR is_public = true)
    )
  );

CREATE POLICY "Anyone can insert files"
  ON public.files FOR INSERT
  WITH CHECK (
    user_id IS NULL 
    OR user_id = auth.uid()
  );

CREATE POLICY "Anyone can update files without user or own files"
  ON public.files FOR UPDATE
  USING (
    user_id IS NULL 
    OR user_id = auth.uid()
  );

CREATE POLICY "Anyone can delete files without user or own files"
  ON public.files FOR DELETE
  USING (
    user_id IS NULL 
    OR user_id = auth.uid()
  );

-- Update storage policies to allow anonymous access
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

CREATE POLICY "Anyone can upload to user-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-files');

CREATE POLICY "Anyone can view user-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-files');

CREATE POLICY "Anyone can update user-files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'user-files');

CREATE POLICY "Anyone can delete user-files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-files');

-- Make user_id nullable in files table
ALTER TABLE public.files ALTER COLUMN user_id DROP NOT NULL;