/**
 * Vertical Launch Contract
 * ─────────────────────────
 * Single typed source-of-truth for what each business vertical (booking, saas,
 * agency, portfolio, store, content) guarantees at launch time. Replaces the
 * ad-hoc `forceSalonPreviewReady` boolean that was scattered across
 * SystemLauncher.tsx.
 *
 * Why this exists:
 * - SystemLauncher previously branched off a single bool for every per-vertical
 *   decision (booking on/off, lead capture on/off, capability-full scaffold,
 *   native-publish guarantee, etc). That conflated "is preselected?" with
 *   "what does this vertical promise?".
 * - The Readiness Center, deployment service, and downstream readiness manifest
 *   need a stable, typed contract they can inspect — not a magic boolean.
 *
 * This module is **pure** and has no side effects. It does NOT mutate readiness
 * — that remains owned by `nativePublishReadiness` + `deploymentService`.
 */

import type { BusinessSystemType } from '@/lib/infrastructureContext';

export interface VerticalLaunchContract {
  /** The vertical this contract applies to, or null for "no system selected". */
  systemType: BusinessSystemType | null;

  /**
   * Deterministic preview path: when true, the launcher must produce a
   * preview-ready site (Lane B AI required, capability-full scaffold). When
   * false, the launcher falls back to selected-pages mode without guarantees.
   */
  previewReady: boolean;

  /**
   * The vertical may publish through the first-party native publish pipeline
   * (provided owner email and other readiness checks pass). This does NOT mean
   * the site IS publish-ready — only that the contract permits it.
   */
  nativePublishCapable: boolean;

  /**
   * Force capability-full scaffold (all canonical pages) instead of honoring
   * only the user's wizard page selections.
   */
  capabilityFullScaffold: boolean;

  /**
   * Forced wizard needs flags. The wizard's own `goalNeeds` + customer needs
   * are still OR-ed on top; these only force-enable when the vertical demands
   * the capability regardless of user input (e.g. booking vertical always
   * needs booking).
   */
  forcedNeeds: {
    booking: boolean;
    leadCapture: boolean;
    products: boolean;
  };

  /** Tag stamped into the wizard seed `generation.previewGuarantee`. */
  previewGuaranteeTag: 'lane-b-ai-required' | undefined;

  /** Tag stamped into the wizard seed `generation.publishGuarantee`. */
  publishGuaranteeTag: 'native-first-party-publish-ready' | undefined;
}

const NULL_CONTRACT: VerticalLaunchContract = {
  systemType: null,
  previewReady: false,
  nativePublishCapable: false,
  capabilityFullScaffold: false,
  forcedNeeds: { booking: false, leadCapture: false, products: false },
  previewGuaranteeTag: undefined,
  publishGuaranteeTag: undefined,
};

/**
 * Per-vertical contract table. Today every preselected vertical promises the
 * same hardened preview-ready + native-publish-capable surface. Differentiation
 * (e.g. booking forces booking capability) lives in `forcedNeeds`.
 */
const VERTICAL_CONTRACTS: Record<BusinessSystemType, VerticalLaunchContract> = {
  booking: {
    systemType: 'booking',
    previewReady: true,
    nativePublishCapable: true,
    capabilityFullScaffold: true,
    forcedNeeds: { booking: true, leadCapture: true, products: false },
    previewGuaranteeTag: 'lane-b-ai-required',
    publishGuaranteeTag: 'native-first-party-publish-ready',
  },
  saas: {
    systemType: 'saas',
    previewReady: true,
    nativePublishCapable: true,
    capabilityFullScaffold: true,
    forcedNeeds: { booking: false, leadCapture: true, products: false },
    previewGuaranteeTag: 'lane-b-ai-required',
    publishGuaranteeTag: 'native-first-party-publish-ready',
  },
  agency: {
    systemType: 'agency',
    previewReady: true,
    nativePublishCapable: true,
    capabilityFullScaffold: true,
    forcedNeeds: { booking: false, leadCapture: true, products: false },
    previewGuaranteeTag: 'lane-b-ai-required',
    publishGuaranteeTag: 'native-first-party-publish-ready',
  },
  portfolio: {
    systemType: 'portfolio',
    previewReady: true,
    nativePublishCapable: true,
    capabilityFullScaffold: true,
    forcedNeeds: { booking: false, leadCapture: true, products: false },
    previewGuaranteeTag: 'lane-b-ai-required',
    publishGuaranteeTag: 'native-first-party-publish-ready',
  },
  store: {
    systemType: 'store',
    previewReady: true,
    nativePublishCapable: true,
    capabilityFullScaffold: true,
    forcedNeeds: { booking: false, leadCapture: true, products: true },
    previewGuaranteeTag: 'lane-b-ai-required',
    publishGuaranteeTag: 'native-first-party-publish-ready',
  },
  content: {
    systemType: 'content',
    previewReady: true,
    nativePublishCapable: true,
    capabilityFullScaffold: true,
    forcedNeeds: { booking: false, leadCapture: true, products: false },
    previewGuaranteeTag: 'lane-b-ai-required',
    publishGuaranteeTag: 'native-first-party-publish-ready',
  },
};

/**
 * Resolve the launch contract for a vertical. Returns a safe NULL_CONTRACT if
 * no system has been selected yet (e.g. early renders).
 */
export function resolveVerticalLaunchContract(
  systemId: BusinessSystemType | null | undefined,
): VerticalLaunchContract {
  if (!systemId) return NULL_CONTRACT;
  return VERTICAL_CONTRACTS[systemId] ?? NULL_CONTRACT;
}

/**
 * Back-compat shim. Many downstream readers (readiness manifest, launch state,
 * builder drafts) still log a `forcedSalonPreviewReady` field. Until those are
 * migrated to read `contract.previewReady`, derive the legacy boolean here.
 */
export function legacyForcedPreviewReadyFlag(
  contract: VerticalLaunchContract,
): boolean {
  return contract.previewReady;
}
