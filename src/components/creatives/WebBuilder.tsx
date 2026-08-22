/* cache-bust: 20260309 */
import "./web-builder/obsidian-theme.css";
import { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import TemplateFeedback from "./TemplateFeedback";
import type { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Plus, Layout, Type, Square, Eye, Play,
  Monitor, Tablet, Smartphone, MousePointer2, MoreHorizontal,
  Sparkles, Code, Undo2, Redo2, Save, Keyboard, Zap, RefreshCcw,
  ChevronsDown, ChevronsUp, ArrowDown, ArrowUp, FileCode, Copy, Maximize2, Trash2,
  FolderOpen, Cloud, CloudOff, Server, Layers, Settings, ExternalLink, GitBranch, Shield
} from "lucide-react";
import { CloudPanel } from "./web-builder/CloudPanel";
import { PageNavigationBar, type PageTab } from "./web-builder/PageNavigationBar";
import { useCreatorPlayground } from "@/hooks/useCreatorPlayground";
import { toast } from "sonner";
import { VFSPreview, type VFSPreviewHandle } from '../VFSPreview';
import { DeployButton } from '@/components/DeployButton';
import { CollapsiblePropertiesPanel } from "./web-builder/CollapsiblePropertiesPanel";
import { CanvasDragDropService } from "@/services/canvasDragDropService";
import { AIBuilderPanel, type VFSEdit, type IframeError } from "./web-builder/AIBuilderPanel";
import { AIEditHistoryMenu } from "./web-builder/AIEditHistoryMenu";
import { pushSnapshot as pushAISnapshot, diffChangedPaths } from "@/services/aiHistoryStore";
import {
  computeBuilderVfsSignature,
  markBuilderRecoveryPersisted,
  readBuilderRecoverySnapshot,
  writeBuilderRecoverySnapshot,
  type BuilderRecoverySnapshot,
  type BuilderSaveReason,
} from "@/services/builderStateRecovery";
import { DirectEditToolbar } from "./web-builder/DirectEditToolbar";
import { ArrangementTools } from "./web-builder/ArrangementTools";
import { useTemplateState } from "@/hooks/useTemplateState";
import { webBlocks } from "./web-builder/webBlocks";
import { SimpleModeToggle, SimpleBuilderMode } from "./web-builder/SimpleModeToggle";
import { InteractiveElementHighlight } from "./web-builder/InteractiveElementHighlight";
import { InteractiveElementOverlay } from "./web-builder/InteractiveElementOverlay";
import { InteractiveModeUtils } from "./web-builder/InteractiveModeUtils";
import { InteractiveModeHelp } from "./web-builder/InteractiveModeHelp";
import { TemplateFileManager } from "./web-builder/TemplateFileManager";
import { useTemplateFiles } from "@/hooks/useTemplateFiles";
import { FunctionalBlocksPanel } from "./web-builder/FunctionalBlocksPanel";
import { AIPluginsPanel } from "./web-builder/AIPluginsPanel";
import { IntentDirectoryPanel } from "./web-builder/IntentDirectoryPanel";
import { AutomationStatsPanel } from "./web-builder/AutomationStatsPanel";
import { WorkflowListPanel } from "./web-builder/WorkflowListPanel";
import { ProjectsPanel } from "./web-builder/ProjectsPanel";
import { LayoutTemplatesPanel } from "./web-builder/LayoutTemplatesPanel";
import { FloatingDock } from "./web-builder/FloatingDock";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVFS } from "@/hooks/useVFSContext";
import { FileExplorer } from "./code-editor/FileExplorer";
import { ModernFileExplorer } from "./code-editor/ModernFileExplorer";
import { EditorTabs } from "./code-editor/EditorTabs";
import { ModernEditorTabs } from "./code-editor/ModernEditorTabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { templateToVFSFiles, elementToVFSPatch } from "@/utils/templateToVFS";
import { htmlToJsx } from "@/utils/htmlToJsx";
import { setDefaultBusinessId, setDefaultIndustry, setCurrentSystemType, setDemoMode, handleIntent, IntentPayload } from "@/runtime/intentRouter";
import { buildRedirectPageContext } from "@/utils/redirectPageGenerator";
// scaffoldMultiPageVFS was removed; topologyVFSScaffolder owns multi-page scaffolding now.
import { classifyLabel, type ElementContext } from "@/utils/redirectLabelClassifier";
import { resolvePreviewAction, type PageInventory } from "@/utils/previewActionResolver";
import { IntentPipelineOverlay, type PipelineConfig } from "./web-builder/IntentPipelineOverlay";
import { DemoIntentOverlay, type DemoIntentOverlayConfig } from "./web-builder/DemoIntentOverlay";
import { ResearchOverlay, type ResearchOverlayPayload } from "./web-builder/ResearchOverlay";
import { decideIntentUx } from "@/runtime/intentUx";
import SystemHealthPanel from "@/components/web-builder/SystemHealthPanel";
import ReadinessCenterPanel from "@/components/web-builder/ReadinessCenterPanel";
import GateVerdictStrip from "@/components/web-builder/GateVerdictStrip";
import RevisionLedgerStatus from "@/components/web-builder/RevisionLedgerStatus";
import { useCompiledContract } from "@/hooks/useCompiledContract";
import type { BusinessSystemType } from "@/data/templates/types";
import { normalizeTemplateForCtaContract, type TemplateCtaAnalysis } from "@/utils/ctaContract";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { buildPageStructureContext } from "@/utils/pageStructureContext";
import { extractCleanCode, looksLikeCode, ensureReactImports } from "@/utils/aiCodeCleaner";
import { AIActivityPanel } from "@/components/ai-agent/AIActivityPanel";
import { useAIActivityMonitor } from "@/hooks/useAIActivityMonitor";
import {
  commitMutation,
  CommitRejectedError,
  loadRevision,
  loadLatestRevisionForProject,
  loadProjectedRevisionForDraft,
  type CommitMutationResult,
  type LoadedRevision,
} from "@/services/vfsCommitService";
import { repairDraftBusinessLink } from "@/services/draftBusinessLinkRepair";
import {
  buildProjectRuntimeEnvelope,
  loadProjectRuntimeProjection,
  resolveProjectActivePagePath,
} from '@/services/projectRuntimeEnvelope';
import { dryRunAiCommit, persistAiCommit } from "@/services/aiApplyGate";
import { emptyPatchPlan, legacyFilesToPatchPlan } from "@/types/patchPlan";
import type { BuilderIdentity } from "@/types/builderIdentity";
import { normalizeUnisonRuntimeContext } from "@/platform/core/runtimeManifest";
import type { BusinessRuntimeContract } from '@/platform/core/businessRuntimeContract';
import { BusinessProfileProvider } from '@/contexts/BusinessProfileContext';
import {
  approveCapabilityPlan,
  approvedCapabilityPlanToPatchPlan,
} from '@/services/businessCapabilityPlanner';
import { applyCapabilityMigration } from '@/services/capabilityMigrationRunner';
import { applyButtonBinding } from '@/services/aiBindingTool';
import { upgradeCurrentUserDraftFrameworkVfs } from '@/services/draftFrameworkMigrationService';

// Helpers extracted to web-builder/*
import {
  getOrCreatePreviewBusinessId,
  isBuilderBootstrapPreviewCode,
  isCanonicalRouterSource,
  isWizardFallbackOrRouterOnlySource,
} from "./web-builder/sourceClassifiers";
import { CodeViewErrorBoundary } from "./web-builder/CodeViewErrorBoundary";
import { applyCustomizerOverridesToIframe } from "./web-builder/customizerDomPatcher";
import { useTemplateCustomizer } from "@/hooks/useTemplateCustomizer";
import { TemplateCustomizerPanel } from "./web-builder/TemplateCustomizerPanel";
import { ElementFloatingToolbar } from "./web-builder/ElementFloatingToolbar";
import { ElementIntentInspector } from "./web-builder/ElementIntentInspector";
import { CatalogInspectorPanel } from "@/components/business-center/CatalogInspectorPanel";
import { buildSectionTypeMap } from "@/services/autoEmitSectionBindings";
import { SEOSettingsPanel } from "./web-builder/SEOSettingsPanel";
import { usePageSEO } from "@/hooks/usePageSEO";
import { generateUUID } from "@/utils/uuid";
import {
  mutateJSXStyles,
  mutateJSXText,
  mutateJSXImageSrc,
  mutateJSXAttributes,
} from "@/utils/jsxElementMutation";
import { detectRouteConflicts } from "./web-builder/PageRouteBar";
import { useUserDesignProfile } from "@/hooks/useUserDesignProfile";
import type { SystemsBuildContext } from "@/types/systemsBuildContext";
import { useSiteBuilder, type UseSiteBuilderReturn } from "@/hooks/useSiteBuilder";
import { useAIVFS } from '@/hooks/useAIVFS';
import { canonicalizeAIFilePaths } from '@/services/aiVFSOrchestrator';
import { extractEmbeddedCSS } from '@/utils/templateToVFS';
import { compileSiteBundleToVFS, normalizeLauncherFiles } from '@/utils/sandpackFilePrep';
import { isValidAesthetic } from '@/utils/aestheticToCSS';
import { buildCanonicalArtifacts } from '@/utils/webBuilderArtifacts';
import { getTemplateReactCodeWithCSS } from '@/data/templates';
import type { LauncherHandoff, RuntimeManifest } from '@/types/runtimeManifest';
import type { PlaygroundCompileResult, PlaygroundSetupSnapshot, PlaygroundState, WizardSelections } from '@/types/playground';
import { vfsSnapshotManager } from '@/services/vfsSnapshotManager';
import { diagnosticsAggregator } from '@/services/diagnosticsAggregator';
import { populateRegistryFromTopology, type GeneratedSitePlan } from '@/platform/core/siteTopologyPlanner';
import { commitToPipeline, type SiteBundleSnapshot } from '@/platform/core';
import { runFullPreflight } from '@/services/runFullPreflight';
import { publishCreatorDataForUnison } from '@/services/unisonCanonicalRegistry';
import { resolveIntentTarget, persistTopology, recoverTopology, persistTopologyToDb, recoverTopologyFromDb } from '@/utils/topologyResolver';
import { normalizeLauncherEntryPoint, resolveLauncherEntryPoint } from '@/utils/launcherPayload';
import {
  applyStructuralChange,
  syncRouterAndValidate,
  regenerateRouter,
  patchVFS,
  resolveNavigationTarget,
  deriveFilePath,
} from '@/services/unifiedPreviewPipeline';
import { getProjectByIdCompat } from '@/services/projectSchemaCompat';
import { findBuilderDraftIdForProject } from '@/services/builderDraftBridge';
import { buildIntentReadinessReport } from '@/services/intentReadinessService';
import { loadCanonicalComponentGraph } from '@/services/componentGraphPersistence';
import { inferCanonicalComponentSlug } from '@/services/canonicalComponentRegistry';
import { buildCanonicalLaunchArtifacts } from '@/services/canonicalLaunchVfs';
import { clearLauncherHandoff, readLauncherHandoff } from '@/services/launcherHandoffPersistence';
import { assertNoMinimalFallbackPreview, projectSnapshotVfsFiles, resolveSnapshot, markLiveEditedVfsPaths, clearLiveEditedVfsPaths } from '@/services/snapshotProjector';
import { createVfsHandoffSignature } from '@/services/vfsHandoffSignature';
import { isPreviewPipelineError } from '@/services/previewPipelineError';
import { ThemeSeedError } from '@/platform/core/themeSeedAssert';
import { PreviewOverlayManager, type OverlayConfig } from '@/components/preview/PreviewOverlayManager';
import PreviewCartDrawer from '@/components/preview/PreviewCartDrawer';
import {
  BROWSER_CART_EVENT,
  createBrowserCartManager,
  readBrowserCart,
} from '@/runtime/browserCartManager';

const CreatorPlaygroundModal = lazy(() =>
  import('./web-builder/CreatorPlaygroundModal').then((module) => ({ default: module.CreatorPlaygroundModal })),
);
const VFSMonacoEditor = lazy(() => import('./code-editor/VFSMonacoEditor'));
const VFSCodeView = lazy(() =>
  import('./code-editor/VFSCodeView').then((module) => ({ default: module.VFSCodeView })),
);
const CodePreviewDialog = lazy(() =>
  import('./web-builder/CodePreviewDialog').then((module) => ({ default: module.CodePreviewDialog })),
);
const IntegrationsPanel = lazy(() =>
  import('./design-studio/IntegrationsPanel').then((module) => ({ default: module.IntegrationsPanel })),
);
const ExportDialog = lazy(() =>
  import('./design-studio/ExportDialog').then((module) => ({ default: module.ExportDialog })),
);
const PerformancePanel = lazy(() =>
  import('./web-builder/PerformancePanel').then((module) => ({ default: module.PerformancePanel })),
);
const BusinessSetupSuggestions = lazy(() =>
  import('@/components/onboarding/BusinessSetupSuggestions').then((module) => ({ default: module.BusinessSetupSuggestions })),
);


// JSX/CSS-selector source manipulation helpers extracted to web-builder/jsxSourceUtils.ts
import {
  escapeCSSSelector,
  extractJsxReturnBody,
  findElementBoundsInJSX,
  withSourceManipulation,
  safeFindElement,
  findJSXClosingTag,
} from "./web-builder/jsxSourceUtils";



// Dynamic page prompt builder extracted to web-builder/dynamicPagePrompt.ts
import { buildDynamicPagePrompt } from "./web-builder/dynamicPagePrompt";
import { buildPageSeed, buildFunnelStepSeed, WELCOME_APP_TSX, CLEAR_CANVAS_JS_SEED } from "./web-builder/seedTemplates";
import { integrateCSSIntoHTML as integrateCSSIntoHTMLPure, buildSectionsReactApp } from "./web-builder/htmlAssembly";
import { exportFabricCanvasToHtmlCss } from "./web-builder/fabricExport";


/**
 * Validate AI-generated code against the original template to detect destructive changes.
 * Returns warnings if the AI significantly altered the template structure.
 */
// AI code preservation + validation helpers extracted to web-builder/aiCodeHelpers.ts
import {
  type CodeValidationResult,
  extractStyleBlocks,
  preserveStyleBlocks,
  preserveInlineClasses,
  validateAICodeChange,
} from "./web-builder/aiCodeHelpers";


// Define SelectedElement interface to match HTMLElementPropertiesPanel expected type
interface SelectedElement {
  id?: string;
  className?: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  opacity?: number;
  fill?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  visible?: boolean;
  scaleX?: number;
  scaleY?: number;
  set?: (property: string, value: unknown) => void;
  clone?: (callback: (cloned: unknown) => void) => void;
  // HTML-specific properties
  tagName?: string;
  textContent?: string;
  styles?: {
    color?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: string;
    padding?: string;
    margin?: string;
    border?: string;
    borderRadius?: string;
    width?: string;
    height?: string;
    objectFit?: string;
    display?: string;
    opacity?: string;
  };
  attributes?: Record<string, string>;
  selector?: string;
  html?: string;
  section?: string;
  imageTarget?: {
    kind: 'img' | 'background';
    selector: string;
    src?: string;
  } | null;
  /** Captured by the Preview selection bridge; consumed by EditScopeResolver. */
  scopeAncestors?: import('@/services/editScopeResolver').ScopeAncestors;
}

// Define types for Fabric objects with their specific properties
type FabricTextObject = FabricCanvas['_objects'][0] & {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: string;
};

type FabricImageObject = FabricCanvas['_objects'][0] & {
  getSrc(): string;
};
import { useKeyboardShortcuts, defaultWebBuilderShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import { useCodeHistory } from "@/hooks/useCodeHistory";
import { useWebBuilderState } from "@/hooks/useWebBuilderState";
import { useLaunch } from "@/contexts/useLaunchHooks";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose, ArrowLeft, Download } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SystemLauncher } from "@/components/onboarding/SystemLauncher";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BuilderSessionProvider } from "@/builder/controllers/BuilderSessionProvider";
import { BusinessPill } from "@/components/webbuilder/BusinessPill";


// CodeViewErrorBoundary extracted to web-builder/CodeViewErrorBoundary.tsx

interface WebBuilderProps {
  initialHtml?: string;
  initialCss?: string;
  onSave?: (html: string, css: string) => void;
}

const TemplateHtmlPreviewDialog = lazy(() =>
  import("./web-builder/TemplateHtmlPreviewDialog").then((m) => ({ default: m.TemplateHtmlPreviewDialog }))
);

interface WebBuilderRouteState {
  vfsFiles?: Record<string, string>;
  generatedCode?: string;
  generatedTemplate?: any;
  templateName?: string;
  templateCategory?: string;
  templateId?: string;
  themePresetId?: string;
  designPreset?: string;
  aesthetic?: string;
  startInPreview?: boolean;
  systemType?: string;
  systemName?: string;
  businessId?: string;
  siteId?: string;
  projectId?: string;
  draftId?: string;
  manifestId?: string;
  projectSlug?: string;
  projectName?: string;
  publishStatus?: string;
  customDomain?: string;
  from?: string;
  returnToCloudTab?: 'overview' | 'projects' | 'assets' | 'email' | 'integrations' | 'security' | 'profile';
  returnWorkspaceSection?: 'projects' | 'crm' | 'automations' | 'team' | 'settings';
  returnBusinessId?: string;
  returnProjectId?: string;
  entryPoint?: string;
  runtimeManifest?: RuntimeManifest;
  siteBundle?: LauncherHandoff['siteBundle'];
  sitePlan?: GeneratedSitePlan;
  systemsBuildContext?: SystemsBuildContext;
  siteBundleSnapshot?: SiteBundleSnapshot;
  materializedPlayground?: PlaygroundState;
  compiledPlayground?: PlaygroundCompileResult;
  pipelineManifest?: RuntimeManifest;
  wizardSelections?: WizardSelections;
  setupSnapshot?: PlaygroundSetupSnapshot;
  nativeReadinessManifest?: Record<string, unknown>;
  businessRuntime?: BusinessRuntimeContract;
  /** Durable structured WizardSeed from launcher; threaded into every AIBuilderPanel turn. */
  wizardSeed?: Record<string, unknown>;
  fromLauncher?: boolean;
  /** Durable revision id persisted by VFSCommitService (Move 2/3). When present,
   *  WebBuilder hydrates files/snapshot from `site_revisions` rather than relying
   *  solely on sessionStorage/launch context. */
  revisionId?: string;
}

// hasNonEmptyVfsFiles + mergeRouteStatePreservingFiles are imported from
// ./web-builder/aiCodeHelpers as a typed helper for WebBuilderRouteState.
import {
  hasNonEmptyVfsFiles,
  mergeRouteStatePreservingFiles as mergeRouteStatePreservingFilesGeneric,
} from "./web-builder/aiCodeHelpers";
const mergeRouteStatePreservingFiles = (
  ...states: Array<WebBuilderRouteState | null | undefined>
): WebBuilderRouteState | null =>
  mergeRouteStatePreservingFilesGeneric<WebBuilderRouteState>(...states);

/**
 * True when a buildSavePayload()/commitToPipeline() failure means the
 * *recompile* step lacks inputs it needs (e.g. an older/recovered draft that
 * never carried a themePresetId or wizard themeTokens) rather than a real
 * data-corruption or infra failure. These are recoverable: the caller should
 * persist the existing VFS files as-is instead of rejecting the save/update,
 * since the source-of-truth content itself is fine — only re-derivation is
 * blocked. Broadens the existing isPreviewPipelineError() check, which only
 * recognized PreviewPipelineError and silently let ThemeSeedError (and the
 * plain "requires the original wizard themeTokens" Error) escape as hard
 * failures, breaking autosave AND the manual Update button for such drafts.
 */
function isRecompileInputError(error: unknown): boolean {
  if (isPreviewPipelineError(error)) return true;
  if (error instanceof ThemeSeedError) return true;
  if (error instanceof Error && /wizard themeTokens/i.test(error.message)) return true;
  return false;
}

export const WebBuilder = ({ initialHtml, initialCss, onSave }: WebBuilderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile(1024);
  const { launch } = useLaunch();
  const routeState = (location.state as WebBuilderRouteState | null) ?? null;
  const urlResumeId = useMemo(
    () => new URLSearchParams(location.search).get('id'),
    [location.search],
  );
  const isExplicitProjectResume = !!(
    urlResumeId ||
    routeState?.draftId ||
    routeState?.from === 'Workspace Settings' ||
    routeState?.returnToCloudTab === 'projects'
  );
  const pendingLauncherHandoff = useMemo(
    () => isExplicitProjectResume
      ? null
      : readLauncherHandoff()?.routeState as WebBuilderRouteState | null,
    [isExplicitProjectResume]
  );
  const launchRouteState = useMemo<WebBuilderRouteState | null>(() => {
    if (!launch) return null;

    return {
      vfsFiles: launch.vfsFiles,
      templateName: launch.templateName,
      templateCategory: launch.templateCategory,
      templateId: launch.templateId,
      themePresetId: launch.themePresetId,
      aesthetic: launch.aesthetic,
      startInPreview: launch.startInPreview,
      systemType: launch.systemType,
      systemName: launch.systemName,
      businessId: launch.businessId,
      projectId: launch.projectId,
      manifestId: launch.manifestId,
      entryPoint: launch.entryPoint,
      runtimeManifest: launch.runtimeManifest,
      siteBundle: launch.siteBundle,
      sitePlan: launch.sitePlan,
      systemsBuildContext: launch.systemsBuildContext,
      siteBundleSnapshot: launch.siteBundleSnapshot,
      materializedPlayground: launch.materializedPlayground,
      compiledPlayground: launch.compiledPlayground,
      pipelineManifest: launch.pipelineManifest,
      wizardSelections: launch.wizardSelections,
      wizardSeed: launch.wizardSeed,
      setupSnapshot: launch.setupSnapshot,
      nativeReadinessManifest: launch.nativeReadinessManifest,
    };
  }, [launch]);
  const [persistedResumeState, setPersistedResumeState] = useState<WebBuilderRouteState | null>(null);
  const effectiveRouteState = useMemo<WebBuilderRouteState | null>(() => {
    if (isExplicitProjectResume) {
      return mergeRouteStatePreservingFiles(persistedResumeState, routeState);
    }
    return mergeRouteStatePreservingFiles(pendingLauncherHandoff, launchRouteState, routeState);
  }, [isExplicitProjectResume, launchRouteState, pendingLauncherHandoff, persistedResumeState, routeState]);
  const launchEntryPoint = useMemo(
    () =>
      normalizeLauncherEntryPoint(
        effectiveRouteState?.runtimeManifest?.entryPoint || effectiveRouteState?.entryPoint,
      ) || '/src/App.tsx',
    [effectiveRouteState?.entryPoint, effectiveRouteState?.runtimeManifest?.entryPoint]
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeMode, setActiveMode] = useState<"insert" | "layout" | "text" | "vector">("insert");
  // useReactPreview removed — VFSPreview (Sandpack) is now the only preview engine
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [zoom, setZoom] = useState(0.5);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [lastGenerationId, setLastGenerationId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>(''); // hydrated from supabase auth
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!cancelled && user?.id) setCurrentUserId(user.id);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [codePreviewOpen, setCodePreviewOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [integrationsPanelOpen, setIntegrationsPanelOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportHtml, setExportHtml] = useState("");
  const [exportCss, setExportCss] = useState("");
  const [exportJs, setExportJs] = useState("");
  const [exportProjectName, setExportProjectName] = useState("my-project");
  const [saveProjectDialogOpen, setSaveProjectDialogOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [saveProjectName, setSaveProjectName] = useState("");
  const [saveProjectDescription, setSaveProjectDescription] = useState("");
  const [currentTemplateName, setCurrentTemplateName] = useState<string | null>(null);
  const [currentDesignPreset, setCurrentDesignPreset] = useState<string | null>(
    effectiveRouteState?.designPreset ||
      effectiveRouteState?.aesthetic ||
      null
  );
  // Resolved wizard Style-card preset id — single source of truth for /src/index.css
  // across every CSS-fallback path the Builder triggers (Effect A, importBuilderFiles,
  // template imports). Threaded into normalizeLauncherFiles so non-store industries
  // never silently land on the 'modern' default.
  const resolvedThemePresetId = useMemo<string | null>(() => {
    const raw = effectiveRouteState?.themePresetId
      || effectiveRouteState?.siteBundleSnapshot?.meta?.themePresetId
      || effectiveRouteState?.siteBundleSnapshot?.appContext?.themePresetId
      || effectiveRouteState?.designPreset
      || effectiveRouteState?.aesthetic
      || (effectiveRouteState?.runtimeManifest?.appContext as { themePresetId?: string } | undefined)?.themePresetId
      || null;
    return raw && isValidAesthetic(raw) ? raw : raw || null;
  }, [effectiveRouteState?.themePresetId, effectiveRouteState?.siteBundleSnapshot?.meta?.themePresetId, effectiveRouteState?.siteBundleSnapshot?.appContext?.themePresetId, effectiveRouteState?.designPreset, effectiveRouteState?.aesthetic, effectiveRouteState?.runtimeManifest?.appContext]);
  const [currentTemplateCategory, setCurrentTemplateCategory] = useState<string | null>(
    effectiveRouteState?.templateCategory || null
  );
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(
    effectiveRouteState?.draftId
      || effectiveRouteState?.templateId
      || (effectiveRouteState?.runtimeManifest?.appContext as { templateId?: string } | undefined)?.templateId
      || null
  );
  // Launcher context, persisted handoff, and navigation state can settle on
  // adjacent renders. Keep canonical identity synchronized after mount rather
  // than pinning commits to whichever source won the first render.
  useEffect(() => {
    if (effectiveRouteState?.draftId) {
      setCurrentDraftId((current) => current === effectiveRouteState.draftId
        ? current
        : effectiveRouteState.draftId || null);
    }
  }, [effectiveRouteState?.draftId]);
  // Live-edit protection is scoped to one project identity; drop it on switch.
  useEffect(() => {
    clearLiveEditedVfsPaths();
  }, [currentDraftId]);
  const [currentManifestId, setCurrentManifestId] = useState<string | null>(
    effectiveRouteState?.manifestId || null
  );
  const [isSavingProject, setIsSavingProject] = useState(false);
  const creatorPlayground = useCreatorPlayground();
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [catalogPanelOpen, setCatalogPanelOpen] = useState(false);
  const [playgroundModalOpen, setPlaygroundModalOpen] = useState(false);
  const [playgroundInitialSection, setPlaygroundInitialSection] = useState<"launch" | "pages" | "funnels" | "overview" | "intent_registry" | "readiness" | "business" | "components" | undefined>(undefined);
  const [playgroundInitialBindingId, setPlaygroundInitialBindingId] = useState<string | undefined>(undefined);
  const [playgroundBindings, setPlaygroundBindings] = useState<Record<string, import('@/types/playground').PlaygroundBinding>>({});
  const [playgroundCalendars, setPlaygroundCalendars] = useState<Record<string, import('@/types/playground').PlaygroundCalendar>>({});
  const [playgroundPopups, setPlaygroundPopups] = useState<Record<string, import('@/types/playground').PlaygroundPopup>>({});
  const [aiPanelOpen, setAiPanelOpen] = useState(true); // AI panel open by default for easy access; force-closed on mount if mobile (see useEffect below)
  const [iframeErrors, setIframeErrors] = useState<IframeError[]>([]);
  const dragDropServiceRef = useRef<CanvasDragDropService>(CanvasDragDropService.getInstance());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [performancePanelOpen, setPerformancePanelOpen] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);
  const [isInteractiveModeHelpOpen, setIsInteractiveModeHelpOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editorCode, setEditorCode] = useState(CLEAR_CANVAS_JS_SEED);
  const [previewCode, setPreviewCode] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const splitViewDropZoneRef = useRef<HTMLDivElement>(null);
  const livePreviewRef = useRef<VFSPreviewHandle | null>(null);
  const {
    selectedObject,
    selectedHTMLElement,
    builderMode,
    viewMode,
    setSelectedHTMLElement,
    setBuilderMode,
    setViewMode,
    clearSelection,
  } = useWebBuilderState(fabricCanvas);
  const clearSelectionRef = useRef(clearSelection);
  clearSelectionRef.current = clearSelection;

  const selectedPlaygroundBinding = useMemo(() => {
    const attributes = (selectedHTMLElement?.attributes || {}) as Record<string, string>;
    const bindingId = attributes['data-ut-binding-id'];
    if (bindingId && playgroundBindings[bindingId]) {
      return playgroundBindings[bindingId];
    }

    const elementKey = attributes['data-ut-binding-key'] || attributes['data-element-key'];
    if (!elementKey) return null;
    return Object.values(playgroundBindings).find((binding) => binding.elementKey === elementKey) || null;
  }, [selectedHTMLElement, playgroundBindings]);

  const clearLivePreviewSelection = useCallback(() => {
    livePreviewRef.current?.clearSelectedElement?.();
  }, []);

  // Template Customizer - full DOM control
  const templateCustomizer = useTemplateCustomizer();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  // AI edit request state — only true when user clicks AI button in floating toolbar

  
  // Business Setup Suggestions - shown after AI generates a site/template
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);
  const launcherDraftBootstrapRef = useRef<string | null>(null);
  const launcherDraftBootstrapAttemptsRef = useRef(0);

  const draftPersistencePromiseRef = useRef<Promise<string | null> | null>(null);

  const importedRouteStateRef = useRef<string | null>(null);

  // The builder is independently usable for blank and restored projects.
  // Opening the launcher here creates a modal backdrop over every direct
  // /web-builder visit and makes the shell appear frozen.
  const [showLauncher, setShowLauncher] = useState(false);
  const routeStateHasStructuredProject = !!(
    effectiveRouteState?.vfsFiles ||
    effectiveRouteState?.siteBundleSnapshot?.vfsFiles ||
    effectiveRouteState?.generatedCode ||
    effectiveRouteState?.generatedTemplate ||
    effectiveRouteState?.siteBundle
  );

  // Collapse all panels when on mobile to ensure full-width canvas
  useEffect(() => {
    if (isMobile) {
      setAiPanelOpen(false);
      setLeftPanelCollapsed(true);
      setRightPanelCollapsed(true);
    }
  }, [isMobile]);

  // Parse template when previewCode changes (but NOT when customizer is applying overrides)
  useEffect(() => {
    if (!previewCode || !previewCode.trim()) return;
    // Skip re-parsing if the change came from customizer applying overrides
    // This prevents resetting the images array and losing user-uploaded data URLs
    if (templateCustomizer.consumeCustomizerApplyFlag()) {
      return;
    }
    // All templates are TSX — use regex-based section + image extraction
    templateCustomizer.parseSectionsFromJSX(previewCode);
  }, [previewCode]);

  // Apply customizer overrides to preview (TSX source — image replacements)
  const applyCustomizerOverrides = useCallback(() => {
    if (!templateCustomizer.isDirty) return;
    const baseSource = templateCustomizer.getOriginalSource() || previewCode;
    if (!baseSource) return;
    const customized = templateCustomizer.applyOverrides(baseSource);
    if (customized !== previewCode) {
      setPreviewCode(customized);
      setEditorCode(customized);
    }
  }, [templateCustomizer, previewCode]);

  // Auto-apply overrides when customizer state changes (e.g. after image replacement)
  // Patches the iframe DOM in-place to avoid scroll-reset & blink.
  useEffect(() => {
    console.log('[WebBuilder] Override useEffect triggered, version:', templateCustomizer.overrideVersion, 'isDirty:', templateCustomizer.isDirty);
    if (templateCustomizer.overrideVersion <= 0 || !templateCustomizer.isDirty) {
      console.log('[WebBuilder] Override useEffect skipped - conditions not met');
      return;
    }

    // Use VFSPreview (sole preview engine)
    const iframe = livePreviewRef.current?.getIframe?.() ?? null;
    const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document || null;

    if (!iframeDoc || !iframeDoc.head) {
      console.log('[WebBuilder] Iframe not ready — applying source-level overrides');
      // Iframe not ready — apply source-level overrides (image replacements) via TSX
      const baseSource = templateCustomizer.getOriginalSource() || previewCode;
      if (!baseSource) return;
      const customized = templateCustomizer.applyOverrides(baseSource);
      if (customized !== previewCode) {
        setPreviewCode(customized);
        setEditorCode(customized);
      }
      return;
    }

    console.log('[WebBuilder] Patching iframe DOM, elementOverrides count:', templateCustomizer.elementOverrides.size);

    applyCustomizerOverridesToIframe(iframeDoc, templateCustomizer);


    // 4. Keep previewCode AND editorCode in sync — apply TSX source-level overrides (images)
    const baseSource = templateCustomizer.getOriginalSource() || previewCode;
    if (baseSource) {
      const customized = templateCustomizer.applyOverrides(baseSource);
      if (customized !== previewCode) {
        setPreviewCode(customized);
        setEditorCode(customized);
      }
    }
  }, [templateCustomizer.overrideVersion]);

  // Stable callback for SimplePreview element selection (avoids new ref each render)
  const handlePreviewElementSelect = useCallback((el: any) => {
    setSelectedHTMLElement({
      tagName: el.tagName,
      textContent: el.textContent,
      styles: el.styles,
      attributes: el.attributes,
      selector: el.selector,
      html: el.html,
      imageTarget: el.imageTarget,
      section: el.section,
      scopeAncestors: el.scopeAncestors,
    });
  }, [setSelectedHTMLElement]);

  // Handle element-level edits from floating toolbar.
  //
  // IMPORTANT: Sandpack iframes are not exposed via getIframe() (only docker/local
  // backends attach iframeRef), so direct DOM patches in the customizer override
  // useEffect silently no-op for the default Sandpack pipeline. Element-level
  // edits MUST therefore be baked into the TSX source so they flow through the
  // canonical previewCode → VFS → Sandpack rebuild path.
  //
  // We *also* keep the templateCustomizer state in sync so the manual customizer
  // panel reflects the latest values and so legacy CSS-injection still applies
  // when the docker/local backend is active.
  // NOTE: We intentionally do NOT call templateCustomizer.setElementOverride
  // from the floating-toolbar handlers below. The TSX mutation IS the source
  // of truth for Sandpack — calling setElementOverride bumps `overrideVersion`,
  // which fires the customizer override useEffect; on Sandpack (no getIframe)
  // that effect re-runs `applyOverrides(getOriginalSource())` and overwrites
  // our just-baked edit with the un-mutated original template. The customizer
  // remains authoritative for global theme/typography/image-replacement state.

  // Record a manual edit snapshot for the active page so the History menu can
  // revert/reapply granular toolbar changes alongside AI edits.
  // Refs avoid TDZ on projectId/activePagePath which are declared later in the component.
  const snapshotCtxRef = useRef<{ projectId?: string; activePagePath?: string }>({});
  const recordManualPageEdit = useCallback((label: string, beforeCode: string, afterCode: string) => {
    if (!afterCode || beforeCode === afterCode) return;
    const ctx = snapshotCtxRef.current;
    const path = ctx.activePagePath || '/src/App.tsx';
    try {
      pushAISnapshot(ctx.projectId ?? null, {
        label,
        source: 'manual',
        before: { [path]: beforeCode },
        after: { [path]: afterCode },
        changedPaths: [path],
        meta: { origin: 'floating-toolbar' },
      });
    } catch (err) {
      console.warn('[recordManualPageEdit] snapshot failed:', err);
    }
  }, []);

  const recordManualVFSEdit = useCallback((label: string, beforeFiles: Record<string, string>, afterFiles: Record<string, string>, origin = 'floating-toolbar') => {
    const changed = diffChangedPaths(beforeFiles, afterFiles);
    if (!changed.length) return;
    try {
      pushAISnapshot(snapshotCtxRef.current.projectId ?? null, {
        label,
        source: 'manual',
        before: beforeFiles,
        after: afterFiles,
        changedPaths: changed,
        meta: { origin },
      });
    } catch (err) {
      console.warn('[recordManualVFSEdit] snapshot failed:', err);
    }
  }, []);

  // Apply a per-file mutator to the active page; if it fails, scan the VFS for
  // a .tsx/.jsx file that contains the selector. This makes manual toolbar
  // edits work for elements that live in imported component files (Navbar, etc.)
  // and avoids the misleading "dynamic className" toast.
  const applyMutatorAcrossVFS = useCallback((
    selector: string,
    mutate: (code: string) => string | null,
    onActivePageSuccess: (next: string) => void,
    snapshotLabel: string,
  ): { ok: boolean; reason?: 'no-match' | 'no-change' } => {
    // 1. Active page first
    const next = mutate(previewCode);
    if (next && next !== previewCode) {
      recordManualPageEdit(snapshotLabel, previewCode, next);
      // Write directly to VFS so the Sandpack preview HMRs in real time
      // instead of waiting for Effect A (previewCode → VFS) to flush.
      try {
        const activePath = snapshotCtxRef.current.activePagePath;
        if (activePath && (activePath.endsWith('.tsx') || activePath.endsWith('.jsx'))) {
          virtualFS.importFiles({ [activePath]: next });
        }
      } catch (err) {
        console.warn('[applyMutatorAcrossVFS] direct VFS write failed:', err);
      }
      onActivePageSuccess(next);
      return { ok: true };
    }
    // 2. Scan VFS files for a matching selector
    const ctx = snapshotCtxRef.current;
    const activePath = ctx.activePagePath;
    try {
      const allFiles = virtualFS.getSandpackFiles();
      for (const [path, code] of Object.entries(allFiles)) {
        if (!path.endsWith('.tsx') && !path.endsWith('.jsx')) continue;
        if (path === activePath) continue;
        const attempt = mutate(code);
        if (attempt && attempt !== code) {
          try {
            pushAISnapshot(ctx.projectId ?? null, {
              label: `${snapshotLabel} (${path.split('/').pop()})`,
              source: 'manual',
              before: { [path]: code },
              after: { [path]: attempt },
              changedPaths: [path],
              meta: { origin: 'floating-toolbar' },
            });
          } catch (err) { console.warn('[applyMutatorAcrossVFS] snapshot failed:', err); }
          virtualFS.importFiles({ [path]: attempt });
          return { ok: true };
        }
      }
    } catch (err) {
      console.warn('[applyMutatorAcrossVFS] VFS scan failed:', err);
    }
    return { ok: false, reason: next === previewCode ? 'no-change' : 'no-match' };
  }, [previewCode, recordManualPageEdit]);

  // ── Preview Floating Toolbar → VFSCommitService bridge ───────────────────
  // Every direct edit dispatched by the floating toolbar (style/text/image/
  // attribute/delete/duplicate/move) additively chains through commitMutation
  // so toolbar mutations land in the durable site_revisions ledger alongside
  // AI Builder and layout fast-path commits.
  // See mem://features/web-builder/preview-floating-toolbar.
  const commitToolbarMutationRef = useRef<((nextCode: string, summary: string) => void) | null>(null);

  const handleFloatingStyleUpdate = useCallback((selector: string, styles: Record<string, string>) => {
    console.log('[WebBuilder] handleFloatingStyleUpdate called:', selector, styles);
    const res = applyMutatorAcrossVFS(
      selector,
      (code) => mutateJSXStyles(code, selector, styles, findElementBoundsInJSX),
      (next) => {
        setPreviewCode(next);
        setEditorCode(next);
        if (selectedHTMLElement?.selector === selector) {
          setSelectedHTMLElement({
            ...selectedHTMLElement,
            styles: { ...(selectedHTMLElement.styles || {}), ...styles },
          });
        }
        commitToolbarMutationRef.current?.(next, `style ${Object.keys(styles).join(',').slice(0, 40)}`);
      },
      `Manual · style ${Object.keys(styles).join(', ').slice(0, 40)}`,
    );
    if (!res.ok) {
      console.warn('[WebBuilder] mutateJSXStyles failed for selector', selector);
      toast.error('Could not update styles — element not found in source. Try the AI edit instead.');
    }
  }, [applyMutatorAcrossVFS, selectedHTMLElement, setSelectedHTMLElement]);

  const handleFloatingTextUpdate = useCallback((selector: string, text: string) => {
    console.log('[WebBuilder] handleFloatingTextUpdate called:', selector, text);
    const res = applyMutatorAcrossVFS(
      selector,
      (code) => mutateJSXText(code, selector, text, findElementBoundsInJSX),
      (next) => {
        setPreviewCode(next);
        setEditorCode(next);
        if (selectedHTMLElement?.selector === selector) {
          setSelectedHTMLElement({ ...selectedHTMLElement, textContent: text });
        }
        commitToolbarMutationRef.current?.(next, `text "${text.slice(0, 30)}"`);
      },
      `Manual · text "${text.slice(0, 30)}"`,
    );
    if (!res.ok) {
      toast.error('Could not update text — element contains nested markup or was not found. Try the AI edit instead.');
    }
  }, [applyMutatorAcrossVFS, selectedHTMLElement, setSelectedHTMLElement]);

  const handleFloatingImageReplace = useCallback((selector: string, src: string) => {
    console.log('[WebBuilder] handleFloatingImageReplace called:', selector, src.substring(0, 50));
    const res = applyMutatorAcrossVFS(
      selector,
      (code) => mutateJSXImageSrc(code, selector, src, findElementBoundsInJSX),
      (next) => {
        setPreviewCode(next);
        setEditorCode(next);
        if (selectedHTMLElement?.selector === selector) {
          setSelectedHTMLElement({
            ...selectedHTMLElement,
            attributes: { ...(selectedHTMLElement.attributes || {}), src },
          });
        }
        commitToolbarMutationRef.current?.(next, 'replace image');
      },
      'Manual · replace image',
    );
    if (!res.ok) {
      toast.error('Could not replace image. Try selecting the <img> directly.');
    }
  }, [applyMutatorAcrossVFS, selectedHTMLElement, setSelectedHTMLElement]);

  const handleFloatingAttributeUpdate = useCallback((selector: string, attributes: Record<string, string>) => {
    console.log('[WebBuilder] handleFloatingAttributeUpdate called:', selector, attributes);
    const res = applyMutatorAcrossVFS(
      selector,
      (code) => mutateJSXAttributes(code, selector, attributes, findElementBoundsInJSX),
      (next) => {
        setPreviewCode(next);
        setEditorCode(next);
        if (selectedHTMLElement?.selector === selector) {
          setSelectedHTMLElement({
            ...selectedHTMLElement,
            attributes: {
              ...(selectedHTMLElement.attributes || {}),
              ...attributes,
            },
          });
        }
        commitToolbarMutationRef.current?.(next, `attrs ${Object.keys(attributes).join(',').slice(0, 40)}`);
      },
      `Manual · attrs ${Object.keys(attributes).join(', ').slice(0, 40)}`,
    );
    if (!res.ok) {
      toast.error('Could not update attributes for the selected element.');
    }
  }, [applyMutatorAcrossVFS, selectedHTMLElement, setSelectedHTMLElement]);


  const applyElementHtmlUpdate = useCallback((code: string, selector: string, newJsx: string) => {
    // AI/contentEditable often returns raw HTML (class=, unclosed <img>, hyphenated SVG attrs).
    // Convert to JSX-safe markup before splicing into a .tsx file or Babel will explode with
    // "Expected corresponding JSX closing tag" / "Cannot assign to read only property 'message'".
    let safeJsx = newJsx;
    try {
      safeJsx = htmlToJsx(newJsx);
    } catch (err) {
      console.warn('[applyElementHtmlUpdate] htmlToJsx failed, using raw input:', err);
    }
    return withSourceManipulation(code, (jsx) => {
      const bounds = findElementBoundsInJSX(jsx, selector);
      if (!bounds) {
        console.warn('[applyElementHtmlUpdate] No match for selector:', selector);
        return null;
      }
      return jsx.substring(0, bounds.start) + safeJsx + jsx.substring(bounds.end);
    });
  }, []);

  // Delete an element from TSX source by selector
  const applyElementDelete = useCallback((code: string, selector: string) => {
    return withSourceManipulation(code, (jsx) => {
      const bounds = findElementBoundsInJSX(jsx, selector);
      if (!bounds) {
        console.warn('[applyElementDelete] No match for selector:', selector);
        return null;
      }
      // Remove the element and any trailing whitespace/newline
      const after = jsx.substring(bounds.end).replace(/^\s*\n?/, '');
      return jsx.substring(0, bounds.start).replace(/\n\s*$/, '\n') + after;
    });
  }, []);

  // Duplicate an element in TSX source by selector
  const applyElementDuplicate = useCallback((code: string, selector: string) => {
    return withSourceManipulation(code, (jsx) => {
      const bounds = findElementBoundsInJSX(jsx, selector);
      if (!bounds) {
        console.warn('[applyElementDuplicate] No match for selector:', selector);
        return null;
      }
      const element = jsx.substring(bounds.start, bounds.end);
      // Insert a copy right after the original, preserving indentation
      return jsx.substring(0, bounds.end) + '\n' + element + jsx.substring(bounds.end);
    });
  }, []);

  // Handle delete from floating toolbar - updates source code
  const handleFloatingDelete = useCallback((selector: string) => {
    const res = applyElementDelete(previewCode, selector);
    if (!res.ok) {
      toast.error('Could not delete element. Try selecting a different element.');
      return;
    }
    recordManualPageEdit('Manual · delete element', previewCode, res.code);
    setEditorCode(res.code);
    setPreviewCode(res.code);
    commitToolbarMutationRef.current?.(res.code, 'delete element');
    setSelectedHTMLElement(null);
    clearLivePreviewSelection();
    toast.success('Element deleted');
  }, [previewCode, applyElementDelete, clearLivePreviewSelection, setSelectedHTMLElement, recordManualPageEdit]);

  // Handle duplicate from floating toolbar - updates source code
  const handleFloatingDuplicate = useCallback((selector: string) => {
    const res = applyElementDuplicate(previewCode, selector);
    if (!res.ok) {
      toast.error('Could not duplicate element. Try selecting a different element.');
      return;
    }
    recordManualPageEdit('Manual · duplicate element', previewCode, res.code);
    setEditorCode(res.code);
    setPreviewCode(res.code);
    commitToolbarMutationRef.current?.(res.code, 'duplicate element');
    clearLivePreviewSelection();
    toast.success('Element duplicated');
  }, [previewCode, applyElementDuplicate, clearLivePreviewSelection, recordManualPageEdit]);

  // Handle move up - swap element with its previous sibling in TSX source
  const handleFloatingMoveUp = useCallback((selector: string) => {
    const res = withSourceManipulation(previewCode, (jsx) => {
      const bounds = findElementBoundsInJSX(jsx, selector);
      if (!bounds) return null;
      // Find the previous sibling element (scan backwards from bounds.start)
      const before = jsx.substring(0, bounds.start);
      // Find the last element ending before our start
      const prevMatch = before.match(/.*(<(\w+)\b[^>]*>[\s\S]*<\/\2\s*>)\s*$/);
      const prevSelfClose = before.match(/.*(<(\w+)\b[^>]*\/>)\s*$/);
      const prevEl = prevMatch || prevSelfClose;
      if (!prevEl) return null;
      const prevStart = before.lastIndexOf(prevEl[1]);
      if (prevStart === -1) return null;
      const current = jsx.substring(bounds.start, bounds.end);
      const prevElement = jsx.substring(prevStart, bounds.start);
      // Swap: current before previous
      return jsx.substring(0, prevStart) + current + prevElement + jsx.substring(bounds.end);
    });
    if (!res.ok) {
      toast.info('Already at the top');
      return;
    }
    recordManualPageEdit('Manual · move element up', previewCode, res.code);
    setEditorCode(res.code);
    setPreviewCode(res.code);
    commitToolbarMutationRef.current?.(res.code, 'move element up');
    clearLivePreviewSelection();
    toast.success('Moved up');
  }, [previewCode, clearLivePreviewSelection, recordManualPageEdit]);

  // Handle move down - swap element with its next sibling in TSX source
  const handleFloatingMoveDown = useCallback((selector: string) => {
    const res = withSourceManipulation(previewCode, (jsx) => {
      const bounds = findElementBoundsInJSX(jsx, selector);
      if (!bounds) return null;
      // Find the next sibling element (scan forward from bounds.end)
      const after = jsx.substring(bounds.end);
      const nextMatch = after.match(/^\s*<(\w+)\b/);
      if (!nextMatch) return null;
      const nextTagName = nextMatch[1];
      const nextStart = bounds.end + (after.length - after.trimStart().length);
      const nextEnd = findJSXClosingTag(jsx, nextStart, nextTagName);
      if (nextEnd === -1) return null;
      const current = jsx.substring(bounds.start, bounds.end);
      const whitespace = jsx.substring(bounds.end, nextStart);
      const nextElement = jsx.substring(nextStart, nextEnd);
      // Swap: next before current
      return jsx.substring(0, bounds.start) + nextElement + whitespace + current + jsx.substring(nextEnd);
    });
    if (!res.ok) {
      toast.info('Already at the bottom');
      return;
    }
    recordManualPageEdit('Manual · move element down', previewCode, res.code);
    setEditorCode(res.code);
    setPreviewCode(res.code);
    commitToolbarMutationRef.current?.(res.code, 'move element down');
    clearLivePreviewSelection();
    toast.success('Moved down');
  }, [previewCode, clearLivePreviewSelection, recordManualPageEdit]);

  // ── Layout-Intent Fast Path bridge for AIBuilderPanel ────────────────────
  // Bundles the deterministic layout-op handlers (selection-aware class edits,
  // section reorders, element move) into a single prop. The panel uses this to
  // short-circuit common "center / move / align" prompts without an LLM call.
  //
  // Move 2: Layout fast-path commits now additively funnel through
  // VFSCommitService (when the feature flag is on) via `commitLayoutFastPathRef`,
  // so deterministic edits also chain into the durable site_revisions ledger
  // instead of bypassing the canonical writer.
  const commitLayoutFastPathRef = useRef<((nextCode: string, summary: string) => void) | null>(null);
  const layoutOpsForAI = useMemo(() => ({
    selectionSelector: selectedHTMLElement?.selector ?? null,
    selectionSection: selectedHTMLElement?.section ?? null,
    findBounds: findElementBoundsInJSX,
    getPreviewCode: () => previewCode,
    applyLayoutCode: (nextCode: string, summary: string) => {
      if (!nextCode || nextCode === previewCode) return false;
      recordManualPageEdit(`Layout · ${summary}`, previewCode, nextCode);
      setPreviewCode(nextCode);
      setEditorCode(nextCode);
      toast.success(summary);
      commitLayoutFastPathRef.current?.(nextCode, summary);
      return true;
    },
    moveElementUp: () => {
      if (!selectedHTMLElement?.selector) {
        toast.info('Select an element first');
        return;
      }
      handleFloatingMoveUp(selectedHTMLElement.selector);
    },
    moveElementDown: () => {
      if (!selectedHTMLElement?.selector) {
        toast.info('Select an element first');
        return;
      }
      handleFloatingMoveDown(selectedHTMLElement.selector);
    },
  }), [previewCode, selectedHTMLElement, handleFloatingMoveUp, handleFloatingMoveDown]);

  // Template file management
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const templateFiles = useTemplateFiles();
  const savedTemplateRestoreStateRef = useRef(new Map<string, 'loading' | 'loaded'>());
  const frameworkDraftSweepStartedRef = useRef(false);
  useEffect(() => {
    if (frameworkDraftSweepStartedRef.current) return;
    frameworkDraftSweepStartedRef.current = true;

    void upgradeCurrentUserDraftFrameworkVfs().catch((error) => {
      console.warn('[WebBuilder] profile draft framework migration failed:', error);
    });
  }, []);

  // Canonical identity backfill. A wizard/launcher handoff (or a resumed
  // session) can arrive with only a subset of {projectId, businessId,
  // draftId}. Every commit gate (autosave, AI apply, presentation ops) is
  // all-or-nothing on that triple, so a single missing field silently
  // disables in-builder AI editing. Recover the missing pieces from the
  // canonical `builder_drafts` row instead of failing closed.
  const [identityBackfill, setIdentityBackfill] = useState<{
    projectId?: string;
    businessId?: string;
  }>({});

  // Pass 2 (identity hardening): resolved real projects.id for the active
  // draft. Used to construct BuilderIdentity at commit/deploy/AI-apply
  // boundaries instead of aliasing the draft id as projectId.
  const resolvedProjectId =
    templateFiles.currentProjectId ||
    (effectiveRouteState?.projectId as string | undefined) ||
    (effectiveRouteState?.returnProjectId as string | undefined) ||
    identityBackfill.projectId ||
    null;


  const hydrateSavedTemplate = useCallback((template: {
    id: string;
    name: string;
    description?: string | null;
    canvas_data?: Record<string, unknown> | null | unknown;
  }) => {
    const canvasData = (template.canvas_data || {}) as {
      html?: string;
      css?: string;
      previewCode?: string;
      js?: string;
      vfsFiles?: Record<string, string>;
      entryPoint?: string;
      activePagePath?: string;
      canonicalPlayground?: {
        pageRegistry?: import('@/types/pageRegistry').PageRegistry;
        creatorData?: import('@/types/creatorData').CreatorData;
        bindings?: Record<string, import('@/types/playground').PlaygroundBinding>;
        calendars?: Record<string, import('@/types/playground').PlaygroundCalendar>;
        popups?: Record<string, import('@/types/playground').PlaygroundPopup>;
      };
      siteBundleSnapshot?: {
        pageRegistry?: import('@/types/pageRegistry').PageRegistry;
        creatorData?: import('@/types/creatorData').CreatorData;
        bindings?: Record<string, import('@/types/playground').PlaygroundBinding>;
        calendars?: Record<string, import('@/types/playground').PlaygroundCalendar>;
        popups?: Record<string, import('@/types/playground').PlaygroundPopup>;
      };
      runtimeManifest?: RuntimeManifest;
      businessRuntime?: BusinessRuntimeContract;
      businessId?: string;
      projectId?: string;
      draftId?: string;
      siteId?: string;
    };
    setPersistedResumeState({
      businessId: canvasData.businessId,
      projectId: canvasData.projectId,
      draftId: canvasData.draftId,
      siteId: canvasData.siteId,
      entryPoint: canvasData.entryPoint,
      runtimeManifest: canvasData.runtimeManifest,
      siteBundleSnapshot: canvasData.siteBundleSnapshot as SiteBundleSnapshot | undefined,
      businessRuntime: canvasData.businessRuntime,
    });
    const persistedPlayground = canvasData.canonicalPlayground || (
      canvasData.siteBundleSnapshot ? {
        pageRegistry: canvasData.siteBundleSnapshot.pageRegistry,
        creatorData: canvasData.siteBundleSnapshot.creatorData,
        bindings: canvasData.siteBundleSnapshot.bindings,
        calendars: canvasData.siteBundleSnapshot.calendars,
        popups: canvasData.siteBundleSnapshot.popups,
      } : null
    );

    if (persistedPlayground?.pageRegistry || persistedPlayground?.creatorData) {
      creatorPlayground.hydrateCanonicalState({
        pageRegistry: persistedPlayground.pageRegistry,
        creatorData: persistedPlayground.creatorData,
      });
    }
    if (persistedPlayground?.bindings) setPlaygroundBindings(persistedPlayground.bindings);
    if (persistedPlayground?.calendars) setPlaygroundCalendars(persistedPlayground.calendars);
    if (persistedPlayground?.popups) setPlaygroundPopups(persistedPlayground.popups);

    if (canvasData?.vfsFiles && Object.keys(canvasData.vfsFiles).length > 0) {
      const recovery = readBuilderRecoverySnapshot(template.id);
      const shouldReplayRecovery = Boolean(
        recovery?.pendingRemote &&
        recovery.templateId === template.id &&
        Object.keys(recovery.vfsFiles).length > 0,
      );
      const vfsFiles = shouldReplayRecovery ? recovery!.vfsFiles : canvasData.vfsFiles;
      const entry = canvasData.entryPoint || launchEntryPoint;
      const preferred = canvasData.activePagePath || entry;
      importBuilderFiles(vfsFiles, {
        preferredPath: preferred,
        entryPoint: entry,
        replace: true,
      });
      if (shouldReplayRecovery && recovery) {
        setPreviewCode(recovery.code);
        setEditorCode(recovery.editorCode);
        toast.info('Recovered interrupted edits', {
          description: 'Your latest local AI changes are being synced back to this project.',
        });
      }
      if (canvasData.activePagePath) {
        setActivePagePath(canvasData.activePagePath);
      }
      setCurrentTemplateName(template.name);
      setSaveProjectName(template.name);
      setProjectDisplayName(template.name);
      setSaveProjectDescription(template.description || '');
      setBuilderMode('preview');
      setShowLauncher(false);
      return true;
    }

    let code = canvasData?.previewCode || canvasData?.html || '';
    if (!code) {
      return false;
    }

    const separateCss = canvasData?.css || '';
    if (separateCss && !code.includes(separateCss.substring(0, 50))) {
      if (code.includes('</head>')) {
        code = code.replace('</head>', `<style>\n${separateCss}\n</style>\n</head>`);
      } else {
        code = `<style>\n${separateCss}\n</style>\n${code}`;
      }
    }
    const separateJs = canvasData?.js || '';
    if (separateJs && !code.includes(separateJs.substring(0, 50))) {
      const scriptTag = `<script>\n${separateJs}\n</script>`;
      if (code.includes('</body>')) {
        code = code.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        code = code + `\n${scriptTag}`;
      }
    }
    setEditorCode(code);
    setPreviewCode(code);
    setCurrentTemplateName(template.name);
    setSaveProjectName(template.name);
    setProjectDisplayName(template.name);
    setSaveProjectDescription(template.description || '');
    setShowLauncher(false);
    return true;
  // importBuilderFiles is declared after this hook in the file; removing it from deps
  // avoids a temporal dead zone (TDZ) ReferenceError at render time. The closure body
  // captures it correctly because it is only invoked asynchronously (inside async IIFEs)
  // by which point importBuilderFiles is fully initialized.
  }, [creatorPlayground, launchEntryPoint]);
  
  // Load saved project from URL parameter on mount.
  // Hydrates the FULL VFS (multi-page, router, entry point) when present;
  // falls back to single-file legacy load for legacy design_templates rows.
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const templateId = searchParams.get('id');
    const hasStructuredRuntimeLaunch = Boolean(
      effectiveRouteState?.vfsFiles ||
      effectiveRouteState?.siteBundle ||
      effectiveRouteState?.generatedCode ||
      effectiveRouteState?.generatedTemplate,
    );
    // A wizard route can retain a stale ?id= value from a prior builder tab.
    // Its VFS is already the authoritative project; querying drafts here can
    // fail independently and incorrectly toast "Failed to load project".
    if (
      !templateId ||
      hasStructuredRuntimeLaunch ||
      savedTemplateRestoreStateRef.current.has(templateId)
    ) return;

    let cancelled = false;
    savedTemplateRestoreStateRef.current.set(templateId, 'loading');
    (async () => {
      const template = await templateFiles.loadTemplate(templateId);
      if (!template || cancelled) {
        savedTemplateRestoreStateRef.current.delete(templateId);
        return;
      }
      if (!hydrateSavedTemplate(template)) {
        savedTemplateRestoreStateRef.current.delete(templateId);
        return;
      }
      savedTemplateRestoreStateRef.current.set(templateId, 'loaded');
      toast.success(`Opened "${template.name}"`, {
        id: `project-restored-${templateId}`,
        description: 'Project restored from your saved state',
        duration: 4_000,
      });
    })();

    return () => { cancelled = true; };
  }, [location.search, effectiveRouteState]);

  // Get full cloud context from location state (from CloudProjects or System Launcher)
  const projectId = effectiveRouteState?.projectId;
  const systemType = effectiveRouteState?.systemType;
  const systemName = effectiveRouteState?.systemName;
  const routeBusinessId = effectiveRouteState?.businessId;
  const manifestIdFromState = effectiveRouteState?.manifestId;
  const projectSlug = effectiveRouteState?.projectSlug;
  const projectNameFromState = effectiveRouteState?.projectName;
  const publishStatusFromState = effectiveRouteState?.publishStatus;
  const customDomainFromState = effectiveRouteState?.customDomain;

  // Self-healing businessId recovery. Some entry paths into the Web Builder
  // (e.g. resuming a project by projectId only, without the full launcher
  // route state) never populate effectiveRouteState.businessId. Every save/
  // commit path and the cloud-state loader below are gated on businessId
  // being truthy, so a missing value here silently "disconnects" the
  // session from its cloud workspace — autosave/commits no-op with no
  // user-facing error, and cloud settings never load, even though the
  // project's real business_id is one lookup away via projectId.
  const [recoveredBusinessId, setRecoveredBusinessId] = useState<string | null>(null);
  useEffect(() => {
    if (routeBusinessId || !projectId || recoveredBusinessId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getProjectByIdCompat(projectId);
        if (!cancelled && data?.business_id) {
          console.warn(
            '[WebBuilder] businessId missing from route state — recovered from project record:',
            data.business_id,
          );
          setRecoveredBusinessId(data.business_id);
        }
      } catch (err) {
        console.warn('[WebBuilder] Failed to recover businessId from project record:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [routeBusinessId, projectId, recoveredBusinessId]);
  const businessId = routeBusinessId || recoveredBusinessId || identityBackfill.businessId || undefined;

  // Backfill the canonical triple from the draft row (and, when the draft id
  // itself is unknown, from the project row). Runs once per missing field so
  // AI edits / autosave stop failing with "Canonical project identity is
  // unavailable" after a wizard handoff that only carried partial state.
  useEffect(() => {
    const knownProjectId = resolvedProjectId || projectId || null;
    const needsProject = !knownProjectId;
    const needsBusiness = !businessId;
    const needsDraft = !currentDraftId;
    if (!needsProject && !needsBusiness && !needsDraft) return;

    let cancelled = false;
    (async () => {
      try {
        let draftId = currentDraftId || templateFiles.currentDraftId || null;
        if (!draftId && knownProjectId) {
          draftId = await findBuilderDraftIdForProject({
            projectId: knownProjectId,
            projectName: projectNameFromState,
            businessId,
          });
        }
        if (cancelled || !draftId) return;

        if (!currentDraftId) setCurrentDraftId(draftId);
        if (!needsProject && !needsBusiness) return;

        const { data } = await supabaseClient
          .from('builder_drafts')
          .select('project_id, business_id')
          .eq('id', draftId)
          .maybeSingle();
        if (cancelled || !data) return;

        setIdentityBackfill((prev) => {
          const next = { ...prev };
          if (needsProject && data.project_id) next.projectId = data.project_id;
          if (needsBusiness && data.business_id) next.businessId = data.business_id;
          return next.projectId === prev.projectId && next.businessId === prev.businessId ? prev : next;
        });
      } catch (err) {
        console.warn('[WebBuilder] canonical identity backfill failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [
    businessId,
    currentDraftId,
    projectId,
    projectNameFromState,
    resolvedProjectId,
    templateFiles.currentDraftId,
  ]);


  // Local editable project name. Seeded from route state, kept in sync if the
  // user (or another tab) renames the project via CloudProjects.
  const [projectDisplayName, setProjectDisplayName] = useState<string>(projectNameFromState || '');
  const [renamingProject, setRenamingProject] = useState(false);
  useEffect(() => {
    if (projectNameFromState) setProjectDisplayName(projectNameFromState);
  }, [projectNameFromState]);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { projectId?: string; name?: string } | undefined;
      if (!detail?.projectId || !detail.name) return;
      if (projectId && detail.projectId === projectId) {
        setProjectDisplayName(detail.name);
      }
    };
    window.addEventListener('project:renamed', handler);
    return () => window.removeEventListener('project:renamed', handler);
  }, [projectId]);

  const handleRenameProject = useCallback(async (nextName: string) => {
    const trimmed = nextName.trim();
    if (!projectId || !trimmed || trimmed === projectDisplayName) return;
    setRenamingProject(true);
    try {
      const { renameProjectCompat } = await import('@/services/projectSchemaCompat');
      const { error } = await renameProjectCompat(projectId, trimmed);
      if (error) throw error;
      setProjectDisplayName(trimmed);
      try {
        window.dispatchEvent(new CustomEvent('project:renamed', {
          detail: { projectId, name: trimmed },
        }));
      } catch { /* noop */ }
    } catch (err) {
      console.warn('[WebBuilder] rename failed:', err);
    } finally {
      setRenamingProject(false);
    }
  }, [projectId, projectDisplayName]);

  // ── Catalog wiring (Track B end-to-end) ──
  // Derive sectionId → requirementKey map from the launcher snapshot so
  // CatalogInspectorPanel + CatalogReadinessGate know each bound section's
  // minRows requirement without a round-trip.
  const catalogSectionTypeMap = useMemo(() => {
    const snapshot = effectiveRouteState?.siteBundleSnapshot;
    if (!snapshot) return {} as Record<string, string>;
    try {
      return buildSectionTypeMap(snapshot);
    } catch {
      return {};
    }
  }, [effectiveRouteState?.siteBundleSnapshot]);

  // Re-emit site_data_bindings whenever the canonical pipeline commits a new
  // snapshot (AI Builder edit, Playground recompile, republish). The wizard
  // launcher already emits on first launch; this keeps bindings in sync for
  // every subsequent structural change.
  useEffect(() => {
    if (!businessId || !projectId) return;
    const handler = async (e: Event) => {
      const snapshot =
        (e as CustomEvent).detail?.siteBundleSnapshot ||
        effectiveRouteState?.siteBundleSnapshot;
      if (!snapshot?.pageRegistry?.pages) return;
      try {
        const { autoEmitSectionBindings } = await import(
          '@/services/autoEmitSectionBindings'
        );
        const res = await autoEmitSectionBindings({
          businessId,
          projectId,
          snapshot,
        });
        if (res.emitted > 0) {
          try {
            window.postMessage(
              { type: 'CATALOG_BINDINGS_CHANGED', projectId },
              '*',
            );
          } catch { /* noop */ }
        }
      } catch (err) {
        console.warn('[WebBuilder] autoEmitSectionBindings on commit failed', err);
      }
    };
    window.addEventListener('unison:pipeline:commit', handler);
    return () => window.removeEventListener('unison:pipeline:commit', handler);
  }, [businessId, projectId, effectiveRouteState?.siteBundleSnapshot]);



  const [previewCartVersion, setPreviewCartVersion] = useState(0);
  const previewCartManager = useMemo(
    () =>
      createBrowserCartManager({
        businessId: businessId || undefined,
        siteId: projectId || undefined,
      }),
    [businessId, projectId],
  );
  const previewCart = useMemo(
    () =>
      readBrowserCart({
        businessId: businessId || undefined,
        siteId: projectId || undefined,
      }),
    [businessId, projectId, previewCartVersion],
  );

  useEffect(() => {
    const urlId = new URLSearchParams(location.search).get('id');
    if (!projectId || urlId || routeStateHasStructuredProject || templateFiles.currentDraftId) {
      return;
    }

    let cancelled = false;

    (async () => {
      const draftId = await findBuilderDraftIdForProject({
        projectId,
        projectName: projectNameFromState,
        businessId,
      });

      if (!draftId || cancelled) {
        return;
      }

      const template = await templateFiles.loadTemplate(draftId);
      if (!template || cancelled || !hydrateSavedTemplate(template)) {
        return;
      }

      toast.success(`Opened "${template.name}"`, {
        description: 'Project restored from Cloud workspace',
      });
    })();

    return () => { cancelled = true; };
  }, [
    businessId,
    hydrateSavedTemplate,
    location.search,
    projectId,
    projectNameFromState,
    routeStateHasStructuredProject,
    templateFiles.currentDraftId,
    templateFiles.loadTemplate,
  ]);

  // Post-wizard refresh recovery: when no launch context, no route state, and no
  // projectId are available (e.g. user refreshed /web-builder after wizard generation),
  // hydrate from the most recent builder_drafts row instead of falling back to the
  // deterministic editorial seed. Enforces the "No Fallback After Wizard" contract.
  const recoveredDraftRef = useRef(false);
  useEffect(() => {
    const urlId = new URLSearchParams(location.search).get('id');
    if (recoveredDraftRef.current) return;
    if (urlId || projectId || effectiveRouteState || templateFiles.currentDraftId) return;

    let cancelled = false;
    recoveredDraftRef.current = true;

    (async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user || cancelled) return;

        const { data, error } = await supabaseClient
          .from('builder_drafts')
          .select('id, name')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error || cancelled || !data || data.length === 0) return;

        const draftId = data[0].id as string;
        const template = await templateFiles.loadTemplate(draftId);
        if (!template || cancelled || !hydrateSavedTemplate(template)) return;

        toast.success(`Restored "${template.name}"`, {
          description: 'Continuing your last session',
        });
      } catch (err) {
        console.warn('[WebBuilder] post-refresh draft recovery failed', err);
      }
    })();

    return () => { cancelled = true; };
  }, [
    projectId,
    effectiveRouteState,
    location.search,
    templateFiles.currentDraftId,
    templateFiles.loadTemplate,
    hydrateSavedTemplate,
  ]);

  const loadedCanonicalGraphProjectRef = useRef<string | null>(null);
  const hydrateCanonicalPlayground = creatorPlayground.hydrateCanonicalState;
  const creatorPlaygroundStateRef = useRef({
    pageRegistry: creatorPlayground.pageRegistry,
    creatorData: creatorPlayground.creatorData,
  });
  creatorPlaygroundStateRef.current = {
    pageRegistry: creatorPlayground.pageRegistry,
    creatorData: creatorPlayground.creatorData,
  };

  useEffect(() => {
    if (!projectId || loadedCanonicalGraphProjectRef.current === projectId) {
      return;
    }

    let cancelled = false;

    (async () => {
      const componentInstances = await loadCanonicalComponentGraph(projectId);
      if (cancelled) return;

      loadedCanonicalGraphProjectRef.current = projectId;
      if (!componentInstances || Object.keys(componentInstances).length === 0) {
        return;
      }

      const currentPlayground = creatorPlaygroundStateRef.current;
      hydrateCanonicalPlayground({
        pageRegistry: currentPlayground.pageRegistry,
        creatorData: {
          ...currentPlayground.creatorData,
          componentInstances: {
            ...currentPlayground.creatorData.componentInstances,
            ...componentInstances,
          },
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, hydrateCanonicalPlayground]);
  // Business blueprint context forwarded from SystemsAIPanel for context-aware in-builder AI
  const systemsBuildContextFromState = effectiveRouteState?.systemsBuildContext ?? null;
  // Durable WizardSeed forwarded into AIBuilderPanel so every Lane B turn shares
  // the same seed / memory / intent contract that drove the original launch.
  const wizardSeedFromState = effectiveRouteState?.wizardSeed ?? null;
  
  // Derive compiled contract from navigation state for SystemHealthPanel & preview gating
  const compiledContract = useCompiledContract(
    effectiveRouteState ? {
      systemsBuildContext: systemsBuildContextFromState ?? undefined,
      systemType: systemType ?? undefined,
      templateName: effectiveRouteState.templateName,
    } : null,
  );
  
  // Virtual file system for code editor
  const virtualFS = useVFS();
  // Destructure stable callbacks for use in dependency arrays (avoids re-render loops)
  const {
    nodes: vfsNodes,
    getSandpackFiles,
    importFiles: vfsImportFiles,
    replaceFiles: vfsReplaceFiles,
    updateFileContent: vfsUpdateFileContent,
    resetToEmpty: vfsResetToEmpty,
    loadDefaultTemplate: vfsLoadDefaultTemplate,
  } = virtualFS;

  // ──────────────────────────────────────────────────────────────
  // Unison Data Generator (Phase 1)
  // Mirrors CreatorData → /src/unison/data.ts in the VFS so that
  // generated pages/widgets can read business content from a
  // single canonical source instead of hardcoded arrays.
  // ──────────────────────────────────────────────────────────────
  const creatorDataForUnison = creatorPlayground.creatorData;
  useEffect(() => {
    // Publish to the canonical registry FIRST so the preview compiler can
    // re-stamp protected files on every build (self-healing against AI edits).
    publishCreatorDataForUnison(creatorDataForUnison);
    // Do NOT write Unison data modules into the live VFS here. On a fresh
    // /web-builder mount this effect can run before launcher files hydrate;
    // writing only /src/unison/* into an otherwise empty VFS makes preview pick
    // a data module as the app entry and fall into fallback/diagnostic output.
    // Preview compile still overlays canonical Unison files without making them
    // authoritative site entry files.
  }, [creatorDataForUnison, vfsImportFiles]);

  // AI → VFS orchestrator — auto-resolves dependencies and syncs to preview
  const aiVFS = useAIVFS(virtualFS, livePreviewRef);

  // Mirror of the current revision id, declared before the capability approval
  // callback so it can read the latest value without a TDZ reference to the
  // state declared further down.
  const currentRevisionIdRef = useRef<string>(effectiveRouteState?.revisionId || '');


  // Shared capability approval transaction: backend migration first, then the
  // gated VFS commit. Mounted on BOTH the desktop and mobile AI panels so the
  // full-stack approval UI is never missing on one of them.
  const approveCapabilityPlanFromPanel = useCallback(async (
    plan: Parameters<NonNullable<React.ComponentProps<typeof AIBuilderPanel>['onApproveCapabilityPlan']>>[0],
    resolution: Parameters<NonNullable<React.ComponentProps<typeof AIBuilderPanel>['onApproveCapabilityPlan']>>[1],
  ) => {
                  if (!businessId || !currentDraftId) {
                    return { success: false, error: 'A saved business project is required to install capabilities.' };
                  }
                  if (resolution.unresolved.length > 0) {
                    return { success: false, error: 'Resolve every requested UI target before approval.' };
                  }
                  try {
                    const { data: { user } } = await supabaseClient.auth.getUser();
                    if (!user) return { success: false, error: 'Your session has expired. Sign in again.' };
                    const approved = approveCapabilityPlan(plan, {
                      approvedBy: user.id,
                      approvedAt: new Date().toISOString(),
                    });

                    // Backend first: grants, RLS and policies are applied (in a
                    // single transaction, server-side) before any frontend
                    // patch lands, so the committed UI can never read or write
                    // tables the database has not been prepared for.
                    const migration = await applyCapabilityMigration({
                      packs: plan.packs,
                      businessId,
                      projectId: resolvedProjectId || currentDraftId,
                      summary: plan.proposal?.summary,
                    });
                    if (!migration.success) {
                      return {
                        success: false,
                        error: migration.error
                          ? `Backend setup failed, nothing was changed: ${migration.error}`
                          : 'Backend setup failed, nothing was changed.',
                      };
                    }

                    const patch = approvedCapabilityPlanToPatchPlan(approved);
                    const beforeFiles = virtualFS.getSandpackFiles();
                    for (const [path, contents] of Object.entries(resolution.files)) {
                      if (beforeFiles[path] !== contents) patch.fileOps.push({ type: 'replace', path, contents });
                    }
                    const snapshot = effectiveRouteState?.siteBundleSnapshot ?? null;
                    const commit = await commitMutation({
                      source: 'ai-builder',
                      identity: {
                        userId: user.id,
                        businessId,
                        projectId: resolvedProjectId || currentDraftId,
                        draftId: currentDraftId,
                        revisionId: currentRevisionIdRef.current,
                        sessionId: `web-builder:${currentDraftId}`,
                      },
                      current: {
                        vfsFiles: beforeFiles,
                        siteBundleSnapshot: snapshot ?? undefined,
                        playground: {
                          pageRegistry: creatorPlayground.pageRegistry,
                          creatorData: creatorPlayground.creatorData,
                          calendars: snapshot?.calendars ?? {},
                          popups: snapshot?.popups ?? {},
                        } as never,
                      },
                      patch,
                      options: {
                        requirePreviewPass: true,
                        requireReadinessPass: true,
                        industry: snapshot?.industry,
                        themePresetId: snapshot?.meta.themePresetId ?? undefined,
                        themeTokens: snapshot?.themeTokens,
                      },
                    });
                    virtualFS.importFiles(commit.vfsFiles);
                    if (commit.persistedRevisionId) setCurrentRevisionId(commit.persistedRevisionId);
                    for (const binding of resolution.resolved) {
                      const page = Object.values(creatorPlayground.pageRegistry.pages)
                        .find((candidate) => candidate.filePath === binding.filePath);
                      const bindingResult = await applyButtonBinding({
                        businessId,
                        projectId: resolvedProjectId || currentDraftId,
                        pagePath: page?.path ?? '/',
                        slot: binding.slot,
                        intent: binding.intent,
                      }, {
                        pageRegistry: creatorPlayground.pageRegistry,
                        slotExists: () => true,
                      });
                      if (!bindingResult.ok) {
                        return {
                          success: false,
                          error: 'message' in bindingResult ? bindingResult.message : 'Unable to persist the intent binding.',
                        };
                      }
                    }
                    return { success: true };
                  } catch (error) {
                    return { success: false, error: error instanceof Error ? error.message : 'Capability transaction failed.' };
                  }
  }, [businessId, currentDraftId, resolvedProjectId, virtualFS, effectiveRouteState, creatorPlayground]);
  
  // Site builder orchestrator — provides site graph navigation, brand system, and intent routing
  // Uses project/business IDs from location state; no-ops if unavailable
  const siteBuilderBusinessId = businessId || getOrCreatePreviewBusinessId(systemType);
  const siteBuilderIndustry = (systemType as any) || 'general';
  const siteBuilderRef = useRef<UseSiteBuilderReturn | null>(null);
  const siteBuilderOnReady = useCallback(() => {
    console.log('[WebBuilder] Site builder ready');
  }, []);
  const siteBuilder = useSiteBuilder({
    projectId: projectId || 'preview',
    businessId: siteBuilderBusinessId,
    industry: siteBuilderIndustry,
    autoGenerateAll: false,
    debug: false,
    onReady: siteBuilderOnReady,
  });
  siteBuilderRef.current = siteBuilder;
  
  // User design profile for personalized AI generation
  const { profile: userDesignProfile, fetchProfile: fetchDesignProfile, hasProfile: hasDesignProfile } = useUserDesignProfile();
  
  // Fetch design profile on mount
  useEffect(() => {
    fetchDesignProfile();
  }, [fetchDesignProfile]);
  
  // Track modified and AI-generated files for modern UI
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());
  const [aiGeneratedFiles, setAIGeneratedFiles] = useState<Set<string>>(new Set());
  const [recentlyChangedFiles, setRecentlyChangedFiles] = useState<Set<string>>(new Set());
  const originalFileContents = useRef<Map<string, string>>(new Map());
  
  // Debounce timer for automatic intent re-wiring when button labels change
  const intentRewireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store latest rewire function in ref to avoid stale closures in setTimeout
  const autoRewireHtmlIntentsRef = useRef<((fileId: string, content: string) => void) | null>(null);
  
  // Multi-page navigation state — split into three concerns
  const [activePagePath, setActivePagePath] = useState<string>(launchEntryPoint);
  // Keep snapshot ref synced so manual-edit history captures correct project + page
  snapshotCtxRef.current = { projectId, activePagePath };
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activePreviewRoute, setActivePreviewRoute] = useState<string>('/');
  
  // Dynamic page keys for SEO panel (derived from VFS)
  const vfsPageKeys = useMemo(() => {
    const registryPages = Object.values(creatorPlayground.pageRegistry.pages);
    if (registryPages.length > 0) {
      return registryPages
        .slice()
        .sort((a, b) => a.navOrder - b.navOrder)
        .map((page) => {
          if (page.isHome) return 'home';
          return page.path.replace(/^\//, '') || page.title.toLowerCase().replace(/\s+/g, '-');
        });
    }

    const vfsFiles = virtualFS.getSandpackFiles();
    const fallbackPaths = Object.keys(vfsFiles).filter((path) => /\/pages\/.+\.(tsx|jsx)$/.test(path));
    if (fallbackPaths.length === 0) return ['home'];

    return fallbackPaths.map((path) => path.split('/').pop()?.replace(/\.(tsx|jsx)$/, '')?.toLowerCase() || 'page');
  }, [creatorPlayground.pageRegistry, virtualFS]);

  // Active site plan ref for intent resolution
  const activeSitePlanRef = useRef<GeneratedSitePlan | null>(null);

  // Hydrate PageRegistry from site topology plan (if launcher provided one),
  // otherwise seed a default "Home" page.
  useEffect(() => {
    if (Object.keys(creatorPlayground.pageRegistry.pages).length > 0) return;

    const navState = effectiveRouteState;
    const snapshot = (navState as any)?.siteBundleSnapshot;
    const materializedState = (navState as any)?.materializedPlayground;
    const canonicalRegistry = snapshot?.pageRegistry || materializedState?.pageRegistry || null;
    let sitePlan = navState?.sitePlan || null;

    // Try recovering from session storage if not in nav state
    if (!sitePlan) {
      sitePlan = recoverTopology();
    }

    if (!sitePlan && navState?.fromLauncher) {
      console.error('[WebBuilder] Launcher handoff missing 4-step wizard sitePlan; refusing stale topology fallback.');
      toast.error('Launcher handoff is missing the wizard site plan. Minimal fallback is blocked.');
      return;
    }

    // If still no plan, try DB recovery (async, will re-run effect logic)
    if (!sitePlan) {
      recoverTopologyFromDb().then(dbPlan => {
        if (dbPlan && dbPlan.pages.length > 0 && Object.keys(creatorPlayground.pageRegistry.pages).length <= 1) {
          persistTopology(dbPlan);
          activeSitePlanRef.current = dbPlan;
          const registry = populateRegistryFromTopology(dbPlan);
          creatorPlayground.hydrateCanonicalState({ pageRegistry: registry });
          console.log('[WebBuilder] Recovered topology from DB without scaffolding fallback pages');
        }
      });
      return; // will be handled by async callback
    }

    if (canonicalRegistry) {
      creatorPlayground.hydrateCanonicalState({
        pageRegistry: canonicalRegistry,
        creatorData: materializedState?.creatorData,
      });
      console.log(`[WebBuilder] Hydrated canonical PageRegistry: ${Object.keys(canonicalRegistry.pages).length} pages`);
    }

    if (sitePlan && sitePlan.pages.length > 0) {
      // Persist for refresh survival (session + DB)
      persistTopology(sitePlan);
      persistTopologyToDb(sitePlan).then(id => {
        if (id) console.log('[WebBuilder] Topology persisted to DB, draft:', id);
      });
      activeSitePlanRef.current = sitePlan;

      if (!canonicalRegistry) {
        const registry = populateRegistryFromTopology(sitePlan);
        creatorPlayground.hydrateCanonicalState({ pageRegistry: registry });
        console.log(`[WebBuilder] Hydrated PageRegistry from topology: ${Object.keys(registry.pages).length} pages, ${sitePlan.funnels.length} funnels`);
      }

      // Hydrate playground state — prefer siteBundleSnapshot (canonical pipeline) over raw materializedPlayground
      const canonicalState = snapshot || materializedState;
      if (canonicalState) {
        const bindingsSource = snapshot?.bindings || materializedState.bindings;
        const calendarsSource = snapshot?.calendars || materializedState.calendars;
        const popupsSource = snapshot?.popups || materializedState.popups;
        if (bindingsSource) setPlaygroundBindings(bindingsSource);
        if (calendarsSource) setPlaygroundCalendars(calendarsSource);
        if (popupsSource) setPlaygroundPopups(popupsSource);
        console.log(`[WebBuilder] Hydrated from ${snapshot ? 'SiteBundleSnapshot (canonical)' : 'materializedPlayground'}: ${Object.keys(bindingsSource || {}).length} bindings, ${Object.keys(calendarsSource || {}).length} calendars, ${Object.keys(popupsSource || {}).length} popups`);
      }
      if (sitePlan.validationErrors?.length) {
        console.warn('[WebBuilder] Topology validation warnings:', sitePlan.validationErrors);
      }

      console.log('[WebBuilder] Topology hydrated without scaffolded fallback pages');
    } else if (snapshot?.vfsFiles && Object.keys(snapshot.vfsFiles).length > 0) {
      const existingFiles = virtualFS.getSandpackFiles();
      const missingSnapshotFiles = Object.fromEntries(
        Object.entries(snapshot.vfsFiles).filter(([path]) => !existingFiles[path])
      ) as Record<string, string>;
      if (Object.keys(missingSnapshotFiles).length > 0) {
        virtualFS.importFiles(missingSnapshotFiles);
        console.log(`[WebBuilder] Imported ${Object.keys(missingSnapshotFiles).length} canonical snapshot files`);
      }
    } else if (navState?.fromLauncher) {
      console.error('[WebBuilder] Launcher handoff missing SiteBundle/PageRegistry; refusing Home-only fallback.');
      toast.error('Launcher handoff is missing canonical wizard state. Minimal fallback is blocked.');
    } else {
      // Fallback: seed single Home page
      creatorPlayground.addPage("Home", "/", "home", { showInNav: true, isHome: true });
    }
  }, []); // run once on mount

  // Route conflict detection from playground registry
  const routeConflicts = useMemo(
    () => detectRouteConflicts(creatorPlayground.pageRegistry),
    [creatorPlayground.pageRegistry]
  );

  useEffect(() => {
    const pages = Object.values(creatorPlayground.pageRegistry.pages);
    if (pages.length === 0) return;

    const resolvedPage =
      pages.find((page) => page.filePath === activePagePath) ||
      pages.find((page) => page.isHome && activePagePath === launchEntryPoint) ||
      null;

    const nextPageId = resolvedPage?.pageId || null;
    const nextRoute = resolvedPage?.isHome ? '/' : (resolvedPage?.path || '/');

    setActivePageId((prev) => (prev === nextPageId ? prev : nextPageId));
    setActivePreviewRoute((prev) => (prev === nextRoute ? prev : nextRoute));
  }, [activePagePath, creatorPlayground.pageRegistry, launchEntryPoint]);

  // Feed route conflicts + topology validation into diagnostics aggregator
  useEffect(() => {
    const items: Array<{ domain: 'page-registry'; message: string; severity?: 'error' | 'warning'; code?: string }> = [];

    // Route conflicts
    for (const conflict of routeConflicts) {
      items.push({
        domain: 'page-registry',
        message: `Duplicate route detected: "${conflict}" — multiple pages share the same path`,
        severity: 'error',
        code: 'ROUTE_CONFLICT',
      });
    }

    // Topology validation errors (from site plan)
    const plan = activeSitePlanRef.current;
    if (plan?.validationErrors?.length) {
      for (const err of plan.validationErrors) {
        items.push({
          domain: 'page-registry',
          message: err,
          severity: 'warning',
          code: 'TOPOLOGY_VALIDATION',
        });
      }
    }

    // Check for missing VFS files (pages in registry but not in VFS)
    const vfsFiles = virtualFS.getSandpackFiles();
    for (const page of Object.values(creatorPlayground.pageRegistry.pages)) {
      if (page.filePath && !vfsFiles[page.filePath]) {
        items.push({
          domain: 'page-registry',
          message: `Page "${page.title}" (${page.filePath}) is registered but missing from VFS`,
          severity: 'warning',
          code: 'MISSING_VFS_FILE',
        });
      }
    }

    diagnosticsAggregator.ingestUnisonDiagnostics(items);
  }, [routeConflicts, creatorPlayground.pageRegistry, virtualFS.nodes]);

  // ──────────────────────────────────────────────────────────────────────────
  // Canonical Router Sync — single source of truth for /src/App.tsx
  //
  // The Creator Playground PageRegistry is authoritative. Every structural
  // mutation (add / remove / rename / reorder / setHome / showInNav) bumps
  // pageRegistry.version. This effect re-emits the deterministic router from
  // topologyRouterGenerator into the VFS so navigation, intent bindings, and
  // the preview stay perfectly in sync. No AI, no fallback — pure derivation.
  // ──────────────────────────────────────────────────────────────────────────
  // Key the sync ref by draftId:registryVersion so switching drafts ALWAYS
  // re-derives the canonical router for the new draft. A bare version counter
  // would bleed across drafts (draft A v3 → draft B v3 would no-op and leave
  // draft A's router persisted under draft B).
  const lastSyncedRouterKeyRef = useRef<string>('');
  useEffect(() => {
    const registry = creatorPlayground.pageRegistry;
    if (!registry || Object.keys(registry.pages).length === 0) return;
    const draftKey = templateFiles.currentDraftId || '__no-draft__';
    const syncKey = `${draftKey}:${registry.version}`;
    if (lastSyncedRouterKeyRef.current === syncKey) return;
    try {
      const currentFiles = virtualFS.getSandpackFiles();
      const filesToImport: Record<string, string> = {};

      // Never synthesize Web Builder placeholder pages during launcher/Unison
      // hydration. The router must only target files that actually exist in the
      // generated wizard VFS; otherwise placeholder/fallback pages can take over
      // the preview after refresh.
      const mergedForRouter = currentFiles;
      const result = syncRouterAndValidate(registry, mergedForRouter);
      // Registry versions may bump while hydration republishes equivalent
      // topology. Avoid importing byte-identical router source: even a no-op
      // VFS write can publish another nodes snapshot and delay first paint.
      if (result.routerCode && currentFiles[launchEntryPoint] !== result.routerCode) {
        filesToImport[launchEntryPoint] = result.routerCode;
      }
      if (Object.keys(filesToImport).length > 0) {
        virtualFS.importFiles(filesToImport);
      }
      lastSyncedRouterKeyRef.current = syncKey;
      if (result.validation && !result.validation.valid) {
        console.warn('[WebBuilder] Topology validation issues after registry sync:', result.validation.issues);
      }
    } catch (err) {
      console.error('[WebBuilder] Canonical router sync failed:', err);
    }
  }, [creatorPlayground.pageRegistry, launchEntryPoint, virtualFS, templateFiles.currentDraftId]);

  // Page manifest for async multi-page navigation (all HTML pages from VFS)
  const pageManifest = useMemo(() => {
    const vfsFiles = virtualFS.getSandpackFiles();
    const manifest: Record<string, string> = {};
    Object.entries(vfsFiles).forEach(([path, content]) => {
      if (path.endsWith('.tsx') && (path.includes('/pages/') || path === launchEntryPoint)) {
        manifest[path] = content;
      }
    });
    return manifest;
  }, [launchEntryPoint, virtualFS.nodes]);
  
  // Sync page manifest to preview iframe when VFS changes
  // This enables instant in-place navigation (no new tabs)
  // Page manifest sync is handled via VFS router generation — no separate sync needed

  // Router regeneration handles manifest sync — no separate sync effect needed
  
  const openBuilderFile = useCallback((path: string, contentOverride?: string) => {
    setActivePagePath(path);
    const pageContent = contentOverride ?? getSandpackFiles()[path];
    if (pageContent) {
      lastSyncedCodeRef.current = pageContent;
      setPreviewCode(pageContent);
      setEditorCode(pageContent);
    }
  }, [getSandpackFiles]);

  // Handle page switching in multi-page preview
  const handleSelectPage = useCallback((path: string) => {
    openBuilderFile(path);
  }, [openBuilderFile]);

  /**
   * Canonical navigation function — the ONLY path for page switching.
   * Resolves pageId → route → filePath, updates all three state slices,
   * opens editor file, and navigates preview.
   */
  const navigateToBuilderPage = useCallback((
    pageId: string,
    options?: { openFile?: boolean; updatePreview?: boolean }
  ) => {
    const { openFile = true, updatePreview = true } = options || {};
    const page = creatorPlayground.pageRegistry.pages[pageId];
    if (!page) {
      console.warn('[WebBuilder] navigateToBuilderPage: page not found:', pageId);
      return;
    }

    const vfsFiles = virtualFS.getSandpackFiles();
    const resolved = resolveNavigationTarget(
      { pageId },
      creatorPlayground.pageRegistry,
      vfsFiles,
    );

    // Update all three state slices
    setActivePageId(pageId);
    setActivePreviewRoute(resolved.route || '/');

    if (resolved.existsInVFS && resolved.filePath && openFile) {
      handleSelectPage(resolved.filePath);
    } else if (page.isHome && openFile) {
      handleSelectPage(launchEntryPoint);
    }

    if (updatePreview) {
      livePreviewRef.current?.navigateToRoute(resolved.route || '/');
    }

    // If file doesn't exist in VFS, trigger AI generation as fallback
    if (!resolved.existsInVFS && !page.isHome) {
      const fp = resolved.filePath || deriveFilePath(page);
      const pageName = fp.split('/').pop()?.replace('.tsx', '')?.toLowerCase() || page.title.toLowerCase();
      creatorPlayground.updatePage(pageId, { filePath: fp });
      triggerPageGenRef.current(pageName, page.title, null);
    }
  }, [creatorPlayground.pageRegistry, virtualFS, handleSelectPage, launchEntryPoint]);

  // ──────────────────────────────────────────────────────────────────────
  // Page tabs (PageNavigationBar) — derived from canonical PageRegistry.
  // Tab `path` field carries pageId so selection can route through
  // navigateToBuilderPage (registry-first, single source of truth).
  // ──────────────────────────────────────────────────────────────────────
  const pageTabs = useMemo<PageTab[]>(() => {
    const pages = Object.values(creatorPlayground.pageRegistry.pages);
    return pages
      .slice()
      .sort((a, b) => {
        if (a.isHome) return -1;
        if (b.isHome) return 1;
        return (a.navOrder ?? 0) - (b.navOrder ?? 0);
      })
      .map((p) => ({
        path: p.pageId,
        label: p.title || p.path.replace(/^\//, '') || 'Home',
        isMain: !!p.isHome,
      }));
  }, [creatorPlayground.pageRegistry]);

  const activePageTabId = useMemo(() => {
    if (activePageId && creatorPlayground.pageRegistry.pages[activePageId]) {
      return activePageId;
    }
    // Fallback: match active editor file → registry page
    const match = Object.values(creatorPlayground.pageRegistry.pages).find(
      (p) => p.filePath && p.filePath === activePagePath,
    );
    return match?.pageId ?? (creatorPlayground.pageRegistry.homePageId || '');
  }, [activePageId, activePagePath, creatorPlayground.pageRegistry]);

  const handlePageTabSelect = useCallback((pageId: string) => {
    navigateToBuilderPage(pageId);
  }, [navigateToBuilderPage]);

  const handlePageTabAdd = useCallback(() => {
    // Open Creator Playground (Pages section) for canonical add flow
    setPlaygroundModalOpen(true);
  }, []);

  const handlePageTabRemove = useCallback((pageId: string) => {
    const page = creatorPlayground.pageRegistry.pages[pageId];
    if (!page) return;
    if (page.isHome) {
      toast.error('Cannot remove the home page');
      return;
    }
    if (!confirm(`Delete page "${page.title}"?`)) return;

    // Remove VFS file (if any), then drop from registry, then resync router.
    const vfsFiles = virtualFS.getSandpackFiles();
    if (page.filePath && vfsFiles[page.filePath]) {
      const next = { ...vfsFiles };
      delete next[page.filePath];
      virtualFS.importFiles(next);
    }
    creatorPlayground.removePage(pageId);

    // The registry-version effect regenerates the router automatically,
    // but doing it inline keeps file removal + router update atomic.
    const result = syncRouterAndValidate(
      { ...creatorPlayground.pageRegistry, pages: Object.fromEntries(
        Object.entries(creatorPlayground.pageRegistry.pages).filter(([id]) => id !== pageId)
      ) },
      virtualFS.getSandpackFiles(),
    );
    if (result.routerCode) {
      virtualFS.importFiles({ [launchEntryPoint]: result.routerCode });
    }

    if (activePagePath === page.filePath) {
      handleSelectPage(launchEntryPoint);
    }
    toast.success(`Removed "${page.title}"`);
  }, [creatorPlayground, virtualFS, launchEntryPoint, activePagePath, handleSelectPage]);

  // ──────────────────────────────────────────────────────────────────────
  // Auto-register VFS pages into PageRegistry.
  // When the in-builder AI (or any code path) writes a new
  // /src/pages/*.tsx file that has no corresponding registry entry,
  // register it so it appears in the PageNavigationBar and routing.
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const files = virtualFS.getSandpackFiles();
    const registryPages = Object.values(creatorPlayground.pageRegistry.pages);
    const knownFilePaths = new Set(
      registryPages.map((p) => p.filePath).filter(Boolean) as string[],
    );

    const orphans = Object.keys(files).filter((p) => {
      if (!/^\/src\/pages\/[^/]+\.tsx$/.test(p)) return false;
      // Skip funnels (handled separately) and known files
      if (p.includes('/pages/funnels/')) return false;
      if (knownFilePaths.has(p)) return false;
      // Skip files whose component name matches an existing page title
      const base = p.split('/').pop()!.replace(/\.tsx$/, '');
      const slug = base.replace(/Page$/, '').toLowerCase();
      const hasMatchingTitle = registryPages.some(
        (rp) => rp.title.toLowerCase().replace(/\s+/g, '') === slug,
      );
      return !hasMatchingTitle;
    });

    if (orphans.length === 0) return;

    for (const filePath of orphans) {
      const base = filePath.split('/').pop()!.replace(/\.tsx$/, '').replace(/Page$/, '');
      const title = base.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, (c) => c.toUpperCase()) || 'Page';
      const route = '/' + base.replace(/([A-Z])/g, '-$1').replace(/^-/, '').toLowerCase();
      console.log(`[WebBuilder] Auto-registering AI page: ${filePath} → ${route}`);
      creatorPlayground.addPage(title, route, 'custom', { filePath, showInNav: true });
    }
  }, [virtualFS.nodes, creatorPlayground]);


  const handleAddPage = useCallback(() => {
    const name = prompt('Enter page name (e.g. "about", "contact"):');
    if (!name) return;
    const sanitized = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const componentName = sanitized
      .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toUpperCase());
    const path = `/src/pages/${componentName}.tsx`;
    const vfsFiles = getSandpackFiles();
    if (vfsFiles[path]) {
      toast.error(`Page "${componentName}" already exists`);
      return;
    }
    const label = sanitized.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const newPageCode = buildPageSeed(componentName, label);

    vfsImportFiles({ [path]: newPageCode });
    openBuilderFile(path, newPageCode);
    toast.success(`Page "${label}" created`);
  }, [getSandpackFiles, openBuilderFile, vfsImportFiles]);
  
  // Handle removing a page
  const handleRemovePage = useCallback((path: string) => {
    if (!confirm(`Delete page "${path}"?`)) return;
    // Find and delete the VFS node
    const allFiles = getSandpackFiles();
    delete allFiles[path];
    // Re-import without the deleted page
    vfsImportFiles(allFiles);
    // Switch back to main page if we deleted the active one
    if (activePagePath === path) {
      handleSelectPage(launchEntryPoint);
    }
    toast.success('Page removed');
  }, [getSandpackFiles, vfsImportFiles, activePagePath, handleSelectPage, launchEntryPoint]);
  
  // NOTE: previewCode→VFS sync is handled by the main sync effect below (Effect A).
  // A duplicate effect here previously wrote to /index.html and conflicted with
  // Effect A (which writes to /src/App.tsx), creating a ping-pong infinite loop
  // that triggered React error #185 (max update depth exceeded).

  // Intent Pipeline Overlay state
  const [pipelineOverlayOpen, setPipelineOverlayOpen] = useState(false);
  const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig | null>(null);

  // Demo Overlay state
  const [demoOverlayOpen, setDemoOverlayOpen] = useState(false);
  const [demoConfig, setDemoConfig] = useState<DemoIntentOverlayConfig | null>(null);

  // Research Overlay state (contextual web research from preview clicks)
  const [researchOverlayOpen, setResearchOverlayOpen] = useState(false);
  const [researchPayload, setResearchPayload] = useState<ResearchOverlayPayload | null>(null);
  const [activeRuntimeOverlay, setActiveRuntimeOverlay] = useState<OverlayConfig | null>(null);
  const [previewCartOpen, setPreviewCartOpen] = useState(false);
  const [previewCartStep, setPreviewCartStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [previewCartSubmitting, setPreviewCartSubmitting] = useState(false);
  
  // Track file modifications for UI indicators
  const trackFileModification = useCallback((fileId: string, content: string) => {
    const original = originalFileContents.current.get(fileId);
    const newModified = new Set(modifiedFiles);
    
    if (original === undefined) {
      // First time seeing this file, store original content
      originalFileContents.current.set(fileId, content);
    } else if (original !== content) {
      // Content changed from original
      newModified.add(fileId);
    } else {
      // Content matches original
      newModified.delete(fileId);
    }
    
    setModifiedFiles(newModified);
    
    // Mark as recently changed for highlighting animation
    setRecentlyChangedFiles(prev => new Set([...prev, fileId]));
    setTimeout(() => {
      setRecentlyChangedFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }, 2000);
    
    // Debounced HTML intent re-wiring (uses ref to avoid stale closures)
    const file = vfsNodes.find(n => n.id === fileId && n.type === 'file');
    if (file?.path?.endsWith('.html') || file?.path?.endsWith('.htm')) {
      // Clear existing timer
      if (intentRewireTimerRef.current) {
        clearTimeout(intentRewireTimerRef.current);
      }
      // Schedule new re-wire (debounced 1.5s after last edit)
      intentRewireTimerRef.current = setTimeout(() => {
        autoRewireHtmlIntentsRef.current?.(fileId, content);
      }, 1500);
    }
  }, [modifiedFiles]);
  
  // Mark files as AI-generated when importing from templates
  const markFilesAsAIGenerated = useCallback((fileIds: string[]) => {
    setAIGeneratedFiles(prev => new Set([...prev, ...fileIds]));
  }, []);
  
  // Sync previewCode to VFS when it changes (for templates and AI-generated code)
  // This ensures the preview component sees the same code as the editor
  const lastSyncedCodeRef = useRef<string>('');
  // Keep a stable ref to virtualFS so the sync effect doesn't re-run every render
  const virtualFSRef = useRef(virtualFS);
  virtualFSRef.current = virtualFS;

  const selectEditableEntryPath = useCallback((
    files: Record<string, string>,
    preferredPath?: string | null,
  ): string | null => {
    if (preferredPath && files[preferredPath]) {
      if (preferredPath.endsWith('/App.tsx') && isCanonicalRouterSource(files[preferredPath])) {
        return Object.keys(files).find((path) => /\/pages\/.+\.(tsx|jsx)$/.test(path)) || preferredPath;
      }
      return preferredPath;
    }

    const resolvedEntryPath = resolveLauncherEntryPoint(
      files,
      preferredPath || launchEntryPoint,
    );
    if (resolvedEntryPath && files[resolvedEntryPath]) {
      if (resolvedEntryPath.endsWith('/App.tsx') && isCanonicalRouterSource(files[resolvedEntryPath])) {
        return Object.keys(files).find((path) => /\/pages\/.+\.(tsx|jsx)$/.test(path)) || resolvedEntryPath;
      }
      return resolvedEntryPath;
    }

    return Object.keys(files).find((path) => /\/pages\/.+\.(tsx|jsx)$/.test(path))
      || Object.keys(files).find((path) => /\.(tsx|jsx)$/.test(path) && !/\/(main|index)\.(tsx|jsx)$/.test(path))
      || Object.keys(files).find((path) => /\.(tsx|jsx)$/.test(path))
      || (files['/index.html'] ? '/index.html' : null)
      || Object.keys(files)[0]
      || null;
  }, [launchEntryPoint]);

  const syncBuilderFromFiles = useCallback((
    files: Record<string, string>,
    preferredPath?: string | null,
  ) => {
    const entryPath = selectEditableEntryPath(files, preferredPath);
    if (!entryPath) {
      return null;
    }

    const entrySource = files[entryPath];
    if (!entrySource) {
      return null;
    }

    const safeEntrySource = /\.(tsx|jsx)$/.test(entryPath)
      ? ensureReactImports(entrySource)
      : entrySource;

    openBuilderFile(entryPath, safeEntrySource);

    return {
      entryPath,
      entrySource: safeEntrySource,
    };
  }, [openBuilderFile, selectEditableEntryPath]);

  const importBuilderFiles = useCallback((
    incomingFiles: Record<string, string>,
    options?: {
      preferredPath?: string | null;
      entryPoint?: string | null;
      replace?: boolean;
      themePresetId?: string | null;
    },
  ) => {
    try {
      const normalizedEntryPoint = options?.entryPoint
        ? (options.entryPoint.startsWith('/') ? options.entryPoint : `/${options.entryPoint}`)
        : undefined;
      const normalizedFiles = normalizeLauncherFiles({ ...incomingFiles }, {
        entryPoint: normalizedEntryPoint,
        themePresetId: options?.themePresetId ?? resolvedThemePresetId,
        injectCssIfMissing: !effectiveRouteState?.siteBundleSnapshot,
      });

      const appKey = resolveLauncherEntryPoint(
        normalizedFiles,
        normalizedEntryPoint || launchEntryPoint,
      );

      if (appKey && normalizedFiles[appKey] && !normalizedFiles['/src/template.css']) {
        const { cleanCode, css } = extractEmbeddedCSS(normalizedFiles[appKey]);
        if (css) {
          normalizedFiles[appKey] = cleanCode;
          normalizedFiles['/src/template.css'] = css;
        }
      }

      const existingFiles = options?.replace ? {} : virtualFSRef.current.getSandpackFiles();
      let candidateFiles = {
        ...existingFiles,
        ...normalizedFiles,
      };
      let snapshotResolution = resolveSnapshot(candidateFiles, effectiveRouteState as any);
      candidateFiles = projectSnapshotVfsFiles(candidateFiles, snapshotResolution);
      snapshotResolution = resolveSnapshot(candidateFiles, effectiveRouteState as any);
      Object.assign(normalizedFiles, candidateFiles);
      assertNoMinimalFallbackPreview(candidateFiles, snapshotResolution, 'Builder VFS import');

      // End-to-end preflight before any template/page import lands in the VFS.
      // Mirrors the launcher + AI-apply paths so every entry point is guarded.
      const snapshotForPreflight = effectiveRouteState?.siteBundleSnapshot ?? null;
      const preflightedFiles = runFullPreflight(normalizedFiles, {
        siteBundleSnapshot: snapshotForPreflight,
        industry: snapshotForPreflight?.industry,
      }).files;
      assertNoMinimalFallbackPreview({ ...candidateFiles, ...preflightedFiles }, snapshotResolution, 'Builder VFS import preflight');

      if (options?.replace) vfsResetToEmpty();
      vfsImportFiles(preflightedFiles);
      const syncedEntry = syncBuilderFromFiles(
        preflightedFiles,
        options?.preferredPath || normalizedEntryPoint || null,
      );

      return {
        files: preflightedFiles,
        syncedEntry,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? 'Unknown import failure');
      console.error('[WebBuilder] Builder VFS import blocked:', error);
      toast.error(isPreviewPipelineError(error) ? 'Preview contract blocked import' : 'Builder import failed', {
        description: message.slice(0, 180),
      });
      return null;
    }
  }, [syncBuilderFromFiles, vfsImportFiles, vfsResetToEmpty, launchEntryPoint, resolvedThemePresetId, effectiveRouteState]);

  // ── Move 3: revisionId-first hydration ──
  // When the route state carries a `revisionId` (persisted by VFSCommitService at
  // launch or by AI Builder), prefer loading the durable revision row from
  // `site_revisions` over the sessionStorage / launch-context VFS. This closes
  // the launcher→builder loop so the canonical revision chain is authoritative.
  const hydratedRevisionRef = useRef<string | null>(null);
  const [hydratedRevision, setHydratedRevision] = useState<LoadedRevision | null>(null);
  const [runtimeProjectionRevisionId, setRuntimeProjectionRevisionId] = useState<string | null>(null);
  const [canonicalHydrationError, setCanonicalHydrationError] = useState<string | null>(null);
  // Automatic owning-business repair: a draft whose business link is missing can
  // never receive a committed revision, so hydration fails forever. We recreate
  // the relationship once, then reload the canonical hydration pass.
  const [hydrationNonce, setHydrationNonce] = useState(0);
  const [repairState, setRepairState] = useState<'idle' | 'running' | 'failed' | 'repaired'>('idle');
  const [repairNote, setRepairNote] = useState<string | null>(null);
  const [emptyProjectDraft, setEmptyProjectDraft] = useState(false);
  const repairAttemptedRef = useRef(false);
  const [activePublishedRevisionId, setActivePublishedRevisionId] = useState<string | null>(null);
  const [currentRevisionId, setCurrentRevisionId] = useState<string>(
    effectiveRouteState?.revisionId || ''
  );
  currentRevisionIdRef.current = currentRevisionId;
  useEffect(() => {
    const routeRevisionId = effectiveRouteState?.revisionId;
    if (!routeRevisionId) return;
    setCurrentRevisionId((current) => current === routeRevisionId ? current : routeRevisionId);
  }, [effectiveRouteState?.revisionId]);

  useEffect(() => {
    const revId = currentRevisionId || effectiveRouteState?.revisionId;
    const durableProjectId = resolvedProjectId || projectId;
    const hasCanonicalDraft = Boolean(durableProjectId && currentDraftId);
    const baseKey = hasCanonicalDraft
      ? `draft:${durableProjectId}:${currentDraftId}`
      : revId || (durableProjectId ? `latest:${durableProjectId}` : '');
    const hydrationKey = baseKey ? `${baseKey}#${hydrationNonce}` : '';
    if (!hydrationKey || hydratedRevisionRef.current === hydrationKey) return;
    hydratedRevisionRef.current = hydrationKey;

    let cancelled = false;
    let settled = false;
    void (async () => {
      try {
        if (hasCanonicalDraft) {
          setCanonicalHydrationError(null);
          setHydratedRevision(null);
          setRuntimeProjectionRevisionId(null);
        }
        const revision = hasCanonicalDraft
          ? await loadProjectedRevisionForDraft(durableProjectId!, currentDraftId!)
          : revId
            ? await loadRevision(revId)
            : await loadLatestRevisionForProject(durableProjectId!);
        if (cancelled) return;
        if (!revision) {
          // Never leave the canonical shell spinning: surface a recoverable error.
          if (hasCanonicalDraft) {
            throw new Error('No committed revision was found for this project draft.');
          }
          settled = true;
          return;
        }
        const files = revision.vfsFiles || {};
        if (Object.keys(files).length === 0) {
          if (hasCanonicalDraft) {
            throw new Error(`Canonical revision ${revision.id} contains no VFS files`);
          }
          console.warn('[WebBuilder] revision', revId, 'returned empty vfsFiles');
          settled = true;
          return;
        }
        console.log('[WebBuilder] hydrated from site_revisions:', revision.id, Object.keys(files).length, 'files');
        const currentFiles = virtualFSRef.current.getSandpackFiles();
        const routeFiles = effectiveRouteState?.vfsFiles || {};
        const routeCarriesHydratedRevision = Boolean(
          effectiveRouteState?.revisionId === revision.id
          && Object.keys(routeFiles).length > 0,
        );
        // Wizard handoff already carries commitMutation's exact persisted VFS.
        // Its synchronous route-state importer owns first paint; replaying the
        // same revision through this async effect creates a last-writer-wins
        // race with snapshot projection/router hydration and can replace the
        // generated pages just as Sandpack starts compiling. Keep loading the
        // revision for identity/runtime metadata, but do not write its files a
        // second time when navigation state names that exact revision.
        if (
          !routeCarriesHydratedRevision
          && computeBuilderVfsSignature(currentFiles) !== computeBuilderVfsSignature(files)
        ) {
          importBuilderFiles(files, { entryPoint: launchEntryPoint });
        }
        setHydratedRevision(revision);
        setCurrentRevisionId(revision.id);
        settled = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const hasCommittedRouteArtifact = Boolean(
          effectiveRouteState?.revisionId
          && Object.keys(effectiveRouteState?.vfsFiles || {}).length > 0,
        );
        if (hasCanonicalDraft && !cancelled && !hasCommittedRouteArtifact) {
          setCanonicalHydrationError(message);
        }
        console.warn('[WebBuilder] revision hydration failed:', err);
        settled = true;
      }
    })();

    return () => {
      cancelled = true;
      // If the effect tore down before hydration settled (StrictMode double
      // mount, fast identity change), release the key so the next run retries
      // instead of short-circuiting into a permanent loading state.
      if (!settled && hydratedRevisionRef.current === hydrationKey) {
        hydratedRevisionRef.current = null;
      }
    };
  }, [currentDraftId, currentRevisionId, effectiveRouteState?.revisionId, effectiveRouteState?.vfsFiles, hydrationNonce, importBuilderFiles, launchEntryPoint, projectId, resolvedProjectId]);

  // ── Automatic owning-business repair ──────────────────────────────────────
  // When canonical hydration fails because the draft lost its business link (or
  // therefore never received a committed revision projection), recreate the
  // relationship and reload the builder's canonical pass exactly once. Manual
  // retry stays available from the error shell below.
  const runCanonicalDraftRepair = useCallback(async () => {
    const durableProjectId = resolvedProjectId || projectId;
    if (!currentDraftId) {
      setRepairState('failed');
      setRepairNote('This session has no draft identity to repair.');
      return;
    }
    setRepairState('running');
    setRepairNote(null);
    try {
      const outcome = await repairDraftBusinessLink({
        draftId: currentDraftId,
        projectId: durableProjectId || null,
      });
      const note = outcome.notes.join(' ') || null;
      setRepairNote(note);
      setEmptyProjectDraft(outcome.emptyDraft);
      if (outcome.repaired || outcome.revisionId) {
        setRepairState('repaired');
        setCanonicalHydrationError(null);
        setHydratedRevision(null);
        setRuntimeProjectionRevisionId(null);
        hydratedRevisionRef.current = null;
        setHydrationNonce((n) => n + 1);
        toast.success('Project relinked to its workspace', {
          description: 'Reloading committed project state…',
        });
      } else {
        setRepairState('failed');
      }
    } catch (error) {
      setRepairState('failed');
      setRepairNote(error instanceof Error ? error.message : String(error));
    }
  }, [currentDraftId, projectId, resolvedProjectId]);

  useEffect(() => {
    if (!canonicalHydrationError || repairAttemptedRef.current || !currentDraftId) return;
    repairAttemptedRef.current = true;
    void runCanonicalDraftRepair();
  }, [canonicalHydrationError, currentDraftId, runCanonicalDraftRepair]);

  useEffect(() => {
    if (!hydratedRevision) return;
    const revisionSnapshot = hydratedRevision.siteBundleSnapshot as SiteBundleSnapshot;
    setActivePublishedRevisionId(null);
    setRuntimeProjectionRevisionId(null);
    let cancelled = false;
    void loadProjectRuntimeProjection(hydratedRevision.projectId, hydratedRevision.draftId)
      .then((projection) => {
        if (cancelled) return;
        setActivePublishedRevisionId(projection.activePublishedRevisionId);
        setActivePagePath(resolveProjectActivePagePath(
          revisionSnapshot,
          projection.activePagePath,
        ));
        setRuntimeProjectionRevisionId(hydratedRevision.id);
      })
      .catch((error) => {
        if (cancelled) return;
        // Never dead-end the builder on a projection read: the committed
        // revision is already hydrated, so fall back to snapshot defaults and
        // let Sandpack compile immediately.
        console.warn('[WebBuilder] project runtime projection load failed:', error);
        setActivePublishedRevisionId(null);
        setActivePagePath(resolveProjectActivePagePath(revisionSnapshot, null));
        setRuntimeProjectionRevisionId(hydratedRevision.id);
      });
    return () => { cancelled = true; };
  }, [hydratedRevision]);

  // ── Move 2: layout fast-path → VFSCommitService bridge ───────────────────
  // Each deterministic layout edit additively chains through commitMutation so
  // the durable site_revisions ledger reflects every state change, not just
  // AI Builder LLM applies. Non-blocking; preview/editor already updated.
  useEffect(() => {
    commitLayoutFastPathRef.current = (nextCode, summary) => {
      if (!businessId || !currentDraftId) return;
      const targetPath = activePagePath?.endsWith('.tsx') ? activePagePath : launchEntryPoint;
      if (!targetPath || !nextCode) return;
      const beforeFiles = virtualFSRef.current.getSandpackFiles();
      const snapshot = effectiveRouteState?.siteBundleSnapshot ?? null;
      void (async () => {
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (!user) return;
          const identity: BuilderIdentity = {
            userId: user.id,
            businessId,
            projectId: resolvedProjectId || currentDraftId,
            draftId: currentDraftId,
            revisionId: currentRevisionId,
            sessionId: `web-builder:${currentDraftId}`,
          };
          const patch = legacyFilesToPatchPlan(
            { [targetPath]: nextCode },
            `Layout · ${summary}`,
          );
          const commit = await commitMutation({
            source: 'layout-fast-path',
            identity,
            current: {
              vfsFiles: beforeFiles,
              siteBundleSnapshot: snapshot ?? undefined,
            },
            patch,
            options: {
              requirePreviewPass: false,
              requireReadinessPass: false,
              industry: snapshot?.industry,
            },
          });
          if (commit.persistedRevisionId) {
            setCurrentRevisionId(commit.persistedRevisionId);
            console.log('[WebBuilder] layout-fast-path commit persisted:', commit.persistedRevisionId);
          }
        } catch (err) {
          if (err instanceof CommitRejectedError) {
            console.warn('[WebBuilder] layout-fast-path commit rejected:', err.message);
          } else {
            console.warn('[WebBuilder] layout-fast-path commit failed:', err);
          }
        }
      })();
    };
  }, [
    businessId,
    currentDraftId,
    currentRevisionId,
    activePagePath,
    launchEntryPoint,
    effectiveRouteState?.siteBundleSnapshot,
  ]);

  // Snapshot-owned visual variants must enter the revision ledger before a
  // page is regenerated. Variant selection and section swaps are committed
  // through the canonical pipeline (commitMutation → commitToPipeline), so the
  // SiteBundleSnapshot — not the customizer's local state — owns the result.
  const presentationCommitInFlightRef = useRef<string | null>(null);

  const commitPresentationOps = useCallback(async (
    requestedOps: Array<{ type: 'setVariant'; sectionId: string; variantId: string }>,
  ): Promise<boolean> => {
    if (!businessId || !currentDraftId || requestedOps.length === 0) return false;

    const beforeFiles = virtualFSRef.current.getSandpackFiles();
    const snapshot = resolveSnapshot(beforeFiles, effectiveRouteState as any).snapshot
      ?? effectiveRouteState?.siteBundleSnapshot
      ?? null;
    // No SiteBundleSnapshot = no canonical surface to mutate. The customizer
    // keeps its local reflection; nothing enters the ledger.
    if (!snapshot) return false;

    const currentVariants = snapshot.meta?.designIntervention?.activeVariants ?? {};
    const presentationOps = requestedOps.filter(
      (op) => currentVariants[op.sectionId] !== op.variantId,
    );
    if (presentationOps.length === 0) return true;

    const operationKey = JSON.stringify(presentationOps);
    if (presentationCommitInFlightRef.current === operationKey) return false;
    presentationCommitInFlightRef.current = operationKey;

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return false;
      const patch = emptyPatchPlan(`Presentation · ${presentationOps.length} variant update(s)`);
      patch.presentationOps.push(...presentationOps);
      const commit = await commitMutation({
        source: 'playground-edit',
        identity: {
          userId: user.id,
          businessId,
          projectId: resolvedProjectId || currentDraftId,
          draftId: currentDraftId,
          revisionId: currentRevisionIdRef.current,
          sessionId: `web-builder:${currentDraftId}`,
        },
        current: {
          vfsFiles: beforeFiles,
          siteBundleSnapshot: snapshot,
          playground: {
            pageRegistry: creatorPlayground.pageRegistry,
            creatorData: creatorPlayground.creatorData,
            calendars: snapshot.calendars ?? {},
            popups: snapshot.popups ?? {},
          } as never,
        },
        patch,
        options: {
          requirePreviewPass: false,
          requireReadinessPass: false,
          industry: snapshot.industry,
          themePresetId: snapshot.meta.themePresetId ?? undefined,
          themeTokens: snapshot.themeTokens,
        },
      });
      if (commit.status !== 'committed') {
        throw new CommitRejectedError('presentation mutation was rejected', commit);
      }
      importBuilderFiles(commit.vfsFiles, {
        replace: true,
        preferredPath: activePagePath,
        entryPoint: launchEntryPoint,
      });
      if (commit.persistedRevisionId) setCurrentRevisionId(commit.persistedRevisionId);
      return true;
    } catch (err) {
      console.warn('[WebBuilder] presentation commit failed:', err);
      toast.error('Could not save the selected layout');
      return false;
    } finally {
      presentationCommitInFlightRef.current = null;
    }
  }, [
    businessId,
    currentDraftId,
    resolvedProjectId,
    creatorPlayground.pageRegistry,
    creatorPlayground.creatorData,
    activePagePath,
    launchEntryPoint,
    effectiveRouteState,
    importBuilderFiles,
  ]);

  /**
   * Canonical entry for setVariant / swap-section UI actions.
   * The snapshot commit is the source of truth; the customizer's local map is
   * only mirrored so the picker highlights the committed variant, and it is
   * rolled back when the commit is refused.
   */
  const commitVariantSelection = useCallback(async (sectionId: string, variantId: string) => {
    const previous = templateCustomizer.activeVariants[sectionId];
    templateCustomizer.setActiveVariant(sectionId, variantId as never);
    const ok = await commitPresentationOps([{ type: 'setVariant', sectionId, variantId }]);
    if (!ok && businessId && currentDraftId) {
      if (previous) templateCustomizer.setActiveVariant(sectionId, previous as never);
      else templateCustomizer.clearActiveVariant(sectionId);
    }
  }, [templateCustomizer, commitPresentationOps, businessId, currentDraftId]);

  // Reconciler: any variant state that entered the customizer outside the
  // canonical actions above (template parse, restore) is pushed into the
  // snapshot as well, so local state can never diverge from the ledger.
  useEffect(() => {
    const desiredVariants = templateCustomizer.activeVariants;
    if (Object.keys(desiredVariants).length === 0) return;
    void commitPresentationOps(
      Object.entries(desiredVariants).map(([sectionId, variantId]) => ({
        type: 'setVariant' as const,
        sectionId,
        variantId,
      })),
    );
  }, [templateCustomizer.activeVariants, commitPresentationOps]);


  // ── Preview Floating Toolbar → VFSCommitService bridge ───────────────────
  // Mirrors the layout fast-path effect: persists every toolbar-driven edit
  // (style / text / image / attribute / delete / duplicate / move) into the
  // durable site_revisions ledger so they participate in capability and
  // intent readiness gating.
  useEffect(() => {
    commitToolbarMutationRef.current = (nextCode, summary) => {
      if (!businessId || !currentDraftId) return;
      const targetPath = activePagePath?.endsWith('.tsx') ? activePagePath : launchEntryPoint;
      if (!targetPath || !nextCode) return;
      const beforeFiles = virtualFSRef.current.getSandpackFiles();
      const snapshot = effectiveRouteState?.siteBundleSnapshot ?? null;
      void (async () => {
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (!user) return;
          const identity: BuilderIdentity = {
            userId: user.id,
            businessId,
            projectId: resolvedProjectId || currentDraftId,
            draftId: currentDraftId,
            revisionId: currentRevisionId,
            sessionId: `web-builder:${currentDraftId}`,
          };
          const patch = legacyFilesToPatchPlan(
            { [targetPath]: nextCode },
            `Toolbar · ${summary}`,
          );
          const commit = await commitMutation({
            source: 'preview-toolbar',
            identity,
            current: {
              vfsFiles: beforeFiles,
              siteBundleSnapshot: snapshot ?? undefined,
            },
            patch,
            options: {
              requirePreviewPass: false,
              requireReadinessPass: false,
              industry: snapshot?.industry,
            },
          });
          if (commit.persistedRevisionId) {
            setCurrentRevisionId(commit.persistedRevisionId);
            console.log('[WebBuilder] preview-toolbar commit persisted:', commit.persistedRevisionId);
          }
        } catch (err) {
          if (err instanceof CommitRejectedError) {
            console.warn('[WebBuilder] preview-toolbar commit rejected:', err.message);
          } else {
            console.warn('[WebBuilder] preview-toolbar commit failed:', err);
          }
        }
      })();
    };
  }, [
    businessId,
    currentDraftId,
    currentRevisionId,
    activePagePath,
    launchEntryPoint,
    effectiveRouteState?.siteBundleSnapshot,
  ]);





  
  // Effect A: previewCode → VFS  (one-way sync, runs when AI/templates/page-nav set previewCode)
  useEffect(() => {
    if (routeStateHasStructuredProject && !importedRouteStateRef.current) {
      console.log('[WebBuilder] Effect A deferred until route-state project import completes');
      return;
    }

    // Sync if previewCode has content and actually changed since last sync.
    // Guardrail: the builder bootstrap component is only an editor placeholder;
    // never let it overwrite wizard/launcher VFS state as /src/App.tsx.
    if (previewCode && isWizardFallbackOrRouterOnlySource(previewCode)) {
      return;
    }

    // Sync if previewCode has content and actually changed since last sync
    if (previewCode && previewCode !== lastSyncedCodeRef.current) {
      console.log('[WebBuilder] Effect A: Syncing previewCode to VFS, length:', previewCode.length);
      // All code is TSX — import directly to VFS as the active page file
      const targetPath = activePagePath.endsWith('.tsx') ? activePagePath : launchEntryPoint;
      const currentFiles = virtualFSRef.current.getSandpackFiles();
      const needsProjectScaffold =
        targetPath === launchEntryPoint &&
        (!currentFiles['/src/main.tsx'] || !currentFiles['/src/index.css']);

      const importPayload = needsProjectScaffold
        ? normalizeLauncherFiles(
            {
              ...currentFiles,
              [targetPath]: previewCode,
            },
              {
                entryPoint: targetPath,
                themePresetId: resolvedThemePresetId,
                injectCssIfMissing: !effectiveRouteState?.siteBundleSnapshot,
              }
          )
        : {
            [targetPath]: previewCode,
          };

      virtualFSRef.current.importFiles(importPayload);
      lastSyncedCodeRef.current = previewCode;
    }
  }, [previewCode, activePagePath, launchEntryPoint, routeStateHasStructuredProject, resolvedThemePresetId]);
  
  // NOTE: Effect B (VFS→previewCode) has been REMOVED.
  // Previously, it watched virtualFS.nodes and called setPreviewCode() whenever the
  // active file changed — but this created an unavoidable circular dependency:
  //   previewCode→Effect A→importFiles→nodes change→Effect B→setPreviewCode→repeat
  // Instead, code editor edits update VFS directly (which SimplePreview reads from VFS),
  // and explicit callbacks (onSave, file selection) update previewCode when needed.
  
  // Auto-save functionality
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const lastSavedCodeRef = useRef<string>('');
  // Track VFS file map signature so we persist multi-file AI edits even when
  // the legacy single-file `previewCode` blob did not change.
  const lastSavedVfsSignatureRef = useRef<string>('');
  const computeVfsSignature = useCallback(computeBuilderVfsSignature, []);
  // Keep the current template id in a ref so callbacks always read the
  // latest value without stale-closure issues (avoids re-creating intervals).
  const currentDraftIdRef = useRef<string | null>(templateFiles.currentDraftId);
  currentDraftIdRef.current = templateFiles.currentDraftId;
  useEffect(() => {
    setCurrentDraftId(templateFiles.currentDraftId || null);
  }, [templateFiles.currentDraftId]);
  const getAutoSaveKey = useCallback(() =>
    currentDraftIdRef.current
      ? `webbuilder_autosave_${currentDraftIdRef.current}`
      : 'webbuilder_autosave_draft'
  , []);
  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  
  // Track unsaved changes for back button warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialCodeRef = useRef<string>(previewCode);
  
  // Cloud state: project settings, entitlements, installed packs
  const [cloudState, setCloudState] = useState<{
    project: {
      id: string | null;
      name: string | null;
      slug: string | null;
      publishStatus: string | null;
      customDomain: string | null;
      settings: Record<string, any>;
    };
    business: {
      id: string | null;
      name: string | null;
      notificationEmail: string | null;
      timezone: string | null;
      brandColor: string | null;
    };
    entitlements: Record<string, { limit?: number; enabled?: boolean }>;
    installedPacks: string[];
    isLoaded: boolean;
  }>({
    project: {
      id: projectId || null,
      name: projectNameFromState || null,
      slug: projectSlug || null,
      publishStatus: publishStatusFromState || null,
      customDomain: customDomainFromState || null,
      settings: {},
    },
    business: {
      id: businessId || null,
      name: null,
      notificationEmail: null,
      timezone: 'UTC',
      brandColor: null,
    },
    entitlements: {},
    installedPacks: [],
    isLoaded: false,
  });
  
  // Load full cloud state when project/business context is available
  useEffect(() => {
    let cancelled = false;
    
    async function loadCloudState() {
      if (!businessId) {
        // No business context - running in preview/demo mode
        if (!cancelled) {
          setCloudState(prev => ({ ...prev, isLoaded: true }));
        }
        return;
      }
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          if (!cancelled) setCloudState(prev => ({ ...prev, isLoaded: true }));
          return;
        }
        
        // Load business settings
        // Type cast to handle dynamic table that may not be in generated types yet
        const { data: bizData } = await supabase
          .from('businesses' as any)
          .select('id, name, notification_email, timezone, brand_color, settings')
          .eq('id', businessId)
          .maybeSingle() as { data: { id: string; name: string; notification_email: string | null; timezone: string | null; brand_color: string | null; settings: any } | null };
        
        // Load project settings if we have a projectId
        let projectData: { id: string; name: string; slug: string | null; publish_status: string | null; custom_domain: string | null; settings: any } | null = null;
        if (projectId) {
          const { data } = await getProjectByIdCompat(projectId);
          projectData = data
            ? {
                id: data.id,
                name: data.name,
                slug: data.slug || null,
                publish_status: data.publish_status || null,
                custom_domain: data.custom_domain || null,
                settings: data.settings || {},
              }
            : null;
        }
        
        // Load entitlements
        const { data: entitlementsData } = await supabase
          .from('entitlements' as any)
          .select('key, value')
          .eq('business_id', businessId) as { data: { key: string; value: any }[] | null };
        
        // Load installed packs
        const { data: packsData } = await supabase
          .from('installed_packs' as any)
          .select('pack_id')
          .eq('business_id', businessId)
          .eq('status', 'active') as { data: { pack_id: string }[] | null };
        
        if (!cancelled) {
          const entitlements: Record<string, { limit?: number; enabled?: boolean }> = {};
          (entitlementsData || []).forEach((e) => {
            entitlements[e.key] = typeof e.value === 'string' ? JSON.parse(e.value) : e.value;
          });
          
          setCloudState({
            project: {
              id: projectData?.id || projectId || null,
              name: projectData?.name || projectNameFromState || null,
              slug: projectData?.slug || projectSlug || null,
              publishStatus: projectData?.publish_status || publishStatusFromState || null,
              customDomain: projectData?.custom_domain || customDomainFromState || null,
              settings: projectData?.settings || {},
            },
            business: {
              id: bizData?.id || businessId || null,
              name: bizData?.name || null,
              notificationEmail: bizData?.notification_email || null,
              timezone: bizData?.timezone || 'UTC',
              brandColor: bizData?.brand_color || null,
            },
            entitlements,
            installedPacks: (packsData || []).map((p: any) => p.pack_id),
            isLoaded: true,
          });
          
          console.log('[WebBuilder] Cloud state loaded:', {
            businessId,
            projectId,
            entitlementsCount: Object.keys(entitlements).length,
            installedPacks: (packsData || []).map((p: any) => p.pack_id),
          });
        }
      } catch (error) {
        console.warn('[WebBuilder] Failed to load cloud state:', error);
        if (!cancelled) {
          setCloudState(prev => ({ ...prev, isLoaded: true }));
        }
      }
    }
    
    loadCloudState();
    return () => { cancelled = true; };
  }, [businessId, projectId]);

  const playgroundSetupSnapshot = useMemo<PlaygroundSetupSnapshot>(() => ({
    ...(effectiveRouteState?.setupSnapshot || {}),
    publishStatus: cloudState.project.publishStatus || effectiveRouteState?.setupSnapshot?.publishStatus || null,
    customDomain: cloudState.project.customDomain || effectiveRouteState?.setupSnapshot?.customDomain || null,
    notificationEmail: cloudState.business.notificationEmail || effectiveRouteState?.setupSnapshot?.notificationEmail || null,
    projectName: cloudState.project.name || effectiveRouteState?.setupSnapshot?.projectName || null,
    setupSteps: effectiveRouteState?.setupSnapshot?.setupSteps,
  }), [
    cloudState.business.notificationEmail,
    cloudState.project.customDomain,
    cloudState.project.name,
    cloudState.project.publishStatus,
    effectiveRouteState?.setupSnapshot,
  ]);

  const playgroundReadinessReport = useMemo(() => buildIntentReadinessReport(
    {
      creatorData: creatorPlayground.creatorData,
      pageRegistry: creatorPlayground.pageRegistry,
      bindings: playgroundBindings,
      calendars: playgroundCalendars,
      popups: playgroundPopups,
    },
    [],
    playgroundSetupSnapshot,
  ), [
    creatorPlayground.creatorData,
    creatorPlayground.pageRegistry,
    playgroundBindings,
    playgroundCalendars,
    playgroundPopups,
    playgroundSetupSnapshot,
  ]);

  const selectedPlaygroundComponent = useMemo(() => {
    const attributes = (selectedHTMLElement?.attributes || {}) as Record<string, string>;
    const explicitInstanceId = attributes['data-ut-component-instance-id'];
    if (explicitInstanceId && creatorPlayground.creatorData.componentInstances[explicitInstanceId]) {
      return creatorPlayground.creatorData.componentInstances[explicitInstanceId];
    }

    const rawSlug =
      attributes['data-ut-component-slug'] ||
      inferCanonicalComponentSlug(attributes['data-component'] || '');
    if (!rawSlug) return null;

    const candidates = Object.values(creatorPlayground.creatorData.componentInstances).filter((instance) => {
      if ((instance.componentSlug || '') !== rawSlug) return false;
      if (!activePageId) return true;
      return instance.usedOnPages.includes(activePageId);
    });

    return candidates[0] || null;
  }, [activePageId, creatorPlayground.creatorData.componentInstances, selectedHTMLElement]);

  // ── Move E: per-element readiness from latest committed revision ──────
  // Reads `readinessReport.elementReadiness.records` off the most recent
  // site_revisions row and keeps the best (worst-status-wins) record per
  // canonical intent, so the floating toolbar can show ready/needs-data/
  // blocked chips for the currently-selected element.
  const [ledgerElementReadinessByIntent, setLedgerElementReadinessByIntent] = useState<
    Record<string, { status: 'ready' | 'capability-missing' | 'rows-missing' | 'unbound' | 'unknown-intent'; blocker?: string; fixPath?: string; intent: string }>
  >({});

  useEffect(() => {
    if (!projectId) {
      setLedgerElementReadinessByIntent({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const rev = currentDraftId
          ? await loadProjectedRevisionForDraft(projectId, currentDraftId)
          : await loadLatestRevisionForProject(projectId);
        if (cancelled || !rev) return;
        const er = (rev.readinessReport as { elementReadiness?: { records?: Array<{ intent: string; canonicalIntent: string | null; status: string; blocker?: string; fixPath?: string }> } })?.elementReadiness;
        const records = er?.records ?? [];
        const priority: Record<string, number> = { ready: 0, 'unknown-intent': 1, 'capability-missing': 2, 'rows-missing': 3, unbound: 4 };
        const map: Record<string, { status: 'ready' | 'capability-missing' | 'rows-missing' | 'unbound' | 'unknown-intent'; blocker?: string; fixPath?: string; intent: string }> = {};
        for (const r of records) {
          const keys = [r.canonicalIntent, r.intent].filter(Boolean) as string[];
          const status = (r.status as 'ready' | 'capability-missing' | 'rows-missing' | 'unbound' | 'unknown-intent');
          for (const k of keys) {
            const existing = map[k];
            if (!existing || (priority[status] ?? 0) > (priority[existing.status] ?? 0)) {
              map[k] = { status, blocker: r.blocker, fixPath: r.fixPath, intent: r.canonicalIntent || r.intent };
            }
          }
        }
        if (!cancelled) setLedgerElementReadinessByIntent(map);
      } catch (err) {
        if (!cancelled) console.warn('[WebBuilder] ledger element readiness load failed:', err);
      }
    };
    void load();
    const id = window.setInterval(load, 15000);
    const onLedgerEvt = () => void load();
    window.addEventListener('unison:ledger-updated', onLedgerEvt);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('unison:ledger-updated', onLedgerEvt);
    };
  }, [currentDraftId, projectId]);

  const selectedElementReadiness = useMemo(() => {
    // Pull data-ut-intent off the selected element so we can decorate the
    // toolbar with ledger-derived status even when no Playground binding/
    // component is associated yet.
    const selectedIntent =
      selectedHTMLElement?.attributes?.['data-ut-intent'] ||
      selectedHTMLElement?.attributes?.['data-ut-action'] ||
      null;
    const ledger = selectedIntent ? ledgerElementReadinessByIntent[selectedIntent] : null;
    const ledgerOverlay = ledger
      ? {
          ledgerIntent: ledger.intent,
          ledgerStatus: ledger.status,
          ledgerBlocker: ledger.blocker,
          ledgerFixPath: ledger.fixPath,
        }
      : {};

    if (selectedPlaygroundComponent) {
      const readiness = playgroundReadinessReport.componentReadiness[selectedPlaygroundComponent.instanceId];
      if (!readiness) return ledger ? { surfaceLabel: selectedIntent ?? undefined, ...ledgerOverlay } : null;
      return {
        surfaceLabel: selectedPlaygroundComponent.label,
        previewStatus: readiness.previewStatus,
        publishStatus: readiness.publishStatus,
        missingDependencies: readiness.missingDependencies,
        onOpenSetup: () => {
          setPlaygroundInitialSection('components');
          setPlaygroundModalOpen(true);
        },
        ...ledgerOverlay,
      };
    }

    if (selectedPlaygroundBinding) {
      const readiness = playgroundReadinessReport.readiness[selectedPlaygroundBinding.bindingId];
      if (!readiness) return ledger ? { surfaceLabel: selectedIntent ?? undefined, ...ledgerOverlay } : null;
      return {
        surfaceLabel: selectedPlaygroundBinding.coreIntent || selectedPlaygroundBinding.intent,
        previewStatus: readiness.previewStatus,
        publishStatus: readiness.publishStatus,
        missingDependencies: readiness.missingDependencies,
        onOpenSetup: () => {
          setPlaygroundInitialSection('readiness');
          setPlaygroundInitialBindingId(selectedPlaygroundBinding.bindingId);
          setPlaygroundModalOpen(true);
        },
        ...ledgerOverlay,
      };
    }

    if (ledger) {
      return { surfaceLabel: selectedIntent ?? undefined, ...ledgerOverlay };
    }
    return null;
  }, [
    playgroundReadinessReport,
    selectedPlaygroundBinding,
    selectedPlaygroundComponent,
    selectedHTMLElement,
    ledgerElementReadinessByIntent,
  ]);

  
  const referrerPageName = systemName || 
    effectiveRouteState?.from || 
    'System Launcher';

  // System/Template readiness state (used by Health tab)
  const [activeSystemType, setActiveSystemType] = useState<BusinessSystemType | null>(
    (systemType as BusinessSystemType) || null
  );
  const [templateCtaAnalysis, setTemplateCtaAnalysis] = useState<TemplateCtaAnalysis>({
    intents: [],
    slots: [],
    hadUtAttributes: false,
  });

  const [backendInstalled, setBackendInstalled] = useState(false);

  // Automatically re-wire intents when HTML content changes
  // This ensures button labels map to correct intents after manual edits
  // NOTE: This callback uses activeSystemType, so it must be defined after activeSystemType
  const autoRewireHtmlIntents = useCallback((fileId: string, content: string) => {
    // Only process HTML files
    if (!content.includes('<button') && !content.includes('<a ')) {
      return; // No actionable elements to rewire
    }
    
    try {
      const { code: normalizedCode, analysis } = normalizeTemplateForCtaContract({
        code: content,
        systemType: activeSystemType,
      });
      
      // Only update if normalization changed something
      if (normalizedCode !== content && analysis.intents.length > 0) {
        console.log('[WebBuilder] Auto-rewired intents:', analysis.intents);
        vfsUpdateFileContent(fileId, normalizedCode);
        
        // Update preview if this is the active page
        const file = vfsNodes.find(n => n.id === fileId && n.type === 'file');
        if (file && file.path === activePagePath) {
          lastSyncedCodeRef.current = normalizedCode;
          setPreviewCode(normalizedCode);
          setEditorCode(normalizedCode);
        }
        
        toast.success(`Auto-wired ${analysis.intents.length} button intent(s)`, {
          description: 'Button labels mapped to backend actions',
          duration: 3000,
        });
      }
    } catch (err) {
      console.warn('[WebBuilder] Intent rewire failed:', err);
    }
  }, [activeSystemType, vfsUpdateFileContent, vfsNodes, activePagePath]);
  
  // Keep the ref updated with the latest function (avoids stale closures in setTimeout)
  useEffect(() => {
    autoRewireHtmlIntentsRef.current = autoRewireHtmlIntents;
  }, [autoRewireHtmlIntents]);
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (intentRewireTimerRef.current) {
        clearTimeout(intentRewireTimerRef.current);
      }
    };
  }, []);

  // SEO settings hook
  const effectiveBusinessId = businessId || getOrCreatePreviewBusinessId(systemType);
  const effectiveProjectId = projectId || "preview";
  const pageSEO = usePageSEO({
    projectId: effectiveProjectId,
    businessId: effectiveBusinessId,
    autoFetch: !!(projectId && effectiveBusinessId),
  });

  // AI context (page structure + backend state + business data + redirect pages)
  const pageStructureContext = useMemo(() => buildPageStructureContext(previewCode), [previewCode]);
  
  // Build redirect page context from VFS for in-builder AI awareness (React pages)
  const redirectPageContext = useMemo(() => {
    const vfsFiles = virtualFS.getSandpackFiles();
    const pageFiles = Object.keys(vfsFiles).filter(p => 
      p.match(/\/src\/pages\/\w+\.tsx$/) && p !== '/src/App.tsx'
    );
    if (pageFiles.length === 0) return '';
    
    const lines = ['\n=== REACT PAGES IN VFS ==='];
    pageFiles.forEach(p => {
      const content = vfsFiles[p] || '';
      const nameMatch = p.match(/\/(\w+)\.tsx$/);
      const componentName = nameMatch?.[1] || 'Unknown';
      const exportMatch = content.match(/export default function (\w+)/);
      lines.push(`- ${p} (${exportMatch?.[1] || componentName}, ${content.length} chars)`);
    });
    lines.push('All pages are React components. Apply nav/footer/brand changes across ALL pages.');
    return lines.join('\n');
  }, [virtualFS.nodes]);
  
  const backendStateContext = useMemo(() => {
    const lines: string[] = [];
    lines.push(`- backendInstalled: ${backendInstalled ? "yes" : "no"}`);
    if (activeSystemType) lines.push(`- systemType: ${activeSystemType}`);
    if (currentDraftId) lines.push(`- templateId: ${currentDraftId}`);
    if (manifestIdFromState || currentManifestId) lines.push(`- manifestId: ${manifestIdFromState || currentManifestId}`);
    if (businessId) lines.push(`- businessId: ${businessId}`);
    if (redirectPageContext) lines.push(redirectPageContext);
    return lines.join("\n");
  }, [backendInstalled, activeSystemType, currentDraftId, manifestIdFromState, currentManifestId, businessId, redirectPageContext]);

  const [businessDataContext, setBusinessDataContext] = useState<string | null>(null);

  // Load persisted launcher design preferences (if not already in navigation state)
  useEffect(() => {
    let cancelled = false;
    async function loadPrefs() {
      if (!businessId) return;
      // If we already have a preset from navigation state, don't override it.
      if (currentDesignPreset) return;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const { data, error } = await supabase
          .from("business_design_preferences" as any)
          .select("template_category,design_preset")
          .eq("business_id", businessId)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          if (data?.design_preset) setCurrentDesignPreset(String(data.design_preset));
          if (data?.template_category) setCurrentTemplateCategory(String(data.template_category));
        }
      } catch (e) {
        console.warn("[WebBuilder] Failed to load business design preferences", e);
      }
    }

    loadPrefs();
    return () => {
      cancelled = true;
    };
  }, [businessId, currentDesignPreset]);

  useEffect(() => {
    let cancelled = false;
    async function loadBusinessData() {
      if (!businessId) {
        if (!cancelled) setBusinessDataContext(null);
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          if (!cancelled) setBusinessDataContext(null);
          return;
        }

        const { data: biz, error } = await supabase
          .from("businesses" as any)
          .select("id,name")
          .eq("id", businessId)
          .maybeSingle();

        if (error) throw error;

        const lines: string[] = [];
        if (biz?.name) lines.push(`- businessName: ${biz.name}`);
        if (biz?.id) lines.push(`- businessId: ${biz.id}`);
        if (currentTemplateCategory) lines.push(`- templateCategory: ${currentTemplateCategory}`);
        if (currentDesignPreset) lines.push(`- designPreset: ${currentDesignPreset}`);

        if (!cancelled) setBusinessDataContext(lines.length ? lines.join("\n") : null);
      } catch (e) {
        console.warn("[WebBuilder] Failed to load business data", e);
        if (!cancelled) setBusinessDataContext(null);
      }
    }

    loadBusinessData();
    return () => {
      cancelled = true;
    };
  }, [businessId, currentDesignPreset, currentTemplateCategory]);
  
  // Set default businessId + industry for intent routing
  useEffect(() => {
    // Use a UUID so backend tables that store business_id as UUID don't fail
    const effectiveBusinessId = businessId || getOrCreatePreviewBusinessId(systemType);
    const isRealBusinessId = !!businessId;

    if (effectiveBusinessId) {
      setDefaultBusinessId(effectiveBusinessId);
      console.log('[WebBuilder] Set default businessId for intents:', effectiveBusinessId, {
        provenance: isRealBusinessId ? 'launcher' : 'preview-placeholder',
      });
      if (!isRealBusinessId) {
        // Boot-time assertion: a preview placeholder means install-system did
        // not return a real business — automatable intents (booking, orders,
        // donations) will write to a scratch row and never surface in the
        // owner's dashboards. Fire a loud warn so the OS Health surface can
        // pick it up.
        console.warn(
          '[WebBuilder] businessId is a preview placeholder — real backend intents will not persist. ' +
            'Re-run the System Launcher to provision a durable business.',
        );
      }
    }

    // Resolve industry from launch state → snapshot → system type fallback.
    const effectiveIndustry =
      launch?.industry ||
      (launch?.siteBundleSnapshot as { industry?: string } | undefined)?.industry ||
      (typeof activeSystemType === 'string' ? activeSystemType : null);
    setDefaultIndustry(effectiveIndustry || null);

    // Set up system type and demo mode for AI-generated content
    if (activeSystemType) {
      setCurrentSystemType(activeSystemType);
      // Enable demo mode for preview - intents will show mock success responses
      setDemoMode(true);
      console.log('[WebBuilder] Enabled demo mode for system type:', activeSystemType);
    }

    // Cleanup on unmount
    return () => {
      setDefaultBusinessId(null);
      setDefaultIndustry(null);
      setCurrentSystemType(null);
      setDemoMode(false);
    };
  }, [businessId, systemType, activeSystemType, launch?.industry, launch?.siteBundleSnapshot]);

  // Production readiness signal: keep Web Builder startup render-only.
  // Permission-sensitive install checks previously ran during every builder
  // mount and could lock the shell when policies/functions returned 403.
  useEffect(() => {
    setBackendInstalled(Boolean(businessId));
  }, [businessId]);

  const handleRunPublishChecks = useCallback(() => {
    toast.success('Publish checks passed (UI gate only)', {
      description: 'Next: run real backend verification before publish.'
    });
  }, []);
  
  // AI Activity Monitor - tracks all agent events for this business
  const aiActivity = useAIActivityMonitor({
    businessId: cloudState.business.id || undefined,
    maxEvents: 20,
  });
  
  
  // Track changes to code OR VFS file map (multi-file AI edits update VFS, not previewCode).
  useEffect(() => {
    const codeChanged = previewCode !== initialCodeRef.current &&
                      !previewCode.includes('AI-generated code will appear here');
    const currentFiles = virtualFSRef.current.getSandpackFiles();
    const vfsChanged = computeVfsSignature(currentFiles) !== lastSavedVfsSignatureRef.current
      && Object.keys(currentFiles).length > 0;
    setHasUnsavedChanges(codeChanged || vfsChanged);
  }, [previewCode, virtualFS.nodes, computeVfsSignature]);
  
  // Helper to get final TSX with customizer overrides baked in
  const getFinalCodeWithOverrides = useCallback(() => {
    if (templateCustomizer.isDirty) {
      const baseSource = templateCustomizer.getOriginalSource() || previewCode;
      return templateCustomizer.applyOverrides(baseSource);
    }
    return previewCode;
  }, [templateCustomizer, previewCode]);

  // Canonical playground handed to AI Builder commits. Without it,
  // commitToPipeline's recompile path throws ("non-wizard commits require
  // `playground`") and every AI edit is rejected as
  // "Canonical pipeline failed; nothing safe to publish".
  const aiCommitPlayground = useMemo<PlaygroundState>(() => ({
    pageRegistry: creatorPlayground.pageRegistry,
    creatorData: creatorPlayground.creatorData,
    bindings: playgroundBindings,
    calendars: playgroundCalendars,
    popups: playgroundPopups,
  }), [
    creatorPlayground.pageRegistry,
    creatorPlayground.creatorData,
    playgroundBindings,
    playgroundCalendars,
    playgroundPopups,
  ]);

  const aiCommitBusinessName =
    creatorPlayground.creatorData.businessInfo.businessName ||
    currentTemplateName ||
    projectNameFromState ||
    systemName ||
    undefined;

  // Build the v2 save payload — full multi-page VFS round-trip

  const buildSavePayload = useCallback(() => {
    const canonicalPlayground = {
      pageRegistry: creatorPlayground.pageRegistry,
      creatorData: creatorPlayground.creatorData,
      bindings: playgroundBindings,
      calendars: playgroundCalendars,
      popups: playgroundPopups,
    };
    const currentFiles = virtualFS.getSandpackFiles();
    const effectiveBusinessName =
      creatorPlayground.creatorData.businessInfo.businessName ||
      currentTemplateName ||
      projectNameFromState ||
      systemName ||
      'Business';
    const persistedSnapshot = (() => {
      try {
        const raw = currentFiles['/.unison/site-bundle-snapshot.json'];
        return raw
          ? JSON.parse(raw) as {
              meta?: { themePresetId?: string | null; templateId?: string | null };
              themeTokens?: import('@/sections/types').ThemeTokens;
            }
          : null;
      } catch {
        return null;
      }
    })();
    // Chain-of-custody: after compile, the SiteBundleSnapshot is the source
    // of truth for themePresetId/templateId. Re-derive from snapshot.meta so
    // autosave/recompile never throws when in-memory wizard props drift.
    const snapshotMeta = effectiveRouteState?.siteBundleSnapshot?.meta || persistedSnapshot?.meta;
    const effectiveThemePresetId =
      resolvedThemePresetId ||
      snapshotMeta?.themePresetId ||
      currentDesignPreset ||
      undefined;
    const effectiveTemplateId =
      snapshotMeta?.templateId ||
      undefined;
    const effectiveSelectedThemeId =
      currentDesignPreset ||
      resolvedThemePresetId ||
      snapshotMeta?.themePresetId ||
      undefined;
    const effectiveThemeTokens =
      effectiveRouteState?.siteBundleSnapshot?.themeTokens ||
      persistedSnapshot?.themeTokens ||
      effectiveRouteState?.wizardSelections?.themeTokens;
    const recompilation = commitToPipeline(
      {
        playground: canonicalPlayground,
        existingVfsFiles: currentFiles,
        businessName: effectiveBusinessName,
        industry: effectiveRouteState?.siteBundleSnapshot?.industry,
        selectedTemplateId: effectiveTemplateId,
        selectedThemeId: effectiveSelectedThemeId,
        themePresetId: effectiveThemePresetId,
        themeTokens: effectiveThemeTokens,
      },
      'playground-edit',
    );
    const launchArtifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: currentFiles,
      preferredEntryPoint: launchEntryPoint,
      siteBundleSnapshot: recompilation.siteBundleSnapshot,
      compiledPlayground: recompilation.compileResult,
      canonicalPlayground,
      businessId: businessId ?? undefined,
      projectId: projectId ?? undefined,
      manifestId: currentManifestId || manifestIdFromState || undefined,
      systemType: activeSystemType || systemType || undefined,
      systemName: systemName || effectiveBusinessName,
      templateName: currentTemplateName || effectiveBusinessName,
      templateCategory: currentTemplateCategory || undefined,
      businessName: effectiveBusinessName,
      industry: recompilation.siteBundleSnapshot.industry,
      aesthetic: currentDesignPreset || undefined,
      themePresetId: effectiveThemePresetId,
      backendRequired: effectiveRouteState?.runtimeManifest?.backendRequired ?? false,
      wizardSelections: effectiveRouteState?.wizardSelections || undefined,
    });

    return {
      vfsFiles: launchArtifacts.files,
      entryPoint: launchArtifacts.entryPoint,
      activePagePath,
      businessId: businessId ?? null,
      projectId: projectId ?? null,
      canonicalPlayground: launchArtifacts.canonicalPlayground,
      siteBundleSnapshot: launchArtifacts.siteBundleSnapshot,
      metadata: {
        // Project identity is strictly the project's own name. Never fall
        // back to a business/wizard name here — that's how legacy drafts
        // ended up titled "My Business".
        name: (
          projectDisplayName.trim() ||
          saveProjectName.trim() ||
          projectNameFromState ||
          currentTemplateName ||
          ''
        ).trim() || `Project ${(projectId || '').slice(0, 8) || 'untitled'}`,
        projectName: (
          projectDisplayName.trim() ||
          saveProjectName.trim() ||
          projectNameFromState ||
          currentTemplateName ||
          ''
        ).trim() || `Project ${(projectId || '').slice(0, 8) || 'untitled'}`,
        businessName: effectiveBusinessName,
        systemType: activeSystemType || systemType || null,
        templateCategory: currentTemplateCategory || null,
        aesthetic: currentDesignPreset || null,
        manifestId: currentManifestId || manifestIdFromState || null,
        launchSource: effectiveRouteState?.wizardSelections
          ? 'system_launcher'
          : effectiveRouteState?.systemsBuildContext
            ? 'business_launcher'
            : routeStateHasStructuredProject
              ? 'launcher'
              : 'web_builder',
      },
    };
  }, [
    virtualFS,
    launchEntryPoint,
    activePagePath,
    businessId,
    projectId,
    creatorPlayground.pageRegistry,
    creatorPlayground.creatorData,
    playgroundBindings,
    playgroundCalendars,
    playgroundPopups,
    currentTemplateName,
    projectDisplayName,
    saveProjectName,
    projectNameFromState,
    systemName,
    effectiveRouteState,
    currentManifestId,
    manifestIdFromState,
    activeSystemType,
    systemType,
    currentTemplateCategory,
    currentDesignPreset,
    currentDraftId,
    resolvedThemePresetId,
    routeStateHasStructuredProject,
  ]);

  /**
   * Non-throwing wrapper around buildSavePayload(). Older/recovered drafts
   * can lack the wizard themePresetId/themeTokens the canonical recompile
   * step requires — that used to escape as an unhandled ThemeSeedError and
   * fail the ENTIRE save/update/autosave (not just skip the recompile).
   * Persist the existing VFS files as-is in that case; the content itself
   * is fine, only re-derivation of the compiled artifacts is blocked.
   */
  const buildSavePayloadOrFallback = useCallback((fallbackVfsFiles: Record<string, string>) => {
    try {
      return buildSavePayload();
    } catch (error) {
      if (!isRecompileInputError(error)) throw error;
      console.warn(
        '[WebBuilder] Canonical recompile deferred — persisting existing VFS files as-is:',
        error instanceof Error ? error.message : error,
      );
      return {
        vfsFiles: fallbackVfsFiles,
        entryPoint: launchEntryPoint,
        activePagePath,
        businessId: businessId ?? null,
        projectId: projectId ?? null,
        metadata: { launchSource: undefined },
      };
    }
  }, [buildSavePayload, launchEntryPoint, activePagePath, businessId, projectId]);

  const ensureLauncherDraftSaved = useCallback(async (
    reason: 'launcher_import' | BuilderSaveReason,
    snapshotFiles?: Record<string, string>,
    snapshotCode?: string,
  ): Promise<string | null> => {
    const effectiveName = (
      projectDisplayName.trim() ||
      saveProjectName.trim() ||
      currentTemplateName ||
      projectNameFromState ||
      effectiveRouteState?.templateName ||
      `Project ${(projectId || '').slice(0, 8) || Date.now().toString(36)}`
    ).trim();

    if (!effectiveName) {
      return null;
    }

    const finalCode = snapshotCode || getFinalCodeWithOverrides();
    if (!finalCode || finalCode.includes('AI-generated code will appear here')) {
      return null;
    }

    if (draftPersistencePromiseRef.current) {
      return draftPersistencePromiseRef.current;
    }

    const vfsFiles = snapshotFiles || virtualFSRef.current.getSandpackFiles();
    const payload = {
      ...buildSavePayloadOrFallback(vfsFiles),
      vfsFiles,
    };
    const effectiveDescription = (
      saveProjectDescription.trim() ||
      `Generated from ${payload.metadata?.launchSource || 'launcher'}`
    ).trim();

    draftPersistencePromiseRef.current = templateFiles.ensureDraft(
      effectiveName,
      effectiveDescription,
      finalCode,
      {
        ...payload,
        silent: true,
        metadata: {
          ...(payload.metadata || {}),
          autoSaved: true,
          autoSaveReason: reason,
          autoSavedAt: new Date().toISOString(),
        },
      },
    ).then((draftId) => {
      if (draftId) {
        currentDraftIdRef.current = draftId;
        templateFiles.setCurrentDraftId(draftId);
        setCurrentDraftId(draftId);
        setCurrentTemplateName(effectiveName);
        if (!saveProjectName.trim()) {
          setSaveProjectName(effectiveName);
        }
      }
      return draftId;
    }).finally(() => {
      draftPersistencePromiseRef.current = null;
    });

    return draftPersistencePromiseRef.current;
  }, [
    projectDisplayName,
    saveProjectName,
    currentTemplateName,
    projectNameFromState,
    effectiveRouteState?.templateName,
    projectId,
    getFinalCodeWithOverrides,
    buildSavePayloadOrFallback,
    saveProjectDescription,
    templateFiles,
  ]);

  // Auto-save draft to localStorage + Supabase. Triggers on EITHER:
  //  - Legacy single-file `previewCode` change (template/inline edits), OR
  //  - VFS file map change (multi-file AI edits, importBuilderFiles, etc.)
  // Without the VFS-signature check, AI multi-file edits never persisted.
  const saveDraft = useCallback((options?: {
    force?: boolean;
    reason?: BuilderSaveReason;
    vfsFiles?: Record<string, string>;
  }): Promise<boolean> => {
    const currentVfsFiles = options?.vfsFiles || virtualFSRef.current.getSandpackFiles();
    const vfsSignature = computeVfsSignature(currentVfsFiles);
    const codeForSave = currentVfsFiles[activePagePath] || previewCode || '';
    const editorCodeForSave = editorCode || codeForSave;
    const previewCodeChanged = !!codeForSave && codeForSave !== lastSavedCodeRef.current;
    const vfsChanged = vfsSignature !== '' && vfsSignature !== lastSavedVfsSignatureRef.current;

    if (!options?.force && !previewCodeChanged && !vfsChanged) return Promise.resolve(true);

    const reason = options?.reason || 'interval_autosave';
    const snapshot: BuilderRecoverySnapshot = {
      version: 2,
      code: codeForSave,
      editorCode: editorCodeForSave,
      savedAt: new Date().toISOString(),
      templateId: currentDraftIdRef.current || null,
      vfsSignature,
      vfsFiles: currentVfsFiles,
      reason,
      pendingRemote: true,
    };

    // Synchronous interruption boundary: the full VFS is safe before a remote
    // request is queued, even if the browser process exits immediately.
    // A failed local journal write (quota exceeded, private-mode storage) must
    // NEVER block the cloud save — that is the durable copy of the user's work.
    if (!writeBuilderRecoverySnapshot(snapshot)) {
      console.warn('[AutoSave] Local recovery journal unavailable; continuing with cloud save.');
    }


    setAutoSaveStatus('saving');
    const autosaveSnapshot = hydratedRevision?.siteBundleSnapshot ?? null;
    const livePageRegistry = creatorPlaygroundStateRef.current.pageRegistry;
    const hasLivePages = Object.keys(livePageRegistry?.pages ?? {}).length > 0;
    const autosavePlayground = hasLivePages
      ? {
          pageRegistry: livePageRegistry,
          creatorData: creatorPlaygroundStateRef.current.creatorData,
          calendars: (autosaveSnapshot as { calendars?: unknown } | null)?.calendars ?? {},
          popups: (autosaveSnapshot as { popups?: unknown } | null)?.popups ?? {},
        }
      : (hydratedRevision?.playground ?? null);
    const persist = async (): Promise<boolean> => {
      try {
        const existingDraftId = currentDraftIdRef.current;
        const canonicalProjectId = resolvedProjectId || projectId;
        if (!existingDraftId || !businessId || !canonicalProjectId) {
          throw new Error('Canonical project identity is required before cloud autosave.');
        }
        if (!autosavePlayground) {
          // No canonical playground yet (registry still hydrating). Committing
          // now would throw inside the pipeline and persist a rejected revision,
          // which strands the draft without a committed projection.
          console.warn('[AutoSave] Skipped — canonical playground not hydrated yet.');
          setAutoSaveStatus('idle');
          return false;
        }
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Authenticated project identity is required before cloud autosave.');



        const commit = await commitMutation({
          source: 'playground-edit',
          identity: {
            userId: user.id,
            businessId,
            projectId: canonicalProjectId,
            draftId: existingDraftId,
            revisionId: currentRevisionIdRef.current,
            sessionId: `web-builder:${existingDraftId}`,
          },
          current: {
            vfsFiles: currentVfsFiles,
            siteBundleSnapshot: autosaveSnapshot ?? undefined,
            // Non-wizard commits recompile from the canonical playground; without
            // it commitToPipeline throws and every autosave persists a `rejected`
            // revision, leaving builder_drafts.last_revision_id null (the draft
            // then looks "lost" on reopen). Prefer the live registry, fall back to
            // the hydrated revision's playground projection.
            playground: (autosavePlayground ?? undefined) as never,
            activePagePath,
          },
          patch: legacyFilesToPatchPlan(currentVfsFiles, `Autosave: ${reason}`),
          options: {
            requirePreviewPass: true,
            requireReadinessPass: false,
          },
        });
        if (!commit.persistedRevisionId) {
          throw new Error('Canonical autosave did not persist a revision.');
        }
        currentRevisionIdRef.current = commit.persistedRevisionId;
        setCurrentRevisionId(commit.persistedRevisionId);
        currentDraftIdRef.current = existingDraftId;
        markBuilderRecoveryPersisted(snapshot, existingDraftId);
        lastSavedCodeRef.current = codeForSave;
        lastSavedVfsSignatureRef.current = vfsSignature;
        setLastSavedAt(new Date());
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
        return true;
      } catch (error) {
        // Expected, transient: right after a Wizard launch handoff, the
        // canonical draft/business/project identity can take a beat to
        // hydrate. The autosave interval fires every few seconds regardless,
        // so this is not a real failure — only escalate to console.error
        // once identity should already be resolved.
        const isIdentityNotReadyYet = error instanceof Error
          && /Canonical project identity is required before cloud autosave\./.test(error.message);
        if (isIdentityNotReadyYet) {
          console.warn('[AutoSave] Skipped — canonical project identity not hydrated yet:', error.message);
        } else {
          console.error('[AutoSave] Error saving draft:', error);
        }
        setAutoSaveStatus('idle');
        return false;
      }
    };

    // Prevent a slower, older request from finishing after a newer AI edit and
    // replacing builder_drafts.vfs_files with stale state.
    const queued = saveQueueRef.current.then(persist, persist);
    saveQueueRef.current = queued.catch(() => false);
    return queued;
  }, [
    previewCode,
    editorCode,
    computeVfsSignature,
    activePagePath,
    businessId,
    projectId,
    resolvedProjectId,
    hydratedRevision,
  ]);

  // Keep latest saveDraft in a ref so unload/visibility handlers always call the freshest version.
  const saveDraftRef = useRef(saveDraft);
  saveDraftRef.current = saveDraft;

  // Handle back navigation with source-aware routing.
  const handleBackNavigation = useCallback(() => {
    const codeChanged = previewCode !== initialCodeRef.current;
    const currentVfsFiles = virtualFSRef.current.getSandpackFiles();
    const vfsDirty = computeVfsSignature(currentVfsFiles) !== lastSavedVfsSignatureRef.current;
    const shouldReturnToCloudWorkspace =
      effectiveRouteState?.returnToCloudTab === 'projects' || effectiveRouteState?.from === 'Workspace Settings';

    const navigateBack = () => {
      // The launcher handoff is a one-shot recovery record. If it is left in
      // session storage, LauncherHandoffRouteGuard immediately bounces the user
      // back to /web-builder and the back arrow looks dead. Consume it here.
      clearLauncherHandoff();
      // Always route to the home page from the web builder so users get a clean
      // entry point instead of reverting to a stale preview/history state.
      navigate('/home');
    };

    if ((codeChanged || vfsDirty) && hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? Your draft will be auto-saved.'
      );
      if (confirmLeave) {
        saveDraft();
        navigateBack();
      }
    } else {
      navigateBack();
    }
  }, [previewCode, hasUnsavedChanges, navigate, saveDraft, computeVfsSignature, effectiveRouteState, location.key]);

  useEffect(() => {
    autoSaveTimerRef.current = setInterval(saveDraft, AUTO_SAVE_INTERVAL);
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [saveDraft]);

  // Reactive save: when VFS file map changes (AI multi-file edits, imports, etc.),
  // debounce a save so changes survive Preview refresh + builder navigation.
  useEffect(() => {
    const t = window.setTimeout(() => {
      // First-ever VFS observation after mount/load: seed the baseline signature
      // instead of saving — unless a pending recovery journal proves a remote
      // write was interrupted and still needs to be replayed.
      if (lastSavedVfsSignatureRef.current === '') {
        const files = virtualFSRef.current.getSandpackFiles();
        if (Object.keys(files).length > 0) {
          const recovery = currentDraftIdRef.current
            ? readBuilderRecoverySnapshot(currentDraftIdRef.current)
            : readBuilderRecoverySnapshot(null);
          if (recovery?.pendingRemote && Object.keys(recovery.vfsFiles).length > 0) {
            void saveDraftRef.current({
              force: true,
              reason: 'ai_recovery',
              vfsFiles: recovery.vfsFiles,
            });
            return;
          }
          lastSavedVfsSignatureRef.current = computeVfsSignature(files);
        }
        return;
      }
      void saveDraftRef.current();
    }, 1500);
    return () => window.clearTimeout(t);
    // virtualFS.nodes is the canonical change signal exposed by useVFS.
  }, [virtualFS.nodes, computeVfsSignature]);

  // Flush on tab close, refresh, or visibility change so AI edits aren't lost.
  useEffect(() => {
    const flush = () => {
      try {
        const currentVfsFiles = virtualFSRef.current.getSandpackFiles();
        const sig = computeVfsSignature(currentVfsFiles);
        const previewDirty = !!previewCode && previewCode !== lastSavedCodeRef.current;
        const vfsDirty = sig !== '' && sig !== lastSavedVfsSignatureRef.current;
        if (!previewDirty && !vfsDirty) return;

        // saveDraft writes the full local journal synchronously, then queues the
        // best-effort Cloud mirror.
        void saveDraftRef.current({
          force: true,
          reason: 'navigation_flush',
          vfsFiles: currentVfsFiles,
        });
      } catch (e) {
        console.warn('[AutoSave] flush failed:', e);
      }
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentVfsFiles = virtualFSRef.current.getSandpackFiles();
      const sig = computeVfsSignature(currentVfsFiles);
      const previewDirty = !!previewCode && previewCode !== lastSavedCodeRef.current;
      const vfsDirty = sig !== '' && sig !== lastSavedVfsSignatureRef.current;
      if (previewDirty || vfsDirty) {
        flush();
        // Native browser prompt — preserves data even if the user cancels nav.
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [computeVfsSignature, previewCode]);

  
  // Restore draft on mount — ONLY when NOT loading a specific saved project by URL.
  // If ?id= is present the Supabase load is the authoritative source; restoring a
  // stale localStorage draft here would overwrite the correct project state.
  useEffect(() => {
    try {
      // If the user navigated here to open a specific saved project, skip restore.
      const urlId = new URLSearchParams(location.search).get('id');
      if (urlId) return;

      // Also skip if incoming route state already carries structured project files.
      if (routeStateHasStructuredProject) return;

      const savedDraft = localStorage.getItem('webbuilder_autosave_draft');
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const savedTime = new Date(draft.savedAt);
        const now = new Date();
        const hoursSinceLastSave = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);
        
        const hasRecoveredVfs = draft.vfsFiles && Object.keys(draft.vfsFiles).length > 0;
        // Only restore if draft is less than 24 hours old
        if (hoursSinceLastSave < 24 && (draft.code || hasRecoveredVfs)) {
          // Check if there's meaningful content (not just default)
          const isDefaultContent = draft.code?.includes('AI-generated code will appear here');
          if (!isDefaultContent) {
            setShowLauncher(false);
            if (hasRecoveredVfs) {
              importBuilderFiles(draft.vfsFiles, {
                preferredPath: activePagePath,
                entryPoint: launchEntryPoint,
                replace: true,
              });
            }
            if (draft.code) setPreviewCode(draft.code);
            if (draft.editorCode) {
              setEditorCode(draft.editorCode);
            }
            setLastSavedAt(savedTime);
            toast.info('Draft restored', {
              description: `Last saved ${format(savedTime, 'MMM d, h:mm a')}`,
              action: {
                label: 'Discard',
                onClick: () => {
                  localStorage.removeItem('webbuilder_autosave_draft');
                  setPreviewCode(WELCOME_APP_TSX);
                },
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('[AutoSave] Error restoring draft:', error);
    }
  }, []);
   
  const refreshPreviewCart = useCallback(() => {
    setPreviewCartVersion((version) => version + 1);
  }, []);

  const openPreviewCart = useCallback((step: 'cart' | 'checkout' | 'success' = 'cart') => {
    refreshPreviewCart();
    setPreviewCartStep(step);
    setPreviewCartOpen(true);
  }, [refreshPreviewCart]);

  const mapOverlayIdToConfig = useCallback((
    overlayId: string,
    payload?: Record<string, unknown>,
  ): OverlayConfig | null => {
    switch (overlayId) {
      case 'auth-login':
        return { type: 'auth-login', payload };
      case 'auth-register':
        return { type: 'auth-register', payload };
      case 'booking':
      case 'booking_intake':
      case 'consultation_intake':
      case 'reservation':
      case 'patient_intake':
        return { type: 'booking', payload };
      case 'contact':
      case 'lead':
      case 'lead-capture':
      case 'project_inquiry':
      case 'property_inquiry':
      case 'volunteer':
      case 'demo_request':
        return { type: 'contact', payload };
      case 'quote':
      case 'quote_request':
        return { type: 'quote', payload };
      case 'newsletter':
      case 'waitlist':
        return { type: 'newsletter', payload };
      case 'checkout':
      case 'payments-setup':
        return { type: 'checkout', payload };
      case 'booking-confirmation':
      case 'order-confirmation':
      case 'confirmation':
        return { type: 'confirmation', payload };
      case 'upgrade':
        return { type: 'upgrade', payload };
      default:
        return null;
    }
  }, []);

  useEffect(() => {
    const handleBrowserCartUpdate = () => {
      refreshPreviewCart();
    };
    const handleCartViewIntent = () => openPreviewCart('cart');

    const handleRuntimeOverlayMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OVERLAY_OPEN') {
        const overlayId = String(event.data.overlayId || '');
        const payload = (event.data.payload || {}) as Record<string, unknown>;

        if (overlayId === 'cart') {
          const requestedStep = payload.step === 'checkout' ? 'checkout' : 'cart';
          openPreviewCart(requestedStep);
          return;
        }

        const nextOverlay = mapOverlayIdToConfig(overlayId, payload);
        if (nextOverlay) {
          setActiveRuntimeOverlay(nextOverlay);
        }
      }

      if (event.data?.type === 'OVERLAY_CLOSE') {
        const overlayId = String(event.data.overlayId || '');
        if (!overlayId || overlayId === 'cart') {
          setPreviewCartOpen(false);
          setPreviewCartStep('cart');
        }
        if (!overlayId || overlayId !== 'cart') {
          setActiveRuntimeOverlay(null);
        }
      }

      if (event.data?.type === 'TOAST_SHOW' && event.data.toast?.message) {
        const nextToast = event.data.toast as { type?: string; message: string };
        if (nextToast.type === 'error') toast.error(nextToast.message);
        else if (nextToast.type === 'warning') toast.warning(nextToast.message);
        else if (nextToast.type === 'success') toast.success(nextToast.message);
        else toast(nextToast.message);
      }
    };

    window.addEventListener(BROWSER_CART_EVENT, handleBrowserCartUpdate as EventListener);
    window.addEventListener('message', handleRuntimeOverlayMessage);
    window.addEventListener('intent:cart.view', handleCartViewIntent);

    return () => {
      window.removeEventListener(BROWSER_CART_EVENT, handleBrowserCartUpdate as EventListener);
      window.removeEventListener('message', handleRuntimeOverlayMessage);
      window.removeEventListener('intent:cart.view', handleCartViewIntent);
    };
  }, [mapOverlayIdToConfig, openPreviewCart, refreshPreviewCart]);

  // Listen for INTENT_TRIGGER messages from iframe previews
  useEffect(() => {
    const handleIntentMessage = (event: MessageEvent) => {
      // Research overlay messages (context intelligence)
      if (event.data?.type === 'RESEARCH_OPEN') {
        const payload = event.data?.payload as ResearchOverlayPayload | undefined;
        if (!payload?.query) return;
        setResearchPayload(payload);
        setResearchOverlayOpen(true);
        return;
      }
      
      // Handle multi-page navigation sync (instant navigation from cached pages)
      if (event.data?.type === 'NAV_PAGE_SWITCH') {
        const { pagePath, pageName } = event.data;
        console.log('[WebBuilder] Page switch from iframe:', pagePath, pageName);
        const normalizedPath = (pagePath || `/${pageName || ''}`).trim();
        const normalizedName = normalizedPath
          .replace(/^\//, '')
          .replace(/\.html?$/i, '')
          .replace(/[^a-zA-Z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        const componentName = normalizedName
          .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
          .replace(/^\w/, c => c.toUpperCase());
        const targetPath = !normalizedName || normalizedName === 'index' || normalizedName === 'home'
          ? launchEntryPoint
          : `/src/pages/${componentName}.tsx`;
        const vfsFiles = virtualFS.getSandpackFiles();
        const pageContent = vfsFiles[targetPath] || (pagePath ? vfsFiles[pagePath] : undefined);
        if (pageContent) {
          syncBuilderFromFiles(vfsFiles, targetPath);
        }
        // Navigation is handled via HashRouter — no manifest sync needed
        return;
      }
      
      // Handle in-place page navigation: iframe sends raw HTML, we process it
      // through codeToHtml (which injects intent wiring) and reload the iframe
      if (event.data?.type === 'NAV_PAGE_REPLACE') {
        const { pagePath, pageName, pageContent, cacheScript } = event.data;
        console.log('[WebBuilder] NAV_PAGE_REPLACE:', pagePath, pageName);
        const normalizedPath = (pagePath || `/${pageName || ''}`).trim();
        const normalizedName = normalizedPath
          .replace(/^\//, '')
          .replace(/\.html?$/i, '')
          .replace(/[^a-zA-Z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        const componentName = normalizedName
          .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
          .replace(/^\w/, c => c.toUpperCase());
        const targetPath = !normalizedName || normalizedName === 'index' || normalizedName === 'home'
          ? launchEntryPoint
          : `/src/pages/${componentName}.tsx`;
        const rawContent = pageContent || '';
        if (cacheScript) {
          console.log('[WebBuilder] Ignoring cacheScript for VFS-first NAV_PAGE_REPLACE flow');
        }

        const converted = templateToVFSFiles(rawContent, componentName || 'Page');
        const convertedEntry = converted[resolveLauncherEntryPoint(converted, launchEntryPoint)] || '';
        if (!convertedEntry) {
          console.warn('[WebBuilder] NAV_PAGE_REPLACE conversion failed for path:', targetPath);
          toast.error('Could not convert page payload into React source');
          return;
        }

        const vfsPatch: Record<string, string> = {
          [targetPath]: convertedEntry,
        };
        if (converted['/src/template.css']) {
          vfsPatch['/src/template.css'] = converted['/src/template.css'];
        }
        if (converted['/src/index.css']) {
          vfsPatch['/src/index.css'] = converted['/src/index.css'];
        }

        importBuilderFiles(vfsPatch, {
          preferredPath: targetPath,
          entryPoint: targetPath,
        });
        
        // Navigation is handled via HashRouter — no manifest sync needed
        return;
      }
      
      // Handle manifest request from iframe — navigation is via HashRouter now
      if (event.data?.type === 'REQUEST_PAGE_MANIFEST') {
        console.log('[WebBuilder] Iframe page manifest request — handled via router');
        return;
      }
      
      // Handle preview navigation messages from VFSPreview static HTML
      // This enables links to work inside the preview iframe
      if (event.data?.type === 'preview-nav') {
        const { intent, path, label } = event.data;
        console.log('[WebBuilder] Preview navigation:', intent, path, label);
        
        if (!path) return;
        
        // Handle hash/anchor navigation - let the preview handle it
        if (path.startsWith('#')) {
          return; // Anchor links already work in the preview
        }
        
        // Normalize path to React page file
        const pageName = path.replace(/^\//, '').replace(/\.html$/, '').replace(/[^a-zA-Z0-9-]/g, '-') || 'page';
        const componentName = pageName.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
        const vfsPath = `/src/pages/${componentName}.tsx`;
        const vfsFiles = virtualFS.getSandpackFiles();
        const existingPage = vfsFiles[vfsPath];
        
        if (existingPage) {
          syncBuilderFromFiles(vfsFiles, vfsPath);
          toast(`Navigated to ${label || path}`, { description: 'React page loaded from VFS' });
        } else {
          // Page doesn't exist - trigger AI generation
          console.log('[WebBuilder] React page not in VFS, generating:', pageName, label);
          triggerPageGenRef.current(pageName, label || pageName, null, undefined);
        }
        return;
      }
      
      // Handle preview intent messages (form submissions, etc.)
      if (event.data?.type === 'preview-intent') {
        const { intent, payload } = event.data;
        console.log('[WebBuilder] Preview intent:', intent, payload);
        // Handle form intents - show success toast for demo
        if (intent?.includes('contact') || intent?.includes('newsletter') || intent?.includes('subscribe')) {
          toast.success('Form submitted!', { description: 'This is a preview - no data was sent.' });
        } else if (intent?.includes('booking')) {
          toast.success('Booking requested!', { description: 'This is a preview - connect your calendar to enable.' });
        } else {
          toast('Intent triggered', { description: `${intent} (preview mode)` });
        }
        return;
      }

      // Only handle intent trigger messages
      if (event.data?.type !== 'INTENT_TRIGGER') return;
      
      const { intent, payload, requestId } = event.data;
      console.log('[WebBuilder] Received intent from preview:', intent, payload, 'requestId:', requestId);

      // Get the source window for sending results back
      const source = (event.source && typeof (event.source as any).postMessage === 'function')
        ? (event.source as Window)
        : null;

      // Helper to send result back to iframe
      const sendResultToIframe = (result: { success: boolean; [key: string]: unknown }) => {
        if (source && requestId) {
          source.postMessage({
            type: 'INTENT_RESULT',
            requestId,
            result
          }, '*');
        }
      };

      // Reset any unrelated preview chrome before routing the next deterministic action.
      // Overlays are now allowed, but only through the shared surface resolver below.
      setPipelineOverlayOpen(false);
      setPipelineConfig(null);
      setDemoOverlayOpen(false);
      setDemoConfig(null);

      // ── Label-aware intent classification ──
      const buttonLabel = (payload as any)?.buttonLabel || (payload as any)?.text || (payload as any)?.label || '';
      const elementCtx: ElementContext = {
        isInNav: !!(payload as any)?.isInNav || !!(payload as any)?.inNav,
        isInFooter: !!(payload as any)?.isInFooter || !!(payload as any)?.inFooter,
        utIntent: intent,
        noIntent: !!(payload as any)?.noIntent,
        href: (payload as any)?.href || (payload as any)?.path,
      };

      const classification = classifyLabel(buttonLabel, elementCtx);
      const inPreviewHandled = !!(payload as any)?.inPreviewHandled;
      const pageInventory = (payload as any)?.pageInventory as PageInventory | undefined;

      console.log('[WebBuilder] Intent received:', intent, buttonLabel,
        '| inPreview:', inPreviewHandled, '| inventory:', pageInventory);

      // ── nav.goto_page: resolve via RouteNavigationService ──
      if (intent === 'nav.goto_page') {
        const targetPageId = (payload as any)?.targetPageId;
        const vfsFiles = virtualFS.getSandpackFiles();
        const resolved = resolveNavigationTarget(
          { targetPageId, label: buttonLabel },
          creatorPlayground.pageRegistry,
          vfsFiles,
        );

        if (!resolved.existsInRegistry) {
          const sitePlan = activeSitePlanRef.current;
          if (sitePlan) {
            const fallbackRoute = resolveIntentTarget(
              creatorPlayground.pageRegistry,
              sitePlan.redirects,
              null,
              buttonLabel || ''
            );
            if (fallbackRoute) {
              const resolved2 = resolveNavigationTarget(
                { route: fallbackRoute },
                creatorPlayground.pageRegistry,
                vfsFiles,
              );
              if (resolved2.pageId) {
                navigateToBuilderPage(resolved2.pageId);
                sendResultToIframe({ success: true });
                return;
              }
            }
          }
          // Not in registry — use resolver before generating
          const resolvedAction = resolvePreviewAction(
            intent, buttonLabel, pageInventory, vfsFiles, classification, inPreviewHandled, payload as Record<string, unknown> | undefined,
          );
          if (resolvedAction.action === 'navigate') {
            if (source && requestId) {
              source.postMessage({ type: 'NAV_ROUTE', requestId, route: resolvedAction.route }, '*');
            }
            openBuilderFile(resolvedAction.vfsPath);
            sendResultToIframe({ success: true });
          } else if (resolvedAction.action !== 'acknowledge') {
            const targetName = classification.suggestedPageType || buttonLabel || 'page';
            triggerPageGenRef.current(targetName, buttonLabel || targetName, source, requestId);
          } else {
            sendResultToIframe({ success: true });
          }
          return;
        }

        if (resolved.pageId) {
          navigateToBuilderPage(resolved.pageId);
          if (source && requestId) {
            source.postMessage({ type: 'NAV_ROUTE', requestId, route: resolved.route || '/' }, '*');
          }
          sendResultToIframe({ success: true });
        }
        return;
      }

      // ── nav.goto: resolve via RouteNavigationService ──
      if (intent === 'nav.goto') {
        let path = (payload as any)?.path;
        if (path && path.startsWith('#')) {
          // Hardened hash-route normalization: generated pages sometimes
          // carry hash-style page links (`#services`) for what is actually
          // a real, separate page. A bare `#` (no fragment) is a genuine
          // placeholder — leave that as a no-op. Anything else gets
          // normalized to an absolute route and resolved the same way as
          // a plain path, instead of silently acknowledging without
          // navigating.
          const fragment = path.replace(/^#\/?/, '');
          if (!fragment) {
            sendResultToIframe({ success: true });
            return;
          }
          path = `/${fragment}`;
        }
        if (path) {
          const vfsFiles = virtualFS.getSandpackFiles();
          const resolved = resolveNavigationTarget(
            { route: path, label: buttonLabel },
            creatorPlayground.pageRegistry,
            vfsFiles,
          );
          if (resolved.pageId) {
            navigateToBuilderPage(resolved.pageId);
            if (source && requestId) {
              source.postMessage({ type: 'NAV_ROUTE', requestId, route: resolved.route || path }, '*');
            }
            toast(`Navigated to ${buttonLabel || path}`);
            sendResultToIframe({ success: true });
          } else {
            const pageName = path.replace(/^\//, '').replace(/\.html$/, '').replace(/[^a-zA-Z0-9-]/g, '-') || 'page';
            triggerPageGenRef.current(pageName, buttonLabel || pageName, source, requestId);
          }
        }
        return;
      }

      // ── All other intents: run through the resolver ───────────────────────
      const vfsFiles = virtualFS.getSandpackFiles();
      const resolvedAction = resolvePreviewAction(
        intent, buttonLabel, pageInventory, vfsFiles, classification, inPreviewHandled, payload as Record<string, unknown> | undefined,
      );

      console.log('[WebBuilder] Resolved action:', resolvedAction);

      switch (resolvedAction.action) {

        // ── Acknowledge: preview already handled it, just confirm ─────────
        case 'acknowledge': {
          sendResultToIframe({ success: true });
          return;
        }

        // ── Scroll: send INTENT_COMMAND to the iframe ──────────────────────
        case 'cart': {
          if (intent === 'cart.add' || intent === 'cart.view') {
            void handleIntent(intent, {
              ...(payload as IntentPayload),
              businessId,
              projectId,
            }).then((result) => {
              refreshPreviewCart();
              if (result.success) {
                openPreviewCart(resolvedAction.step);
              }
              sendResultToIframe({ success: result.success, ...result });
            }).catch((error) => {
              const message = error instanceof Error ? error.message : 'Cart action failed';
              toast.error(message);
              sendResultToIframe({ success: false, error: message });
            });
            return;
          }

          openPreviewCart(resolvedAction.step);
          sendResultToIframe({ success: true, ui: { openModal: 'cart' } });
          return;
        }

        case 'overlay': {
          const overlayPayload = {
            ...(payload as Record<string, unknown>),
            businessId,
            siteId: projectId,
            projectId,
            source: (payload as Record<string, unknown> | undefined)?.source
              || (intent === 'lead.capture' ? 'lead_capture' : intent),
          };
          const overlayConfig = mapOverlayIdToConfig(resolvedAction.overlayId, overlayPayload);
          if (overlayConfig) {
            setActiveRuntimeOverlay(overlayConfig);
            sendResultToIframe({ success: true, ui: { openModal: resolvedAction.overlayId } });
            return;
          }
          sendResultToIframe({ success: false, error: `Unsupported overlay: ${resolvedAction.overlayId}` });
          return;
        }

        case 'scroll': {
          if (!source) {
            sendResultToIframe({ success: true });
            return;
          }
          void (async () => {
            const scrollReqId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const scrolled = await new Promise<boolean>((resolve) => {
              const t = window.setTimeout(() => {
                window.removeEventListener('message', onScroll);
                resolve(false);
              }, 1200);
              const onScroll = (evt: MessageEvent) => {
                if (evt.data?.type !== 'INTENT_COMMAND_RESULT') return;
                if (evt.data?.requestId !== scrollReqId) return;
                window.clearTimeout(t);
                window.removeEventListener('message', onScroll);
                resolve(!!evt.data?.handled);
              };
              window.addEventListener('message', onScroll);
              source.postMessage({ type: 'INTENT_COMMAND', command: resolvedAction.command, requestId: scrollReqId }, '*');
            });
            if (scrolled) {
              // Contextual hint toast per intent
              const hints: Record<string, string> = {
                'booking.create':       'Fill out the booking form below',
                'contact.submit':       'Fill out the contact form below',
                'newsletter.subscribe': 'Enter your email to subscribe',
                'quote.request':        'Fill out the quote form below',
                'lead.capture':         'Fill out the form below',
                'auth.login':           'Sign in to continue',
                'auth.register':        'Create your account below',
                'pay.checkout':         'Choose a plan below',
                'cart.checkout':        'Review your cart below',
              };
              toast.info(hints[intent] ?? 'Fill out the form below');
              sendResultToIframe({ success: true });
            } else {
              // Section not found — fall back to executing the intent directly
              console.log('[WebBuilder] Scroll target not found, executing intent:', intent);
              try {
                const res = await handleIntent(intent, {
                  ...(payload as IntentPayload),
                  businessId,
                  projectId,
                });
                if (res.success) {
                  sendResultToIframe({ success: true, ...res });
                } else {
                  toast.error(res.error || 'Action failed');
                  sendResultToIframe({ success: false, error: res.error });
                }
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Unknown error';
                sendResultToIframe({ success: false, error: msg });
              }
            }
          })();
          return;
        }

        // ── Navigate: page exists — route without generating ───────────────
        case 'navigate': {
          if (source && requestId) {
            source.postMessage({ type: 'NAV_ROUTE', requestId, route: resolvedAction.route }, '*');
          }
          openBuilderFile(resolvedAction.vfsPath);
          toast(`Navigated to ${buttonLabel || resolvedAction.route}`);
          sendResultToIframe({ success: true });
          return;
        }

        // ── Generate: last resort AI page creation ─────────────────────────
        case 'generate': {
          triggerPageGenRef.current(resolvedAction.pageType, resolvedAction.label, source, requestId);
          return;
        }
      }
    };
    
    window.addEventListener('message', handleIntentMessage);
    
    // Listen for VFS-based external navigation events (emitted by intent router, action catalog, etc.)
    const handleExternalNavEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const url = detail?.url || detail?.target;
      if (!url) return;
      
      console.log('[WebBuilder] External navigation event (VFS):', url);
      const pageName = url.replace(/^https?:\/\/[^/]+\/?/, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'external';
      const label = detail?.buttonLabel || detail?.text || url;
      triggerPageGenRef.current(pageName, label, null, undefined);
    };
    window.addEventListener('intent:nav.external', handleExternalNavEvent);
    
    return () => {
      window.removeEventListener('message', handleIntentMessage);
      window.removeEventListener('intent:nav.external', handleExternalNavEvent);
    };
  }, []);

  const replaceProjectFiles = useCallback((
    files: Record<string, string>,
    options?: { activePath?: string; entryContent?: string }
  ) => {
    const activePath = options?.activePath || launchEntryPoint;
    const entryContent = options?.entryContent ?? files[activePath] ?? '';
    openBuilderFile(activePath, entryContent);
    vfsReplaceFiles(files);
  }, [launchEntryPoint, openBuilderFile, vfsReplaceFiles]);

  // Auto AI page generation on button click is REMOVED.
  // Missing routes are handled by the deterministic canonical router + scaffolded
  // placeholder pages. We still respond to NAV_PAGE_GENERATE so the preview iframe
  // doesn't hang waiting for a reply, and we keep NAV_PAGE_RELOAD_REQUIRED.
  useEffect(() => {
    const handleNavPageGenerate = (event: MessageEvent) => {
      if (event.data?.type !== 'NAV_PAGE_GENERATE') return;
      const source = (event.source && typeof (event.source as any).postMessage === 'function')
        ? (event.source as Window) : null;
      const requestId = event.data.requestId;
      if (source && requestId) {
        source.postMessage({
          type: 'NAV_PAGE_ERROR',
          requestId,
          error: 'Auto-page generation disabled. Add the page in Creator Playground.',
        }, '*');
      }
    };

    // Handle fallback reload request when in-iframe navigation fails
    const handleNavPageReload = (event: MessageEvent) => {
      if (event.data?.type !== 'NAV_PAGE_RELOAD_REQUIRED') return;
      const { pageName, pageContent } = event.data;
      console.log('[WebBuilder] Navigation reload required for:', pageName);

      if (pageContent) {
        const componentName = pageName.replace(/[-_\s]+(.)/g, (_: string, c: string) => c.toUpperCase()).replace(/^\w/, (c: string) => c.toUpperCase());
        const vfsPath = `/src/pages/${componentName}.tsx`;

        importBuilderFiles(templateToVFSFiles(pageContent, componentName), {
          preferredPath: vfsPath,
          entryPoint: vfsPath,
        });
      }
    };

    window.addEventListener('message', handleNavPageGenerate);
    window.addEventListener('message', handleNavPageReload);
    return () => {
      window.removeEventListener('message', handleNavPageGenerate);
      window.removeEventListener('message', handleNavPageReload);
    };
  }, [importBuilderFiles]);

  // No-op stub for the removed auto AI page generation feature.
  // Many call sites still reference triggerPageGenRef.current(...). All become no-ops.
  const triggerPageGenRef = useRef((
    _pageName: string,
    _navLabel?: string,
    _source?: Window | null,
    _requestId?: string | undefined,
  ) => {
    if (import.meta.env.DEV) {
      console.debug('[WebBuilder] auto-page generation disabled; ignoring', _pageName);
    }
  });


  // Clear draft when template is saved
  const clearDraft = useCallback(() => {
    localStorage.removeItem(getAutoSaveKey());
    lastSavedCodeRef.current = '';
  }, [getAutoSaveKey]);

  // Add console log to confirm component is rendering
  console.log('[WebBuilder] Component rendering with CodeMirror...');

  // Load template from navigation state (from Web Design Kit)
  useEffect(() => {
    const navState = effectiveRouteState;

    const navStateSignature = navState
      ? JSON.stringify({
          hasVfsFiles: !!navState.vfsFiles,
          vfsSignature: createVfsHandoffSignature(navState.vfsFiles),
          snapshotId: navState.siteBundleSnapshot?.snapshotId ?? null,
          snapshotVfsSignature: createVfsHandoffSignature(navState.siteBundleSnapshot?.vfsFiles),
          revisionId: navState.revisionId ?? null,
          hasSiteBundle: !!navState.siteBundle,
          generatedCodeLength: navState.generatedCode?.length ?? 0,
          templateName: navState.templateName ?? null,
          systemType: navState.systemType ?? null,
          entryPoint: navState.entryPoint ?? null,
          runtimeEntryPoint: navState.runtimeManifest?.entryPoint ?? null,
          routeCount: navState.runtimeManifest?.routes?.length ?? 0,
        })
      : null;

    if (navStateSignature && importedRouteStateRef.current === navStateSignature) {
      return;
    }

    const launcherEntryPoint = navState?.runtimeManifest?.entryPoint ?? navState?.entryPoint;
    const launcherSourceFiles = (() => {
      if (!navState) return null;

      const siteBundleFiles = navState.siteBundle
        ? compileSiteBundleToVFS({
            siteBundle: navState.siteBundle,
            entryPath: navState.runtimeManifest?.routes?.[0] || '/',
          })
        : null;

      const snapshotVfsFiles = navState.siteBundleSnapshot?.vfsFiles;
      if (navState.vfsFiles || snapshotVfsFiles) {
        const mergedFiles = { ...snapshotVfsFiles, ...navState.vfsFiles };
        if (siteBundleFiles) {
          for (const [path, content] of Object.entries(siteBundleFiles)) {
            if (!mergedFiles[path]) {
              mergedFiles[path] = content;
            }
          }
        }
        return mergedFiles;
      }

      return siteBundleFiles;
    })();

    if (navState?.startInPreview && !launcherSourceFiles) {
      toast.error('Launcher preview requires structured VFS files from the industry pipeline.');
      importedRouteStateRef.current = navStateSignature;
      window.history.replaceState({}, document.title);
      return;
    }

    // If a pre-built VFS plan was passed (e.g. from System Launcher AI edits), import it first.
    if (launcherSourceFiles) {
      // Resolve the wizard's Style-card preset (single source of truth for /src/index.css).
      // Falls back deterministically: navState.aesthetic → siteBundle appContext → preview default.
      const resolvedThemePresetId =
        (navState.themePresetId && isValidAesthetic(navState.themePresetId) ? navState.themePresetId : null)
        || (navState.aesthetic && isValidAesthetic(navState.aesthetic) ? navState.aesthetic : null)
        || ((navState as { siteBundleSnapshot?: { meta?: { themePresetId?: string } } }).siteBundleSnapshot?.meta?.themePresetId)
        || ((navState as { siteBundleSnapshot?: { appContext?: { themePresetId?: string } } }).siteBundleSnapshot?.appContext?.themePresetId)
        || null;

      // Normalize launcher files — ensures /src/main.tsx, /src/index.css, /src/App.tsx exist.
      // We thread the resolved preset so the css-fallback path inside normalizeLauncherFiles
      // never injects a hard-coded 'modern' default for non-store industries.
      const normalizedEntryPoint = launcherEntryPoint
        ? (launcherEntryPoint.startsWith('/') ? launcherEntryPoint : `/${launcherEntryPoint}`)
        : null;
      let vfsFiles = normalizeLauncherFiles(launcherSourceFiles, {
        entryPoint: normalizedEntryPoint || launcherEntryPoint,
        themePresetId: resolvedThemePresetId,
        injectCssIfMissing: !(navState.siteBundleSnapshot || navState.fromLauncher),
      });

      let wizardResolution = resolveSnapshot(vfsFiles, navState as any);
      vfsFiles = projectSnapshotVfsFiles(vfsFiles, wizardResolution);
      wizardResolution = resolveSnapshot(vfsFiles, navState as any);
      assertNoMinimalFallbackPreview(vfsFiles, wizardResolution, 'Launcher handoff import');
      if (wizardResolution.isWizardDraft && !vfsFiles['/src/index.css']) {
        throw new Error('[WebBuilder] Launcher handoff is missing injected /src/index.css from SiteBundleSnapshot; refusing preview CSS fallback.');
      }

      if (Object.keys(vfsFiles).length > 0) {
        const editableEntryPath = selectEditableEntryPath(
          vfsFiles,
          normalizedEntryPoint || launchEntryPoint,
        ) || activePagePath;
        const entry = editableEntryPath ? vfsFiles[editableEntryPath] : undefined;
        const safeEntry = entry ? ensureReactImports(entry) : undefined;
        const importedFiles = editableEntryPath && safeEntry && entry !== safeEntry
          ? { ...vfsFiles, [editableEntryPath]: safeEntry }
          : vfsFiles;

        replaceProjectFiles(importedFiles, {
          activePath: editableEntryPath || launchEntryPoint,
          entryContent: safeEntry,
        });

        if (safeEntry) {
          setEditorCode(safeEntry);
          setPreviewCode(safeEntry);
        }

        // Keep builder metadata in sync for VFS-first launches
        if (navState.templateName) {
          setCurrentTemplateName(navState.templateName);
          setSaveProjectName(navState.templateName);
        }
        if (!saveProjectDescription && navState.systemType) {
          setSaveProjectDescription(`Generated from ${navState.systemType} launcher`);
        }
        if (navState.systemType && !activeSystemType) {
          setActiveSystemType(navState.systemType as BusinessSystemType);
          console.log('[WebBuilder] Set active system type from VFS generation:', navState.systemType);
        }

        // Auto-hydrate Creator's Playground from imported VFS
        setTimeout(() => {
          const files = virtualFS.getSandpackFiles();
          if (Object.keys(files).length > 0) {
            const result = creatorPlayground.hydrateFromVFS(virtualFS.nodes, files);
            console.log('[WebBuilder] Playground hydrated from VFS import:', result.stats);
            if (result.stats.pagesDetected > 0) {
              toast.success('Studio synced', {
                description: `${result.stats.pagesDetected} pages${result.funnelAutoWired ? ` + funnel (${result.stats.funnelSteps} steps)` : ''} loaded`,
              });
            }
          }
        }, 200);

        if (navState.startInPreview) {
          setViewMode('canvas');
          toast(`${navState.templateName || 'Template'} loaded!`, {
            description: `${navState.aesthetic || 'custom'} - Preview your AI-generated website`,
          });
          if (navState.systemType) {
            setTimeout(() => setShowBusinessSetup(true), 1500);
          }
        } else {
          setViewMode('code');
        }

        // Prevent re-processing generatedCode when vfsFiles already represent source of truth
        importedRouteStateRef.current = navStateSignature;
        // Keep both compact route state and the TTL-bound session handoff as
        // recovery layers. `importedRouteStateRef` prevents this successful
        // import from running repeatedly during the current mount.
        return;
      }
    }

    if (navState?.generatedCode) {
      const { templateName, aesthetic, startInPreview, systemType: navSystemType } = navState;
      // Sanitize AI output — strip prose/reasoning, keep only code
      const rawCode = navState.generatedCode;
        const generatedCode = extractCleanCode(rawCode);
        if (!generatedCode || !looksLikeCode(generatedCode)) {
        console.warn('[WebBuilder] Rejected generatedCode — looks like prose, not code');
        toast.error('Generated content was not valid code. Please try again.');
        return;
      }
      console.log('[WebBuilder] Loading template code:', templateName, 'startInPreview:', startInPreview, 'systemType:', navSystemType);
      if (templateName) setCurrentTemplateName(templateName);

        let nextCode = generatedCode;
        const nextFiles: Record<string, string> = {};
      
      // Auto-hydrate Creator's Playground from AI-generated content
      setTimeout(() => {
        const files = virtualFS.getSandpackFiles();
        if (Object.keys(files).length > 0) {
          const result = creatorPlayground.hydrateFromVFS(virtualFS.nodes, files);
          if (result.stats.pagesDetected > 0) {
            console.log('[WebBuilder] Playground auto-hydrated from AI generation:', result.stats);
            toast.success('Studio synced', {
              description: `${result.stats.pagesDetected} pages${result.funnelAutoWired ? ` + funnel (${result.stats.funnelSteps} steps)` : ''} loaded`,
            });
          }
        }
      }, 300);
      
      // Ensure code is pure React/TSX — wrap any remaining HTML as safety net
      const isRawHTML = !generatedCode.includes('import ') && !generatedCode.includes('export default') &&
        (generatedCode.trim().startsWith('<!DOCTYPE') || generatedCode.trim().startsWith('<html') ||
        generatedCode.includes('<!-- ') || (generatedCode.includes('class=') && !generatedCode.includes('className=')));
        if (isRawHTML) {
          const result = getTemplateReactCodeWithCSS({ code: generatedCode, title: templateName || 'Template' });
          nextCode = result.code;
          if (result.css) {
            nextFiles['/src/template.css'] = result.css;
          }
        } else {
        // Extract any legacy TEMPLATE_STYLES/TEMPLATE_CSS from React code
        const { cleanCode, css } = extractEmbeddedCSS(generatedCode);
          nextCode = cleanCode;
        if (css) {
            nextFiles['/src/template.css'] = css;
        }
      }

        nextFiles[launchEntryPoint] = nextCode;
        // Normalize to ensure main.tsx and index.css exist
        const normalizedFiles = normalizeLauncherFiles(nextFiles, {
          entryPoint: launchEntryPoint,
          themePresetId: resolvedThemePresetId,
          injectCssIfMissing: !navState.siteBundleSnapshot,
        });
        replaceProjectFiles(normalizedFiles, {
          activePath: launchEntryPoint,
          entryContent: nextCode,
        });
        setEditorCode(nextCode);
        setPreviewCode(nextCode);
      
      // Set system type for intent routing if AI generated with system context
      if (navSystemType && !activeSystemType) {
        setActiveSystemType(navSystemType as BusinessSystemType);
        console.log('[WebBuilder] Set active system type from AI generation:', navSystemType);
      }
      
      // Start in canvas/preview mode if coming from homepage AI panel, otherwise code mode
      if (startInPreview) {
        setViewMode('canvas');
        toast(`${templateName} loaded!`, {
          description: `${aesthetic} - Preview your AI-generated website`,
        });
        
        // Show business setup suggestions after a brief delay for AI-generated sites
        if (navSystemType) {
          setTimeout(() => setShowBusinessSetup(true), 1500);
        }
      } else {
        setViewMode('code');
        toast(`${templateName} loaded!`, {
          description: `${aesthetic} - View and edit in Code Editor`,
        });
      }
      // Clear the state to prevent re-loading on subsequent renders
      importedRouteStateRef.current = navStateSignature;
      window.history.replaceState({}, document.title);
    } else if (navState?.generatedTemplate) {
      const { generatedTemplate, templateName, aesthetic } = navState;
      console.log('[WebBuilder] Loading template from Web Design Kit:', templateName);

      const reactCode = buildSectionsReactApp(generatedTemplate);
      // Wire through VFS so preview stays in sync
      const templateFiles = normalizeLauncherFiles({
        [launchEntryPoint]: reactCode,
      }, {
        entryPoint: launchEntryPoint,
        themePresetId: resolvedThemePresetId,
        injectCssIfMissing: !navState.siteBundleSnapshot,
      });
      replaceProjectFiles(templateFiles, {
        activePath: launchEntryPoint,
        entryContent: reactCode,
      });
      setEditorCode(reactCode);
      setPreviewCode(reactCode);
      setViewMode('code');
      toast(`${templateName || generatedTemplate.name} loaded!`, {
        description: `${aesthetic || generatedTemplate.description} - View and edit in Code Editor`,
      });
      importedRouteStateRef.current = navStateSignature;
      window.history.replaceState({}, document.title);
    }
  }, [effectiveRouteState, activePagePath, activeSystemType, creatorPlayground, launchEntryPoint, replaceProjectFiles, virtualFS]);


  const launcherDraftBootstrapKey = useMemo(() => {
    if (!routeStateHasStructuredProject) return null;
    return JSON.stringify({
      projectId: projectId || null,
      businessId: businessId || null,
      templateName: effectiveRouteState?.templateName || currentTemplateName || null,
      systemType: effectiveRouteState?.systemType || null,
      entryPoint: effectiveRouteState?.entryPoint || effectiveRouteState?.runtimeManifest?.entryPoint || null,
    });
  }, [
    routeStateHasStructuredProject,
    projectId,
    businessId,
    effectiveRouteState?.templateName,
    effectiveRouteState?.systemType,
    effectiveRouteState?.entryPoint,
    effectiveRouteState?.runtimeManifest?.entryPoint,
    currentTemplateName,
  ]);

  useEffect(() => {
    if (!launcherDraftBootstrapKey || templateFiles.currentDraftId) {
      return;
    }

    if (!previewCode || previewCode.includes('AI-generated code will appear here')) {
      return;
    }

    if (launcherDraftBootstrapRef.current === launcherDraftBootstrapKey) {
      return;
    }

    launcherDraftBootstrapRef.current = launcherDraftBootstrapKey;
    void ensureLauncherDraftSaved('launcher_import').then((draftId) => {
      if (!draftId) {
        // Do NOT clear the key here: a failed autosave used to re-arm this
        // effect on every render, which produced an endless "Failed to update
        // project" toast loop. One retry, then the user drives saving.
        launcherDraftBootstrapAttemptsRef.current += 1;
        if (launcherDraftBootstrapAttemptsRef.current < 2) {
          launcherDraftBootstrapRef.current = null;
        }
      }
    });

  }, [
    launcherDraftBootstrapKey,
    templateFiles.currentDraftId,
    previewCode,
    ensureLauncherDraftSaved,
  ]);

  // Handle AI code generation
  const handleAICodeGenerated = (code: string) => {
    console.log('[WebBuilder] AI code received:', code.substring(0, 100));
    importBuilderFiles(templateToVFSFiles(code, currentTemplateName || 'AI Template'), {
      preferredPath: launchEntryPoint,
      entryPoint: launchEntryPoint,
    });
    setViewMode('canvas'); // Switch to canvas view to show the generated template preview
    toast('AI Template Generated!', {
      description: 'Glass UI template is ready for preview',
    });
  };

  // Clear canvas and reset to initial state
  const handleClearCanvas = () => {
    setEditorCode(CLEAR_CANVAS_JS_SEED);
    setPreviewCode(WELCOME_APP_TSX);

    
    // Clear VFS to empty state
    virtualFS.resetToEmpty();
    
    // Clear current template state
    templateFiles.clearCurrentTemplate();
    setCurrentTemplateName(null);
    setSaveProjectName("");
    setSaveProjectDescription("");
    
    // Clear fabric canvas if it exists
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#ffffff';
      fabricCanvas.renderAll();
    }
    
    toast('Canvas Cleared!', {
      description: 'Starting fresh with a clean slate',
    });
  };

  // Helper to integrate CSS into HTML document (pure impl extracted to web-builder/htmlAssembly)
  const integrateCSSIntoHTML = useCallback(
    (html: string, css: string): string => integrateCSSIntoHTMLPure(html, css),
    [],
  );


  // Handle loading a saved template
  const handleLoadTemplate = useCallback((template: {
    id: string;
    name: string;
    description?: string;
    canvas_data: { html?: string; css?: string; previewCode?: string; js?: string };
  }) => {
    // Get the base HTML - prefer previewCode as it's the most complete
    let code = template.canvas_data?.previewCode || template.canvas_data?.html || '';
    
    if (!code) {
      toast.error('Template has no content');
      return;
    }
    
    // If there's separate CSS that's not in previewCode, integrate it
    const separateCss = template.canvas_data?.css || '';
    if (separateCss && !code.includes(separateCss.substring(0, 50))) {
      code = integrateCSSIntoHTML(code, separateCss);
    }
    
    // If there's separate JS that's not in previewCode, integrate it
    const separateJs = template.canvas_data?.js || '';
    if (separateJs && !code.includes(separateJs.substring(0, 50))) {
      const scriptTag = `<script>\n${separateJs}\n</script>`;
      if (code.includes('</body>')) {
        code = code.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        code = code + `\n${scriptTag}`;
      }
    }
    
    importBuilderFiles(templateToVFSFiles(code, template.name), {
      preferredPath: launchEntryPoint,
      entryPoint: launchEntryPoint,
    });
    
    // Track the current template ID and name for re-save
    templateFiles.setCurrentDraftId(template.id);
    setCurrentTemplateName(template.name);
    setSaveProjectName(template.name);
    setProjectDisplayName(template.name);
    setSaveProjectDescription(template.description || '');
    
    // Switch to preview mode to show the loaded template
    setBuilderMode('preview');
    
    toast.success(`Opened "${template.name}"`, {
      description: 'Template loaded - you can continue editing',
    });
  }, [templateFiles, integrateCSSIntoHTML, importBuilderFiles, launchEntryPoint]);

  // Handle template selection from LayoutTemplatesPanel (used by FloatingDock)
  const handleSelectTemplate = useCallback((
    code: string,
    name: string,
    selectedSystemType?: BusinessSystemType,
    templateId?: string
  ) => {
    console.log('[WebBuilder] ========== TEMPLATE SELECTED ==========');
    console.log('[WebBuilder] Template:', name, 'code length:', code.length);

    const effectiveSystemType = (selectedSystemType || (systemType as BusinessSystemType) || null) as BusinessSystemType | null;
    setActiveSystemType(effectiveSystemType);
    setCurrentTemplateName(name);
    // `templateId` here is the layout/demo template's own id (e.g.
    // "salon-premium"), never a persisted builder_drafts row id — loading a
    // saved draft goes through handleLoadTemplate/handleLoadSavedTemplate
    // instead. Carrying it into currentDraftId corrupted every downstream
    // canonical-draft read/write (e.g. loadProjectedRevisionForDraft) with an
    // id that isn't a valid draft UUID, producing repeated 400s and blocking
    // autosave. Starting a demo template has no persisted draft yet.
    setCurrentDraftId(null);
    if (manifestIdFromState) setCurrentManifestId(manifestIdFromState);

    // Normalize + auto-migrate CTAs into the slot/intent contract
    const normalized = normalizeTemplateForCtaContract({
      code,
      systemType: effectiveSystemType,
    });
    setTemplateCtaAnalysis(normalized.analysis);
    
    importBuilderFiles(templateToVFSFiles(normalized.code, name), {
      preferredPath: launchEntryPoint,
      entryPoint: launchEntryPoint,
    });
    
    toast.success(`Loaded template: ${name}`, {
      description: 'Template loaded into preview'
    });
  }, [systemType, manifestIdFromState, importBuilderFiles, launchEntryPoint]);

  // Handle section layout swap from SectionLayoutPicker — routed through the
  // canonical commit so the SiteBundleSnapshot owns the swap.
  // Pass 5 — the builder never resolves a variant/recipe itself; the canonical
  // commit (VFSCommitService) is the only layer allowed to validate and apply
  // a presentation op against the sealed snapshot.
  const handleSwapSection = useCallback((sectionId: string, variantId: string) => {
    void commitVariantSelection(sectionId, variantId);
  }, [commitVariantSelection]);

  // Handle saving current template
  const handleSaveTemplate = useCallback(async (
    name: string,
    description: string,
    isPublic: boolean
  ) => {
    const finalCode = getFinalCodeWithOverrides();
    await templateFiles.saveTemplate(
      name,
      description,
      isPublic,
      finalCode,
      buildSavePayloadOrFallback(virtualFSRef.current.getSandpackFiles()),
    );
  }, [templateFiles, getFinalCodeWithOverrides, buildSavePayloadOrFallback]);

  // Handle quick save (update existing template)
  const handleQuickSave = useCallback(async () => {
    if (templateFiles.currentDraftId) {
      const finalCode = getFinalCodeWithOverrides();
      await templateFiles.updateTemplate(
        templateFiles.currentDraftId,
        finalCode,
        buildSavePayloadOrFallback(virtualFSRef.current.getSandpackFiles()),
      );
    } else {
      setFileManagerOpen(true);
    }
  }, [templateFiles, getFinalCodeWithOverrides, buildSavePayloadOrFallback]);

  // Handle save to projects from preview
  const handleSaveToProjects = useCallback(async (saveAsNew: boolean = false) => {
    if (!saveProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    
    setIsSavingProject(true);
    try {
      const isUpdating = templateFiles.currentDraftId && !saveAsNew;
      const finalCode = getFinalCodeWithOverrides();
      const basePayload = buildSavePayloadOrFallback(virtualFSRef.current.getSandpackFiles());
      
      if (isUpdating) {
        // Update existing project
        await templateFiles.updateTemplate(templateFiles.currentDraftId, finalCode, basePayload);
        toast.success(`Updated "${saveProjectName}"`);
      } else {
        // Save as new project — strip source projectId + flag forceNew so a
        // brand-new builder_draft (and projects row via trigger) is created
        // instead of silently overwriting the currently-open project.
        const sourceDraftId = templateFiles.currentDraftId || null;
        const newPayload = {
          ...basePayload,
          projectId: null,
          forceNew: true,
          metadata: {
            ...(basePayload.metadata || {}),
            sourceDraftId,
            savedAs: 'new',
          },
        };
        const newDraftId = await templateFiles.saveTemplate(
          saveProjectName,
          saveProjectDescription,
          false,
          finalCode,
          newPayload,
        );
        if (newDraftId) {
          // Point the shell at the newly-created draft so subsequent autosaves
          // and history entries target the copy, not the original.
          templateFiles.setCurrentDraftId(newDraftId);
          setCurrentDraftId(newDraftId);
          setCurrentTemplateName(saveProjectName);
        }
        toast.success(saveAsNew ? `Saved "${saveProjectName}" as a new project` : `Saved "${saveProjectName}" to Projects`);
      }
      
      setSaveProjectDialogOpen(false);
      clearDraft(); // Clear auto-save draft after successful save
    } catch (error) {
      console.error("Error saving to projects:", error);
      toast.error("Failed to save project");
    } finally {
      setIsSavingProject(false);
    }
  }, [saveProjectName, saveProjectDescription, templateFiles, getFinalCodeWithOverrides, clearDraft, buildSavePayload]);

  // Render code from Code Editor to Fabric.js canvas
  const handleRenderToCanvas = async () => {
    if (!fabricCanvas) {
      console.warn('[WebBuilder] Canvas not ready yet');
      return;
    }

    try {
      toast('Rendering to canvas...', {
        description: 'Converting code to Fabric.js objects',
      });

      // Import the component renderer
      const { parseComponentCode, renderComponentToCanvas } = await import('@/utils/componentRenderer');
      
      const component = parseComponentCode(editorCode);
      await renderComponentToCanvas(component, fabricCanvas);
      
      setViewMode('canvas'); // Switch to canvas view to see the result
      
      toast('Rendered successfully!', {
        description: 'Your code is now on the Fabric.js canvas',
      });
    } catch (error) {
      console.error('[WebBuilder] Render error:', error);
      toast('Render failed', {
        description: error instanceof Error ? error.message : 'Failed to render to canvas',
      });
    }
  };

  // State management - template schema as source of truth
  const templateState = useTemplateState(fabricCanvas);
  const { updateTemplate } = templateState;

  // History management - both canvas and code history
  const canvasHistory = useCanvasHistory(fabricCanvas);
  const { undo: undoCanvas, redo: redoCanvas, canUndo: canUndoCanvas, canRedo: canRedoCanvas, save: saveCanvas } = canvasHistory;
  const codeHistory = useCodeHistory(100);
  const { push: pushCodeHistory, undo: undoCode, redo: redoCode } = codeHistory;

  // Track code changes for undo/redo
  useEffect(() => {
    if (previewCode && !previewCode.includes('AI-generated code will appear here')) {
      pushCodeHistory(previewCode);
    }
  }, [previewCode, pushCodeHistory]);

  // Unified undo handler
  const handleUndo = useCallback(() => {
    const previousCode = undoCode();
    if (previousCode) {
      setPreviewCode(previousCode);
      setEditorCode(previousCode);
      toast.success('Undo', { description: 'Previous state restored' });
    } else if (canUndoCanvas) {
      undoCanvas();
    }
  }, [undoCode, canUndoCanvas, undoCanvas]);

  // Unified redo handler
  const handleRedo = useCallback(() => {
    const nextCode = redoCode();
    if (nextCode) {
      setPreviewCode(nextCode);
      setEditorCode(nextCode);
      toast.success('Redo', { description: 'Next state restored' });
    } else if (canRedoCanvas) {
      redoCanvas();
    }
  }, [redoCode, canRedoCanvas, redoCanvas]);

  // Manual refresh handler — always uses VFSPreview (Sandpack)
  const handleRefreshPreview = useCallback(() => {
    setIsRefreshing(true);
    livePreviewRef.current?.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  const handlePreviewCartQuantityChange = useCallback(async (productId: string, quantity: number) => {
    await previewCartManager.update(productId, quantity);
    refreshPreviewCart();
  }, [previewCartManager, refreshPreviewCart]);

  const handlePreviewCartRemove = useCallback(async (productId: string) => {
    await previewCartManager.remove(productId);
    refreshPreviewCart();
  }, [previewCartManager, refreshPreviewCart]);

  const handlePreviewCartCheckout = useCallback(async (customer: { email: string; name: string }) => {
    try {
      setPreviewCartSubmitting(true);
      if (!customer.email) {
        toast.error('Email is required to submit checkout');
        return false;
      }

      toast.success('Checkout submitted', {
        description: `Captured ${previewCart.items.length} item${previewCart.items.length === 1 ? '' : 's'} for ${customer.email}.`,
      });
      await previewCartManager.clear();
      refreshPreviewCart();
      setPreviewCartStep('success');
      return true;
    } finally {
      setPreviewCartSubmitting(false);
    }
  }, [previewCart.items.length, previewCartManager, refreshPreviewCart]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvasElement = canvasRef.current;
    let disposed = false;
    let canvas: FabricCanvas | null = null;

    // Fabric is a large optional runtime. Load it after the generated-site
    // preview shell has mounted instead of blocking first interaction.
    const start = () => {
      void import('fabric').then(({ Canvas }) => {
        if (disposed) return;
        canvas = new Canvas(canvasElement, {
          width: 1280,
          height: canvasHeight,
          backgroundColor: '#ffffff',
        });
        setFabricCanvas(canvas);
      }).catch((error) => {
        console.error('[WebBuilder] Fabric canvas failed to initialize:', error);
      });
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 250);

    return () => {
      disposed = true;
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      clearSelectionRef.current();
      canvas?.clear();
      canvas?.dispose();
      setFabricCanvas(null);
    };
    // Canvas size updates are handled by the dedicated resize effect.
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'Alt+ArrowLeft',
      description: 'Go back to previous page',
      action: handleBackNavigation,
    },
    {
      ...defaultWebBuilderShortcuts.undo,
      action: handleUndo,
    },
    {
      ...defaultWebBuilderShortcuts.redo,
      action: handleRedo,
    },
    {
      ...defaultWebBuilderShortcuts.redoAlt,
      action: handleRedo,
    },
    {
      ...defaultWebBuilderShortcuts.delete,
      action: () => {
        if (selectedHTMLElement) {
          handleDeleteHTMLElement();
        } else if (selectedObject) {
          handleDelete();
        }
      },
    },
    {
      ...defaultWebBuilderShortcuts.backspace,
      action: () => {
        if (selectedHTMLElement) {
          handleDeleteHTMLElement();
        } else if (selectedObject) {
          handleDelete();
        }
      },
    },
    {
      ...defaultWebBuilderShortcuts.duplicate,
      action: () => {
        if (selectedHTMLElement) {
          handleDuplicateHTMLElement();
        } else if (selectedObject) {
          handleDuplicate();
        }
      },
    },
    {
      ...defaultWebBuilderShortcuts.save,
      action: () => {
        saveCanvas();
      },
    },
    {
      ...defaultWebBuilderShortcuts.toggleCode,
      action: () => setCodePreviewOpen(true),
    },
    {
      key: 'F1',
      description: 'Show Interactive Mode Help',
      action: () => setIsInteractiveModeHelpOpen(true),
    },
    {
      key: 'F5',
      description: 'Refresh preview',
      action: handleRefreshPreview,
    },
    {
      key: 'v',
      description: 'Select mode',
      action: () => {
        setBuilderMode('select');
        setIsInteractiveMode(false);
      },
    },
    {
      key: 'p',
      description: 'Preview mode',
      action: () => {
        setBuilderMode('preview');
        setIsInteractiveMode(true);
        setSelectedHTMLElement(null);
        clearSelection();
        clearLivePreviewSelection();
      },
    },
    {
      key: 'Delete',
      description: 'Delete selected HTML element',
      action: () => {
        if (selectedHTMLElement?.selector) {
          handleDeleteHTMLElement();
        } else if (selectedObject) {
          handleDelete();
        }
      },
    },
    {
      key: 'Backspace',
      description: 'Delete selected HTML element',
      action: () => {
        if (selectedHTMLElement?.selector) {
          handleDeleteHTMLElement();
        } else if (selectedObject) {
          handleDelete();
        }
      },
    },
    {
      key: 'd',
      ctrl: true,
      description: 'Duplicate selected HTML element',
      action: () => {
        if (selectedHTMLElement?.selector) {
          handleDuplicateHTMLElement();
        } else if (selectedObject) {
          handleDuplicate();
        }
      },
    },
  ]);

  // Handle generated templates from navigation state (Web Design Kit)
  useEffect(() => {
    if (!effectiveRouteState?.generatedTemplate) return;
    if (!fabricCanvas) {
      console.log('[WebBuilder] Canvas not ready, will process template when canvas is available');
      return;
    }

    const { generatedTemplate } = effectiveRouteState;
    console.log('[WebBuilder] Template received from route state:', generatedTemplate);

    updateTemplate(generatedTemplate).then(() => {
      console.log('[WebBuilder] ✅ Template successfully rendered from route state');
      setShowPreview(true);
      // Clear the state to prevent re-loading
      window.history.replaceState({}, document.title);
    }).catch((error) => {
      console.error('[WebBuilder] ❌ Failed to render template from route state:', error);
      toast.error('Failed to render template: ' + (error instanceof Error ? error.message : 'Unknown error'));
    });
  }, [effectiveRouteState, fabricCanvas, updateTemplate]);

  // Auto-adjust canvas height based on content
  const updateCanvasHeight = useCallback(() => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    if (objects.length === 0) {
      setCanvasHeight(800);
      return;
    }
    
    let maxBottom = 800; // Minimum height
    objects.forEach((obj: FabricCanvas['_objects'][0]) => {
      const objBottom = (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1);
      if (objBottom > maxBottom) {
        maxBottom = objBottom;
      }
    });
    
    // Add padding at the bottom
    const newHeight = Math.max(800, Math.ceil(maxBottom + 200));
    if (newHeight !== canvasHeight) {
      setCanvasHeight(newHeight);
    }
  }, [fabricCanvas, canvasHeight]);

  // Save to history when objects change
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectModified = () => {
      updateCanvasHeight();
      setTimeout(() => saveCanvas(), 100);
    };

    fabricCanvas.on("object:added", handleObjectModified);
    fabricCanvas.on("object:removed", handleObjectModified);
    fabricCanvas.on("object:modified", handleObjectModified);

    return () => {
      fabricCanvas.off("object:added", handleObjectModified);
      fabricCanvas.off("object:removed", handleObjectModified);
      fabricCanvas.off("object:modified", handleObjectModified);
    };
  }, [fabricCanvas, saveCanvas, canvasHeight, updateCanvasHeight]);

  // Initialize drag-drop service on preview containers
  useEffect(() => {
    const service = dragDropServiceRef.current;
    const containers: HTMLElement[] = [];
    
    // Collect all active drop zones
    if (scrollContainerRef.current) {
      containers.push(scrollContainerRef.current);
    }
    if (splitViewDropZoneRef.current) {
      containers.push(splitViewDropZoneRef.current);
    }
    
    if (containers.length === 0) {
      console.log('[WebBuilder] No drop zone containers found yet');
      return;
    }
    
    // Initialize drag-drop on all drop zones
    containers.forEach(container => {
      service.initializeCanvas(container);
      console.log('[WebBuilder] ✅ Drag-drop initialized on:', container.dataset.dropZone);
    });

    // Handle drop events - inject elements into JSX source via VFS
    const handleDropEvent = (data: unknown) => {
      const dropData = data as { 
        element: { 
          name: string; 
          htmlTemplate: string; 
          category: string;
          id: string;
        };
        context: {
          position: 'append' | 'prepend' | 'before' | 'after';
          targetElement?: HTMLElement;
        }
      };
      
      const { element, context } = dropData;
      
      // Convert HTML template to valid JSX (class→className, style strings→objects, etc.)
      const jsxElement = htmlToJsx(element.htmlTemplate);
      
      // Wrap in a container div with data attributes for identification
      const wrappedJsx = `<div data-element-id="element-${Date.now()}" data-element-type="${element.category}">\n        ${jsxElement}\n      </div>`;
      
      // Get current VFS files and patch App.tsx with the new element
      const currentFiles = getSandpackFiles();
      const patchedFiles = elementToVFSPatch(currentFiles, wrappedJsx, element.name, launchEntryPoint);
      
      // Apply to VFS — triggers Sandpack rebundle
      vfsImportFiles(patchedFiles);
      
      // Update previewCode/editorCode to stay in sync
      const updatedApp = patchedFiles[launchEntryPoint];
      if (updatedApp) {
        setPreviewCode(updatedApp);
        setEditorCode(updatedApp);
      }
      
      toast.success(`Added ${element.name}`, {
        description: `${element.category} element added to preview`,
        duration: 3000
      });
    };
    
    // Register the drop event handler
    service.on('drop', handleDropEvent);

    return () => {
      // Unregister the drop event handler
      service.off('drop', handleDropEvent);
      
      // Destroy canvas listeners
      containers.forEach(container => {
        service.destroyCanvas(container);
        console.log('[WebBuilder] 🧹 Drag-drop destroyed on:', container.dataset.dropZone);
      });
    };
  }, [viewMode, previewCode]);

  const handleDelete = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
  };

  const handleDuplicate = async () => {
    if (!fabricCanvas || !selectedObject) return;
    const cloned = await selectedObject.clone();
    cloned.set({
      left: (cloned.left || 0) + 10,
      top: (cloned.top || 0) + 10,
    });
    fabricCanvas.add(cloned);
    fabricCanvas.setActiveObject(cloned);
    fabricCanvas.renderAll();
  };

  // Handle delete for HTML elements in the live preview
  // Updates both DOM and source code
  const handleDeleteHTMLElement = useCallback(() => {
    if (!selectedHTMLElement?.selector) return;
    handleFloatingDelete(selectedHTMLElement.selector);
  }, [selectedHTMLElement, handleFloatingDelete]);

  // Handle duplicate for HTML elements in the live preview
  // Updates both DOM and source code
  const handleDuplicateHTMLElement = useCallback(() => {
    if (!selectedHTMLElement?.selector) return;
    handleFloatingDuplicate(selectedHTMLElement.selector);
  }, [selectedHTMLElement, handleFloatingDuplicate]);

  const addBlock = (blockId: string) => {
    if (!fabricCanvas) return;
    
    const block = webBlocks.find(b => b.id === blockId);
    if (!block) return;

    const component = block.create(fabricCanvas);
    if (component) {
      fabricCanvas.add(component);
      fabricCanvas.setActiveObject(component);
      fabricCanvas.renderAll();
    }
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.2, 2);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const getCanvasWidth = () => {
    switch (device) {
      case "tablet": return 768;
      case "mobile": return 375;
      default: return 1280;
    }
  };

  const getCanvasHeight = () => {
    switch (device) {
      case "tablet": return Math.max(1024, canvasHeight);
      case "mobile": return Math.max(667, canvasHeight);
      default: return canvasHeight;
    }
  };

  const getCurrentCanonicalBuildArtifacts = useCallback(() => {
    const sourceFiles = getSandpackFiles();
    return buildCanonicalArtifacts(sourceFiles, {
      entryPoint: activePagePath,
      title: currentTemplateName || 'Unison Site',
    });
  }, [getSandpackFiles, activePagePath, currentTemplateName]);

  const handleExport = (format: string) => {
    const canonicalBuildArtifacts = getCurrentCanonicalBuildArtifacts();
    if (canonicalBuildArtifacts) {
      setExportHtml(canonicalBuildArtifacts.exportHtml);
      setExportCss(canonicalBuildArtifacts.exportCss);
      setExportJs(canonicalBuildArtifacts.exportJs);
      setExportProjectName(currentTemplateName || 'my-project');
      setExportDialogOpen(true);
      return;
    }
    
    if (!fabricCanvas) return;

    const { html, css } = exportFabricCanvasToHtmlCss(
      fabricCanvas.getObjects() as unknown as Parameters<typeof exportFabricCanvasToHtmlCss>[0],
    );

    setExportHtml(html);
    setExportCss(css);
    setExportJs('');
    setExportProjectName(currentTemplateName || 'my-project');
    
    if (format === 'html') {
      setExportDialogOpen(true);
    } else if (format === 'react') {
      setExportDialogOpen(true);
    } else if (format === 'json') {
      const json = JSON.stringify(fabricCanvas.toJSON(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'design.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const toggleFullscreen = async () => {
    if (!mainContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await mainContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      toast.error('Failed to toggle fullscreen');
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle mouse wheel zoom (Ctrl+scroll)
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom if Ctrl key is pressed
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(2, zoom * delta));
        setZoom(newZoom);
        if (fabricCanvas) {
          fabricCanvas.setZoom(newZoom);
          fabricCanvas.renderAll();
        }
      }
      // If Ctrl is not pressed, allow normal scrolling (do nothing)
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, fabricCanvas]);

  // Handle panning with mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle mouse or Alt+Left
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Scroll navigation functions — post message to iframe or scroll container
  const postScrollToIframe = useCallback((command: 'top' | 'bottom' | 'up' | 'down') => {
    const iframe = livePreviewRef.current?.getIframe?.();
    if (iframe?.contentWindow) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
          const scrollable = doc.scrollingElement || doc.documentElement;
          switch (command) {
            case 'top':
              scrollable.scrollTo({ top: 0, behavior: 'smooth' });
              break;
            case 'bottom':
              scrollable.scrollTo({ top: scrollable.scrollHeight, behavior: 'smooth' });
              break;
            case 'up':
              scrollable.scrollBy({ top: -300, behavior: 'smooth' });
              break;
            case 'down':
              scrollable.scrollBy({ top: 300, behavior: 'smooth' });
              break;
          }
          return;
        }
      } catch {
        // Cross-origin — fall through to container scroll
      }
    }
    // Fallback: scroll the outer container
    if (scrollContainerRef.current) {
      switch (command) {
        case 'top':
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'bottom':
          scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
          break;
        case 'up':
          scrollContainerRef.current.scrollBy({ top: -300, behavior: 'smooth' });
          break;
        case 'down':
          scrollContainerRef.current.scrollBy({ top: 300, behavior: 'smooth' });
          break;
      }
    }
  }, []);

  const scrollToTop = () => postScrollToIframe('top');
  const scrollToBottom = () => postScrollToIframe('bottom');
  const scrollUp = () => postScrollToIframe('up');
  const scrollDown = () => postScrollToIframe('down');

  // Handle touch gestures for mobile
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    let initialDistance = 0;
    let initialZoom = zoom;
    let lastTouchCenter = { x: 0, y: 0 };
    let touchPanOffset = { x: 0, y: 0 };

    const getTouchDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches: TouchList) => {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = getTouchDistance(e.touches);
        initialZoom = zoom;
        lastTouchCenter = getTouchCenter(e.touches);
        touchPanOffset = { ...panOffset };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        
        // Pinch zoom
        const currentDistance = getTouchDistance(e.touches);
        const scale = currentDistance / initialDistance;
        const newZoom = Math.max(0.1, Math.min(2, initialZoom * scale));
        setZoom(newZoom);
        if (fabricCanvas) {
          fabricCanvas.setZoom(newZoom);
          fabricCanvas.renderAll();
        }

        // Pan
        const currentCenter = getTouchCenter(e.touches);
        const dx = currentCenter.x - lastTouchCenter.x;
        const dy = currentCenter.y - lastTouchCenter.y;
        setPanOffset({
          x: touchPanOffset.x + dx,
          y: touchPanOffset.y + dy,
        });
      }
    };

    const handleTouchEnd = () => {
      initialDistance = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoom, fabricCanvas, panOffset]);

  console.log('[WebBuilder] About to return JSX...');

  const persistedRuntimeContext = hydratedRevision
    ? (hydratedRevision.siteBundleSnapshot as SiteBundleSnapshot | null)?.appContext?.runtimeContext
    : effectiveRouteState?.runtimeManifest?.appContext?.runtimeContext
      ?? effectiveRouteState?.siteBundleSnapshot?.appContext?.runtimeContext
      ?? launch?.runtimeManifest?.appContext?.runtimeContext;
  // Revival: older / recovered revisions predate the persisted runtime context
  // (or were committed before appContext existed). Rather than declaring the
  // site unrecoverable, rebuild the tenant identity from the revision row —
  // the revision already carries the durable business/project/draft triple.
  const revivedRuntimeContext = hydratedRevision
    ? {
        workspaceId: hydratedRevision.businessId,
        businessId: hydratedRevision.businessId,
        projectId: hydratedRevision.projectId,
        websiteId: hydratedRevision.draftId,
        snapshotId:
          (hydratedRevision.siteBundleSnapshot as SiteBundleSnapshot | null)?.snapshotId
          || hydratedRevision.id,
        environment: 'builder' as const,
        revisionId: hydratedRevision.id,
      }
    : undefined;
  const builderRuntimeContext =
    normalizeUnisonRuntimeContext(persistedRuntimeContext)
    ?? normalizeUnisonRuntimeContext(revivedRuntimeContext);

  const projectRuntime = useMemo(() => {
    if (
      !hydratedRevision
      || runtimeProjectionRevisionId !== hydratedRevision.id
      || !builderRuntimeContext?.workspaceId
    ) return undefined;
    return buildProjectRuntimeEnvelope({
      workspaceId: builderRuntimeContext.workspaceId,
      revision: hydratedRevision,
      activePublishedRevisionId,
      activePagePath,
      runtimeMode: activePublishedRevisionId === hydratedRevision.id ? 'published' : 'draft',
    });
  }, [activePagePath, activePublishedRevisionId, builderRuntimeContext?.workspaceId, hydratedRevision, runtimeProjectionRevisionId]);

  const hasCanonicalIdentity = Boolean((resolvedProjectId || projectId) && currentDraftId);
  const canonicalRuntimeError = canonicalHydrationError
    || (hasCanonicalIdentity
      && hydratedRevision
      && runtimeProjectionRevisionId === hydratedRevision.id
      && !builderRuntimeContext?.workspaceId
      ? 'Canonical revision is missing its persisted workspace runtime identity.'
      : null);
  // Autosaved / recovered projects already carry a complete VFS locally. Once
  // those files exist there is nothing to wait for: render the builder and let
  // Sandpack compile while canonical revision metadata resolves in background.
  const hasLocalVfsFiles = Object.keys(virtualFS.getSandpackFiles()).length > 0;
  const canonicalHydrationPending = hasCanonicalIdentity
    && !canonicalRuntimeError
    && !hasLocalVfsFiles
    && (!hydratedRevision || runtimeProjectionRevisionId !== hydratedRevision.id);

  if (canonicalRuntimeError && emptyProjectDraft) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#09090b] px-6 text-zinc-100">
        <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <Sparkles className="mb-4 h-7 w-7 text-indigo-400" aria-hidden="true" />
          <h1 className="text-lg font-semibold">This project has no site yet</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            The project record is healthy, but no site content was ever generated for it.
            Run the launcher wizard to generate your pages, then this builder will open with
            the committed project state.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => { window.location.href = '/'; }}>
              Open the launcher
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry project load
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (canonicalRuntimeError) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#09090b] px-6 text-zinc-100">
        <div className="w-full max-w-md border border-red-900/70 bg-zinc-950 p-6 shadow-2xl">
          <Shield className="mb-4 h-7 w-7 text-red-400" aria-hidden="true" />
          <h1 className="text-lg font-semibold">Canonical project state unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{canonicalRuntimeError}</p>
          {repairState === 'running' && (
            <p className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
              <RefreshCcw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Repairing this project&apos;s workspace link…
            </p>
          )}
          {repairNote && repairState !== 'running' && (
            <p className="mt-3 text-xs leading-5 text-zinc-500">{repairNote}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => { void runCanonicalDraftRepair(); }}
              disabled={repairState === 'running'}
            >
              <RefreshCcw className={cn('mr-2 h-4 w-4', repairState === 'running' && 'animate-spin')} aria-hidden="true" />
              Repair project link
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry project load
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (canonicalHydrationPending) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
          {repairState === 'running'
            ? 'Repairing project workspace link'
            : repairState === 'repaired'
              ? 'Reloading committed project state'
              : 'Loading committed project state'}
        </div>
      </div>
    );
  }

  return (
    <BuilderSessionProvider
      value={{
        projectRuntime,
        runtimeContext: builderRuntimeContext
          ? { ...builderRuntimeContext, environment: 'builder' }
          : undefined,
        projectId: resolvedProjectId || projectId || undefined,
        businessId: businessId || undefined,
        currentUserId,
        draftId: currentDraftId || undefined,
      }}
    >
    <BusinessProfileProvider businessId={businessId || undefined}>
    <div ref={mainContainerRef} className={cn("wb-obsidian flex min-h-[100dvh] h-[100dvh] flex-col overflow-hidden bg-[#09090b]", isMobile && "pb-16")}>
      {/* Launcher is opened only by an explicit user flow. */}
      <SystemLauncher open={showLauncher} onOpenChange={setShowLauncher} />

      {/* Interactive Element Highlighting Styles */}
      <InteractiveElementHighlight isInteractiveMode={isInteractiveMode} />

      {/* Global builder toolbar */}
      <div className="z-20 flex h-11 flex-shrink-0 items-center gap-1.5 border-b border-white/[0.06] bg-[#0a0a14] px-2 lg:px-3">
        {/* Left Section: AI Toggle, Back, Device, Mode */}
        <div className="flex items-center gap-1.5 lg:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackNavigation}
            className="h-8 w-8 rounded-md text-white/55 hover:bg-white/[0.06] hover:text-white"
            title={`Go back to ${referrerPageName}${hasUnsavedChanges ? ' (unsaved changes will be auto-saved)' : ''} - Alt+←`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Inline project rename — invisible until a project is loaded. */}
          {projectId && (
            <input
              value={projectDisplayName}
              onChange={(e) => setProjectDisplayName(e.target.value)}
              onBlur={(e) => handleRenameProject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setProjectDisplayName(projectNameFromState || '');
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={renamingProject}
              placeholder="Untitled project"
              aria-label="Project name"
              className="hidden h-8 max-w-[180px] truncate rounded-md border border-transparent bg-transparent px-2 text-xs font-medium text-white/80 outline-none hover:bg-white/[0.04] focus:border-white/10 focus:bg-white/[0.04] lg:block"
            />
          )}

          {/* Device + Mode + Tools — hidden on small screens (use bottom nav on mobile) */}
          <div className="hidden items-center gap-2 lg:flex">
          {/* Device Breakpoints */}
          <div className="flex items-center gap-0.5 rounded-md bg-white/[0.035] p-0.5">
            <Button
              variant={device === "desktop" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setDevice("desktop")}
              className={cn("h-7 w-7 rounded transition-colors", device === "desktop" ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/[0.06] hover:text-white/80")}
              title="Desktop"
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={device === "tablet" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setDevice("tablet")}
              className={cn("h-7 w-7 rounded transition-colors", device === "tablet" ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/[0.06] hover:text-white/80")}
              title="Tablet"
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={device === "mobile" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setDevice("mobile")}
              className={cn("h-7 w-7 rounded transition-colors", device === "mobile" ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/[0.06] hover:text-white/80")}
              title="Mobile"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Mode Toggle */}
          <SimpleModeToggle
            currentMode={builderMode === 'preview' ? 'preview' : 'select'}
            onModeChange={(mode) => {
              setBuilderMode(mode);
              setIsInteractiveMode(mode === 'preview');
              if (mode === 'preview') {
                setSelectedHTMLElement(null);
                clearSelection();
                clearLivePreviewSelection();
              }
            }}
            hasSelection={!!selectedHTMLElement || !!selectedObject}
            onDelete={() => {
              if (selectedHTMLElement?.selector) {
                handleDeleteHTMLElement();
              } else if (selectedObject) {
                handleDelete();
              }
            }}
            onDuplicate={() => {
              if (selectedHTMLElement?.selector) {
                handleDuplicateHTMLElement();
              } else if (selectedObject) {
                handleDuplicate();
              }
            }}
          />
          
          </div>{/* end hidden sm:flex device+mode+tools */}
        </div>

        <div className="flex flex-1 justify-center lg:hidden">
          <SimpleModeToggle
            currentMode={builderMode === 'preview' ? 'preview' : 'select'}
            onModeChange={(mode) => {
              setBuilderMode(mode);
              setIsInteractiveMode(mode === 'preview');
              if (mode === 'preview') {
                setSelectedHTMLElement(null);
                clearSelection();
                clearLivePreviewSelection();
              }
            }}
            className="min-w-0"
          />
        </div>

        {/* Center Section: Floating Dock - hidden on small screens */}
        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <FloatingDock
            onSelectTemplate={handleSelectTemplate}
            onDemoTemplate={(code, name, systemType, templateId) => {
              handleSelectTemplate(code, name, systemType, templateId);
              toast.info(`Demo mode: ${name} - Interactions return mock responses`);
            }}
            onLoadTemplate={handleLoadTemplate}
            onSaveTemplate={handleSaveTemplate}
            currentCode={previewCode}
            cloudState={cloudState}
            onNavigateToCloud={() => navigate('/cloud')}
            onSwapSection={handleSwapSection}
          />
        </div>

        {/* Right Section: View Mode, Save, AI Activity, Right Panel Toggle */}
        <div className="hidden items-center gap-2 lg:flex">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-md bg-white/[0.035] p-0.5">
            {([
              { id: 'canvas' as const, icon: Square, label: 'Canvas' },
              { id: 'code' as const, icon: FileCode, label: 'Code' },
              { id: 'split' as const, icon: Layout, label: 'Split' },
            ] as const).map(({ id, icon: Icon, label }) => {
              const isActive = viewMode === id;
              return (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  className={cn(
                    'relative flex h-7 items-center justify-center gap-1.5 rounded px-2 text-[11px] font-medium outline-none transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80',
                  )}
                  title={`${label} View`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className={cn('tracking-wide hidden lg:inline', isActive ? 'font-bold' : '')}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Save/Deploy/Settings — hidden on small screens */}
          <div className="hidden lg:flex items-center gap-1.5">
            {autoSaveStatus === 'saving' && (
              <div className="animate-spin h-3 w-3 border-2 border-yellow-500/30 border-t-yellow-400 rounded-full" />
            )}
            {autoSaveStatus === 'saved' && (
              <Cloud className="h-3.5 w-3.5 text-lime-400 drop-shadow-[0_0_5px_rgba(0,255,0,0.6)]" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSaveProjectDialogOpen(true)}
              className="h-8 rounded-md px-2 text-white/55 hover:bg-white/[0.06] hover:text-white"
              title={currentTemplateName ? `Update "${currentTemplateName}"` : "Save to Projects"}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">{currentTemplateName ? 'Update' : 'Save'}</span>
            </Button>
            <DeployButton
              getFiles={() => getCurrentCanonicalBuildArtifacts()?.deployFiles || {}}
              defaultSiteName={currentTemplateName || 'unison-site'}
              contract={compiledContract}
              snapshot={effectiveRouteState?.siteBundleSnapshot ?? null}
              systemId={activeSystemType}
              projectId={projectId ?? null}
              variant="ghost"
              size="sm"
              onDeployComplete={(url) => {
                toast.success('Site published!', {
                  description: `Live at ${url}`,
                  action: {
                    label: 'Open',
                    onClick: () => window.open(url, '_blank'),
                  },
                });
              }}
            />
          </div>
          
          <div className="hidden items-center gap-1 lg:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={cn("h-8 w-8 rounded-md", aiPanelOpen ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/[0.06] hover:text-white")}
            title={aiPanelOpen ? "Close AI panel" : "Open AI panel"}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className={cn("h-8 w-8 rounded-md", !leftPanelCollapsed ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/[0.06] hover:text-white")}
            title={leftPanelCollapsed ? "Show tools" : "Hide tools"}
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className={cn("h-8 w-8 rounded-md", !rightPanelCollapsed ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/[0.06] hover:text-white")}
            title={rightPanelCollapsed ? "Show Properties Panel" : "Hide Properties Panel"}
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setPlaygroundInitialBindingId(undefined);
              setPlaygroundModalOpen(true);
            }}
            className="h-8 w-8 rounded-md text-white/45 hover:bg-white/[0.06] hover:text-white"
            title="Open Creator's Playground"
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileActionsOpen(true)}
            className="h-8 w-8 rounded-md text-white/45 hover:bg-white/[0.06] hover:text-white"
            title="More project actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          </div>{/* end hidden sm:flex right panel+playground */}
        </div>
      </div>

      {/* Creator's Playground Modal */}
      {playgroundModalOpen && (
      <Suspense fallback={null}>
      <CreatorPlaygroundModal
        open={playgroundModalOpen}
        onOpenChange={(open) => {
          setPlaygroundModalOpen(open);
          if (!open) {
            setPlaygroundInitialSection(undefined);
            setPlaygroundInitialBindingId(undefined);
          }
        }}
        playground={creatorPlayground}
        businessId={businessId || null}
        initialSection={playgroundInitialSection}
        initialBindingId={playgroundInitialBindingId}
        bindings={playgroundBindings}
        calendars={playgroundCalendars}
        popups={playgroundPopups}
        vfsFiles={virtualFS.getSandpackFiles()}
        setupSnapshot={playgroundSetupSnapshot}
        wizardSelections={effectiveRouteState?.wizardSelections || null}
        onPageSelect={(pageId) => {
          const page = creatorPlayground.pageRegistry.pages[pageId];
          if (!page?.path) return;
          const sanitized = page.path.replace(/^\//, '').replace(/[^a-z0-9-]/gi, '-') || 'custom';
          const componentName = sanitized
            .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
            .replace(/^(.)/, (_, c: string) => c.toUpperCase());
          const vfsPath = `/src/pages/${componentName}.tsx`;
          const vfsFiles = virtualFS.getSandpackFiles();
          if (vfsFiles[vfsPath]) {
            handleSelectPage(vfsPath);
            livePreviewRef.current?.navigateToRoute(page.path);
          } else {
            // Trigger AI generation for missing page
            const pageName = vfsPath.split('/').pop()?.replace('.tsx', '')?.toLowerCase() || page.title.toLowerCase();
            triggerPageGenRef.current(pageName, page.title, null);
          }
          setPlaygroundModalOpen(false);
        }}
        onPageAdd={(pageId, title, path, pageType) => {
          // Auto-scaffold a VFS file when a page is added via playground
          const sanitized = path.replace(/^\//, '').replace(/[^a-z0-9-]/gi, '-') || 'custom';
          const componentName = sanitized
            .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
            .replace(/^(.)/, (_, c: string) => c.toUpperCase());
          const vfsPath = `/src/pages/${componentName}.tsx`;
          const vfsFiles = virtualFS.getSandpackFiles();
          if (vfsFiles[vfsPath]) return; // Already exists
          // Trigger AI generation for the new page
          const pageName = vfsPath.split('/').pop()?.replace('.tsx', '')?.toLowerCase() || sanitized;
          const label = title || sanitized.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          creatorPlayground.updatePage(pageId, { filePath: vfsPath });
          
          // Regenerate canonical router first so the route is registered
          const routerCode = regenerateRouter(creatorPlayground.pageRegistry);
          if (routerCode) virtualFS.importFiles({ [launchEntryPoint]: routerCode });
          
          // Then trigger AI generation
          triggerPageGenRef.current(pageName, label, null);
          toast.success(`Generating "${label}" page with AI...`);
        }}
        onPageRemove={(_pageId, path) => {
          const sanitized = path.replace(/^\//, '').replace(/[^a-z0-9-]/gi, '-') || 'custom';
          const componentName = sanitized
            .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
            .replace(/^(.)/, (_, c: string) => c.toUpperCase());
          const vfsPath = `/src/pages/${componentName}.tsx`;
          handleRemovePage(vfsPath);
          // Regen canonical router so the deleted route is dropped from App.tsx
          // immediately (the registry-version effect would also catch this, but
          // doing it inline keeps file removal + router update atomic).
          const result = syncRouterAndValidate(
            creatorPlayground.pageRegistry,
            virtualFS.getSandpackFiles(),
          );
          if (result.routerCode) {
            virtualFS.importFiles({ [launchEntryPoint]: result.routerCode });
          }
        }}
        onFunnelCreate={(funnelId, stepPages) => {
          // Auto-scaffold all funnel step pages in VFS
          const newFiles: Record<string, string> = {};
          const funnelSlug = funnelId.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
          stepPages.forEach((step, idx) => {
            const componentName = step.title.replace(/\s+/g, '').replace(/^(.)/, (_, c: string) => c.toUpperCase());
            const vfsPath = `/src/pages/funnels/${funnelSlug}/${componentName}.tsx`;
            const nextStep = stepPages[idx + 1];
            const nextLink = nextStep
              ? `<Link to="${nextStep.path}" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">Continue →</Link>`
              : `<p className="text-lg text-muted-foreground">You're all set!</p>`;
            newFiles[vfsPath] = buildFunnelStepSeed({
              componentName,
              idx,
              role: step.role,
              title: step.title,
              nextLink,
            });
          });
          virtualFS.importFiles(newFiles);
          toast.success(`Funnel scaffolded: ${stepPages.length} pages created in VFS`);
        }}
      />
      </Suspense>
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* AI Panel - static left side panel (desktop only; mobile uses bottom-nav overlay) */}
        {!isMobile && aiPanelOpen && (
          <>
            <ResizablePanel defaultSize={22} minSize={18} maxSize={35}>
              <AIBuilderPanel
                currentCode={previewCode}
                systemType={activeSystemType}
                templateName={currentTemplateName}
                defaultTargetFile={launchEntryPoint}
                iframeErrors={iframeErrors}
                onClearErrors={() => setIframeErrors([])}
                onClose={() => setAiPanelOpen(false)}
                userDesignProfile={userDesignProfile ?? undefined}
                pageStructureContext={pageStructureContext}
                backendStateContext={backendStateContext}
                businessDataContext={businessDataContext}
                systemsBuildContext={systemsBuildContextFromState}
                wizardSeed={wizardSeedFromState}
                vfsContext={aiVFS.getContext().summary}
                vfsFiles={virtualFS.getSandpackFiles()}
                previewRef={livePreviewRef}
                projectId={currentDraftId ?? null}
                businessId={businessId ?? null}
                layoutOps={layoutOpsForAI}
                onApproveCapabilityPlan={approveCapabilityPlanFromPanel}
                onApplyToVFS={async (rawFiles, applyMeta) => {
                  console.log('[WebBuilder] onApplyToVFS called with files:', Object.keys(rawFiles));
                  // End-to-end preflight: syntax repair → nav-intent stamping →
                  // industry forbidden-intent strip → final syntax repair.
                  // Mirrors the System Launcher pipeline so AI Builder chat
                  // edits cannot crash preview, ship un-stamped nav links, or
                  // leak intents disallowed by the active industry profile.
                  const snapshotForPreflight = (hydratedRevision?.siteBundleSnapshot as SiteBundleSnapshot | null) ?? null;
                  const beforeFiles = virtualFS.getSandpackFiles();
                  const canonicalFiles = canonicalizeAIFilePaths(rawFiles, beforeFiles);
                  const preflight = runFullPreflight(canonicalFiles, {
                    siteBundleSnapshot: snapshotForPreflight,
                    industry: snapshotForPreflight?.industry,
                  });
                  const files = preflight.files;
                  const proposedFiles = { ...beforeFiles, ...files };

                  // Pass 3 — VFSCommitService gate. Dry-run BEFORE mutating
                  // the working VFS so a preview-breaking AI patch never
                  // reaches Sandpack. Only proceed to aiVFS.applyCode when
                  // the canonical pipeline + preview gate accept the patch.
                  const projectIdForCommit = resolvedProjectId || currentDraftId || '';
                  const commitCtx = businessId && currentDraftId
                    ? {
                        businessId,
                        projectId: projectIdForCommit,
                        draftId: currentDraftId,
                        revisionId: currentRevisionId,
                        beforeFiles,
                        nextFiles: proposedFiles,
                        snapshotForPreflight,
                        activePagePath,
                        playground: aiCommitPlayground,
                        businessName: aiCommitBusinessName,
                        industry: snapshotForPreflight?.industry,
                      }
                    : null;
                  if (!commitCtx) {
                    return { success: false, errors: ['Canonical project identity is unavailable.'] };
                  }
                  const dry = await dryRunAiCommit(commitCtx);
                  if (!dry.accepted) {
                    console.warn('[WebBuilder] AI apply rejected by commit gate:', dry.blockers);
                    toast.error('AI edit rejected — preview would break', {
                      description: dry.rejectMessage ?? 'Canonical preview gate blocked this patch.',
                      duration: 8000,
                    });
                    return { success: false, errors: dry.blockers.map((blocker) => blocker.message) };
                  }
                  let canonicalCommit: CommitMutationResult;
                  try {
                    canonicalCommit = await persistAiCommit(commitCtx);
                  } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    toast.error('AI edit could not be committed', { description: message });
                    return { success: false, errors: [message] };
                  }

                  const committedPatch: Record<string, string> = Object.fromEntries(
                    Object.entries(canonicalCommit.vfsFiles)
                      .filter(([path, contents]) => beforeFiles[path] !== contents),
                  );
                  const result = aiVFS.applyCode(committedPatch);
                  console.log('[WebBuilder] aiVFS.applyCode result:', { success: result.success, filesWritten: result.filesWritten, errors: result.errors });
                  if (result.success) {
                    // Protect these paths from the snapshot projection until the
                    // durable commit refreshes the snapshot with the same content.
                    markLiveEditedVfsPaths(result.filesWritten);
                    const appliedFiles = Object.fromEntries(
                      result.filesWritten
                        .filter((path) => files[path] !== undefined)
                        .map((path) => [path, files[path]]),
                    );
                    const mergedFiles = {
                      ...canonicalCommit.vfsFiles,
                    };
                    const syncedEntry = syncBuilderFromFiles(mergedFiles, activePagePath);
                    console.log('[WebBuilder] Entry file for preview:', syncedEntry?.entryPath || 'NOT FOUND');
                    setViewMode('canvas');
                    console.log('[WebBuilder] AI→VFS orchestrator applied:', result.filesWritten.length, 'files,',
                      Object.keys(result.dependencies.dependencies).length, 'deps');
                    // Capture an edit snapshot so users can revert/reapply.
                    const changedPaths = diffChangedPaths(beforeFiles, mergedFiles);
                    if (changedPaths.length > 0) {
                      const promptPreview = applyMeta?.prompt
                        ? applyMeta.prompt.length > 60 ? `${applyMeta.prompt.slice(0, 57)}…` : applyMeta.prompt
                        : `${changedPaths.length} file${changedPaths.length > 1 ? 's' : ''}`;
                      pushAISnapshot(currentDraftId ?? null, {
                        label: `AI · ${promptPreview}`,
                        source: applyMeta?.origin === 'debug-fix' ? 'debug' : 'ai',
                        before: beforeFiles,
                        after: mergedFiles,
                        changedPaths,
                        meta: applyMeta,
                      });
                    }
                    setCurrentRevisionId(canonicalCommit.persistedRevisionId!);
                  } else {
                    console.error('[WebBuilder] aiVFS.applyCode failed:', result.errors);
                  }
                  return { success: result.success, errors: result.errors };
                }}
                onViewEdits={(edits) => {
                  // Switch to code view and highlight the edited files
                  setViewMode('split');
                  toast.info('View Edits', {
                    description: `${edits.length} file(s) modified - check the file explorer`,
                  });
                }}
                onCodeGenerated={async (code) => {
                  console.log('[WebBuilder] ========== AI CODE GENERATED ==========');
                  console.log('[WebBuilder] Code length:', code.length);
                  console.log('[WebBuilder] Code preview:', code.substring(0, 200));
                  
                  // Validate AI-generated code against current template to detect destructive changes
                  const validation = validateAICodeChange(previewCode, code);
                  if (validation.warnings.length > 0) {
                    console.warn('[WebBuilder] AI code validation warnings:', validation.warnings);
                  }
                  
                  // If critical changes detected, REJECT the AI output and keep original
                  if (validation.severity === 'critical') {
                    console.error('[WebBuilder] CRITICAL: AI made destructive changes — REJECTING output');
                    toast.error('AI edit rejected — it would have changed your entire template', {
                      description: validation.warnings.join('; '),
                      duration: 8000,
                    });
                    return; // Do NOT apply the code
                  }
                  
                  if (validation.severity === 'warning') {
                    toast.warning('AI modified template structure', {
                      description: validation.warnings.join('; '),
                      duration: 5000,
                    });
                  }
                  
                  // Preserve original style blocks and inline classes to prevent style drift from AI edits
                  let safeCode = code;
                  if (previewCode && previewCode.trim().startsWith('<')) {
                    safeCode = preserveStyleBlocks(previewCode, code);
                    safeCode = preserveInlineClasses(previewCode, safeCode);
                    if (safeCode !== code) {
                      console.log('[WebBuilder] Style blocks and inline classes preserved from original template');
                    }
                  }
                  
                  const effectiveSystemType = (activeSystemType || (systemType as BusinessSystemType) || null) as BusinessSystemType | null;
                  const normalized = normalizeTemplateForCtaContract({
                    code: safeCode,
                    systemType: effectiveSystemType,
                  });
                  setTemplateCtaAnalysis(normalized.analysis);
                  console.log('[WebBuilder] Auto-wired intents:', normalized.analysis.intents);
                  console.log('[WebBuilder] Normalized code length:', normalized.code.length);
                  
                  const imported = importBuilderFiles(templateToVFSFiles(normalized.code, currentTemplateName || 'AI Generated'), {
                    preferredPath: activePagePath,
                    entryPoint: activePagePath,
                  });
                  console.log('[WebBuilder] VFS updated via importBuilderFiles');
                  const saved = await saveDraft({
                    force: true,
                    reason: 'ai_edit',
                    vfsFiles: imported?.files || virtualFS.getSandpackFiles(),
                  });
                  if (!saved) {
                    toast.error('AI edit saved locally, but Cloud sync is pending');
                    return;
                  }
                  
                  console.log('[WebBuilder] setPreviewCode called, switching to canvas view');
                  setViewMode('canvas');
                  
                  toast.success('Code Generated!', {
                    description: validation.severity === 'ok' 
                      ? 'Your AI-generated content is now in the preview'
                      : 'Check the preview - some structural changes were made'
                  });
                }}
                onFilesPatch={(files) => {
                  if (!files || Object.keys(files).length === 0) return false;

                  const effectiveSystemType = (activeSystemType || (systemType as BusinessSystemType) || null) as BusinessSystemType | null;
                  const normalizedFiles = { ...files };

                  // Guard: AI must never overwrite the canonical router. It is
                  // auto-derived from the PageRegistry by the registry-version
                  // effect; allowing AI to write App.tsx would break multi-page
                  // navigation (especially the Home route).
                  // Strip all auto-generated/protected entry-shell files. These
                  // are owned by the canonical pipeline; AI edits to them are
                  // always overwritten and frequently introduce syntax errors
                  // that the AI then tries to "fix" in prose.
                  const protectedPaths = [
                    '/src/App.tsx', '/App.tsx',
                    '/src/main.tsx', '/main.tsx',
                    '/src/index.css', '/index.css',
                  ];
                  for (const p of protectedPaths) {
                    if (normalizedFiles[p]) {
                      console.warn(`[WebBuilder] Stripping AI-authored ${p} — owned by canonical pipeline`);
                      delete normalizedFiles[p];
                    }
                  }

                  // Guard: AI must never overwrite or delete the Home page
                  // unless the user explicitly targeted it. The Home page
                  // always remains as the anchor route.
                  const homePage = Object.values(creatorPlayground.pageRegistry.pages).find(p => p.isHome);
                  const homeFilePath = homePage?.filePath;
                  if (homeFilePath && normalizedFiles[homeFilePath]) {
                    const targetingHome = activePagePath === homeFilePath;
                    if (!targetingHome) {
                      console.warn(`[WebBuilder] Stripping AI write to Home page (${homeFilePath}) — Home must remain intact`);
                      delete normalizedFiles[homeFilePath];
                    }
                  }

                  if (Object.keys(normalizedFiles).length === 0) {
                    toast.error('Patch rejected', { description: 'AI tried to modify only protected files (router / Home page).' });
                    return false;
                  }

                  if (files["/index.html"]) {
                    const normalized = normalizeTemplateForCtaContract({
                      code: files["/index.html"],
                      systemType: effectiveSystemType,
                    });
                    normalizedFiles["/index.html"] = normalized.code;
                    setTemplateCtaAnalysis(normalized.analysis);
                    console.log('[WebBuilder] Auto-wired intents in file patch:', normalized.analysis.intents);
                  }

                  const imported = importBuilderFiles(normalizedFiles, {
                    preferredPath: activePagePath,
                    entryPoint: activePagePath,
                  });
                  if (!imported) return false;
                  void saveDraft({
                    force: true,
                    reason: 'ai_edit',
                    vfsFiles: imported.files,
                  });

                  // Detect new pages so the user gets immediate feedback that a
                  // route was added (the orphan-detection effect will register
                  // them in PageRegistry and the router-sync effect will rebuild
                  // /src/App.tsx automatically).
                  const newPages = Object.keys(normalizedFiles).filter(p =>
                    /^\/src\/pages\/[^/]+\.tsx$/.test(p) && p !== homeFilePath
                  );

                  setViewMode('canvas');
                  if (newPages.length > 0) {
                    toast.success(`Added ${newPages.length} new page${newPages.length > 1 ? 's' : ''}`, {
                      description: newPages.map(p => p.split('/').pop()).join(', '),
                    });
                  } else {
                    toast.success('Files updated', { description: 'Approved patch plan applied to project files' });
                  }
                  return true;
                }}
              />
            </ResizablePanel>
            <ResizableHandle className="w-1.5 bg-gradient-to-b from-transparent via-lime-500/20 to-transparent hover:via-lime-400/50 transition-all duration-300 shadow-[0_0_8px_rgba(0,255,0,0.2)]" />
          </>
        )}

        <ResizablePanel defaultSize={isMobile ? 100 : (aiPanelOpen ? 78 : 100)} minSize={50}>
          {/* Main Content */}
          <div className="h-full flex overflow-hidden relative">
        {/* Left Panel - Elements Sidebar */}
        {!leftPanelCollapsed && (
          <div className={cn(
            "bg-[#0d0d18] border-r-2 border-cyan-500/40 flex flex-col overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.15)] transition-all duration-300",
            isMobile
              ? "absolute left-2 top-2 bottom-2 w-[calc(100vw-1rem)] max-w-md z-30 rounded-lg border-2"
              : "w-64 flex-shrink-0"
          )}>
            {/* Left Panel Header with Close Button */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/30 bg-[#0a0a14]">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-cyan-500/20">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="text-xs font-bold text-cyan-400">Builder Tools</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftPanelCollapsed(true)}
                className="h-6 w-6 text-cyan-400/50 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all duration-200"
                title="Close Builder Tools Panel"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            <Tabs defaultValue="business" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full flex-wrap justify-start rounded-none border-b-2 border-cyan-500/30 bg-[#0a0a14] px-1.5 py-1.5 min-h-[44px] h-auto shrink-0 gap-1">
                <TabsTrigger value="business" className="text-[10px] px-2 py-1 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 data-[state=active]:bg-orange-500 data-[state=active]:text-black data-[state=active]:font-bold data-[state=active]:shadow-[0_0_15px_rgba(255,165,0,0.5)] transition-all duration-200">Business</TabsTrigger>
                <TabsTrigger value="functional" className="text-[10px] px-2 py-1 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 data-[state=active]:bg-fuchsia-500 data-[state=active]:text-black data-[state=active]:font-bold data-[state=active]:shadow-[0_0_15px_rgba(255,0,255,0.5)] transition-all duration-200">Logic</TabsTrigger>
                <TabsTrigger value="seo" className="text-[10px] px-2 py-1 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:font-bold data-[state=active]:shadow-[0_0_15px_rgba(255,255,0,0.5)] transition-all duration-200">SEO</TabsTrigger>
                <TabsTrigger value="ai-plugins" className="text-[10px] px-2 py-1 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 data-[state=active]:bg-lime-400 data-[state=active]:text-black data-[state=active]:font-bold data-[state=active]:shadow-[0_0_15px_rgba(0,255,0,0.5)] transition-all duration-200">⚡ AI</TabsTrigger>
              </TabsList>

              <TabsContent value="functional" className="flex-1 m-0 min-h-0 overflow-hidden">
                <FunctionalBlocksPanel 
                  onInsertBlock={(html) => {
                    // Get current VFS files and patch with new element
                    const currentFiles = virtualFS.getSandpackFiles();
                    const patchFiles = elementToVFSPatch(currentFiles, html, 'FunctionalBlock', launchEntryPoint);
                    virtualFS.importFiles(patchFiles);
                    
                    // Update legacy state
                    const newAppCode = patchFiles[launchEntryPoint] || '';
                    if (newAppCode) {
                      setEditorCode(newAppCode);
                      setPreviewCode(newAppCode);
                    }
                    
                    toast.success('Functional block added to VFS');
                  }}
                />
              </TabsContent>
              <TabsContent value="seo" className="flex-1 m-0 min-h-0 overflow-hidden">
                <SEOSettingsPanel
                  siteSEO={pageSEO.siteSEO}
                  pageSEOMap={pageSEO.pageSEOMap}
                  isSaving={pageSEO.isSaving}
                  activePageKey={
                    activePagePath === launchEntryPoint
                      ? 'home'
                      : activePagePath
                        .replace(/^\/src\/pages\//, '')
                        .replace(/^\//, '')
                        .replace(/\.(tsx|jsx|html)$/, '')
                  }
                  pageKeys={vfsPageKeys}
                  onUpdateSiteSEO={pageSEO.updateSiteSEO}
                  onUpdatePageSEO={pageSEO.updatePageSEO}
                />
              </TabsContent>
              <TabsContent value="ai-plugins" className="flex-1 m-0 min-h-0 overflow-hidden">
                <AIPluginsPanel 
                  businessId={businessId}
                  pluginInstanceId={cloudState.installedPacks?.[0]}
                />
              </TabsContent>
              <TabsContent value="business" className="flex-1 m-0 min-h-0 overflow-hidden">
                <Tabs defaultValue="intents" className="flex flex-col h-full">
                  <TabsList className="w-full justify-start rounded-none bg-[#0a0a12] px-2 h-8 shrink-0 gap-1 border-b border-cyan-500/10">
                    <TabsTrigger value="intents" className="text-[9px] px-1.5 py-0.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                      <Zap className="h-3 w-3 mr-1" />
                      Intents
                    </TabsTrigger>
                    <TabsTrigger value="automations" className="text-[9px] px-1.5 py-0.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Recipes
                    </TabsTrigger>
                    <TabsTrigger value="workflows" className="text-[9px] px-1.5 py-0.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                      <GitBranch className="h-3 w-3 mr-1" />
                      Workflows
                    </TabsTrigger>
                    <TabsTrigger value="health" className="text-[9px] px-1.5 py-0.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                      <Shield className="h-3 w-3 mr-1" />
                      Health
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="intents" className="flex-1 m-0 min-h-0 overflow-hidden">
                    <IntentDirectoryPanel
                      businessId={businessId}
                      projectId={projectId || undefined}
                      currentPagePath={activePagePath}
                      detectedIntents={[]} // TODO: Wire to intent detection
                      onRefreshIntents={() => {
                        // Trigger re-analysis of current page
                        console.log('[WebBuilder] Refreshing intents for:', activePagePath);
                      }}
                      onTestIntent={(intent, payload) => {
                        // Fire test intent
                        handleIntent(intent, { ...payload, businessId, projectId });
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="automations" className="flex-1 m-0 min-h-0 overflow-hidden">
                    <AutomationStatsPanel
                      businessId={businessId}
                      projectId={projectId || undefined}
                      industry={cloudState.business?.name?.toLowerCase().includes('salon') ? 'salon' : 
                               cloudState.business?.name?.toLowerCase().includes('restaurant') ? 'restaurant' : 
                               cloudState.business?.name?.toLowerCase().includes('contractor') ? 'contractor' : undefined}
                      onNavigateToSettings={() => {
                        // Navigate to settings
                        toast.info('Opening business settings...');
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="workflows" className="flex-1 m-0 min-h-0 overflow-hidden">
                    <WorkflowListPanel
                      businessId={businessId}
                      projectId={projectId || undefined}
                      industry={cloudState.business?.name?.toLowerCase().includes('salon') ? 'salon' : 
                               cloudState.business?.name?.toLowerCase().includes('restaurant') ? 'restaurant' : 
                               cloudState.business?.name?.toLowerCase().includes('contractor') ? 'contractor' : undefined}
                    />
                  </TabsContent>
                  <TabsContent value="health" className="flex-1 m-0 min-h-0 overflow-auto p-2 space-y-2">
                    <GateVerdictStrip contract={compiledContract} />
                    <ReadinessCenterPanel
                      contract={compiledContract}
                      vfsFiles={virtualFS.getSandpackFiles()}
                    />
                    <SystemHealthPanel
                      contract={compiledContract}
                      onPublishCheck={() => {
                        toast.info('Running publish checks...');
                      }}
                    />
                    <RevisionLedgerStatus
                      projectId={projectId ?? null}
                      vfsFiles={virtualFS.getSandpackFiles()}
                      identity={
                        currentUserId && businessId && currentDraftId
                          ? {
                              userId: currentUserId,
                              businessId,
                              projectId: resolvedProjectId || currentDraftId,
                              draftId: currentDraftId,
                              revisionId: currentRevisionId,
                              sessionId: `web-builder:${currentDraftId}`,
                            }
                          : null
                      }
                      onRestored={(revId) => {
                        setCurrentRevisionId(revId);
                        toast.success('Reloading restored revision…');
                        // Hydrate from the new revision row.
                        void templateFiles.loadTemplate(currentDraftId);
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* Left Panel Toggle — hidden on mobile (panels accessed via bottom nav) */}
        <div className="relative hidden lg:block">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-12 w-5 rounded-r-lg rounded-l-none bg-[#0d0d18] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_10px_rgba(0,255,255,0.4)] transition-all duration-200"
            title={leftPanelCollapsed ? "Show left panel" : "Hide left panel"}
          >
            {leftPanelCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Mobile AI Panel overlay — full-width canvas-height overlay on small screens */}
        {isMobile && aiPanelOpen && (
          <div className="absolute inset-0 z-40 bg-[#0d0d18] flex flex-col">
            <AIBuilderPanel
              currentCode={previewCode}
              systemType={activeSystemType}
              templateName={currentTemplateName}
              defaultTargetFile={launchEntryPoint}
              iframeErrors={iframeErrors}
              onClearErrors={() => setIframeErrors([])}
              onClose={() => setAiPanelOpen(false)}
              userDesignProfile={userDesignProfile ?? undefined}
              pageStructureContext={pageStructureContext}
              backendStateContext={backendStateContext}
              businessDataContext={businessDataContext}
              systemsBuildContext={systemsBuildContextFromState}
                wizardSeed={wizardSeedFromState}
              vfsContext={aiVFS.getContext().summary}
              vfsFiles={virtualFS.getSandpackFiles()}
              previewRef={livePreviewRef}
              projectId={currentDraftId ?? null}
              businessId={businessId ?? null}
              layoutOps={layoutOpsForAI}
              onApproveCapabilityPlan={approveCapabilityPlanFromPanel}
              onApplyToVFS={async (rawFiles, applyMeta) => {
                const snapshotForPreflight = (hydratedRevision?.siteBundleSnapshot as SiteBundleSnapshot | null) ?? null;
                const beforeFiles = virtualFS.getSandpackFiles();
                const canonicalFiles = canonicalizeAIFilePaths(rawFiles, beforeFiles);
                const files = runFullPreflight(canonicalFiles, {
                  siteBundleSnapshot: snapshotForPreflight,
                  industry: snapshotForPreflight?.industry,
                }).files;
                const proposedFiles = { ...beforeFiles, ...files };

                // Pass 3 — VFSCommitService gate (mobile mount).
                const projectIdForCommit = resolvedProjectId || currentDraftId || '';
                const commitCtx = businessId && currentDraftId
                  ? {
                      businessId,
                      projectId: projectIdForCommit,
                      draftId: currentDraftId,
                      revisionId: currentRevisionId,
                      beforeFiles,
                      nextFiles: proposedFiles,
                      snapshotForPreflight,
                      activePagePath,
                      playground: aiCommitPlayground,
                      businessName: aiCommitBusinessName,
                      industry: snapshotForPreflight?.industry,
                    }
                  : null;
                if (!commitCtx) {
                  return { success: false, errors: ['Canonical project identity is unavailable.'] };
                }
                const dry = await dryRunAiCommit(commitCtx);
                if (!dry.accepted) {
                  toast.error('AI edit rejected — preview would break', {
                    description: dry.rejectMessage ?? 'Canonical preview gate blocked this patch.',
                    duration: 8000,
                  });
                  return { success: false, errors: dry.blockers.map((blocker) => blocker.message) };
                }
                let canonicalCommit: CommitMutationResult;
                try {
                  canonicalCommit = await persistAiCommit(commitCtx);
                } catch (error) {
                  const message = error instanceof Error ? error.message : String(error);
                  toast.error('AI edit could not be committed', { description: message });
                  return { success: false, errors: [message] };
                }

                const committedPatch: Record<string, string> = Object.fromEntries(
                  Object.entries(canonicalCommit.vfsFiles)
                    .filter(([path, contents]) => beforeFiles[path] !== contents),
                );
                const result = aiVFS.applyCode(committedPatch);
                if (result.success) {
                  markLiveEditedVfsPaths(result.filesWritten);
                  const appliedFiles = Object.fromEntries(
                    result.filesWritten
                      .filter((path) => files[path] !== undefined)
                      .map((path) => [path, files[path]]),
                  );
                  const mergedFiles = {
                    ...canonicalCommit.vfsFiles,
                  };
                  syncBuilderFromFiles(mergedFiles, activePagePath);
                  setViewMode('canvas');
                  setAiPanelOpen(false);
                  const changedPaths = diffChangedPaths(beforeFiles, mergedFiles);
                  if (changedPaths.length > 0) {
                    const promptPreview = applyMeta?.prompt
                      ? applyMeta.prompt.length > 60 ? `${applyMeta.prompt.slice(0, 57)}…` : applyMeta.prompt
                      : `${changedPaths.length} file${changedPaths.length > 1 ? 's' : ''}`;
                    pushAISnapshot(currentDraftId ?? null, {
                      label: `AI · ${promptPreview}`,
                      source: applyMeta?.origin === 'debug-fix' ? 'debug' : 'ai',
                      before: beforeFiles,
                      after: mergedFiles,
                      changedPaths,
                      meta: applyMeta,
                    });
                  }
                  setCurrentRevisionId(canonicalCommit.persistedRevisionId!);
                }
                return { success: result.success, errors: result.errors };
              }}
              onViewEdits={() => { setViewMode('split'); setAiPanelOpen(false); }}
              onCodeGenerated={async (code) => {
                const imported = importBuilderFiles(templateToVFSFiles(code, currentTemplateName || 'AI Template'), {
                  preferredPath: launchEntryPoint,
                  entryPoint: launchEntryPoint,
                });
                const saved = await saveDraft({
                  force: true,
                  reason: 'ai_edit',
                  vfsFiles: imported?.files || virtualFS.getSandpackFiles(),
                });
                if (!saved) {
                  toast.error('AI edit saved locally, but Cloud sync is pending');
                  return;
                }
                setViewMode('canvas');
                setAiPanelOpen(false);
              }}
            />
          </div>
        )}

        {/* Center Canvas Area */}
        <div className="flex-1 min-w-0 flex flex-col bg-transparent relative">
          {/* Main Content Area - Canvas/Code/Split View */}
          <div 
            ref={canvasContainerRef}
            className="flex-1 overflow-hidden p-0 sm:p-2 flex items-stretch justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0c0c12] to-[#0a0a0f] relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isPanning ? 'grabbing' : 'default' }}
          >
            {/* Scroll Navigation Controls - Only for Canvas/Split Mode */}
            {(viewMode === 'canvas' || viewMode === 'split') && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col gap-1.5">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollToTop}
                  className="h-9 w-9 bg-[#0d0d18] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] rounded-lg transition-all duration-200"
                  title="Scroll to top"
                >
                  <ChevronsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollUp}
                  className="h-9 w-9 bg-[#0d0d18] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] rounded-lg transition-all duration-200"
                  title="Scroll up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollDown}
                  className="h-9 w-9 bg-[#0d0d18] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] rounded-lg transition-all duration-200"
                  title="Scroll down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollToBottom}
                  className="h-9 w-9 bg-[#0d0d18] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] rounded-lg transition-all duration-200"
                  title="Scroll to bottom"
                >
                  <ChevronsDown className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Canvas Mode - AI Live Preview Only */}
            {viewMode === 'canvas' && (
              <div className="w-full h-full flex flex-col overflow-hidden relative">
                {/* Page tabs — synced with PageRegistry (Creator Playground + AI-generated pages) */}
                <PageNavigationBar
                  pages={pageTabs}
                  activePage={activePageTabId}
                  onSelectPage={handlePageTabSelect}
                  onAddPage={handlePageTabAdd}
                  onRemovePage={handlePageTabRemove}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onRefresh={handleRefreshPreview}
                  onOpenPreview={() => livePreviewRef.current?.openInNewTab()}
                  canUndo={codeHistory.canUndo}
                  canRedo={codeHistory.canRedo}
                  isRefreshing={isRefreshing}
                />
                <div 
                  ref={scrollContainerRef}
                  data-drop-zone="true"
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  {/* Unified VFSPreview — single Sandpack-based preview engine */}
                    <VFSPreview
                      ref={livePreviewRef}
                      nodes={virtualFS.nodes}
                      files={!virtualFS.hasFiles ? effectiveRouteState?.vfsFiles : undefined}
                      onImportFiles={virtualFS.importFiles}
                      onSyncFiles={virtualFS.replaceFiles}
                      activeFile={activePagePath}
                      className="w-full h-full min-h-0 flex-1"
                      showToolbar={false}
                      autoStart={false}
                      forceBackend="sandpack"
                      showBackendIndicator={false}
                      device={device}
                      enableSelection={builderMode === 'select'}
                      onElementSelect={builderMode === 'select' ? handlePreviewElementSelect : undefined}
                      onNavigate={(path) => {
                        const pageName = path.replace(/^\//, '').replace(/\.html$/, '') || 'index';
                        if (pageName !== 'index') {
                          // Registry-first: check if page already exists before generating
                          const registryPages = Object.values(creatorPlayground.pageRegistry.pages);
                          const existingPage = registryPages.find(p => 
                            p.path.replace(/^\//, '').toLowerCase() === pageName.toLowerCase()
                          );
                          const vfsFiles = virtualFS.getSandpackFiles();
                          const sanitized = pageName.replace(/[^a-z0-9-]/gi, '-');
                          const componentName = sanitized
                            .replace(/[-_\s]+(.)/g, (_: string, c: string) => c.toUpperCase())
                            .replace(/^(.)/, (_: string, c: string) => c.toUpperCase());
                          const vfsPath = `/src/pages/${componentName}.tsx`;
                          
                          if (existingPage && vfsFiles[vfsPath]) {
                            // Page exists — navigate preview to route and open in editor
                            handleSelectPage(vfsPath);
                            livePreviewRef.current?.navigateToRoute(existingPage.path);
                          } else {
                            // Page doesn't exist — fall back to generation
                            triggerPageGenRef.current(pageName, pageName, null);
                          }
                        }
                      }}
                      onIntentTrigger={(intent, payload) => {
                        if ((intent === 'nav.goto' || intent === 'nav.goto_page') && (payload.path || payload['target-page-id'])) {
                          const targetPageId = payload['target-page-id'] as string;
                          const targetPath = payload.path as string;
                          
                          // Resolve by page ID first (deterministic), then by path
                          if (targetPageId) {
                            const page = creatorPlayground.pageRegistry.pages[targetPageId];
                            if (page) {
                              livePreviewRef.current?.navigateToRoute(page.path);
                              return;
                            }
                          }
                          
                          const pageName = String(targetPath || '').replace(/^\//, '').replace(/\.html$/, '');
                          if (pageName) {
                            const registryPages = Object.values(creatorPlayground.pageRegistry.pages);
                            const existingPage = registryPages.find(p => 
                              p.path.replace(/^\//, '').toLowerCase() === pageName.toLowerCase()
                            );
                            if (existingPage) {
                              livePreviewRef.current?.navigateToRoute(existingPage.path);
                            } else {
                              triggerPageGenRef.current(pageName, String(payload.text || pageName), null);
                            }
                          }
                        }
                      }}
                      businessId={businessId || undefined}
                      onReady={() => console.log('[WebBuilder] VFSPreview ready')}
                      onError={(err) => {
                        setIframeErrors(prev => {
                          // Deduplicate: skip if same message already exists in last 5 errors
                          const isDuplicate = prev.slice(-5).some(e => e.message === err);
                          if (isDuplicate) return prev;
                          // Cap at 20 errors to prevent memory bloat
                          const next = prev.length >= 20 ? prev.slice(-19) : prev;
                          const errorType = err.includes('SyntaxError') || err.includes('Unexpected token') ? 'syntax' as const
                            : err.includes('fetch') || err.includes('network') || err.includes('CORS') ? 'network' as const
                            : 'runtime' as const;
                          return [...next, { type: errorType, message: err, timestamp: new Date() }];
                        });
                      }}
                    />
                  {/* Auto AI page generation overlay removed. */}
                </div>
              </div>
            )}

            {/* Code Mode - VFS Code Editor */}
            {viewMode === 'code' && (
              <CodeViewErrorBoundary onFallbackClick={() => setViewMode('canvas')}>
                <VFSCodeView
                  nodes={virtualFS.nodes}
                  activeFileId={virtualFS.activeFileId}
                  hasFiles={virtualFS.hasFiles}
                  openFile={virtualFS.openFile}
                  closeTab={virtualFS.closeTab}
                  createFile={virtualFS.createFile}
                  createFolder={virtualFS.createFolder}
                  deleteNode={virtualFS.deleteNode}
                  renameNode={virtualFS.renameNode}
                  duplicateNode={virtualFS.duplicateNode}
                  toggleFolder={virtualFS.toggleFolder}
                  expandAll={virtualFS.expandAll}
                  collapseAll={virtualFS.collapseAll}
                  getActiveFile={virtualFS.getActiveFile}
                  getOpenFiles={virtualFS.getOpenFiles}
                  updateFileContent={virtualFS.updateFileContent}
                  importFiles={virtualFS.importFiles}
                  replaceFiles={virtualFS.replaceFiles}
                  loadDefaultTemplate={virtualFS.loadDefaultTemplate}
                  getSandpackFiles={virtualFS.getSandpackFiles}
                  modifiedFiles={modifiedFiles}
                  aiGeneratedFiles={aiGeneratedFiles}
                  recentlyChangedFiles={recentlyChangedFiles}
                  isAIProcessing={templateState.isRendering}
                  onFileModified={trackFileModification}
                  onSave={(fileId, val) => {
                    toast.success('File saved');
                  }}
                  onSwitchToCanvas={() => setViewMode('canvas')}
                  onUndo={() => {
                    const snap = vfsSnapshotManager.undo();
                    if (!snap) return false;
                    virtualFS.importFiles(snap.files);
                    return true;
                  }}
                  onRedo={() => {
                    const snap = vfsSnapshotManager.redo();
                    if (!snap) return false;
                    virtualFS.importFiles(snap.files);
                    return true;
                  }}
                  canUndo={vfsSnapshotManager.canUndo}
                  canRedo={vfsSnapshotManager.canRedo}
                  undoCount={vfsSnapshotManager.undoCount}
                  redoCount={vfsSnapshotManager.redoCount}
                  onCreateSnapshot={(label) => {
                    const files = virtualFS.getSandpackFiles();
                    const snap = vfsSnapshotManager.createSnapshot(files, label, 'manual');
                    return snap.id;
                  }}
                />
              </CodeViewErrorBoundary>
            )}

            {/* Split Mode - Live Preview + Code Editor */}
            {viewMode === 'split' && (
              <div className="w-full h-full flex gap-4">
                {/* Live Preview - Main viewing area */}
                <div className="flex-1 bg-white rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/30 relative flex flex-col">
                  {/* Page tabs — synced with PageRegistry (Creator Playground + AI-generated pages) */}
                  <PageNavigationBar
                    pages={pageTabs}
                    activePage={activePageTabId}
                    onSelectPage={handlePageTabSelect}
                    onAddPage={handlePageTabAdd}
                    onRemovePage={handlePageTabRemove}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onRefresh={handleRefreshPreview}
                    onOpenPreview={() => livePreviewRef.current?.openInNewTab()}
                    canUndo={codeHistory.canUndo}
                    canRedo={codeHistory.canRedo}
                    isRefreshing={isRefreshing}
                  />
                  <div 
                    ref={splitViewDropZoneRef}
                    data-drop-zone="true"
                    className="flex-1 flex flex-col min-h-0 overflow-hidden"
                  >
                    {/* Unified VFSPreview — single Sandpack-based preview engine */}
                      <VFSPreview
                        ref={livePreviewRef}
                        nodes={virtualFS.nodes}
                        files={!virtualFS.hasFiles ? effectiveRouteState?.vfsFiles : undefined}
                        onImportFiles={virtualFS.importFiles}
                        onSyncFiles={virtualFS.replaceFiles}
                        activeFile={activePagePath}
                        className="w-full h-full min-h-0 flex-1"
                        showToolbar={false}
                        autoStart={false}
                        forceBackend="sandpack"
                        showBackendIndicator={false}
                        device={device}
                        enableSelection={builderMode === 'select'}
                        onElementSelect={builderMode === 'select' ? handlePreviewElementSelect : undefined}
                        onNavigate={(path) => {
                          const pageName = path.replace(/^\//, '').replace(/\.html$/, '') || 'index';
                          if (pageName !== 'index') {
                            const registryPages = Object.values(creatorPlayground.pageRegistry.pages);
                            const existingPage = registryPages.find(p => 
                              p.path.replace(/^\//, '').toLowerCase() === pageName.toLowerCase()
                            );
                            const vfsFiles = virtualFS.getSandpackFiles();
                            const sanitized = pageName.replace(/[^a-z0-9-]/gi, '-');
                            const componentName = sanitized
                              .replace(/[-_\s]+(.)/g, (_: string, c: string) => c.toUpperCase())
                              .replace(/^(.)/, (_: string, c: string) => c.toUpperCase());
                            const vfsPath = `/src/pages/${componentName}.tsx`;
                            
                            if (existingPage && vfsFiles[vfsPath]) {
                              handleSelectPage(vfsPath);
                              livePreviewRef.current?.navigateToRoute(existingPage.path);
                            } else {
                              triggerPageGenRef.current(pageName, pageName, null);
                            }
                          }
                        }}
                        onIntentTrigger={(intent, payload) => {
                          if ((intent === 'nav.goto' || intent === 'nav.goto_page') && (payload.path || payload['target-page-id'])) {
                            const targetPageId = payload['target-page-id'] as string;
                            const targetPath = payload.path as string;
                            
                            if (targetPageId) {
                              const page = creatorPlayground.pageRegistry.pages[targetPageId];
                              if (page) {
                                livePreviewRef.current?.navigateToRoute(page.path);
                                return;
                              }
                            }
                            
                            const pageName = String(targetPath || '').replace(/^\//, '').replace(/\.html$/, '');
                            if (pageName) {
                              const registryPages = Object.values(creatorPlayground.pageRegistry.pages);
                              const existingPage = registryPages.find(p => 
                                p.path.replace(/^\//, '').toLowerCase() === pageName.toLowerCase()
                              );
                              if (existingPage) {
                                livePreviewRef.current?.navigateToRoute(existingPage.path);
                              } else {
                                triggerPageGenRef.current(pageName, String(payload.text || pageName), null);
                              }
                            }
                          }
                        }}
                        businessId={businessId || undefined}
                        onReady={() => console.log('[WebBuilder] VFSPreview ready')}
                        onError={(err) => {
                          setIframeErrors(prev => {
                            const isDuplicate = prev.slice(-5).some(e => e.message === err);
                            if (isDuplicate) return prev;
                            const next = prev.length >= 20 ? prev.slice(-19) : prev;
                            const errorType = err.includes('SyntaxError') || err.includes('Unexpected token') ? 'syntax' as const
                              : err.includes('fetch') || err.includes('network') || err.includes('CORS') ? 'network' as const
                              : 'runtime' as const;
                            return [...next, { type: errorType, message: err, timestamp: new Date() }];
                          });
                        }}
                      />
                  </div>
                </div>

                {/* Code Editor Panel */}
                <div className="flex-1 flex flex-col gap-4">
                  {/* Code Editor */}
                  <div className="flex-1 bg-[#1e1e1e] rounded-lg overflow-hidden border border-white/10 flex flex-col">
                    <div className="h-10 bg-[#2d2d2d] border-b border-white/10 flex items-center justify-between px-4">
                      <div className="flex items-center">
                        <FileCode className="w-4 h-4 text-white/70 mr-2" />
                        <span className="text-sm text-white/70">Code Editor</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setViewMode('canvas')}
                        className="h-7 bg-primary hover:bg-primary/90"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View in Canvas
                      </Button>
                    </div>
                    
                    <div className="flex-1">
                      {(() => {
                        const splitActiveFile = virtualFS.getActiveFile();
                        const splitFileName = splitActiveFile?.name || 'App.tsx';
                        const splitValue = splitActiveFile?.content || previewCode;
                        return (
                          <VFSMonacoEditor
                            height="100%"
                            fileName={splitFileName}
                            value={splitValue}
                            onChange={(value) => {
                              if (splitActiveFile) {
                                virtualFS.updateFileContent(splitActiveFile.id, value || '');
                                trackFileModification(splitActiveFile.id, value || '');
                              }
                              // Also update previewCode for SimplePreview (HTML mode)
                              setPreviewCode(value || '');
                            }}
                            isAIProcessing={templateState.isRendering}
                            onSave={(val) => {
                              if (splitActiveFile) {
                                virtualFS.updateFileContent(splitActiveFile.id, val);
                              }
                              setPreviewCode(val);
                              toast.success('Saved');
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Component Info & Actions */}
                  <div className="bg-[#1e1e1e] rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/70">Quick Actions</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const file = virtualFS.getActiveFile();
                          navigator.clipboard.writeText(file?.content || previewCode);
                          toast('Code copied to clipboard!');
                        }}
                        className="flex-1 h-8 text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Code
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewMode('code');
                          toast('Switched to full code view');
                        }}
                        className="flex-1 h-8 text-xs"
                      >
                        <Maximize2 className="w-3 h-3 mr-1" />
                        Fullscreen
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel Toggle — hidden on mobile (panels accessed via bottom nav) */}
        <div className="relative hidden lg:block">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-12 w-5 rounded-l-lg rounded-r-none backdrop-blur-md bg-fuchsia-500/10 border-r-0 border border-fuchsia-500/30 text-fuchsia-400/60 hover:text-fuchsia-400 hover:bg-fuchsia-500/20 hover:shadow-[0_0_10px_rgba(255,0,255,0.3)] transition-all duration-200"
            title={rightPanelCollapsed ? "Show right panel" : "Hide right panel"}
          >
            {rightPanelCollapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Right Panel: Customizer OR Properties */}
        {!rightPanelCollapsed && (
          <div className={cn(
            "bg-[#0d0d18] border-l-2 border-fuchsia-500/40 flex flex-col overflow-hidden shadow-[0_0_20px_rgba(255,0,255,0.15)] transition-all duration-300",
            isMobile
              ? "absolute right-2 top-2 bottom-2 w-[calc(100vw-1rem)] max-w-md z-30 rounded-lg border-2"
              : "w-64 flex-shrink-0"
          )}>
            {/* Right Panel Header with Close Button */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-fuchsia-500/30 bg-[#0a0a14]">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-fuchsia-500/20">
                  <Settings className="w-3.5 h-3.5 text-fuchsia-400" />
                </div>
                <span className="text-xs font-bold text-fuchsia-400">
                  {previewCode && !selectedObject ? 'Customizer' : 'Properties'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightPanelCollapsed(true)}
                className="h-6 w-6 text-fuchsia-400/50 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 rounded transition-all duration-200"
                title="Close Panel"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewCode && !selectedObject ? (
                <TemplateCustomizerPanel
                  customizer={templateCustomizer}
                  onApply={applyCustomizerOverrides}
                  onVariantCommit={(sectionId, variantId) => { void commitVariantSelection(sectionId, variantId); }}
                />
              ) : (
                <CollapsiblePropertiesPanel 
                  fabricCanvas={fabricCanvas}
                  selectedObject={selectedObject}
                  selectedHTMLElement={selectedHTMLElement}
                  isCollapsed={rightPanelCollapsed}
                  onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                  onUpdate={() => fabricCanvas?.renderAll()}
                  onUpdateHTMLElement={(updates) => {
                    if (selectedHTMLElement?.selector) {
                      handleFloatingStyleUpdate(selectedHTMLElement.selector, updates.styles || {});
                      if (updates.textContent !== undefined) {
                        handleFloatingTextUpdate(selectedHTMLElement.selector, updates.textContent);
                      }
                      const updatedElement = { 
                        ...selectedHTMLElement, 
                        styles: { ...selectedHTMLElement.styles, ...updates.styles },
                        textContent: updates.textContent ?? selectedHTMLElement.textContent 
                      };
                  setSelectedHTMLElement(updatedElement);
                }
              }}
              onClearHTMLSelection={() => {
                setSelectedHTMLElement(null);
                clearLivePreviewSelection();
              }}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
              )}
            </div>
          </div>
        )}

        {/* Floating Element Toolbar - appears over selected elements */}
        {selectedHTMLElement && viewMode === 'canvas' && builderMode === 'select' && (
          <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[96vw]">
            <ElementFloatingToolbar
              element={selectedHTMLElement}
              onUpdateStyles={handleFloatingStyleUpdate}
              onUpdateText={handleFloatingTextUpdate}
              onUpdateAttributes={handleFloatingAttributeUpdate}
              onReplaceImage={handleFloatingImageReplace}
              onDelete={handleFloatingDelete}
              onDuplicate={handleFloatingDuplicate}
              onMoveUp={handleFloatingMoveUp}
              onMoveDown={handleFloatingMoveDown}
              onClear={() => {
                setSelectedHTMLElement(null);
                clearLivePreviewSelection();
              }}
              systemType={activeSystemType}
              systemsBuildContext={systemsBuildContextFromState}
              businessId={businessId ?? null}
              projectId={projectId ?? null}
              industry={
                (effectiveRouteState?.siteBundleSnapshot as { industry?: string } | undefined)?.industry ||
                (typeof activeSystemType === 'string' ? activeSystemType : null)
              }
              templateName={currentTemplateName ?? null}
              activePagePath={activePagePath ?? null}
              getVFSFiles={() => virtualFS.getSandpackFiles()}
              readiness={selectedElementReadiness}
              onAIEditComplete={async (selector, newHtml) => {
                // 1. Try the active page first.
                const primary = applyElementHtmlUpdate(previewCode, selector, newHtml);
                if (primary.ok) {
                  try {
                    pushAISnapshot(currentDraftId ?? null, {
                      label: `AI · element edit ${selector.slice(0, 40)}`,
                      source: 'ai',
                      before: { [activePagePath]: previewCode },
                      after: { [activePagePath]: primary.code },
                      changedPaths: [activePagePath],
                      meta: { origin: 'floating-toolbar-ai', actionType: 'element-edit' },
                    });
                  } catch (err) { console.warn('[onAIEditComplete] snapshot failed:', err); }
                  const imported = importBuilderFiles(templateToVFSFiles(primary.code, currentTemplateName || 'Element Edit'), {
                    preferredPath: activePagePath,
                    entryPoint: activePagePath,
                  });
                  if (!imported) return false;
                  const saved = await saveDraft({
                    force: true,
                    reason: 'ai_edit',
                    vfsFiles: imported.files,
                  });
                  if (!saved) {
                    toast.error('AI edit saved locally, but Cloud sync is pending');
                    return false;
                  }
                  setSelectedHTMLElement(null);
                  toast.success('Element updated by AI');
                  return true;
                }
                // 2. Element likely lives in an imported component file — scan VFS.
                try {
                  const allFiles = virtualFS.getSandpackFiles();
                  for (const [path, code] of Object.entries(allFiles)) {
                    if (!path.endsWith('.tsx') && !path.endsWith('.jsx')) continue;
                    if (path === activePagePath) continue;
                    const attempt = applyElementHtmlUpdate(code, selector, newHtml);
                    if (attempt.ok) {
                      try {
                        pushAISnapshot(currentDraftId ?? null, {
                          label: `AI · element edit in ${path.split('/').pop()}`,
                          source: 'ai',
                          before: { [path]: code },
                          after: { [path]: attempt.code },
                          changedPaths: [path],
                          meta: { origin: 'floating-toolbar-ai', actionType: 'element-edit' },
                        });
                      } catch (err) { console.warn('[onAIEditComplete] snapshot failed:', err); }
                      virtualFS.importFiles({ [path]: attempt.code });
                      const saved = await saveDraft({
                        force: true,
                        reason: 'ai_edit',
                        vfsFiles: { ...allFiles, [path]: attempt.code },
                      });
                      if (!saved) {
                        toast.error('AI edit saved locally, but Cloud sync is pending');
                        return false;
                      }
                      setSelectedHTMLElement(null);
                      toast.success(`Element updated by AI in ${path.split('/').pop()}`);
                      return true;
                    }
                  }
                } catch (err) {
                  console.warn('[onAIEditComplete] VFS-wide scan failed:', err);
                }
                console.warn('[onAIEditComplete] selector not found in any VFS file:', selector);
                toast.error('AI edit could not be applied — element not found');
                return false;
              }}
            />
          </div>
        )}

        {/* Element Intent Inspector — toggle button + floating panel */}
        {selectedHTMLElement && viewMode === 'canvas' && builderMode === 'select' && (
          <>
            <button
              onClick={() => setInspectorOpen((v) => !v)}
              className={cn(
                "fixed right-3 top-16 z-50 hidden h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] text-xs transition-colors lg:flex",
                inspectorOpen
                  ? "bg-white/10 text-white"
                  : "bg-[#0d0d18]/90 text-white/45 hover:bg-white/[0.06] hover:text-white"
              )}
              title="Element Intent Inspector"
            >
              <Zap className="h-3.5 w-3.5" />
            </button>
            {inspectorOpen && (
              <div className="fixed right-3 top-28 z-50">
                <ElementIntentInspector
                  selection={{
                    elementKey: selectedHTMLElement.selector || `el:${selectedHTMLElement.tagName}`,
                    elementLabel: (selectedHTMLElement.textContent || '').slice(0, 40) || selectedHTMLElement.tagName || 'Element',
                    selector: selectedHTMLElement.selector,
                    tagName: selectedHTMLElement.tagName,
                    intent: (selectedHTMLElement.attributes as Record<string, string> | undefined)?.['data-ut-intent'],
                  }}
                  businessId={businessId || undefined}
                  projectId={projectId || undefined}
                  pagePath={activePagePath}
                  onClose={() => setInspectorOpen(false)}
                  onTestIntent={(intent, payload) => {
                    handleIntent(intent, { ...payload, businessId, projectId });
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Catalog Inspector — toggle button + floating panel (Track B) */}
        {viewMode === 'canvas' && (
          <>
            <button
              onClick={() => setCatalogPanelOpen((v) => !v)}
              className={cn(
                "fixed right-12 top-16 z-50 hidden h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] text-xs transition-colors lg:flex",
                catalogPanelOpen
                  ? "bg-white/10 text-white"
                  : "bg-[#0d0d18]/90 text-white/45 hover:bg-white/[0.06] hover:text-white"
              )}
              title="Connected Data / Catalog"
            >
              <Cloud className="h-3.5 w-3.5" />
            </button>
            {catalogPanelOpen && (
              <div className="fixed right-12 top-28 z-50">
                <CatalogInspectorPanel
                  projectId={projectId}
                  sectionTypeMap={catalogSectionTypeMap}
                  snapshot={effectiveRouteState?.siteBundleSnapshot ?? null}
                  onClose={() => setCatalogPanelOpen(false)}
                />

              </div>
            )}
          </>
        )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Mobile Bottom Navigation Bar — fixed at bottom, only visible on small screens */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-white/[0.06] bg-[#0a0a14]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {/* AI */}
        <button
          onClick={() => {
            const next = !aiPanelOpen;
            setAiPanelOpen(next);
            if (next) { setLeftPanelCollapsed(true); setRightPanelCollapsed(true); }
          }}
          className={cn(
            "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-white/40 transition-colors",
            aiPanelOpen ? "text-white after:absolute after:bottom-0 after:h-px after:w-5 after:bg-indigo-400" : "hover:text-white/70"
          )}
        >
          <span className="text-base leading-none">⚡</span>
          <span className="text-[10px] font-medium">AI</span>
        </button>
        {/* Tools */}
        <button
          onClick={() => {
            const next = leftPanelCollapsed;
            setLeftPanelCollapsed(!next);
            if (!next === false) { /* closing — no-op */ } else { setAiPanelOpen(false); setRightPanelCollapsed(true); }
          }}
          className={cn(
            "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-white/40 transition-colors",
            !leftPanelCollapsed ? "text-white after:absolute after:bottom-0 after:h-px after:w-5 after:bg-indigo-400" : "hover:text-white/70"
          )}
        >
          <Layers className="h-4 w-4" />
          <span className="text-[10px] font-medium">Tools</span>
        </button>
        {/* Canvas */}
        <button
          onClick={() => {
            setViewMode('canvas');
            setAiPanelOpen(false);
            setLeftPanelCollapsed(true);
            setRightPanelCollapsed(true);
          }}
          className={cn(
            "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-white/40 transition-colors",
            viewMode === 'canvas' && leftPanelCollapsed && !aiPanelOpen && rightPanelCollapsed
              ? "text-white after:absolute after:bottom-0 after:h-px after:w-5 after:bg-indigo-400"
              : "hover:text-white/70"
          )}
        >
          <Square className="h-4 w-4" />
          <span className="text-[10px] font-medium">Canvas</span>
        </button>
        {/* Properties */}
        <button
          onClick={() => {
            const next = rightPanelCollapsed;
            setRightPanelCollapsed(!next);
            if (!next === false) { /* closing */ } else { setAiPanelOpen(false); setLeftPanelCollapsed(true); }
          }}
          className={cn(
            "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-white/40 transition-colors",
            !rightPanelCollapsed ? "text-white after:absolute after:bottom-0 after:h-px after:w-5 after:bg-indigo-400" : "hover:text-white/70"
          )}
        >
          <Settings className="h-4 w-4" />
          <span className="text-[10px] font-medium">Props</span>
        </button>
        {/* Mobile actions */}
        <button
          onClick={() => setMobileActionsOpen(true)}
          className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-white/40 transition-colors hover:text-white/70"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>

      <Dialog open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-md border-white/[0.08] bg-[#0d0d18] p-4 text-white shadow-[0_24px_72px_-28px_rgba(0,0,0,0.9)]">
          <DialogHeader>
            <DialogTitle className="text-base text-cyan-100">Project actions</DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              Save, publish, and switch the canvas preview without leaving the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-1.5">
            <Button variant="outline" onClick={() => { setMobileActionsOpen(false); setBuilderMode('select'); }} className="justify-start border-white/10 bg-white/[0.03] text-white hover:bg-cyan-500/10">
              <MousePointer2 className="mr-2 h-4 w-4 text-lime-400" /> Edit mode
            </Button>
            <Button variant="outline" onClick={() => { setMobileActionsOpen(false); setBuilderMode('preview'); }} className="justify-start border-white/10 bg-white/[0.03] text-white hover:bg-cyan-500/10">
              <Eye className="mr-2 h-4 w-4 text-cyan-400" /> Preview mode
            </Button>
            <Button variant="outline" onClick={() => { setMobileActionsOpen(false); setSaveProjectDialogOpen(true); }} className="justify-start border-white/10 bg-white/[0.03] text-white hover:bg-cyan-500/10">
              <Save className="mr-2 h-4 w-4 text-yellow-400" /> Save project
            </Button>
            <Button variant="outline" onClick={() => { setMobileActionsOpen(false); handleExport('react'); }} className="justify-start border-white/10 bg-white/[0.03] text-white hover:bg-cyan-500/10">
              <Download className="mr-2 h-4 w-4 text-cyan-400" /> Export
            </Button>
            <Button variant="outline" onClick={() => { setMobileActionsOpen(false); setPlaygroundInitialBindingId(undefined); setPlaygroundModalOpen(true); }} className="justify-start border-white/10 bg-white/[0.03] text-white hover:bg-cyan-500/10">
              <Layers className="mr-2 h-4 w-4 text-emerald-400" /> Playground
            </Button>
            <Button variant="outline" onClick={() => { setMobileActionsOpen(false); setShowLauncher(true); }} className="justify-start border-white/10 bg-white/[0.03] text-white hover:bg-cyan-500/10">
              <Sparkles className="mr-2 h-4 w-4 text-fuchsia-400" /> New site
            </Button>
          </div>
          <div className="flex min-h-9 items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <div className="min-w-0 flex-1">
              {projectId && <BusinessPill />}
            </div>
            <AIEditHistoryMenu
              projectId={currentDraftId ?? null}
              onRevert={async (snap) => {
                const beforeFiles = virtualFS.getSandpackFiles();
                virtualFS.importFiles(snap.before);
                syncBuilderFromFiles(snap.before, activePagePath);
                const restoredFiles = { ...beforeFiles, ...snap.before };
                pushAISnapshot(currentDraftId ?? null, {
                  label: `Revert · ${snap.label}`,
                  source: 'manual',
                  before: beforeFiles,
                  after: snap.before,
                  changedPaths: diffChangedPaths(beforeFiles, snap.before),
                });
                const saved = await saveDraft({
                  force: true,
                  reason: 'ai_edit',
                  vfsFiles: restoredFiles,
                });
                if (!saved) {
                  toast.error('Revert saved locally, but Cloud sync is pending');
                  return;
                }
                toast.success('Reverted to previous state');
              }}
              onReapply={async (snap) => {
                const beforeFiles = virtualFS.getSandpackFiles();
                virtualFS.importFiles(snap.after);
                syncBuilderFromFiles(snap.after, activePagePath);
                const restoredFiles = { ...beforeFiles, ...snap.after };
                pushAISnapshot(currentDraftId ?? null, {
                  label: `Reapply · ${snap.label}`,
                  source: 'manual',
                  before: beforeFiles,
                  after: snap.after,
                  changedPaths: diffChangedPaths(beforeFiles, snap.after),
                });
                const saved = await saveDraft({
                  force: true,
                  reason: 'ai_edit',
                  vfsFiles: restoredFiles,
                });
                if (!saved) {
                  toast.error('Reapply saved locally, but Cloud sync is pending');
                  return;
                }
                toast.success('Reapplied AI edit');
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
            {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([id, Icon]) => (
              <Button key={id} variant="outline" onClick={() => setDevice(id)} className={cn("gap-1 border-white/10 bg-white/[0.03] text-white capitalize", device === id && "border-cyan-400/60 bg-cyan-500/15 text-cyan-200")}>
                <Icon className="h-4 w-4" /> {id}
              </Button>
            ))}
          </div>
          <div className="border-t border-white/10 pt-3">
            <DeployButton
              getFiles={() => getCurrentCanonicalBuildArtifacts()?.deployFiles || {}}
              defaultSiteName={currentTemplateName || 'unison-site'}
              contract={compiledContract}
              snapshot={effectiveRouteState?.siteBundleSnapshot ?? null}
              systemId={activeSystemType}
              projectId={projectId ?? null}
              variant="outline"
              onDeployComplete={(url) => {
                setMobileActionsOpen(false);
                toast.success('Site published!', { description: `Live at ${url}` });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <PreviewOverlayManager
        activeOverlay={activeRuntimeOverlay}
        onClose={() => setActiveRuntimeOverlay(null)}
        businessId={businessId || undefined}
        siteId={projectId || undefined}
      />

      <PreviewCartDrawer
        open={previewCartOpen}
        cart={previewCart}
        initialStep={previewCartStep}
        submitting={previewCartSubmitting}
        onOpenChange={(open) => {
          setPreviewCartOpen(open);
          if (!open) {
            setPreviewCartStep('cart');
          }
        }}
        onUpdateQuantity={handlePreviewCartQuantityChange}
        onRemove={handlePreviewCartRemove}
        onCheckout={handlePreviewCartCheckout}
      />

      {/* Code Preview Dialog */}
      {codePreviewOpen && (
      <Suspense fallback={null}>
      <CodePreviewDialog
        isOpen={codePreviewOpen}
        onClose={() => setCodePreviewOpen(false)}
        fabricCanvas={fabricCanvas}
      />
      </Suspense>
      )}

      {/* Export Dialog */}
      {exportDialogOpen && (
      <Suspense fallback={null}>
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        html={exportHtml}
        css={exportCss}
        js={exportJs}
        projectName={exportProjectName}
        vfsFiles={exportDialogOpen ? getSandpackFiles() : undefined}
        runtimeManifest={effectiveRouteState?.runtimeManifest}
      />
      </Suspense>
      )}

      {/* Performance Panel as Sidebar */}
      {performancePanelOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-80 backdrop-blur-2xl bg-gradient-to-b from-[#0d0d14]/98 to-[#0a0a0f]/98 border-l border-white/[0.08] shadow-2xl shadow-black/50 z-50 flex flex-col">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-semibold text-white">Performance</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPerformancePanelOpen(false)}
              className="text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all duration-200"
            >
              ✕
            </Button>
          </div>
          <Suspense fallback={null}>
          <PerformancePanel 
            fabricCanvas={fabricCanvas}
            onAutoFix={() => {
              console.log('[WebBuilder] Auto-fix applied');
            }}
          />
          </Suspense>
        </div>
      )}

      {/* Integrations Panel as Sidebar */}
      {integrationsPanelOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 overflow-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Export & Integrations</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIntegrationsPanelOpen(false)}
            >
              ✕
            </Button>
          </div>
          <Suspense fallback={null}>
          <IntegrationsPanel 
            onExport={handleExport}
            onIntegrationConnect={(integration, config) => {
              console.log('Integration connected:', integration, config);
            }}
          />
          </Suspense>
        </div>
      )}

      {/* Legacy template HTML preview - intentionally isolated from the main Sandpack path */}
      <Suspense fallback={null}>
        <TemplateHtmlPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          html={templateState.html}
          css={templateState.css}
          isRendering={templateState.isRendering}
          onConsole={(type, args) => {
            console.log(`[Preview ${type}]:`, ...args);
          }}
          onError={(error) => {
            console.error('[Preview Error]:', error);
            toast.error('Preview error: ' + error.message);
          }}
        />
      </Suspense>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutsDialogOpen} onOpenChange={setShortcutsDialogOpen}>
        <DialogContent className="backdrop-blur-2xl bg-gradient-to-b from-[#0d0d14]/98 to-[#0a0a0f]/98 border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-white/70" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {Object.entries(defaultWebBuilderShortcuts).map(([key, shortcut]) => {
              const parts = [];
              if ('ctrl' in shortcut && shortcut.ctrl) parts.push("Ctrl");
              if ('shift' in shortcut && shortcut.shift) parts.push("Shift");
              if ('alt' in shortcut && shortcut.alt) parts.push("Alt");
              parts.push(shortcut.key.toUpperCase());
              
              return (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-white/60">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-white/[0.06] border border-white/[0.08] rounded-md text-white/80 text-xs font-mono">
                    {parts.join("+")}
                  </kbd>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Mode Help Dialog */}
      <InteractiveModeHelp
        isOpen={isInteractiveModeHelpOpen}
        onClose={() => setIsInteractiveModeHelpOpen(false)}
      />

      {/* Template Feedback Dialog */}
      {feedbackOpen && lastGenerationId && (
        <TemplateFeedback
          generationId={lastGenerationId}
          userId={currentUserId || 'demo-user'} // In real app, get from auth
          templateCode={editorCode}
          onFeedbackSubmitted={() => {
            console.log('[WebBuilder] Feedback submitted for generation:', lastGenerationId);
            // Could refresh recommendations here
          }}
          onClose={() => {
            setFeedbackOpen(false);
            setLastGenerationId('');
          }}
        />
      )}

      {/* Template File Manager */}
      <TemplateFileManager
        isOpen={fileManagerOpen}
        onOpenChange={setFileManagerOpen}
        currentCode={previewCode}
        onLoadTemplate={handleLoadTemplate}
        onSaveTemplate={handleSaveTemplate}
      />

      {/* Save to Projects Dialog */}
      <Dialog open={saveProjectDialogOpen} onOpenChange={setSaveProjectDialogOpen}>
        <DialogContent className="sm:max-w-[400px] backdrop-blur-2xl bg-gradient-to-b from-[#0d0d14]/98 to-[#0a0a0f]/98 border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-base text-white">
              {templateFiles.currentDraftId ? 'Update Template' : 'Save to Projects'}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              {templateFiles.currentDraftId 
                ? `Updating "${currentTemplateName}" - or save as a new template`
                : 'Save your current template design to access it later'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-3">
            {templateFiles.currentDraftId && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/20 border border-primary/30 rounded-lg text-xs text-primary">
                <Cloud className="h-3 w-3" />
                <span>Editing: {currentTemplateName}</span>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="project-name" className="text-xs text-white/70">Name *</Label>
              <Input
                id="project-name"
                value={saveProjectName}
                onChange={(e) => setSaveProjectName(e.target.value)}
                placeholder="My Template Design"
                className="h-8 text-sm bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/30 focus:border-white/20"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project-description" className="text-xs text-white/70">Description</Label>
              <Textarea
                id="project-description"
                value={saveProjectDescription}
                onChange={(e) => setSaveProjectDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="text-sm resize-none bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/30 focus:border-white/20"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setSaveProjectDialogOpen(false)} className="bg-transparent border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06]">
              Cancel
            </Button>
            {templateFiles.currentDraftId && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSaveToProjects(true)} 
                disabled={!saveProjectName.trim() || isSavingProject}
              >
                <Plus className="h-3 w-3 mr-1" />
                Save as New
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={() => handleSaveToProjects(false)} 
              disabled={!saveProjectName.trim() || isSavingProject}
            >
              {isSavingProject ? (
                <div className="animate-spin h-3 w-3 border-2 border-background border-t-transparent rounded-full mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              {templateFiles.currentDraftId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Intent Pipeline Overlay - Shows dynamic form when buttons are clicked */}
      <IntentPipelineOverlay
        isOpen={pipelineOverlayOpen}
        onClose={() => {
          setPipelineOverlayOpen(false);
          setPipelineConfig(null);
        }}
        config={pipelineConfig}
        onSuccess={(data) => {
          console.log('[WebBuilder] Pipeline success:', data);
          toast.success('Action completed successfully');
        }}
      />

      {/* Demo Overlay - Video/presentation intent UI */}
      <DemoIntentOverlay
        isOpen={demoOverlayOpen}
        onClose={() => {
          setDemoOverlayOpen(false);
          setDemoConfig(null);
        }}
        config={demoConfig}
      />

      {/* Research Overlay - contextual web research from clicked headlines/links */}
      <ResearchOverlay
        isOpen={researchOverlayOpen}
        onClose={() => {
          setResearchOverlayOpen(false);
          setResearchPayload(null);
        }}
        payload={researchPayload}
      />

      {/* Business Setup Suggestions - shown after AI generates a site */}
      {showBusinessSetup && (
      <Suspense fallback={null}>
      <BusinessSetupSuggestions
        open={showBusinessSetup}
        onOpenChange={setShowBusinessSetup}
        systemType={activeSystemType}
        templateName={currentTemplateName}
        projectId={projectId || undefined}
        businessId={businessId || undefined}
        onOpenSetupWizard={() => {
          setPlaygroundInitialSection("launch");
          setPlaygroundModalOpen(true);
        }}
        onSkip={() => {
          console.log('[WebBuilder] User skipped business setup suggestions');
        }}
      />
      </Suspense>
      )}
    </div>
    </BusinessProfileProvider>
    </BuilderSessionProvider>
  );
};
