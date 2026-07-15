/**
 * ProjectBusinessSettings — Cloud Settings card that lets creators
 * reassign their projects between business profiles and create new
 * businesses inline. Only admins/owners of a business appear in the
 * dropdown; the RPC guards enforce this on the server too.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { BusinessSelector } from '@/components/business/BusinessSelector';
import { reassignProjectToBusiness } from '@/services/businessMembership';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Row {
  id: string;
  name: string;
  business_id: string | null;
  business_name: string | null;
  updated_at: string;
}

export function ProjectBusinessSettings() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, business_id, updated_at, businesses:business_id ( name )')
        .eq('owner_id', uid)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setRows(
        (data ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          business_id: r.business_id,
          business_name: r.businesses?.name ?? null,
          updated_at: r.updated_at,
        })),
      );
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleReassign = async (projectId: string, nextBusinessId: string) => {
    try {
      await reassignProjectToBusiness(projectId, nextBusinessId);
      toast.success('Project moved');
      setRows((prev) =>
        prev.map((r) => (r.id === projectId ? { ...r, business_id: nextBusinessId } : r)),
      );
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to move project');
    }
  };

  return (
    <Card className="bg-[#12121e] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white">Projects & Businesses</CardTitle>
        <CardDescription className="text-gray-400">
          Choose which Business Profile each generated project is saved under. Only admins of the
          target business can receive a move.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-400 py-6">
            No projects yet. Launch one from the System Launcher to start.
          </div>
        ) : (
          <div className="divide-y divide-cyan-500/10">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{row.name || 'Untitled project'}</div>
                  <div className="text-xs text-gray-500">
                    Updated {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })}
                    {row.business_name ? ` · ${row.business_name}` : ' · unassigned'}
                  </div>
                </div>
                <BusinessSelector
                  value={row.business_id}
                  onChange={(id) => handleReassign(row.id, id)}
                  mode="admin"
                  allowCreate
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
