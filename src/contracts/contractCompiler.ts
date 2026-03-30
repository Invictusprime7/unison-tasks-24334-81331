/**
 * Contract Compiler — The governing control plane
 * 
 * Sits between SystemsAI and Preview/Builder.
 * 
 * Flow:
 *   BusinessBlueprint → ContractCompiler → Validated CompiledContract
 * 
 * The compiler:
 * 1. Validates the blueprint against capability registry
 * 2. Canonicalizes all intents (rejects non-canonical)
 * 3. Builds route policy from blueprint + capabilities
 * 4. Resolves slot bindings from capabilities + section roles
 * 5. Validates provisioning status
 * 6. Outputs a CompiledContract — the ONLY valid preview input
 * 
 * RULE: Preview launches ONLY if the contract passes.
 */

import {
  isCoreIntent,
  isNavIntent,
  type CoreIntent,
} from '@/coreIntents';
import { normalizeIntent } from '@/runtime/intentAliases';
import type { BusinessBlueprint, BlueprintPage } from './blueprintSchema';
import {
  CAPABILITY_REGISTRY,
  getAllowedIntents,
  getRequiredTables,
  getRequiredWorkflows,
  type CapabilityId,
  type WorkflowSpec,
} from './capabilityRegistry';
import { getIndustryProfile } from './industryMatrix';
import { getCompositionsByIndustry } from '@/sections/templates';
import { buildRoutePolicy, type RoutePolicy } from './routePolicy';
import { resolveSlotBindings, type SlotBindingPolicy } from './slotBindingPolicy';
import { validateProvisioning, type ProvisioningReport } from './provisioningValidator';

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  path?: string;
  autoFix?: () => void;
}

export interface ContractValidation {
  valid: boolean;
  issues: ValidationIssue[];
  errors: number;
  warnings: number;
  infos: number;
}

// ============================================================================
// Compiled Contract — The ONLY valid preview input
// ============================================================================

export interface CompiledContract {
  /** Did the contract pass validation? */
  validation: ContractValidation;
  /** Canonical intent list (after normalization) */
  canonicalIntents: CoreIntent[];
  /** Required tables from capabilities */
  requiredTables: string[];
  /** Required workflows from capabilities */
  requiredWorkflows: WorkflowSpec[];
  /** Intent bindings derived from blueprint + section roles */
  intentBindings: CompiledBinding[];
  /** Pages validated and enriched */
  pages: CompiledPage[];
  /** CRM pipeline config */
  crm: { name: string; stages: string[]; defaultStage: string };
  /** Automation pack */
  automationPack: string;
  /** Route policy — canonical routing contract */
  routePolicy: RoutePolicy;
  /** Slot binding policy — deterministic CTA resolution */
  slotBindingPolicy: SlotBindingPolicy;
  /** Provisioning report — are intents actually operational? */
  provisioningReport: ProvisioningReport;
}

export interface CompiledBinding {
  elementRole: string;
  sectionType: string;
  intent: CoreIntent;
  params: Record<string, unknown>;
  source: 'blueprint' | 'capability-default' | 'section-role' | 'slot-policy';
}

export interface CompiledPage {
  title: string;
  path: string;
  purpose: string;
  isHome: boolean;
  sections: string[];
  hasComposition: boolean;
}

// ============================================================================
// Compiler
// ============================================================================

export interface CompileOptions {
  /** Is the backend installed for this business? */
  backendInstalled?: boolean;
}

export function compileContract(
  blueprint: BusinessBlueprint,
  options: CompileOptions = {},
): CompiledContract {
  const issues: ValidationIssue[] = [];
  const { backendInstalled = false } = options;

  // ── 1. Validate identity ──────────────────────────────────────────────
  if (!blueprint.identity.businessName?.trim()) {
    issues.push({
      code: 'MISSING_BUSINESS_NAME',
      severity: 'error',
      message: 'Business name is required',
      path: 'identity.businessName',
    });
  }

  const industryProfile = getIndustryProfile(blueprint.identity.industry);
  if (!industryProfile) {
    issues.push({
      code: 'UNKNOWN_INDUSTRY',
      severity: 'error',
      message: `Unknown industry "${blueprint.identity.industry}"`,
      path: 'identity.industry',
    });
  }

  // ── 2. Validate capabilities ──────────────────────────────────────────
  for (const capId of blueprint.capabilities.enabled) {
    if (!CAPABILITY_REGISTRY[capId]) {
      issues.push({
        code: 'UNKNOWN_CAPABILITY',
        severity: 'error',
        message: `Unknown capability "${capId}"`,
        path: 'capabilities.enabled',
      });
    }

    const cap = CAPABILITY_REGISTRY[capId];
    if (cap && !cap.supportedIndustries.includes(blueprint.identity.industry)) {
      issues.push({
        code: 'UNSUPPORTED_CAPABILITY',
        severity: 'warning',
        message: `Capability "${capId}" is not typically used in "${blueprint.identity.industry}" industry`,
        path: 'capabilities.enabled',
      });
    }
  }

  // ── 3. Canonicalize and validate intents ──────────────────────────────
  const allowedIntents = getAllowedIntents(blueprint.capabilities.enabled as CapabilityId[]);
  const canonicalIntents: CoreIntent[] = [];

  for (const intent of blueprint.intents.allowed) {
    const normalized = normalizeIntent(intent);
    if (!isCoreIntent(normalized as string)) {
      issues.push({
        code: 'NON_CANONICAL_INTENT',
        severity: 'error',
        message: `Intent "${intent}" is not a canonical CoreIntent (normalized to "${normalized}")`,
        path: 'intents.allowed',
      });
    } else {
      canonicalIntents.push(normalized as CoreIntent);
    }
  }

  if (!allowedIntents.includes(blueprint.intents.primaryCta)) {
    issues.push({
      code: 'PRIMARY_CTA_NOT_ALLOWED',
      severity: 'error',
      message: `Primary CTA intent "${blueprint.intents.primaryCta}" is not allowed by enabled capabilities`,
      path: 'intents.primaryCta',
    });
  }

  // ── 4. Validate pages ────────────────────────────────────────────────
  const pagePaths = new Set<string>();
  const compiledPages: CompiledPage[] = [];
  let hasHomePage = false;

  for (const page of blueprint.pages) {
    if (pagePaths.has(page.path)) {
      issues.push({
        code: 'DUPLICATE_PAGE_PATH',
        severity: 'error',
        message: `Duplicate page path: "${page.path}"`,
        path: 'pages',
      });
    }
    pagePaths.add(page.path);

    if (page.isHome || page.path === '/') hasHomePage = true;

    const compositions = industryProfile
      ? getCompositionsByIndustry(industryProfile.industry)
      : [];

    compiledPages.push({
      title: page.title,
      path: page.path,
      purpose: page.purpose,
      isHome: page.isHome || page.path === '/',
      sections: page.expectedSections || [],
      hasComposition: compositions.length > 0,
    });
  }

  if (!hasHomePage) {
    issues.push({
      code: 'MISSING_HOME_PAGE',
      severity: 'error',
      message: 'Blueprint must include a home page (path: "/")',
      path: 'pages',
    });
  }

  // ── 5. Build route policy ─────────────────────────────────────────────
  const routePolicy = buildRoutePolicy(
    blueprint.pages,
    blueprint.capabilities.enabled as CapabilityId[],
  );

  // Validate route links — all page paths must be in route policy
  for (const page of blueprint.pages) {
    if (!routePolicy.routes.some(r => r.path === page.path)) {
      issues.push({
        code: 'ORPHAN_PAGE_ROUTE',
        severity: 'warning',
        message: `Page "${page.title}" at "${page.path}" has no route policy entry`,
        path: 'pages',
      });
    }
  }

  // ── 6. Resolve slot bindings ──────────────────────────────────────────
  const slotBindingPolicy = resolveSlotBindings(
    blueprint.capabilities.enabled as CapabilityId[],
    blueprint.intents.primaryCta,
  );

  // Add warnings for unresolved slots
  for (const u of slotBindingPolicy.unresolved) {
    issues.push({
      code: 'UNRESOLVED_SLOT_BINDING',
      severity: 'info',
      message: u.reason,
      path: `slots.${u.section}.${u.slot}`,
    });
  }

  // ── 7. Generate intent bindings (from slot policy + legacy bindings) ──
  const intentBindings: CompiledBinding[] = [];

  // Slot-policy-driven bindings (primary source)
  for (const binding of slotBindingPolicy.resolved) {
    intentBindings.push({
      elementRole: `${binding.section}-${binding.slot}`,
      sectionType: binding.section,
      intent: binding.intent,
      params: {},
      source: 'slot-policy',
    });
  }

  // Blueprint-level overrides
  intentBindings.push({
    elementRole: 'hero-primary-cta',
    sectionType: 'hero',
    intent: blueprint.intents.primaryCta,
    params: {},
    source: 'blueprint',
  });

  if (blueprint.intents.secondaryCta) {
    intentBindings.push({
      elementRole: 'hero-secondary-cta',
      sectionType: 'hero',
      intent: blueprint.intents.secondaryCta,
      params: {},
      source: 'blueprint',
    });
  }

  // ── 8. Validate provisioning ──────────────────────────────────────────
  const provisioningReport = validateProvisioning(
    blueprint.capabilities.enabled as CapabilityId[],
    routePolicy,
    backendInstalled,
  );

  // Add provisioning warnings
  for (const cap of provisioningReport.capabilities) {
    for (const check of cap.checks) {
      if (check.status === 'missing') {
        issues.push({
          code: 'MISSING_PROVISIONING',
          severity: 'error',
          message: `${cap.capabilityName}: ${check.label} is missing`,
          path: `provisioning.${cap.capabilityId}`,
        });
      } else if (check.status === 'stub') {
        issues.push({
          code: 'STUBBED_PROVISIONING',
          severity: 'info',
          message: `${cap.capabilityName}: ${check.label} is stubbed — ${check.detail || 'will work in preview'}`,
          path: `provisioning.${cap.capabilityId}`,
        });
      }
    }
  }

  // ── 9. Gather provisioning requirements ───────────────────────────────
  const requiredTables = getRequiredTables(blueprint.capabilities.enabled as CapabilityId[]);
  const requiredWorkflows = getRequiredWorkflows(blueprint.capabilities.enabled as CapabilityId[]);

  // ── 10. Compile result ───────────────────────────────────────────────
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.filter(i => i.severity === 'info').length;

  return {
    validation: { valid: errors === 0, issues, errors, warnings, infos },
    canonicalIntents: canonicalIntents.length > 0 ? canonicalIntents : allowedIntents,
    requiredTables,
    requiredWorkflows,
    intentBindings,
    pages: compiledPages,
    crm: {
      name: blueprint.crm.pipelineName,
      stages: blueprint.crm.stages,
      defaultStage: blueprint.crm.defaultStage,
    },
    automationPack: blueprint.automationPack,
    routePolicy,
    slotBindingPolicy,
    provisioningReport,
  };
}

// ============================================================================
// Quick Validation (for linting / CI)
// ============================================================================

export function findNonCanonicalIntents(intents: string[]): string[] {
  return intents.filter(intent => !isCoreIntent(intent));
}

export function validateIntentsAgainstCapabilities(
  intents: string[],
  capabilities: CapabilityId[]
): ValidationIssue[] {
  const allowed = new Set(getAllowedIntents(capabilities).map(String));
  const issues: ValidationIssue[] = [];

  for (const intent of intents) {
    const normalized = normalizeIntent(intent);
    if (!allowed.has(normalized as string) && !isNavIntent(normalized as string)) {
      issues.push({
        code: 'INTENT_NOT_IN_CAPABILITY_SET',
        severity: 'warning',
        message: `Intent "${intent}" (→ "${normalized}") is not covered by capabilities [${capabilities.join(', ')}]`,
      });
    }
  }

  return issues;
}

// ============================================================================
// Contract Gate — Rejects non-compiled preview input
// ============================================================================

/**
 * Validate that a CompiledContract is safe to pass to preview.
 * Returns true only if:
 * - No validation errors
 * - Provisioning is at least preview-ready
 * - Route policy has a home page
 * - All primary CTA slots are bound
 */
export function isPreviewReady(contract: CompiledContract): boolean {
  if (!contract.validation.valid) return false;
  if (!contract.provisioningReport.previewReady) return false;
  if (!contract.routePolicy.routes.some(r => r.path === '/')) return false;
  if (!contract.intentBindings.some(b => b.elementRole.includes('primary-cta'))) return false;
  return true;
}

/**
 * Validate that a CompiledContract is safe to publish.
 * Stricter than preview — requires full provisioning.
 */
export function isPublishReady(contract: CompiledContract): boolean {
  if (!isPreviewReady(contract)) return false;
  if (!contract.provisioningReport.productionReady) return false;
  if (contract.slotBindingPolicy.unresolved.length > 0) return false;
  return true;
}
