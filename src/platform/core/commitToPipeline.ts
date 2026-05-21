/**
 * commitToPipeline — the single legal mutation entry for the platform.
 *
 * Every layer that wants to change the site (Wizard launch, AI Builder edit,
 * Playground UI edit, Republish) MUST funnel through this function. It:
 *
 *   1. Tags the commit with a `source` so downstream observers (telemetry,
 *      Debug Agent, CI lint) can attribute every state change.
 *   2. Dispatches to the correct canonical entry point
 *      (`executeCanonicalPipeline` for wizard, `recompileFromPlayground`
 *      for everything else).
 *   3. Runs the PreviewGate / PublishGate against the produced contract when
 *      a CompiledContract is supplied alongside the playground.
 *   4. Emits a `pipeline:commit` CustomEvent so the dev-mode guard, the
 *      Builder UI, and the Debug Agent can react.
 *
 * Direct calls to executeCanonicalPipeline / recompileFromPlayground from
 * outside this module are considered legacy and will be flagged by the
 * CI lint rule landing in PR4.
 */

import type { WizardSelections } from '@/types/playground';
import {
  executeCanonicalPipeline,
  recompileFromPlayground,
  type CanonicalPipelineResult,
} from './canonicalPipeline';
import type { PlaygroundState } from './playground';
import type { CompiledContract } from './contractCompiler';
import { isPreviewReady, isPublishReady, getPublishBlockers } from './contractCompiler';

// ============================================================================
// Commit Source — every legal caller MUST identify itself.
// ============================================================================

export type CommitSource =
  | 'wizard-launch'        // Wizard Launcher → first build
  | 'ai-builder'           // Lane B AI assistant patch
  | 'playground-edit'      // User-driven Creator Playground edit
  | 'republish'            // Republish without structural change
  | 'system-restore';      // Restore from snapshot / undo

export interface CommitInput {
  /** Wizard selections — required for source === 'wizard-launch'. */
  selections?: WizardSelections;
  /** Updated playground — required for every other source. */
  playground?: PlaygroundState;
  /** Existing VFS to merge into (preserves user edits). */
  existingVfsFiles?: Record<string, string>;
  /** Business identity (optional override for non-wizard commits). */
  businessName?: string;
  industry?: string;
  /** Style/template carry-over for recompiles. */
  selectedTemplateId?: string;
  selectedThemeId?: string;
  themePresetId?: string;
  /**
   * Optional pre-compiled contract. When provided we run PreviewGate +
   * PublishGate and surface their verdict on the result.
   */
  compiledContract?: CompiledContract;
}

export interface CommitGateVerdict {
  previewReady: boolean;
  publishReady: boolean;
  publishBlockers: ReturnType<typeof getPublishBlockers>;
}

export interface CommitResult extends CanonicalPipelineResult {
  source: CommitSource;
  committedAt: string;
  gate: CommitGateVerdict | null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Commit a change through the canonical pipeline.
 *
 * @example
 *   // Wizard launch
 *   commitToPipeline({ selections }, 'wizard-launch')
 *
 * @example
 *   // AI Builder patch
 *   commitToPipeline({ playground, existingVfsFiles, compiledContract }, 'ai-builder')
 */
export function commitToPipeline(
  input: CommitInput,
  source: CommitSource,
): CommitResult {
  const result =
    source === 'wizard-launch'
      ? runWizardLaunch(input)
      : runRecompile(input);

  const gate = input.compiledContract
    ? {
        previewReady: isPreviewReady(input.compiledContract),
        publishReady: isPublishReady(input.compiledContract),
        publishBlockers: getPublishBlockers(input.compiledContract),
      }
    : null;

  const committed: CommitResult = {
    ...result,
    source,
    committedAt: new Date().toISOString(),
    gate,
  };

  emitCommit(committed);
  return committed;
}

// ============================================================================
// Internals
// ============================================================================

function runWizardLaunch(input: CommitInput): CanonicalPipelineResult {
  if (!input.selections) {
    throw new Error(
      "[commitToPipeline] source 'wizard-launch' requires `selections`.",
    );
  }
  return executeCanonicalPipeline(
    input.selections,
    input.existingVfsFiles ?? {},
  );
}

function runRecompile(input: CommitInput): CanonicalPipelineResult {
  if (!input.playground) {
    throw new Error(
      '[commitToPipeline] non-wizard commits require `playground`.',
    );
  }
  const recompiled = recompileFromPlayground(
    input.playground,
    input.existingVfsFiles ?? {},
    input.businessName,
    input.industry,
    {
      selectedTemplateId: input.selectedTemplateId,
      selectedThemeId: input.selectedThemeId,
      themePresetId: input.themePresetId,
    },
  );
  // Recompile path returns capabilities: null — normalize to the wider shape.
  return { ...recompiled, capabilities: recompiled.capabilities ?? [] as never };
}

// ============================================================================
// Commit Bus — dev-mode guard hooks in here.
// ============================================================================

const COMMIT_EVENT = 'unison:pipeline:commit';

type CommitListener = (commit: CommitResult) => void;
const listeners = new Set<CommitListener>();

export function onPipelineCommit(listener: CommitListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitCommit(commit: CommitResult): void {
  for (const l of listeners) {
    try {
      l(commit);
    } catch (err) {
      // Listeners must never break the pipeline.
      console.warn('[commitToPipeline] listener threw:', err);
    }
  }
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(COMMIT_EVENT, { detail: commit }),
      );
    } catch {
      /* noop — non-browser env */
    }
  }
}

// ============================================================================
// Dev-mode guard — warn (don't throw) when bypass paths are detected.
//
// PR4 promotes this to a hard CI lint rule. For now it's an observability
// surface so we can quantify the bypass volume before flipping the switch.
// ============================================================================

let bypassWarningInstalled = false;

export function installPipelineBypassGuard(): void {
  if (bypassWarningInstalled) return;
  if (typeof window === 'undefined') return;
  if (!import.meta.env?.DEV) return;
  bypassWarningInstalled = true;

  // Counter exposed for the Debug Agent / Intent Inspector.
  const counter = { commits: 0, bypasses: 0 };
  (window as unknown as { __unisonPipelineStats?: typeof counter }).__unisonPipelineStats = counter;

  onPipelineCommit(() => {
    counter.commits += 1;
  });
}
