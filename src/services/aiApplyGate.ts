/**
 * aiApplyGate — Pass 3 of Canonical Preview + Durable Commit Enforcement.
 *
 * Routes AI Builder patch application through VFSCommitService so that
 * `commitMutation` is the single durable writer:
 *
 *   1. `dryRunAiCommit` runs commitMutation with dryRun=true + preview gate
 *      enforcement. If preflight / gates reject, the caller MUST NOT touch
 *      the working VFS. Returns structured blockers for UI surfacing.
 *
 *   2. `persistAiCommit` runs the real commit (writes site_revisions row)
 *      after the caller has mirrored the accepted files into the local VFS.
 *      Non-blocking readiness — commits still land when readiness is noisy —
 *      but preview gate must pass. Returns the revision id.
 *
 * Both helpers share BuilderIdentity resolution + snapshot forwarding so
 * WebBuilder callers stay lean and identical between desktop / mobile
 * mounts.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  commitMutation,
  CommitRejectedError,
  type CommitMutationResult,
  type PublishBlockerSummary,
} from '@/services/vfsCommitService';
import { legacyFilesToPatchPlan } from '@/types/patchPlan';
import type { BuilderIdentity } from '@/types/builderIdentity';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import type { PlaygroundState } from '@/platform/core/playground';

export interface AiCommitContext {
  businessId: string;
  projectId: string;
  draftId: string;
  revisionId?: string | null;
  sessionId?: string;
  beforeFiles: Record<string, string>;
  nextFiles: Record<string, string>;
  snapshotForPreflight?: SiteBundleSnapshot | null;
  /**
   * Canonical playground state. Required — `commitToPipeline` rejects every
   * non-wizard commit that arrives without it.
   */
  playground?: PlaygroundState | null;
  activePagePath: string;
}

export interface AiCommitDryRunOutcome {
  /** True when dry-run commit accepted the patch. */
  accepted: boolean;
  /** Preview / capability blockers when rejected. */
  blockers: PublishBlockerSummary[];
  /** Human-readable summary suitable for toast description. */
  rejectMessage?: string;
  /** Raw commit result (dry-run row NOT persisted). */
  commit?: CommitMutationResult;
}

async function resolveIdentity(ctx: AiCommitContext): Promise<BuilderIdentity | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    userId: user.id,
    businessId: ctx.businessId,
    projectId: ctx.projectId,
    draftId: ctx.draftId,
    revisionId: ctx.revisionId ?? null,
    sessionId: ctx.sessionId ?? `web-builder:${ctx.draftId}`,
  };
}

/**
 * Dry-run the AI patch through commitMutation. Preview gate is enforced;
 * readiness is advisory (matches AI Builder's edit granularity — a single
 * copy tweak should not be blocked because some other capability is stub).
 */
export async function dryRunAiCommit(ctx: AiCommitContext): Promise<AiCommitDryRunOutcome> {
  if (!ctx.businessId || !ctx.projectId || !ctx.draftId) {
    return {
      accepted: false,
      blockers: [{
        source: 'preview',
        code: 'missing-canonical-identity',
        message: 'AI editing requires canonical business, project, and draft identity.',
      }],
      rejectMessage: 'Canonical project identity is unavailable.',
    };
  }
  try {
    const identity = await resolveIdentity(ctx);
    if (!identity) {
      return {
        accepted: false,
        blockers: [{
          source: 'preview',
          code: 'missing-authenticated-identity',
          message: 'AI editing requires an authenticated canonical project session.',
        }],
        rejectMessage: 'Your project session is unavailable.',
      };
    }
    const patch = legacyFilesToPatchPlan(ctx.nextFiles, 'ai-builder');
    const commit = await commitMutation({
      source: 'ai-builder',
      identity,
      current: {
        vfsFiles: ctx.beforeFiles,
        siteBundleSnapshot: ctx.snapshotForPreflight ?? undefined,
        playground: ctx.playground ?? undefined,
        activePagePath: ctx.activePagePath,
      },
      patch,
      options: {
        dryRun: true,
        requirePreviewPass: true,
        requireReadinessPass: false,
        industry: ctx.snapshotForPreflight?.industry,
      },
    });
    return { accepted: true, blockers: [], commit };
  } catch (err) {
    if (err instanceof CommitRejectedError) {
      const blockers = err.result.publishBlockers;
      const previewBlockers = blockers.filter((b) => b.source === 'preview' || b.source === 'publishGate');
      return {
        accepted: false,
        blockers,
        rejectMessage: previewBlockers[0]?.message ?? err.message,
        commit: err.result,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      accepted: false,
      blockers: [{ source: 'preview', code: 'canonical-commit-gate-failed', message }],
      rejectMessage: message,
    };
  }
}

/**
 * Persist the AI patch as a real site_revisions row after the caller has
 * applied it to the working VFS. Returns the new revision id on success.
 */
export async function persistAiCommit(ctx: AiCommitContext): Promise<CommitMutationResult> {
  const identity = await resolveIdentity(ctx);
  if (!identity) {
    throw new Error('[aiApplyGate] authenticated canonical identity is unavailable');
  }
  const patch = legacyFilesToPatchPlan(ctx.nextFiles, 'ai-builder');
  return commitMutation({
    source: 'ai-builder',
    identity,
    current: {
      vfsFiles: ctx.beforeFiles,
      siteBundleSnapshot: ctx.snapshotForPreflight ?? undefined,
      playground: ctx.playground ?? undefined,
      activePagePath: ctx.activePagePath,
    },
    patch,
    options: {
      requirePreviewPass: true,
      requireReadinessPass: false,
      industry: ctx.snapshotForPreflight?.industry,
    },
  });
}
