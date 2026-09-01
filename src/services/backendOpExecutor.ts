/**
 * backendOpExecutor — Move C transactional commit across backend layers.
 *
 * Executes the `backendOps` carried by a PatchPlan after the canonical
 * pipeline + preview / publish gates + element readiness all pass. Failures
 * here cause `commitMutation` to mark the revision as `rejected` and
 * propagate the diagnostics back to the caller.
 *
 * Ops supported:
 *   - `requireCapability`  → idempotent install-system call for the systemType
 *                            implied by the capability (booking → 'booking',
 *                            commerce → 'store', etc.).
 *   - `seedCapability`     → light-weight seeders for capabilities that need
 *                            backend rows to satisfy `rowAssertion`
 *                            (currently: booking — inserts one default
 *                            service + a 7-day availability window).
 *
 * Each op is best-effort idempotent: re-running a commit with the same
 * backendOps must NOT produce duplicate rows.
 */

import { supabase } from '@/integrations/supabase/client';
import type { BackendOp } from '@/types/patchPlan';
import type { BuilderIdentity } from '@/types/builderIdentity';
import type { CapabilityId } from '@/platform/core/capabilityRegistry';

export type BackendOpStatus = 'ok' | 'skipped' | 'failed';

export interface BackendOpResult {
  op: BackendOp;
  status: BackendOpStatus;
  detail?: string;
}

export interface BackendOpExecutionReport {
  results: BackendOpResult[];
  failedCount: number;
}

// ----------------------------------------------------------------------------
// Capability → install-system systemType mapping
// ----------------------------------------------------------------------------

type InstallSystemType = 'booking' | 'portfolio' | 'store' | 'agency' | 'content' | 'saas';

function capabilityToSystemType(cap: CapabilityId): InstallSystemType | null {
  switch (cap) {
    case 'booking':
      return 'booking';
    case 'commerce':
      return 'store';
    case 'donation':
      return 'content';
    case 'newsletter':
      return 'content';
    case 'lead-capture':
    case 'quoting':
      return 'agency';
    case 'auth':
      return 'saas';
    case 'contact':
      return null; // contact is universal — no install-system call needed
    default:
      return null;
  }
}

// ----------------------------------------------------------------------------
// Seeders
// ----------------------------------------------------------------------------

async function seedBooking(businessId: string): Promise<BackendOpStatus> {
  try {
    // Idempotent: if any availability_slot already exists for this business,
    // skip seeding.
    const { count: slotCount } = await supabase
      .from('availability_slots')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);
    if ((slotCount ?? 0) > 0) return 'skipped';

    // Ensure at least one service exists.
    const { count: svcCount } = await supabase
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);
    let serviceId: string | null = null;
    if ((svcCount ?? 0) === 0) {
      const { data: svc, error: svcErr } = await supabase
        .from('services')
        .insert({
          business_id: businessId,
          name: 'Default Service',
          duration_minutes: 60,
          price_cents: 0,
          is_active: true,
        })
        .select('id')
        .single();
      if (svcErr) return 'failed';
      serviceId = (svc as { id: string } | null)?.id ?? null;
    } else {
      const { data: existing } = await supabase
        .from('services')
        .select('id')
        .eq('business_id', businessId)
        .limit(1)
        .maybeSingle();
      serviceId = (existing as { id: string } | null)?.id ?? null;
    }

    // Seed a 7-day, 9am-5pm availability window.
    const now = new Date();
    const slots: Array<Record<string, unknown>> = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d + 1, 9, 0, 0);
      const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 17, 0, 0);
      slots.push({
        business_id: businessId,
        service_id: serviceId,
        starts_at: day.toISOString(),
        ends_at: end.toISOString(),
        is_booked: false,
      });
    }
    const { error: slotErr } = await supabase.from('availability_slots').insert(slots);
    if (slotErr) return 'failed';
    return 'ok';
  } catch {
    return 'failed';
  }
}

async function seedCapability(
  cap: CapabilityId,
  businessId: string,
): Promise<BackendOpStatus> {
  switch (cap) {
    case 'booking':
      return seedBooking(businessId);
    default:
      return 'skipped';
  }
}

// ----------------------------------------------------------------------------
// requireCapability — idempotent install-system call
// ----------------------------------------------------------------------------

async function requireCapability(
  cap: CapabilityId,
  identity: BuilderIdentity,
): Promise<BackendOpStatus> {
  const systemType = capabilityToSystemType(cap);
  if (!systemType) return 'skipped';
  try {
    const { error } = await supabase.functions.invoke('install-system', {
      body: {
        systemType,
        businessId: identity.businessId,
      },
    });
    if (error) return 'failed';
    return 'ok';
  } catch {
    return 'failed';
  }
}

// ----------------------------------------------------------------------------
// Public entry
// ----------------------------------------------------------------------------

export async function executeBackendOps(
  ops: BackendOp[],
  identity: BuilderIdentity,
): Promise<BackendOpExecutionReport> {
  const results: BackendOpResult[] = [];
  for (const op of ops) {
    const cap = op.capability as CapabilityId;
    if (op.type === 'requireCapability') {
      const status = await requireCapability(cap, identity);
      results.push({ op, status });
      continue;
    }
    if (op.type === 'seedCapability') {
      const status = await seedCapability(cap, identity.businessId);
      results.push({ op, status });
      continue;
    }
    results.push({ op, status: 'skipped', detail: 'unrecognised op type' });
  }
  return {
    results,
    failedCount: results.filter((r) => r.status === 'failed').length,
  };
}
