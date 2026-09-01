/**
 * businessMembership — shared fetchers + RPC wrappers for the
 * Business Selector / Reassignment surfaces.
 *
 * Consumers:
 *   - <BusinessSelector /> (wizard + Web Builder pill + Settings)
 *   - Cloud Settings "Projects & businesses" card
 *
 * Every helper is intentionally light and stateless — components own
 * their loading state and re-fetch on demand.
 */

import { supabase } from '@/integrations/supabase/client';

export type BusinessRole = 'owner' | 'admin' | 'member';

export interface BusinessMembershipRow {
  businessId: string;
  name: string;
  industry: string | null;
  role: BusinessRole;
}

/**
 * Load every business the given user can see, tagged with their role.
 * `owner` beats `admin` beats `member` when both `businesses.owner_id`
 * and `business_members` match.
 */
export async function loadBusinessMemberships(userId: string): Promise<BusinessMembershipRow[]> {
  if (!userId) return [];

  const [ownedRes, memberRes] = await Promise.all([
    supabase.from('businesses').select('id, name, industry, owner_id').eq('owner_id', userId),
    supabase
      .from('business_members')
      .select('business_id, role, businesses:business_id ( id, name, industry )')
      .eq('user_id', userId),
  ]);

  const byId = new Map<string, BusinessMembershipRow>();

  for (const row of ownedRes.data ?? []) {
    byId.set(row.id, {
      businessId: row.id,
      name: row.name,
      industry: (row as any).industry ?? null,
      role: 'owner',
    });
  }

  for (const row of (memberRes.data as any[]) ?? []) {
    const biz = row.businesses;
    if (!biz?.id) continue;
    if (byId.has(biz.id)) continue; // owner wins
    const role = (String(row.role).toLowerCase() as BusinessRole);
    byId.set(biz.id, {
      businessId: biz.id,
      name: biz.name,
      industry: biz.industry ?? null,
      role: role === 'owner' || role === 'admin' ? role : 'member',
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function isAdminRole(role: BusinessRole): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Create a new business owned by the current user. Returns the new row id.
 */
export async function createBusinessInline(input: {
  userId: string;
  name: string;
  industry?: string | null;
}): Promise<{ id: string; name: string } | null> {
  const trimmed = input.name.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      name: trimmed,
      owner_id: input.userId,
      industry: input.industry ?? null,
    })
    .select('id, name')
    .single();

  if (error) throw error;
  return data ? { id: data.id, name: data.name } : null;
}

/**
 * Move a project into a different Business Profile. The RPC enforces
 * that the caller is an admin of both the source (if any) and target.
 */
export async function reassignProjectToBusiness(
  projectId: string,
  targetBusinessId: string,
): Promise<void> {
  const { error } = await supabase.rpc('reassign_project_business' as any, {
    _project_id: projectId,
    _target_business_id: targetBusinessId,
  });
  if (error) throw new Error(error.message || 'Failed to move project');
}
