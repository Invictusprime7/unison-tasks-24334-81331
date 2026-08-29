/**
 * Single end-to-end preflight pipeline shared by the System Launcher and the
 * Web Builder's AI/template apply paths.
 *
 * Order of operations (must match canonicalLaunchVfs):
 *   1. Early syntax repair  (runPreflightRepair)
 *   2. Nav-intent stamping  (preflightNavWiring)
 *   3. Industry forbidden-intent stripping
 *   4. Final syntax repair  (runPreflightRepair) — catches damage from steps 2-3
 *
 * Every step is best-effort: a thrown error in any stage logs a warning and the
 * pipeline continues with the last good file set.
 */
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import { getIndustryIntentProfile } from '@/platform/core/industryIntentProfiles';
import { runPreflightRepair } from './aiSitePreflightRepair';
import { preflightNavWiring } from './preflightNavWiring';
import { closeRequiredIndustryIntents } from './requiredIntentClosure';
import { stripCanonicalTokenOverrides } from '@/utils/generatedTokenGuard';
import {
  injectMissingLucideIcons,
  rewriteLucideIconLocalImports,
  stripNestedRouterHosts,
  rewriteSelfReferencingImports,
  autoInjectMissingJsxImports,
  repairLocalImportContracts,
  synthesizeMissingJsxExports,
} from '@/utils/sandpackFilePrep';
import {
  runCompileSafeAcceptance,
  summarizeCompileDiagnostics,
  validateBundleTopology,
  type CompileDiagnostic,
  type CompileSafeOptions,
} from './compileSafeGate';
import { repairUnresolvedLocalImports } from './moduleClosureRepair';
import { analyzeComponentContracts } from './componentContractAnalyzer';

export interface RunFullPreflightOptions {
  siteBundleSnapshot?: SiteBundleSnapshot | null;
  industry?: string;
  brand?: string;
  /** Lane attribution for compile-safe diagnostics. */
  sourceLane?: CompileSafeOptions['sourceLane'];
  /** Set false to skip the compile-safe acceptance gate (diagnostics only). */
  compileSafe?: boolean;
  /**
   * Canonical Stage 4b bodies for ladder rung 2 (recover). Defaults to the
   * snapshot's own vfsFiles when a snapshot is supplied.
   */
  canonicalFiles?: Record<string, string>;
}

/** Stage outcome. `failed` can never masquerade as "nothing to do". */
export type StageOutcome = 'applied' | 'declined' | 'failed';

export interface ModuleClosureStageReport {
  status: StageOutcome;
  rewritten: string[];
  recovered: string[];
  synthesized: string[];
  dropped: string[];
  /** Specifiers still unresolved after the ladder ran. */
  remaining: string[];
}

export interface CompileSafeStageReport {
  status: 'accepted' | 'blocked' | 'skipped' | 'failed';
  repaired: string[];
  blockingCount: number;
  summary: string;
}

export interface BundleTopologyStageReport {
  status: 'accepted' | 'blocked' | 'skipped' | 'failed';
  missing: string[];
}

export interface RunFullPreflightResult {
  files: Record<string, string>;
  runtime?: {
    execution: 'worker' | 'compatibility-fallback';
    reason?: string;
    repairAttempts?: number;
  };
  /** Generated files that syntax repair could not recover. Never seal these. */
  quarantinedPaths?: string[];
  /** Parser diagnostics retained for an actionable finalization error. */
  quarantinedDiagnostics?: Array<{ path: string; error: string }>;
  stages: {
    earlyRepair: 'ok' | 'skipped' | 'failed';
    navWiring: 'ok' | 'skipped' | 'failed';
    forbiddenStrip: { stripped: number; forbidden: string[] };
    requiredIntentClosure: { injected: string[]; missing: string[] };
    finalRepair: 'ok' | 'skipped' | 'failed';
    /** Structural module-shape repairs, moved out of Sandpack prep. */
    structuralRepair: StageOutcome;
    /** Single unresolved-module ladder (resolve → recover → synthesize → drop). */
    moduleClosure: ModuleClosureStageReport;
    /** JSX value contracts repaired and validated before acceptance. */
    componentContracts: ClosureAndCompileSafeResult['componentContracts'];
    compileSafe: CompileSafeStageReport;
    /** Phase 10 — snapshot topology vs. candidate bundle. */
    bundleTopology: BundleTopologyStageReport;
  };
  /** Structured compile diagnostics for failure provenance / AI repair. */
  compileDiagnostics: CompileDiagnostic[];
}

export interface ClosureAndCompileSafeOptions {
  siteBundleSnapshot?: SiteBundleSnapshot | null;
  sourceLane?: CompileSafeOptions['sourceLane'];
  pipelineStage?: CompileSafeOptions['pipelineStage'];
  /** Set false to skip the compile-safe / topology gates (diagnostics only). */
  compileSafe?: boolean;
  /** Canonical Stage 4b bodies available to ladder rung 2 (recover). */
  canonicalFiles?: Record<string, string>;
}

export interface ClosureAndCompileSafeResult {
  files: Record<string, string>;
  /** Structural repairs that used to run AFTER every gate, inside Sandpack prep. */
  structuralRepair: StageOutcome;
  moduleClosure: ModuleClosureStageReport;
  componentContracts: {
    status: StageOutcome;
    repaired: string[];
    remaining: string[];
  };
  compileSafe: CompileSafeStageReport;
  bundleTopology: BundleTopologyStageReport;
  compileDiagnostics: CompileDiagnostic[];
}

/**
 * Structural module-shape repairs (router hosts, self-imports, JSX imports,
 * icon imports, passthrough exports).
 *
 * These used to live at the very end of `sandpackFilePrep`, i.e. AFTER every
 * validation gate — so the compiled bundle was not the bundle that had been
 * validated. They now run here, before the ladder and the compile-safe gate.
 * Every pass is idempotent, so prep re-running them is a no-op.
 */
function runStructuralRepairs(input: Record<string, string>): {
  files: Record<string, string>;
  changed: boolean;
} {
  const files: Record<string, string> = { ...input };
  stripNestedRouterHosts(files);
  rewriteSelfReferencingImports(files);
  rewriteLucideIconLocalImports(files);
  for (const [path, src] of Object.entries(files)) {
    if (typeof src !== 'string' || !/\.(tsx|jsx)$/.test(path)) continue;
    const repaired = injectMissingLucideIcons(src);
    if (repaired !== src) files[path] = repaired;
  }
  autoInjectMissingJsxImports(files);
  repairLocalImportContracts(files);
  synthesizeMissingJsxExports(files);

  const inputKeys = Object.keys(input);
  const changed =
    Object.keys(files).length !== inputKeys.length ||
    inputKeys.some((k) => files[k] !== input[k]);
  return { files, changed };
}

/**
 * The shared tail of every repair pipeline: structural repairs, the
 * unresolved-module ladder, the compile-safe acceptance boundary and bundle
 * topology validation.
 *
 * This is exported so the launch path (canonicalLaunchVfs) and the commit path
 * (runFullPreflight) execute the SAME closure policy in the SAME order instead
 * of hand-rolling two divergent tails.
 */
export function runModuleClosureAndCompileSafe(
  inputFiles: Record<string, string>,
  options: ClosureAndCompileSafeOptions = {},
): ClosureAndCompileSafeResult {
  let files = inputFiles;

  const canonicalFiles =
    options.canonicalFiles ?? options.siteBundleSnapshot?.vfsFiles ?? undefined;

  let structuralRepair: StageOutcome = 'declined';
  try {
    const structural = runStructuralRepairs(files);
    if (structural.changed) {
      files = structural.files;
      structuralRepair = 'applied';
    }
  } catch (e) {
    console.warn('[preflight] structural repairs failed', e);
    structuralRepair = 'failed';
  }


  let moduleClosure: ModuleClosureStageReport = {
    status: 'declined',
    rewritten: [],
    recovered: [],
    synthesized: [],
    dropped: [],
    remaining: [],
  };
  try {
    const closure = repairUnresolvedLocalImports(files, { canonicalFiles });
    const changed =
      closure.rewritten.length > 0 ||
      closure.recovered.length > 0 ||
      closure.synthesized.length > 0 ||
      closure.dropped.length > 0;
    if (changed) files = closure.files;
    moduleClosure = {
      status: changed ? 'applied' : 'declined',
      rewritten: closure.rewritten,
      recovered: closure.recovered,
      synthesized: closure.synthesized,
      dropped: closure.dropped,
      remaining: closure.remaining.map((item) => `${item.filePath} → "${item.importPath}"`),
    };
    if (changed) console.log('[preflight] module closure ladder', moduleClosure);
  } catch (e) {
    console.warn('[preflight] module closure ladder failed', e);
    moduleClosure = { ...moduleClosure, status: 'failed' };
  }

  let componentContracts: ClosureAndCompileSafeResult['componentContracts'] = {
    status: 'declined',
    repaired: [],
    remaining: [],
  };
  try {
    const contracts = analyzeComponentContracts(files, { repair: true });
    files = contracts.files;
    componentContracts = {
      status: contracts.repaired.length > 0 ? 'applied' : 'declined',
      repaired: contracts.repaired,
      remaining: contracts.diagnostics.map((diagnostic) => diagnostic.message),
    };
  } catch (error) {
    console.warn('[preflight] component-contract repair failed', error);
    componentContracts = { status: 'failed', repaired: [], remaining: [] };
  }

  let compileSafe: CompileSafeStageReport = {
    status: 'skipped',
    repaired: [],
    blockingCount: 0,
    summary: 'skipped',
  };
  let compileDiagnostics: CompileDiagnostic[] = [];

  if (options.compileSafe !== false) {
    try {
      const gate = runCompileSafeAcceptance(files, {
        sourceLane: options.sourceLane ?? 'unknown',
        pipelineStage: options.pipelineStage ?? 'acceptance',
      });
      files = gate.files;
      compileDiagnostics = gate.diagnostics;
      // Advisory only: component-contract findings never block acceptance.
      const contractDiagnostics = analyzeComponentContracts(files).diagnostics;
      for (const diagnostic of contractDiagnostics) {
        compileDiagnostics.push({
          pagePath: diagnostic.importerPath,
          pipelineStage: options.pipelineStage ?? 'acceptance',
          sourceLane: options.sourceLane ?? 'unknown',
          validationStage: 'export-contract',
          diagnosticCode: 'INVALID_JSX_COMPONENT_CONTRACT',
          severity: 'warning',
          message: diagnostic.message,
          repairAttempt: 0,
          resolved: false,
        });
      }
      compileSafe = {
        status: gate.accepted ? 'accepted' : 'blocked',
        repaired: gate.repaired,
        blockingCount: gate.blocking.length,
        summary: summarizeCompileDiagnostics(compileDiagnostics),
      };

      if (!gate.accepted) {
        console.warn('[preflight] compile-safe gate blocked', {
          blocking: gate.blocking.slice(0, 10).map((d) => ({
            path: d.pagePath,
            code: d.diagnosticCode,
            stage: d.validationStage,
            line: d.line,
          })),
        });
      }
    } catch (e) {
      console.warn('[preflight] compile-safe gate failed', e);
      compileSafe = { status: 'failed', repaired: [], blockingCount: 0, summary: 'gate threw' };
    }
  }

  let bundleTopology: BundleTopologyStageReport = { status: 'skipped', missing: [] };
  if (options.siteBundleSnapshot) {
    try {
      const topologyDiagnostics = validateBundleTopology(files, options.siteBundleSnapshot, {
        sourceLane: options.sourceLane ?? 'unknown',
        pipelineStage: options.pipelineStage ?? 'acceptance',
      });
      compileDiagnostics = [...compileDiagnostics, ...topologyDiagnostics];
      bundleTopology = {
        status: topologyDiagnostics.length === 0 ? 'accepted' : 'blocked',
        missing: topologyDiagnostics.map((d) => d.pagePath),
      };
      if (topologyDiagnostics.length > 0) {
        console.warn('[preflight] bundle topology blocked', bundleTopology.missing);
      }
    } catch (e) {
      console.warn('[preflight] bundle topology check failed', e);
      bundleTopology = { status: 'failed', missing: [] };
    }
  }

  return {
    files,
    structuralRepair,
    moduleClosure,
    componentContracts,
    compileSafe,
    bundleTopology,
    compileDiagnostics,
  };
}

export function runFullPreflight(
  inputFiles: Record<string, string>,
  options: RunFullPreflightOptions = {},
): RunFullPreflightResult {
  const { siteBundleSnapshot = null, industry, brand } = options;
  const ctx = { industry, brand };

  // 0) Theme authority: strip AI-authored redefinitions of Stage 4b's canonical
  // design tokens (and DOM attributes smuggled into className). Left in place
  // they are self-referential and blank out every themed utility on the page.
  let files = inputFiles;
  {
    const guarded: Record<string, string> = { ...files };
    let tokens = 0;
    let attrs = 0;
    for (const [path, src] of Object.entries(guarded)) {
      if (typeof src !== 'string' || !/\.(tsx|jsx)$/.test(path)) continue;
      const result = stripCanonicalTokenOverrides(src);
      if (result.code !== src) {
        guarded[path] = result.code;
        tokens += result.strippedTokens;
        attrs += result.strippedAttrClasses;
      }
    }
    if (tokens > 0 || attrs > 0) {
      console.warn('[runFullPreflight] stripped canonical token overrides', { tokens, attrs });
      files = guarded;
    }
  }

  // 0b) Icon authority: AI often imports lucide icons as local sibling modules
  // (`./components/CalendarPlus`). Point them at lucide-react before any gate
  // treats them as a missing local module.
  {
    const iconFixed: Record<string, string> = { ...files };
    rewriteLucideIconLocalImports(iconFixed);
    // Icons referenced but never imported (`<Icon icon={CalendarPlus} />`) are a
    // hard runtime crash in Sandpack. Repair before the snapshot is sealed.
    for (const [path, src] of Object.entries(iconFixed)) {
      if (typeof src !== 'string' || !/\.(tsx|jsx)$/.test(path)) continue;
      const repaired = injectMissingLucideIcons(src);
      if (repaired !== src) iconFixed[path] = repaired;
    }
    files = iconFixed;
  }


  // 1) Early syntax repair
  let earlyRepair: 'ok' | 'skipped' | 'failed' = 'skipped';
  const quarantinedPaths = new Set<string>();
  const quarantinedDiagnostics = new Map<string, string>();
  try {
    const r = runPreflightRepair(files, { context: ctx });
    files = r.files;
    for (const report of r.reports) {
      if (report.status === 'quarantined') {
        quarantinedPaths.add(report.path);
        quarantinedDiagnostics.set(report.path, report.finalError || 'Unrecoverable generated source');
      }
    }
    earlyRepair = 'ok';
  } catch (e) {
    console.warn('[runFullPreflight] early repair failed', e);
    earlyRepair = 'failed';
  }

  // 2) Nav-intent stamping (requires snapshot)
  let navWiring: 'ok' | 'skipped' | 'failed' = 'skipped';
  if (siteBundleSnapshot) {
    try {
      files = preflightNavWiring(files, siteBundleSnapshot).files;
      navWiring = 'ok';
    } catch (e) {
      console.warn('[runFullPreflight] nav wiring failed', e);
      navWiring = 'failed';
    }
  }

  // 3) Forbidden-intent stripping (industry-aware)
  const resolvedIndustry = industry || siteBundleSnapshot?.industry;
  const forbidden = resolvedIndustry
    ? (getIndustryIntentProfile(resolvedIndustry)?.forbidden ?? [])
    : [];
  let stripped = 0;
  if (forbidden.length > 0) {
    const escaped = forbidden.map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const attrRe = new RegExp(`\\s+data-ut-intent\\s*=\\s*["'](?:${escaped})["']`, 'g');
    const next: Record<string, string> = { ...files };
    for (const [p, src] of Object.entries(next)) {
      if (typeof src !== 'string') continue;
      const after = src.replace(attrRe, () => {
        stripped++;
        return '';
      });
      if (after !== src) next[p] = after;
    }
    files = next;
    if (stripped > 0) {
      console.warn('[runFullPreflight] stripped forbidden intents', {
        industry: resolvedIndustry,
        forbidden,
        count: stripped,
      });
    }
  }

  // 4) Required-intent closure. This is deterministic and profile-driven so
  // required CTA surfaces never depend solely on AI prompt compliance.
  const requiredIntentClosure = closeRequiredIndustryIntents(files, resolvedIndustry);
  files = requiredIntentClosure.files;
  if (requiredIntentClosure.injected.length > 0 || requiredIntentClosure.missing.length > 0) {
    console.info('[runFullPreflight] required intent closure', requiredIntentClosure);
  }

  // 5) Final syntax repair (catches damage from steps 2-4)
  let finalRepair: 'ok' | 'skipped' | 'failed' = 'skipped';
  try {
    const r = runPreflightRepair(files, { context: ctx });
    files = r.files;
    for (const report of r.reports) {
      if (report.status === 'quarantined') {
        quarantinedPaths.add(report.path);
        quarantinedDiagnostics.set(report.path, report.finalError || 'Unrecoverable generated source');
      }
    }
    finalRepair = 'ok';
  } catch (e) {
    console.warn('[runFullPreflight] final repair failed', e);
    finalRepair = 'failed';
  }

  // 5b–7) Shared tail: unresolved-module ladder → compile-safe acceptance →
  // bundle topology. Identical code path as the launch pipeline.
  const tail = runModuleClosureAndCompileSafe(files, {
    siteBundleSnapshot,
    sourceLane: options.sourceLane,
    pipelineStage: 'acceptance',
    compileSafe: options.compileSafe,
    canonicalFiles: options.canonicalFiles,
  });
  files = tail.files;
  const { structuralRepair, moduleClosure, componentContracts, compileSafe, bundleTopology } = tail;
  const compileDiagnostics = tail.compileDiagnostics;

  return {
    files,
    quarantinedPaths: Array.from(quarantinedPaths),
    quarantinedDiagnostics: Array.from(quarantinedDiagnostics, ([path, error]) => ({ path, error })),
    stages: {
      earlyRepair,
      navWiring,
      forbiddenStrip: { stripped, forbidden },
      requiredIntentClosure: {
        injected: requiredIntentClosure.injected,
        missing: requiredIntentClosure.missing,
      },
      finalRepair,
      structuralRepair,
      moduleClosure,
      componentContracts,
      compileSafe,
      bundleTopology,
    },
    compileDiagnostics,

  };
}
