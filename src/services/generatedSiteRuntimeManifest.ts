import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import { getIntentDef, type IntentHandler, type IntentSurface } from '@/platform/core/intentSurfaceRegistry';
import {
  resolveSlotBindings,
  type ResolvedSlotBinding,
  type SectionType,
  type SlotRole,
} from '@/platform/core/slotBindingPolicy';
import type { CapabilityId } from '@/platform/core/capabilityRegistry';
import { resolveComponentRuntimeContract, type ComponentRuntimeContract } from '@/services/componentRuntimeContract';
import type { CreatorComponentInstance } from '@/types/creatorData';

export const GENERATED_SITE_RUNTIME_MANIFEST_VERSION = '1.0' as const;

export interface GeneratedRuntimeSlotBinding {
  slot: SlotRole;
  intent: string | null;
  source: 'slot-policy' | 'component-contract' | 'unresolved';
  section: SectionType | null;
  policyIntent: string | null;
  status: 'ready' | 'blocked';
  blockers: string[];
}

export interface GeneratedRuntimeComponentContract extends ComponentRuntimeContract {
  bindings: Record<string, string>;
  pageLess: boolean;
  slots: GeneratedRuntimeSlotBinding[];
}

export interface GeneratedRuntimeIntent {
  intent: string;
  handler: IntentHandler;
  surface: IntentSurface;
  requiredCapabilities: CapabilityId[];
  componentIds: string[];
}

/**
 * The persisted contract consumed by both Preview and published-site adapters.
 * It is intentionally transport-agnostic: it authorizes what a component may
 * read or dispatch without teaching generated UI how an adapter is implemented.
 */
export interface GeneratedSiteRuntimeManifest {
  version: typeof GENERATED_SITE_RUNTIME_MANIFEST_VERSION;
  siteId: string | null;
  snapshotId: string | null;
  enabledCapabilities: CapabilityId[];
  components: GeneratedRuntimeComponentContract[];
  reads: string[];
  intents: GeneratedRuntimeIntent[];
  readiness: {
    status: 'ready' | 'blocked';
    blockers: string[];
  };
  generatedAt: string;
}

export interface CompileGeneratedSiteRuntimeManifestInput {
  siteId?: string | null;
  snapshot?: Pick<SiteBundleSnapshot, 'snapshotId' | 'componentInstances'> | null;
  enabledCapabilities?: readonly CapabilityId[];
  generatedAt?: string;
}

function inferSection(instance: CreatorComponentInstance): SectionType | null {
  const candidate = instance.bindings?.sectionType || instance.props?.sectionType;
  const allowed: readonly SectionType[] = [
    'navbar', 'hero', 'services', 'pricing', 'testimonials', 'gallery', 'about', 'contact',
    'cta', 'footer', 'faq', 'stats', 'team', 'blog', 'features', 'shop-grid', 'cart',
    'checkout', 'product-detail',
  ];
  return typeof candidate === 'string' && allowed.includes(candidate as SectionType)
    ? candidate as SectionType
    : null;
}

function matchingPolicyBinding(
  bindings: ResolvedSlotBinding[],
  section: SectionType | null,
  slot: SlotRole,
): ResolvedSlotBinding | undefined {
  if (section) {
    return bindings.find((binding) => binding.section === section && binding.slot === slot);
  }
  return bindings.find((binding) => binding.slot === slot);
}

function resolveComponentSlots(
  contract: ComponentRuntimeContract,
  instance: CreatorComponentInstance,
  enabledCapabilities: CapabilityId[],
): GeneratedRuntimeSlotBinding[] {
  const policy = resolveSlotBindings(enabledCapabilities);
  const section = inferSection(instance);

  return contract.slotBindings.map((slot) => {
    const policyBinding = matchingPolicyBinding(policy.resolved, section, slot as SlotRole);
    const intent = contract.writeIntent || policyBinding?.intent || null;
    const intentDefinition = intent ? getIntentDef(intent) : null;
    const blockers: string[] = [];

    if (!intent) {
      blockers.push(`No runtime intent is resolved for slot: ${slot}.`);
    } else if (!intentDefinition) {
      blockers.push(`Slot intent is not registered: ${intent}.`);
    } else {
      for (const capability of intentDefinition.requiredCapabilities || []) {
        if (!enabledCapabilities.includes(capability)) {
          blockers.push(`Slot intent requires capability: ${capability}.`);
        }
      }
    }

    return {
      slot: slot as SlotRole,
      intent,
      source: contract.writeIntent
        ? 'component-contract'
        : policyBinding
          ? 'slot-policy'
          : 'unresolved',
      section: policyBinding?.section || section,
      policyIntent: policyBinding?.intent || null,
      status: blockers.length === 0 ? 'ready' : 'blocked',
      blockers,
    };
  });
}

function toComponentContract(
  instance: CreatorComponentInstance,
  enabledCapabilities: CapabilityId[],
): GeneratedRuntimeComponentContract {
  const contract = resolveComponentRuntimeContract(instance, enabledCapabilities);
  if (!contract) {
    return {
      instanceId: instance.instanceId,
      componentSlug: instance.componentSlug || instance.componentType,
      usedOnPages: [...(instance.usedOnPages || [])],
      bindings: { ...(instance.bindings || {}) },
      pageLess: (instance.usedOnPages || []).length === 0,
      requiredCapabilities: [],
      catalogSurfaces: [],
      writeIntent: null,
      slotBindings: [],
      slots: [],
      status: 'blocked',
      blockers: [`Component is not registered for runtime: ${instance.componentSlug || instance.componentType}.`],
    };
  }

  const slots = resolveComponentSlots(contract, instance, enabledCapabilities);
  const blockers = [...contract.blockers, ...slots.flatMap((slot) => slot.blockers)];
  return {
    ...contract,
    bindings: { ...(instance.bindings || {}) },
    pageLess: (instance.usedOnPages || []).length === 0,
    slots,
    status: blockers.length === 0 ? 'ready' : 'blocked',
    blockers,
  };
}

export function compileGeneratedSiteRuntimeManifest(
  input: CompileGeneratedSiteRuntimeManifestInput,
): GeneratedSiteRuntimeManifest {
  const enabledCapabilities = Array.from(new Set(input.enabledCapabilities || [])).sort();
  const components = Object.values(input.snapshot?.componentInstances || {})
    .map((instance) => toComponentContract(instance, enabledCapabilities));
  const reads = Array.from(new Set(components.flatMap((component) => component.catalogSurfaces))).sort();
  const intentsByName = new Map<string, GeneratedRuntimeIntent>();

  for (const component of components) {
    const componentIntents = new Set([
      component.writeIntent,
      ...component.slots.map((slot) => slot.intent),
    ]);
    for (const intent of componentIntents) {
      if (!intent) continue;
      const definition = getIntentDef(intent);
      if (!definition) continue;
      const existing = intentsByName.get(intent);
      if (existing) {
        existing.componentIds.push(component.instanceId);
      } else {
        intentsByName.set(intent, {
          intent,
          handler: definition.handler,
          surface: definition.surface,
          requiredCapabilities: [...(definition.requiredCapabilities || [])],
          componentIds: [component.instanceId],
        });
      }
    }
  }

  const blockers = components.flatMap((component) => component.blockers);
  return {
    version: GENERATED_SITE_RUNTIME_MANIFEST_VERSION,
    siteId: input.siteId || null,
    snapshotId: input.snapshot?.snapshotId || null,
    enabledCapabilities,
    components,
    reads,
    intents: Array.from(intentsByName.values()).sort((left, right) => left.intent.localeCompare(right.intent)),
    readiness: {
      status: blockers.length === 0 ? 'ready' : 'blocked',
      blockers,
    },
    generatedAt: input.generatedAt || new Date().toISOString(),
  };
}