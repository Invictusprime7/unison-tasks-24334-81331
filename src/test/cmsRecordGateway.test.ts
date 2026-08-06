import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const endpoint = readFileSync(
  resolve(process.cwd(), 'supabase/functions/cms-records/index.ts'),
  'utf8',
);
const service = readFileSync(
  resolve(process.cwd(), 'src/services/cmsRecordService.ts'),
  'utf8',
);

describe('CMS record gateway contract', () => {
  it('uses a resource allowlist and never accepts client table names', () => {
    expect(endpoint).toContain('getCmsResourceContract(body.resource)');
    expect(endpoint).toContain('resource.sourceTable');
    expect(endpoint).not.toMatch(/body\.table|table:\s*body\./);
  });

  it('authorizes reads and mutations by explicit catalog permissions', () => {
    expect(endpoint).toContain('"catalog.read"');
    expect(endpoint).toContain('"catalog.write"');
    expect(endpoint).toContain('"catalog.delete"');
    expect(endpoint).toContain('business_has_permission');
  });

  it('binds an operator CMS request to the canonical site-project-business tuple', () => {
    expect(endpoint).toContain('async function resolveCmsScope');
    expect(endpoint).toContain('.from("sites")');
    expect(endpoint).toContain('.eq("site_id", input.siteId)');
    expect(endpoint).toContain('project.id !== input.projectId');
    expect(endpoint).toContain('Site, project, or business scope is invalid');
    expect(service).toContain('siteId?: string | null');
  });

  it('validates registry-defined editable and required fields before mutating', () => {
    expect(endpoint).toContain('Field "${key}" is not editable for this resource');
    expect(endpoint).toContain('resource.requiredFields');
    expect(endpoint).toContain('At least one editable value is required');
  });

  it('keeps the browser surface resource-based', () => {
    expect(service).toContain("functions.invoke('cms-records'");
    expect(service).not.toContain(".from('");
  });
});