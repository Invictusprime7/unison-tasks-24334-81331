/**
 * intentSurfaceRegistry — canonical re-export of the intent registry surface.
 *
 * Unifies handler + surface taxonomy under the @/platform/core brainstem so
 * downstream consumers can import the registry alongside coreIntents,
 * gates, capabilities, etc. from a single location.
 *
 * src/intents/registry.ts remains the single source of truth for adding new
 * intents; this file exposes that same surface under a stable namespace.
 */

export {
  INTENT_REGISTRY,
  resolveIntentName,
  isRegisteredIntent,
  getIntentDef,
  allIntentNames,
  activeIntentNames,
  intentsByNamespace,
  type IntentDef,
  type IntentNamespace,
  type IntentSurface,
  type IntentHandler,
  type IntentStatus,
} from '@/intents/registry';

// Convenience alias — lets consumers spell the import as the namespace name.
export { INTENT_REGISTRY as intentSurfaceRegistry } from '@/intents/registry';
