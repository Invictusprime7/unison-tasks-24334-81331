/**
 * NOTE (2026-07-17 rebase):
 * The interaction-enrichment layer was removed. Last week's working pipeline
 * did not ship a baseline motion runtime; auto-injecting <UnisonInteractionRuntime />
 * and a canonical hover/reveal/stagger manifest was flattening free-styled
 * compositions produced by Lane A/B.
 *
 * This module now exports API-compatible **no-op stubs** so downstream code
 * (canonicalLaunchVfs, canonicalPipeline, commitToPipeline, playground types,
 * SystemLauncher, runtimeManifest) continues to compile without churn.
 *
 * If Framer Motion or other interactions are desired, the AI is free to author
 * them directly into page bodies during Lane A/B.
 */

import type { TemplateLayoutContract } from './templateLayoutContract';

export type WizardInteractionEffect =
  | 'hover-lift'
  | 'hover-glow'
  | 'reveal'
  | 'stagger-reveal'
  | 'click-feedback';

export type WizardInteractionTargetKind = 'template-root' | 'interactive' | 'intent';

export interface WizardInteractionRule {
  target: { kind: WizardInteractionTargetKind; value?: string };
  effect: WizardInteractionEffect;
}

export interface WizardInteractionManifest {
  version: '1.0';
  source: 'baseline' | 'ai';
  templateId: string;
  layoutSignature: string;
  industry: string;
  interactions: WizardInteractionRule[];
}

/** No-op: returns an empty baseline manifest tagged to the current contract. */
export function createBaselineInteractionManifest(
  _files: Record<string, string>,
  contract: TemplateLayoutContract,
): WizardInteractionManifest {
  return {
    version: '1.0',
    source: 'baseline',
    templateId: contract.templateId,
    layoutSignature: contract.signature,
    industry: contract.industry,
    interactions: [],
  };
}

/** No-op: ignores planner payload, returns the fallback unchanged. */
export function parseWizardInteractionManifest(
  _payload: unknown,
  fallback: WizardInteractionManifest,
): WizardInteractionManifest {
  return fallback;
}

/** No-op: enrichment layer removed. Kept for callers that still request a prompt string. */
export function buildWizardInteractionPlannerPrompt(_args: {
  contract: TemplateLayoutContract;
  industry: string;
  intents: string[];
}): string {
  return '';
}

/**
 * No-op passthrough. Does NOT write /src/components/UnisonInteractionRuntime.tsx,
 * does NOT inject <UnisonInteractionRuntime /> into page bodies, and does NOT
 * emit /.unison/interaction-manifest.json.
 */
export function compileWizardInteractionManifest(
  files: Record<string, string>,
  _manifest: WizardInteractionManifest,
): { files: Record<string, string>; mountedPages: string[] } {
  return { files: { ...files }, mountedPages: [] };
}

/** No-op: no durable manifest to read. */
export function readWizardInteractionManifest(
  _files: Record<string, string>,
): WizardInteractionManifest | null {
  return null;
}

/** Canonical finalization hook — now a passthrough. */
export function applyCanonicalInteractionEnrichment(
  files: Record<string, string>,
  _manifest?: WizardInteractionManifest | null,
): { files: Record<string, string>; manifest: WizardInteractionManifest | null; mountedPages: string[] } {
  return { files, manifest: null, mountedPages: [] };
}
