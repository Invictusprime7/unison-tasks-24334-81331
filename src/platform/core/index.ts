/**
 * @platform/core — the Unison brainstem.
 *
 * Single canonical entry point for the platform's core contracts.
 * Every layer (Wizard, AI Builder, Playground, Preview, Publish) consumes
 * this surface; nothing else may construct these types independently.
 *
 * Pipeline:
 *   BusinessBlueprint
 *     → PlaygroundState
 *     → SiteBundleSnapshot
 *     → RuntimeManifest
 *     → VFS/Preview → IntentRuntime
 *
 * Gates: PreviewGate (isPreviewReady) and PublishGate (isPublishReady).
 */

// Identity / intent surface
export * from './coreIntents';

// Blueprint & capabilities
export * from './blueprintSchema';
export * from './capabilityRegistry';
export * from './routePolicy';
export * from './provisioningValidator';
export * from './intentNormalizer';

// Compilation + gates (PreviewGate / PublishGate live here as isPreviewReady / isPublishReady)
export * from './contractCompiler';
// First-class Gate objects (PR5). Re-export AFTER contractCompiler so the
// Gate object versions of isPreviewReady/isPublishReady win the slot —
// they're back-compat re-exports of the same underlying functions.
export {
  PreviewGate,
  PublishGate,
  GATES,
  evaluateAllGates,
  GateFailedError,
  type Gate,
  type GateVerdict,
  type GateReason,
  type GateKey,
} from './gates';

// Runtime artifacts
export * from './runtimeManifest';
export * from './canonicalPipeline';

// Playground state model
export * from './playground';

// Single legal mutation entry — Wizard, AI Builder, Playground edits, Republish.
export * from './commitToPipeline';

// Contract Guard — silent-retry-then-surface enforcement for AI patches.
export * from './contractGuard';
