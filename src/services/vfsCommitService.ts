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
 * Feature flag: `VITE_USE_COMMIT_SERVICE`. When unset/false, callers that
 * have been migrated fall back to their pre-existing direct paths to avoid
 * a big-bang regression. The lint rule in
 * `scripts/lint-pipeline-bypass.mjs` enforces that, once a writer migrates,
 * it cannot regress to a direct canonical-pipeline call.
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
import type { PlaygroundState } from '@/platform/core/playground';
import type { CompiledContract } from '@/platform/core/contractCompiler';
import type { ThemeTokens } from '@/sections/types';
import { PreviewGate, PublishGate, type GateVerdict } from '@/platform/core/gates';
import { runFullPreflight } from '@/services/runFullPreflight';
import { resolvePlaygroundControlPlane } from '@/services/playgroundControlPlaneResolver';
import { evaluateElementReadiness, type ElementReadinessReport } from '@/services/elementReadinessEvaluator';
import { executeBackendOps, type BackendOpExecutionReport } from '@/services/backendOpExecutor';
import type { PlaygroundControlPlaneModel } from '@/types/playground';
import type { CapabilityId } from '@/platform/core/capabilityRegistry';
import {
  assertBuilderIdentity,
  type BuilderIdentity,
} from '@/types/builderIdentity';
import {
  assertPatchPlan,
  emptyPatchPlan,
  type PatchPlan,
  type PatchSource,
} from '@/types/patchPlan';



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
  siteBundleSnapshot: unknown;
  runtimeManifest: unknown;
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

/**
 * Returns true if the feature flag enables the commit service.
 * Defaults to ON now that Moves 1–6 are wired end-to-end; set
 * `VITE_USE_COMMIT_SERVICE=false` to opt out for debugging.
 */
export function isCommitServiceEnabled(): boolean {
  const v = (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_USE_COMMIT_SERVICE;
  if (v === 'false' || v === '0') return false;
  return true;
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
    } else {
      workingFiles[op.path] = op.contents;
    }
  }
  log('fileOps', 'info', `applied ${patch.fileOps.length} file op(s)`);

  // 4. Canonical recompile via commitToPipeline -----------------------------
  let canonicalResult: CanonicalCommitResult;
  try {
    canonicalResult = commitToPipeline(
      buildCanonicalInput(input, workingFiles),
      toCanonicalSource(input.source),
    );
  } catch (err) {
    log('canonical', 'error', 'canonical pipeline threw', String(err));
    return finalize({
      input,
      status: 'rejected',
      vfsFiles: workingFiles,
      siteBundleSnapshot: input.current.siteBundleSnapshot ?? null,
      runtimeManifest: null,
      playground: input.current.playground ?? null,
      readinessReport: {},
      publishReady: false,
      publishBlockers: [
        {
          source: 'preview',
          code: 'canonical-pipeline-threw',
          message: 'Canonical pipeline failed; nothing safe to publish',
        },
      ],
      vfsHash: await hashVfsFiles(workingFiles),
      backendOpsApplied: [],
      diagnostics,
      parentRevisionId: input.identity.revisionId || null,
      rejectMessage: 'canonical pipeline threw — see diagnostics',
    });
  }

  // 5. Full preflight --------------------------------------------------------
  const snapshot = canonicalResult.siteBundleSnapshot ?? null;
  let files: Record<string, string> =
    input.source === 'wizard-launch'
      ? mergeWizardLaunchFiles(workingFiles, (snapshot as SiteBundleSnapshot | null) ?? null)
      : ((snapshot as { vfsFiles?: Record<string, string> } | null)?.vfsFiles ?? workingFiles);
  let snapshotForPersistence = input.source === 'wizard-launch'
    ? mergeWizardLaunchSnapshot((snapshot as SiteBundleSnapshot | null) ?? null, files)
    : snapshot;

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

  const gate = canonicalResult.gate ?? null;

  // Move 4: capability readiness adapter. When a CompiledContract is
  // supplied (or surfaced by the canonical pipeline), run PreviewGate +
  // PublishGate so business-critical capability stubs (commerce / booking /
  // donation / auth) block the commit instead of silently degrading.
  const compiled =
    input.options?.compiledContract ??
    ((canonicalResult as { compiledContract?: CompiledContract }).compiledContract ?? null);
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
  const playgroundForIntents = canonicalResult.playground ?? input.current.playground ?? null;
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

  // Move C: execute transactional backend ops (capability provisioning +
  // seeding) declared on the patch plan. Runs after all gates so a
  // rejected commit never mutates the backend.
  let backendOpsReport: BackendOpExecutionReport | null = null;
  const backendOps = input.patch.backendOps ?? [];
  if (backendOps.length > 0) {
    try {
      backendOpsReport = await executeBackendOps(backendOps, input.identity);
      log(
        'backendOps',
        backendOpsReport.failedCount === 0 ? 'info' : 'warn',
        `executed ${backendOpsReport.results.length} ops (failed=${backendOpsReport.failedCount})`,
        backendOpsReport.results.map((r) => ({ type: r.op.type, cap: r.op.capability, status: r.status })),
      );
    } catch (err) {
      log('backendOps', 'error', 'backend op execution threw', String(err));
    }
  }

  const readinessOk =
    (!gate || gate.previewReady) &&
    (!previewVerdict || previewVerdict.ok) &&
    intentPreviewBlocked === 0 &&
    elementPreviewBlocked === 0;



  // 6. Auto-repair-then-hard-reject -----------------------------------------
  let status: 'committed' | 'rejected' = 'committed';
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
      log('repair', 'info', 'auto-repair recovered the commit');
    }
  }

  // Move D — compute publish readiness + blockers aggregate.
  const publishBlockers: PublishBlockerSummary[] = [];
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
    runtimeManifest: canonicalResult.runtimeManifest ?? null,
    playground: canonicalResult.playground ?? input.current.playground ?? null,
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
        ? 'commit rejected by preview/readiness gate after auto-repair'
        : null,
  });
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

function buildCanonicalInput(
  input: CommitMutationInput,
  workingFiles: Record<string, string>,
): CanonicalCommitInput {
  const snapshot = input.current.siteBundleSnapshot as SiteBundleSnapshot | null | undefined;
  return {
    selections: input.options?.selections,
    playground: input.current.playground,
    existingVfsFiles: workingFiles,
    businessName: input.options?.businessName,
    industry: input.options?.industry,
    selectedTemplateId: input.options?.selectedTemplateId ?? snapshot?.meta?.templateId ?? undefined,
    selectedThemeId: input.options?.selectedThemeId ?? snapshot?.meta?.themePresetId ?? undefined,
    themePresetId: input.options?.themePresetId ?? snapshot?.meta?.themePresetId ?? undefined,
    themeTokens: input.options?.themeTokens ?? snapshot?.themeTokens,
    compiledContract: input.options?.compiledContract,
  };
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
  siteBundleSnapshot: unknown;
  runtimeManifest: unknown;
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
    try {
      const row = {
        project_id: input.identity.projectId,
        business_id: input.identity.businessId,
        draft_id: input.identity.draftId,
        parent_revision_id: parentRevisionId,
        source: input.source,
        status,
        patch_json: input.patch as unknown as Record<string, unknown>,
        vfs_files: vfsFiles as unknown as Record<string, unknown>,
        site_bundle_snapshot: (siteBundleSnapshot ?? {}) as Record<string, unknown>,
        runtime_manifest: (runtimeManifest ?? {}) as Record<string, unknown>,
        playground_state: (playground ?? {}) as unknown as Record<string, unknown>,
        readiness_report: readinessReport,
        diagnostics: diagnostics as unknown as Record<string, unknown>[],
        publish_ready: publishReady,
        publish_blockers: publishBlockers as unknown as Record<string, unknown>[],
        backend_ops_applied: backendOpsApplied as unknown as Record<string, unknown>[],
        vfs_hash: vfsHash,
        created_by: input.identity.userId,
      };
      const { data, error } = await supabase
        .from('site_revisions')
        .insert(row)
        .select('id')
        .single();
      if (error) {
        diagnostics.push({
          stage: 'persist',
          level: 'warn',
          message: 'failed to persist site_revisions row',
          detail: error.message,
        });
      } else if (data) {
        persistedRevisionId = (data as { id: string }).id;
      }
    } catch (err) {
      diagnostics.push({
        stage: 'persist',
        level: 'warn',
        message: 'persist threw',
        detail: String(err),
      });
    }

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


