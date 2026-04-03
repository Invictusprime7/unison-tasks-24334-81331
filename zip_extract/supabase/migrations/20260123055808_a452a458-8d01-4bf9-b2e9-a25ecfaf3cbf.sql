-- Recreate pg_net extension in the extensions schema to satisfy linter
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    -- Drop and recreate because pg_net doesn't support ALTER EXTENSION ... SET SCHEMA
    EXECUTE 'DROP EXTENSION pg_net';
  END IF;

  -- Recreate in the dedicated schema
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions';
END
$$;