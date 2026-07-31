import {
  getCanonicalComponentDefinition,
  type CanonicalComponentDefinition,
} from '@/services/canonicalComponentRegistry';
import type { CreatorComponentInstance } from '@/types/creatorData';

export interface ComponentRuntimeContract {
  instanceId: string;
  componentSlug: string;
  usedOnPages: string[];
  requiredCapabilities: string[];
  catalogSurfaces: string[];
  writeIntent: string | null;
  slotBindings: string[];
  status: 'ready' | 'blocked';
  blockers: string[];
}

/**
 * Produces a runtime record for page-bound and page-less components alike.
 * The compiler can persist this before a component is rendered by a route.
 */
export function resolveComponentRuntimeContract(
  instance: Pick<CreatorComponentInstance, 'instanceId' | 'componentSlug' | 'usedOnPages' | 'bindings'>,
  enabledCapabilities: readonly string[],
): ComponentRuntimeContract | null {
  const definition = getCanonicalComponentDefinition(instance.componentSlug);
  if (!definition) return null;
  const enabled = new Set(enabledCapabilities);
  const blockers = definition.requiredCapabilities
    .filter((capability) => !enabled.has(capability))
    .map((capability) => `Missing required capability: ${capability}.`);
  const missingBindings = definition.requiredBindingKeys
    .filter((binding) => !instance.bindings?.[binding])
    .map((binding) => `Missing component binding: ${binding}.`);

  return toRuntimeContract(definition, instance, [...blockers, ...missingBindings]);
}

function toRuntimeContract(
  definition: CanonicalComponentDefinition,
  instance: Pick<CreatorComponentInstance, 'instanceId' | 'componentSlug' | 'usedOnPages'>,
  blockers: string[],
): ComponentRuntimeContract {
  return {
    instanceId: instance.instanceId,
    componentSlug: definition.slug,
    usedOnPages: [...(instance.usedOnPages || [])],
    requiredCapabilities: [...definition.requiredCapabilities],
    catalogSurfaces: [...(definition.catalogSurfaces || [])],
    writeIntent: definition.writeIntent || null,
    slotBindings: [...definition.slotBindings],
    status: blockers.length === 0 ? 'ready' : 'blocked',
    blockers,
  };
}