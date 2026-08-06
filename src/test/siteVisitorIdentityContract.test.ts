import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const siteAuth = readFileSync(
  resolve(process.cwd(), 'supabase/functions/site-auth/index.ts'),
  'utf8',
);
const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260806033000_align_site_users_with_canonical_sites.sql'),
  'utf8',
);
const overlay = readFileSync(
  resolve(process.cwd(), 'src/components/preview/PreviewOverlayManager.tsx'),
  'utf8',
);

describe('generated-site visitor identity contract', () => {
  it('resolves visitor tenancy from the canonical site record', () => {
    expect(siteAuth).toContain('.from("sites")');
    expect(siteAuth).toContain('.select("id,business_id,status")');
    expect(siteAuth).toContain('business_id: site.business_id');
    expect(siteAuth).not.toContain('normalizedBusinessId');
  });

  it('does not let a browser choose the visitor business tenant', () => {
    expect(overlay).not.toMatch(/action:\s*'register',[\s\S]{0,200}businessId,/);
  });

  it('migrates visitor accounts through a project-to-site mapping and fails closed for orphans', () => {
    expect(migration).toContain('visitor.site_id = project.id');
    expect(migration).toContain('SET canonical_site_id = project.site_id');
    expect(migration).toContain('RAISE EXCEPTION');
    expect(migration).toContain('REFERENCES public.sites(id) ON DELETE CASCADE');
    expect(migration).toContain('DROP CONSTRAINT IF EXISTS site_users_site_id_email_key');
  });
});