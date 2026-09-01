/**
 * catalogReadinessGate — Track B publish gate.
 *
 * Every generated section that binds to a CatalogKind must resolve at least
 * `SECTION_DATA_REQUIREMENTS[type].minRows` live rows before publish. Sections
 * whose fallback is `hide_section` degrade silently and never block publish;
 * every other fallback blocks with an actionable reason the OS shell surfaces.
 *
 * Mirrors the `ProfileGateVerdict` shape from businessProfileReadinessGate so
 * both gates compose into one publish-readiness dashboard.
 */
import { supabase } from '@/integrations/supabase/client';
import { listBindingsForProject } from '@/services/sectionDataBindingService';
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
  sourceKind: CatalogKind;
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

export async function evaluateCatalogReadinessGate(
  projectId: string | null | undefined,
  sectionTypeMap: Record<string, string> = {},
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
    };
  }

  const bindings = await listBindingsForProject(projectId);
  const results = await Promise.all(
    bindings.map(async (b) => ({ binding: b, rowCount: await countRowsForBinding(b) })),
  );

  const reasons: CatalogGateReason[] = [];
  const recommended: CatalogGateReason[] = [];

  for (const { binding, rowCount } of results) {
    const sectionType = sectionTypeMap[binding.sectionId];
    const req = sectionType ? requirementForSection(sectionType) : null;
    const need = req?.minRows ?? 1;
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

  return {
    ok: reasons.length === 0,
    gate: 'CatalogReadinessGate',
    evaluatedAt,
    publishBlocked: reasons.length > 0,
    reasons,
    recommended,
    bindings: results,
  };
}
