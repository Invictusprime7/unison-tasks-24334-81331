/**
 * Builder Request Interpreter (client)
 *
 * Every AI Builder request routes through here BEFORE code generation.
 * Regex heuristics are demoted to advisory hints; the interpreter edge
 * function is the authoritative classifier. If the interpreter is
 * unavailable we degrade to the heuristic envelope rather than to the old
 * single-label keyword router.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  buildEnvelopeHints,
  heuristicEnvelope,
  normalizeEnvelope,
  type BuilderRequestEnvelope,
} from '@/types/builderRequestEnvelope';
import { matchAbstractGoals } from '@/platform/core/abstractGoalRegistry';

export interface InterpretContext {
  projectMode?: 'html' | 'react';
  runtimeEngine?: 'simple' | 'vfs' | 'worker';
  vertical?: string;
  capabilities?: string[];
  currentPageId?: string;
  selectedElement?: { selector?: string; sectionId?: string; blockId?: string } | null;
  filePaths?: string[];
  recentTurns?: Array<{ role: string; content: string }>;
  objective?: string;
  durableDecisions?: string[];
  hasExistingTemplate?: boolean;
}

export interface InterpretResult {
  envelope: BuilderRequestEnvelope;
  degraded: boolean;
  reason?: string;
}

/** Interpret a raw builder prompt into a BuilderRequestEnvelope. Never throws. */
export async function interpretBuilderRequest(
  prompt: string,
  ctx: InterpretContext = {},
): Promise<InterpretResult> {
  const hints = buildEnvelopeHints(prompt, {
    hasExistingTemplate: ctx.hasExistingTemplate,
    hasSelectedElement: Boolean(ctx.selectedElement),
  });

  const abstractGoals = matchAbstractGoals(prompt);
  if (abstractGoals.length) {
    hints.requestedCapabilities = Array.from(
      new Set(abstractGoals.flatMap((g) => g.capabilities ?? [])),
    );
  }

  try {
    const { data, error } = await supabase.functions.invoke('builder-request-interpreter', {
      body: {
        prompt,
        hints,
        context: {
          projectMode: ctx.projectMode,
          runtimeEngine: ctx.runtimeEngine,
          vertical: ctx.vertical,
          capabilities: ctx.capabilities,
          currentPageId: ctx.currentPageId,
          selectedElement: ctx.selectedElement ?? null,
          filePaths: ctx.filePaths,
          recentTurns: ctx.recentTurns,
          objective: ctx.objective,
          durableDecisions: ctx.durableDecisions,
        },
      },
    });

    if (error || !data?.envelope) {
      return {
        envelope: heuristicEnvelope(prompt, {
          hasExistingTemplate: ctx.hasExistingTemplate,
          hasSelectedElement: Boolean(ctx.selectedElement),
        }),
        degraded: true,
        reason: error?.message || data?.reason || 'no_envelope',
      };
    }

    const envelope = normalizeEnvelope(data.envelope, hints);
    return { envelope, degraded: false };
  } catch (err) {
    return {
      envelope: heuristicEnvelope(prompt, {
        hasExistingTemplate: ctx.hasExistingTemplate,
        hasSelectedElement: Boolean(ctx.selectedElement),
      }),
      degraded: true,
      reason: err instanceof Error ? err.message : 'invoke_failed',
    };
  }
}

// ============================================================================
// Envelope → legacy routing adapters
// ----------------------------------------------------------------------------
// The existing assistant still speaks `templateAction` / builder actions.
// These adapters derive those values FROM the envelope so classification has a
// single source of truth while the rest of the pipeline is migrated.
// ============================================================================

export type LegacyTemplateAction =
  | 'full-control'
  | 'add'
  | 'remove'
  | 'modify'
  | 'suggest'
  | 'restyle';

export function templateActionFromEnvelope(
  envelope: BuilderRequestEnvelope,
  hasExistingTemplate: boolean,
): LegacyTemplateAction | undefined {
  if (!hasExistingTemplate) return undefined;

  const kinds = envelope.requestKinds;
  const domains = envelope.domains;

  // Compound / program work, or anything touching backend + UI, needs the
  // full-control lane so no requirement gets dropped.
  if (
    envelope.complexity !== 'simple' ||
    envelope.executionMode === 'mixed' ||
    envelope.executionMode === 'planned_patch' ||
    kinds.includes('backend_configuration') ||
    kinds.includes('data_binding') ||
    domains.includes('commerce') ||
    envelope.scope.level === 'site'
  ) {
    return 'full-control';
  }

  if (kinds.includes('review') || kinds.includes('plan')) return 'suggest';
  if (kinds.includes('create')) return 'add';
  if (
    domains.includes('visual_design') &&
    !domains.includes('layout') &&
    !domains.includes('copy')
  ) {
    return 'restyle';
  }
  if (/\b(remove|delete|hide|get rid of|take out)\b/i.test(envelope.summary)) return 'remove';
  return 'modify';
}

/** Should the server run web research for this request? */
export function shouldResearch(envelope: BuilderRequestEnvelope): boolean {
  return envelope.needsExternalResearch === true;
}

/** Backend/destructive work must be proposed and approved, never auto-applied. */
export function requiresApproval(envelope: BuilderRequestEnvelope): boolean {
  return (
    envelope.needsApproval ||
    envelope.requestKinds.includes('backend_configuration') ||
    envelope.requestKinds.includes('deployment') ||
    envelope.domains.includes('database')
  );
}

/** Compact envelope brief for injection into downstream generation prompts. */
export function envelopeBrief(envelope: BuilderRequestEnvelope): string {
  const lines: string[] = [
    '=== INTERPRETED REQUEST (authoritative) ===',
    `Summary: ${envelope.summary}`,
    `Kinds: ${envelope.requestKinds.join(', ') || 'n/a'}`,
    `Domains: ${envelope.domains.join(', ') || 'n/a'}`,
    `Scope: ${envelope.scope.level}${envelope.scope.targets.length ? ` → ${envelope.scope.targets.join(', ')}` : ''}`,
    `Complexity: ${envelope.complexity} | Execution: ${envelope.executionMode} | Confidence: ${envelope.confidence.toFixed(2)}`,
  ];
  if (envelope.goals.length) {
    lines.push('Goals (ALL must be satisfied):');
    envelope.goals.forEach((g) => lines.push(`  - [${g.priority}] ${g.description}`));
  }
  if (envelope.constraints.length) {
    lines.push('Constraints (do not violate):');
    envelope.constraints.forEach((c) => lines.push(`  - ${c}`));
  }
  if (envelope.requestedCapabilities.length) {
    lines.push(`Implied capabilities: ${envelope.requestedCapabilities.join(', ')}`);
  }
  if (envelope.ambiguities.length) {
    lines.push(`Ambiguities to state explicitly: ${envelope.ambiguities.join('; ')}`);
  }
  return lines.join('\n');
}
