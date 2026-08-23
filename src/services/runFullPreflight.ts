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
}

export interface RunFullPreflightResult {
  files: Record<string, string>;
  stages: {
    earlyRepair: 'ok' | 'skipped' | 'failed';
    navWiring: 'ok' | 'skipped' | 'failed';
    forbiddenStrip: { stripped: number; forbidden: string[] };
    requiredIntentClosure: { injected: string[]; missing: string[] };
    finalRepair: 'ok' | 'skipped' | 'failed';
    compileSafe: {
      status: 'accepted' | 'blocked' | 'skipped' | 'failed';
      repaired: string[];
      blockingCount: number;
      summary: string;
    };
  };
  /** Structured compile diagnostics for failure provenance / AI repair. */
  compileDiagnostics: CompileDiagnostic[];
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

  // 5b) Deterministic module-closure repair. Recoverable specifier drift
  // (wrong directory / casing) and dead imports are fixed before the
  // compile-safe gate runs, so they never reach Sandpack prep — which refuses
  // to synthesize placeholder modules for generated drafts.
  try {
    const closure = repairUnresolvedLocalImports(files);
    if (closure.rewritten.length > 0 || closure.dropped.length > 0) {
      files = closure.files;
      console.log('[runFullPreflight] module closure repaired', {
        rewritten: closure.rewritten,
        dropped: closure.dropped,
        remaining: closure.remaining.length,
      });
    }
  } catch (e) {
    console.warn('[runFullPreflight] module closure repair failed', e);
  }

  // 6) Compile-safe acceptance boundary. Deterministic, bundle-wide, and the
  // last thing that runs before the candidate file set is allowed to become
  // canonical runtime state. It normalizes imports, closes React hook imports,
  // validates every dependency against the Sandpack manifest, and resolves
  // every relative import against the *candidate* bundle (not the committed
  // VFS) so same-transaction modules resolve correctly.
  let compileSafe: RunFullPreflightResult['stages']['compileSafe'] = {
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
        pipelineStage: 'acceptance',
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
        console.warn('[runFullPreflight] compile-safe gate blocked', {
          blocking: gate.blocking.map((d) => ({
            path: d.pagePath,
            code: d.diagnosticCode,
            stage: d.validationStage,
            line: d.line,
          })),
        });
      }
    } catch (e) {
      console.warn('[runFullPreflight] compile-safe gate failed', e);
      compileSafe = { status: 'failed', repaired: [], blockingCount: 0, summary: 'gate threw' };
    }
  }

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
      compileSafe,
    },
    compileDiagnostics,
  };
}
