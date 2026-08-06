import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260806030000_provision_products_catalog_table.sql'),
  'utf8',
);

describe('products provision migration', () => {
  it('creates the tenant-scoped product contract used by the catalog runtime', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.products');
    expect(migration).toContain('business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE');
    expect(migration).toContain('inventory_count integer NOT NULL DEFAULT 0 CHECK (inventory_count >= 0)');
    expect(migration).toContain('idx_products_business_featured');
  });

  it('keeps active product reads public while restricting mutations by business role', () => {
    expect(migration).toContain('CREATE POLICY "products_select_public_active"');
    expect(migration).toContain("business_has_permission(business_id, 'catalog.read')");
    expect(migration).toContain("business_has_permission(business_id, 'catalog.write')");
    expect(migration).toContain("business_has_permission(business_id, 'catalog.delete')");
  });
});