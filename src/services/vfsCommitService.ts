/**
 * VFSCommitService — the SINGLE legal writer of Web Builder state.
 *
 * Every mutation source (System Launcher, AI Builder, Playground edit,
 * layout/binding fast paths, GHL binding, theme change, republish, restore)
 * MUST funnel through `commitMutation`. The service:
 *
 *   1. Asserts BuilderIdentity (no templateId-as-projectId aliasing).
 *   2. Validates / normalises the PatchPlan.
 *   3. Applies fileOps to the working VFS.
 *   4. Recompiles through the canonical pipeline (commitToPipeline) so the
 *      SiteBundleSnapshot, runtime manifest, intent bindings, and router
 *      are all regenerated together.
 *   5. Runs full preflight + readiness.
 *   6. On failure: runs auto-repair ONCE, then either re-commits or hard
 *      rejects (per the user-approved failure policy "Auto-repair, then
 *      hard reject").
 *   7. Persists a row in `site_revisions` (status = committed | rejected)
 *      so the durable revision chain — not sessionStorage — becomes the
 *      contract that ties launcher → builder → AI panel → publish.
 *
 * See: mem://architecture/site-os/vfs-commit-service
 */

import { supabase } from '@/integrations/supabase/client';
import {
  commitToPipeline,
  type CommitInput as CanonicalCommitInput,
  type CommitResult as CanonicalCommitResult,
  type CommitSource as CanonicalCommitSource,
} from '@/platform/core/commitToPipeline';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import type { RuntimeManifest } from '@/platform/core/runtimeManifest';
import type { PlaygroundState } from '@/platform/core/playground';
import type { CompiledContract } from '@/platform/core/contractCompiler';
import type { ThemeTokens } from '@/sections/types';
import { PreviewGate, PublishGate, type GateVerdict } from '@/platform/core/gates';
import { runFullPreflight } from '@/services/runFullPreflight';
import { resolvePlaygroundControlPlane } from '@/services/playgroundControlPlaneResolver';
import { evaluateElementReadiness, type ElementReadinessReport } from '@/services/elementReadinessEvaluator';
import { executeBackendOps, type BackendOpExecutionReport } from '@/services/backendOpExecutor';
import {
  compileGeneratedSiteRuntimeManifest,
  type GeneratedSiteRuntimeManifest,
} from '@/services/generatedSiteRuntimeManifest';
import {
  buildGeneratedSiteRuntimeManifestModule,
  GENERATED_SITE_RUNTIME_MANIFEST_MODULE_PATH,
} from '@/services/canonicalLaunchVfs';
import type { PlaygroundControlPlaneModel } from '@/types/playground';
import {
  CAPABILITY_REGISTRY,
  type BusinessSystemState,
  type CapabilityId,
} from '@/platform/core/capabilityRegistry';
import {
  assertBuilderIdentity,
  type BuilderIdentity,
} from '@/types/builderIdentity';
import {
  assertPatchPlan,
  emptyPatchPlan,
  type PatchPlan,
  type PatchSource,
  type PresentationOp,
} from '@/types/patchPlan';
import { getVariantById } from '@/sections/variants';



// ----------------------------------------------------------------------------
// Public surface
// ----------------------------------------------------------------------------

export interface CommitMutationInput {
  source: PatchSource;
  identity: BuilderIdentity;
  current: {
    vfsFiles: Record<string, string>;
    playground?: PlaygroundState;
    siteBundleSnapshot?: unknown;
    activePagePath?: string;
  };
  patch: PatchPlan;
  options?: {
    requirePreviewPass?: boolean;
    requireReadinessPass?: boolean;
    /** When true, do NOT persist a revision row (dry-run validation). */
    dryRun?: boolean;
    /** Optional pre-compiled contract for gate evaluation. */
    compiledContract?: CompiledContract;
    /** Hints carried through the canonical pipeline. */
    businessName?: string;
    industry?: string;
    selectedTemplateId?: string;
    selectedThemeId?: string;
    themePresetId?: string;
    /** Exact Stage 4b token payload from the original wizard selection. */
    themeTokens?: ThemeTokens;
    /** For wizard-launch source. */
    selections?: CanonicalCommitInput['selections'];
    /** Exact Wizard artifact already approved by the user. */
    reviewedArtifact?: {
      siteBundleSnapshot: SiteBundleSnapshot;
      runtimeManifest: RuntimeManifest;
      playground?: PlaygroundState;
    };
  };
}

export interface CommitDiagnostic {
  stage: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  detail?: unknown;
}

export interface CommitMutationResult {
  status: 'committed' | 'rejected';
  source: PatchSource;
  identity: BuilderIdentity;
  vfsFiles: Record<string, string>;
  siteBundleSnapshot: SiteBundleSnapshot | null;
  runtimeManifest: RuntimeManifest | null;
  playground: PlaygroundState | null;
  readinessReport: Record<string, unknown>;
  diagnostics: CommitDiagnostic[];
  persistedRevisionId: string | null;
  parentRevisionId: string | null;
  committedAt: string;
  /** Move D — true iff PublishGate + element + intent + backend ops all pass. */
  publishReady: boolean;
  /** Aggregated, user-facing reasons publish is blocked. */
  publishBlockers: PublishBlockerSummary[];
  /** SHA-256 hex of the canonical file map at commit time (drift detection). */
  vfsHash: string;
}

export interface PublishBlockerSummary {
  source: 'publishGate' | 'intentReadiness' | 'elementReadiness' | 'backendOps' | 'preview';
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export class CommitRejectedError extends Error {
  constructor(
    message: string,
    public readonly result: CommitMutationResult,
  ) {
    super(`[VFSCommitService] ${message}`);
    this.name = 'CommitRejectedError';
  }
}

// ----------------------------------------------------------------------------
// Guard 1 — Preview artifact leakage
// ----------------------------------------------------------------------------
//
// `sandpackFilePrep.ts` (the ephemeral VFS → Sandpack preview compiler)
// rewrites `import { MapPin } from 'lucide-react'` into namespace lookups
// like `const MapPin = __LucideIcons['MapPin'] || __LucideFallback;` for
// preview-runtime safety. That transformed source must never become
// canonical VFS content — if it does, a later preview preparation pass can
// reintroduce the original named import (e.g. via a catalog binding
// regenerating a section from a template) and produce a duplicate top-level
// declaration.
//
// Rollout policy (per architecture review): Phase 1 detects + logs + heals
// known Lucide preview artifacts back to plain imports rather than hard
// rejecting the commit, so in-flight projects aren't interrupted. A future
// Phase 2 can upgrade this to a hard rejection once callers are audited.
const PREVIEW_ONLY_ARTIFACT_PATTERNS: RegExp[] = [
  /\b__LucideIcons\b/,
  /\b__LucideFallback\b/,
  /\b__FramerMotion\b/,
  /\b__motionFallback\b/,
  /\b__AnimatePresenceFallback\b/,
];

function detectPreviewArtifacts(contents: string): string[] {
  const hits: string[] = [];
  for (const pattern of PREVIEW_ONLY_ARTIFACT_PATTERNS) {
    if (pattern.test(contents)) hits.push(pattern.source);
  }
  return hits;
}

/**
 * Heal known preview-only Lucide fallback declarations back into a plain
 * `import { ... } from 'lucide-react'` statement. Non-Lucide preview
 * artifacts (framer-motion fallbacks, etc.) are left untouched — they are
 * only detected/logged in Phase 1, since a safe general rewrite isn't
 * available for every fallback shape yet.
 */
function sanitizePreviewArtifacts(contents: string): string {
  const recoveredIcons: string[] = [];
  let sanitized = contents.replace(
    /^const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:__LucideIcons\[[^\]]+\]\s*\|\|\s*)+__LucideFallback;\s*$/gm,
    (_match, alias: string) => {
      recoveredIcons.push(alias);
      return '';
    },
  );

  if (recoveredIcons.length === 0) return contents;

  sanitized = sanitized.replace(/^import \* as __LucideIcons from ['"]lucide-react['"];?\s*$/gm, '');
  sanitized = sanitized.replace(/^const __LucideFallback\s*=.*$/gm, '');
  sanitized = `import { ${recoveredIcons.join(', ')} } from 'lucide-react';\n${sanitized.replace(/^\n+/, '')}`;
  return sanitized.replace(/\n{3,}/g, '\n\n');
}

// ----------------------------------------------------------------------------
// commitMutation — the only legal writer
// ----------------------------------------------------------------------------

export async function commitMutation(
  input: CommitMutationInput,
): Promise<CommitMutationResult> {
  const diagnostics: CommitDiagnostic[] = [];
  const log = (
    stage: string,
    level: CommitDiagnostic['level'],
    message: string,
    detail?: unknown,
  ) => diagnostics.push({ stage, level, message, detail });

  // 1. Identity assertion ----------------------------------------------------
  assertBuilderIdentity(input.identity, 'commitMutation');

  // 2. Patch normalisation ---------------------------------------------------
  const patch = input.patch ?? emptyPatchPlan();
  assertPatchPlan(patch, 'commitMutation');

  // 3. Apply fileOps to working VFS -----------------------------------------
  const workingFiles: Record<string, string> = { ...(input.current.vfsFiles ?? {}) };
  for (const op of patch.fileOps) {
    if (op.type === 'delete') {
      delete workingFiles[op.path];
      continue;
    }

    const artifactHits = detectPreviewArtifacts(op.contents);
    if (artifactHits.length > 0) {
      const sanitized = sanitizePreviewArtifacts(op.contents);
      const healed = sanitized !== op.contents;
      log(
        'fileOps',
        'warn',
        `preview-only artifact(s) detected in ${op.path} (${artifactHits.join(', ')})${healed ? ' — sanitized before canonical commit' : ' — left as-is, no known-safe rewrite'}`,
        { path: op.path, artifactHits, healed },
      );
      workingFiles[op.path] = sanitized;
    } else {
      workingFiles[op.path] = op.contents;
    }
  }
  log('fileOps', 'info', `applied ${patch.fileOps.length} file op(s)`);

  // 4. Apply snapshot-owned presentation operations -------------------------
  const presentationSnapshot = applyPresentationOps(
    input.current.siteBundleSnapshot as SiteBundleSnapshot | null | undefined,
    workingFiles,
    patch.presentationOps,
    log,
  );

  // 5. Resolve the canonical projection -------------------------------------
  // Confirmation is a persistence boundary, not another generation stage.
  // Re-running Stage 4b here can replace the exact files the user reviewed.
  const reviewedArtifact = input.options?.reviewedArtifact;
  if (reviewedArtifact && input.source !== 'wizard-launch') {
    throw new Error('[VFSCommitService] reviewedArtifact is only valid for wizard-launch commits.');
  }
  let canonicalResult: CanonicalCommitResult | null = null;
  if (reviewedArtifact) {
    log('canonical', 'info', 'accepted exact user-reviewed wizard artifact; regeneration skipped');
  } else {
    try {
      canonicalResult = commitToPipeline(
        buildCanonicalInput(input, workingFiles, presentationSnapshot),
        toCanonicalSource(input.source),
      );
    } catch (err) {
      log('canonical', 'error', 'canonical pipeline threw', String(err));
      return finalize({
        input,
        status: 'rejected',
        vfsFiles: workingFiles,
        siteBundleSnapshot: null,
        runtimeManifest: null,
        playground: input.current.playground ?? null,
        readinessReport: {},
        publishReady: false,
        publishBlockers: [{
          source: 'preview',
          code: 'canonical-pipeline-threw',
          message: 'Canonical pipeline failed; nothing safe to publish',
        }],
        vfsHash: await hashVfsFiles(workingFiles),
        backendOpsApplied: [],
        diagnostics,
        parentRevisionId: input.identity.revisionId || null,
        rejectMessage: 'canonical pipeline threw — see diagnostics',
      });
    }
  }

  // 6. Full preflight --------------------------------------------------------
  const snapshot = reviewedArtifact?.siteBundleSnapshot ?? canonicalResult?.siteBundleSnapshot ?? null;
  let files: Record<string, string> =
    input.source === 'wizard-launch'
      ? mergeWizardLaunchFiles(workingFiles, (snapshot as SiteBundleSnapshot | null) ?? null)
      : ((snapshot as { vfsFiles?: Record<string, string> } | null)?.vfsFiles ?? workingFiles);
  let snapshotForPersistence = input.source === 'wizard-launch'
    ? mergeWizardLaunchSnapshot((snapshot as SiteBundleSnapshot | null) ?? null, files)
    : snapshot;
  snapshotForPersistence = stampBusinessSystemState(
    snapshotForPersistence as SiteBundleSnapshot | null,
    presentationSnapshot,
    input.patch.businessSystem ?? (
      input.source === 'wizard-launch'
        ? buildWizardBusinessSystemState(files)
        : undefined
    ),
  );

  const requirePreview = input.options?.requirePreviewPass !== false;
  const requireReadiness = input.options?.requireReadinessPass !== false;

  let preflight = runFullPreflight(files, {
    siteBundleSnapshot: (snapshotForPersistence as { meta?: unknown } | null) as
      | import('@/platform/core/canonicalPipeline').SiteBundleSnapshot
      | null,
    industry: input.options?.industry,
    brand: input.options?.businessName,
  });
  files = preflight.files;
  if (input.source === 'wizard-launch') {
    snapshotForPersistence = mergeWizardLaunchSnapshot(
      (snapshotForPersistence as SiteBundleSnapshot | null) ?? null,
      files,
    );
  }

  const previewOk =
    preflight.stages.earlyRepair !== 'failed' &&
    preflight.stages.finalRepair !== 'failed';
  log('preflight', previewOk ? 'info' : 'warn', 'preflight stages', preflight.stages);

  const gate = canonicalResult?.gate ?? null;

  // Move 4: capability readiness adapter. When a CompiledContract is
  // supplied (or surfaced by the canonical pipeline), run PreviewGate +
  // PublishGate so business-critical capability stubs (commerce / booking /
  // donation / auth) block the commit instead of silently degrading.
  const compiled =
    input.options?.compiledContract ??
    ((canonicalResult as (CanonicalCommitResult & { compiledContract?: CompiledContract }) | null)?.compiledContract ?? null);
  let previewVerdict: GateVerdict | null = null;
  let publishVerdict: GateVerdict | null = null;
  if (compiled) {
    try {
      previewVerdict = PreviewGate.evaluate(compiled);
      publishVerdict = PublishGate.evaluate(compiled);
      log(
        'capabilityGate',
        previewVerdict.ok && publishVerdict.ok ? 'info' : 'warn',
        `preview=${previewVerdict.ok} publish=${publishVerdict.ok}`,
        { preview: previewVerdict.reasons, publish: publishVerdict.reasons },
      );
    } catch (err) {
      log('capabilityGate', 'warn', 'gate evaluation threw', String(err));
    }
  }

  // Move 5: IntentReadinessController consolidation. Evaluate the canonical
  // PlaygroundState through the intent readiness resolver so binding-level
  // preview blockers (missing pages/forms/calendars/popups, broken targets)
  // gate the commit alongside the capability gate.
  let intentControlPlane: PlaygroundControlPlaneModel | null = null;
  let intentPreviewBlocked = 0;
  let intentPublishBlocked = 0;
  const playgroundForIntents = reviewedArtifact?.playground ?? canonicalResult?.playground ?? input.current.playground ?? null;
  if (playgroundForIntents) {
    try {
      intentControlPlane = resolvePlaygroundControlPlane({
        state: playgroundForIntents,
        vfsFiles: files,
      });
      intentPreviewBlocked = intentControlPlane.readinessReport.summary.previewBlocked;
      intentPublishBlocked = intentControlPlane.readinessReport.summary.publishBlocked;
      log(
        'intentReadiness',
        intentPreviewBlocked === 0 ? 'info' : 'warn',
        `intent preview blocked=${intentPreviewBlocked} publish blocked=${intentPublishBlocked}`,
        intentControlPlane.readinessReport.summary,
      );
    } catch (err) {
      log('intentReadiness', 'warn', 'intent readiness evaluation threw', String(err));
    }
  }

  // Move B: per-element capability contract evaluation. Walks every
  // data-ut-intent occurrence in the VFS, checks required capabilities and
  // backing-table row assertions, and surfaces concrete fix paths in the
  // readiness report.
  let elementReadiness: ElementReadinessReport | null = null;
  let elementPreviewBlocked = 0;
  let elementPublishBlocked = 0;
  try {
    const provisionedCapabilities: CapabilityId[] = compiled
      ? compiled.provisioningReport.capabilities.map((c) => c.capabilityId as CapabilityId)
      : [];
    elementReadiness = await evaluateElementReadiness({
      vfsFiles: files,
      provisionedCapabilities,
      businessId: input.identity.businessId,
    });
    elementPreviewBlocked = elementReadiness.summary.previewBlocked;
    elementPublishBlocked = elementReadiness.summary.publishBlocked;
    log(
      'elementReadiness',
      elementPreviewBlocked === 0 ? 'info' : 'warn',
      `element preview blocked=${elementPreviewBlocked} publish blocked=${elementPublishBlocked}`,
      elementReadiness.summary,
    );
  } catch (err) {
    log('elementReadiness', 'warn', 'element readiness evaluation threw', String(err));
  }

  const readinessOk =
    (!gate || gate.previewReady) &&
    (!previewVerdict || previewVerdict.ok) &&
    intentPreviewBlocked === 0 &&
    elementPreviewBlocked === 0;

  let backendOpsReport: BackendOpExecutionReport | null = null;
  let runtimeReconciliationError: string | null = null;


  // 6. Auto-repair-then-hard-reject -----------------------------------------
  let status: 'committed' | 'rejected' = 'committed';
  let preExecutionReady = previewOk && readinessOk;
  if ((requirePreview && !previewOk) || (requireReadiness && !readinessOk)) {
    log('repair', 'warn', 'running single auto-repair pass');
    try {
      preflight = runFullPreflight(files, {
          siteBundleSnapshot: (snapshotForPersistence as { meta?: unknown } | null) as
          | import('@/platform/core/canonicalPipeline').SiteBundleSnapshot
          | null,
        industry: input.options?.industry,
        brand: input.options?.businessName,
      });
      files = preflight.files;
    } catch (err) {
      log('repair', 'error', 'auto-repair threw', String(err));
    }
    const previewOk2 =
      preflight.stages.earlyRepair !== 'failed' &&
      preflight.stages.finalRepair !== 'failed';
    const readinessOk2 =
      (!gate || gate.previewReady) &&
      (!previewVerdict || previewVerdict.ok) &&
      intentPreviewBlocked === 0 &&
      elementPreviewBlocked === 0;
    if ((requirePreview && !previewOk2) || (requireReadiness && !readinessOk2)) {
      status = 'rejected';
      log('gate', 'error', 'hard reject after auto-repair', {
        previewOk: previewOk2,
        readinessOk: readinessOk2,
        publishBlockers: publishVerdict?.reasons ?? [],
        intentPreviewBlocked,
        intentPublishBlocked,
        elementPreviewBlocked,
        elementPublishBlocked,
        backendOpsFailed: backendOpsReport?.failedCount ?? 0,
      });
    } else {
      preExecutionReady = previewOk2 && readinessOk2;
      log('repair', 'info', 'auto-repair recovered the commit');
    }
  }

  // Move C: execute transactional backend ops only after the candidate VFS
  // has survived preview and readiness checks. This is intentionally after
  // the auto-repair decision: a rejected revision must never provision or
  // seed backend data.
  const backendOps = input.patch.backendOps ?? [];
  if (status === 'committed' && preExecutionReady && backendOps.length > 0) {
    try {
      backendOpsReport = await executeBackendOps(backendOps, input.identity);
      log(
        'backendOps',
        backendOpsReport.failedCount === 0 ? 'info' : 'warn',
        `executed ${backendOpsReport.results.length} ops (failed=${backendOpsReport.failedCount})`,
        backendOpsReport.results.map((r) => ({ type: r.op.type, cap: r.op.capability, status: r.status })),
      );
      if (backendOpsReport.failedCount > 0) {
        status = 'rejected';
        log('backendOps', 'error', 'backend operation failure rejected the commit');
      }
      snapshotForPersistence = finalizeBusinessSystemState(
        snapshotForPersistence as SiteBundleSnapshot | null,
        backendOpsReport.failedCount === 0 ? 'provisioned' : 'failed',
      );
    } catch (err) {
      status = 'rejected';
      log('backendOps', 'error', 'backend op execution threw', String(err));
    }
  } else if (backendOps.length > 0) {
    log('backendOps', 'warn', 'skipped backend operations because pre-execution gates failed');
  }

  if (
    status === 'committed' &&
    input.source !== 'wizard-launch' &&
    input.options?.dryRun !== true &&
    snapshotForPersistence
  ) {
    try {
      const generatedRuntime = await reconcileGeneratedRuntime({
        identity: input.identity,
        files,
        snapshot: snapshotForPersistence as SiteBundleSnapshot,
      });
      log(
        'generatedRuntime',
        'info',
        `reconciled ${generatedRuntime.agents.length} generated agent binding(s)`,
      );
    } catch (error) {
      runtimeReconciliationError = error instanceof Error ? error.message : String(error);
      // Reconciliation only exists for launched sites. Projects that have not been
      // provisioned yet must still be able to save edits — the failure is recorded
      // as a publish blocker instead of rejecting the author's work.
      log(
        'generatedRuntime',
        'warn',
        'generated runtime reconciliation deferred (publish blocked, save preserved)',
        runtimeReconciliationError,
      );
    }
  }

  // Move D — compute publish readiness + blockers aggregate.
  const publishBlockers: PublishBlockerSummary[] = [];
  if (runtimeReconciliationError) {
    publishBlockers.push({
      source: 'backendOps',
      code: 'generated-runtime-reconciliation-failed',
      message: runtimeReconciliationError,
    });
  }
  if (publishVerdict && !publishVerdict.ok) {
    for (const r of publishVerdict.reasons) {
      publishBlockers.push({
        source: 'publishGate',
        code: r.code,
        message: r.message,
        meta: r.meta as Record<string, unknown> | undefined,
      });
    }
  }
  if (intentControlPlane && intentControlPlane.readinessReport.summary.publishBlocked > 0) {
    publishBlockers.push({
      source: 'intentReadiness',
      code: 'intent-publish-blocked',
      message: `${intentControlPlane.readinessReport.summary.publishBlocked} intent binding(s) block publish`,
      meta: { summary: intentControlPlane.readinessReport.summary },
    });
  }
  if (elementReadiness && elementReadiness.summary.publishBlocked > 0) {
    publishBlockers.push({
      source: 'elementReadiness',
      code: 'element-publish-blocked',
      message: `${elementReadiness.summary.publishBlocked} element(s) missing required capability/data`,
      meta: { summary: elementReadiness.summary },
    });
  }
  if (backendOpsReport && backendOpsReport.failedCount > 0) {
    publishBlockers.push({
      source: 'backendOps',
      code: 'backend-op-failed',
      message: `${backendOpsReport.failedCount} backend op(s) failed`,
      meta: { failed: backendOpsReport.results.filter((r) => r.status === 'failed') },
    });
  }
  const publishReady =
    status === 'committed' &&
    publishBlockers.length === 0 &&
    (!publishVerdict || publishVerdict.ok);

  const vfsHash = await hashVfsFiles(files);

  // 7. Persist revision + return -------------------------------------------
  return finalize({
    input,
    status,
    vfsFiles: files,
    siteBundleSnapshot: snapshotForPersistence,
    runtimeManifest: reviewedArtifact?.runtimeManifest ?? canonicalResult?.runtimeManifest ?? null,
    playground: reviewedArtifact?.playground ?? canonicalResult?.playground ?? input.current.playground ?? null,
    readinessReport: {
      ...(gate ? { gate } : {}),
      ...(previewVerdict ? { previewVerdict } : {}),
      ...(publishVerdict ? { publishVerdict } : {}),
      ...(intentControlPlane
        ? {
            intentReadiness: {
              summary: intentControlPlane.readinessReport.summary,
              validationSummary: intentControlPlane.validationSummary,
              overview: intentControlPlane.overview,
            },
          }
        : {}),
      ...(elementReadiness ? { elementReadiness } : {}),
      ...(backendOpsReport ? { backendOps: backendOpsReport } : {}),
    } as Record<string, unknown>,
    publishReady,
    publishBlockers,
    vfsHash,
    backendOpsApplied: backendOpsReport?.results ?? [],
    diagnostics,
    parentRevisionId: input.identity.revisionId || null,
    rejectMessage:
      status === 'rejected'
        ? 'commit rejected by preview/readiness gate or backend operation failure'
        : null,
  });
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

/**
 * Recover the *sealed* theme identity that already exists in the working VFS.
 * This is not a re-derivation or a default: `/.unison/site-bundle-snapshot.json`
 * is written by Stage 4b and carries the authoritative seal. Reading it lets a
 * revived draft (whose in-memory snapshot was never rehydrated) keep committing
 * against its original theme instead of throwing ThemeSeedError forever.
 */
function readSealedThemePresetId(
  files: Record<string, string>,
): { themePresetId?: string; templateId?: string } {
  const raw = files['/.unison/site-bundle-snapshot.json'];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as SiteBundleSnapshot;
    const meta = parsed?.meta as (SiteBundleSnapshot['meta'] & {
      seal?: { themePresetId?: string; templateId?: string };
    }) | undefined;
    return {
      themePresetId:
        meta?.themePresetId
        || meta?.seal?.themePresetId
        || meta?.themeInjection?.presetId
        || undefined,
      templateId: meta?.templateId || meta?.seal?.templateId || undefined,
    };
  } catch {
    return {};
  }
}

function buildCanonicalInput(
  input: CommitMutationInput,
  workingFiles: Record<string, string>,
  snapshotOverride?: SiteBundleSnapshot | null,
): CanonicalCommitInput {
  const snapshot = snapshotOverride ?? input.current.siteBundleSnapshot as SiteBundleSnapshot | null | undefined;
  const sealed = readSealedThemePresetId(workingFiles);
  const themePresetId =
    input.options?.themePresetId
    ?? snapshot?.meta?.themePresetId
    ?? sealed.themePresetId
    ?? undefined;
  return {
    selections: input.options?.selections,
    playground: input.current.playground,
    existingVfsFiles: workingFiles,
    businessName: input.options?.businessName,
    industry: input.options?.industry,
    selectedTemplateId:
      input.options?.selectedTemplateId ?? snapshot?.meta?.templateId ?? sealed.templateId ?? undefined,
    selectedThemeId: input.options?.selectedThemeId ?? themePresetId,
    themePresetId,
    themeTokens: input.options?.themeTokens ?? snapshot?.themeTokens,
    compiledContract: input.options?.compiledContract,
  };
}


function applyPresentationOps(
  snapshot: SiteBundleSnapshot | null | undefined,
  files: Record<string, string>,
  ops: PresentationOp[] | undefined,
  log: (stage: string, level: CommitDiagnostic['level'], message: string, detail?: unknown) => void,
): SiteBundleSnapshot | null | undefined {
  if (!ops?.length) return snapshot;
  if (!snapshot?.meta.designIntervention) {
    throw new Error('[VFSCommitService] presentation mutation requires a snapshot-owned design intervention.');
  }

  const intervention = JSON.parse(JSON.stringify(snapshot.meta.designIntervention)) as typeof snapshot.meta.designIntervention;
  for (const op of ops) {
    const currentVariantId = intervention.activeVariants[op.sectionId];
    const currentVariant = currentVariantId ? getVariantById(currentVariantId) : undefined;
    const nextVariant = getVariantById(op.variantId as import('@/sections/variants').VariantId);
    if (!currentVariant || !nextVariant || currentVariant.sectionType !== nextVariant.sectionType) {
      throw new Error(`[VFSCommitService] invalid presentation variant ${op.variantId} for section ${op.sectionId}.`);
    }
    intervention.activeVariants[op.sectionId] = nextVariant.id;
  }

  const nextSnapshot: SiteBundleSnapshot = {
    ...snapshot,
    meta: { ...snapshot.meta, designIntervention: intervention },
  };
  files['/.unison/design-intervention.json'] = JSON.stringify(intervention, null, 2);
  files['/.unison/site-bundle-snapshot.json'] = JSON.stringify(nextSnapshot, null, 2);
  log('presentation', 'info', `applied ${ops.length} snapshot-owned presentation operation(s)`, ops);
  return nextSnapshot;
}

function toCanonicalSource(s: PatchSource): CanonicalCommitSource {
  // commitToPipeline currently understands a narrower CommitSource union.
  // Collapse the expanded PatchSource → the canonical union; the broader
  // source is preserved on the persisted revision row.
  switch (s) {
    case 'wizard-launch':
      return 'wizard-launch';
    case 'ai-builder':
      return 'ai-builder';
    case 'republish':
      return 'republish';
    case 'system-restore':
      return 'system-restore';
    default:
      return 'playground-edit';
  }
}

/**
 * Wizard launches already arrive with the full Lane B/SiteBundle handoff VFS
 * in the patch file map. The canonical wizard recompile is still required for
 * registry/snapshot/runtime derivation, but its compile output is scaffold-only
 * and intentionally drops AI-authored support modules plus metadata files. If a
 * revision persists that scaffold output, WebBuilder's revision-first hydration
 * replaces the rich launch with the minimal template site.
 */
function mergeWizardLaunchFiles(
  launcherFiles: Record<string, string>,
  snapshot: SiteBundleSnapshot | null,
): Record<string, string> {
  const canonicalFiles = snapshot?.vfsFiles ?? {};
  const merged: Record<string, string> = {
    ...canonicalFiles,
    ...launcherFiles,
  };

  const routerPath = snapshot?.routerFile?.path || '/src/App.tsx';
  const routerContent = launcherFiles[routerPath] || launcherFiles['/src/App.tsx'] || snapshot?.routerFile?.content;
  if (routerContent) {
    merged[routerPath] = routerContent;
    merged['/src/App.tsx'] = routerContent;
  }

  return merged;
}

function mergeWizardLaunchSnapshot(
  snapshot: SiteBundleSnapshot | null,
  files: Record<string, string>,
): SiteBundleSnapshot | null {
  if (!snapshot) return null;
  const routerPath = snapshot.routerFile?.path || '/src/App.tsx';
  return {
    ...snapshot,
    vfsFiles: files,
    routerFile: {
      path: routerPath,
      content: files[routerPath] || files['/src/App.tsx'] || snapshot.routerFile?.content || '',
    },
  };
}

function stampBusinessSystemState(
  snapshot: SiteBundleSnapshot | null,
  previousSnapshot: SiteBundleSnapshot | null | undefined,
  requestedState: BusinessSystemState | undefined,
): SiteBundleSnapshot | null {
  if (!snapshot) return null;
  const businessSystem = requestedState ?? previousSnapshot?.businessSystem;
  return businessSystem ? { ...snapshot, businessSystem } : snapshot;
}

function finalizeBusinessSystemState(
  snapshot: SiteBundleSnapshot | null,
  status: 'provisioned' | 'failed',
): SiteBundleSnapshot | null {
  if (!snapshot?.businessSystem) return snapshot;
  return {
    ...snapshot,
    businessSystem: {
      ...snapshot.businessSystem,
      capabilities: snapshot.businessSystem.capabilities.map((capability) => ({ ...capability, status })),
    },
  };
}

function readWizardEnabledCapabilities(files: Record<string, string>): CapabilityId[] {
  try {
    const seed = JSON.parse(files['/.unison/wizard-seed.json'] || '{}') as {
      canonical?: { capabilities?: unknown };
    };
    if (!Array.isArray(seed.canonical?.capabilities)) return [];
    return Array.from(new Set(seed.canonical.capabilities.filter(
      (capability): capability is CapabilityId =>
        typeof capability === 'string' && capability in CAPABILITY_REGISTRY,
    ))).sort();
  } catch {
    return [];
  }
}

function buildWizardBusinessSystemState(files: Record<string, string>): BusinessSystemState | undefined {
  const capabilities = readWizardEnabledCapabilities(files);
  if (capabilities.length === 0) return undefined;
  const approvedAt = new Date().toISOString();
  return {
    version: '1.0',
    requestedCapabilities: Array.from(new Set(
      capabilities.flatMap((capability) => CAPABILITY_REGISTRY[capability].provides),
    )),
    capabilities: capabilities.map((capability) => ({
      id: capability,
      provides: [...CAPABILITY_REGISTRY[capability].provides],
      status: 'approved',
      approval: {
        approvedBy: 'wizard-launch',
        approvedAt,
      },
    })),
  };
}

async function reconcileGeneratedRuntime(input: {
  identity: BuilderIdentity;
  files: Record<string, string>;
  snapshot: SiteBundleSnapshot;
}): Promise<GeneratedSiteRuntimeManifest> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('site_id')
    .eq('id', input.identity.projectId)
    .eq('business_id', input.identity.businessId)
    .single();
  if (projectError || !project?.site_id) {
    throw new Error('Canonical project site identity is unavailable.');
  }

  const manifest = compileGeneratedSiteRuntimeManifest({
    siteId: project.site_id,
    snapshot: input.snapshot,
    enabledCapabilities: readWizardEnabledCapabilities(input.files),
  });
  input.files[GENERATED_SITE_RUNTIME_MANIFEST_MODULE_PATH] =
    buildGeneratedSiteRuntimeManifestModule(manifest);
  input.snapshot.vfsFiles = { ...input.files };

  const { data, error } = await supabase.functions.invoke('reconcile-generated-runtime', {
    body: {
      businessId: input.identity.businessId,
      projectId: input.identity.projectId,
      manifest,
    },
  });
  if (error || !data?.success) {
    throw new Error(error?.message || 'Generated runtime reconciliation failed.');
  }
  return manifest;
}

export async function hashVfsFiles(files: Record<string, string>): Promise<string> {
  try {
    const sortedKeys = Object.keys(files).sort();
    const payload = sortedKeys.map((k) => `${k}\0${files[k]}`).join('\n');
    const enc = new TextEncoder().encode(payload);
    const subtle =
      typeof globalThis !== 'undefined' && (globalThis.crypto as Crypto | undefined)?.subtle;
    if (subtle) {
      const buf = await subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    /* fall through */
  }
  // Fallback: cheap non-crypto hash (only used in environments lacking SubtleCrypto).
  let h = 5381;
  const sortedKeys = Object.keys(files).sort();
  for (const k of sortedKeys) {
    const s = `${k}\0${files[k]}`;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return `fallback-${(h >>> 0).toString(16)}`;
}

async function finalize(args: {
  input: CommitMutationInput;
  status: 'committed' | 'rejected';
  vfsFiles: Record<string, string>;
  siteBundleSnapshot: SiteBundleSnapshot | null;
  runtimeManifest: RuntimeManifest | null;
  playground: PlaygroundState | null;
  readinessReport: Record<string, unknown>;
  publishReady: boolean;
  publishBlockers: PublishBlockerSummary[];
  vfsHash: string;
  backendOpsApplied: unknown[];
  diagnostics: CommitDiagnostic[];
  parentRevisionId: string | null;
  rejectMessage: string | null;
}): Promise<CommitMutationResult> {
  const {
    input,
    status,
    vfsFiles,
    siteBundleSnapshot,
    runtimeManifest,
    playground,
    readinessReport,
    publishReady,
    publishBlockers,
    vfsHash,
    backendOpsApplied,
    diagnostics,
    parentRevisionId,
    rejectMessage,
  } = args;

  let persistedRevisionId: string | null = null;
  const dryRun = input.options?.dryRun === true;

  if (!dryRun) {
    const { data, error } = await (supabase.rpc as any)('commit_canonical_site_revision', {
      p_project_id: input.identity.projectId,
      p_business_id: input.identity.businessId,
      p_draft_id: input.identity.draftId,
      p_parent_revision_id: parentRevisionId,
      p_source: input.source,
      p_status: status,
      p_patch_json: input.patch,
      p_vfs_files: vfsFiles,
      p_site_bundle_snapshot: siteBundleSnapshot ?? {},
      p_runtime_manifest: runtimeManifest ?? {},
      p_playground_state: playground ?? {},
      p_readiness_report: readinessReport,
      p_diagnostics: diagnostics,
      p_publish_ready: publishReady,
      p_publish_blockers: publishBlockers,
      p_backend_ops_applied: backendOpsApplied,
      p_vfs_hash: vfsHash,
      p_active_page_path: input.current.activePagePath ?? null,
    });
    if (error || typeof data !== 'string' || !data) {
      const detail = error?.message || 'atomic commit returned no revision id';
      diagnostics.push({
        stage: 'persist',
        level: 'error',
        message: 'canonical revision transaction failed',
        detail,
      });
      throw new Error(`[VFSCommitService] canonical revision transaction failed: ${detail}`);
    }
    persistedRevisionId = data;

    // Move F #1 — fire-and-forget commit telemetry. Never block on failure.
    try {
      void supabase.from('ai_events').insert({
        kind: 'vfs_commit',
        business_id: input.identity.businessId,
        user_id: input.identity.userId,
        payload: {
          revisionId: persistedRevisionId,
          parentRevisionId,
          draftId: input.identity.draftId,
          projectId: input.identity.projectId,
          source: input.source,
          status,
          publishReady,
          publishBlockerCount: publishBlockers.length,
          vfsHash,
          diagnostics: diagnostics.slice(-20),
        } as unknown as Record<string, unknown>,
      });
    } catch {
      /* telemetry is best-effort */
    }

    // Notify in-process listeners (e.g. WebBuilder's ledger element-readiness
    // hook, RevisionLedgerStatus) that a new committed revision exists so they
    // can refetch without waiting for their polling interval.
    if (persistedRevisionId && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('unison:ledger-updated', {
            detail: {
              projectId: input.identity.projectId,
              revisionId: persistedRevisionId,
              source: input.source,
              publishReady,
            },
          }),
        );
      } catch {
        /* event dispatch is best-effort */
      }
    }
  }

  const result: CommitMutationResult = {
    status,
    source: input.source,
    identity: {
      ...input.identity,
      revisionId: persistedRevisionId ?? input.identity.revisionId,
    },
    vfsFiles,
    siteBundleSnapshot,
    runtimeManifest,
    playground,
    readinessReport,
    diagnostics,
    persistedRevisionId,
    parentRevisionId,
    committedAt: new Date().toISOString(),
    publishReady,
    publishBlockers,
    vfsHash,
  };

  if (status === 'rejected') {
    throw new CommitRejectedError(rejectMessage ?? 'commit rejected', result);
  }
  return result;
}

// ----------------------------------------------------------------------------
// Revision loading — WebBuilder hydration prefers this over sessionStorage.
// ----------------------------------------------------------------------------

export interface LoadedRevision {
  id: string;
  projectId: string;
  businessId: string;
  draftId: string;
  source: PatchSource;
  status: 'committed' | 'rejected' | 'quarantined';
  vfsFiles: Record<string, string>;
  siteBundleSnapshot: unknown;
  runtimeManifest: unknown;
  playground: PlaygroundState | null;
  readinessReport: Record<string, unknown>;
  diagnostics: CommitDiagnostic[];
  publishReady: boolean;
  publishBlockers: PublishBlockerSummary[];
  vfsHash: string | null;
  createdAt: string;
}

export async function loadRevision(revisionId: string): Promise<LoadedRevision | null> {
  const { data, error } = await supabase
    .from('site_revisions')
    .select('*')
    .eq('id', revisionId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRevisionRow(data as Record<string, unknown>);
}

export async function loadLatestRevisionForProject(
  projectId: string,
): Promise<LoadedRevision | null> {
  const { data, error } = await supabase
    .from('site_revisions')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'committed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapRevisionRow(data as Record<string, unknown>);
}

/** Load only the committed revision selected by the durable draft projection. */
export async function loadProjectedRevisionForDraft(
  projectId: string,
  draftId: string,
): Promise<LoadedRevision> {
  const { data: draft, error: draftError } = await (supabase
    .from('builder_drafts') as any)
    .select('last_revision_id')
    .eq('id', draftId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (draftError) throw draftError;
  if (!draft) {
    throw new Error(`[VFSCommitService] canonical draft ${draftId} was not found for project ${projectId}`);
  }
  if (typeof draft.last_revision_id !== 'string' || !draft.last_revision_id) {
    // Recovery: a draft can lose its pointer when the very first post-launch
    // commit was rejected (the pointer only advances on `committed`). Rather
    // than declaring the wizard site lost, project the newest usable revision
    // for this draft so the builder can still open and re-commit.
    const recovered = await loadRecoveryRevisionForDraft(projectId, draftId);
    if (recovered) {
      console.warn(
        `[VFSCommitService] draft ${draftId} had no committed projection; recovered revision ${recovered.id} (${recovered.status})`,
      );
      return recovered;
    }
    throw new Error(`[VFSCommitService] canonical draft ${draftId} has no committed revision projection`);
  }

  const { data: revision, error: revisionError } = await supabase
    .from('site_revisions')
    .select('*')
    .eq('id', draft.last_revision_id)
    .eq('project_id', projectId)
    .eq('draft_id', draftId)
    .eq('status', 'committed')
    .maybeSingle();
  if (revisionError) throw revisionError;
  if (!revision) {
    const recovered = await loadRecoveryRevisionForDraft(projectId, draftId);
    if (recovered) return recovered;
    throw new Error(`[VFSCommitService] draft ${draftId} points to an invalid committed revision`);
  }
  return mapRevisionRow(revision as Record<string, unknown>);
}

/**
 * Score a candidate revision for revival. Highest score wins; ties break on
 * recency. Sealed rows (carrying `/.unison/site-bundle-snapshot.json`) come
 * first because they still hold the authoritative wizard output — later
 * rejected autosaves are often partial mirrors of the same draft.
 */
export function scoreRevivalRevision(row: {
  status?: unknown;
  vfs_files?: unknown;
  site_bundle_snapshot?: unknown;
}): number {
  const files = (row.vfs_files as Record<string, string>) ?? {};
  const fileCount = Object.keys(files).length;
  if (fileCount === 0) return -1;
  const snapshot = (row.site_bundle_snapshot ?? {}) as Record<string, unknown>;
  let score = 0;
  if (row.status === 'committed') score += 4000;
  if (files['/.unison/site-bundle-snapshot.json']) score += 2000;
  if (Object.keys(snapshot).length > 0) score += 1000;
  return score + Math.min(fileCount, 999);
}

/**
 * Best-effort projection for a draft whose committed pointer is missing.
 * Returns the highest-scoring revision that still carries VFS files so a
 * previously generated site is never stranded behind a rejected autosave.
 */
async function loadRecoveryRevisionForDraft(
  projectId: string,
  draftId: string,
): Promise<LoadedRevision | null> {
  const { data, error } = await supabase
    .from('site_revisions')
    .select('*')
    .eq('project_id', projectId)
    .eq('draft_id', draftId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const rows = data as Record<string, unknown>[];
  let best: Record<string, unknown> | null = null;
  let bestScore = 0;
  for (const row of rows) {
    const score = scoreRevivalRevision(row);
    // rows arrive newest-first, so strict `>` keeps the newest of equal scores
    if (score > 0 && score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best ? mapRevisionRow(best) : null;
}


/**
 * Move D — publish flow loads the latest revision whose publish gate +
 * element + intent readiness all passed. Returns null when none exist; the
 * publish UI must refuse to deploy in that case.
 */
export async function loadLatestPublishReadyRevisionForProject(
  projectId: string,
): Promise<LoadedRevision | null> {
  const { data, error } = await supabase
    .from('site_revisions')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'committed')
    .eq('publish_ready', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapRevisionRow(data as Record<string, unknown>);
}

/**
 * Lightweight history feed for the Ledger panel — newest first. Returns the
 * same `LoadedRevision` shape but caps the result count for UI use.
 */
export async function listRecentRevisionsForProject(
  projectId: string,
  limit = 10,
): Promise<LoadedRevision[]> {
  const { data, error } = await supabase
    .from('site_revisions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapRevisionRow);
}

function mapRevisionRow(row: Record<string, unknown>): LoadedRevision {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    businessId: String(row.business_id),
    draftId: String(row.draft_id),
    source: row.source as PatchSource,
    status: row.status as LoadedRevision['status'],
    vfsFiles: (row.vfs_files ?? {}) as Record<string, string>,
    siteBundleSnapshot: row.site_bundle_snapshot ?? null,
    runtimeManifest: row.runtime_manifest ?? null,
    playground: (row.playground_state ?? null) as PlaygroundState | null,
    readinessReport: (row.readiness_report ?? {}) as Record<string, unknown>,
    diagnostics: (row.diagnostics ?? []) as CommitDiagnostic[],
    publishReady: row.publish_ready === true,
    publishBlockers: (row.publish_blockers ?? []) as PublishBlockerSummary[],
    vfsHash: (row.vfs_hash as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

// ----------------------------------------------------------------------------
// Ledger loop closers — restore a prior revision + stamp a republish event.
// Both flow through (or write to) the same durable surfaces as commitMutation
// so history, drift detection, and telemetry stay coherent.
// ----------------------------------------------------------------------------

/**
 * Roll a prior revision forward as a NEW committed revision with
 * source='system-restore'. The full file map of the target revision becomes a
 * single replace-all PatchPlan; the canonical pipeline, gates, readiness, and
 * persistence all run again so the restored state is judged on its own merits
 * (no blind trust in the historical row).
 */
export async function restoreRevision(args: {
  targetRevisionId: string;
  identity: BuilderIdentity;
}): Promise<CommitMutationResult> {
  const target = await loadRevision(args.targetRevisionId);
  if (!target) {
    throw new Error(`[VFSCommitService] restoreRevision: revision ${args.targetRevisionId} not found`);
  }
  if (target.projectId !== args.identity.projectId) {
    throw new Error(
      `[VFSCommitService] restoreRevision: revision ${args.targetRevisionId} belongs to a different project`,
    );
  }

  const fileOps = Object.entries(target.vfsFiles).map(([path, contents]) => ({
    type: 'replace' as const,
    path,
    contents,
  }));


  return commitMutation({
    source: 'system-restore',
    identity: args.identity,
    current: {
      vfsFiles: {},
      playground: target.playground ?? undefined,
      siteBundleSnapshot: target.siteBundleSnapshot,
    },
    patch: {
      ...emptyPatchPlan(),
      fileOps,
      reason: `restore:${args.targetRevisionId}`,
    } as PatchPlan,
  });
}

/**
 * Stamp a successful publish back into the ledger surfaces. Writes a
 * fire-and-forget `ai_events` row tying the deploy URL + provider to the
 * publish-ready revision the deployment actually shipped — so the drift
 * watcher, RevisionLedgerStatus, and any future ops panel can answer
 * "which revision is live right now?" deterministically.
 */
export async function recordRepublishEvent(args: {
  revisionId: string;
  projectId: string;
  businessId: string;
  userId: string | null;
  provider: string;
  url?: string | null;
  vfsHash?: string | null;
}): Promise<void> {
  try {
    await supabase.from('ai_events').insert({
      kind: 'vfs_republish',
      business_id: args.businessId,
      user_id: args.userId,
      payload: {
        revisionId: args.revisionId,
        projectId: args.projectId,
        provider: args.provider,
        url: args.url ?? null,
        vfsHash: args.vfsHash ?? null,
        at: new Date().toISOString(),
      } as unknown as Record<string, unknown>,
    });
  } catch {
    /* telemetry is best-effort */
  }
}


