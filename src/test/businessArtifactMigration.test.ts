import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260729015441_harden_business_artifact_runtime.sql'),
  'utf8',
);

describe('business artifact runtime migration', () => {
  it('registers ServiceGrid as a canonical services-backed artifact', () => {
    expect(migration).toContain("'service-grid'");
    expect(migration).toContain("'ServiceGrid'");
    expect(migration).toContain("'[\"dataBindingId\"]'::jsonb");
  });

  it('business-scopes instances and normalized data bindings', () => {
    expect(migration).toMatch(/project_component_instances[\s\S]+business_id uuid/);
    expect(migration).toMatch(/project_component_bindings[\s\S]+site_data_binding_id uuid/);
    expect(migration).toContain('Artifact business_id must match its project business_id');
    expect(migration).toContain('Data binding must belong to the same business and project');
  });

  it('replaces owner-only graph policies with business membership policies', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "project_component_instances_owner_full"');
    expect(migration).toContain('DROP POLICY IF EXISTS "project_component_bindings_owner_full"');
    expect(migration.match(/public\.is_business_member\(business_id\)/g)).toHaveLength(4);
  });

  it('quarantines legacy unscoped rows and promotes them when the project gains a business', () => {
    expect(migration).toContain('NULL is reserved for read-only artifacts');
    expect(migration).toContain('project_component_instances_legacy_owner_read');
    expect(migration).toContain('project_component_bindings_legacy_owner_read');
    expect(migration).toContain('promote_project_artifacts_to_business');
    expect(migration).not.toContain('ALTER COLUMN business_id SET NOT NULL');
  });
});