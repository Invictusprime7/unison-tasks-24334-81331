/**
 * Integrity Report Tests
 * 
 * Tests the unified validation aggregator.
 */
import { describe, it, expect } from "vitest";
import { runIntegrityReport, type IntegrityReport } from "@/platform/core/integrityReport";
import type { CompiledContract } from "@/platform/core/contractCompiler";
import type { ProvisioningReport } from "@/platform/core/provisioningValidator";

// ── Minimal fixtures ──────────────────────────────────────────────────

function makeMinimalContract(overrides: Partial<CompiledContract> = {}): CompiledContract {
  return {
    validation: { valid: true, issues: [], errors: 0, warnings: 0, infos: 0 },
    canonicalIntents: ['contact.submit', 'nav.goto'] as any,
    requiredTables: ['leads'],
    requiredWorkflows: [{ name: 'lead-notify', trigger: 'lead.created', actions: [] }] as any,
    intentBindings: [
      { bindingKey: 'hero.primary-cta', pageRole: 'home', sectionType: 'hero', slotRole: 'primary-cta', elementRole: 'primary-cta', intent: 'contact.submit' as any, params: {}, source: 'blueprint' as const, readiness: 'preview-ready' as const },
    ],
    pages: [
      { title: 'Home', path: '/', purpose: 'landing', isHome: true, sections: ['hero'], hasComposition: true },
      { title: 'About', path: '/about', purpose: 'info', isHome: false, sections: ['text'], hasComposition: true },
    ],
    crm: { name: 'Leads', stages: ['new', 'contacted', 'qualified'], defaultStage: 'new' },
    automationPack: 'service-pro',
    routePolicy: {
      routes: [
        { path: '/', label: 'Home', kind: 'page' as const },
        { path: '/about', label: 'About', kind: 'page' as const },
      ],
      ctaRouteMap: {},
      overlayRoutes: [],
      reservedRoutes: [],
      fallbackRoute: '/',
    },
    slotBindingPolicy: { rules: [], resolved: [] } as any,
    provisioningReport: {
      status: 'provisioned',
      capabilities: [],
      provisioned: 2,
      stubbed: 0,
      missing: 0,
      productionReady: true,
      previewReady: true,
    } as ProvisioningReport,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("runIntegrityReport", () => {
  it("returns passed=false when no bundle or contract provided", () => {
    const report = runIntegrityReport(null, null);
    expect(report.passed).toBe(false);
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.summary.errors).toBeGreaterThan(0);
  });

  it("validates contract-only (no bundle)", () => {
    const contract = makeMinimalContract();
    const report = runIntegrityReport(null, contract);
    // Should fail because no bundle
    expect(report.passed).toBe(false);
    // But contract checks should pass
    const routeChecks = report.checks.filter(c => c.category === 'route-integrity');
    expect(routeChecks.every(c => c.passed)).toBe(true);
  });

  it("validates route integrity - has root route", () => {
    const contract = makeMinimalContract();
    const report = runIntegrityReport(null, contract, { includeInfos: true });
    const rootCheck = report.checks.find(c => c.checkId === 'has-root-route');
    expect(rootCheck?.passed).toBe(true);
  });

  it("fails route integrity when no root route", () => {
    const contract = makeMinimalContract({
      routePolicy: {
        routes: [{ path: '/about', label: 'About', kind: 'page' as const }],
        ctaRouteMap: {},
        overlayRoutes: [],
        reservedRoutes: [],
        fallbackRoute: '/',
      },
    });
    const report = runIntegrityReport(null, contract);
    const rootCheck = report.checks.find(c => c.checkId === 'has-root-route');
    expect(rootCheck?.passed).toBe(false);
  });

  it("validates intent validity - all canonical intents are valid", () => {
    const contract = makeMinimalContract();
    const report = runIntegrityReport(null, contract);
    const intentChecks = report.checks.filter(c => c.category === 'intent-validity' && c.checkId.startsWith('intent-'));
    expect(intentChecks.every(c => c.passed)).toBe(true);
  });

  it("detects non-canonical intent in contract", () => {
    const contract = makeMinimalContract({
      canonicalIntents: ['contact.submit', 'totally.fake.intent'] as any,
    });
    const report = runIntegrityReport(null, contract);
    const fakeCheck = report.checks.find(c => c.checkId === 'intent-totally.fake.intent');
    expect(fakeCheck?.passed).toBe(false);
    expect(fakeCheck?.severity).toBe('error');
  });

  it("validates workflow validity", () => {
    const contract = makeMinimalContract();
    const report = runIntegrityReport(null, contract, { includeInfos: true });
    const wfChecks = report.checks.filter(c => c.category === 'workflow-validity');
    expect(wfChecks.some(c => c.checkId === 'has-automation-pack' && c.passed)).toBe(true);
    expect(wfChecks.some(c => c.checkId === 'crm-pipeline' && c.passed)).toBe(true);
  });

  it("warns when no automation pack", () => {
    const contract = makeMinimalContract({ automationPack: '' });
    const report = runIntegrityReport(null, contract);
    const packCheck = report.checks.find(c => c.checkId === 'has-automation-pack');
    expect(packCheck?.passed).toBe(false);
    expect(packCheck?.severity).toBe('warning');
  });

  it("validates provisioning status", () => {
    const contract = makeMinimalContract();
    const report = runIntegrityReport(null, contract, { includeInfos: true });
    const provChecks = report.checks.filter(c => c.category === 'provisioning');
    expect(provChecks.some(c => c.checkId === 'preview-ready' && c.passed)).toBe(true);
    expect(provChecks.some(c => c.checkId === 'production-ready' && c.passed)).toBe(true);
  });

  it("detects stubbed provisioning", () => {
    const contract = makeMinimalContract({
      provisioningReport: {
        status: 'stub',
        capabilities: [],
        provisioned: 1,
        stubbed: 1,
        missing: 0,
        productionReady: false,
        previewReady: true,
      } as ProvisioningReport,
    });
    const report = runIntegrityReport(null, contract);
    const overall = report.checks.find(c => c.checkId === 'overall-provisioning');
    expect(overall?.passed).toBe(false);
    expect(overall?.severity).toBe('warning');
  });

  it("category summary is correct", () => {
    const contract = makeMinimalContract();
    const report = runIntegrityReport(null, contract);
    expect(report.categories['route-integrity'].passed).toBe(true);
    expect(report.categories['intent-validity'].passed).toBe(true);
    expect(report.categories['workflow-validity'].passed).toBe(true);
    expect(report.categories['provisioning'].passed).toBe(true);
  });

  it("detects duplicate routes", () => {
    const contract = makeMinimalContract({
      routePolicy: {
        routes: [
          { path: '/', label: 'Home', kind: 'page' as const },
          { path: '/', label: 'Home2', kind: 'page' as const },
        ],
        ctaRouteMap: {},
        overlayRoutes: [],
        reservedRoutes: [],
        fallbackRoute: '/',
      },
    });
    const report = runIntegrityReport(null, contract);
    const dupeCheck = report.checks.find(c => c.checkId === 'no-duplicate-routes');
    expect(dupeCheck?.passed).toBe(false);
  });

  it("previewReady and publishReady flags are correct", () => {
    const contract = makeMinimalContract();
    // No bundle provided = error → not preview/publish ready
    const report = runIntegrityReport(null, contract);
    expect(report.previewReady).toBe(false); // has errors from missing bundle
    expect(report.publishReady).toBe(false);
  });
});
