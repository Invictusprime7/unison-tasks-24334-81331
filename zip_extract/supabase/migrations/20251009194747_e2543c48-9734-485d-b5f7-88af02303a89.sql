-- Create table for storing generated pages
CREATE TABLE IF NOT EXISTS public.generated_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schema JSONB NOT NULL,
  theme_tokens JSONB DEFAULT '{}'::jsonb,
  html_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_pages ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view their own pages"
  ON public.generated_pages
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own pages"
  ON public.generated_pages
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pages"
  ON public.generated_pages
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own pages"
  ON public.generated_pages
  FOR DELETE
  USING (user_id = auth.uid());

-- Policies for anonymous users
CREATE POLICY "Anonymous can create pages"
  ON public.generated_pages
  FOR INSERT
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous can view their pages"
  ON public.generated_pages
  FOR SELECT
  USING (user_id IS NULL);

CREATE POLICY "Anonymous can update their pages"
  ON public.generated_pages
  FOR UPDATE
  USING (user_id IS NULL);

CREATE POLICY "Anonymous can delete their pages"
  ON public.generated_pages
  FOR DELETE
  USING (user_id IS NULL);

-- Create table for page sections
CREATE TABLE IF NOT EXISTS public.page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.generated_pages(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  schema JSONB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for sections
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sections of their pages"
  ON public.page_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_pages
      WHERE generated_pages.id = page_sections.page_id
      AND (generated_pages.user_id = auth.uid() OR generated_pages.user_id IS NULL)
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_page_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_generated_pages_updated_at
  BEFORE UPDATE ON public.generated_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_page_updated_at();