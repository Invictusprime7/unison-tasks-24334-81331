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
import type { PlaygroundState } from '@/platform/core/playground';
import type { CompiledContract } from '@/platform/core/contractCompiler';
import { runFullPreflight } from '@/services/runFullPreflight';
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

/** Returns true if the feature flag enables the commit service. */
export function isCommitServiceEnabled(): boolean {
  const v = (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_USE_COMMIT_SERVICE;
  return v === 'true' || v === '1';
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
      diagnostics,
      parentRevisionId: input.identity.revisionId || null,
      rejectMessage: 'canonical pipeline threw — see diagnostics',
    });
  }

  // 5. Full preflight --------------------------------------------------------
  let files = canonicalResult.files ?? workingFiles;
  const snapshot =
    (canonicalResult as unknown as { siteBundleSnapshot?: unknown })
      .siteBundleSnapshot ?? null;

  const requirePreview = input.options?.requirePreviewPass !== false;
  const requireReadiness = input.options?.requireReadinessPass !== false;

  let preflight = runFullPreflight(files, {
    siteBundleSnapshot: (snapshot as { meta?: unknown } | null) as
      | import('@/platform/core/canonicalPipeline').SiteBundleSnapshot
      | null,
    industry: input.options?.industry,
    brand: input.options?.businessName,
  });
  files = preflight.files;

  const previewOk =
    preflight.stages.earlyRepair !== 'failed' &&
    preflight.stages.finalRepair !== 'failed';
  log('preflight', previewOk ? 'info' : 'warn', 'preflight stages', preflight.stages);

  const gate = canonicalResult.gate ?? null;
  const readinessOk = !gate || gate.previewReady;

  // 6. Auto-repair-then-hard-reject -----------------------------------------
  let status: 'committed' | 'rejected' = 'committed';
  if ((requirePreview && !previewOk) || (requireReadiness && !readinessOk)) {
    log('repair', 'warn', 'running single auto-repair pass');
    try {
      preflight = runFullPreflight(files, {
        siteBundleSnapshot: (snapshot as { meta?: unknown } | null) as
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
    const readinessOk2 = !gate || gate.previewReady;
    if ((requirePreview && !previewOk2) || (requireReadiness && !readinessOk2)) {
      status = 'rejected';
      log('gate', 'error', 'hard reject after auto-repair', {
        previewOk: previewOk2,
        readinessOk: readinessOk2,
      });
    } else {
      log('repair', 'info', 'auto-repair recovered the commit');
    }
  }

  // 7. Persist revision + return -------------------------------------------
  return finalize({
    input,
    status,
    vfsFiles: files,
    siteBundleSnapshot: snapshot,
    runtimeManifest: (canonicalResult as unknown as { runtimeManifest?: unknown })
      .runtimeManifest ?? null,
    playground:
      (canonicalResult as unknown as { playground?: PlaygroundState | null })
        .playground ?? input.current.playground ?? null,
    readinessReport: gate
      ? ({ gate } as Record<string, unknown>)
      : ({} as Record<string, unknown>),
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
  return {
    selections: input.options?.selections,
    playground: input.current.playground,
    existingVfsFiles: workingFiles,
    businessName: input.options?.businessName,
    industry: input.options?.industry,
    selectedTemplateId: input.options?.selectedTemplateId,
    selectedThemeId: input.options?.selectedThemeId,
    themePresetId: input.options?.themePresetId,
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

async function finalize(args: {
  input: CommitMutationInput;
  status: 'committed' | 'rejected';
  vfsFiles: Record<string, string>;
  siteBundleSnapshot: unknown;
  runtimeManifest: unknown;
  playground: PlaygroundState | null;
  readinessReport: Record<string, unknown>;
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
    createdAt: String(row.created_at),
  };
}
