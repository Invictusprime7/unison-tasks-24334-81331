/**
 * Preview Runtime - Barrel Export
 * 
 * The intent-driven preview engine for Unison Tasks.
 * 
 * Architecture:
 * - PreviewRuntime: Top-level provider with HashRouter, CMS mock, overlays
 * - IntentLink: Replace <a href> with intent-driven navigation
 * - PreviewClickResolver: Global click handler for unflagged elements
 * - PreviewOverlays: Mock UI for cart, auth, booking, contact
 * - SandpackRuntimeWrapper: Generate Sandpack files from SiteBundle
 */

// Core runtime component
export { PreviewRuntime } from './PreviewRuntime';

// Hooks (from separate file for Fast Refresh)
export { usePreviewRuntime, usePreviewRuntimeSafe, usePreviewClickHandler } from './usePreviewRuntime';

// Context and types (from separate file for Fast Refresh)
export {
  PreviewRuntimeContext,
  type PreviewRuntimeContextValue,
  type PreviewRuntimeConfig,
  type PreviewMode,
  type CMSMockState,
  type OverlayState,
} from './PreviewRuntimeContext';

// Intent-driven components
export {
  IntentLink,
  NavLink,
  AnchorLink,
  ExternalLink,
  CTAButton,
  AddToCartButton,
  SignInButton,
  SignUpButton,
  BookNowButton,
  type IntentLinkProps,
} from './IntentLink';

// Overlay system
export { OverlayContainer } from './PreviewOverlays';

// Click resolver
export {
  PreviewClickResolver,
  getClickResolver,
  initClickResolver,
  generateClickHandlerScript,
  type ClickResolverConfig,
} from './PreviewClickResolver';

// Sandpack integration
export {
  generateSandpackFiles,
  type SandpackFilesConfig,
  type SandpackFile,
  type SandpackFiles,
} from './SandpackRuntimeWrapper';

// Sandpack Intent Bridge (button handler system)
export {
  SandpackIntentBridge,
  getSandpackIntentBridge,
  initSandpackIntentBridge,
  generateSandpackIntentScript,
  generateIntentStyles,
  BUTTON_INTENT_PATTERNS,
  type ButtonIntentConfig,
  type ButtonIntentCategory,
  type ResolvedButtonIntent,
  type IntentBridgeConfig,
} from './SandpackIntentBridge';
