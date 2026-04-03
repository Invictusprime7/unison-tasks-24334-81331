-- Create enum types
CREATE TYPE public.document_type AS ENUM ('design', 'video');
CREATE TYPE public.layer_kind AS ENUM ('image', 'text', 'shape', 'group', 'video', 'audio');
CREATE TYPE public.track_type AS ENUM ('video', 'audio', 'overlay');
CREATE TYPE public.blend_mode AS ENUM ('normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion');

-- Documents table (main container)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type public.document_type NOT NULL DEFAULT 'design',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Brand kits (colors, fonts, logos)
CREATE TABLE public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  colors JSONB DEFAULT '[]'::jsonb, -- [{name, value}]
  fonts TEXT[] DEFAULT ARRAY[]::TEXT[],
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pages (for design mode)
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  background JSONB DEFAULT '{"type": "solid", "color": "#ffffff"}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Layers (images, text, shapes, groups, video)
CREATE TABLE public.layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  kind public.layer_kind NOT NULL,
  transform JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "scale": 1, "rotate": 0}'::jsonb,
  opacity REAL NOT NULL DEFAULT 1.0,
  blend public.blend_mode NOT NULL DEFAULT 'normal',
  visible BOOLEAN NOT NULL DEFAULT true,
  locked BOOLEAN NOT NULL DEFAULT false,
  masks JSONB DEFAULT '[]'::jsonb,
  adjustments JSONB DEFAULT '[]'::jsonb, -- [{id, type, params}]
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- layer-specific data
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Timelines (for video mode)
CREATE TABLE public.timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE UNIQUE,
  fps INTEGER NOT NULL DEFAULT 30,
  duration REAL NOT NULL DEFAULT 10.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tracks (video, audio, overlay)
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES public.timelines(id) ON DELETE CASCADE,
  type public.track_type NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Clips (timeline elements)
CREATE TABLE public.clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  clip_in REAL NOT NULL DEFAULT 0, -- in point in source
  clip_out REAL NOT NULL DEFAULT 0, -- out point in source
  timeline_start REAL NOT NULL DEFAULT 0, -- position on timeline
  transforms JSONB DEFAULT '{}'::jsonb, -- keyframed transforms
  effects JSONB DEFAULT '[]'::jsonb, -- [{id, type, params}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- History for undo/redo
CREATE TABLE public.document_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for brand_kits
CREATE POLICY "Users can view brand kits of their documents"
  ON public.brand_kits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = brand_kits.document_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage brand kits of their documents"
  ON public.brand_kits FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = brand_kits.document_id
    AND documents.user_id = auth.uid()
  ));

-- RLS Policies for pages
CREATE POLICY "Users can view pages of their documents"
  ON public.pages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = pages.document_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage pages of their documents"
  ON public.pages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = pages.document_id
    AND documents.user_id = auth.uid()
  ));

-- RLS Policies for layers
CREATE POLICY "Users can view layers of their pages"
  ON public.layers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pages
    JOIN public.documents ON documents.id = pages.document_id
    WHERE pages.id = layers.page_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage layers of their pages"
  ON public.layers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.pages
    JOIN public.documents ON documents.id = pages.document_id
    WHERE pages.id = layers.page_id
    AND documents.user_id = auth.uid()
  ));

-- RLS Policies for timelines
CREATE POLICY "Users can view timelines of their documents"
  ON public.timelines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = timelines.document_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage timelines of their documents"
  ON public.timelines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = timelines.document_id
    AND documents.user_id = auth.uid()
  ));

-- RLS Policies for tracks
CREATE POLICY "Users can view tracks of their timelines"
  ON public.tracks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.timelines
    JOIN public.documents ON documents.id = timelines.document_id
    WHERE timelines.id = tracks.timeline_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage tracks of their timelines"
  ON public.tracks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.timelines
    JOIN public.documents ON documents.id = timelines.document_id
    WHERE timelines.id = tracks.timeline_id
    AND documents.user_id = auth.uid()
  ));

-- RLS Policies for clips
CREATE POLICY "Users can view clips of their tracks"
  ON public.clips FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tracks
    JOIN public.timelines ON timelines.id = tracks.timeline_id
    JOIN public.documents ON documents.id = timelines.document_id
    WHERE tracks.id = clips.track_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage clips of their tracks"
  ON public.clips FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tracks
    JOIN public.timelines ON timelines.id = tracks.timeline_id
    JOIN public.documents ON documents.id = timelines.document_id
    WHERE tracks.id = clips.track_id
    AND documents.user_id = auth.uid()
  ));

-- RLS Policies for document_history
CREATE POLICY "Users can view history of their documents"
  ON public.document_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_history.document_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can create history for their documents"
  ON public.document_history FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_history.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_pages_document ON public.pages(document_id);
CREATE INDEX idx_layers_page ON public.layers(page_id);
CREATE INDEX idx_timelines_document ON public.timelines(document_id);
CREATE INDEX idx_tracks_timeline ON public.tracks(timeline_id);
CREATE INDEX idx_clips_track ON public.clips(track_id);
CREATE INDEX idx_history_document ON public.document_history(document_id, created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_document_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_document_updated_at();