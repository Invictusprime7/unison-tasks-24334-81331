/**
 * Back-compat shim — the intent registry was relocated to the canonical
 * `@/platform/core` brainstem. New code should import from there directly:
 *
 *   import { INTENT_REGISTRY, getIntentDef } from '@/platform/core';
 *
 * This file is kept only so legacy `@/intents/registry` import paths keep
 * resolving during the migration window.
 */
export {
  INTENT_REGISTRY,
  resolveIntentName,
  isRegisteredIntent,
  getIntentDef,
  allIntentNames,
  activeIntentNames,
  intentsByNamespace,
  intentSurfaceRegistry,
  type IntentDef,
  type IntentNamespace,
  type IntentSurface,
  type IntentHandler,
  type IntentStatus,
} from '@/platform/core/intentSurfaceRegistry';
