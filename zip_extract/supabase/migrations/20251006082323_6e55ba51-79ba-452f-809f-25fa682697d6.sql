-- Create templates table for storing design templates
CREATE TABLE public.design_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  canvas_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for templates
CREATE POLICY "Users can view their own templates"
ON public.design_templates
FOR SELECT
USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own templates"
ON public.design_templates
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
ON public.design_templates
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
ON public.design_templates
FOR DELETE
USING (user_id = auth.uid());

-- Create template versions table for version history
CREATE TABLE public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.design_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  canvas_data JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for template versions
CREATE POLICY "Users can view versions of their templates"
ON public.template_versions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.design_templates
  WHERE design_templates.id = template_versions.template_id
  AND design_templates.user_id = auth.uid()
));

CREATE POLICY "Users can create versions for their templates"
ON public.template_versions
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.design_templates
    WHERE design_templates.id = template_versions.template_id
    AND design_templates.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_design_templates_updated_at
BEFORE UPDATE ON public.design_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better performance
CREATE INDEX idx_design_templates_user_id ON public.design_templates(user_id);
CREATE INDEX idx_template_versions_template_id ON public.template_versions(template_id);