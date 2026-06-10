/**
 * Wizard Intent Audit
 *
 * Pre-launch (wizard runtime) helpers that guarantee a freshly-launched site
 * has every industry-required intent wired BEFORE executeCanonicalPipeline
 * fires the first TSX file. The launcher invokes these against the topology
 * planner output + materialized PlaygroundState, then pre-bakes the results
 * into /.unison/*.json so TemplateRuntimeProvider and the AI Builder
 * Readiness card can read them on first paint.
 *
 * Three exported surfaces:
 *   - auditWizardIntentGap   → structured gap report (no I/O)
 *   - buildIntentBindingsFile → /.unison/intent-bindings.json contents
 *   - buildIntentSurfacesFile → /.unison/intent-surfaces.json contents
 */

import type {
  PlaygroundBinding,
  PlaygroundPageRole,
  PlaygroundState,
} from '@/platform/core/playground';
import type { GeneratedSitePlan } from '@/platform/core/siteTopologyPlanner';
import {
  getIndustryIntentProfile,
  type IndustryIntentProfile,
  type SlotCoord,
} from '@/platform/core/industryIntentProfiles';

// ----------------------------------------------------------------------------
// Audit
// ----------------------------------------------------------------------------

export interface IntentGap {
  /** Canonical intent name (e.g. 'booking.create'). */
  coreIntent: string;
  /** required | primary | secondary */
  level: 'required' | 'primary' | 'secondary';
  /** Whether any synthesize coordinate is reachable in the current topology. */
  synthesizable: boolean;
  /** First reachable slot coord (if any) — used to surface fix hints. */
  preferredSlot?: SlotCoord;
}

export interface WizardIntentAuditReport {
  industry: string | null;
  availablePageRoles: PlaygroundPageRole[];
  boundIntents: string[];
  satisfied: string[];
  missing: IntentGap[];
  forbiddenLeaked: string[];
  /** True iff every required intent has either a binding or a reachable synth slot. */
  publishReadyByAudit: boolean;
}

export interface AuditInput {
  sitePlan: GeneratedSitePlan | null | undefined;
  state: PlaygroundState;
  industryOverlay?: string | null;
}

export function auditWizardIntentGap(input: AuditInput): WizardIntentAuditReport {
  const profile: IndustryIntentProfile | undefined = input.industryOverlay
    ? getIndustryIntentProfile(input.industryOverlay)
    : undefined;

  const bindings: PlaygroundBinding[] = Object.values(input.state?.bindings || {});
  const boundIntents = bindings
    .map((b) => b.coreIntent)
    .filter((v): v is string => Boolean(v));

  const pageRoles = collectPageRoles(input.sitePlan, input.state);
  const availablePageRoles = Array.from(pageRoles) as PlaygroundPageRole[];

  if (!profile) {
    return {
      industry: input.industryOverlay || null,
      availablePageRoles,
      boundIntents,
      satisfied: boundIntents,
      missing: [],
      forbiddenLeaked: [],
      publishReadyByAudit: true,
    };
  }

  const satisfied: string[] = [];
  const missing: IntentGap[] = [];

  const allChecked: Array<{ name: string; level: IntentGap['level'] }> = [
    ...profile.required.map((n) => ({ name: n, level: 'required' as const })),
    ...profile.primary.map((n) => ({ name: n, level: 'primary' as const })),
    ...profile.secondary.map((n) => ({ name: n, level: 'secondary' as const })),
  ];

  for (const { name, level } of allChecked) {
    if (boundIntents.includes(name)) {
      satisfied.push(name);
      continue;
    }
    const spec = profile.intents?.[name];
    const reachable = (spec?.synthesize || []).find(
      (s) => !s.ifPageExists || pageRoles.has(s.pageRole),
    );
    missing.push({
      coreIntent: name,
      level,
      synthesizable: Boolean(reachable),
      preferredSlot: reachable,
    });
  }

  const forbiddenLeaked = bindings
    .filter((b) => b.coreIntent && profile.forbidden.includes(b.coreIntent as never))
    .map((b) => b.coreIntent as string);

  const requiredMissing = missing.filter(
    (m) => m.level === 'required' && !m.synthesizable,
  );

  return {
    industry: profile.industry,
    availablePageRoles,
    boundIntents,
    satisfied,
    missing,
    forbiddenLeaked,
    publishReadyByAudit: requiredMissing.length === 0 && forbiddenLeaked.length === 0,
  };
}

function collectPageRoles(
  plan: GeneratedSitePlan | null | undefined,
  state: PlaygroundState,
): Set<PlaygroundPageRole> {
  const out = new Set<PlaygroundPageRole>();
  for (const p of plan?.pages || []) {
    if (p?.role) out.add(p.role as PlaygroundPageRole);
  }
  for (const p of Object.values(state?.pageRegistry?.pages || {})) {
    const role = (p as { pageRole?: string; role?: string }).pageRole
      ?? (p as { role?: string }).role;
    if (role) out.add(role as PlaygroundPageRole);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Pre-baked /.unison/intent-bindings.json
// ----------------------------------------------------------------------------

export interface IntentBindingRow {
  bindingId: string;
  sourcePageId: string;
  sourceSection?: string;
  sourceSlot?: string;
  elementKey?: string;
  coreIntent?: string;
  uiAction?: string;
  targetType: string;
  targetId: string;
  label?: string;
  source: 'wizard' | 'ai' | 'manual';
  readiness?: string;
  requiredCapabilities?: string[];
}

export function buildIntentBindingsFile(state: PlaygroundState): {
  generatedAt: string;
  count: number;
  rows: IntentBindingRow[];
} {
  const rows: IntentBindingRow[] = Object.values(state?.bindings || {}).map((b) => ({
    bindingId: b.bindingId,
    sourcePageId: b.sourcePageId,
    sourceSection: b.sourceSection,
    sourceSlot: b.sourceSlot,
    elementKey: b.elementKey,
    coreIntent: b.coreIntent,
    uiAction: b.uiAction,
    targetType: b.targetType,
    targetId: b.targetId,
    label: b.sourceLabel,
    source: b.source,
    readiness: b.readiness,
    requiredCapabilities: b.requiredCapabilities,
  }));
  return { generatedAt: new Date().toISOString(), count: rows.length, rows };
}

// ----------------------------------------------------------------------------
// Pre-baked /.unison/intent-surfaces.json
// ----------------------------------------------------------------------------

export interface IntentSurfaceEntry {
  coreIntent: string;
  uiAction: 'navigate' | 'overlay' | 'state' | 'toast';
  surface: 'route' | 'overlay' | 'form' | 'external' | 'state';
  targetRef: string;
  /** Page route that owns the surface (when applicable). */
  ownerRoute?: string;
}

export function buildIntentSurfacesFile(
  state: PlaygroundState,
): {
  generatedAt: string;
  surfaces: IntentSurfaceEntry[];
  byIntent: Record<string, IntentSurfaceEntry>;
} {
  const surfaces: IntentSurfaceEntry[] = [];
  const seen = new Set<string>();
  const byIntent: Record<string, IntentSurfaceEntry> = {};

  for (const b of Object.values(state?.bindings || {})) {
    if (!b.coreIntent) continue;
    if (seen.has(b.coreIntent)) continue;
    const uiAction = (b.uiAction || inferUiAction(b.targetType)) as IntentSurfaceEntry['uiAction'];
    const entry: IntentSurfaceEntry = {
      coreIntent: b.coreIntent,
      uiAction,
      surface: surfaceFor(b.targetType, uiAction),
      targetRef: b.targetId,
      ownerRoute: lookupRoute(state, b.sourcePageId),
    };
    surfaces.push(entry);
    byIntent[b.coreIntent] = entry;
    seen.add(b.coreIntent);
  }

  return { generatedAt: new Date().toISOString(), surfaces, byIntent };
}

function inferUiAction(targetType: string): IntentSurfaceEntry['uiAction'] {
  switch (targetType) {
    case 'calendar':
    case 'popup':
    case 'form':
      return 'overlay';
    case 'page':
    case 'funnel_step':
    case 'url':
      return 'navigate';
    default:
      return 'state';
  }
}

function surfaceFor(
  targetType: string,
  uiAction: IntentSurfaceEntry['uiAction'],
): IntentSurfaceEntry['surface'] {
  if (uiAction === 'overlay') return targetType === 'form' ? 'form' : 'overlay';
  if (targetType === 'url') return 'external';
  if (uiAction === 'navigate') return 'route';
  return 'state';
}

function lookupRoute(state: PlaygroundState, pageId: string): string | undefined {
  const page = state?.pageRegistry?.pages?.[pageId] as { path?: string } | undefined;
  return page?.path;
}
