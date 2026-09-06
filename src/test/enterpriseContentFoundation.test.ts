import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260806202710_add_enterprise_content_foundation.sql'),
  'utf8',
);
const commandMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260806203649_add_content_entry_command.sql'),
  'utf8',
);

describe('enterprise content foundation', () => {
  it('creates tenant-scoped types and workflow-aware content entries', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.content_types');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.content_entries');
    expect(migration).toContain("status IN ('draft', 'review', 'published', 'archived')");
    expect(migration).toContain('assert_content_entry_scope');
    expect(migration).toContain('Content entry must use a content type from the same business');
  });

  it('keeps revisions and publishing history server-owned and append-only', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.content_entry_revisions');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.content_publish_events');
    expect(migration).toContain('reject_content_revision_mutation');
    expect(migration).toContain('Content revisions are immutable');
    expect(migration).toContain('REVOKE ALL ON TABLE public.content_entries FROM anon, authenticated');
    expect(migration).toContain('REVOKE ALL ON TABLE public.content_entry_revisions FROM anon, authenticated');
  });

  it('writes content changes and revisions atomically through a service-role-only command', () => {
    expect(commandMigration).toContain('CREATE OR REPLACE FUNCTION public.cms_apply_content_entry_command');
    expect(commandMigration).toContain("p_action NOT IN ('create', 'update', 'transition')");
    expect(commandMigration).toContain('INSERT INTO public.content_entry_revisions');
    expect(commandMigration).toContain('INSERT INTO public.content_publish_events');
    expect(commandMigration).toContain("event_type = 'published' AND previous_status = 'review'");
    expect(commandMigration).toContain("archived_at = CASE WHEN p_target_status = 'archived' THEN now() ELSE archived_at END");
    expect(commandMigration).toContain("WHEN 'content.write' THEN public.is_business_editor");
    expect(commandMigration).toContain("WHEN 'content.publish' THEN public.is_business_admin");
    expect(commandMigration).toContain('GRANT EXECUTE ON FUNCTION public.cms_apply_content_entry_command');
    expect(commandMigration).toContain('TO service_role');
  });
});