/**
 * WizardMergeContext — the single typed carrier threaded through the canonical
 * three-stage generation contract:
 *
 *   Lane A (fast composer)  → free-styled JSX per selected page
 *   Lane B (stateful enricher) → intents, catalog wiring, contract CTAs
 *   Stage 4b (theme + identity stamp) → /src/index.css + template identity
 *
 * Every stage and every post-edit recompile receives the SAME object so no
 * stage has to re-look-up the template contract, the theme seed or the
 * industry. Scattered lookups were the drift source; this is the fix.
 */

import type { TemplateLayoutContract } from './templateLayoutContract';
import type { ThemeTokens } from '@/sections/types';

export interface WizardMergeContext {
  version: '1.0';
  /** Wizard-selected industry (overlay wins over base industry). */
  industry: string;
  /** Wizard-selected template composition id. */
  templateId: string | null;
  /** Wizard-selected style card id — the Stage 4b theme seed. */
  themePresetId: string;
  /** Resolved semantic HSL payload for the selected style card. */
  themeTokens?: ThemeTokens;
  /** Locked geometry/section contract for the selected template. */
  templateLayoutContract: TemplateLayoutContract | null;
  /** Optional experience contract id threaded from the wizard selections. */
  experienceContractId?: string | null;
  /** Stable seed id stamped into snapshot.meta.wizardSeedId. */
  wizardSeedId?: string | null;
}

export function createWizardMergeContext(input: {
  industry?: string | null;
  templateId?: string | null;
  themePresetId: string;
  themeTokens?: ThemeTokens;
  templateLayoutContract?: TemplateLayoutContract | null;
  experienceContractId?: string | null;
  wizardSeedId?: string | null;
}): WizardMergeContext {
  if (!input.themePresetId) {
    throw new Error('[wizardMergeContext] themePresetId is required — Stage 4b cannot run without the style seed.');
  }
  return {
    version: '1.0',
    industry: input.industry || 'general',
    templateId: input.templateId ?? null,
    themePresetId: input.themePresetId,
    themeTokens: input.themeTokens,
    templateLayoutContract: input.templateLayoutContract ?? null,
    experienceContractId: input.experienceContractId ?? null,
    wizardSeedId: input.wizardSeedId ?? null,
  };
}
