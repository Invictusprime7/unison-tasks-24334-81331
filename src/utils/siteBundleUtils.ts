/**
 * SiteBundle Utilities
 * 
 * Helper functions for creating, manipulating, and transforming SiteBundles.
 */

import { nanoid } from "nanoid";
import type {
  SiteBundle,
  SiteBundleVersion,
  SiteIdentity,
  BuildProvenance,
  BuildMode,
  BuildTraceEvent,
  BuildWarning,
  BuildError,
  BrandPrimitives,
  SiteManifest,
  PageBundle,
  PageSource,
  AssetBundle,
  IntentSystem,
  IntentDefinition,
  IntentBinding,
  AutomationSystem,
  AutomationInstall,
  IntegrationSystem,
  ProviderConfig,
  EntitlementSystem,
  PlanTier,
  RuntimeConfig,
  PreviewEngine,
  PublishInfo,
  AssetRef,
  NavItem,
  RouteDef,
  SiteBundleDiff,
  SiteBundleValidationResult,
  PartialSiteBundle,
  UTPMessage,
  HostInit,
  HostInitPayload,
  PreviewReady,
  PreviewReadyPayload,
  NavRequest,
  NavRequestPayload,
  NavCommit,
  NavCommitPayload,
  IntentExecute,
  IntentExecutePayload,
  IntentAck,
  IntentAckPayload,
  IntentResult,
  IntentResultPayload,
  OverlayOpen,
  OverlayClose,
  StatePatch,
  StatePatchOp,
  LogEvent,
  LogEventPayload,
  ProtocolError,
  ProtocolErrorPayload,
  IntentId,
  ClientAction,
} from "../types/siteBundle";
import { validateSiteBundle } from "../schemas/SiteBundle";

// ============================================================================
// Constants
// ============================================================================

export const CURRENT_BUNDLE_VERSION: SiteBundleVersion = "1.0.0";

export const DEFAULT_COLORS = {
  primary: "#3B82F6",
  secondary: "#10B981",
  accent: "#F59E0B",
  background: "#FFFFFF",
  foreground: "#1E293B",
  muted: "#64748B",
  danger: "#EF4444",
  success: "#22C55E",
  warning: "#F59E0B",
};

export const DEFAULT_PLAN_LIMITS: Record<PlanTier, Record<string, number>> = {
  free: {
    pages: 3,
    assets: 50,
    automations: 1,
    monthlyVisits: 1000,
    storage: 100, // MB
  },
  starter: {
    pages: 10,
    assets: 200,
    automations: 5,
    monthlyVisits: 10000,
    storage: 500,
  },
  pro: {
    pages: 50,
    assets: 1000,
    automations: 20,
    monthlyVisits: 100000,
    storage: 2000,
  },
  agency: {
    pages: 200,
    assets: 5000,
    automations: 100,
    monthlyVisits: 500000,
    storage: 10000,
  },
  enterprise: {
    pages: -1, // unlimited
    assets: -1,
    automations: -1,
    monthlyVisits: -1,
    storage: -1,
  },
};

export const DEFAULT_PLAN_FEATURES: Record<PlanTier, Record<string, boolean>> = {
  free: {
    customDomain: false,
    removeWatermark: false,
    analytics: false,
    seo: false,
    prioritySupport: false,
    teamMembers: false,
    apiAccess: false,
    whiteLabel: false,
  },
  starter: {
    customDomain: true,
    removeWatermark: true,
    analytics: true,
    seo: true,
    prioritySupport: false,
    teamMembers: false,
    apiAccess: false,
    whiteLabel: false,
  },
  pro: {
    customDomain: true,
    removeWatermark: true,
    analytics: true,
    seo: true,
    prioritySupport: true,
    teamMembers: true,
    apiAccess: true,
    whiteLabel: false,
  },
  agency: {
    customDomain: true,
    removeWatermark: true,
    analytics: true,
    seo: true,
    prioritySupport: true,
    teamMembers: true,
    apiAccess: true,
    whiteLabel: true,
  },
  enterprise: {
    customDomain: true,
    removeWatermark: true,
    analytics: true,
    seo: true,
    prioritySupport: true,
    teamMembers: true,
    apiAccess: true,
    whiteLabel: true,
  },
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a UTP message
 */
export function createUTPMessage<T extends string, P = unknown>(
  type: T,
  siteId: string,
  payload: P,
  pageId?: string
): UTPMessage<T, P> {
  return {
    protocol: "UTP/1",
    type,
    requestId: nanoid(),
    siteId,
    pageId,
    ts: Date.now(),
    payload,
  };
}

/**
 * Create a HostInit message (Host -> Preview)
 */
export function createHostInit(
  siteId: string,
  payload: HostInitPayload
): HostInit {
  return createUTPMessage("UTP/HOST_INIT", siteId, payload);
}

/**
 * Create a PreviewReady message (Preview -> Host)
 */
export function createPreviewReady(
  siteId: string,
  capabilities: PreviewReadyPayload["capabilities"]
): PreviewReady {
  return createUTPMessage("UTP/PREVIEW_READY", siteId, { capabilities });
}

/**
 * Create a NavRequest message (Preview -> Host)
 */
export function createNavRequest(
  siteId: string,
  to: string,
  reason: NavRequestPayload["reason"],
  pageId?: string
): NavRequest {
  return createUTPMessage("UTP/NAV_REQUEST", siteId, { to, reason }, pageId);
}

/**
 * Create a NavCommit message (Host -> Preview)
 */
export function createNavCommit(
  siteId: string,
  payload: NavCommitPayload
): NavCommit {
  return createUTPMessage("UTP/NAV_COMMIT", siteId, payload);
}

/**
 * Create an IntentExecute message (Preview -> Host)
 */
export function createIntentExecute(
  siteId: string,
  intentId: string,
  params: Record<string, unknown>,
  options?: {
    bindingId?: string;
    context?: IntentExecutePayload["context"];
    pageId?: string;
  }
): IntentExecute {
  return createUTPMessage(
    "UTP/INTENT_EXECUTE",
    siteId,
    {
      bindingId: options?.bindingId,
      intentId,
      params,
      context: options?.context,
    },
    options?.pageId
  );
}

/**
 * Create an IntentAck message (Host -> Preview)
 */
export function createIntentAck(
  siteId: string,
  accepted: boolean,
  reason?: string
): IntentAck {
  return createUTPMessage("UTP/INTENT_ACK", siteId, { accepted, reason });
}

/**
 * Create an IntentResult message (Host -> Preview)
 */
export function createIntentResult(
  siteId: string,
  intentId: string,
  ok: boolean,
  options?: {
    result?: unknown;
    clientActions?: ClientAction[];
    error?: { code: string; message: string };
  }
): IntentResult {
  return createUTPMessage("UTP/INTENT_RESULT", siteId, {
    ok,
    intentId,
    result: options?.result,
    clientActions: options?.clientActions,
    error: options?.error,
  });
}

/**
 * Create an OverlayOpen message
 */
export function createOverlayOpen(
  siteId: string,
  overlayId: string,
  data?: unknown
): OverlayOpen {
  return createUTPMessage("UTP/OVERLAY_OPEN", siteId, { overlayId, data });
}

/**
 * Create an OverlayClose message
 */
export function createOverlayClose(
  siteId: string,
  overlayId?: string
): OverlayClose {
  return createUTPMessage("UTP/OVERLAY_CLOSE", siteId, { overlayId });
}

/**
 * Create a StatePatch message
 */
export function createStatePatch(
  siteId: string,
  patch: StatePatchOp[]
): StatePatch {
  return createUTPMessage("UTP/STATE_PATCH", siteId, { patch });
}

/**
 * Create a LogEvent message
 */
export function createLogEvent(
  siteId: string,
  level: LogEventPayload["level"],
  event: string,
  data?: unknown
): LogEvent {
  return createUTPMessage("UTP/LOG_EVENT", siteId, { level, event, data });
}

/**
 * Create a ProtocolError message
 */
export function createProtocolError(
  siteId: string,
  code: string,
  message: string,
  data?: any
): ProtocolError {
  return createUTPMessage("UTP/ERROR", siteId, { code, message, data });
}

/**
 * Create a new SiteIdentity
 */
export function createSiteIdentity(
  businessId: string,
  ownerUserId: string,
  options?: Partial<SiteIdentity>
): SiteIdentity {
  const now = new Date().toISOString();
  return {
    siteId: nanoid(),
    businessId,
    ownerUserId,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    ...options,
  };
}

/**
 * Create a new BuildProvenance
 */
export function createBuildProvenance(
  buildMode: BuildMode,
  options?: Partial<BuildProvenance>
): BuildProvenance {
  return {
    buildId: nanoid(),
    buildMode,
    startedAt: new Date().toISOString(),
    trace: [],
    warnings: [],
    errors: [],
    ...options,
  };
}

/**
 * Create a build trace event
 */
export function createTraceEvent(
  stage: BuildTraceEvent["stage"],
  level: BuildTraceEvent["level"],
  message: string,
  data?: Record<string, unknown>
): BuildTraceEvent {
  return {
    ts: new Date().toISOString(),
    stage,
    level,
    message,
    data,
  };
}

/**
 * Create a build warning
 */
export function createBuildWarning(
  code: string,
  message: string,
  data?: unknown
): BuildWarning {
  return { code, message, data };
}

/**
 * Create a build error
 */
export function createBuildError(
  code: string,
  message: string,
  data?: unknown
): BuildError {
  return {
    code,
    message,
    data,
  };
}

/**
 * Create default brand primitives
 */
export function createDefaultBrand(name: string): BrandPrimitives {
  return {
    name,
    colors: { ...DEFAULT_COLORS },
    typography: {
      headingFont: "Inter",
      bodyFont: "Inter",
    },
    tone: "minimal",
    locale: "en-US",
  };
}

/**
 * Create a default site manifest
 */
export function createDefaultManifest(
  homePageId: string,
  siteName: string
): SiteManifest {
  return {
    routes: [
      {
        path: "/",
        pageId: homePageId,
        isHome: true,
      },
    ],
    nav: [
      {
        label: "Home",
        path: "/",
        pageId: homePageId,
      },
    ],
    layout: {
      header: "default",
      footer: "default",
    },
    metadata: {
      title: siteName,
    },
  };
}

/**
 * Create a page bundle
 */
export function createPageBundle(
  path: string,
  title: string,
  options?: Partial<PageBundle>
): PageBundle {
  return {
    pageId: nanoid(),
    path,
    title,
    source: options?.source ?? {
      kind: "html",
      content: "",
      contentHash: "",
    },
    output: options?.output ?? {},
    ...options,
  };
}

/**
 * Create a page source
 */
export function createPageSource(
  kind: PageSource["kind"],
  content: string
): PageSource {
  // Simple hash for content tracking
  const contentHash = btoa(content.slice(0, 100)).slice(0, 16);
  return {
    kind,
    content,
    contentHash,
  };
}

/**
 * Create an asset bundle from file metadata
 */
export function createAssetBundle(
  name: string,
  type: AssetBundle["type"],
  storage: AssetBundle["storage"],
  options?: { mimeType?: string; meta?: AssetBundle["meta"] }
): AssetBundle {
  return {
    assetId: nanoid(),
    type,
    name,
    mimeType: options?.mimeType ?? "application/octet-stream",
    storage,
    meta: options?.meta,
  };
}

/**
 * Create an intent definition
 */
export function createIntentDefinition(
  intentId: string,
  category: IntentDefinition["category"],
  description: string,
  handler: IntentDefinition["handler"]
): IntentDefinition {
  return {
    intentId,
    category,
    description,
    paramsSchema: { type: "object" },
    handler,
  };
}

/**
 * Create an intent binding
 */
export function createIntentBinding(
  pageId: string,
  target: IntentBinding["target"],
  intentId: string,
  params: Record<string, unknown> = {}
): IntentBinding {
  return {
    bindingId: nanoid(),
    pageId,
    target,
    intentId,
    params,
  };
}

/**
 * Create default intent system
 */
export function createDefaultIntentSystem(): IntentSystem {
  return {
    catalogVersion: new Date().toISOString().slice(0, 10),
    definitions: {},
    bindings: [],
  };
}

/**
 * Create default automation system
 */
export function createDefaultAutomationSystem(): AutomationSystem {
  return {
    installed: [],
    secretsRequired: [],
  };
}

/**
 * Create default integration system
 */
export function createDefaultIntegrationSystem(): IntegrationSystem {
  return {
    providers: [],
  };
}

/**
 * Create entitlements for a plan
 */
export function createEntitlements(plan: PlanTier): EntitlementSystem {
  return {
    plan,
    features: { ...DEFAULT_PLAN_FEATURES[plan] },
    limits: { ...DEFAULT_PLAN_LIMITS[plan] },
  };
}

/**
 * Create default runtime config
 */
export function createDefaultRuntimeConfig(
  homePageId: string
): RuntimeConfig {
  return {
    preferredEngine: "simple",
    enginesAllowed: ["simple", "vfs", "worker"],
    entry: {
      type: "react",
      pageId: homePageId,
    },
  };
}

/**
 * Create a new empty SiteBundle
 */
export function createEmptySiteBundle(
  businessId: string,
  ownerUserId: string,
  siteName: string,
  options?: {
    buildMode?: BuildMode;
    plan?: PlanTier;
  }
): SiteBundle {
  const homePageId = nanoid();
  const homePage = createPageBundle("/", "Home", {
    pageId: homePageId,
    source: createPageSource(
      "html",
      `<div class="hero"><h1>Welcome to ${siteName}</h1><p>Your new website</p></div>`
    ),
  });

  return {
    version: CURRENT_BUNDLE_VERSION,
    site: createSiteIdentity(businessId, ownerUserId),
    build: createBuildProvenance(options?.buildMode ?? "manual"),
    brand: createDefaultBrand(siteName),
    manifest: createDefaultManifest(homePageId, siteName),
    pages: {
      [homePageId]: homePage,
    },
    assets: {},
    intents: createDefaultIntentSystem(),
    automations: createDefaultAutomationSystem(),
    integrations: createDefaultIntegrationSystem(),
    entitlements: createEntitlements(options?.plan ?? "free"),
    runtime: createDefaultRuntimeConfig(homePageId),
  };
}

// ============================================================================
// Mutation Helpers
// ============================================================================

/**
 * Add a page to the bundle
 */
export function addPage(
  bundle: SiteBundle,
  page: PageBundle,
  addToNav?: boolean
): SiteBundle {
  const updatedBundle = {
    ...bundle,
    pages: {
      ...bundle.pages,
      [page.pageId]: page,
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };

  if (addToNav) {
    const navItem: NavItem = {
      label: page.title,
      path: page.path,
      pageId: page.pageId,
    };
    const routeDef: RouteDef = {
      path: page.path,
      pageId: page.pageId,
    };
    updatedBundle.manifest = {
      ...bundle.manifest,
      nav: [...bundle.manifest.nav, navItem],
      routes: [...bundle.manifest.routes, routeDef],
    };
  }

  return updatedBundle;
}

/**
 * Remove a page from the bundle
 */
export function removePage(bundle: SiteBundle, pageId: string): SiteBundle {
  const { [pageId]: removed, ...remainingPages } = bundle.pages;
  
  return {
    ...bundle,
    pages: remainingPages,
    manifest: {
      ...bundle.manifest,
      nav: bundle.manifest.nav.filter(
        (nav) => nav.pageId !== pageId
      ),
      routes: bundle.manifest.routes.filter(
        (route) => route.pageId !== pageId
      ),
    },
    intents: {
      ...bundle.intents,
      bindings: bundle.intents.bindings.filter(
        (binding) => binding.pageId !== pageId
      ),
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Update a page in the bundle
 */
export function updatePage(
  bundle: SiteBundle,
  pageId: string,
  updates: Partial<PageBundle>
): SiteBundle {
  const existingPage = bundle.pages[pageId];
  if (!existingPage) {
    throw new Error(`Page ${pageId} not found`);
  }

  return {
    ...bundle,
    pages: {
      ...bundle.pages,
      [pageId]: {
        ...existingPage,
        ...updates,
        pageId, // Ensure pageId can't be changed
      },
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Add an asset to the bundle
 */
export function addAsset(
  bundle: SiteBundle,
  asset: AssetBundle
): SiteBundle {
  return {
    ...bundle,
    assets: {
      ...bundle.assets,
      [asset.assetId]: asset,
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Remove an asset from the bundle
 */
export function removeAsset(bundle: SiteBundle, assetId: string): SiteBundle {
  const { [assetId]: removed, ...remainingAssets } = bundle.assets;
  
  return {
    ...bundle,
    assets: remainingAssets,
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Add an intent definition
 */
export function addIntentDefinition(
  bundle: SiteBundle,
  intent: IntentDefinition
): SiteBundle {
  return {
    ...bundle,
    intents: {
      ...bundle.intents,
      definitions: {
        ...bundle.intents.definitions,
        [intent.intentId]: intent,
      },
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Add an intent binding
 */
export function addIntentBinding(
  bundle: SiteBundle,
  binding: IntentBinding
): SiteBundle {
  return {
    ...bundle,
    intents: {
      ...bundle.intents,
      bindings: [...bundle.intents.bindings, binding],
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Remove an intent binding
 */
export function removeIntentBinding(
  bundle: SiteBundle,
  bindingId: string
): SiteBundle {
  return {
    ...bundle,
    intents: {
      ...bundle.intents,
      bindings: bundle.intents.bindings.filter(
        (b) => b.bindingId !== bindingId
      ),
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Install an automation
 */
export function installAutomation(
  bundle: SiteBundle,
  automation: AutomationInstall
): SiteBundle {
  return {
    ...bundle,
    automations: {
      ...bundle.automations,
      installed: [...bundle.automations.installed, automation],
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Uninstall an automation
 */
export function uninstallAutomation(
  bundle: SiteBundle,
  installId: string
): SiteBundle {
  return {
    ...bundle,
    automations: {
      ...bundle.automations,
      installed: bundle.automations.installed.filter(
        (a) => a.installId !== installId
      ),
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Add an integration provider
 */
export function addProvider(
  bundle: SiteBundle,
  provider: ProviderConfig
): SiteBundle {
  return {
    ...bundle,
    integrations: {
      ...bundle.integrations,
      providers: [...bundle.integrations.providers, provider],
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Update site status
 */
export function updateSiteStatus(
  bundle: SiteBundle,
  status: SiteIdentity["status"]
): SiteBundle {
  return {
    ...bundle,
    site: {
      ...bundle.site,
      status,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Update brand
 */
export function updateBrand(
  bundle: SiteBundle,
  updates: Partial<BrandPrimitives>
): SiteBundle {
  return {
    ...bundle,
    brand: {
      ...bundle.brand,
      ...updates,
    },
    site: {
      ...bundle.site,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Finalize build
 */
export function finalizeBuild(bundle: SiteBundle): SiteBundle {
  const finishedAt = new Date().toISOString();
  const startedAt = new Date(bundle.build.startedAt).getTime();
  const durationMs = new Date(finishedAt).getTime() - startedAt;

  return {
    ...bundle,
    build: {
      ...bundle.build,
      finishedAt,
      durationMs,
    },
  };
}

/**
 * Add trace event to build
 */
export function addTraceEvent(
  bundle: SiteBundle,
  event: BuildTraceEvent
): SiteBundle {
  return {
    ...bundle,
    build: {
      ...bundle.build,
      trace: [...bundle.build.trace, event],
    },
  };
}

/**
 * Add warning to build
 */
export function addBuildWarning(
  bundle: SiteBundle,
  warning: BuildWarning
): SiteBundle {
  return {
    ...bundle,
    build: {
      ...bundle.build,
      warnings: [...bundle.build.warnings, warning],
    },
  };
}

/**
 * Add error to build
 */
export function addBuildError(
  bundle: SiteBundle,
  error: BuildError
): SiteBundle {
  return {
    ...bundle,
    build: {
      ...bundle.build,
      errors: [...bundle.build.errors, error],
    },
  };
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get all pages as an array
 */
export function getPages(bundle: SiteBundle): PageBundle[] {
  return Object.values(bundle.pages);
}

/**
 * Get page by path
 */
export function getPageByPath(
  bundle: SiteBundle,
  path: string
): PageBundle | undefined {
  return Object.values(bundle.pages).find((page) => page.path === path);
}

/**
 * Get all assets as an array
 */
export function getAssets(bundle: SiteBundle): AssetBundle[] {
  return Object.values(bundle.assets);
}

/**
 * Get assets by type
 */
export function getAssetsByType(
  bundle: SiteBundle,
  type: AssetBundle["type"]
): AssetBundle[] {
  return Object.values(bundle.assets).filter((asset) => asset.type === type);
}

/**
 * Get intent bindings for a page
 */
export function getPageIntentBindings(
  bundle: SiteBundle,
  pageId: string
): IntentBinding[] {
  return bundle.intents.bindings.filter((binding) => binding.pageId === pageId);
}

/**
 * Get intent bindings for a selector
 */
export function getBindingsBySelector(
  bundle: SiteBundle,
  selector: string
): IntentBinding[] {
  return bundle.intents.bindings.filter(
    (binding) => binding.target.selector === selector
  );
}

/**
 * Check if site has any build errors
 */
export function hasBuildErrors(bundle: SiteBundle): boolean {
  return bundle.build.errors.length > 0;
}

/**
 * Check if site is publishable
 */
export function isPublishable(bundle: SiteBundle): boolean {
  return (
    bundle.site.status === "preview" &&
    !hasBuildErrors(bundle) &&
    Object.keys(bundle.pages).length > 0
  );
}

/**
 * Get navigation items
 */
export function getNavigation(bundle: SiteBundle): NavItem[] {
  return [...bundle.manifest.nav];
}

/**
 * Get navigation items sorted by order (alias for backward compatibility)
 */
export function getSortedNavigation(bundle: SiteBundle): NavItem[] {
  return getNavigation(bundle);
}

/**
 * Check if a feature is enabled
 */
export function hasFeature(bundle: SiteBundle, feature: string): boolean {
  return bundle.entitlements.features[feature] ?? false;
}

/**
 * Check if within limit
 */
export function isWithinLimit(
  bundle: SiteBundle,
  limitKey: string,
  currentValue: number
): boolean {
  const limit = bundle.entitlements.limits[limitKey];
  if (limit === undefined || limit < 0) return true; // unlimited
  return currentValue < limit;
}

/**
 * Get unused assets (not referenced by any page)
 * Note: This is a basic implementation that checks brand and manifest.
 * For full accuracy, parse page source content for asset references.
 */
export function getUnusedAssets(bundle: SiteBundle): AssetBundle[] {
  const usedAssetIds = new Set<string>();

  // Collect asset IDs from brand
  if (bundle.brand.logo?.assetId) {
    usedAssetIds.add(bundle.brand.logo.assetId);
  }

  // Collect asset IDs from manifest
  if (bundle.manifest.metadata.ogImage?.assetId) {
    usedAssetIds.add(bundle.manifest.metadata.ogImage.assetId);
  }

  // Collect asset IDs from page intent bindings
  for (const page of Object.values(bundle.pages)) {
    // Check page data for asset references
    if (page.data) {
      const dataStr = JSON.stringify(page.data);
      for (const assetId of Object.keys(bundle.assets)) {
        if (dataStr.includes(assetId)) {
          usedAssetIds.add(assetId);
        }
      }
    }
  }

  return Object.values(bundle.assets).filter(
    (asset) => !usedAssetIds.has(asset.assetId)
  );
}

// ============================================================================
// Diff & Comparison
// ============================================================================

/**
 * Calculate difference between two bundles
 */
export function diffBundles(
  oldBundle: SiteBundle,
  newBundle: SiteBundle
): SiteBundleDiff {
  const diff: SiteBundleDiff = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  // Compare pages
  const oldPageIds = new Set(Object.keys(oldBundle.pages));
  const newPageIds = new Set(Object.keys(newBundle.pages));

  for (const pageId of newPageIds) {
    if (!oldPageIds.has(pageId)) {
      diff.added.push(`pages.${pageId}`);
    } else if (
      JSON.stringify(oldBundle.pages[pageId]) !==
      JSON.stringify(newBundle.pages[pageId])
    ) {
      diff.modified.push(`pages.${pageId}`);
    } else {
      diff.unchanged.push(`pages.${pageId}`);
    }
  }

  for (const pageId of oldPageIds) {
    if (!newPageIds.has(pageId)) {
      diff.removed.push(`pages.${pageId}`);
    }
  }

  // Compare assets
  const oldAssetIds = new Set(Object.keys(oldBundle.assets));
  const newAssetIds = new Set(Object.keys(newBundle.assets));

  for (const assetId of newAssetIds) {
    if (!oldAssetIds.has(assetId)) {
      diff.added.push(`assets.${assetId}`);
    }
  }

  for (const assetId of oldAssetIds) {
    if (!newAssetIds.has(assetId)) {
      diff.removed.push(`assets.${assetId}`);
    }
  }

  // Compare brand
  if (JSON.stringify(oldBundle.brand) !== JSON.stringify(newBundle.brand)) {
    diff.modified.push("brand");
  }

  // Compare manifest
  if (
    JSON.stringify(oldBundle.manifest) !== JSON.stringify(newBundle.manifest)
  ) {
    diff.modified.push("manifest");
  }

  return diff;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a SiteBundle with detailed error reporting
 */
export function validateBundle(bundle: unknown): SiteBundleValidationResult {
  const result = validateSiteBundle(bundle);
  
  if (result.success) {
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  const errors = result.errors?.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  })) ?? [];

  return {
    valid: false,
    errors,
    warnings: [],
  };
}

/**
 * Validate bundle consistency (beyond schema)
 */
export function validateBundleConsistency(
  bundle: SiteBundle
): SiteBundleValidationResult {
  const errors: SiteBundleValidationResult["errors"] = [];
  const warnings: SiteBundleValidationResult["warnings"] = [];

  // Check that home route page exists
  const homeRoute = bundle.manifest.routes.find((r) => r.isHome);
  if (homeRoute && !bundle.pages[homeRoute.pageId]) {
    errors.push({
      path: "manifest.routes",
      message: `Home page ${homeRoute.pageId} not found in pages`,
      code: "missing_page",
    });
  }

  // Check that all routes reference existing pages
  for (const route of bundle.manifest.routes) {
    if (!bundle.pages[route.pageId]) {
      errors.push({
        path: `manifest.routes[${route.path}]`,
        message: `Route references missing page ${route.pageId}`,
        code: "missing_page",
      });
    }
  }

  // Check that all nav items reference existing pages
  for (const navItem of bundle.manifest.nav) {
    if (!bundle.pages[navItem.pageId]) {
      errors.push({
        path: `manifest.nav[${navItem.label}]`,
        message: `Nav item references missing page ${navItem.pageId}`,
        code: "missing_page",
      });
    }
  }

  // Check that all intent bindings reference existing pages
  for (const binding of bundle.intents.bindings) {
    if (!bundle.pages[binding.pageId]) {
      errors.push({
        path: `intents.bindings[${binding.bindingId}]`,
        message: `Intent binding references missing page ${binding.pageId}`,
        code: "missing_page",
      });
    }
  }

  // Check that all intent bindings reference existing definitions
  for (const binding of bundle.intents.bindings) {
    if (!bundle.intents.definitions[binding.intentId]) {
      warnings.push({
        path: `intents.bindings[${binding.bindingId}]`,
        message: `Intent binding references undefined intent ${binding.intentId}`,
        code: "undefined_intent",
      });
    }
  }

  // Check runtime entry page exists
  if (!bundle.pages[bundle.runtime.entry.pageId]) {
    errors.push({
      path: "runtime.entry.pageId",
      message: `Runtime entry page ${bundle.runtime.entry.pageId} not found`,
      code: "missing_page",
    });
  }

  // Check for unused assets
  const unusedAssets = getUnusedAssets(bundle);
  if (unusedAssets.length > 0) {
    warnings.push({
      path: "assets",
      message: `${unusedAssets.length} unused assets found`,
      code: "unused_assets",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize bundle to JSON
 */
export function serializeBundle(bundle: SiteBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Parse bundle from JSON
 */
export function parseBundle(json: string): SiteBundle {
  const parsed = JSON.parse(json);
  const result = validateSiteBundle(parsed);
  
  if (!result.success) {
    throw new Error(
      `Invalid SiteBundle: ${result.errors?.issues
        .map((i) => i.message)
        .join(", ")}`
    );
  }
  
  return result.data as SiteBundle;
}

/**
 * Clone a bundle deeply
 */
export function cloneBundle(bundle: SiteBundle): SiteBundle {
  return JSON.parse(JSON.stringify(bundle));
}

// ============================================================================
// Migration Helpers
// ============================================================================

/**
 * Upgrade bundle to latest version
 */
export function upgradeBundle(bundle: PartialSiteBundle): SiteBundle {
  // Currently only v1.0.0, but this provides migration path
  if (bundle.version === "1.0.0") {
    // Ensure all required fields exist with defaults
    const homeRoute = bundle.manifest?.routes?.find((r) => r.isHome);
    const homePageId = homeRoute?.pageId ?? nanoid();
    
    return {
      version: "1.0.0",
      site: bundle.site,
      build: bundle.build ?? createBuildProvenance("manual"),
      brand: bundle.brand ?? createDefaultBrand("Untitled Site"),
      manifest: bundle.manifest ?? createDefaultManifest(homePageId, "Untitled"),
      pages: bundle.pages ?? {},
      assets: bundle.assets ?? {},
      intents: bundle.intents ?? createDefaultIntentSystem(),
      automations: bundle.automations ?? createDefaultAutomationSystem(),
      integrations: bundle.integrations ?? createDefaultIntegrationSystem(),
      entitlements: bundle.entitlements ?? createEntitlements("free"),
      runtime: bundle.runtime ?? createDefaultRuntimeConfig(homePageId),
      publish: bundle.publish,
      blueprint: bundle.blueprint,
    };
  }

  throw new Error(`Unsupported bundle version: ${bundle.version}`);
}
