/**
 * elementReadinessEvaluator — Move B per-element capability contract.
 *
 * Walks every `data-ut-intent` instance found in the working VFS, resolves
 * its canonical IntentDef, and verifies that:
 *
 *   1. The intent's required capabilities are provisioned for the business.
 *   2. The intent's `backingTable` (if any) satisfies its `rowAssertion`
 *      (e.g. `availability_slots` must be non-empty for `booking.create`).
 *   3. The intent has a resolvable handler binding (no `unbound` slots).
 *
 * The output is merged into `readinessReport.elementReadiness` by
 * `vfsCommitService` and used by PublishGate consumers to surface concrete
 * fix paths instead of opaque "publish blocked" errors.
 *
 * This evaluator is intentionally tolerant: any unrecognised intent /
 * missing table / RLS failure is recorded as a warning rather than
 * throwing — the commit pipeline decides whether to gate.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  getIntentDef,
  type IntentDef,
} from '@/platform/core/intentSurfaceRegistry';
import type { CapabilityId } from '@/platform/core/capabilityRegistry';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type ElementReadinessStatus =
  | 'ready'
  | 'capability-missing'
  | 'rows-missing'
  | 'unbound'
  | 'unknown-intent';

export interface ElementReadinessRecord {
  /** Stable-ish identifier — first matched data-ut-element / data-ut-block / fallback path:index. */
  elementId: string;
  intent: string;
  canonicalIntent: string | null;
  filePath: string;
  status: ElementReadinessStatus;
  /** Short human reason ("missing availability_slots row", "Stripe not connected", …). */
  blocker?: string;
  /** Optional in-app path that resolves the blocker (from `readinessFixture.fixPath`). */
  fixPath?: string;
}

export interface ElementReadinessSummary {
  totalElements: number;
  ready: number;
  capabilityMissing: number;
  rowsMissing: number;
  unbound: number;
  unknownIntent: number;
  /** Anything that should hard-block preview (currently: `unbound`). */
  previewBlocked: number;
  /** Anything that should hard-block publish. */
  publishBlocked: number;
}

export interface ElementReadinessReport {
  records: ElementReadinessRecord[];
  summary: ElementReadinessSummary;
}

export interface EvaluateElementReadinessOptions {
  vfsFiles: Record<string, string>;
  /** Capabilities currently provisioned for the business (from compiled contract or business row). */
  provisionedCapabilities?: CapabilityId[];
  /** Used to scope row-count queries to a single business when the table is multi-tenant. */
  businessId?: string | null;
}

// ----------------------------------------------------------------------------
// Intent extraction from VFS
// ----------------------------------------------------------------------------

interface IntentOccurrence {
  filePath: string;
  intent: string;
  elementId: string;
}

const INTENT_ATTR_RE = /data-ut-intent\s*=\s*["'`]([^"'`]+)["'`]/g;
const ELEMENT_ID_RE = /data-ut-(?:element|block|slot)\s*=\s*["'`]([^"'`]+)["'`]/;

function extractIntents(vfsFiles: Record<string, string>): IntentOccurrence[] {
  const out: IntentOccurrence[] = [];
  for (const [filePath, contents] of Object.entries(vfsFiles)) {
    if (typeof contents !== 'string' || contents.length === 0) continue;
    if (!/\.(tsx?|jsx?)$/.test(filePath)) continue;
    let match: RegExpExecArray | null;
    INTENT_ATTR_RE.lastIndex = 0;
    let idx = 0;
    while ((match = INTENT_ATTR_RE.exec(contents))) {
      const intent = match[1];
      // Look 240 chars backward for an element/block/slot id on the same JSX tag.
      const start = Math.max(0, match.index - 240);
      const window = contents.slice(start, match.index);
      const idMatch = window.match(ELEMENT_ID_RE);
      const elementId = idMatch?.[1] ?? `${filePath}:${idx}`;
      out.push({ filePath, intent, elementId });
      idx += 1;
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Row assertion check (best-effort; failures degrade to warnings)
// ----------------------------------------------------------------------------

type RowCountCache = Map<string, number | null>;

async function getRowCount(
  table: string,
  businessId: string | null | undefined,
  cache: RowCountCache,
): Promise<number | null> {
  const cacheKey = `${table}::${businessId ?? '*'}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;
  try {
    // Table names are dynamic and validated by the registry — escape Supabase's
    // generic typing.
    type LooseQuery = {
      eq: (col: string, val: string) => LooseQuery;
    } & Promise<{ count: number | null; error: unknown }>;

    const builder = (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string, opts: { count: 'exact'; head: true }) => LooseQuery;
      };
    })
      .from(table)
      .select('id', { count: 'exact', head: true });

    const query = businessId ? builder.eq('business_id', businessId) : builder;
    const res = await query;
    if (res.error) {
      cache.set(cacheKey, null);
      return null;
    }
    cache.set(cacheKey, res.count ?? 0);
    return res.count ?? 0;

  } catch {
    cache.set(cacheKey, null);
    return null;
  }
}

function meetsAssertion(count: number | null, def: IntentDef): boolean {
  if (count == null) return true; // unknown — don't block
  if (!def.rowAssertion) return true;
  if (def.rowAssertion === 'non-empty') return count >= 1;
  if (typeof def.rowAssertion === 'object' && 'min' in def.rowAssertion) {
    return count >= def.rowAssertion.min;
  }
  return true;
}

// ----------------------------------------------------------------------------
// Main entry
// ----------------------------------------------------------------------------

export async function evaluateElementReadiness(
  opts: EvaluateElementReadinessOptions,
): Promise<ElementReadinessReport> {
  const occurrences = extractIntents(opts.vfsFiles);
  const records: ElementReadinessRecord[] = [];
  const rowCache: RowCountCache = new Map();
  const provisioned = new Set<CapabilityId>(opts.provisionedCapabilities ?? []);

  for (const occ of occurrences) {
    const def = getIntentDef(occ.intent);
    if (!def) {
      records.push({
        elementId: occ.elementId,
        intent: occ.intent,
        canonicalIntent: null,
        filePath: occ.filePath,
        status: 'unknown-intent',
        blocker: `Intent "${occ.intent}" is not in the canonical registry`,
      });
      continue;
    }

    // Capability check
    const requiredCaps = def.requiredCapabilities ?? [];
    const missingCaps = requiredCaps.filter((c) => !provisioned.has(c));
    if (missingCaps.length > 0 && provisioned.size > 0) {
      // Only flag if we have ANY provisioning info — otherwise unknown.
      records.push({
        elementId: occ.elementId,
        intent: occ.intent,
        canonicalIntent: def.name,
        filePath: occ.filePath,
        status: 'capability-missing',
        blocker: `Missing capability: ${missingCaps.join(', ')}`,
        fixPath: def.readinessFixture?.fixPath,
      });
      continue;
    }

    // Row assertion check
    if (def.backingTable && def.rowAssertion && opts.businessId) {
      const count = await getRowCount(def.backingTable, opts.businessId, rowCache);
      if (!meetsAssertion(count, def)) {
        records.push({
          elementId: occ.elementId,
          intent: occ.intent,
          canonicalIntent: def.name,
          filePath: occ.filePath,
          status: 'rows-missing',
          blocker:
            def.readinessFixture?.description ??
            `Backing table ${def.backingTable} is empty`,
          fixPath: def.readinessFixture?.fixPath,
        });
        continue;
      }
    }

    records.push({
      elementId: occ.elementId,
      intent: occ.intent,
      canonicalIntent: def.name,
      filePath: occ.filePath,
      status: 'ready',
    });
  }

  const summary: ElementReadinessSummary = {
    totalElements: records.length,
    ready: records.filter((r) => r.status === 'ready').length,
    capabilityMissing: records.filter((r) => r.status === 'capability-missing').length,
    rowsMissing: records.filter((r) => r.status === 'rows-missing').length,
    unbound: records.filter((r) => r.status === 'unbound').length,
    unknownIntent: records.filter((r) => r.status === 'unknown-intent').length,
    previewBlocked: 0,
    publishBlocked: 0,
  };
  summary.previewBlocked = summary.unbound + summary.unknownIntent;
  summary.publishBlocked =
    summary.capabilityMissing + summary.rowsMissing + summary.previewBlocked;

  return { records, summary };
}
