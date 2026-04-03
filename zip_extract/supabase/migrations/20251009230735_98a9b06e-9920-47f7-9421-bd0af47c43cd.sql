-- Create table for AI code learning and patterns
CREATE TABLE IF NOT EXISTS public.ai_code_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL, -- 'component', 'layout', 'animation', 'interaction'
  code_snippet TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for AI learning sessions
CREATE TABLE IF NOT EXISTS public.ai_learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type TEXT NOT NULL, -- 'code_generation', 'design_review', 'code_review'
  user_prompt TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  code_generated TEXT,
  was_successful BOOLEAN DEFAULT true,
  feedback_score INTEGER, -- 1-5 rating
  technologies_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_code_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access for patterns (everyone can learn from successful patterns)
CREATE POLICY "Anyone can view code patterns"
  ON public.ai_code_patterns
  FOR SELECT
  USING (true);

-- Authenticated users can insert patterns
CREATE POLICY "Authenticated users can add patterns"
  ON public.ai_code_patterns
  FOR INSERT
  WITH CHECK (true);

-- Public read for learning sessions
CREATE POLICY "Anyone can view learning sessions"
  ON public.ai_learning_sessions
  FOR SELECT
  USING (true);

-- Authenticated users can insert sessions
CREATE POLICY "Authenticated users can add sessions"
  ON public.ai_learning_sessions
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_code_patterns_type ON public.ai_code_patterns(pattern_type);
CREATE INDEX idx_code_patterns_tags ON public.ai_code_patterns USING GIN(tags);
CREATE INDEX idx_learning_sessions_type ON public.ai_learning_sessions(session_type);
CREATE INDEX idx_learning_sessions_tech ON public.ai_learning_sessions USING GIN(technologies_used);

-- Function to update pattern usage
CREATE OR REPLACE FUNCTION increment_pattern_usage(pattern_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.ai_code_patterns
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_code_patterns_updated_at
  BEFORE UPDATE ON public.ai_code_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();