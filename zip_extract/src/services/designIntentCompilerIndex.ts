/**
 * Design Intent Compiler - Barrel Export
 * 
 * This module exports all components of the Design Intent Compiler system:
 * 
 * 1. Types (designSystem.ts)
 *    - Section types, variants, and definitions
 *    - MockupSpec schema for AI output
 *    - DesignTokens for theming
 *    - CompilerResult for compilation output
 * 
 * 2. Design Tokens (designTokens.ts)
 *    - DesignTokenManager for theme management
 *    - THEME_PRESETS (8 presets: light/dark × minimal/modern/bold/elegant/playful)
 *    - Color utilities (extraction, manipulation)
 * 
 * 3. Component Library (componentLibrary.ts)
 *    - Pre-built section templates with slots
 *    - Hero, Features, Testimonials, CTA, Navbar, Footer
 *    - Multiple variants per section type
 * 
 * 4. Design Intent Compiler (designIntentCompiler.ts)
 *    - Core compilation: MockupSpec → Scene
 *    - Prompt parsing and intent detection
 *    - Theme application and asset binding
 * 
 * 5. Patch Engine (scenePatchEngine.ts)
 *    - Immutable patch operations
 *    - Full undo/redo support
 *    - AI-driven batch updates
 * 
 * 6. Scene Exporter (sceneExporter.ts)
 *    - Scene → TSX export
 *    - Scene → HTML export
 *    - Tailwind class generation
 *    - Component extraction
 * 
 * 7. Design Studio Hook (useDesignStudio.ts)
 *    - Master integration hook
 *    - All actions and state in one API
 */

// Types
export type {
  SectionType,
  SectionVariant,
  SlotType,
  SlotDefinition,
  SectionContent,
  SectionStyle,
  SectionDefinition,
  DesignTokens,
  ThemeSpec,
  MockupSpec,
  ComponentDefinition,
  CompilerResult,
} from '@/types/designSystem';

// Design Tokens
export {
  DesignTokenManager,
  getTokenManager,
  THEME_PRESETS,
} from '@/services/designTokens';
export type { ThemePreset } from '@/services/designTokens';

// Component Library
export {
  ComponentLibraryImpl,
  getComponentLibrary,
} from '@/services/componentLibrary';

// Design Intent Compiler
export {
  DesignIntentCompiler,
  getCompiler,
} from '@/services/designIntentCompiler';

// Patch Engine
export {
  ScenePatchEngine,
  initPatchEngine,
  getPatchEngine,
  createPatchFromAIInstruction,
  parseAIEditsToPatches,
} from '@/services/scenePatchEngine';
export type {
  PatchOperation,
  NodeAddPatch,
  NodeRemovePatch,
  NodeUpdatePatch,
  NodeMovePatch,
  SlotBindPatch,
  StyleUpdatePatch,
  LayoutUpdatePatch,
  TextUpdatePatch,
  BulkUpdatePatch,
  AIEditInstruction,
} from '@/services/scenePatchEngine';

// Scene Exporter
export {
  SceneExporter,
  exportScene,
  exportToTSX,
  exportToHTML,
} from '@/services/sceneExporter';
export type {
  ExportOptions,
  ExportResult,
  ExportFile,
} from '@/services/sceneExporter';

// Design Studio Hook
export {
  useDesignStudio,
} from '@/hooks/useDesignStudio';
export type {
  DesignStudioState,
  DesignStudioActions,
  UseDesignStudioReturn,
} from '@/hooks/useDesignStudio';
