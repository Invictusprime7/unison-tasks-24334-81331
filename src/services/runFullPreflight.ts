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
import { runExperiencePreflight, stampExperienceManifest } from './experiencePreflightGate';

export interface RunFullPreflightOptions {
  siteBundleSnapshot?: SiteBundleSnapshot | null;
  industry?: string;
  brand?: string;
  /**
   * `repair` (default) may mutate source. `acceptance` is validation-only:
   * nothing is written back, and any file the repair pipeline *would* have
   * changed is reported as a violation instead.
   */
  mode?: 'repair' | 'acceptance';
}

export interface RunFullPreflightResult {
  files: Record<string, string>;
  /** True when this pass changed any source file (repair mode only). */
  mutated: boolean;
  mutatedFiles: string[];
  /** Acceptance mode: files that still require mutation and cannot be sealed. */
  violations: string[];
  mode: 'repair' | 'acceptance';
  stages: {
    earlyRepair: 'ok' | 'skipped' | 'failed';
    navWiring: 'ok' | 'skipped' | 'failed';
    forbiddenStrip: { stripped: number; forbidden: string[] };
    requiredIntentClosure: { injected: string[]; missing: string[] };
    experienceGate: { instances: number; heavyInstances: number; violations: string[] };
    finalRepair: 'ok' | 'skipped' | 'failed';
  };
}

export function runFullPreflight(
  inputFiles: Record<string, string>,
  options: RunFullPreflightOptions = {},
): RunFullPreflightResult {
  const { siteBundleSnapshot = null, industry, brand, mode = 'repair' } = options;
  const ctx = { industry, brand };


  // 1) Early syntax repair
  let files = inputFiles;
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

  // 5) Experience (WebGL) budget + safety gate. Instances are stamped onto the
  // VFS so the builder keeps them WYSIWYG-editable after the seal.
  const experience = runExperiencePreflight(files);
  files = stampExperienceManifest(files, experience.manifest);
  if (experience.violations.length > 0) {
    console.warn('[runFullPreflight] experience gate violations', experience.violations);
  }

  // 6) Final syntax repair (catches damage from steps 2-4)
  let finalRepair: 'ok' | 'skipped' | 'failed' = 'skipped';
  try {
    const r = runPreflightRepair(files, { context: ctx });
    files = r.files;
    finalRepair = 'ok';
  } catch (e) {
    console.warn('[runFullPreflight] final repair failed', e);
    finalRepair = 'failed';
  }

  const mutatedFiles = Object.keys(files).filter((p) => files[p] !== inputFiles[p]);
  const mutated = mutatedFiles.length > 0 || Object.keys(files).length !== Object.keys(inputFiles).length;

  if (mode === 'acceptance') {
    // Validation-only: nothing this pass produced may reach the seal.
    if (mutated) {
      console.warn('[runFullPreflight] acceptance pass found unresolved defects', { mutatedFiles });
    }
    return {
      files: inputFiles,
      mutated: false,
      mutatedFiles: [],
      violations: [...mutatedFiles, ...experience.violations],
      mode,
      stages: {
        earlyRepair,
        navWiring,
        forbiddenStrip: { stripped, forbidden },
        requiredIntentClosure: {
          injected: requiredIntentClosure.injected,
          missing: requiredIntentClosure.missing,
        },
        experienceGate: {
          instances: experience.manifest.totalInstances,
          heavyInstances: experience.manifest.heavyInstances,
          violations: experience.violations,
        },
        finalRepair,
      },
    };
  }

  return {
    files,
    mutated,
    mutatedFiles,
    violations: [],
    mode,
    stages: {
      earlyRepair,
      navWiring,
      forbiddenStrip: { stripped, forbidden },
      requiredIntentClosure: {
        injected: requiredIntentClosure.injected,
        missing: requiredIntentClosure.missing,
      },
      experienceGate: {
        instances: experience.manifest.totalInstances,
        heavyInstances: experience.manifest.heavyInstances,
        violations: experience.violations,
      },
      finalRepair,
    },
  };
}

