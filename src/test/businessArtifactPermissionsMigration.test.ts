import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260806023714_harden_business_artifact_permissions.sql'),
  'utf8',
);

describe('business artifact permission migration', () => {
  it('separates owner, admin, and editor authorization from membership visibility', () => {
    expect(migration).toContain('FUNCTION public.is_business_owner');
    expect(migration).toContain('FUNCTION public.is_business_admin');
    expect(migration).toContain('FUNCTION public.is_business_editor');
    expect(migration).toContain('FUNCTION public.business_has_permission');
    expect(migration).toContain("lower(bm.role) IN ('manager', 'editor')");
  });

  it('does not give members full artifact graph write access', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "project_component_instances_member_full"');
    expect(migration).toContain('DROP POLICY IF EXISTS "project_component_bindings_member_full"');
    expect(migration).not.toMatch(/FOR ALL TO authenticated[\s\S]*is_business_member\(business_id\)/);
    expect(migration).toContain("business_has_permission(business_id, 'artifact.write')");
    expect(migration).toContain("business_has_permission(business_id, 'artifact.delete')");
  });

  it('preserves catalog reads while restricting catalog writes and deletes by role', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "menu_items_member_all"');
    expect(migration).toContain('DROP POLICY IF EXISTS "pricing_plans_member_all"');
    expect(migration).toContain('DROP POLICY IF EXISTS "members manage featured_offers"');
    expect(migration).toContain("business_has_permission(business_id, 'catalog.write')");
    expect(migration).toContain("business_has_permission(business_id, 'catalog.delete')");
  });

  it('does not require the optional legacy products relation to exist', () => {
    expect(migration).toContain("IF to_regclass('public.products') IS NOT NULL THEN");
    expect(migration).toContain('CREATE POLICY "products_insert_editor"');
  });

  it('keeps permission helper RPC access off the anonymous role', () => {
    expect(migration).toContain('REVOKE EXECUTE ON FUNCTION public.business_has_permission(uuid, text) FROM PUBLIC, anon');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.business_has_permission(uuid, text) TO authenticated');
  });
});