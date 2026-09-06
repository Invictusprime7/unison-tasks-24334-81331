/**
 * businessSystemSnapshot — Step 6 of the capability plan.
 *
 * Projects the *live* backend into a single, machine-checkable object so every
 * consumer (readiness chips, AI Builder backend tab, publish gate) reads the
 * same truth instead of guessing from local state.
 *
 * The projection is evidence-based:
 *   - table reachability is probed through the Data API (a permission error is
 *     itself evidence: the table exists but the caller may not read it),
 *   - row presence is probed per business so "installed but empty" is visible,
 *   - readiness assertions come from the pack contracts, never from prose.
 *
 * Nothing here mutates anything. Provisioning stays in `capabilityProvisioner`.
 */

import { supabase } from '@/integrations/supabase/client';
import type { BusinessCapability } from '@/platform/core/capabilityRegistry';
import {
  CAPABILITY_PACKS,
  packForCapability,
  resolveCapabilityPacks,
  type CapabilityPack,
  type PackAssertion,
} from '@/platform/core/capabilityPacks';

export type TableProbeStatus = 'live' | 'empty' | 'forbidden' | 'missing' | 'unknown';

export interface TableProjection {
  table: string;
  status: TableProbeStatus;
  /** Rows visible to the caller for this business (capped probe, not a count). */
  hasRows: boolean;
  message?: string;
}

export type CapabilityState = 'live' | 'installed_empty' | 'stub' | 'missing';

export interface CapabilityProjection {
  capability: BusinessCapability;
  packName: string;
  state: CapabilityState;
  tables: TableProjection[];
  /** Blocking assertions that are demonstrably unsatisfied. */
  blockingGaps: string[];
  advisoryGaps: string[];
  slots: string[];
  dataSources: string[];
}

export interface BusinessSystemSnapshot {
  businessId: string | null;
  projectedAt: string;
  capabilities: CapabilityProjection[];
  /** Capabilities with a real, reachable, non-empty backend. */
  liveCapabilities: BusinessCapability[];
  /** Declared by the site but not backed by usable data — these block publish. */
  stubCapabilities: BusinessCapability[];
  /** Tables that answered the probe, whatever their row count. */
  liveTables: string[];
  blockers: string[];
  warnings: string[];
}

const BUSINESS_SCOPED_COLUMN = 'business_id';

/** Tables keyed by their own id rather than a business_id foreign key. */
const SELF_SCOPED_TABLES = new Set(['businesses']);

async function probeTable(table: string, businessId: string | null): Promise<TableProjection> {
  try {
    let query = supabase.from(table as never).select('*', { count: 'exact', head: true }).limit(1);
    if (businessId) {
      query = SELF_SCOPED_TABLES.has(table)
        ? query.eq('id', businessId)
        : query.eq(BUSINESS_SCOPED_COLUMN, businessId);
    }
    const { count, error } = await query;

    if (error) {
      const message = error.message ?? 'probe failed';
      if (/permission denied|not allowed|rls/i.test(message)) {
        return { table, status: 'forbidden', hasRows: false, message };
      }
      if (/does not exist|could not find the table|schema cache/i.test(message)) {
        return { table, status: 'missing', hasRows: false, message };
      }
      return { table, status: 'unknown', hasRows: false, message };
    }

    const rows = typeof count === 'number' ? count : 0;
    return { table, status: rows > 0 ? 'live' : 'empty', hasRows: rows > 0 };
  } catch (err) {
    return {
      table,
      status: 'unknown',
      hasRows: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

function assertionGaps(
  pack: CapabilityPack,
  tables: TableProjection[],
): { blocking: string[]; advisory: string[] } {
  const byTable = new Map(tables.map((t) => [t.table, t]));
  const blocking: string[] = [];
  const advisory: string[] = [];

  const record = (assertion: PackAssertion, reason: string) => {
    (assertion.blocking ? blocking : advisory).push(`${assertion.description} (${reason})`);
  };

  for (const assertion of pack.readiness.assertions) {
    const target = assertion.target.split('.')[0];
    const probe = byTable.get(target);
    if (!probe) continue; // settings/handler assertions are checked elsewhere

    switch (assertion.kind) {
      case 'table-exists':
      case 'column-exists':
      case 'rls-enabled':
      case 'policy-exists':
        if (probe.status === 'missing') record(assertion, `${target} is not provisioned`);
        break;
      case 'row-exists':
        if (probe.status === 'missing') record(assertion, `${target} is not provisioned`);
        else if (!probe.hasRows) record(assertion, `${target} has no rows for this business`);
        break;
      default:
        break;
    }
  }

  return { blocking, advisory };
}

function stateFor(pack: CapabilityPack, tables: TableProjection[]): CapabilityState {
  if (tables.length === 0) return 'missing';
  if (tables.some((t) => t.status === 'missing')) return 'missing';
  // Reference tables the runtime reads for content decide "live vs empty".
  const contentTables = pack.database.tables
    .filter((c) => c.publicRead)
    .map((c) => c.table);
  const relevant = tables.filter((t) => contentTables.includes(t.table));
  const pool = relevant.length > 0 ? relevant : tables;
  if (pool.some((t) => t.hasRows)) return 'live';
  if (pool.every((t) => t.status === 'forbidden' || t.status === 'unknown')) return 'stub';
  return 'installed_empty';
}

export interface ProjectBusinessSystemInput {
  businessId: string | null;
  /** Capabilities the site declares it needs. Defaults to every known pack. */
  capabilities?: BusinessCapability[];
}

/**
 * Builds the snapshot. Never throws — an unreachable backend is reported as
 * `unknown` probes plus warnings, so the UI degrades instead of blanking out.
 */
export async function projectBusinessSystemSnapshot(
  input: ProjectBusinessSystemInput,
): Promise<BusinessSystemSnapshot> {
  const { businessId } = input;
  const requested = input.capabilities?.length
    ? input.capabilities
    : CAPABILITY_PACKS.map((p) => p.id);

  const { order, unsupported } = resolveCapabilityPacks(requested);

  const uniqueTables = Array.from(
    new Set(order.flatMap((pack) => pack.database.tables.map((t) => t.table))),
  );
  const probes = await Promise.all(uniqueTables.map((table) => probeTable(table, businessId)));
  const probeByTable = new Map(probes.map((p) => [p.table, p]));

  const capabilities: CapabilityProjection[] = order.map((pack) => {
    const tables = pack.database.tables
      .map((c) => probeByTable.get(c.table))
      .filter((p): p is TableProjection => Boolean(p));
    const gaps = assertionGaps(pack, tables);
    return {
      capability: pack.id,
      packName: pack.name,
      state: stateFor(pack, tables),
      tables,
      blockingGaps: gaps.blocking,
      advisoryGaps: gaps.advisory,
      slots: pack.frontend.slots,
      dataSources: pack.frontend.dataSources,
    };
  });

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!businessId) {
    warnings.push('No business is bound to this project, so row-level readiness could not be checked.');
  }
  for (const capability of unsupported) {
    warnings.push(`Capability "${capability}" has no pack implementation yet.`);
  }
  for (const projection of capabilities) {
    for (const gap of projection.blockingGaps) blockers.push(`${projection.packName}: ${gap}`);
    for (const gap of projection.advisoryGaps) warnings.push(`${projection.packName}: ${gap}`);
  }

  return {
    businessId,
    projectedAt: new Date().toISOString(),
    capabilities,
    liveCapabilities: capabilities.filter((c) => c.state === 'live').map((c) => c.capability),
    stubCapabilities: capabilities
      .filter((c) => c.state === 'stub' || c.state === 'missing')
      .map((c) => c.capability),
    liveTables: probes.filter((p) => p.status !== 'missing').map((p) => p.table),
    blockers,
    warnings,
  };
}

/** True when every declared capability has a reachable, non-empty backend. */
export function isSystemPublishReady(snapshot: BusinessSystemSnapshot): boolean {
  return snapshot.blockers.length === 0 && snapshot.stubCapabilities.length === 0;
}

/** One-line summary for logs and readiness chips. */
export function describeSystemSnapshot(snapshot: BusinessSystemSnapshot): string {
  const live = snapshot.liveCapabilities.length;
  const total = snapshot.capabilities.length;
  const stubs = snapshot.stubCapabilities.length;
  const base = `${live}/${total} capabilities live`;
  return stubs > 0 ? `${base}; ${stubs} stub` : base;
}

/** Convenience: the pack contract behind a projection row. */
export function packForProjection(projection: CapabilityProjection): CapabilityPack | null {
  return packForCapability(projection.capability);
}
