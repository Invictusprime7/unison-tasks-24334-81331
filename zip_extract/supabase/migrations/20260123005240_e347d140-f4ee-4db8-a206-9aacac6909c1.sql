-- Remove remaining INSERT WITH CHECK (true) policies

-- ai_code_patterns
DROP POLICY IF EXISTS "Authenticated users can add patterns" ON public.ai_code_patterns;
CREATE POLICY "ai_code_patterns_insert_authenticated"
ON public.ai_code_patterns
FOR INSERT
WITH CHECK (auth.uid() is not null);

-- ai_learning_sessions
DROP POLICY IF EXISTS "Authenticated users can add sessions" ON public.ai_learning_sessions;
CREATE POLICY "ai_learning_sessions_insert_authenticated"
ON public.ai_learning_sessions
FOR INSERT
WITH CHECK (auth.uid() is not null);
