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

// Compilation + gates (PreviewGate / PublishGate live here as isPreviewReady / isPublishReady)
export * from './contractCompiler';

// Runtime artifacts
export * from './runtimeManifest';
export * from './canonicalPipeline';

// Playground state model
export * from './playground';
