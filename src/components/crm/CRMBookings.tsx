/**
 * CRMBookings — Milestone 1 golden-journey surface.
 *
 * Merges bookings alongside crm_leads inside CRMDashboard so a service
 * business owner sees inbound leads and inbound bookings in one place.
 * Read-only list for now; status transitions land in a follow-up.
 */
import { useEffect, useState } from 'react';
import { Calendar, Clock, User, Mail, Phone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface BookingRow {
  id: string;
  created_at: string;
  service_id: string | null;
  starts_at: string | null;
  status: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}

interface CRMBookingsProps {
  businessId?: string;
  projectId?: string;
}

export function CRMBookings({ businessId, projectId }: CRMBookingsProps = {}) {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!businessId) {
          setRows([]);
          setError('Select a business workspace to view bookings.');
          return;
        }

        let siteId: string | null = null;
        if (projectId) {
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('site_id')
            .eq('id', projectId)
            .eq('business_id', businessId)
            .maybeSingle();
          if (projectError) throw projectError;
          siteId = project?.site_id ?? null;
          if (!siteId) {
            setRows([]);
            return;
          }
        }

        let query = supabase
          .from('bookings')
          .select(
            'id, created_at, service_id, starts_at, status, customer_name, customer_email, customer_phone, notes, metadata',
          )
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(200);
        if (siteId) query = query.eq('site_id', siteId);

        const { data, error: err } = await query;
        if (err) throw err;
        setRows((data as BookingRow[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading bookings…
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No bookings yet. They'll appear here as customers reserve.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.id}
          className="border border-border rounded-lg p-4 bg-card flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              {r.customer_name ?? 'Anonymous'}
            </div>
            <Badge variant={r.status === 'confirmed' ? 'default' : 'secondary'}>
              {r.status ?? 'pending'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {r.starts_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(r.starts_at).toLocaleString()}
              </span>
            )}
            {r.customer_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {r.customer_email}
              </span>
            )}
            {r.customer_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {r.customer_phone}
              </span>
            )}
          </div>
          {r.notes && <p className="text-xs text-foreground/70">{r.notes}</p>}
        </div>
      ))}
    </div>
  );
}
