/**
 * Site Integrity Report — Unified validation aggregator
 * 
 * Produces a single machine-readable report by running all validators:
 *   1. SiteBundle structural integrity
 *   2. Route/page integrity
 *   3. Intent validity
 *   4. Workflow validity
 *   5. Provisioning readiness
 * 
 * Usage:
 *   const report = runIntegrityReport(bundle, contract, options);
 *   if (!report.passed) console.error(report.summary);
 */

import type { SiteBundle } from '@/types/siteBundle';
import type { CompiledContract, ValidationIssue, ValidationSeverity } from './contractCompiler';
import type { ProvisioningStatus } from './provisioningValidator';
import { SiteBundleSchema } from '@/schemas/SiteBundle';
import { CORE_INTENTS, isCoreIntent } from '@/coreIntents';
import { normalizeIntent } from '@/runtime/intentAliases';

// ============================================================================
// Report Types
// ============================================================================

export interface IntegrityCheckResult {
  /** Check identifier */
  checkId: string;
  /** Human-readable label */
  label: string;
  /** Category of check */
  category: IntegrityCategory;
  /** Did it pass? */
  passed: boolean;
  /** Severity if failed */
  severity: ValidationSeverity;
  /** Details */
  message: string;
  /** Optional structured detail */
  detail?: Record<string, unknown>;
}

export type IntegrityCategory =
  | 'bundle-structure'
  | 'route-integrity'
  | 'intent-validity'
  | 'workflow-validity'
  | 'provisioning'
  | 'consistency';

export interface IntegrityReport {
  /** Overall pass/fail */
  passed: boolean;
  /** Timestamp */
  timestamp: string;
  /** All individual checks */
  checks: IntegrityCheckResult[];
  /** Summary counts */
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  /** Per-category status */
  categories: Record<IntegrityCategory, { passed: boolean; checks: number; failures: number }>;
  /** Is this site preview-ready? */
  previewReady: boolean;
  /** Is this site publish-ready? */
  publishReady: boolean;
}

export interface IntegrityReportOptions {
  /** Include info-level checks in report */
  includeInfos?: boolean;
  /** Skip expensive checks */
  fast?: boolean;
}

// ============================================================================
// Report Builder
// ============================================================================

/**
 * Run a full integrity report against a SiteBundle + CompiledContract.
 */
export function runIntegrityReport(
  bundle: SiteBundle | null,
  contract: CompiledContract | null,
  options: IntegrityReportOptions = {},
): IntegrityReport {
  const checks: IntegrityCheckResult[] = [];

  // ── 1. Bundle structural integrity ──────────────────────────────────
  if (bundle) {
    checks.push(...validateBundleStructure(bundle));
  } else {
    checks.push(fail('bundle-structure', 'bundle-exists', 'SiteBundle present', 'error', 'No SiteBundle provided'));
  }

  // ── 2. Contract-based checks ────────────────────────────────────────
  if (contract) {
    checks.push(...validateContractIntegrity(contract));
    checks.push(...validateRouteIntegrity(contract));
    checks.push(...validateIntentValidity(contract));
    checks.push(...validateWorkflowValidity(contract));
    checks.push(...validateProvisioningStatus(contract));
  }

  // ── 3. Cross-consistency (bundle ↔ contract) ────────────────────────
  if (bundle && contract) {
    checks.push(...validateCrossConsistency(bundle, contract));
  }

  // Filter infos if not requested
  const filtered = options.includeInfos
    ? checks
    : checks.filter(c => c.severity !== 'info' || !c.passed);

  const errors = filtered.filter(c => !c.passed && c.severity === 'error').length;
  const warnings = filtered.filter(c => !c.passed && c.severity === 'warning').length;
  const infos = filtered.filter(c => !c.passed && c.severity === 'info').length;

  // Build category summary
  const categories = buildCategorySummary(filtered);

  return {
    passed: errors === 0,
    timestamp: new Date().toISOString(),
    checks: filtered,
    summary: {
      total: filtered.length,
      passed: filtered.filter(c => c.passed).length,
      failed: filtered.filter(c => !c.passed).length,
      errors,
      warnings,
      infos,
    },
    categories,
    previewReady: errors === 0 && (contract?.provisioningReport.previewReady ?? false),
    publishReady: errors === 0 && warnings === 0 && (contract?.provisioningReport.productionReady ?? false),
  };
}

// ============================================================================
// Check Helpers
// ============================================================================

function pass(
  category: IntegrityCategory, checkId: string, label: string, message: string,
): IntegrityCheckResult {
  return { checkId, label, category, passed: true, severity: 'info', message };
}

function fail(
  category: IntegrityCategory, checkId: string, label: string,
  severity: ValidationSeverity, message: string, detail?: Record<string, unknown>,
): IntegrityCheckResult {
  return { checkId, label, category, passed: false, severity, message, detail };
}

// ============================================================================
// Validators
// ============================================================================

function validateBundleStructure(bundle: SiteBundle): IntegrityCheckResult[] {
  const results: IntegrityCheckResult[] = [];

  // Schema validation
  const parsed = SiteBundleSchema.safeParse(bundle);
  if (parsed.success) {
    results.push(pass('bundle-structure', 'schema-valid', 'Schema validation', 'SiteBundle matches Zod schema'));
  } else {
    const issues = parsed.error.issues.slice(0, 5);
    results.push(fail('bundle-structure', 'schema-valid', 'Schema validation', 'error',
      `Schema validation failed: ${issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      { issueCount: parsed.error.issues.length },
    ));
  }

  // Version check
  if (bundle.version === '1.0.0') {
    results.push(pass('bundle-structure', 'version-valid', 'Bundle version', 'Version is 1.0.0'));
  } else {
    results.push(fail('bundle-structure', 'version-valid', 'Bundle version', 'error',
      `Unexpected version: ${bundle.version}`));
  }

  // Site identity
  if (bundle.site?.siteId?.trim()) {
    results.push(pass('bundle-structure', 'site-id', 'Site identity', `Site ID: ${bundle.site.siteId}`));
  } else {
    results.push(fail('bundle-structure', 'site-id', 'Site identity', 'error', 'Site ID is empty'));
  }

  // Pages exist (pages are on bundle.pages, not manifest)
  const pageCount = bundle.pages ? Object.keys(bundle.pages).length : 0;
  if (pageCount > 0) {
    results.push(pass('bundle-structure', 'has-pages', 'Pages exist', `${pageCount} page(s) defined`));
  } else {
    results.push(fail('bundle-structure', 'has-pages', 'Pages exist', 'error', 'No pages defined'));
  }

  // Home page exists
  if (bundle.pages) {
    const hasHome = Object.values(bundle.pages).some(
      (p) => p.path === '/' || p.pageId === 'home'
    );
    if (hasHome) {
      results.push(pass('bundle-structure', 'has-home', 'Home page', 'Home page exists'));
    } else {
      results.push(fail('bundle-structure', 'has-home', 'Home page', 'warning', 'No home page identified'));
    }
  }

  return results;
}

function validateContractIntegrity(contract: CompiledContract): IntegrityCheckResult[] {
  const results: IntegrityCheckResult[] = [];

  // Contract validation status
  if (contract.validation.valid) {
    results.push(pass('consistency', 'contract-valid', 'Contract validation', 'CompiledContract passed all checks'));
  } else {
    results.push(fail('consistency', 'contract-valid', 'Contract validation', 'error',
      `Contract has ${contract.validation.errors} error(s), ${contract.validation.warnings} warning(s)`,
      { issues: contract.validation.issues.map(i => i.code) },
    ));
  }

  return results;
}

function validateRouteIntegrity(contract: CompiledContract): IntegrityCheckResult[] {
  const results: IntegrityCheckResult[] = [];
  const { routePolicy } = contract;

  // Has routes
  if (routePolicy.routes.length > 0) {
    results.push(pass('route-integrity', 'has-routes', 'Routes defined', `${routePolicy.routes.length} route(s)`));
  } else {
    results.push(fail('route-integrity', 'has-routes', 'Routes defined', 'error', 'No routes in route policy'));
  }

  // Has home route
  const hasRoot = routePolicy.routes.some(r => r.path === '/');
  if (hasRoot) {
    results.push(pass('route-integrity', 'has-root-route', 'Root route', 'Root "/" route exists'));
  } else {
    results.push(fail('route-integrity', 'has-root-route', 'Root route', 'error', 'No root "/" route'));
  }

  // No duplicate paths
  const paths = routePolicy.routes.map(r => r.path);
  const uniquePaths = new Set(paths);
  if (uniquePaths.size === paths.length) {
    results.push(pass('route-integrity', 'no-duplicate-routes', 'Unique routes', 'No duplicate route paths'));
  } else {
    const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
    results.push(fail('route-integrity', 'no-duplicate-routes', 'Unique routes', 'warning',
      `Duplicate routes: ${[...new Set(dupes)].join(', ')}`,
    ));
  }

  // All pages have routes
  for (const page of contract.pages) {
    const hasRoute = routePolicy.routes.some(r => r.path === page.path);
    if (hasRoute) {
      results.push(pass('route-integrity', `page-route-${page.path}`, `Route: ${page.path}`, 'Page has a matching route'));
    } else {
      results.push(fail('route-integrity', `page-route-${page.path}`, `Route: ${page.path}`, 'error',
        `Page "${page.title}" at ${page.path} has no matching route`,
      ));
    }
  }

  return results;
}

function validateIntentValidity(contract: CompiledContract): IntegrityCheckResult[] {
  const results: IntegrityCheckResult[] = [];

  // All canonical intents are valid CoreIntents
  for (const intent of contract.canonicalIntents) {
    if (isCoreIntent(intent as string)) {
      results.push(pass('intent-validity', `intent-${intent}`, `Intent: ${intent}`, 'Valid CoreIntent'));
    } else {
      results.push(fail('intent-validity', `intent-${intent}`, `Intent: ${intent}`, 'error',
        `"${intent}" is not a valid CoreIntent`,
      ));
    }
  }

  // All bindings reference valid intents
  for (const binding of contract.intentBindings) {
    const isValid = isCoreIntent(binding.intent as string);
    if (isValid) {
      results.push(pass('intent-validity', `binding-${binding.elementRole}`, `Binding: ${binding.elementRole}`, `Bound to ${binding.intent}`));
    } else {
      results.push(fail('intent-validity', `binding-${binding.elementRole}`, `Binding: ${binding.elementRole}`, 'error',
        `Binding references non-canonical intent: ${binding.intent}`,
      ));
    }
  }

  // Has at least one CTA binding
  const hasCta = contract.intentBindings.some(b => b.elementRole.includes('cta') || b.elementRole.includes('primary'));
  if (hasCta) {
    results.push(pass('intent-validity', 'has-cta', 'Primary CTA', 'At least one CTA binding exists'));
  } else {
    results.push(fail('intent-validity', 'has-cta', 'Primary CTA', 'warning', 'No CTA bindings found'));
  }

  return results;
}

function validateWorkflowValidity(contract: CompiledContract): IntegrityCheckResult[] {
  const results: IntegrityCheckResult[] = [];

  // Automation pack is set
  if (contract.automationPack) {
    results.push(pass('workflow-validity', 'has-automation-pack', 'Automation pack', `Pack: ${contract.automationPack}`));
  } else {
    results.push(fail('workflow-validity', 'has-automation-pack', 'Automation pack', 'warning', 'No automation pack configured'));
  }

  // Required workflows have names
  for (const wf of contract.requiredWorkflows) {
    if (wf.name?.trim()) {
      results.push(pass('workflow-validity', `workflow-${wf.name}`, `Workflow: ${wf.name}`, 'Workflow defined'));
    } else {
      results.push(fail('workflow-validity', 'workflow-unnamed', 'Unnamed workflow', 'warning', 'Workflow has no name'));
    }
  }

  // CRM pipeline configured
  if (contract.crm?.name && contract.crm.stages.length > 0) {
    results.push(pass('workflow-validity', 'crm-pipeline', 'CRM pipeline', `${contract.crm.name}: ${contract.crm.stages.length} stages`));
  } else {
    results.push(fail('workflow-validity', 'crm-pipeline', 'CRM pipeline', 'warning', 'CRM pipeline not configured or has no stages'));
  }

  return results;
}

function validateProvisioningStatus(contract: CompiledContract): IntegrityCheckResult[] {
  const results: IntegrityCheckResult[] = [];
  const report = contract.provisioningReport;

  // Overall provisioning
  const statusLabel: Record<ProvisioningStatus, string> = {
    provisioned: 'All capabilities provisioned',
    stub: 'Some capabilities stubbed (demo mode)',
    missing: 'Missing capability provisions',
  };

  if (report.status === 'provisioned') {
    results.push(pass('provisioning', 'overall-provisioning', 'Provisioning', statusLabel[report.status]));
  } else if (report.status === 'stub') {
    results.push(fail('provisioning', 'overall-provisioning', 'Provisioning', 'warning', statusLabel[report.status],
      { provisioned: report.provisioned, stubbed: report.stubbed, missing: report.missing },
    ));
  } else {
    results.push(fail('provisioning', 'overall-provisioning', 'Provisioning', 'error', statusLabel[report.status],
      { provisioned: report.provisioned, stubbed: report.stubbed, missing: report.missing },
    ));
  }

  // Preview readiness
  if (report.previewReady) {
    results.push(pass('provisioning', 'preview-ready', 'Preview ready', 'Site can be previewed'));
  } else {
    results.push(fail('provisioning', 'preview-ready', 'Preview ready', 'error', 'Site cannot be previewed — missing provisions'));
  }

  // Production readiness
  if (report.productionReady) {
    results.push(pass('provisioning', 'production-ready', 'Production ready', 'Site can be published'));
  } else {
    results.push(fail('provisioning', 'production-ready', 'Production ready', 'warning',
      'Not production-ready (stubs or missing backend)',
    ));
  }

  return results;
}

function validateCrossConsistency(bundle: SiteBundle, contract: CompiledContract): IntegrityCheckResult[] {
  const results: IntegrityCheckResult[] = [];

  // Bundle pages match contract pages
  const bundlePages = bundle.pages ? Object.keys(bundle.pages) : [];
  const contractPages = contract.pages.map(p => p.path);

  if (bundlePages.length > 0 && contractPages.length > 0) {
    const bundlePaths = new Set(
      Object.values(bundle.pages || {}).map((p) => p.path).filter(Boolean)
    );
    const contractPaths = new Set(contractPages);

    const inBundleNotContract = [...bundlePaths].filter(p => !contractPaths.has(p));
    const inContractNotBundle = [...contractPaths].filter(p => !bundlePaths.has(p as string));

    if (inBundleNotContract.length === 0 && inContractNotBundle.length === 0) {
      results.push(pass('consistency', 'pages-match', 'Page consistency', 'Bundle and contract pages match'));
    } else {
      if (inBundleNotContract.length > 0) {
        results.push(fail('consistency', 'orphan-bundle-pages', 'Orphan bundle pages', 'warning',
          `Pages in bundle but not contract: ${inBundleNotContract.join(', ')}`,
        ));
      }
      if (inContractNotBundle.length > 0) {
        results.push(fail('consistency', 'orphan-contract-pages', 'Orphan contract pages', 'warning',
          `Pages in contract but not bundle: ${inContractNotBundle.join(', ')}`,
        ));
      }
    }
  }

  return results;
}

// ============================================================================
// Category Summary Builder
// ============================================================================

function buildCategorySummary(
  checks: IntegrityCheckResult[],
): Record<IntegrityCategory, { passed: boolean; checks: number; failures: number }> {
  const categories: IntegrityCategory[] = [
    'bundle-structure', 'route-integrity', 'intent-validity',
    'workflow-validity', 'provisioning', 'consistency',
  ];

  const result: Record<string, { passed: boolean; checks: number; failures: number }> = {};

  for (const cat of categories) {
    const catChecks = checks.filter(c => c.category === cat);
    const failures = catChecks.filter(c => !c.passed && c.severity === 'error').length;
    result[cat] = {
      passed: failures === 0,
      checks: catChecks.length,
      failures,
    };
  }

  return result as Record<IntegrityCategory, { passed: boolean; checks: number; failures: number }>;
}
