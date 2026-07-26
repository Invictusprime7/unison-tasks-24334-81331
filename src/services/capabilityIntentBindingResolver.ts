import type { CapabilityIntentBinding } from '@/services/businessCapabilityPlanner';

export interface ResolvedCapabilityIntentBinding {
  symbolicTarget: string;
  filePath: string;
  slot: string;
  intent: string;
}

export interface CapabilityIntentBindingResolution {
  resolved: ResolvedCapabilityIntentBinding[];
  files: Record<string, string>;
  unresolved: CapabilityIntentBinding[];
}

function replaceIntent(openingTag: string, intent: string): string {
  if (/\bdata-ut-intent\s*=/.test(openingTag)) {
    return openingTag.replace(/\bdata-ut-intent\s*=\s*(?:"[^"]*"|'[^']*'|\{\s*"[^"]*"\s*\}|\{\s*'[^']*'\s*\})/, `data-ut-intent="${intent}"`);
  }
  return openingTag.replace(/\s*(\/?>)$/, ` data-ut-intent="${intent}"$1`);
}

function resolveInFile(
  filePath: string,
  source: string,
  binding: CapabilityIntentBinding,
): { source: string; resolved: ResolvedCapabilityIntentBinding } | null {
  const slotPattern = new RegExp(`<[^>]*\\bdata-ut-slot=["']${binding.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
  const existingSlot = source.match(slotPattern);
  if (existingSlot?.index !== undefined) {
    const nextTag = replaceIntent(existingSlot[0], binding.intent);
    return {
      source: source.slice(0, existingSlot.index) + nextTag + source.slice(existingSlot.index + existingSlot[0].length),
      resolved: { symbolicTarget: binding.target, filePath, slot: binding.target, intent: binding.intent },
    };
  }

  if (binding.target !== 'service-card.primary-action' || !/(service|treatment)/i.test(filePath + source)) {
    return null;
  }

  const actionPattern = /<(?:button|a)\b[^>]*?(?:data-ut-cta=["']cta\.primary["']|className?=[^>]*?(?:button|btn|cta))[^>]*>/i;
  const action = source.match(actionPattern);
  if (!action?.[0] || action.index === undefined) return null;
  const slottedTag = replaceIntent(action[0], binding.intent)
    .replace(/\s*(\/?>)$/, ` data-ut-slot="${binding.target}"$1`);
  return {
    source: source.slice(0, action.index) + slottedTag + source.slice(action.index + action[0].length),
    resolved: { symbolicTarget: binding.target, filePath, slot: binding.target, intent: binding.intent },
  };
}

/**
 * Resolves symbolic business-plan targets to stable VFS slots. Any unresolved
 * target remains explicit so callers can block approval rather than install an
 * unbound backend capability.
 */
export function resolveCapabilityIntentBindings(
  bindings: CapabilityIntentBinding[],
  vfsFiles: Record<string, string>,
): CapabilityIntentBindingResolution {
  const files = { ...vfsFiles };
  const resolved: ResolvedCapabilityIntentBinding[] = [];
  const unresolved: CapabilityIntentBinding[] = [];

  for (const binding of bindings) {
    let result: ReturnType<typeof resolveInFile> = null;
    for (const [filePath, source] of Object.entries(files)) {
      result = resolveInFile(filePath, source, binding);
      if (result) {
        files[filePath] = result.source;
        resolved.push(result.resolved);
        break;
      }
    }
    if (!result) unresolved.push(binding);
  }

  return { resolved, files, unresolved };
}