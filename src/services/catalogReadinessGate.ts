/**
 * catalogReadinessGate — Track B publish gate.
 *
 * Every generated section that resolves live business data must actually be
 * able to resolve it before publish:
 *   - catalog artifacts need a persisted `site_data_bindings` row AND enough
 *     rows in the source table,
 *   - business-profile artifacts need their profile fields filled in.
 *
 * Row minimums, required tables and profile fields are NOT restated here —
 * they come from the artifact registry through `artifactHydrationPlan`, the
 * same walk `autoEmitSectionBindings` uses to emit bindings. Sections whose
 * fallback is `hide_section` degrade silently and never block publish.
 *
 * Mirrors the `ProfileGateVerdict` shape from businessProfileReadinessGate so
 * both gates compose into one publish-readiness dashboard.
 */
import { supabase } from '@/integrations/supabase/client';
import { listBindingsForProject } from '@/services/sectionDataBindingService';
import {
  evaluateArtifactHydration,
  planArtifactHydration,
  type ArtifactHydrationEntry,
} from '@/services/artifactHydrationPlan';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import type { BusinessProfileDTO } from '@/types/businessProfile';
import {
  requirementForSection,
  type CatalogKind,
  type SectionDataBindingDTO,
} from '@/types/catalog';

export interface CatalogGateReason {
  code: string;
  message: string;
  pagePath: string;
  sectionId: string;
  sourceKind: CatalogKind | 'business-profile';
  have: number;
  need: number;
}

export interface CatalogGateVerdict {
  ok: boolean;
  gate: 'CatalogReadinessGate';
  evaluatedAt: string;
  publishBlocked: boolean;
  reasons: CatalogGateReason[];
  recommended: CatalogGateReason[];
  bindings: Array<{ binding: SectionDataBindingDTO; rowCount: number }>;
  /** Sections resolving live data right now (catalog + business profile). */
  liveCount: number;
  /** Sections that want live data but cannot resolve it yet. */
  blockedCount: number;
}

export interface CatalogGateContext {
  /** When provided, unbound catalog sections and profile gaps are detected too. */
  snapshot?: SiteBundleSnapshot | null;
  /** Live business object, used for business-profile artifacts. */
  profile?: BusinessProfileDTO | null;
}

async function countRowsForBinding(b: SectionDataBindingDTO): Promise<number> {
  let q = supabase
    .from(b.sourceTable as never)
    .select('id', { count: 'exact', head: true })
    .eq('business_id', b.businessId);
  for (const [k, v] of Object.entries(b.filters ?? {})) {
    q = q.eq(k, v as never);
  }
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

function entryFor(
  entries: ArtifactHydrationEntry[],
  sectionId: string,
): ArtifactHydrationEntry | undefined {
  return entries.find((e) => e.sectionId === sectionId);
}

export async function evaluateCatalogReadinessGate(
  projectId: string | null | undefined,
  sectionTypeMap: Record<string, string> = {},
  context: CatalogGateContext = {},
): Promise<CatalogGateVerdict> {
  const evaluatedAt = new Date().toISOString();
  if (!projectId) {
    return {
      ok: true,
      gate: 'CatalogReadinessGate',
      evaluatedAt,
      publishBlocked: false,
      reasons: [],
      recommended: [],
      bindings: [],
      liveCount: 0,
      blockedCount: 0,
    };
  }

  const entries = planArtifactHydration(context.snapshot);
  const bindings = await listBindingsForProject(projectId);
  const results = await Promise.all(
    bindings.map(async (b) => ({ binding: b, rowCount: await countRowsForBinding(b) })),
  );

  const reasons: CatalogGateReason[] = [];
  const recommended: CatalogGateReason[] = [];
  const rowCounts: Record<string, number> = {};

  for (const { binding, rowCount } of results) {
    const entry = entryFor(entries, binding.sectionId);
    const sourceTable = binding.sourceTable;
    rowCounts[sourceTable] = Math.max(rowCounts[sourceTable] ?? 0, rowCount);

    // minRows: registry first (artifact), legacy requirement map as fallback.
    const sectionType = sectionTypeMap[binding.sectionId];
    const need =
      entry?.minRows ??
      (sectionType ? requirementForSection(sectionType)?.minRows ?? 1 : 1);
    if (rowCount >= need) continue;

    const reason: CatalogGateReason = {
      code: `catalog.underfilled.${binding.sourceKind}`,
      message: `${binding.pagePath} · ${binding.sectionId} needs ${need} ${binding.sourceKind} row${need === 1 ? '' : 's'} (has ${rowCount}).`,
      pagePath: binding.pagePath,
      sectionId: binding.sectionId,
      sourceKind: binding.sourceKind,
      have: rowCount,
      need,
    };
    if (binding.fallbackMode === 'hide_section') recommended.push(reason);
    else reasons.push(reason);
  }

  // Artifact-level readiness — catches sections the binding list cannot see:
  // catalog sections with no persisted binding, and profile-backed sections
  // whose business fields are still empty.
  const report = evaluateArtifactHydration({
    entries,
    profile: context.profile ?? null,
    boundSectionIds: bindings.map((b) => b.sectionId),
    rowCounts: rowCounts as never,
  });

  for (const verdict of report.verdicts) {
    if (verdict.live || verdict.blockers.length === 0) continue;
    const entry = entryFor(entries, verdict.sectionId);
    const fallback = entry?.binding?.fallbackMode;

    if (verdict.blockers.includes('data_binding_missing')) {
      const reason: CatalogGateReason = {
        code: 'catalog.binding_missing',
        message: `${verdict.pagePath} · ${verdict.sectionId} has no data binding yet — re-emit section bindings.`,
        pagePath: verdict.pagePath,
        sectionId: verdict.sectionId,
        sourceKind: (entry?.binding?.sourceKind ?? 'service') as CatalogKind,
        have: 0,
        need: entry?.minRows ?? 1,
      };
      if (fallback === 'hide_section') recommended.push(reason);
      else reasons.push(reason);
    }

    if (verdict.blockers.includes('profile_fields_missing')) {
      recommended.push({
        code: 'profile.fields_missing',
        message: `${verdict.pagePath} · ${verdict.sectionId} is business-profile backed but ${verdict.missingProfileFields.join(', ') || 'the profile'} is empty.`,
        pagePath: verdict.pagePath,
        sectionId: verdict.sectionId,
        sourceKind: 'business-profile',
        have: 0,
        need: verdict.missingProfileFields.length || 1,
      });
    }
  }

  return {
    ok: reasons.length === 0,
    gate: 'CatalogReadinessGate',
    evaluatedAt,
    publishBlocked: reasons.length > 0,
    reasons,
    recommended,
    bindings: results,
    liveCount: report.liveCount,
    blockedCount: report.blockedCount,
  };
}

