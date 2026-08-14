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
 *                            service + a 7-day availability window generated
 *                            from the business's `business_hours`, falling
 *                            back to a 9am-5pm default when none are set).
 *
 * Each op is best-effort idempotent: re-running a commit with the same
 * backendOps must NOT produce duplicate rows.
 */

import { supabase } from '@/integrations/supabase/client';
import type { BackendOp } from '@/types/patchPlan';
import type { BuilderIdentity } from '@/types/builderIdentity';
import type { CapabilityId } from '@/platform/core/capabilityRegistry';
import { generateAvailabilitySlots, type BusinessHoursWindow } from '@/services/availabilityGeneration';

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
    let durationMinutes = 60;
    if ((svcCount ?? 0) === 0) {
      const { data: svc, error: svcErr } = await supabase
        .from('services')
        .insert({
          business_id: businessId,
          name: 'Default Service',
          duration_minutes: durationMinutes,
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
        .select('id, duration_minutes')
        .eq('business_id', businessId)
        .limit(1)
        .maybeSingle();
      const existingService = existing as { id: string; duration_minutes: number | null } | null;
      serviceId = existingService?.id ?? null;
      if (existingService?.duration_minutes && existingService.duration_minutes > 0) {
        durationMinutes = existingService.duration_minutes;
      }
    }

    // Generate a 7-day availability window from the business's configured
    // hours, falling back to the legacy 9am-5pm default when none are set.
    const { data: hoursRows } = await supabase
      .from('business_hours')
      .select('day_of_week, opens_at, closes_at, is_closed')
      .eq('business_id', businessId);
    const hours: BusinessHoursWindow[] = (hoursRows ?? []).map((row) => ({
      dayOfWeek: row.day_of_week,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
      isClosed: row.is_closed,
    }));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const slots = generateAvailabilitySlots({
      businessId,
      serviceId: serviceId ?? '',
      durationMinutes,
      startDate: tomorrow,
      days: 7,
      hours,
    });
    if (slots.length === 0) return 'ok';
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
