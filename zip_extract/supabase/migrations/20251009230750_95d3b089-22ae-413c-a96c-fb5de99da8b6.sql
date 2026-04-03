-- Fix function search path warnings - drop trigger first
DROP TRIGGER IF EXISTS update_ai_code_patterns_updated_at ON public.ai_code_patterns;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS increment_pattern_usage(UUID);

-- Recreate with proper search_path
CREATE OR REPLACE FUNCTION increment_pattern_usage(pattern_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.ai_code_patterns
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_ai_code_patterns_updated_at
  BEFORE UPDATE ON public.ai_code_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();