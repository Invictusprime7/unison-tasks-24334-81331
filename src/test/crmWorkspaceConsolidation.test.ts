import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('CRM workspace consolidation', () => {
  it('mounts one scoped CRM projection from Cloud', () => {
    const cloud = source('src/components/cloud/CloudProjects.tsx');
    const routes = source('src/routes/routeConfig.tsx');

    expect(cloud).toContain('<CRMDashboard');
    expect(cloud).toContain('businessId={selectedBusiness.id}');
    expect(cloud).toContain('projectId={selectedScopeProject.id}');
    expect(cloud).not.toContain('const crmTabs:');
    expect(cloud).not.toContain('renderCRMContent');
    expect(routes).not.toContain('lazy(() => import("@/pages/CRMDashboard"))');
  });

  it('keeps bookings, recipes, and automation rules inside the selected workspace', () => {
    const dashboard = source('src/pages/CRMDashboard.tsx');
    const bookings = source('src/components/crm/CRMBookings.tsx');
    const recipes = source('src/components/crm/PrebuiltWorkflows.tsx');
    const automations = source('src/components/crm/CRMAutomations.tsx');

    expect(dashboard).toContain('<CRMBookings businessId={businessId} projectId={projectId} />');
    expect(dashboard).toContain('<PrebuiltWorkflows businessId={businessId} />');
    expect(dashboard).toContain('<CRMAutomations businessId={businessId} projectId={projectId} />');
    expect(bookings).toContain(".eq('business_id', businessId)");
    expect(bookings).toContain("query.eq('site_id', siteId)");
    expect(recipes).not.toContain('.eq("owner_id", user.id)');
    expect(automations).toContain('.eq("business_id", businessId)');
    expect(automations).toContain('.eq("project_id", projectId)');
  });

  it('enforces tenant and project scope for CRM automation rules', () => {
    const migration = source('supabase/migrations/20260809014108_scope_crm_automations_to_workspace.sql');

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS business_id');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS project_id');
    expect(migration).toContain('public.is_business_member(business_id)');
    expect(migration).toContain('projects.business_id = crm_automations.business_id');
    expect(migration).toContain('TO authenticated');
  });
});
