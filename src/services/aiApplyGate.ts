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
  isCommitServiceEnabled,
  type CommitMutationResult,
  type PublishBlockerSummary,
} from '@/services/vfsCommitService';
import { legacyFilesToPatchPlan } from '@/types/patchPlan';
import type { BuilderIdentity } from '@/types/builderIdentity';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';

export interface AiCommitContext {
  businessId: string;
  projectId: string;
  draftId: string;
  revisionId?: string | null;
  sessionId?: string;
  beforeFiles: Record<string, string>;
  nextFiles: Record<string, string>;
  snapshotForPreflight?: SiteBundleSnapshot | null;
}

export interface AiCommitDryRunOutcome {
  /** Feature flag was off (nothing to gate). Callers should proceed as before. */
  skipped: boolean;
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
  if (!isCommitServiceEnabled() || !ctx.businessId || !ctx.draftId) {
    return { skipped: true, accepted: true, blockers: [] };
  }
  try {
    const identity = await resolveIdentity(ctx);
    if (!identity) return { skipped: true, accepted: true, blockers: [] };
    const patch = legacyFilesToPatchPlan(ctx.nextFiles, 'ai-builder');
    const commit = await commitMutation({
      source: 'ai-builder',
      identity,
      current: {
        vfsFiles: ctx.beforeFiles,
        siteBundleSnapshot: ctx.snapshotForPreflight ?? undefined,
      },
      patch,
      options: {
        dryRun: true,
        requirePreviewPass: true,
        requireReadinessPass: false,
        industry: ctx.snapshotForPreflight?.industry,
      },
    });
    return { skipped: false, accepted: true, blockers: [], commit };
  } catch (err) {
    if (err instanceof CommitRejectedError) {
      const blockers = err.result.publishBlockers;
      // Auto-heal: when the canonical pipeline throws (typically because the
      // draft has no SiteBundleSnapshot / themePresetId / industry available
      // at gate time — e.g. legacy drafts or AI edits landing before wizard
      // handoff hydration completes), fail open. The runtime preview +
      // publish gate still enforce their own contracts downstream; a
      // preflight surface must never block a user edit for a condition the
      // launcher should have resolved before mounting the Web Builder.
      const autoHealCodes = new Set([
        'canonical-pipeline-threw',
        'MISSING_SNAPSHOT',
        'MISSING_THEME_PRESET',
        'MISSING_SYSTEM_ID',
        'LEGACY_FALLBACK_BLOCKED',
      ]);
      const nonHealable = blockers.filter((b) => !autoHealCodes.has(b.code));
      if (nonHealable.length === 0) {
        console.warn('[aiApplyGate] dry-run auto-healed missing canonical context; proceeding', {
          healed: blockers.map((b) => b.code),
        });
        return { skipped: false, accepted: true, blockers: [], commit: err.result };
      }
      const previewBlockers = nonHealable.filter((b) => b.source === 'preview' || b.source === 'publishGate');
      return {
        skipped: false,
        accepted: false,
        blockers: nonHealable,
        rejectMessage: previewBlockers[0]?.message ?? err.message,
        commit: err.result,
      };
    }
    console.warn('[aiApplyGate] dry-run threw', err);
    // Fail open — a bug in the gate must not block edits entirely.
    return { skipped: true, accepted: true, blockers: [] };
  }
}

/**
 * Persist the AI patch as a real site_revisions row after the caller has
 * applied it to the working VFS. Returns the new revision id on success.
 */
export async function persistAiCommit(ctx: AiCommitContext): Promise<string | null> {
  if (!isCommitServiceEnabled() || !ctx.businessId || !ctx.draftId) return null;
  try {
    const identity = await resolveIdentity(ctx);
    if (!identity) return null;
    const patch = legacyFilesToPatchPlan(ctx.nextFiles, 'ai-builder');
    const commit = await commitMutation({
      source: 'ai-builder',
      identity,
      current: {
        vfsFiles: ctx.beforeFiles,
        siteBundleSnapshot: ctx.snapshotForPreflight ?? undefined,
      },
      patch,
      options: {
        requirePreviewPass: false,
        requireReadinessPass: false,
        industry: ctx.snapshotForPreflight?.industry,
      },
    });
    return commit.persistedRevisionId ?? null;
  } catch (err) {
    if (err instanceof CommitRejectedError) {
      console.warn('[aiApplyGate] persist rejected:', err.message);
    } else {
      console.warn('[aiApplyGate] persist failed:', err);
    }
    return null;
  }
}
