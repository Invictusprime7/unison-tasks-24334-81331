/**
 * componentCapabilities — Step 8 of the capability plan.
 *
 * Components declare which business capabilities they depend on, which live
 * data source feeds them and which slots they expose. This turns "does this
 * section have a real backend?" from a guess into a lookup, and it is derived
 * from the pack contracts themselves so the two can never drift.
 *
 * Consumers:
 *   - readiness chips / publish gate → a section whose capability is a stub
 *     must never ship as if it were live,
 *   - AI Builder → knows which capability a requested section implies,
 *   - hydration planning → maps a rendered component to its data source.
 */

import { CAPABILITY_PACKS, type CapabilityPack } from './capabilityPacks';
import type { BusinessCapability } from './capabilityRegistry';

export interface ComponentCapabilityDeclaration {
  component: string;
  /** Capabilities that must be live for the component to render real data. */
  requiredCapabilities: BusinessCapability[];
  /** Runtime data sources the component reads (e.g. `catalog.services`). */
  dataSources: string[];
  /** Bindable slots the component exposes. */
  slots: string[];
  /** True when the component still renders meaningfully with no backend. */
  degradesGracefully: boolean;
}

/**
 * Presentational shells that legitimately render without any backend data.
 * Everything else is treated as data-backed and gated on its capability.
 */
const PRESENTATIONAL_COMPONENTS = new Set([
  'SiteNavbar',
  'SiteFooter',
  'BusinessProfileGate',
  'HeroSection',
  'AboutSection',
  'CTASection',
]);

function slotPrefix(component: string): string {
  return component
    .replace(/Section$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function buildRegistry(): Map<string, ComponentCapabilityDeclaration> {
  const registry = new Map<string, ComponentCapabilityDeclaration>();

  const upsert = (component: string, pack: CapabilityPack) => {
    const existing = registry.get(component);
    const prefix = slotPrefix(component);
    const slots = pack.frontend.slots.filter((slot) => slot.startsWith(prefix));

    if (existing) {
      for (const capability of [pack.id, ...pack.provides]) {
        if (!existing.requiredCapabilities.includes(capability)) {
          existing.requiredCapabilities.push(capability);
        }
      }
      for (const source of pack.frontend.dataSources) {
        if (!existing.dataSources.includes(source)) existing.dataSources.push(source);
      }
      for (const slot of slots.length > 0 ? slots : pack.frontend.slots) {
        if (!existing.slots.includes(slot)) existing.slots.push(slot);
      }
      return;
    }

    registry.set(component, {
      component,
      requiredCapabilities: [pack.id],
      dataSources: [...pack.frontend.dataSources],
      slots: slots.length > 0 ? slots : [...pack.frontend.slots],
      degradesGracefully: PRESENTATIONAL_COMPONENTS.has(component),
    });
  };

  for (const pack of CAPABILITY_PACKS) {
    for (const component of pack.frontend.components) upsert(component, pack);
  }

  return registry;
}

const REGISTRY = buildRegistry();

export const COMPONENT_CAPABILITIES: ComponentCapabilityDeclaration[] = [...REGISTRY.values()];

/** Declaration for a component name, or null when it is purely presentational. */
export function declarationFor(component: string): ComponentCapabilityDeclaration | null {
  return REGISTRY.get(component) ?? null;
}

/** Components that a capability powers — the inverse lookup. */
export function componentsForCapability(capability: BusinessCapability): string[] {
  return COMPONENT_CAPABILITIES
    .filter((d) => d.requiredCapabilities.includes(capability))
    .map((d) => d.component);
}

const COMPONENT_NAME_RE = /\b([A-Z][A-Za-z0-9]{2,})\b/g;

/**
 * Scans a file map for declared components and returns the union of the
 * capabilities they require. Used to answer "what backend does this site
 * actually need?" without trusting a prompt.
 */
export function capabilitiesRequiredByFiles(
  files: Record<string, string>,
): { capabilities: BusinessCapability[]; components: string[] } {
  const components = new Set<string>();

  for (const [path, content] of Object.entries(files)) {
    if (!/\.(tsx|jsx)$/i.test(path) || typeof content !== 'string') continue;
    for (const match of content.matchAll(COMPONENT_NAME_RE)) {
      const name = match[1];
      if (REGISTRY.has(name)) components.add(name);
    }
    const base = (path.split('/').pop() ?? '').replace(/\.[a-z]+$/i, '');
    if (REGISTRY.has(base)) components.add(base);
  }

  const capabilities = new Set<BusinessCapability>();
  for (const component of components) {
    const declaration = REGISTRY.get(component);
    declaration?.requiredCapabilities.forEach((c) => capabilities.add(c));
  }

  return { capabilities: [...capabilities], components: [...components] };
}

/**
 * Components rendered by the site whose capability is not live. These are the
 * exact surfaces that would ship as decoration instead of a working system.
 */
export function stubbedComponents(
  files: Record<string, string>,
  liveCapabilities: BusinessCapability[],
): Array<{ component: string; missing: BusinessCapability[] }> {
  const live = new Set(liveCapabilities);
  const { components } = capabilitiesRequiredByFiles(files);
  const result: Array<{ component: string; missing: BusinessCapability[] }> = [];

  for (const component of components) {
    const declaration = REGISTRY.get(component);
    if (!declaration || declaration.degradesGracefully) continue;
    const missing = declaration.requiredCapabilities.filter((c) => !live.has(c));
    if (missing.length > 0) result.push({ component, missing });
  }

  return result;
}
