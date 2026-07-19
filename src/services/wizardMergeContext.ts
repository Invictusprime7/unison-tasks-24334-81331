/**
 * WizardMergeContext — the single typed carrier threaded through
 * Lane A → Lane B → Stage 4b for every generated page and every recompile.
 *
 * This exists so orchestration code stops re-deriving `themePresetId`,
 * `templateId`, `industry`, `experienceContract`, and `templateLayoutContract`
 * from scattered lookups. Build it ONCE at the wizard boundary, pass it
 * everywhere.
 */
import type { TemplateLayoutContract } from '@/services/templateLayoutContract';
import type { WizardExperienceContract } from '@/services/wizardExperienceContract';

export interface WizardMergeContext {
  version: '1.0';
  themePresetId: string;
  templateId: string;
  industry: string;
  layoutSignature: string;
  templateLayoutContract: TemplateLayoutContract;
  experienceContract: WizardExperienceContract;
  /** Pages selected by the wizard. Lane B must satisfy this exact set — no scaffold backfill. */
  selectedPageIds: string[];
}

export function buildWizardMergeContext(input: {
  themePresetId: string;
  templateId: string;
  industry: string;
  templateLayoutContract: TemplateLayoutContract;
  experienceContract: WizardExperienceContract;
  selectedPageIds: string[];
}): WizardMergeContext {
  return {
    version: '1.0',
    themePresetId: input.themePresetId,
    templateId: input.templateId,
    industry: input.industry,
    layoutSignature: input.templateLayoutContract.signature,
    templateLayoutContract: input.templateLayoutContract,
    experienceContract: input.experienceContract,
    selectedPageIds: [...input.selectedPageIds],
  };
}

/** Serializable summary for persistence into `/.unison/*` runtime manifests. */
export function summarizeWizardMergeContext(ctx: WizardMergeContext) {
  return {
    version: ctx.version,
    themePresetId: ctx.themePresetId,
    templateId: ctx.templateId,
    industry: ctx.industry,
    layoutSignature: ctx.layoutSignature,
    selectedPageIds: ctx.selectedPageIds,
  };
}
