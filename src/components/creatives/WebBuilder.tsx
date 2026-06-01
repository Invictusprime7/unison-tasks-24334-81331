/* cache-bust: 20260309 */
import { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import TemplateFeedback from "./TemplateFeedback";
import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Plus, Layout, Type, Square, Eye, Play,
  Monitor, Tablet, Smartphone,
  Sparkles, Code, Undo2, Redo2, Save, Keyboard, Zap, RefreshCcw,
  ChevronsDown, ChevronsUp, ArrowDown, ArrowUp, FileCode, Copy, Maximize2, Trash2,
  FolderOpen, Cloud, CloudOff, Server, Layers, Settings, ExternalLink, GitBranch, Shield
} from "lucide-react";
import { CloudPanel } from "./web-builder/CloudPanel";
import { CreatorPlaygroundModal } from "./web-builder/CreatorPlaygroundModal";
import { PageNavigationBar, type PageTab } from "./web-builder/PageNavigationBar";
import { useCreatorPlayground } from "@/hooks/useCreatorPlayground";
import { toast } from "sonner";
import VFSMonacoEditor from './code-editor/VFSMonacoEditor';
import { VFSCodeView } from './code-editor/VFSCodeView';
import { VFSPreview, type VFSPreviewHandle } from '../VFSPreview';
import { DeployButton } from '@/components/DeployButton';
import { CollapsiblePropertiesPanel } from "./web-builder/CollapsiblePropertiesPanel";
import { CanvasDragDropService } from "@/services/canvasDragDropService";
import { CodePreviewDialog } from "./web-builder/CodePreviewDialog";
import { AIBuilderPanel, type VFSEdit, type IframeError } from "./web-builder/AIBuilderPanel";
import { AIEditHistoryMenu } from "./web-builder/AIEditHistoryMenu";
import { pushSnapshot as pushAISnapshot, diffChangedPaths } from "@/services/aiHistoryStore";
import { IntegrationsPanel } from "./design-studio/IntegrationsPanel";
import { ExportDialog } from "./design-studio/ExportDialog";
import { PerformancePanel } from "./web-builder/PerformancePanel";
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
import { useVFSSafe } from "@/hooks/useVFSContext";
import { FileExplorer } from "./code-editor/FileExplorer";
import { ModernFileExplorer } from "./code-editor/ModernFileExplorer";
import { EditorTabs } from "./code-editor/EditorTabs";
import { ModernEditorTabs } from "./code-editor/ModernEditorTabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { templateToVFSFiles, elementToVFSPatch } from "@/utils/templateToVFS";
import { htmlToJsx } from "@/utils/htmlToJsx";
import { setDefaultBusinessId, setCurrentSystemType, setDemoMode, handleIntent, IntentPayload } from "@/runtime/intentRouter";
import { buildRedirectPageContext } from "@/utils/redirectPageGenerator";
import { scaffoldMultiPageVFS } from "@/utils/multiPageScaffolder";
import { classifyLabel, type ElementContext } from "@/utils/redirectLabelClassifier";
import { resolvePreviewAction, type PageInventory } from "@/utils/previewActionResolver";
import { IntentPipelineOverlay, type PipelineConfig } from "./web-builder/IntentPipelineOverlay";
import { DemoIntentOverlay, type DemoIntentOverlayConfig } from "./web-builder/DemoIntentOverlay";
import { ResearchOverlay, type ResearchOverlayPayload } from "./web-builder/ResearchOverlay";
import { decideIntentUx } from "@/runtime/intentUx";
import SystemHealthPanel from "@/components/web-builder/SystemHealthPanel";
import GateVerdictStrip from "@/components/web-builder/GateVerdictStrip";
import { useCompiledContract } from "@/hooks/useCompiledContract";
import type { BusinessSystemType } from "@/data/templates/types";
import { normalizeTemplateForCtaContract, type TemplateCtaAnalysis } from "@/utils/ctaContract";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { buildPageStructureContext } from "@/utils/pageStructureContext";
import { extractCleanCode, looksLikeCode, ensureReactImports } from "@/utils/aiCodeCleaner";
import { AIActivityPanel } from "@/components/ai-agent/AIActivityPanel";
import { useAIActivityMonitor } from "@/hooks/useAIActivityMonitor";
import { escapeCSSSelector } from "@/lib/builder/cssSelectorUtils";
import { extractJsxReturnBody } from "@/lib/builder/jsxMutation";
import { safeOpenExternal } from "@/utils/safeOpenExternal";

function isMissingBusinessInstallsError(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    status?: number;
    message?: string;
    details?: string;
  } | null;
  const combined = [candidate?.message, candidate?.details].filter(Boolean).join(' ').toLowerCase();
  return (
    candidate?.code === '42P01' ||
    candidate?.code === 'PGRST205' ||
    candidate?.status === 404 ||
    combined.includes('business_installs')
  );
}
import { useTemplateCustomizer } from "@/hooks/useTemplateCustomizer";
import { TemplateCustomizerPanel } from "./web-builder/TemplateCustomizerPanel";
import { getVariantById, extractSectionContentFromJSX, findSectionBounds } from '@/sections/variants';
import { swapSectionVariant } from '@/utils/sectionSwapper';
import type { VariantId } from '@/sections/variants/types';
import { ElementFloatingToolbar } from "./web-builder/ElementFloatingToolbar";
import { ElementIntentInspector } from "./web-builder/ElementIntentInspector";
import { IntentHealthPill } from "./web-builder/IntentHealthPill";
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
import { BusinessSetupSuggestions } from "@/components/onboarding/BusinessSetupSuggestions";
import type { SystemsBuildContext } from "@/types/systemsBuildContext";
import { useSiteBuilder, type UseSiteBuilderReturn } from "@/hooks/useSiteBuilder";
import { useAIVFS } from '@/hooks/useAIVFS';
import { extractEmbeddedCSS } from '@/utils/templateToVFS';
import { compileSiteBundleToVFS, normalizeLauncherFiles } from '@/utils/sandpackFilePrep';
import { isValidAesthetic } from '@/utils/aestheticToCSS';
import { buildThemedIndexCss, DEFAULT_PREVIEW_THEME_PRESET } from '@/components/onboarding/themePresetToIndexCss';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import { buildCanonicalArtifacts } from '@/utils/webBuilderArtifacts';
import { getTemplateReactCodeWithCSS } from '@/data/templates';
import type { LauncherHandoff, RuntimeManifest } from '@/types/runtimeManifest';
import type { PlaygroundCompileResult, PlaygroundState, WizardSelections } from '@/types/playground';
import { vfsSnapshotManager } from '@/services/vfsSnapshotManager';
import { diagnosticsAggregator } from '@/services/diagnosticsAggregator';
import { populateRegistryFromTopology, type GeneratedSitePlan } from '@/platform/core/siteTopologyPlanner';
import { commitToPipeline, type SiteBundleSnapshot } from '@/platform/core';
import { publishCreatorDataForUnison, writeCanonicalsToVFS } from '@/services/unisonCanonicalRegistry';
import { resolveIntentTarget, persistTopology, recoverTopology, persistTopologyToDb, recoverTopologyFromDb } from '@/utils/topologyResolver';
import { normalizeLauncherEntryPoint, resolveLauncherEntryPoint } from '@/utils/launcherPayload';
import {
  scaffoldMissingTopologyPagesWithRouter,
  getTopologyPagesForAIGeneration,
} from '@/services/unifiedPreviewPipeline';
import { livePreviewRuntime } from '@/builder/controllers/PreviewRuntimeController';
import { livePageTopology } from '@/builder/controllers/PageTopologyController';
import { liveVFSCommit } from '@/builder/controllers/VFSCommitService';

import { getProjectByIdCompat } from '@/services/projectSchemaCompat';
import { findBuilderDraftIdForProject } from '@/services/builderDraftBridge';
import { buildIntentReadinessReport } from '@/services/intentReadinessService';
import { loadCanonicalComponentGraph } from '@/services/componentGraphPersistence';
import { inferCanonicalComponentSlug } from '@/services/canonicalComponentRegistry';
import { buildCanonicalLaunchArtifacts } from '@/services/canonicalLaunchVfs';
import { PreviewOverlayManager, type OverlayConfig } from '@/components/preview/PreviewOverlayManager';
import PreviewCartDrawer from '@/components/preview/PreviewCartDrawer';
import {
  BROWSER_CART_EVENT,
  createBrowserCartManager,
  readBrowserCart,
} from '@/runtime/browserCartManager';

function getOrCreatePreviewBusinessId(systemType?: string): string {
  const key = systemType ? `webbuilder_businessId:${systemType}` : 'webbuilder_businessId';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = generateUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    // Fallback when localStorage is unavailable
    return generateUUID();
  }
}

// escapeCSSSelector + extractJsxReturnBody extracted to @/lib/builder/* (Phase C0).



/**
 * Find an element's start and end offsets in a JSX source string by a CSS-like selector.
 * Supports: tag, #id, tag:nth-of-type(n), and nested selectors with >.
 * Returns the character offsets in the source, or null if not found.
 */
function findElementBoundsInJSX(
  source: string,
  selector: string
): { start: number; end: number } | null {
  if (!selector) return null;

  // Selectors from the runtime can be comma-separated alternates,
  // e.g. `[data-ut-binding-key="x"], [data-element-key="x"]`. Try each.
  const alternates = splitTopLevelCommas(selector);
  for (const alt of alternates) {
    const result = findBoundsForSingleSelector(source, alt.trim());
    if (result) return result;
  }
  return null;
}

function splitTopLevelCommas(input: string): string[] {
  const out: string[] = [];
  let buf = '';
  let bracket = 0;
  let paren = 0;
  let quote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === '\\') { buf += ch + (input[++i] ?? ''); continue; }
      if (ch === quote) quote = null;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '(') paren++;
    else if (ch === ')') paren--;
    if (ch === ',' && bracket === 0 && paren === 0) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function findBoundsForSingleSelector(
  source: string,
  selector: string
): { start: number; end: number } | null {
  // Parse the selector into segments. Split on `>` at top level only so
  // attribute selectors like `[data-x="a > b"]` aren't broken.
  const allParts = splitTopLevelCombinator(selector)
    .map(s => s.trim())
    .filter(s => s && s !== 'body' && s !== 'html');

  if (allParts.length === 0) return null;

  // Try the full path first; if no match, progressively drop leading segments.
  for (let drop = 0; drop < allParts.length; drop++) {
    const result = findBoundsForParts(source, allParts.slice(drop));
    if (result) return result;
  }
  // Final fallback: try just the leaf segment with index 0 (best-effort)
  const leaf = allParts[allParts.length - 1];
  if (leaf) {
    const stripped = leaf.replace(/:nth-of-type\(\d+\)/, '');
    if (stripped !== leaf) {
      const result = findBoundsForParts(source, [stripped]);
      if (result) return result;
    }
  }
  return null;
}

function splitTopLevelCombinator(input: string): string[] {
  const out: string[] = [];
  let buf = '';
  let bracket = 0;
  let paren = 0;
  let quote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === '\\') { buf += ch + (input[++i] ?? ''); continue; }
      if (ch === quote) quote = null;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '(') paren++;
    else if (ch === ')') paren--;
    if (ch === '>' && bracket === 0 && paren === 0) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Parse leading `[name="value"]` / `[name=value]` / `[name]` selectors. */
function parseAttributeSelectors(part: string): { attrs: Array<{ name: string; value: string | null }>; rest: string } {
  const attrs: Array<{ name: string; value: string | null }> = [];
  let rest = part;
  const re = /\[([a-zA-Z_:][\w:.-]*)\s*(?:([~|^$*]?)=\s*(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/;
  while (true) {
    const m = rest.match(re);
    if (!m) break;
    const value = m[3] ?? m[4] ?? m[5] ?? null;
    attrs.push({ name: m[1], value: value !== null ? value.trim() : null });
    rest = (rest.slice(0, m.index!) + rest.slice(m.index! + m[0].length)).trim();
  }
  return { attrs, rest };
}

function findBoundsForParts(
  source: string,
  parts: string[]
): { start: number; end: number } | null {
  if (parts.length === 0) return null;

  let searchSource = source;
  let baseOffset = 0;

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    const isLast = pi === parts.length - 1;

    // Extract any [attr=...] selectors first
    const { attrs, rest } = parseAttributeSelectors(part);

    let tagName = '';
    let nthIndex = 0; // 0-based
    let id = '';

    const idMatch = rest.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      id = idMatch[1];
      tagName = rest.split('#')[0] || '';
    }

    const nthMatch = rest.match(/:nth-of-type\((\d+)\)/);
    if (nthMatch) {
      nthIndex = parseInt(nthMatch[1], 10) - 1;
      tagName = rest.split(':')[0] || tagName;
    }

    if (!tagName && !id) {
      tagName = rest.split('.')[0].split(':')[0].split('[')[0];
    }

    // If we have neither tag/id nor any attribute selector, this part is unusable
    if (!tagName && !id && attrs.length === 0) return null;

    let start = -1;
    let end = -1;
    let foundTag = '';

    if (id) {
      const idPattern = new RegExp(`<(\\w+)\\b[^>]*\\bid=["'{]${escapeRegex(id)}["'}][^>]*>`, 'i');
      const idFound = idPattern.exec(searchSource);
      if (!idFound) return null;
      foundTag = idFound[1];
      start = baseOffset + idFound.index;
      end = findJSXClosingTag(source, start, foundTag);
    } else if (attrs.length > 0) {
      // Match an opening tag carrying every required attribute.
      // Optionally constrained by tagName.
      const tagPart = tagName ? escapeRegex(tagName) : '[A-Za-z][\\w.-]*';
      // Walk every opening tag and test attributes
      const openRe = new RegExp(`<(${tagPart})\\b([^>]*)>`, 'gi');
      let m: RegExpExecArray | null;
      let count = 0;
      while ((m = openRe.exec(searchSource)) !== null) {
        const attrSegment = m[2] || '';
        const allMatch = attrs.every(a => attrMatches(attrSegment, a.name, a.value));
        if (!allMatch) continue;
        if (nthMatch && count !== nthIndex) { count++; continue; }
        foundTag = m[1];
        start = baseOffset + m.index;
        end = findJSXClosingTag(source, start, foundTag);
        break;
      }
      if (start === -1) return null;
    } else {
      // tag + optional nth
      const tagPattern = new RegExp(`<${escapeRegex(tagName)}\\b`, 'gi');
      let match: RegExpExecArray | null;
      let count = 0;
      while ((match = tagPattern.exec(searchSource)) !== null) {
        if (count === nthIndex) {
          start = baseOffset + match.index;
          foundTag = tagName;
          end = findJSXClosingTag(source, start, tagName);
          break;
        }
        count++;
      }
      if (start === -1) return null;
    }

    if (end === -1) return null;
    if (isLast) return { start, end };
    const openEnd = source.indexOf('>', start) + 1;
    searchSource = source.substring(openEnd, end);
    baseOffset = openEnd;
  }

  return null;
}

function attrMatches(attrSegment: string, name: string, value: string | null): boolean {
  // Match name="value" / name='value' / name={"value"} / name (boolean)
  const re = new RegExp(`\\b${escapeRegex(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*['"\`]([^'"\`]*)['"\`]\\s*\\})`, 'i');
  const m = attrSegment.match(re);
  if (!m) {
    if (value === null) {
      // boolean attribute presence
      return new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').test(attrSegment);
    }
    return false;
  }
  if (value === null) return true;
  const actual = m[1] ?? m[2] ?? m[3] ?? '';
  return actual === value;
}

/**
 * Find the closing tag offset for a JSX element, handling nested same-tag elements.
 */
function findJSXClosingTag(source: string, openStart: number, tagName: string): number {
  // Check for self-closing tag first
  const selfCloseCheck = source.substring(openStart, openStart + 500);
  const selfCloseMatch = selfCloseCheck.match(new RegExp(`^<${tagName}\\b[^>]*/>`,'i'));
  if (selfCloseMatch) return openStart + selfCloseMatch[0].length;

  const lcTag = tagName.toLowerCase();
  let depth = 0;
  let i = openStart;

  while (i < source.length) {
    const openMatch = source.substring(i).match(new RegExp(`^<${lcTag}\\b`, 'i'));
    if (openMatch) {
      const afterOpen = source.substring(i).match(new RegExp(`^<${lcTag}\\b[^>]*/>`,'i'));
      if (afterOpen) {
        i += afterOpen[0].length;
        continue;
      }
      depth++;
      i += openMatch[0].length;
      continue;
    }

    const closeMatch = source.substring(i).match(new RegExp(`^<\\/${lcTag}\\s*>`, 'i'));
    if (closeMatch) {
      depth--;
      if (depth === 0) {
        return i + closeMatch[0].length;
      }
      i += closeMatch[0].length;
      continue;
    }

    // Skip string literals
    if (source[i] === '"' || source[i] === "'") {
      const q = source[i];
      i++;
      while (i < source.length && source[i] !== q) {
        if (source[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (source[i] === '`') {
      i++;
      while (i < source.length && source[i] !== '`') {
        if (source[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }

    i++;
  }
  return -1;
}

/**
 * Perform a source-level manipulation on TSX code.
 * The operation receives the return body JSX and returns modified JSX, or null on failure.
 * For TSX: extracts return body, applies op, reconstructs.
 */
function withSourceManipulation(
  code: string,
  sourceOp: (jsx: string) => string | null
): { ok: true; code: string } | { ok: false; code: string } {
  const trimmed = (code || '').trim();
  if (!trimmed) return { ok: false, code };

  const extracted = extractJsxReturnBody(trimmed);
  if (!extracted) {
    // Try operating on the code directly (e.g., JSX fragment)
    const result = sourceOp(trimmed);
    if (result === null) return { ok: false, code };
    return { ok: true, code: result };
  }

  const result = sourceOp(extracted.jsx);
  if (result === null) return { ok: false, code };

  const newCode = `${extracted.before}\n    ${result}\n  ${extracted.after}`;
  return { ok: true, code: newCode };
}

/**
 * Safely query a selector with escaping, trying multiple fallback strategies
 */
function safeFindElement(doc: Document, selector: string): Element | null {
  // Strategy 1: Try escaped selector
  try {
    const escaped = escapeCSSSelector(selector);
    const el = doc.querySelector(escaped);
    if (el) return el;
  } catch { /* noop */ }

  // Strategy 2: Strip html > body prefix with escaping
  try {
    const stripped = selector
      .replace(/^html\s*>\s*body[^\s>]*\s*>\s*/, '')
      .replace(/^body[^\s>]*\s*>\s*/, '');
    if (stripped !== selector) {
      const escaped = escapeCSSSelector(stripped);
      const el = doc.querySelector(escaped);
      if (el) return el;
    }
  } catch { /* noop */ }

  // Strategy 3: Remove all :nth-child() qualifiers with escaping
  try {
    const noNth = selector.replace(/:nth-child\(\d+\)/g, '');
    const escaped = escapeCSSSelector(noNth);
    const el = doc.querySelector(escaped);
    if (el) return el;
    
    const strippedNoNth = noNth
      .replace(/^html\s*>\s*body[^\s>]*\s*>\s*/, '')
      .replace(/^body[^\s>]*\s*>\s*/, '');
    if (strippedNoNth !== noNth) {
      const escapedStripped = escapeCSSSelector(strippedNoNth);
      const el2 = doc.querySelector(escapedStripped);
      if (el2) return el2;
    }
  } catch { /* noop */ }

  // Strategy 4: Tag-only path fallback (most permissive)
  try {
    const tagPath = selector
      .split(/\s*>\s*/)
      .map(part => part.replace(/[.#:[][^\s>]*/g, '').trim())
      .filter(Boolean)
      .filter(t => t !== 'html' && t !== 'body')
      .join(' > ');
    if (tagPath) {
      const el = doc.querySelector(tagPath);
      if (el) return el;
    }
  } catch { /* noop */ }

  return null;
}

/**
 * Build a context-aware prompt for dynamic React page generation.
 * Called when user clicks a redirect-worthy button and the target page
 * doesn't exist in VFS yet. Output is a React/TSX component.
 */
function buildDynamicPagePrompt(
  pageName: string,
  _pageContext: string,
  navLabel: string,
  mainPageCode: string,
  options?: {
    businessContext?: string | null;
    designProfile?: {
      dominantStyle?: string;
      industryHints?: string[];
    };
  }
): string {
  // Extract Tailwind class patterns from main page for consistency
  const colorMatch = mainPageCode.match(/(?:bg-|text-|from-|to-)([a-z]+-\d+)/g);
  const colors = colorMatch ? [...new Set(colorMatch)].slice(0, 10).join(', ') : 'blue, purple, gray';

  // Extract CSS variable usage
  const cssVarMatch = mainPageCode.match(/hsl\(var\(--[\w-]+\)\)/g);
  const cssVars = cssVarMatch ? [...new Set(cssVarMatch)].slice(0, 8).join(', ') : '';

  const pagePrompts: Record<string, string> = {
    checkout: `Create a checkout page component with:
- Order summary section with cart items and prices
- Shipping address form (name, email, address, city, state, zip)
- Payment section with card input fields
- Order total with subtotal, shipping, tax breakdown
- "Complete Purchase" button with onClick={() => alert('Order placed!')}
- Trust badges and secure payment icons
- Back to home link using Link from react-router-dom`,

    cart: `Create a shopping cart page component with:
- Cart items list with product images, names, quantities, prices
- Quantity adjusters (+/- buttons)
- Remove item buttons
- Subtotal calculation
- "Proceed to Checkout" link to /checkout
- "Continue Shopping" link back to /
- Empty cart state`,

    booking: `Create a booking/appointment page component with:
- Service selection cards
- Date picker calendar UI (use native date input)
- Available time slots grid
- Customer info form (name, email, phone)
- Special requests textarea
- "Confirm Booking" button with form submit handler
- Cancellation policy notice`,

    contact: `Create a contact page component with:
- Contact form (name, email, phone, subject, message) with useState
- Form validation and submit handler
- Business contact info section (address, phone, email, hours)
- Map placeholder
- Social media links`,

    services: `Create a services page component with:
- Hero section with services overview
- Individual service cards with icons, descriptions, pricing
- "Book Now" buttons linking to /booking
- Service comparison or FAQ section
- CTA to contact for custom quotes`,

    about: `Create an about page component with:
- Company story/mission section
- Team member profiles with photos and bios
- Company values or philosophy
- Timeline or milestones
- Awards/certifications section
- CTA to contact or learn more`,

    products: `Create a products catalog page component with:
- Product grid with images, names, prices using .map()
- Filter/sort controls using useState
- "Add to Cart" buttons
- Product quick view capability
- Pagination or load more
- Featured products section`,

    login: `Create a login page component with:
- Login form (email, password) with useState
- "Sign In" button with form submit handler
- "Forgot Password" link
- "Create Account" link to /signup
- Social login buttons (Google, Apple)
- Remember me checkbox`,

    signup: `Create a registration page component with:
- Signup form (name, email, password, confirm password) with useState
- Password strength indicator
- Terms & conditions checkbox
- "Create Account" button with form submit handler
- Already have account? Sign in link to /login
- Social signup options`,

    pricing: `Create a pricing page component with:
- 3 pricing tiers (Basic, Pro, Enterprise) as a data array
- Feature comparison table
- Toggle for monthly/yearly pricing using useState
- "Get Started" buttons
- FAQ about billing
- Money-back guarantee notice`,

    gallery: `Create a gallery/portfolio page component with:
- Masonry or grid image gallery
- Category filter tabs using useState
- Lightbox-style image viewing with useState
- Project descriptions
- Client testimonials
- CTA to inquire about projects`,
  };

  const specificPrompt = pagePrompts[pageName.toLowerCase()] ||
    `Create a complete ${navLabel || pageName} page component with relevant content, interactive elements using useState, and call-to-action buttons.`;

  return `🚀 CREATE A REACT PAGE COMPONENT: "${navLabel || pageName.toUpperCase()}"

This page is part of a multi-page React website using react-router-dom.
The user clicked "${navLabel}" from the main page.

${specificPrompt}

📋 CRITICAL REQUIREMENTS:

1. **REACT COMPONENT** — Export a default function component. Use React hooks (useState, useEffect) for interactivity.
2. **IMPORTS** — Only import from: 'react', 'react-router-dom' (Link, useNavigate). NO external UI libraries.
3. **TAILWIND CSS** — Use Tailwind utility classes for all styling. Use semantic CSS variables: hsl(var(--background)), hsl(var(--foreground)), hsl(var(--primary)), hsl(var(--primary-foreground)), hsl(var(--muted)), hsl(var(--muted-foreground)), hsl(var(--border)), hsl(var(--card)), hsl(var(--accent)).
4. **MATCH MAIN PAGE STYLING** — Use similar Tailwind classes: ${colors}${cssVars ? `\n   CSS vars found: ${cssVars}` : ''}
5. **NAVIGATION** — Include a header with <Link to="/"> for home and links to other pages.
6. **BACK BUTTON** — Include a prominent <Link to="/">← Back to Home</Link> in the header.
7. **REAL CONTENT** — Write actual text, not "Lorem ipsum" placeholders.
8. **RESPONSIVE** — Mobile-first with md: and lg: breakpoints.
9. **FOOTER** — Match the main page footer style.
10. **NO HTML DOCUMENTS** — Do NOT output <!DOCTYPE html> or <html> tags. This is a React component.
11. **INTENT WIRING** — Wire ALL interactive buttons with data-ut-intent attributes:
    - Contact/form buttons: data-ut-intent="contact.submit"
    - Booking buttons: data-ut-intent="booking.create"
    - Newsletter: data-ut-intent="newsletter.subscribe"
    - CTA buttons: data-ut-intent="cta.primary"
    - Quote requests: data-ut-intent="quote.request"
    - Forms: <form data-ut-intent="contact.submit">
    - Anchor links: <a href="#section" data-ut-intent="nav.anchor">

${options?.businessContext ? `📊 BUSINESS CONTEXT:\n${options.businessContext}` : ''}

${options?.designProfile?.dominantStyle ? `🎨 USER DESIGN PREFERENCES:
- Dominant Style: ${options.designProfile.dominantStyle}
- Industry: ${options.designProfile.industryHints?.join(', ') || 'general'}
Match the user's established design preferences.` : ''}

CONTEXT FROM MAIN PAGE (extract styling patterns):
${mainPageCode.substring(0, 2000)}

OUTPUT: A single React/TSX component file. No markdown fences, no explanations. Just the code starting with import statements.`;
}

/**
 * Validate AI-generated code against the original template to detect destructive changes.
 * Returns warnings if the AI significantly altered the template structure.
 */
interface CodeValidationResult {
  isValid: boolean;
  warnings: string[];
  severity: 'ok' | 'warning' | 'critical';
  sectionDiff: number;
  contentLoss: number;
}

/**
 * Extract all <style> blocks from HTML source.
 */
function extractStyleBlocks(html: string): string[] {
  const regex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  return html.match(regex) || [];
}

/**
 * Preserve the original template's <style> blocks in the AI-generated output.
 * This prevents the AI from silently rewriting CSS custom properties, color palettes,
 * font stacks, and animation keyframes that define the template's visual identity.
 */
function preserveStyleBlocks(originalCode: string, aiCode: string): string {
  const origStyles = extractStyleBlocks(originalCode);
  const aiStyles = extractStyleBlocks(aiCode);

  // If original had style blocks and AI changed or removed them, restore originals
  if (origStyles.length === 0) return aiCode;

  // Replace AI style blocks with original ones (same count → 1:1 swap)
  let result = aiCode;
  if (aiStyles.length === origStyles.length) {
    for (let i = 0; i < origStyles.length; i++) {
      result = result.replace(aiStyles[i], origStyles[i]);
    }
  } else if (aiStyles.length < origStyles.length) {
    // AI removed style blocks — replace what's there and append the rest
    for (let i = 0; i < aiStyles.length; i++) {
      result = result.replace(aiStyles[i], origStyles[i]);
    }
    // Inject missing style blocks before </head> or before </style> of last match
    const remaining = origStyles.slice(aiStyles.length).join('\n');
    const headClose = result.indexOf('</head>');
    if (headClose !== -1) {
      result = result.slice(0, headClose) + '\n' + remaining + '\n' + result.slice(headClose);
    }
  } else {
    // AI added extra style blocks — keep originals, drop AI additions
    for (let i = 0; i < origStyles.length; i++) {
      result = result.replace(aiStyles[i], origStyles[i]);
    }
    // Remove any extra AI style blocks (but keep script-only additions like ai-style-overrides)
    for (let i = origStyles.length; i < aiStyles.length; i++) {
      // Keep AI-injected override blocks (functional additions), remove visual rewrites
      if (!aiStyles[i].includes('ai-style-overrides')) {
        result = result.replace(aiStyles[i], '');
      }
    }
  }

  return result;
}

/**
 * Preserve inline class attributes from the original template on elements that the AI
 * should not have modified. Compares elements by tag+id or tag+data-section and restores
 * the original class attribute when the AI changed it without a corresponding structural change.
 */
function preserveInlineClasses(originalCode: string, aiCode: string): string {
  // Build a map of element id/data-section → class attribute from original
  const classMap = new Map<string, string>();
  const classRegex = /<(\w+)\s+[^>]*?((?:id|data-section)="[^"]*")[^>]*?class="([^"]*)"/gi;
  let match: RegExpExecArray | null;
  
  while ((match = classRegex.exec(originalCode)) !== null) {
    const key = `${match[1].toLowerCase()}|${match[2]}`;
    classMap.set(key, match[3]);
  }
  
  if (classMap.size === 0) return aiCode;
  
  // For each identifiable element in AI output, check if classes changed
  let result = aiCode;
  const aiClassRegex = /<(\w+)\s+[^>]*?((?:id|data-section)="[^"]*")[^>]*?class="([^"]*)"/gi;
  const replacements: Array<{ from: string; to: string }> = [];
  
  while ((match = aiClassRegex.exec(aiCode)) !== null) {
    const key = `${match[1].toLowerCase()}|${match[2]}`;
    const origClass = classMap.get(key);
    if (origClass && origClass !== match[3]) {
      // AI changed classes on this element — restore original
      replacements.push({
        from: match[0],
        to: match[0].replace(`class="${match[3]}"`, `class="${origClass}"`)
      });
    }
  }
  
  for (const rep of replacements) {
    result = result.replace(rep.from, rep.to);
  }
  
  return result;
}

function validateAICodeChange(originalCode: string, newCode: string): CodeValidationResult {
  const warnings: string[] = [];
  
  if (!originalCode || !newCode) {
    return { isValid: true, warnings: [], severity: 'ok', sectionDiff: 0, contentLoss: 0 };
  }
  
  // Count sections in original vs new
  const origSections = (originalCode.match(/<section/gi) || []).length;
  const newSections = (newCode.match(/<section/gi) || []).length;
  const sectionDiff = origSections - newSections;
  
  if (sectionDiff > 0) {
    warnings.push(`${sectionDiff} section(s) removed from template`);
  }
  
  // Check if header/footer were removed
  const origHasHeader = /<header/i.test(originalCode);
  const newHasHeader = /<header/i.test(newCode);
  const origHasFooter = /<footer/i.test(originalCode);
  const newHasFooter = /<footer/i.test(newCode);
  
  if (origHasHeader && !newHasHeader) {
    warnings.push('Header section was removed');
  }
  if (origHasFooter && !newHasFooter) {
    warnings.push('Footer section was removed');
  }
  
  // Check for significant content length reduction (more than 30%)
  const origLength = originalCode.length;
  const newLength = newCode.length;
  const contentLoss = origLength > 0 ? Math.round(((origLength - newLength) / origLength) * 100) : 0;
  
  if (contentLoss > 30) {
    warnings.push(`Template content reduced by ${contentLoss}% - possible data loss`);
  }
  
  // Check for script/style preservation
  const origScripts = (originalCode.match(/<script/gi) || []).length;
  const newScripts = (newCode.match(/<script/gi) || []).length;
  if (origScripts > newScripts) {
    warnings.push(`${origScripts - newScripts} script block(s) removed - functionality may be broken`);
  }
  
  const origStyles = (originalCode.match(/<style/gi) || []).length;
  const newStyles = (newCode.match(/<style/gi) || []).length;
  if (origStyles > newStyles) {
    warnings.push(`${origStyles - newStyles} style block(s) removed - styling may be affected`);
  }
  
  // Determine severity
  let severity: 'ok' | 'warning' | 'critical' = 'ok';
  if (warnings.length > 0) {
    severity = 'warning';
  }
  if (sectionDiff > 2 || contentLoss > 50 || (!newHasHeader && origHasHeader) || (!newHasFooter && origHasFooter)) {
    severity = 'critical';
  }
  
  return {
    isValid: severity !== 'critical',
    warnings,
    severity,
    sectionDiff,
    contentLoss,
  };
}

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
    display?: string;
    opacity?: string;
  };
  attributes?: Record<string, string>;
  selector?: string;
  html?: string;
  section?: string;
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
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose, ArrowLeft } from "lucide-react";
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

// ---------------------------------------------------------------------------
// Error boundary for the code/split view panels
// ---------------------------------------------------------------------------
class CodeViewErrorBoundary extends Component<
  { children: ReactNode; onFallbackClick?: () => void },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: ReactNode; onFallbackClick?: () => void }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WebBuilder] Code view crashed:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0d1117] rounded-lg border border-white/10">
          <div className="text-center max-w-sm p-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">Code Editor failed to load</h3>
            <p className="text-sm text-white/50 mb-4">{this.state.errorMsg || 'An unexpected error occurred.'}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, errorMsg: '' })}
                className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
              >
                Retry
              </button>
              {this.props.onFallbackClick && (
                <button
                  onClick={this.props.onFallbackClick}
                  className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary text-white rounded-md transition-colors"
                >
                  Switch to Canvas
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  designPreset?: string;
  aesthetic?: string;
  startInPreview?: boolean;
  systemType?: string;
  systemName?: string;
  businessId?: string;
  projectId?: string;
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
}

export const WebBuilder = ({ initialHtml, initialCss, onSave }: WebBuilderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { launch } = useLaunch();
  const routeState = (location.state as WebBuilderRouteState | null) ?? null;
  const launchRouteState = useMemo<WebBuilderRouteState | null>(() => {
    if (!launch) return null;

    return {
      vfsFiles: launch.vfsFiles,
      templateName: launch.templateName,
      templateCategory: launch.templateCategory,
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
    };
  }, [launch]);
  const effectiveRouteState = useMemo<WebBuilderRouteState | null>(() => {
    if (!launchRouteState && !routeState) return null;
    return {
      ...(launchRouteState ?? {}),
      ...(routeState ?? {}),
    };
  }, [launchRouteState, routeState]);
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
  const [currentUserId, setCurrentUserId] = useState<string>(''); // This would come from auth
  const [codePreviewOpen, setCodePreviewOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [integrationsPanelOpen, setIntegrationsPanelOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportHtml, setExportHtml] = useState("");
  const [exportCss, setExportCss] = useState("");
  const [exportJs, setExportJs] = useState("");
  const [exportProjectName, setExportProjectName] = useState("my-project");
  const [saveProjectDialogOpen, setSaveProjectDialogOpen] = useState(false);
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
    const raw = effectiveRouteState?.designPreset
      || effectiveRouteState?.aesthetic
      || (effectiveRouteState?.runtimeManifest?.appContext as { themePresetId?: string } | undefined)?.themePresetId
      || null;
    return raw && isValidAesthetic(raw) ? raw : raw || null;
  }, [effectiveRouteState?.designPreset, effectiveRouteState?.aesthetic, effectiveRouteState?.runtimeManifest?.appContext]);
  const [currentTemplateCategory, setCurrentTemplateCategory] = useState<string | null>(
    effectiveRouteState?.templateCategory || null
  );
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [currentManifestId, setCurrentManifestId] = useState<string | null>(
    effectiveRouteState?.manifestId || null
  );
  const [isSavingProject, setIsSavingProject] = useState(false);
  const creatorPlayground = useCreatorPlayground();
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
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
  const [editorCode, setEditorCode] = useState('// AI Web Builder - JavaScript Mode\n// Use vanilla JavaScript to create interactive web experiences\n\n// Example: Create a simple interactive button\nconst createButton = () => {\n  const button = document.createElement("button");\n  button.textContent = "Click Me!";\n  button.style.padding = "12px 24px";\n  button.style.fontSize = "16px";\n  button.style.cursor = "pointer";\n  \n  button.onclick = () => {\n    alert("Hello from Web Builder!");\n  };\n  \n  return button;\n};\n\n// Usage: Uncomment to test\n// document.body.appendChild(createButton());');
  const [previewCode, setPreviewCode] = useState(`import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to AI Web Builder</h1>
        <p className="text-muted-foreground">Use the AI Code Assistant to generate components</p>
      </div>
    </div>
  );
}`);
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
  const draftPersistencePromiseRef = useRef<Promise<string | null> | null>(null);

  const importedRouteStateRef = useRef<string | null>(null);

  // Auto-open SystemLauncher when no pre-generated content is provided
  const hasIncomingContent = !!(
    effectiveRouteState?.vfsFiles ||
    effectiveRouteState?.generatedCode ||
    effectiveRouteState?.generatedTemplate ||
    effectiveRouteState?.siteBundleSnapshot ||
    effectiveRouteState?.materializedPlayground ||
    effectiveRouteState?.siteBundle
  );
  const [showLauncher, setShowLauncher] = useState(!hasIncomingContent);
  const routeStateHasStructuredProject = !!(
    effectiveRouteState?.vfsFiles ||
    effectiveRouteState?.generatedCode ||
    effectiveRouteState?.generatedTemplate ||
    effectiveRouteState?.siteBundle ||
    effectiveRouteState?.siteBundleSnapshot ||
    effectiveRouteState?.materializedPlayground
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

    // 0. Ensure color scheme is enforced (prevent dark mode inversion)
    if (!iframeDoc.querySelector('meta[name="color-scheme"]')) {
      const colorSchemeMeta = iframeDoc.createElement('meta');
      colorSchemeMeta.name = 'color-scheme';
      colorSchemeMeta.content = 'light';
      iframeDoc.head.insertBefore(colorSchemeMeta, iframeDoc.head.firstChild);
    }
    if (!iframeDoc.getElementById('color-scheme-enforcement')) {
      const colorSchemeStyle = iframeDoc.createElement('style');
      colorSchemeStyle.id = 'color-scheme-enforcement';
      colorSchemeStyle.textContent = ':root { color-scheme: light; }';
      iframeDoc.head.appendChild(colorSchemeStyle);
    }

    // 1. Inject / update the customizer override CSS in-place
    const overrideCSS = templateCustomizer.generateOverrideCSS();
    let styleEl = iframeDoc.getElementById('customizer-overrides') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = iframeDoc.createElement('style');
      styleEl.id = 'customizer-overrides';
      iframeDoc.head.appendChild(styleEl);
    }
    styleEl.textContent = overrideCSS;

    // Helper to safely query selectors
    const safeQuery = (selector: string): Element | null => safeFindElement(iframeDoc, selector);

    // 2. Apply text / image / style element overrides directly on DOM nodes
    templateCustomizer.elementOverrides.forEach((override) => {
      try {
        if (override.textContent !== undefined) {
          const el = safeQuery(override.selector);
          if (el) el.textContent = override.textContent;
        }
        if (override.imageSrc) {
          const el = safeQuery(override.selector) as HTMLImageElement | null;
          if (el) el.setAttribute('src', override.imageSrc);
        }
        if (override.styles && Object.keys(override.styles).length) {
          const el = safeQuery(override.selector) as HTMLElement | null;
          if (el) {
            Object.entries(override.styles).forEach(([k, v]) => {
              el.style.setProperty(
                k.replace(/([A-Z])/g, '-$1').toLowerCase(),
                v,
                'important',
              );
            });
          }
        }
        if (override.attributes && Object.keys(override.attributes).length) {
          const el = safeQuery(override.selector) as HTMLElement | null;
          if (el) {
            Object.entries(override.attributes).forEach(([key, value]) => {
              if (value == null || value === '') {
                el.removeAttribute(key);
              } else {
                el.setAttribute(key, value);
              }
            });
          }
        }
      } catch (e) {
        console.warn('[Customizer] DOM patch failed for', override.selector, e);
      }
    });

    // 3. Apply image replacements
    templateCustomizer.images.forEach((img) => {
      try {
        let el = safeQuery(img.selector) as HTMLImageElement | null;
        if (!el) {
          const allImgs = iframeDoc.querySelectorAll('img');
          const idx = parseInt(img.id.replace('img-', ''), 10);
          if (!isNaN(idx) && idx < allImgs.length) el = allImgs[idx] as HTMLImageElement;
        }
        if (el && el.getAttribute('src') !== img.src) {
          el.setAttribute('src', img.src);
          if (img.alt) el.setAttribute('alt', img.alt);
        }
      } catch { /* ignore selector errors */ }
    });

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
      section: el.section,
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
          liveVFSCommit.writeFiles({ [activePath]: next }, 'playground-edit', virtualFS.importFiles);
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
          liveVFSCommit.writeFiles({ [path]: attempt }, 'playground-edit', virtualFS.importFiles);
          return { ok: true };
        }
      }
    } catch (err) {
      console.warn('[applyMutatorAcrossVFS] VFS scan failed:', err);
    }
    return { ok: false, reason: next === previewCode ? 'no-change' : 'no-match' };
  }, [previewCode, recordManualPageEdit]);

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
    clearLivePreviewSelection();
    toast.success('Moved down');
  }, [previewCode, clearLivePreviewSelection, recordManualPageEdit]);

  // ── Layout-Intent Fast Path bridge for AIBuilderPanel ────────────────────
  // Bundles the deterministic layout-op handlers (selection-aware class edits,
  // section reorders, element move) into a single prop. The panel uses this to
  // short-circuit common "center / move / align" prompts without an LLM call.
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

  const hydrateSavedTemplate = useCallback((template: {
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
    };
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
      const entry = canvasData.entryPoint || launchEntryPoint;
      const preferred = canvasData.activePagePath || entry;
      importBuilderFiles(canvasData.vfsFiles, {
        preferredPath: preferred,
        entryPoint: entry,
      });
      if (canvasData.activePagePath) {
        setActivePagePath(canvasData.activePagePath);
      }
      setCurrentTemplateName(template.name);
      setSaveProjectName(template.name);
      setProjectDisplayName(template.name);
      setSaveProjectDescription(template.description || '');
      setBuilderMode('preview');
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
    return true;
  // importBuilderFiles is declared after this hook in the file; removing it from deps
  // avoids a temporal dead zone (TDZ) ReferenceError at render time. The closure body
  // captures it correctly because it is only invoked asynchronously (inside async IIFEs)
  // by which point importBuilderFiles is fully initialized.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorPlayground, launchEntryPoint]);
  
  // Load saved project from URL parameter on mount.
  // Hydrates the FULL VFS (multi-page, router, entry point) when present;
  // falls back to single-file legacy load for legacy design_templates rows.
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const templateId = searchParams.get('id');
    if (!templateId) return;

    let cancelled = false;
    (async () => {
      const template = await templateFiles.loadTemplate(templateId);
      if (!template || cancelled) return;
      if (!hydrateSavedTemplate(template)) return;
      toast.success(`Opened "${template.name}"`, {
        description: 'Project restored from your saved state',
      });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Get full cloud context from location state (from CloudProjects or System Launcher)
  const projectId = effectiveRouteState?.projectId;
  const systemType = effectiveRouteState?.systemType;
  const systemName = effectiveRouteState?.systemName;
  const businessId = effectiveRouteState?.businessId;
  const manifestIdFromState = effectiveRouteState?.manifestId;
  const projectSlug = effectiveRouteState?.projectSlug;
  const projectNameFromState = effectiveRouteState?.projectName;
  const publishStatusFromState = effectiveRouteState?.publishStatus;
  const customDomainFromState = effectiveRouteState?.customDomain;

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
    if (!projectId || urlId || routeStateHasStructuredProject || templateFiles.currentTemplateId) {
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
    templateFiles.currentTemplateId,
    templateFiles.loadTemplate,
  ]);

  const loadedCanonicalGraphProjectRef = useRef<string | null>(null);

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

      creatorPlayground.hydrateCanonicalState({
        pageRegistry: creatorPlayground.pageRegistry,
        creatorData: {
          ...creatorPlayground.creatorData,
          componentInstances: {
            ...creatorPlayground.creatorData.componentInstances,
            ...componentInstances,
          },
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, creatorPlayground]);
  // Business blueprint context forwarded from SystemsAIPanel for context-aware in-builder AI
  const systemsBuildContextFromState = effectiveRouteState?.systemsBuildContext ?? null;
  
  // Derive compiled contract from navigation state for SystemHealthPanel & preview gating
  const compiledContract = useCompiledContract(
    effectiveRouteState ? {
      systemsBuildContext: systemsBuildContextFromState ?? undefined,
      systemType: systemType ?? undefined,
      templateName: effectiveRouteState.templateName,
    } : null,
  );
  
  // Virtual file system for code editor
  const virtualFS = useVFSSafe();
  if (!virtualFS) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading builder context...</p>
        </div>
      </div>
    );
  }
  // Destructure stable callbacks for use in dependency arrays (avoids re-render loops)
  const {
    nodes: vfsNodes,
    getSandpackFiles,
    importFiles: vfsImportFiles,
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
    // Then write canonical contents back into the live VFS so the code
    // editor / deploy bundle / AI context all match what the preview runs.
    writeCanonicalsToVFS(
      (files) => liveVFSCommit.writeFiles(files, 'system-restore', vfsImportFiles),
      { creatorData: creatorDataForUnison },
    );
  }, [creatorDataForUnison, vfsImportFiles]);

  // AI → VFS orchestrator — auto-resolves dependencies and syncs to preview
  const aiVFS = useAIVFS(virtualFS, livePreviewRef);
  
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

    // If still no plan, try DB recovery (async, will re-run effect logic)
    if (!sitePlan) {
      recoverTopologyFromDb().then(dbPlan => {
        if (dbPlan && dbPlan.pages.length > 0 && Object.keys(creatorPlayground.pageRegistry.pages).length <= 1) {
          persistTopology(dbPlan);
          activeSitePlanRef.current = dbPlan;
          const registry = populateRegistryFromTopology(dbPlan);
          creatorPlayground.hydrateCanonicalState({ pageRegistry: registry });
          const existingFiles = virtualFS.getSandpackFiles();
          const missingFiles = scaffoldMissingTopologyPagesWithRouter(dbPlan, existingFiles, registry);
          if (Object.keys(missingFiles).length > 0) {
            liveVFSCommit.writeFiles(missingFiles, 'system-restore', virtualFS.importFiles);
          }
          // Trigger AI generation for placeholder pages
          const pagesToGenerate = getTopologyPagesForAIGeneration(dbPlan, existingFiles);
          for (const page of pagesToGenerate) {
            const pageName = page.filePath.split('/').pop()?.replace('.tsx', '')?.toLowerCase() || '';
            triggerPageGenRef.current(pageName, page.title, null);
          }
          console.log('[WebBuilder] Recovered topology from DB, AI generating', pagesToGenerate.length, 'pages');
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

    // CANONICAL VFS AUTHORITY:
    // SiteBundleSnapshot.vfsFiles is the post-merge, post-bound, post-router
    // output of canonicalLaunchVfs. It MUST overwrite any stale VFS state on
    // first hydration — otherwise the builder previews a divergent tree from
    // what the launcher just produced (broken sections, missing bindings,
    // wrong router). We only overwrite once per mount (gated by the early
    // return above on non-empty registry).
    if (snapshot?.vfsFiles && Object.keys(snapshot.vfsFiles).length > 0) {
      const existingFiles = virtualFS.getSandpackFiles();
      const filesToWrite: Record<string, string> = {};
      for (const [path, content] of Object.entries(snapshot.vfsFiles)) {
        if (typeof content !== 'string') continue;
        if (existingFiles[path] !== content) {
          filesToWrite[path] = content;
        }
      }
      if (Object.keys(filesToWrite).length > 0) {
        liveVFSCommit.writeFiles(filesToWrite, 'system-restore', virtualFS.importFiles);
        console.log(`[WebBuilder] Imported ${Object.keys(filesToWrite).length} canonical snapshot files (authoritative)`);
      }
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

      // Auto-scaffold placeholders + router for any pages still missing
      // after the canonical snapshot import above.
      const existingFiles = virtualFS.getSandpackFiles();
      const missingFiles = scaffoldMissingTopologyPagesWithRouter(sitePlan, existingFiles, canonicalRegistry || populateRegistryFromTopology(sitePlan));
      if (Object.keys(missingFiles).length > 0) {
        liveVFSCommit.writeFiles(missingFiles, 'system-restore', virtualFS.importFiles);
        console.log(`[WebBuilder] Scaffolded ${Object.keys(missingFiles).length} placeholder pages:`, Object.keys(missingFiles));
      }

      // Trigger AI generation to replace placeholders with real content
      const pagesToGenerate = getTopologyPagesForAIGeneration(sitePlan, existingFiles);
      if (pagesToGenerate.length > 0) {
        console.log(`[WebBuilder] AI generating ${pagesToGenerate.length} pages from topology`);
        // Stagger AI calls to avoid rate limits
        pagesToGenerate.forEach((page, idx) => {
          const pageName = page.filePath.split('/').pop()?.replace('.tsx', '')?.toLowerCase() || '';
          setTimeout(() => {
            triggerPageGenRef.current(pageName, page.title, null);
          }, idx * 1500); // 1.5s stagger between pages
        });
      }
    } else if (!snapshot?.vfsFiles || Object.keys(snapshot.vfsFiles).length === 0) {
      // Fallback: seed single Home page when there's neither plan nor snapshot
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
  const lastSyncedRegistryVersionRef = useRef<number>(-1);
  useEffect(() => {
    const registry = creatorPlayground.pageRegistry;
    if (!registry) return;
    // Mirror current registry into the singleton topology controller so other
    // modules (debug agent, AI patch lifecycle, intent inspector) can read
    // topology without prop-drilling through WebBuilder.
    livePageTopology.setRegistry(registry);
    if (Object.keys(registry.pages).length === 0) return;
    if (lastSyncedRegistryVersionRef.current === registry.version) return;

    try {
      const currentFiles = virtualFS.getSandpackFiles();
      const filesToImport: Record<string, string> = {};

      // Scaffold a minimal placeholder for any registry page whose file is
      // missing from the VFS. Without this, the canonical router imports
      // unresolved modules and the preview renders blank.
      for (const page of Object.values(registry.pages)) {
        const filePath = page.filePath || `/src/pages/${page.title.replace(/[^a-zA-Z0-9]/g, '') || 'Page'}.tsx`;
        if (!currentFiles[filePath]) {
          const componentName = (filePath.split('/').pop() || 'Page').replace(/\.(tsx|jsx|ts|js)$/, '');
          filesToImport[filePath] = `import React from 'react';\n\nexport default function ${componentName}() {\n  return (\n    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">\n      <div className="text-center">\n        <h1 className="text-3xl font-semibold mb-2">${page.title}</h1>\n        <p className="text-muted-foreground">This page is ready to be edited.</p>\n      </div>\n    </div>\n  );\n}\n`;
        }
      }

      const result = livePreviewRuntime.syncRouterIntoVFS(
        registry,
        currentFiles,
        launchEntryPoint,
        (files) => liveVFSCommit.writeFiles(files, 'playground-edit', virtualFS.importFiles),
        filesToImport,
      );

      lastSyncedRegistryVersionRef.current = registry.version;
      if (result.validation && !result.validation.valid) {
        console.warn('[WebBuilder] Topology validation issues after registry sync:', result.validation.issues);
      }
    } catch (err) {
      console.error('[WebBuilder] Canonical router sync failed:', err);
    }
  }, [creatorPlayground.pageRegistry, launchEntryPoint, virtualFS]);

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

  // Apply variant section swaps — replace section JSX blocks in VFS source code
  useEffect(() => {
    const activeVariants = templateCustomizer.activeVariants;
    if (!activeVariants || Object.keys(activeVariants).length === 0) return;

    const pageNode = vfsNodes.find(
      (n: { type: string; path?: string }) => n.type === 'file' && n.path === activePagePath
    ) as { id: string; content: string } | undefined;
    if (!pageNode) return;

    let source = pageNode.content;
    let modified = false;

    for (const [sectionId, variantId] of Object.entries(activeVariants)) {
      try {
        const variant = getVariantById(variantId);
        if (!variant?.renderJSX) continue;

        // Skip if this variant is already applied in source
        if (source.includes(`data-variant="${variantId}"`)) continue;

        const sectionInfo = templateCustomizer.sections.find(s => s.id === sectionId);
        if (!sectionInfo) continue;
        const tagName = sectionInfo.tagName || 'section';

        // findSectionBounds counts occurrences of <tagName> only, but
        // sectionInfo.order is the index across ALL section-like tags.
        // Recompute the per-tag index from the customizer section list so
        // the splice targets the correct DOM region.
        const typeIndex = templateCustomizer.sections
          .filter(s => (s.tagName || 'section') === tagName)
          .findIndex(s => s.id === sectionId);
        if (typeIndex < 0) continue;

        // Find section boundaries in the JSX source
        const bounds = findSectionBounds(source, tagName, typeIndex);
        if (!bounds) continue;

        // Extract content and render the new variant JSX
        const sectionJSX = source.substring(bounds.start, bounds.end);
        const content = extractSectionContentFromJSX(sectionJSX);
        const newJSX = variant.renderJSX(content);

        // Splice the replacement into the source
        source = source.substring(0, bounds.start) + newJSX + source.substring(bounds.end);
        modified = true;
        console.log('[WebBuilder] VFS variant swap applied:', sectionId, '→', variantId);
      } catch (e) {
        console.warn('[WebBuilder] VFS variant swap failed for', sectionId, e);
      }
    }

    if (modified) {
      vfsUpdateFileContent(pageNode.id, source);
    }
  }, [templateCustomizer.activeVariants, templateCustomizer.sections, vfsNodes, vfsUpdateFileContent, activePagePath]);
  
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
    const resolved = livePageTopology.resolveNavigation(
      { pageId },
      vfsFiles,
      creatorPlayground.pageRegistry,
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
      const fp = resolved.filePath || livePageTopology.deriveFilePath(page);
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
      liveVFSCommit.writeFiles(next, 'playground-edit', virtualFS.importFiles);
    }
    creatorPlayground.removePage(pageId);

    // The registry-version effect regenerates the router automatically,
    // but doing it inline keeps file removal + router update atomic.
    livePreviewRuntime.syncRouterIntoVFS(
      { ...creatorPlayground.pageRegistry, pages: Object.fromEntries(
        Object.entries(creatorPlayground.pageRegistry.pages).filter(([id]) => id !== pageId)
      ) },
      virtualFS.getSandpackFiles(),
      launchEntryPoint,
      (files) => liveVFSCommit.writeFiles(files, 'playground-edit', virtualFS.importFiles),
    );


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
    const newPageCode = `import { Link } from 'react-router-dom';

export default function ${componentName}Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 px-6 py-4">
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
          <span className="text-sm text-foreground font-medium">${label}</span>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-6">${label}</h1>
        <p className="text-muted-foreground text-lg">This is the ${label} page. Start editing to add your content.</p>
      </main>
    </div>
  );
}
`;
    liveVFSCommit.writeFiles({ [path]: newPageCode }, 'playground-edit', vfsImportFiles);
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
    liveVFSCommit.writeFiles(allFiles, 'playground-edit', vfsImportFiles);
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
      return preferredPath;
    }

    const resolvedEntryPath = resolveLauncherEntryPoint(
      files,
      preferredPath || launchEntryPoint,
    );
    if (resolvedEntryPath && files[resolvedEntryPath]) {
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
    },
  ) => {
    const normalizedEntryPoint = options?.entryPoint
      ? (options.entryPoint.startsWith('/') ? options.entryPoint : `/${options.entryPoint}`)
      : undefined;
    const normalizedFiles = normalizeLauncherFiles({ ...incomingFiles }, {
      entryPoint: normalizedEntryPoint,
      themePresetId: resolvedThemePresetId,
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

    liveVFSCommit.writeFiles(normalizedFiles, 'system-restore', vfsImportFiles);
    const syncedEntry = syncBuilderFromFiles(
      normalizedFiles,
      options?.preferredPath || normalizedEntryPoint || null,
    );

    return {
      files: normalizedFiles,
      syncedEntry,
    };
  }, [syncBuilderFromFiles, vfsImportFiles, launchEntryPoint]);
  
  // Effect A: previewCode → VFS  (one-way sync, runs when AI/templates/page-nav set previewCode)
  useEffect(() => {
    if (routeStateHasStructuredProject && !importedRouteStateRef.current) {
      console.log('[WebBuilder] Effect A deferred until route-state project import completes');
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
            { entryPoint: targetPath, themePresetId: resolvedThemePresetId }
          )
        : {
            [targetPath]: previewCode,
          };

      liveVFSCommit.writeFiles(importPayload, 'playground-edit', virtualFSRef.current.importFiles);
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
  const lastSavedCodeRef = useRef<string>('');
  // Track VFS file map signature so we persist multi-file AI edits even when
  // the legacy single-file `previewCode` blob did not change.
  const lastSavedVfsSignatureRef = useRef<string>('');
  const computeVfsSignature = useCallback((files: Record<string, string>): string => {
    const keys = Object.keys(files).sort();
    if (keys.length === 0) return '';
    let hash = 0;
    for (const k of keys) {
      const v = files[k] ?? '';
      // Cheap stable signature: path + length + last-32-char tail.
      const tail = v.length > 32 ? v.slice(-32) : v;
      const seg = `${k}:${v.length}:${tail}|`;
      for (let i = 0; i < seg.length; i++) {
        hash = ((hash << 5) - hash + seg.charCodeAt(i)) | 0;
      }
    }
    return `${keys.length}:${hash}`;
  }, []);
  // Keep the current template id in a ref so callbacks always read the
  // latest value without stale-closure issues (avoids re-creating intervals).
  const currentTemplateIdRef = useRef<string | null>(templateFiles.currentTemplateId);
  currentTemplateIdRef.current = templateFiles.currentTemplateId;
  useEffect(() => {
    setCurrentTemplateId(templateFiles.currentTemplateId || null);
  }, [templateFiles.currentTemplateId]);
  const getAutoSaveKey = useCallback(() =>
    currentTemplateIdRef.current
      ? `webbuilder_autosave_${currentTemplateIdRef.current}`
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

  const playgroundSetupSnapshot = useMemo(() => ({
    publishStatus: cloudState.project.publishStatus,
    customDomain: cloudState.project.customDomain,
    notificationEmail: cloudState.business.notificationEmail,
    projectName: cloudState.project.name,
  }), [cloudState.business.notificationEmail, cloudState.project.customDomain, cloudState.project.name, cloudState.project.publishStatus]);

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

  const selectedElementReadiness = useMemo(() => {
    if (selectedPlaygroundComponent) {
      const readiness = playgroundReadinessReport.componentReadiness[selectedPlaygroundComponent.instanceId];
      if (!readiness) return null;
      return {
        surfaceLabel: selectedPlaygroundComponent.label,
        previewStatus: readiness.previewStatus,
        publishStatus: readiness.publishStatus,
        missingDependencies: readiness.missingDependencies,
        onOpenSetup: () => {
          setPlaygroundInitialSection('components');
          setPlaygroundModalOpen(true);
        },
      };
    }

    if (selectedPlaygroundBinding) {
      const readiness = playgroundReadinessReport.readiness[selectedPlaygroundBinding.bindingId];
      if (!readiness) return null;
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
      };
    }

    return null;
  }, [playgroundReadinessReport, selectedPlaygroundBinding, selectedPlaygroundComponent]);
  
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
    if (currentTemplateId) lines.push(`- templateId: ${currentTemplateId}`);
    if (manifestIdFromState || currentManifestId) lines.push(`- manifestId: ${manifestIdFromState || currentManifestId}`);
    if (businessId) lines.push(`- businessId: ${businessId}`);
    if (redirectPageContext) lines.push(redirectPageContext);
    return lines.join("\n");
  }, [backendInstalled, activeSystemType, currentTemplateId, manifestIdFromState, currentManifestId, businessId, redirectPageContext]);

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
  
  // Set default businessId for intent routing
  useEffect(() => {
    // Use a UUID so backend tables that store business_id as UUID don't fail
    const effectiveBusinessId = businessId || getOrCreatePreviewBusinessId(systemType);
    
    if (effectiveBusinessId) {
      setDefaultBusinessId(effectiveBusinessId);
      console.log('[WebBuilder] Set default businessId for intents:', effectiveBusinessId);
    }

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
      setCurrentSystemType(null);
      setDemoMode(false);
    };
  }, [businessId, systemType, activeSystemType]);

  // Production readiness signal: check if this businessId has been installed
  useEffect(() => {
    const effectiveBusinessId = businessId || getOrCreatePreviewBusinessId(systemType);
    let cancelled = false;

    async function checkInstalled() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          if (!cancelled) setBackendInstalled(false);
          return;
        }

        const { data, error } = await supabase
          .from("business_installs" as any)
          .select("id")
          .eq("business_id", effectiveBusinessId)
          .limit(1);

        if (error) {
          if (isMissingBusinessInstallsError(error)) {
            if (!cancelled) setBackendInstalled(false);
            return;
          }
          console.warn("[WebBuilder] business_installs check failed", error);
          if (!cancelled) setBackendInstalled(false);
          return;
        }

        if (!cancelled) setBackendInstalled((data?.length ?? 0) > 0);
      } catch (e) {
        console.warn("[WebBuilder] backendInstalled check error", e);
        if (!cancelled) setBackendInstalled(false);
      }
    }

    checkInstalled();
    return () => {
      cancelled = true;
    };
  }, [businessId, systemType]);

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
    const preservedTemplateId =
      effectiveRouteState?.siteBundleSnapshot?.appContext?.templateId ||
      effectiveRouteState?.siteBundleSnapshot?.selectedTemplateId ||
      effectiveRouteState?.runtimeManifest?.appContext?.templateId ||
      effectiveRouteState?.wizardSelections?.templateId ||
      undefined;
    const preservedThemePresetId =
      effectiveRouteState?.siteBundleSnapshot?.appContext?.themePresetId ||
      effectiveRouteState?.siteBundleSnapshot?.selectedThemeId ||
      effectiveRouteState?.runtimeManifest?.appContext?.themePresetId ||
      effectiveRouteState?.wizardSelections?.themeId ||
      currentDesignPreset ||
      undefined;
    const recompilation = commitToPipeline(
      {
        playground: canonicalPlayground,
        existingVfsFiles: currentFiles,
        businessName: effectiveBusinessName,
        industry: effectiveRouteState?.siteBundleSnapshot?.industry,
        selectedTemplateId: preservedTemplateId,
        selectedThemeId: preservedThemePresetId,
        themePresetId: preservedThemePresetId,
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
      templateId: preservedTemplateId,
      businessName: effectiveBusinessName,
      industry: recompilation.siteBundleSnapshot.industry,
      aesthetic: preservedThemePresetId,
      themePresetId: preservedThemePresetId,
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
    routeStateHasStructuredProject,
  ]);

  const ensureLauncherDraftSaved = useCallback(async (
    reason: 'launcher_import' | 'interval_autosave',
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

    const finalCode = getFinalCodeWithOverrides();
    if (!finalCode || finalCode.includes('AI-generated code will appear here')) {
      return null;
    }

    if (draftPersistencePromiseRef.current) {
      return draftPersistencePromiseRef.current;
    }

    const payload = buildSavePayload();
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
        metadata: {
          ...(payload.metadata || {}),
          autoSaved: true,
          autoSaveReason: reason,
          autoSavedAt: new Date().toISOString(),
        },
      },
    ).then((draftId) => {
      if (draftId) {
        templateFiles.setCurrentTemplateId(draftId);
        setCurrentTemplateId(draftId);
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
    buildSavePayload,
    saveProjectDescription,
    templateFiles,
  ]);

  // Auto-save draft to localStorage + Supabase. Triggers on EITHER:
  //  - Legacy single-file `previewCode` change (template/inline edits), OR
  //  - VFS file map change (multi-file AI edits, importBuilderFiles, etc.)
  // Without the VFS-signature check, AI multi-file edits never persisted.
  const saveDraft = useCallback(async () => {
    const currentVfsFiles = virtualFSRef.current.getSandpackFiles();
    const vfsSignature = computeVfsSignature(currentVfsFiles);
    const previewCodeChanged = !!previewCode && previewCode !== lastSavedCodeRef.current;
    const vfsChanged = vfsSignature !== '' && vfsSignature !== lastSavedVfsSignatureRef.current;

    if (!previewCodeChanged && !vfsChanged) return;

    setAutoSaveStatus('saving');
    try {
      const saveKey = getAutoSaveKey();
      const draft = {
        code: previewCode,
        editorCode: editorCode,
        savedAt: new Date().toISOString(),
        templateId: currentTemplateIdRef.current || null,
        vfsSignature,
      };
      try { localStorage.setItem(saveKey, JSON.stringify(draft)); } catch { /* quota — ignore */ }
      lastSavedCodeRef.current = previewCode;
      lastSavedVfsSignatureRef.current = vfsSignature;
      setLastSavedAt(new Date());

      const existingDraftId = currentTemplateIdRef.current;
      const reason: 'interval_autosave' = 'interval_autosave';
      if (existingDraftId) {
        // buildSavePayload() snapshots the FULL VFS file map into payload.vfsFiles,
        // which useTemplateFiles.autoSave persists into builder_drafts.vfs_files.
        await templateFiles.autoSave(previewCode || '', {
          ...buildSavePayload(),
          metadata: {
            autoSaved: true,
            autoSaveReason: reason,
            autoSavedAt: new Date().toISOString(),
            vfsFileCount: Object.keys(currentVfsFiles).length,
          },
        });
      } else if (routeStateHasStructuredProject || vfsChanged) {
        // Create a draft on first VFS write so subsequent saves can target it.
        await ensureLauncherDraftSaved(reason);
      }

      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('[AutoSave] Error saving draft:', error);
      setAutoSaveStatus('idle');
    }
  }, [previewCode, editorCode, getAutoSaveKey, templateFiles, buildSavePayload, routeStateHasStructuredProject, ensureLauncherDraftSaved, computeVfsSignature]);

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
      // instead of saving — the files came from the loaded draft, not the user.
      if (lastSavedVfsSignatureRef.current === '') {
        const files = virtualFSRef.current.getSandpackFiles();
        if (Object.keys(files).length > 0) {
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

        // Best-effort localStorage snapshot — runs synchronously before unload.
        const saveKey = getAutoSaveKey();
        try {
          localStorage.setItem(saveKey, JSON.stringify({
            code: previewCode,
            editorCode,
            savedAt: new Date().toISOString(),
            templateId: currentTemplateIdRef.current || null,
            vfsSignature: sig,
            vfsFiles: currentVfsFiles,
          }));
        } catch { /* quota */ }

        // Best-effort async DB save (may not complete before unload — that's why
        // the localStorage snapshot above is the durable safety net).
        void saveDraftRef.current();
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
  }, [computeVfsSignature, getAutoSaveKey, previewCode, editorCode]);

  
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
        
        // Only restore if draft is less than 24 hours old
        if (hoursSinceLastSave < 24 && draft.code) {
          // Check if there's meaningful content (not just default)
          const isDefaultContent = draft.code.includes('AI-generated code will appear here');
          if (!isDefaultContent) {
            setShowLauncher(false);
            setPreviewCode(draft.code);
            if (draft.editorCode) {
              setEditorCode(draft.editorCode);
            }
            lastSavedCodeRef.current = draft.code;
            setLastSavedAt(savedTime);
            toast.info('Draft restored', {
              description: `Last saved ${format(savedTime, 'MMM d, h:mm a')}`,
              action: {
                label: 'Discard',
                onClick: () => {
                  localStorage.removeItem('webbuilder_autosave_draft');
                  setPreviewCode('import React from "react";\n\nexport default function App() {\n  return (\n    <div style={{ padding: "40px", textAlign: "center" }}>\n      <h1>Welcome to AI Web Builder</h1>\n      <p>Use the AI Code Assistant to generate components</p>\n    </div>\n  );\n}');
                },
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('[AutoSave] Error restoring draft:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const resolved = livePageTopology.resolveNavigation(
          { targetPageId, label: buttonLabel },
          vfsFiles,
          creatorPlayground.pageRegistry,
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
              const resolved2 = livePageTopology.resolveNavigation(
                { route: fallbackRoute },
                vfsFiles,
                creatorPlayground.pageRegistry,
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
        const path = (payload as any)?.path;
        if (path && path.startsWith('#')) {
          sendResultToIframe({ success: true });
          return;
        }
        if (path) {
          const vfsFiles = virtualFS.getSandpackFiles();
          const resolved = livePageTopology.resolveNavigation(
            { route: path, label: buttonLabel },
            vfsFiles,
            creatorPlayground.pageRegistry,
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

      // ── Helper: dispatch unwired-click → AI Builder wires asynchronously ──
      // Per the click-to-wire UX: unwired buttons no longer auto-open
      // deterministic overlays. The click is acknowledged immediately and
      // the AI Builder receives an event with full context to (a) wire the
      // correct intent for the button label, or (b) scaffold a contextual
      // page route if none exists. The NEXT click executes the now-wired
      // intent. Builder-preview only — the published runtime never reaches
      // this handler.
      const dispatchUnwiredClick = (reason: 'overlay-fallback' | 'no-binding') => {
        try {
          const detail = {
            intent,
            buttonLabel,
            suggestedPageType: classification.suggestedPageType ?? null,
            category: classification.category,
            elementContext: elementCtx,
            payload: payload as Record<string, unknown> | undefined,
            reason,
            currentPageId: (creatorPlayground as any)?.activePageId ?? null,
            queuedAt: Date.now(),
          };
          // Queue on window so AIBuilderPanel can flush it on mount even if
          // the panel was closed at click time (wizard-launched sites default
          // to panel closed). The live listener handles the open-panel case.
          try {
            const w = window as unknown as { __lovableUnwiredQueue?: unknown[] };
            w.__lovableUnwiredQueue = Array.isArray(w.__lovableUnwiredQueue) ? w.__lovableUnwiredQueue : [];
            w.__lovableUnwiredQueue.push(detail);
            if (w.__lovableUnwiredQueue.length > 5) w.__lovableUnwiredQueue.shift();
          } catch { /* noop */ }

          // Auto-open the AI panel so the listener mounts and the toast is visible.
          if (!aiPanelOpen) {
            try { setAiPanelOpen(true); } catch { /* noop */ }
          }

          window.dispatchEvent(new CustomEvent('lovable:unwired-click', { detail }));
        } catch (err) {
          console.warn('[WebBuilder] Failed to dispatch unwired-click:', err);
        }
      };

      switch (resolvedAction.action) {

        // ── Acknowledge ────────────────────────────────────────────────────
        // If the preview already handled it, just confirm. Otherwise this is
        // a truly unwired button → hand off to the AI Builder.
        case 'acknowledge': {
          if (!inPreviewHandled) {
            dispatchUnwiredClick('no-binding');
          }
          sendResultToIframe({ success: true });
          return;
        }

        // ── Cart: explicit cart intents stay wired and execute now ────────
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

        // ── Overlay fallback REPLACED by AI wiring ────────────────────────
        // Deterministic overlays (auth/booking/contact/quote/newsletter/
        // checkout) are no longer auto-opened for unwired buttons. The AI
        // Builder receives the click context and adds explicit wiring (or
        // scaffolds a page) so the NEXT click executes correctly.
        case 'overlay': {
          dispatchUnwiredClick('overlay-fallback');
          sendResultToIframe({ success: true });
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
    vfsResetToEmpty();
    const entryContent = options?.entryContent ?? files[activePath] ?? '';
    openBuilderFile(activePath, entryContent);
    liveVFSCommit.writeFiles(files, 'system-restore', vfsImportFiles);
  }, [launchEntryPoint, openBuilderFile, vfsImportFiles, vfsResetToEmpty]);

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
          hasSiteBundle: !!navState.siteBundle,
          vfsKeys: navState.vfsFiles ? Object.keys(navState.vfsFiles).sort() : [],
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

      if (navState.vfsFiles) {
        const mergedFiles = { ...navState.vfsFiles };
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
        (navState.aesthetic && isValidAesthetic(navState.aesthetic) ? navState.aesthetic : null)
        || ((navState as { siteBundleSnapshot?: { appContext?: { themePresetId?: string } } }).siteBundleSnapshot?.appContext?.themePresetId)
        || null;

      // Normalize launcher files — ensures /src/main.tsx, /src/index.css, /src/App.tsx exist.
      // We thread the resolved preset so the css-fallback path inside normalizeLauncherFiles
      // never injects a hard-coded 'modern' default for non-store industries.
      const normalizedEntryPoint = launcherEntryPoint
        ? (launcherEntryPoint.startsWith('/') ? launcherEntryPoint : `/${launcherEntryPoint}`)
        : null;
      const vfsFiles = normalizeLauncherFiles(launcherSourceFiles, {
        entryPoint: normalizedEntryPoint || launcherEntryPoint,
        themePresetId: resolvedThemePresetId,
      });

      // Force /src/index.css to the wizard's themed CSS — OVERWRITE, not prepend.
      // The previous prepend-based approach lost to a race where the launcher's themed
      // CSS hadn't yet hydrated into VFS, leaving the modern default. We now rebuild
      // deterministically from the resolved preset, every time.
      if (resolvedThemePresetId) {
        const preset = THEME_PRESETS.find((p) => p.id === resolvedThemePresetId) || DEFAULT_PREVIEW_THEME_PRESET;
        const themedCss = buildThemedIndexCss(preset);
        vfsFiles["/src/index.css"] = themedCss;
        // Mirror to any sibling CSS files so secondary stylesheets share the same tokens.
        Object.keys(vfsFiles).forEach((path) => {
          if (path.endsWith('.css') && path !== '/src/index.css' && !path.includes('shim')) {
            const existing = vfsFiles[path];
            if (typeof existing === 'string' && !existing.includes('/* AESTHETIC:')) {
              vfsFiles[path] = themedCss + '\n\n' + existing;
            }
          }
        });
        console.log('[WebBuilder] Applied wizard theme preset:', resolvedThemePresetId);
      }

      if (Object.keys(vfsFiles).length > 0) {
        const editableEntryPath = resolveLauncherEntryPoint(
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
        window.history.replaceState({}, document.title);
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
        const normalizedFiles = normalizeLauncherFiles(nextFiles, { entryPoint: launchEntryPoint, themePresetId: resolvedThemePresetId });
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
      
      // Build React/JSX sections directly — no raw HTML with class= attributes
      const sectionsJsx = (generatedTemplate.sections || []).map((section: any) => {
        const colCount = section.components?.length > 2 ? 3 : 2;
        const comps = (section.components || []).map((comp: any) =>
          `<div className="p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold mb-4">${comp.props?.title || 'Component'}</h3>
            <p className="text-gray-600">${comp.props?.description || 'Component content'}</p>
          </div>`
        ).join('\n          ');
        return `      <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold mb-8">${section.name}</h2>
            <div className="grid gap-6 md:grid-cols-${colCount}">${comps}</div>
          </div>
        </section>`;
      }).join('\n');

      const componentTitle = generatedTemplate.name || templateName || 'Template';
      const reactCode = `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
${sectionsJsx}
    </div>
  );
}
`;
      // Wire through VFS so preview stays in sync
      const templateFiles = normalizeLauncherFiles({
        [launchEntryPoint]: reactCode,
      }, {
        entryPoint: launchEntryPoint,
        themePresetId: resolvedThemePresetId,
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
    if (!launcherDraftBootstrapKey || templateFiles.currentTemplateId) {
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
        launcherDraftBootstrapRef.current = null;
      }
    });
  }, [
    launcherDraftBootstrapKey,
    templateFiles.currentTemplateId,
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
    const defaultCode = '// AI Web Builder - JavaScript Mode\n// Use vanilla JavaScript to create interactive web experiences\n\n// Example: Create a simple interactive button\nconst createButton = () => {\n  const button = document.createElement("button");\n  button.textContent = "Click Me!";\n  button.style.padding = "12px 24px";\n  button.style.fontSize = "16px";\n  button.style.cursor = "pointer";\n  \n  button.onclick = () => {\n    alert("Hello from Web Builder!");\n  };\n  \n  return button;\n};\n\n// Usage: Uncomment to test\n// document.body.appendChild(createButton());';
    
    const defaultPreview = 'import React from "react";\n\nexport default function App() {\n  return (\n    <div style={{ padding: "40px", textAlign: "center" }}>\n      <h1>Welcome to AI Web Builder</h1>\n      <p>Use the AI Code Assistant to generate components</p>\n    </div>\n  );\n}';
    
    setEditorCode(defaultCode);
    setPreviewCode(defaultPreview);
    
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

  // Helper to integrate CSS into HTML document
  const integrateCSSIntoHTML = useCallback((html: string, css: string): string => {
    if (!css || !css.trim()) return html;
    
    const styleTag = `<style>\n${css}\n</style>`;
    
    // Check if it's a full HTML document
    if (html.includes('</head>')) {
      // Insert CSS before </head>
      return html.replace('</head>', `${styleTag}\n</head>`);
    } else if (html.includes('<html') || html.includes('<!DOCTYPE')) {
      // Has HTML but no head - add before body or at start
      if (html.includes('<body')) {
        return html.replace('<body', `<head>${styleTag}</head>\n<body`);
      }
      return html.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${styleTag}</head>`);
    } else {
      // Fragment - wrap in full document with CSS
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  ${styleTag}
</head>
<body>
${html}
</body>
</html>`;
    }
  }, []);

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
    templateFiles.setCurrentTemplateId(template.id);
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
    setCurrentTemplateId(templateId || null);
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

  // Handle section layout swap from SectionLayoutPicker
  const handleSwapSection = useCallback((sectionId: string, variantId: string) => {
    console.log('[WebBuilder] Section swap:', sectionId, '→', variantId);
    const currentCode = previewCode;
    if (!currentCode) {
      toast.error('No template loaded to swap sections');
      return;
    }

    const swappedCode = swapSectionVariant(currentCode, sectionId, variantId as VariantId);
    if (swappedCode === currentCode) {
      toast.error('Could not swap section — variant or section not found');
      return;
    }

    importBuilderFiles(templateToVFSFiles(swappedCode, currentTemplateName || 'Untitled'), {
      preferredPath: activePagePath,
      entryPoint: activePagePath,
    });

    const variant = getVariantById(variantId as VariantId);
    toast.success(`Swapped ${sectionId} → ${variant?.name || variantId}`, {
      description: 'Section layout updated, theme preserved',
    });
  }, [previewCode, currentTemplateName, activePagePath, importBuilderFiles]);

  // Handle saving current template
  const handleSaveTemplate = useCallback(async (
    name: string,
    description: string,
    isPublic: boolean
  ) => {
    const finalCode = getFinalCodeWithOverrides();
    await templateFiles.saveTemplate(name, description, isPublic, finalCode, buildSavePayload());
  }, [templateFiles, getFinalCodeWithOverrides, buildSavePayload]);

  // Handle quick save (update existing template)
  const handleQuickSave = useCallback(async () => {
    if (templateFiles.currentTemplateId) {
      const finalCode = getFinalCodeWithOverrides();
      await templateFiles.updateTemplate(templateFiles.currentTemplateId, finalCode, buildSavePayload());
    } else {
      setFileManagerOpen(true);
    }
  }, [templateFiles, getFinalCodeWithOverrides, buildSavePayload]);

  // Handle save to projects from preview
  const handleSaveToProjects = useCallback(async (saveAsNew: boolean = false) => {
    if (!saveProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    
    setIsSavingProject(true);
    try {
      const isUpdating = templateFiles.currentTemplateId && !saveAsNew;
      const finalCode = getFinalCodeWithOverrides();
      const payload = buildSavePayload();
      
      if (isUpdating) {
        // Update existing project
        await templateFiles.updateTemplate(templateFiles.currentTemplateId, finalCode, payload);
        toast.success(`Updated "${saveProjectName}"`);
      } else {
        // Save as new project
        await templateFiles.saveTemplate(saveProjectName, saveProjectDescription, false, finalCode, payload);
        toast.success(`Saved "${saveProjectName}" to Projects`);
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
    
    const canvas = new FabricCanvas(canvasElement, {
      width: 1280,
      height: canvasHeight,
      backgroundColor: "#ffffff", // Keep canvas background white to avoid black flashes on zoom
    });

    setFabricCanvas(canvas);

    return () => {
      clearSelection();
      canvas.clear();
      canvas.dispose();
      setFabricCanvas(null);
    };
  }, [canvasHeight, clearSelection]);

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
      liveVFSCommit.writeFiles(patchedFiles, 'playground-edit', vfsImportFiles);
      
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

  const canonicalBuildArtifacts = useMemo(() => {
    const sourceFiles = getSandpackFiles();
    return buildCanonicalArtifacts(sourceFiles, {
      entryPoint: activePagePath,
      title: currentTemplateName || 'Unison Site',
    });
  }, [getSandpackFiles, activePagePath, currentTemplateName, virtualFS.nodes]);

  const handleExport = (format: string) => {
    if (canonicalBuildArtifacts) {
      setExportHtml(canonicalBuildArtifacts.exportHtml);
      setExportCss(canonicalBuildArtifacts.exportCss);
      setExportJs(canonicalBuildArtifacts.exportJs);
      setExportProjectName(currentTemplateName || 'my-project');
      setExportDialogOpen(true);
      return;
    }
    
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    let html = '<div class="web-page">\n';
    let css = '.web-page {\n  min-height: 100vh;\n  position: relative;\n  background: white;\n}\n\n';
    
    objects.forEach((obj: FabricCanvas['_objects'][0], index: number) => {
      const className = `element-${index}`;
      
      // Generate HTML
      if (obj.type === 'text' || obj.type === 'textbox') {
        html += `  <div class="${className}">${(obj as FabricTextObject).text}</div>\n`;
      } else if (obj.type === 'rect') {
        html += `  <div class="${className}"></div>\n`;
      } else if (obj.type === 'image') {
        html += `  <img class="${className}" src="${(obj as FabricImageObject).getSrc()}" alt="" />\n`;
      }
      
      // Generate CSS
      css += `.${className} {\n`;
      css += `  position: absolute;\n`;
      css += `  left: ${obj.left}px;\n`;
      css += `  top: ${obj.top}px;\n`;
      css += `  width: ${obj.width * (obj.scaleX || 1)}px;\n`;
      css += `  height: ${obj.height * (obj.scaleY || 1)}px;\n`;
      
      if (obj.fill) {
        css += `  background-color: ${obj.fill};\n`;
      }
      const textObj = obj as FabricTextObject;
      if (textObj.fontSize) {
        css += `  font-size: ${textObj.fontSize}px;\n`;
      }
      if (textObj.fontFamily) {
        css += `  font-family: ${textObj.fontFamily};\n`;
      }
      if (textObj.textAlign) {
        css += `  text-align: ${textObj.textAlign};\n`;
      }
      css += `}\n\n`;
    });
    
    html += '</div>';
    
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

  return (
    <BuilderSessionProvider
      value={{
        projectId: projectId || undefined,
        businessId: businessId || undefined,
        currentUserId,
        draftId: currentTemplateId || undefined,
      }}
    >
    <div ref={mainContainerRef} className={cn("flex flex-col h-screen bg-[#1a0a14]", isMobile && "pb-14")}>
      {/* SystemLauncher — auto-opens when no pre-generated content */}
      <SystemLauncher open={showLauncher} onOpenChange={setShowLauncher} />

      {/* Interactive Element Highlighting Styles */}
      <InteractiveElementHighlight isInteractiveMode={isInteractiveMode} />

      {/* Full-Width Top Toolbar */}
      <div className="h-12 flex-shrink-0 bg-[#0a0a14] border-b-2 border-fuchsia-500/50 flex items-center px-4 gap-3 shadow-[0_4px_20px_rgba(255,0,255,0.15)] z-20">
        {/* Left Section: AI Toggle, Back, Device, Mode */}
        <div className="flex items-center gap-2">
          {/* AI Panel Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={cn(
              "h-8 px-2.5 rounded-lg transition-all duration-200",
              aiPanelOpen 
                ? "bg-lime-500/20 text-lime-400 hover:bg-lime-500/30 shadow-[0_0_10px_rgba(0,255,0,0.3)]" 
                : "text-lime-400/60 hover:text-lime-400 hover:bg-lime-500/10"
            )}
            title={aiPanelOpen ? "Close AI Panel" : "Open AI Panel"}
          >
            <span className="text-sm">⚡ AI</span>
          </Button>

          <AIEditHistoryMenu
            projectId={projectId ?? null}
            onRevert={(snap) => {
              const beforeFiles = virtualFS.getSandpackFiles();
              liveVFSCommit.writeFiles(snap.before, 'system-restore', virtualFS.importFiles);
              syncBuilderFromFiles(snap.before, activePagePath);
              pushAISnapshot(projectId ?? null, {
                label: `Revert · ${snap.label}`,
                source: 'manual',
                before: beforeFiles,
                after: snap.before,
                changedPaths: diffChangedPaths(beforeFiles, snap.before),
              });
              toast.success('Reverted to previous state');
            }}
            onReapply={(snap) => {
              const beforeFiles = virtualFS.getSandpackFiles();
              liveVFSCommit.writeFiles(snap.after, 'system-restore', virtualFS.importFiles);
              syncBuilderFromFiles(snap.after, activePagePath);
              pushAISnapshot(projectId ?? null, {
                label: `Reapply · ${snap.label}`,
                source: 'manual',
                before: beforeFiles,
                after: snap.after,
                changedPaths: diffChangedPaths(beforeFiles, snap.after),
              });
              toast.success('Reapplied AI edit');
            }}
          />

          <div className="h-5 w-px bg-fuchsia-500/50" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackNavigation}
            className="text-cyan-400 hover:text-cyan-300 h-8 px-2.5 rounded-lg hover:bg-cyan-500/20 hover:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all duration-200"
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
              className="hidden md:block bg-transparent border border-transparent hover:border-cyan-500/30 focus:border-cyan-500/60 focus:bg-[#0d0d18] outline-none text-sm text-cyan-100 px-2 py-1 rounded-md max-w-[220px] truncate"
            />
          )}

          <div className="h-5 w-px bg-fuchsia-500/50 hidden sm:block" />
          
          {/* Device + Mode + Tools — hidden on small screens (use bottom nav on mobile) */}
          <div className="hidden sm:flex items-center gap-2">
          {/* Device Breakpoints */}
          <div className="flex items-center gap-0.5 bg-[#0d0d18] rounded-lg p-1">
            <Button
              variant={device === "desktop" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setDevice("desktop")}
              className={cn("h-7 w-7 rounded-md transition-all duration-200", device === "desktop" ? "bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,255,255,0.6)]" : "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/20")}
              title="Desktop"
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={device === "tablet" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setDevice("tablet")}
              className={cn("h-7 w-7 rounded-md transition-all duration-200", device === "tablet" ? "bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,255,255,0.6)]" : "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/20")}
              title="Tablet"
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={device === "mobile" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setDevice("mobile")}
              className={cn("h-7 w-7 rounded-md transition-all duration-200", device === "mobile" ? "bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,255,255,0.6)]" : "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/20")}
              title="Mobile"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="h-5 w-px bg-fuchsia-500/50" />
          
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
          
          {/* Left/Right Panel Toggles */}
          <div className="h-5 w-px bg-fuchsia-500/50" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className={cn(
              "h-8 px-2 rounded-lg transition-all duration-200",
              !leftPanelCollapsed 
                ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" 
                : "text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-500/10"
            )}
            title={leftPanelCollapsed ? "Show Elements Panel" : "Hide Elements Panel"}
          >
            <Layers className="h-4 w-4" />
          </Button>
          </div>{/* end hidden sm:flex device+mode+tools */}
        </div>

        {/* Center Section: Floating Dock - hidden on small screens */}
        <div className="flex-1 hidden sm:flex justify-center overflow-hidden min-w-0">
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
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0d0d18]/80 backdrop-blur-sm rounded-xl p-0.5 border border-white/[0.06] shadow-lg shadow-black/20">
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
                    'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-250 outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50',
                    isActive
                      ? 'bg-fuchsia-500 text-black shadow-[0_0_18px_rgba(255,0,255,0.55)] scale-[1.02]'
                      : 'text-fuchsia-400/60 hover:text-fuchsia-300 hover:bg-fuchsia-500/[0.12]',
                  )}
                  title={`${label} View`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className={cn('tracking-wide hidden sm:inline', isActive ? 'font-bold' : '')}>{label}</span>
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-fuchsia-300/60" />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="h-5 w-px bg-cyan-500/50 hidden sm:block" />
          
          {/* Save/Deploy/Settings — hidden on small screens */}
          <div className="hidden sm:flex items-center gap-1.5">
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
              className="h-7 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20 px-2.5 rounded-lg hover:shadow-[0_0_10px_rgba(255,255,0,0.3)] transition-all duration-200"
              title={currentTemplateName ? `Update "${currentTemplateName}"` : "Save to Projects"}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-bold">{currentTemplateName ? 'Update' : 'Save'}</span>
            </Button>
            <IntentHealthPill report={playgroundReadinessReport} />
            <DeployButton
              files={canonicalBuildArtifacts?.deployFiles || {}}
              defaultSiteName={currentTemplateName || 'unison-site'}
              contract={compiledContract}
              variant="ghost"
              size="sm"
              onDeployComplete={(url) => {
                toast.success('Site published!', {
                  description: `Live at ${url}`,
                  action: {
                    label: 'Open',
                    onClick: () => {
                      if (!safeOpenExternal(url, '_blank')) {
                        toast.error('Invalid deployment URL returned.');
                      }
                    },
                  },
                });
              }}
            />
          </div>
          
          {/* Right Panel Toggle + Playground — hidden on small screens */}
          <div className="hidden sm:flex items-center gap-2">
          <div className="h-5 w-px bg-fuchsia-500/50" />
          
          {/* Right Panel Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className={cn(
              "h-8 px-2 rounded-lg transition-all duration-200",
              !rightPanelCollapsed 
                ? "bg-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/30" 
                : "text-fuchsia-400/60 hover:text-fuchsia-400 hover:bg-fuchsia-500/10"
            )}
            title={rightPanelCollapsed ? "Show Properties Panel" : "Hide Properties Panel"}
          >
            <Settings className="h-4 w-4" />
          </Button>

          <div className="h-5 w-px bg-emerald-500/50" />

          {selectedPlaygroundBinding && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPlaygroundInitialSection("intent_registry");
                setPlaygroundInitialBindingId(selectedPlaygroundBinding.bindingId);
                setPlaygroundModalOpen(true);
              }}
              className="h-8 px-2.5 rounded-lg text-amber-300/80 hover:text-amber-300 hover:bg-amber-500/10 transition-all duration-200"
              title="Open selected intent in Creator's Playground"
            >
              <span className="text-[11px] truncate max-w-[140px]">
                {selectedPlaygroundBinding.coreIntent || selectedPlaygroundBinding.intent}
              </span>
            </Button>
          )}

          {/* Creator's Playground Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlaygroundInitialBindingId(undefined);
              setPlaygroundModalOpen(true);
            }}
            className="h-8 px-2.5 rounded-lg text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/15 hover:shadow-[0_0_10px_rgba(0,200,100,0.3)] transition-all duration-200"
            title="Open Creator's Playground"
          >
            <span className="text-sm">🕹️</span>
          </Button>
          </div>{/* end hidden sm:flex right panel+playground */}
        </div>
      </div>

      {/* Creator's Playground Modal */}
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
          livePreviewRuntime.regenerateRouterIntoVFS(creatorPlayground.pageRegistry, launchEntryPoint, (files) => liveVFSCommit.writeFiles(files, 'playground-edit', virtualFS.importFiles));

          
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
          livePreviewRuntime.syncRouterIntoVFS(
            creatorPlayground.pageRegistry,
            virtualFS.getSandpackFiles(),
            launchEntryPoint,
            (files) => liveVFSCommit.writeFiles(files, 'playground-edit', virtualFS.importFiles),
          );

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
            newFiles[vfsPath] = `import { Link } from 'react-router-dom';

export default function ${componentName}() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-4">Step ${idx + 1} · ${step.role}</div>
        <h1 className="text-4xl font-bold mb-6">${step.title}</h1>
        <p className="text-muted-foreground text-lg mb-8">This is the ${step.role} step of your funnel.</p>
        ${nextLink}
      </main>
    </div>
  );
}
`;
          });
          liveVFSCommit.writeFiles(newFiles, 'playground-edit', virtualFS.importFiles);
          toast.success(`Funnel scaffolded: ${stepPages.length} pages created in VFS`);
        }}
      />

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
                vfsContext={aiVFS.getContext().summary}
                vfsFiles={virtualFS.getSandpackFiles()}
                previewRef={livePreviewRef}
                projectId={projectId ?? null}
                businessId={businessId ?? null}
                layoutOps={layoutOpsForAI}
                onApplyToVFS={(files, applyMeta) => {
                  console.log('[WebBuilder] onApplyToVFS called with files:', Object.keys(files));
                  const beforeFiles = virtualFS.getSandpackFiles();
                  const result = aiVFS.applyCode(files);
                  console.log('[WebBuilder] aiVFS.applyCode result:', { success: result.success, filesWritten: result.filesWritten, errors: result.errors });
                   if (result.success) {
                     const mergedFiles = { ...virtualFS.getSandpackFiles(), ...files };
                     const syncedEntry = syncBuilderFromFiles(mergedFiles, activePagePath);
                     console.log('[WebBuilder] Entry file for preview:', syncedEntry?.entryPath || 'NOT FOUND');
                     setViewMode('canvas');
                     console.log('[WebBuilder] AI→VFS orchestrator applied:', result.filesWritten.length, 'files,',
                       Object.keys(result.dependencies.dependencies).length, 'deps');
                     // Re-hydrate Creator's Playground so newly-added /src/pages/*.tsx files
                     // register as page tabs / routes in the canonical PageRegistry.
                     setTimeout(() => {
                       try {
                         const latestFiles = virtualFS.getSandpackFiles();
                         const hyd = creatorPlayground.hydrateFromVFS(virtualFS.nodes, latestFiles);
                         console.log('[WebBuilder] Post-AI playground re-hydrated:', hyd.stats);
                         if (hyd.stats.pagesDetected > 1) {
                           toast.success('Routes synced', {
                             description: `${hyd.stats.pagesDetected} pages registered`,
                           });
                         }
                       } catch (e) {
                         console.warn('[WebBuilder] Post-AI hydration failed:', e);
                       }
                     }, 150);
                     // Capture an edit snapshot so users can revert/reapply.
                    const changedPaths = diffChangedPaths(beforeFiles, mergedFiles);
                    if (changedPaths.length > 0) {
                      const promptPreview = applyMeta?.prompt
                        ? applyMeta.prompt.length > 60 ? `${applyMeta.prompt.slice(0, 57)}…` : applyMeta.prompt
                        : `${changedPaths.length} file${changedPaths.length > 1 ? 's' : ''}`;
                      pushAISnapshot(projectId ?? null, {
                        label: `AI · ${promptPreview}`,
                        source: applyMeta?.origin === 'debug-fix' ? 'debug' : 'ai',
                        before: beforeFiles,
                        after: mergedFiles,
                        changedPaths,
                        meta: applyMeta,
                      });
                    }
                  } else {
                    console.error('[WebBuilder] aiVFS.applyCode failed:', result.errors);
                  }
                }}
                onViewEdits={(edits) => {
                  // Switch to code view and highlight the edited files
                  setViewMode('split');
                  toast.info('View Edits', {
                    description: `${edits.length} file(s) modified - check the file explorer`,
                  });
                }}
                onCodeGenerated={(code) => {
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
                  
                  importBuilderFiles(templateToVFSFiles(normalized.code, currentTemplateName || 'AI Generated'), {
                    preferredPath: activePagePath,
                    entryPoint: activePagePath,
                  });
                  console.log('[WebBuilder] VFS updated via importBuilderFiles');
                  
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
                  
                  if (files["/index.html"]) {
                    const normalized = normalizeTemplateForCtaContract({
                      code: files["/index.html"],
                      systemType: effectiveSystemType,
                    });
                    normalizedFiles["/index.html"] = normalized.code;
                    setTemplateCtaAnalysis(normalized.analysis);
                    console.log('[WebBuilder] Auto-wired intents in file patch:', normalized.analysis.intents);
                  }
                  
                  importBuilderFiles(normalizedFiles, {
                    preferredPath: activePagePath,
                    entryPoint: activePagePath,
                  });

                  setViewMode('canvas');
                  toast.success('Files updated', { description: 'Approved patch plan applied to project files' });
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
              ? "absolute left-0 top-0 bottom-0 w-[85vw] max-w-xs z-30"
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
                    liveVFSCommit.writeFiles(patchFiles, 'playground-edit', virtualFS.importFiles);
                    
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
                    <SystemHealthPanel
                      contract={compiledContract}
                      onPublishCheck={() => {
                        toast.info('Running publish checks...');
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* Left Panel Toggle — hidden on mobile (panels accessed via bottom nav) */}
        <div className="relative hidden sm:block">
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
              vfsContext={aiVFS.getContext().summary}
              vfsFiles={virtualFS.getSandpackFiles()}
              previewRef={livePreviewRef}
              projectId={projectId ?? null}
              businessId={businessId ?? null}
              layoutOps={layoutOpsForAI}
              onApplyToVFS={(files, applyMeta) => {
                const beforeFiles = virtualFS.getSandpackFiles();
                const result = aiVFS.applyCode(files);
                if (result.success) {
                  const mergedFiles = { ...virtualFS.getSandpackFiles(), ...files };
                  syncBuilderFromFiles(mergedFiles, activePagePath);
                  setViewMode('canvas');
                  setAiPanelOpen(false);
                  const changedPaths = diffChangedPaths(beforeFiles, mergedFiles);
                  if (changedPaths.length > 0) {
                    const promptPreview = applyMeta?.prompt
                      ? applyMeta.prompt.length > 60 ? `${applyMeta.prompt.slice(0, 57)}…` : applyMeta.prompt
                      : `${changedPaths.length} file${changedPaths.length > 1 ? 's' : ''}`;
                    pushAISnapshot(projectId ?? null, {
                      label: `AI · ${promptPreview}`,
                      source: applyMeta?.origin === 'debug-fix' ? 'debug' : 'ai',
                      before: beforeFiles,
                      after: mergedFiles,
                      changedPaths,
                      meta: applyMeta,
                    });
                  }
                }
              }}
              onViewEdits={() => { setViewMode('split'); setAiPanelOpen(false); }}
              onCodeGenerated={(code) => {
                importBuilderFiles(templateToVFSFiles(code, currentTemplateName || 'AI Template'), {
                  preferredPath: launchEntryPoint,
                  entryPoint: launchEntryPoint,
                });
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
                <div className="h-10 backdrop-blur-md bg-[hsl(0,0%,5%)]/95 border-b border-white/10 flex items-center justify-between px-2 sm:px-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full shadow-sm flex-shrink-0",
                      builderMode === 'select' ? "bg-emerald-400" : "bg-slate-500"
                    )} />
                    <span className="hidden sm:inline text-xs font-medium text-slate-300">
                      {builderMode === 'select' ? 'Select Mode' : 'Preview Mode'}
                    </span>
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-600">
                      <FileCode className="h-3 w-3" /> React Preview
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Undo/Redo/Refresh buttons */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleUndo}
                      disabled={!codeHistory.canUndo}
                      className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 rounded-md transition-all duration-200"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRedo}
                      disabled={!codeHistory.canRedo}
                      className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 rounded-md transition-all duration-200"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefreshPreview}
                      disabled={isRefreshing}
                      className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 rounded-md transition-all duration-200"
                      title="Refresh Preview (F5)"
                    >
                      <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        livePreviewRef.current?.openInNewTab();
                      }}
                      className="hidden sm:inline-flex h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200"
                      title="Open preview in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {builderMode === 'select' && (
                      <>
                        <span className="w-px h-4 bg-border mx-1 hidden sm:block" />
                        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Del</kbd>
                          <span>Delete</span>
                          <span className="mx-1">·</span>
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘D</kbd>
                          <span>Duplicate</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* Page tabs — synced with PageRegistry (Creator Playground + AI-generated pages) */}
                <PageNavigationBar
                  pages={pageTabs}
                  activePage={activePageTabId}
                  onSelectPage={handlePageTabSelect}
                  onAddPage={handlePageTabAdd}
                  onRemovePage={handlePageTabRemove}
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
                      activeFile={activePagePath}
                      className="w-full h-full min-h-0 flex-1"
                      showToolbar={false}
                      autoStart={true}
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
                  importFiles={(files) => liveVFSCommit.writeFiles(files, 'playground-edit', virtualFS.importFiles)}
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
                    liveVFSCommit.writeFiles(snap.files, 'system-restore', virtualFS.importFiles);
                    return true;
                  }}
                  onRedo={() => {
                    const snap = vfsSnapshotManager.redo();
                    if (!snap) return false;
                    liveVFSCommit.writeFiles(snap.files, 'system-restore', virtualFS.importFiles);
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
                  <div className="h-10 backdrop-blur-md bg-gradient-to-r from-slate-100/95 to-slate-50/95 border-b border-slate-200/50 flex items-center justify-between px-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">Live Preview</span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-600">
                        <FileCode className="h-3 w-3" /> React Preview
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleUndo}
                        disabled={!codeHistory.canUndo}
                        className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 disabled:opacity-40 rounded-md transition-all duration-200"
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRedo}
                        disabled={!codeHistory.canRedo}
                        className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 disabled:opacity-40 rounded-md transition-all duration-200"
                        title="Redo (Ctrl+Y)"
                      >
                        <Redo2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefreshPreview}
                        disabled={isRefreshing}
                        className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 disabled:opacity-40 rounded-md transition-all duration-200"
                        title="Refresh Preview (F5)"
                      >
                        <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          livePreviewRef.current?.openInNewTab();
                        }}
                        className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-md transition-all duration-200"
                        title="Open preview in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Page tabs — synced with PageRegistry (Creator Playground + AI-generated pages) */}
                  <PageNavigationBar
                    pages={pageTabs}
                    activePage={activePageTabId}
                    onSelectPage={handlePageTabSelect}
                    onAddPage={handlePageTabAdd}
                    onRemovePage={handlePageTabRemove}
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
                        activeFile={activePagePath}
                        className="w-full h-full min-h-0 flex-1"
                        showToolbar={false}
                        autoStart={true}
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
        <div className="relative hidden sm:block">
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
              ? "absolute right-0 top-0 bottom-0 w-[85vw] max-w-xs z-30"
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
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[96vw]">
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
              readiness={selectedElementReadiness}
              onAIEditComplete={async (selector, newHtml) => {
                // 1. Try the active page first.
                const primary = applyElementHtmlUpdate(previewCode, selector, newHtml);
                if (primary.ok) {
                  try {
                    pushAISnapshot(projectId ?? null, {
                      label: `AI · element edit ${selector.slice(0, 40)}`,
                      source: 'ai',
                      before: { [activePagePath]: previewCode },
                      after: { [activePagePath]: primary.code },
                      changedPaths: [activePagePath],
                      meta: { origin: 'floating-toolbar-ai', actionType: 'element-edit' },
                    });
                  } catch (err) { console.warn('[onAIEditComplete] snapshot failed:', err); }
                  importBuilderFiles(templateToVFSFiles(primary.code, currentTemplateName || 'Element Edit'), {
                    preferredPath: activePagePath,
                    entryPoint: activePagePath,
                  });
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
                        pushAISnapshot(projectId ?? null, {
                          label: `AI · element edit in ${path.split('/').pop()}`,
                          source: 'ai',
                          before: { [path]: code },
                          after: { [path]: attempt.code },
                          changedPaths: [path],
                          meta: { origin: 'floating-toolbar-ai', actionType: 'element-edit' },
                        });
                      } catch (err) { console.warn('[onAIEditComplete] snapshot failed:', err); }
                      liveVFSCommit.writeFiles({ [path]: attempt.code }, 'ai-builder', virtualFS.importFiles);
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
                "fixed top-20 right-4 z-50 px-3 py-1.5 rounded-md border text-xs font-medium transition-all",
                inspectorOpen
                  ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                  : "bg-[#0d0d18] text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/10"
              )}
              title="Element Intent Inspector"
            >
              ⚡ Intent {inspectorOpen ? '▾' : '▸'}
            </button>
            {inspectorOpen && (
              <div className="fixed top-32 right-4 z-50">
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
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Mobile Bottom Navigation Bar — fixed at bottom, only visible on small screens */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 h-14 bg-[#0a0a14] border-t-2 border-fuchsia-500/50 flex items-center justify-around px-2 shadow-[0_-4px_20px_rgba(255,0,255,0.15)]">
        {/* AI */}
        <button
          onClick={() => {
            const next = !aiPanelOpen;
            setAiPanelOpen(next);
            if (next) { setLeftPanelCollapsed(true); setRightPanelCollapsed(true); }
          }}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-all duration-200 flex-1",
            aiPanelOpen ? "text-lime-400 bg-lime-500/20" : "text-white/40 hover:text-white/70"
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
            "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-all duration-200 flex-1",
            !leftPanelCollapsed ? "text-cyan-400 bg-cyan-500/20" : "text-white/40 hover:text-white/70"
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
            "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-all duration-200 flex-1",
            viewMode === 'canvas' && leftPanelCollapsed && !aiPanelOpen && rightPanelCollapsed
              ? "text-fuchsia-400 bg-fuchsia-500/20"
              : "text-white/40 hover:text-white/70"
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
            "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-all duration-200 flex-1",
            !rightPanelCollapsed ? "text-fuchsia-400 bg-fuchsia-500/20" : "text-white/40 hover:text-white/70"
          )}
        >
          <Settings className="h-4 w-4" />
          <span className="text-[10px] font-medium">Props</span>
        </button>
      </div>

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
      <CodePreviewDialog
        isOpen={codePreviewOpen}
        onClose={() => setCodePreviewOpen(false)}
        fabricCanvas={fabricCanvas}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        html={exportHtml}
        css={exportCss}
        js={exportJs}
        projectName={exportProjectName}
      />

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
          <PerformancePanel 
            fabricCanvas={fabricCanvas}
            onAutoFix={() => {
              console.log('[WebBuilder] Auto-fix applied');
            }}
          />
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
          <IntegrationsPanel 
            onExport={handleExport}
            onIntegrationConnect={(integration, config) => {
              console.log('Integration connected:', integration, config);
            }}
          />
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
              {templateFiles.currentTemplateId ? 'Update Template' : 'Save to Projects'}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              {templateFiles.currentTemplateId 
                ? `Updating "${currentTemplateName}" - or save as a new template`
                : 'Save your current template design to access it later'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-3">
            {templateFiles.currentTemplateId && (
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
            {templateFiles.currentTemplateId && (
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
              {templateFiles.currentTemplateId ? 'Update' : 'Save'}
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
    </div>
    </BuilderSessionProvider>
  );
};
