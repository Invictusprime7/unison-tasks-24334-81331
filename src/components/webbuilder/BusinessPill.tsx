/**
 * BusinessPill — topbar chip in Web Builder that shows the project's
 * current Business Profile and, for admins, lets them move the project.
 */

import { useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BusinessSelector } from '@/components/business/BusinessSelector';
import { BuilderSessionContext } from '@/builder/controllers/BuilderSessionProvider';
import {
  loadBusinessMemberships,
  reassignProjectToBusiness,
  isAdminRole,
} from '@/services/businessMembership';

export function BusinessPill() {
  const { projectId, businessId, currentUserId } = useContext(BuilderSessionContext);
  const [localBusinessId, setLocalBusinessId] = useState<string | undefined>(businessId);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => setLocalBusinessId(businessId), [businessId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let uid = currentUserId;
      if (!uid) {
        const { data } = await supabase.auth.getUser();
        uid = data.user?.id ?? '';
      }
      if (!uid || !localBusinessId) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const memberships = await loadBusinessMemberships(uid);
      const row = memberships.find((r) => r.businessId === localBusinessId);
      if (!cancelled) setIsAdmin(!!row && isAdminRole(row.role));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, localBusinessId]);

  if (!projectId) return null;

  const handleChange = async (nextId: string) => {
    if (!projectId || nextId === localBusinessId) return;
    try {
      await reassignProjectToBusiness(projectId, nextId);
      setLocalBusinessId(nextId);
      toast.success('Project moved to new business profile');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to move project');
    }
  };

  return (
    <BusinessSelector
      value={localBusinessId}
      onChange={handleChange}
      mode="admin"
      size="sm"
      placeholder="No business"
      disabled={!isAdmin}
      allowCreate={false}
    />
  );
}
