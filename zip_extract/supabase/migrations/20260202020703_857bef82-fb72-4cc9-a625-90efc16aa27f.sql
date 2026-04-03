-- =============================================================================
-- AI Agent Registry: Schema Setup (Migration 1 of 2)
-- =============================================================================
-- Establishes enums, functions, columns, constraints, and indexes.
-- Agent seeding MUST happen in a separate migration after this commits.
-- =============================================================================

-- =============================================================================
-- PHASE 1: Enum Types (Idempotent Creation + Evolution)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.agent_tier AS ENUM ('free', 'pro', 'system', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_tier' AND typnamespace = 'public'::regnamespace) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='agent_tier' AND e.enumlabel='free') THEN
      ALTER TYPE public.agent_tier ADD VALUE 'free';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='agent_tier' AND e.enumlabel='pro') THEN
      ALTER TYPE public.agent_tier ADD VALUE 'pro';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='agent_tier' AND e.enumlabel='system') THEN
      ALTER TYPE public.agent_tier ADD VALUE 'system';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='agent_tier' AND e.enumlabel='enterprise') THEN
      ALTER TYPE public.agent_tier ADD VALUE 'enterprise';
    END IF;
  END IF;
END$$;

DO $$ BEGIN
  CREATE TYPE public.agent_ui_kind AS ENUM ('hidden', 'widget', 'modal', 'inline');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_ui_kind' AND typnamespace = 'public'::regnamespace) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='agent_ui_kind' AND e.enumlabel='hidden') THEN
      ALTER TYPE public.agent_ui_kind ADD VALUE 'hidden';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='agent_ui_kind' AND e.enumlabel='widget') THEN
      ALTER TYPE public.agent_ui_kind ADD VALUE 'widget';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='agent_ui_kind' AND e.enumlabel='modal') THEN
      ALTER TYPE public.agent_ui_kind ADD VALUE 'modal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='agent_ui_kind' AND e.enumlabel='inline') THEN
      ALTER TYPE public.agent_ui_kind ADD VALUE 'inline';
    END IF;
  END IF;
END$$;

-- =============================================================================
-- PHASE 2: Validation Functions (Search Path Secured)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.jsonb_is_string_array(j jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT j IS NOT NULL 
    AND jsonb_typeof(j) = 'array'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(j) elem
      WHERE jsonb_typeof(elem) <> 'string'
    );
$$;

CREATE OR REPLACE FUNCTION public.jsonb_is_object(j jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT j IS NOT NULL AND jsonb_typeof(j) = 'object';
$$;

-- =============================================================================
-- PHASE 3: Add Missing Columns (Idempotent)
-- =============================================================================

ALTER TABLE public.ai_agent_registry
  ADD COLUMN IF NOT EXISTS tier public.agent_tier DEFAULT 'free';

ALTER TABLE public.ai_agent_registry
  ADD COLUMN IF NOT EXISTS ui_kind text DEFAULT 'hidden';

-- =============================================================================
-- PHASE 4: Data Normalization + Safe Type Casting
-- =============================================================================

UPDATE public.ai_agent_registry
SET ui_kind = 'hidden'
WHERE ui_kind IS NULL
   OR trim(lower(ui_kind::text)) NOT IN ('hidden', 'widget', 'modal', 'inline');

UPDATE public.ai_agent_registry
SET ui_kind = trim(lower(ui_kind::text))
WHERE ui_kind IS NOT NULL;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_agent_registry'
      AND column_name = 'ui_kind'
      AND udt_name <> 'agent_ui_kind'
  ) THEN
    ALTER TABLE public.ai_agent_registry
      ALTER COLUMN ui_kind DROP DEFAULT;
    
    ALTER TABLE public.ai_agent_registry
      ALTER COLUMN ui_kind TYPE public.agent_ui_kind
      USING (ui_kind::public.agent_ui_kind);
    
    ALTER TABLE public.ai_agent_registry
      ALTER COLUMN ui_kind SET DEFAULT 'hidden'::public.agent_ui_kind;
  END IF;
END $$;

-- =============================================================================
-- PHASE 5: Constraint Management
-- =============================================================================

ALTER TABLE public.ai_agent_registry
  DROP CONSTRAINT IF EXISTS chk_allowed_tools_array,
  DROP CONSTRAINT IF EXISTS allowed_tools_is_string_array,
  DROP CONSTRAINT IF EXISTS chk_allowed_tools_string_array,
  DROP CONSTRAINT IF EXISTS chk_default_config_object,
  DROP CONSTRAINT IF EXISTS ai_agent_default_config_is_object,
  DROP CONSTRAINT IF EXISTS default_config_is_object;

UPDATE public.ai_agent_registry
SET allowed_tools = '[]'::jsonb
WHERE allowed_tools IS NULL OR jsonb_typeof(allowed_tools) <> 'array';

UPDATE public.ai_agent_registry
SET default_config = '{}'::jsonb
WHERE default_config IS NULL OR jsonb_typeof(default_config) <> 'object';

DO $$ BEGIN
  ALTER TABLE public.ai_agent_registry
    ADD CONSTRAINT chk_allowed_tools_string_array
    CHECK (public.jsonb_is_string_array(allowed_tools));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ai_agent_registry
    ADD CONSTRAINT chk_default_config_object
    CHECK (public.jsonb_is_object(default_config));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- PHASE 6: Indexes
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agent_registry_slug_version
  ON public.ai_agent_registry(slug, version);

CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_active
  ON public.ai_agent_registry(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_slug
  ON public.ai_agent_registry(slug);

CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_slug_active
  ON public.ai_agent_registry(slug, is_active);