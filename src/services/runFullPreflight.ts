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
import { injectMissingLucideIcons, rewriteLucideIconLocalImports } from '@/utils/sandpackFilePrep';
import {
  runCompileSafeAcceptance,
  summarizeCompileDiagnostics,
  validateBundleTopology,
  type CompileDiagnostic,
  type CompileSafeOptions,
} from './compileSafeGate';
import { repairUnresolvedLocalImports } from './moduleClosureRepair';

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
  stages: {
    earlyRepair: 'ok' | 'skipped' | 'failed';
    navWiring: 'ok' | 'skipped' | 'failed';
    forbiddenStrip: { stripped: number; forbidden: string[] };
    requiredIntentClosure: { injected: string[]; missing: string[] };
    finalRepair: 'ok' | 'skipped' | 'failed';
    /** Single unresolved-module ladder (resolve → recover → synthesize → drop). */
    moduleClosure: ModuleClosureStageReport;
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
  moduleClosure: ModuleClosureStageReport;
  compileSafe: CompileSafeStageReport;
  bundleTopology: BundleTopologyStageReport;
  compileDiagnostics: CompileDiagnostic[];
}

/**
 * The shared tail of every repair pipeline: the unresolved-module ladder, the
 * compile-safe acceptance boundary and bundle topology validation.
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
      compileSafe = {
        status: gate.accepted ? 'accepted' : 'blocked',
        repaired: gate.repaired,
        blockingCount: gate.blocking.length,
        summary: summarizeCompileDiagnostics(gate.diagnostics),
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
  if (options.compileSafe !== false && options.siteBundleSnapshot) {
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

  return { files, moduleClosure, compileSafe, bundleTopology, compileDiagnostics };
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
  try {
    const r = runPreflightRepair(files, { context: ctx });
    files = r.files;
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
  const { moduleClosure, compileSafe, bundleTopology } = tail;
  const compileDiagnostics = tail.compileDiagnostics;

  return {
    files,
    stages: {
      earlyRepair,
      navWiring,
      forbiddenStrip: { stripped, forbidden },
      requiredIntentClosure: {
        injected: requiredIntentClosure.injected,
        missing: requiredIntentClosure.missing,
      },
      finalRepair,
      moduleClosure,
      compileSafe,
      bundleTopology,
    },
    compileDiagnostics,

  };
}
