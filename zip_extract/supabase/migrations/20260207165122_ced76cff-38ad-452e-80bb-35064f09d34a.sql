
-- ============================================
-- FIX 1: Cart items - Replace permissive policy with scoped ones
-- ============================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "cart_items_manage_by_session" ON public.cart_items;

-- Authenticated users: strict ownership via user_id
CREATE POLICY "cart_items_auth_owner"
ON public.cart_items FOR ALL
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Anonymous users: session-based with UUID length enforcement
-- session_id is generated via crypto.randomUUID() (122 bits entropy, unguessable)
CREATE POLICY "cart_items_anon_session"
ON public.cart_items FOR ALL
USING (
  auth.uid() IS NULL
  AND user_id IS NULL
  AND session_id IS NOT NULL
  AND length(session_id) >= 36
)
WITH CHECK (
  auth.uid() IS NULL
  AND user_id IS NULL
  AND session_id IS NOT NULL
  AND length(session_id) >= 36
);

-- ============================================
-- FIX 2: Storage - Replace open access with user-scoped policies
-- ============================================

-- Drop all open policies
DROP POLICY IF EXISTS "Anyone can upload to user-files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view user-files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update user-files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete user-files" ON storage.objects;

-- Authenticated users: scoped to their own folder (userId/*)
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-files'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-files'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-files'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-files'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow viewing files shared via public token (for shared file links)
CREATE POLICY "Public can view shared files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-files'
    AND EXISTS (
      SELECT 1 FROM public.shared_files sf
      JOIN public.files f ON f.id = sf.file_id
      WHERE f.storage_path = name
      AND sf.is_public = true
      AND (sf.expires_at IS NULL OR sf.expires_at > now())
    )
  );
