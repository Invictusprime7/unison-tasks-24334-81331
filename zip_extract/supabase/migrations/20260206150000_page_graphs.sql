-- =========================================
-- PAGE GRAPHS - Site Graph Storage
-- "Click nav → page exists with features"
-- =========================================

-- Page graphs table stores the PageGraph for each project
CREATE TABLE IF NOT EXISTS public.page_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    
    -- The pages array (JSON)
    pages JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Quick lookup: navKey → pageId
    nav_index JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Version for caching/conflict resolution
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure one graph per project
    CONSTRAINT page_graphs_project_unique UNIQUE (project_id)
);

-- Index for project lookups
CREATE INDEX IF NOT EXISTS idx_page_graphs_project_id ON public.page_graphs(project_id);

-- Index for business lookups
CREATE INDEX IF NOT EXISTS idx_page_graphs_business_id ON public.page_graphs(business_id);

-- Enable RLS
ALTER TABLE public.page_graphs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own project's page graphs
CREATE POLICY "Users can view own page graphs"
    ON public.page_graphs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = page_graphs.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Policy: Users can insert page graphs for their own projects
CREATE POLICY "Users can insert own page graphs"
    ON public.page_graphs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = page_graphs.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Policy: Users can update their own project's page graphs
CREATE POLICY "Users can update own page graphs"
    ON public.page_graphs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = page_graphs.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Policy: Users can delete their own project's page graphs
CREATE POLICY "Users can delete own page graphs"
    ON public.page_graphs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = page_graphs.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- =========================================
-- NAV MODELS - Semantic Navigation Storage
-- =========================================

-- Optional: Store nav models separately for shared navigation
CREATE TABLE IF NOT EXISTS public.nav_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    
    -- The nav items array
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Style preferences
    style JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Home navKey
    home_key TEXT NOT NULL DEFAULT 'home',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT nav_models_project_unique UNIQUE (project_id)
);

-- Index for project lookups
CREATE INDEX IF NOT EXISTS idx_nav_models_project_id ON public.nav_models(project_id);

-- Enable RLS
ALTER TABLE public.nav_models ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own nav models
CREATE POLICY "Users can view own nav models"
    ON public.nav_models
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = nav_models.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Policy: Users can manage their own nav models
CREATE POLICY "Users can manage own nav models"
    ON public.nav_models
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = nav_models.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- =========================================
-- FUNCTIONS
-- =========================================

-- Function to get or create a page graph for a project
CREATE OR REPLACE FUNCTION public.get_or_create_page_graph(
    p_project_id UUID,
    p_business_id UUID DEFAULT NULL
)
RETURNS public.page_graphs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_graph public.page_graphs;
BEGIN
    -- Try to get existing
    SELECT * INTO v_graph
    FROM public.page_graphs
    WHERE project_id = p_project_id;
    
    IF FOUND THEN
        RETURN v_graph;
    END IF;
    
    -- Create new
    INSERT INTO public.page_graphs (project_id, business_id)
    VALUES (p_project_id, p_business_id)
    RETURNING * INTO v_graph;
    
    RETURN v_graph;
END;
$$;

-- Function to add a page to the graph
CREATE OR REPLACE FUNCTION public.add_page_to_graph(
    p_project_id UUID,
    p_nav_key TEXT,
    p_page JSONB
)
RETURNS public.page_graphs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_graph public.page_graphs;
    v_page_id TEXT;
BEGIN
    -- Get page ID from the page object
    v_page_id := p_page->>'id';
    
    -- Update the graph
    UPDATE public.page_graphs
    SET 
        pages = pages || jsonb_build_array(p_page),
        nav_index = nav_index || jsonb_build_object(p_nav_key, v_page_id),
        version = version + 1,
        updated_at = now()
    WHERE project_id = p_project_id
    RETURNING * INTO v_graph;
    
    RETURN v_graph;
END;
$$;

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_page_graphs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER page_graphs_updated_at
    BEFORE UPDATE ON public.page_graphs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_page_graphs_updated_at();

CREATE TRIGGER nav_models_updated_at
    BEFORE UPDATE ON public.nav_models
    FOR EACH ROW
    EXECUTE FUNCTION public.update_page_graphs_updated_at();
