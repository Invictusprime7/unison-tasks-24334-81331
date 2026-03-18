/* cache-bust: 20260309 */
import { useEffect, useRef, useState, useCallback, useMemo, Component, type ReactNode, type ErrorInfo } from "react";
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
  FolderOpen, Cloud, CloudOff, Server, Layers, Settings, ExternalLink, GitBranch
} from "lucide-react";
import { CloudPanel } from "./web-builder/CloudPanel";
import { CreatorPlaygroundModal } from "./web-builder/CreatorPlaygroundModal";
import { useCreatorPlayground } from "@/hooks/useCreatorPlayground";
import { toast } from "sonner";
import VFSMonacoEditor from './code-editor/VFSMonacoEditor';
import { VFSCodeView } from './code-editor/VFSCodeView';
import { SimplePreview, type SimplePreviewHandle } from '@/components/SimplePreview';
import { VFSPreview, type VFSPreviewHandle } from '../VFSPreview';
import { DeployButton } from '@/components/DeployButton';
import { LiveHTMLPreview, type LiveHTMLPreviewHandle } from './LiveHTMLPreview';
import { CollapsiblePropertiesPanel } from "./web-builder/CollapsiblePropertiesPanel";
import { CanvasDragDropService } from "@/services/canvasDragDropService";
import { CodePreviewDialog } from "./web-builder/CodePreviewDialog";
import { AIBuilderPanel, type VFSEdit, type IframeError } from "./web-builder/AIBuilderPanel";
import { IntegrationsPanel } from "./design-studio/IntegrationsPanel";
import { ExportDialog } from "./design-studio/ExportDialog";
import { PerformancePanel } from "./web-builder/PerformancePanel";
import { DirectEditToolbar } from "./web-builder/DirectEditToolbar";
import { ArrangementTools } from "./web-builder/ArrangementTools";
import { SecureIframePreview } from "@/components/SecureIframePreview";
import { useTemplateState } from "@/hooks/useTemplateState";
import { sanitizeHTML } from "@/utils/htmlSanitizer";
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
import { useVirtualFileSystem, VirtualFile } from "@/hooks/useVirtualFileSystem";
import { FileExplorer } from "./code-editor/FileExplorer";
import { ModernFileExplorer } from "./code-editor/ModernFileExplorer";
import { EditorTabs } from "./code-editor/EditorTabs";
import { ModernEditorTabs } from "./code-editor/ModernEditorTabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { templateToVFSFiles, elementToVFSPatch } from "@/utils/templateToVFS";
import { htmlToJsx } from "@/utils/htmlToJsx";
import { setDefaultBusinessId, setCurrentSystemType, setDemoMode, handleIntent, IntentPayload } from "@/runtime/intentRouter";
import { buildRedirectPageContext } from "@/utils/redirectPageGenerator";
import { scaffoldMultiPageVFS } from "@/utils/multiPageScaffolder";
import { classifyLabel, type ElementContext } from "@/utils/redirectLabelClassifier";
import { IntentPipelineOverlay, type PipelineConfig } from "./web-builder/IntentPipelineOverlay";
import { DemoIntentOverlay, type DemoIntentOverlayConfig } from "./web-builder/DemoIntentOverlay";
import { ResearchOverlay, type ResearchOverlayPayload } from "./web-builder/ResearchOverlay";
import { decideIntentUx } from "@/runtime/intentUx";
import SystemHealthPanel from "@/components/web-builder/SystemHealthPanel";
import type { BusinessSystemType } from "@/data/templates/types";
import { normalizeTemplateForCtaContract, type TemplateCtaAnalysis } from "@/utils/ctaContract";
import { supabase } from "@/integrations/supabase/client";
import { buildPageStructureContext } from "@/utils/pageStructureContext";
import { extractCleanCode, looksLikeCode, ensureReactImports } from "@/utils/aiCodeCleaner";
import { AIActivityPanel } from "@/components/ai-agent/AIActivityPanel";
import { useAIActivityMonitor } from "@/hooks/useAIActivityMonitor";
import { useTemplateCustomizer } from "@/hooks/useTemplateCustomizer";
import { TemplateCustomizerPanel } from "./web-builder/TemplateCustomizerPanel";
import { getVariantById, extractSectionContentFromJSX, findSectionBounds } from '@/sections/variants';
import { swapSectionVariant } from '@/utils/sectionSwapper';
import type { VariantId } from '@/sections/variants/types';
import { ElementFloatingToolbar } from "./web-builder/ElementFloatingToolbar";
import { SEOSettingsPanel } from "./web-builder/SEOSettingsPanel";
import { usePageSEO } from "@/hooks/usePageSEO";
import { generateUUID } from "@/utils/uuid";
import { extractPageTabs, type PageTab } from "./web-builder/PageNavigationBar";
import { useUserDesignProfile } from "@/hooks/useUserDesignProfile";
import { BusinessSetupSuggestions } from "@/components/onboarding/BusinessSetupSuggestions";
import type { SystemsBuildContext } from "@/types/systemsBuildContext";
import { useSiteBuilder, type UseSiteBuilderReturn } from "@/hooks/useSiteBuilder";
import { useAIVFS } from '@/hooks/useAIVFS';
import { getTemplateReactCodeWithCSS } from '@/data/templates/utils';
import { extractEmbeddedCSS } from '@/utils/templateToVFS';
import { vfsSnapshotManager } from '@/services/vfsSnapshotManager';

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

/**
 * Escape special characters in CSS selectors (e.g., Tailwind brackets like `min-h-[85vh]`)
 */
function escapeCSSSelector(selector: string): string {
  return selector.replace(/(\.)([^.\s#>+~:[\]]+)/g, (match, dot, className) => {
    const escaped = className
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/:/g, '\\:')
      .replace(/\//g, '\\/');
    return dot + escaped;
  });
}

/**
 * Extract the JSX return body from a React component.
 * Handles both `return (...)` and arrow `=> (...)` patterns.
 */
function extractJsxReturnBody(code: string): { jsx: string; before: string; after: string } | null {
  let returnIdx = code.search(/return\s*\(/);
  if (returnIdx === -1) {
    returnIdx = code.search(/=>\s*\(/);
  }
  if (returnIdx === -1) return null;

  const parenStart = code.indexOf('(', returnIdx);
  let depth = 0;
  let parenEnd = -1;
  let inString: string | null = null;
  let escaped = false;
  for (let i = parenStart; i < code.length; i++) {
    const ch = code[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) { parenEnd = i; break; }
    }
  }
  if (parenEnd === -1) return null;

  const jsx = code.slice(parenStart + 1, parenEnd).trim();
  const before = code.slice(0, parenStart + 1);
  const after = code.slice(parenEnd);
  return { jsx, before, after };
}

/**
 * Find an element's start and end offsets in a JSX source string by a CSS-like selector.
 * Supports: tag, #id, tag:nth-of-type(n), and nested selectors with >.
 * Returns the character offsets in the source, or null if not found.
 */
function findElementBoundsInJSX(
  source: string,
  selector: string
): { start: number; end: number } | null {
  // Parse the selector into segments: "body > section:nth-of-type(2) > div > h1" 
  // → [{tag: 'section', index: 1}, {tag: 'div', index: 0}, {tag: 'h1', index: 0}]
  const parts = selector
    .split(/\s*>\s*/)
    .map(s => s.trim())
    .filter(s => s && s !== 'body' && s !== 'html');

  if (parts.length === 0) return null;

  let searchSource = source;
  let baseOffset = 0;

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    const isLast = pi === parts.length - 1;

    // Parse the part: tag, tag:nth-of-type(n), #id, tag.class
    let tagName = '';
    let nthIndex = 0; // 0-based
    let id = '';

    const idMatch = part.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      id = idMatch[1];
      tagName = part.split('#')[0] || '';
    }

    const nthMatch = part.match(/:nth-of-type\((\d+)\)/);
    if (nthMatch) {
      nthIndex = parseInt(nthMatch[1], 10) - 1; // Convert 1-based to 0-based
      tagName = part.split(':')[0] || '';
    }

    if (!tagName && !id) {
      // Plain tag or tag.class
      tagName = part.split('.')[0].split(':')[0].split('[')[0];
    }

    if (!tagName && !id) return null;

    // Find the element
    if (id) {
      // Find by id attribute
      const idPattern = new RegExp(`<(\\w+)\\b[^>]*\\bid=["'{]${id}["'}][^>]*>`, 'i');
      const idFound = idPattern.exec(searchSource);
      if (!idFound) return null;
      const foundTag = idFound[1];
      const start = baseOffset + idFound.index;
      const end = findJSXClosingTag(source, start, foundTag);
      if (end === -1) return null;
      if (isLast) return { start, end };
      // Narrow search to inside this element
      searchSource = source.substring(start + idFound[0].length, end);
      baseOffset = start + idFound[0].length;
    } else {
      // Find by tag name and nth-of-type index
      const tagPattern = new RegExp(`<${tagName}\\b`, 'gi');
      let match: RegExpExecArray | null;
      let count = 0;
      let found = false;

      while ((match = tagPattern.exec(searchSource)) !== null) {
        if (count === nthIndex) {
          const start = baseOffset + match.index;
          const end = findJSXClosingTag(source, start, tagName);
          if (end === -1) return null;
          if (isLast) return { start, end };
          // Narrow search to inside this element
          const openEnd = source.indexOf('>', start) + 1;
          searchSource = source.substring(openEnd, end);
          baseOffset = openEnd;
          found = true;
          break;
        }
        count++;
      }
      if (!found) return null;
    }
  }

  return null;
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
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose, ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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

export const WebBuilder = ({ initialHtml, initialCss, onSave }: WebBuilderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricCanvas['_objects'][0] | null>(null);
  const [activeMode, setActiveMode] = useState<"insert" | "layout" | "text" | "vector">("insert");
  const [builderMode, setBuilderMode] = useState<SimpleBuilderMode>('select');
  const [editActivationKey, setEditActivationKey] = useState(0);
  const [useReactPreview, setUseReactPreview] = useState(true); // React/VFS preview mode (Docker + HTML blob fallback)
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
    ((location.state as { designPreset?: string })?.designPreset as string) ||
      ((location.state as { aesthetic?: string })?.aesthetic as string) ||
      null
  );
  const [currentTemplateCategory, setCurrentTemplateCategory] = useState<string | null>(
    ((location.state as { templateCategory?: string })?.templateCategory as string) || null
  );
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [currentManifestId, setCurrentManifestId] = useState<string | null>(
    ((location.state as { manifestId?: string })?.manifestId as string) || null
  );
  const [isSavingProject, setIsSavingProject] = useState(false);
  const creatorPlayground = useCreatorPlayground();
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [playgroundModalOpen, setPlaygroundModalOpen] = useState(false);
  const [playgroundInitialSection, setPlaygroundInitialSection] = useState<"launch" | undefined>(undefined);
  const [aiPanelOpen, setAiPanelOpen] = useState(true); // AI panel open by default for easy access
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
  const [viewMode, setViewMode] = useState<'canvas' | 'code' | 'split'>('canvas');
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
  const [selectedHTMLElement, setSelectedHTMLElement] = useState<SelectedElement | null>(null);
  const livePreviewRef = useRef<VFSPreviewHandle | null>(null);
  const liveHtmlPreviewRef = useRef<LiveHTMLPreviewHandle | null>(null);
  const simplePreviewRef = useRef<SimplePreviewHandle | null>(null);

  // Template Customizer - full DOM control
  const templateCustomizer = useTemplateCustomizer();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  // AI edit request state — only true when user clicks AI button in floating toolbar

  
  // Business Setup Suggestions - shown after AI generates a site/template
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);

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

    // Try both preview refs — VFSPreview (primary) or SimplePreview (fallback)
    const vfsIframe = livePreviewRef.current?.getIframe?.();
    const simpleIframe = simplePreviewRef.current?.getIframe();
    const iframe = vfsIframe || simpleIframe;
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
  }, []);

  // Handle element-level edits from floating toolbar
  const handleFloatingStyleUpdate = useCallback((selector: string, styles: Record<string, string>) => {
    console.log('[WebBuilder] handleFloatingStyleUpdate called:', selector, styles);
    templateCustomizer.setElementOverride(selector, { styles });
    // Don't call applyCustomizerOverrides synchronously — setElementOverride
    // increments overrideVersion which triggers the reactive useEffect
  }, [templateCustomizer]);

  const handleFloatingTextUpdate = useCallback((selector: string, text: string) => {
    console.log('[WebBuilder] handleFloatingTextUpdate called:', selector, text);
    templateCustomizer.setElementOverride(selector, { textContent: text });
  }, [templateCustomizer]);

  const handleFloatingImageReplace = useCallback((selector: string, src: string) => {
    console.log('[WebBuilder] handleFloatingImageReplace called:', selector, src.substring(0, 50));
    templateCustomizer.setElementOverride(selector, { imageSrc: src });
  }, [templateCustomizer]);


  const applyElementHtmlUpdate = useCallback((code: string, selector: string, newJsx: string) => {
    return withSourceManipulation(code, (jsx) => {
      const bounds = findElementBoundsInJSX(jsx, selector);
      if (!bounds) {
        console.warn('[applyElementHtmlUpdate] No match for selector:', selector);
        return null;
      }
      return jsx.substring(0, bounds.start) + newJsx + jsx.substring(bounds.end);
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
    setEditorCode(res.code);
    setPreviewCode(res.code);
    setSelectedHTMLElement(null);
    toast.success('Element deleted');
  }, [previewCode, applyElementDelete]);

  // Handle duplicate from floating toolbar - updates source code
  const handleFloatingDuplicate = useCallback((selector: string) => {
    const res = applyElementDuplicate(previewCode, selector);
    if (!res.ok) {
      toast.error('Could not duplicate element. Try selecting a different element.');
      return;
    }
    setEditorCode(res.code);
    setPreviewCode(res.code);
    toast.success('Element duplicated');
  }, [previewCode, applyElementDuplicate]);

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
    setEditorCode(res.code);
    setPreviewCode(res.code);
    setSelectedHTMLElement(null);
    toast.success('Moved up');
  }, [previewCode]);

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
    setEditorCode(res.code);
    setPreviewCode(res.code);
    setSelectedHTMLElement(null);
    toast.success('Moved down');
  }, [previewCode]);

  // Template file management
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const templateFiles = useTemplateFiles();
  
  // Load template from URL parameter on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const templateId = searchParams.get('id');
    
    if (templateId) {
      const loadTemplateFromUrl = async () => {
        const template = await templateFiles.loadTemplate(templateId);
        if (template) {
          const canvasData = template.canvas_data as { html?: string; css?: string; previewCode?: string; js?: string };
          let code = canvasData?.previewCode || canvasData?.html || '';
          
          if (code) {
            // If there's separate CSS, integrate it
            const separateCss = canvasData?.css || '';
            if (separateCss && !code.includes(separateCss.substring(0, 50))) {
              if (code.includes('</head>')) {
                code = code.replace('</head>', `<style>\n${separateCss}\n</style>\n</head>`);
              } else {
                code = `<style>\n${separateCss}\n</style>\n${code}`;
              }
            }
            
            // If there's separate JS, integrate it
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
            setSaveProjectDescription(template.description || '');
          }
        }
      };
      
      loadTemplateFromUrl();
    }
  }, [location.search]);

  // Get full cloud context from location state (from CloudProjects or System Launcher)
  const projectId = (location.state as { projectId?: string })?.projectId;
  const systemType = (location.state as { systemType?: string })?.systemType;
  const systemName = (location.state as { systemName?: string })?.systemName;
  const businessId = (location.state as { businessId?: string })?.businessId;
  const manifestIdFromState = (location.state as { manifestId?: string })?.manifestId;
  const projectSlug = (location.state as { projectSlug?: string })?.projectSlug;
  const projectNameFromState = (location.state as { projectName?: string })?.projectName;
  const publishStatusFromState = (location.state as { publishStatus?: string })?.publishStatus;
  const customDomainFromState = (location.state as { customDomain?: string })?.customDomain;
  // Business blueprint context forwarded from SystemsAIPanel for context-aware in-builder AI
  const systemsBuildContextFromState = (location.state as { systemsBuildContext?: SystemsBuildContext })?.systemsBuildContext ?? null;
  
  // Virtual file system for code editor
  const virtualFS = useVirtualFileSystem();
  // Destructure stable callbacks for use in dependency arrays (avoids re-render loops)
  const {
    nodes: vfsNodes,
    getSandpackFiles,
    importFiles: vfsImportFiles,
    updateFileContent: vfsUpdateFileContent,
    resetToEmpty: vfsResetToEmpty,
    loadDefaultTemplate: vfsLoadDefaultTemplate,
  } = virtualFS;
  
  // AI → VFS orchestrator — auto-resolves dependencies and syncs to preview
  const aiVFS = useAIVFS(virtualFS, simplePreviewRef);
  
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
  
  // Multi-page navigation state
  const [activePagePath, setActivePagePath] = useState<string>('/src/App.tsx');
  
  // Derive page tabs from VFS
  const pageTabs = useMemo(() => {
    const vfsFiles = virtualFS.getSandpackFiles();
    return extractPageTabs(vfsFiles);
  }, [virtualFS.nodes]);
  
  // Dynamic page keys for SEO panel (derived from VFS)
  const vfsPageKeys = useMemo(() => {
    if (pageTabs.length <= 1) return ["home"];
    return pageTabs.map(p => 
      p.isMain ? "home" : p.path.replace(/^\//, '').replace(/\.html$/, '')
    );
  }, [pageTabs]);
  
  // Page manifest for async multi-page navigation (all HTML pages from VFS)
  const pageManifest = useMemo(() => {
    const vfsFiles = virtualFS.getSandpackFiles();
    const manifest: Record<string, string> = {};
    Object.entries(vfsFiles).forEach(([path, content]) => {
      if (path.endsWith('.tsx') && (path.includes('/pages/') || path === '/src/App.tsx')) {
        manifest[path] = content;
      }
    });
    return manifest;
  }, [virtualFS.nodes]);
  
  // Sync page manifest to preview iframe when VFS changes
  // This enables instant in-place navigation (no new tabs)
  useEffect(() => {
    const pageCount = Object.keys(pageManifest).length;
    if (pageCount >= 1) {
      // Sync all HTML pages to iframe cache (with small delay to ensure iframe is ready)
      const timeoutId = setTimeout(() => {
        console.log('[WebBuilder] Syncing page manifest:', pageCount, 'pages');
        simplePreviewRef.current?.syncPageManifest(pageManifest);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [pageManifest]);

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
        const idx = sectionInfo.order ?? parseInt(sectionId.replace(/^\D+-/, ''), 10);
        if (isNaN(idx)) continue;

        // Find section boundaries in the JSX source
        const bounds = findSectionBounds(source, tagName, idx);
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
  
  // Re-sync manifest when preview code changes (iframe reloads)
  useEffect(() => {
    if (Object.keys(pageManifest).length >= 1 && previewCode) {
      // Delay to let iframe finish loading the new content
      const timeoutId = setTimeout(() => {
        simplePreviewRef.current?.syncPageManifest(pageManifest);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [previewCode, pageManifest]);
  
  // Handle page switching in multi-page preview
  const handleSelectPage = useCallback((path: string) => {
    setActivePagePath(path);
    const vfsFiles = getSandpackFiles();
    const pageContent = vfsFiles[path];
    if (pageContent) {
      lastSyncedCodeRef.current = pageContent;
      setPreviewCode(pageContent);
      setEditorCode(pageContent);
    }
  }, [getSandpackFiles]);
  
  // Handle adding a new page
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
    vfsImportFiles({ [path]: newPageCode });
    setActivePagePath(path);
    lastSyncedCodeRef.current = newPageCode;
    setPreviewCode(newPageCode);
    setEditorCode(newPageCode);
    toast.success(`Page "${label}" created`);
  }, [getSandpackFiles, vfsImportFiles, previewCode]);
  
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
      handleSelectPage('/src/App.tsx');
    }
    toast.success('Page removed');
  }, [getSandpackFiles, vfsImportFiles, activePagePath, handleSelectPage]);
  
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
  
  // Effect A: previewCode → VFS  (one-way sync, runs when AI/templates/page-nav set previewCode)
  useEffect(() => {
    // Sync if previewCode has content and actually changed since last sync
    if (previewCode && previewCode !== lastSyncedCodeRef.current) {
      console.log('[WebBuilder] Effect A: Syncing previewCode to VFS, length:', previewCode.length);
      // All code is TSX — import directly to VFS as the active page file
      const targetPath = activePagePath.endsWith('.tsx') ? activePagePath : '/src/App.tsx';
      virtualFSRef.current.importFiles({
        [targetPath]: previewCode,
      });
      lastSyncedCodeRef.current = previewCode;
    }
  }, [previewCode, activePagePath]);
  
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
  const AUTO_SAVE_KEY = 'webbuilder_autosave_draft';
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
          const { data } = await supabase
            .from('projects')
            .select('id, name, slug, publish_status, custom_domain, settings')
            .eq('id', projectId)
            .maybeSingle() as { data: typeof projectData };
          projectData = data;
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
  
  const referrerPageName = systemName || 
    (location.state as { from?: string })?.from || 
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
  
  
  // Track changes to code
  useEffect(() => {
    const hasChanges = previewCode !== initialCodeRef.current && 
                      !previewCode.includes('AI-generated code will appear here');
    setHasUnsavedChanges(hasChanges);
  }, [previewCode]);
  
  // Auto-save draft to localStorage
  const saveDraft = useCallback(() => {
    if (previewCode && previewCode !== lastSavedCodeRef.current) {
      setAutoSaveStatus('saving');
      try {
        const draft = {
          code: previewCode,
          editorCode: editorCode,
          savedAt: new Date().toISOString(),
          templateId: templateFiles.currentTemplateId || null,
        };
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
        lastSavedCodeRef.current = previewCode;
        setLastSavedAt(new Date());
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('[AutoSave] Error saving draft:', error);
        setAutoSaveStatus('idle');
      }
    }
  }, [previewCode, editorCode, templateFiles.currentTemplateId]);
  
  // Handle back navigation - go to home/launcher
  const handleBackNavigation = useCallback(() => {
    const codeChanged = previewCode !== initialCodeRef.current;
    
    if (codeChanged && hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? Your draft will be auto-saved.'
      );
      if (confirmLeave) {
        saveDraft();
        navigate('/home');
      }
    } else {
      navigate('/home');
    }
  }, [previewCode, hasUnsavedChanges, navigate, saveDraft]);

  useEffect(() => {
    autoSaveTimerRef.current = setInterval(saveDraft, AUTO_SAVE_INTERVAL);
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [saveDraft]);
  
  // Restore draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(AUTO_SAVE_KEY);
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
                  localStorage.removeItem(AUTO_SAVE_KEY);
                  setPreviewCode('<!-- AI-generated code will appear here -->\n<div style="padding: 40px; text-align: center;">\n  <h1>Welcome to AI Web Builder</h1>\n  <p>Use the AI Code Assistant to generate components</p>\n</div>');
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
        const targetPath = pagePath || `/${pageName}.html`;
        // Update active page path and editor code WITHOUT touching previewCode
        // Touching previewCode triggers iframe re-render which destroys the in-iframe navigation
        const vfsFiles = virtualFS.getSandpackFiles();
        const pageContent = vfsFiles[targetPath];
        if (pageContent) {
          setActivePagePath(targetPath);
          lastSyncedCodeRef.current = pageContent;
          setEditorCode(pageContent);
        }
        // Re-sync manifest to iframe so all pages are available for back-navigation
        setTimeout(() => {
          simplePreviewRef.current?.syncPageManifest(pageManifest);
        }, 300);
        return;
      }
      
      // Handle in-place page navigation: iframe sends raw HTML, we process it
      // through codeToHtml (which injects intent wiring) and reload the iframe
      if (event.data?.type === 'NAV_PAGE_REPLACE') {
        const { pagePath, pageName, pageContent, cacheScript } = event.data;
        console.log('[WebBuilder] NAV_PAGE_REPLACE:', pagePath, pageName);
        const targetPath = pagePath || `/${pageName}.html`;
        const rawContent = pageContent || '';
        
        // Inject cache restoration script into <head> so it runs before the intent listener IIFE
        let previewContent = rawContent;
        if (cacheScript) {
          const cacheTag = `<script id="page-cache-restore">${cacheScript}</script>`;
          if (previewContent.includes('</head>')) {
            previewContent = previewContent.replace('</head>', `${cacheTag}\n</head>`);
          } else if (previewContent.toLowerCase().includes('<body')) {
            previewContent = previewContent.replace(/<body/i, `${cacheTag}\n<body`);
          } else {
            previewContent = cacheTag + '\n' + previewContent;
          }
        }
        
        // Update preview code — this triggers codeToHtml which injects intent wiring
        setActivePagePath(targetPath);
        lastSyncedCodeRef.current = previewContent;
        setPreviewCode(previewContent);
        setEditorCode(rawContent); // Editor shows clean HTML without cache scripts
        
        // Re-sync manifest after iframe reloads
        setTimeout(() => {
          simplePreviewRef.current?.syncPageManifest(pageManifest);
        }, 600);
        return;
      }
      
      // Handle manifest request from iframe after in-place page navigation
      if (event.data?.type === 'REQUEST_PAGE_MANIFEST') {
        console.log('[WebBuilder] Iframe requested page manifest re-sync');
        setTimeout(() => {
          simplePreviewRef.current?.syncPageManifest(pageManifest);
        }, 50);
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
          // Page exists in VFS - open in editor
          setActivePagePath(vfsPath);
          lastSyncedCodeRef.current = existingPage;
          setEditorCode(existingPage);
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

      // Never open overlays for preview click actions (these are disruptive in the builder).
      // Instead: autorun, open demo in a new tab, or ask the iframe to scroll to an on-page form.
      // Close overlays proactively (we don't want them for preview click actions).
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
      
      // Classify the label to decide behavior
      const classification = classifyLabel(buttonLabel, elementCtx);
      console.log('[WebBuilder] Label classification:', buttonLabel, classification);

      // ── Navigation intents: handle directly without hitting handleIntent ──
      if (intent === 'nav.goto') {
        const path = (payload as any)?.path;
        if (path && path.startsWith('#')) {
          // Anchor scroll - already handled in iframe
          sendResultToIframe({ success: true });
          return;
        }
        
        if (path) {
          // Page navigation within multi-page React VFS
          const pageName = path.replace(/^\//, '').replace(/\.html$/, '').replace(/[^a-zA-Z0-9-]/g, '-') || 'page';
          const componentName = pageName.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
          const vfsPath = `/src/pages/${componentName}.tsx`;
          const vfsFiles = virtualFS.getSandpackFiles();
          const existingPage = vfsFiles[vfsPath];
          
          if (existingPage) {
            // Page exists in VFS — navigate via React Router
            setActivePagePath(vfsPath);
            if (source && requestId) {
              source.postMessage({ type: 'NAV_ROUTE', requestId, route: `/${pageName}` }, '*');
            }
            toast(`Navigated to ${buttonLabel || path}`);
            sendResultToIframe({ success: true });
          } else {
            // Page doesn't exist in VFS → generate it with AI
            console.log('[WebBuilder] React page not in VFS, generating:', pageName, buttonLabel);
            const targetName = classification.suggestedPageType || pageName || 'details';
            triggerPageGenRef.current(targetName, buttonLabel || targetName, source, requestId);
          }
        }
        return;
      }

      if (intent === 'nav.external') {
        // Treat external links as in-page navigation — generate a React page for it
        const url = (payload as any)?.url || (payload as any)?.path || '';
        const pageName = url.replace(/^https?:\/\/[^/]+\/?/, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'external';
        const label = buttonLabel || url || 'External Page';
        triggerPageGenRef.current(pageName, label, source, requestId);
        return;
      }

      if (intent === 'button.click') {
        // Check if this button label warrants page generation
        if (classification.category === 'redirect') {
          const pageName = classification.suggestedPageType || 'details';
          console.log('[WebBuilder] Redirect-worthy button.click, generating:', pageName, buttonLabel);
          triggerPageGenRef.current(pageName, buttonLabel, source, requestId);
          return;
        }
        // Generic button click - just acknowledge, no overlay needed
        toast(`${buttonLabel || 'Button'} clicked`);
        sendResultToIframe({ success: true });
        return;
      }
      
      // Check for redirect-worthy intents that aren't nav.goto/button.click
      if (classification.category === 'redirect' && !['booking.create', 'contact.submit', 'newsletter.subscribe', 'quote.request', 'lead.capture'].includes(intent)) {
        const pageName = classification.suggestedPageType || 'details';
        const componentName = pageName.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
        const vfsPath = `/src/pages/${componentName}.tsx`;
        const vfsFilesForCheck = virtualFS.getSandpackFiles();
        const existingPage = vfsFilesForCheck[vfsPath];
        if (!existingPage) {
          console.log('[WebBuilder] Redirect-worthy intent, generating React page:', pageName, buttonLabel);
          triggerPageGenRef.current(pageName, buttonLabel, source, requestId);
          return;
        }
        // Page exists in VFS, navigate via React Router
        if (source && requestId) {
          source.postMessage({ type: 'NAV_ROUTE', requestId, route: `/${pageName}` }, '*');
        }
        setActivePagePath(vfsPath);
        toast(`Navigated to ${buttonLabel || pageName}`);
        sendResultToIframe({ success: true });
        return;
      }

      const decision = decideIntentUx(intent, payload as Record<string, unknown> | undefined);

      // Booking: always prefer scrolling within the preview iframe.
      if (intent === 'booking.create') {
        void (async () => {
          if (!source) {
            toast('Scroll to booking form');
            return;
          }

          const scrollRequestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

          const handled = await new Promise<boolean>((resolve) => {
            const timeout = window.setTimeout(() => {
              window.removeEventListener('message', onResult);
              console.log('[WebBuilder] Booking scroll command timed out');
              resolve(false);
            }, 1000); // Increased timeout for slower templates

            const onResult = (evt: MessageEvent) => {
              if (evt.data?.type !== 'INTENT_COMMAND_RESULT') return;
              if (evt.data?.command !== 'booking.scroll') return;
              if (evt.data?.requestId !== scrollRequestId) return;
              window.clearTimeout(timeout);
              window.removeEventListener('message', onResult);
              console.log('[WebBuilder] Booking scroll result:', evt.data?.handled);
              resolve(!!evt.data?.handled);
            };

            window.addEventListener('message', onResult);
            source.postMessage({ type: 'INTENT_COMMAND', command: 'booking.scroll', requestId: scrollRequestId }, '*');
          });

          if (handled) {
            // Form was found and scrolled to - wait for user to fill it out
            toast.info('Fill out the booking form below');
            // Don't send success yet - let the form submission handle it
          } else {
            // Form not found - execute booking intent directly
            console.log('[WebBuilder] Booking form not found - executing intent directly');
            try {
              const res = await handleIntent(intent, payload as IntentPayload);
              if (res.success) {
                toast.success('Booking request submitted');
                sendResultToIframe({
                  success: true,
                  bookingId: `BK-${Date.now().toString(36).toUpperCase()}`,
                  ...res,
                  message: 'Booking request submitted'
                });
              } else {
                toast.error(res.error || 'Booking failed');
                sendResultToIframe({ success: false, error: res.error || 'Booking failed' });
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              toast.error(msg);
              sendResultToIframe({ success: false, error: msg });
            }
          }
        })();
        return;
      }

      // Demo intents: generate in-place (no new tabs).
      if (decision.mode === 'demo') {
        const pageName = 'demo';
        const label = buttonLabel || 'Demo';
        triggerPageGenRef.current(pageName, label, source, requestId);
        return;
      }

      // Redirect intents: Navigate without showing "complete" toast
      if (decision.mode === 'redirect') {
        const target = decision.toastLabel || '/';
        toast(`Navigating to ${target}...`);
        // Trigger page generation or navigation
        const pageName = target.replace(/^\//, '').replace(/\.html$/, '') || 'page';
        triggerPageGenRef.current(pageName, buttonLabel || pageName, source, requestId);
        return;
      }

      // All other modes (autorun, modal, confirm, pipeline): Execute intent directly.
      const toastLabel = decision.toastLabel || buttonLabel || 'Action';
      void (async () => {
        try {
          const res = await handleIntent(intent, payload as IntentPayload);
          
          // Check if result requests user interaction (modal, form, etc.)
          // In this case, don't show "complete" - the workflow is pending user input
          const hasUiDirective = res.ui?.openModal || res.ui?.navigate;
          const hasMissingData = (res as any).missing?.fields?.length > 0;
          
          if (res.success && !hasUiDirective && !hasMissingData) {
            // Workflow actually completed
            toast.success(res.message || `${toastLabel} complete`);
            sendResultToIframe({
              success: true,
              ...res,
              message: res.message || `${toastLabel} complete`
            });
          } else if (res.success && hasUiDirective) {
            // Workflow needs user interaction - show info toast instead
            const modalType = res.ui?.openModal;
            if (modalType === 'booking' || modalType === 'booking-confirmation') {
              toast.info('Complete the booking form');
            } else if (modalType === 'quote') {
              toast.info('Fill out the quote request form');
            } else if (modalType === 'contact') {
              toast.info('Fill out the contact form');
            } else if (modalType?.startsWith('auth')) {
              toast.info('Sign in to continue');
            } else {
              toast.info(`Complete ${toastLabel.toLowerCase()}`);
            }
            sendResultToIframe({
              success: true,
              ...res,
              pending: true,
              message: `${toastLabel} pending user input`
            });
          } else if (res.success && hasMissingData) {
            // Missing required fields
            const missingFields = (res as any).missing?.fields?.join(', ') || 'required fields';
            toast.info(`Please provide: ${missingFields}`);
            sendResultToIframe({
              success: true,
              ...res,
              pending: true,
              message: `Missing: ${missingFields}`
            });
          } else {
            toast.error(res.error || `${toastLabel} failed`);
            sendResultToIframe({
              success: false,
              error: res.error || `${toastLabel} failed`
            });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          toast.error(msg);
          sendResultToIframe({
            success: false,
            error: msg
          });
        }
      })();
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

  // Dynamic page generation state
  const [generatedPages, setGeneratedPages] = useState<Record<string, string>>({});
  const [isGeneratingPage, setIsGeneratingPage] = useState(false);
  const [currentNavPage, setCurrentNavPage] = useState<string | null>(null);

  /**
   * Trigger AI page generation with full context injection (React/TSX only).
   * Called by the label classifier when a redirect-worthy button is clicked
   * and the target page doesn't exist in VFS.
   */
   const triggerPageGeneration = useCallback(async (
    pageName: string,
    navLabel: string,
    source: Window | null,
    requestId?: string,
  ) => {
    const componentName = pageName
      .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, c => c.toUpperCase());
    const vfsPath = `/src/pages/${componentName}.tsx`;
    const vfsFiles = getSandpackFiles();

    // Check VFS cache first
    const existingContent = vfsFiles[vfsPath] || generatedPages[pageName];
    if (existingContent) {
      // Page exists — navigate via React Router
      setActivePagePath(vfsPath);
      const content = typeof existingContent === 'string' ? existingContent : (existingContent as any).content;
      lastSyncedCodeRef.current = content;
      setEditorCode(content);
      // Tell preview to navigate via hash router
      if (source && requestId) {
        source.postMessage({ type: 'NAV_ROUTE', requestId, route: `/${pageName}` }, '*');
      }
      toast(`Navigated to ${navLabel || pageName}`);
      return;
    }

    setIsGeneratingPage(true);
    setCurrentNavPage(navLabel || pageName);

    try {
      const pagePrompt = buildDynamicPagePrompt(pageName, '', navLabel, previewCode, {
        businessContext: businessDataContext,
        designProfile: userDesignProfile ? {
          dominantStyle: userDesignProfile.dominantStyle,
          industryHints: userDesignProfile.industryHints,
        } : undefined,
      });
      
      const { data, error } = await supabase.functions.invoke("ai-code-assistant", {
        body: {
          messages: [{ role: "user", content: pagePrompt }],
          mode: "template-react",
          templateAction: "full-control",
          editMode: false,
          navPageGen: true,
          systemType: activeSystemType ?? undefined,
          navPageName: pageName,
          navLabel: navLabel,
          userDesignProfile: userDesignProfile ? {
            projectCount: userDesignProfile.projectCount,
            dominantStyle: userDesignProfile.dominantStyle,
            industryHints: userDesignProfile.industryHints,
          } : undefined,
        },
      });

      if (error) throw error;

      const content = data?.content || "";
      
      // Extract React component code from AI response
      let pageCode = '';
      
      // Handle JSON multi-file output
      const jsonFenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i);
      const jsonCandidate = jsonFenceMatch ? jsonFenceMatch[1].trim() : content.trim();
      
      if (jsonCandidate.startsWith('{') && jsonCandidate.includes('"files"')) {
        try {
          const parsed = JSON.parse(jsonCandidate);
          if (parsed.files && typeof parsed.files === 'object') {
            vfsImportFiles(parsed.files);
            pageCode = parsed.files[vfsPath] || parsed.files[`/src/pages/${componentName}.tsx`] ||
                       parsed.files['/src/App.tsx'] || Object.values(parsed.files)[0] as string || '';
            console.log('[WebBuilder] Nav page multi-file output:', Object.keys(parsed.files));
          }
        } catch { /* not valid JSON, continue with fence extraction */ }
      }
      
      // Fall back to fence extraction
      if (!pageCode) {
        let codeMatch = content.match(/```(?:tsx|jsx|typescript|ts)\n([\s\S]*?)```/);
        if (!codeMatch) codeMatch = content.match(/```\n([\s\S]*?)```/);
        
        pageCode = codeMatch ? codeMatch[1].trim() : content.trim();
        pageCode = pageCode
          .replace(/^#{1,6}\s+.*$/gm, '')
          .replace(/```[\w]*\n?/g, '')
          .replace(/<<<|>>>|---/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      // Strip any leaked HTML document wrapper (AI sometimes wraps in <!DOCTYPE>)
      if (pageCode.includes('<!DOCTYPE') || pageCode.includes('<html')) {
        console.warn('[WebBuilder] AI returned HTML document instead of React component, extracting body');
        const bodyMatch = pageCode.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          // Wrap extracted body in a React component
          pageCode = `import { Link } from 'react-router-dom';

export default function ${componentName}Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      ${bodyMatch[1].replace(/ class="/g, ' className="').replace(/<br>/gi, '<br />').replace(/<hr>/gi, '<hr />').replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />')}
    </div>
  );
}`;
        }
      }

      // Ensure the code has a default export
      if (pageCode && !pageCode.includes('export default')) {
        pageCode = `import { Link } from 'react-router-dom';

${pageCode}

export default ${componentName}Page;`;
      }

      // Ensure React import
      if (pageCode && !pageCode.includes("from 'react'") && !pageCode.includes('from "react"')) {
        pageCode = `import React from 'react';\n${pageCode}`;
      }

      if (pageCode) {
        // Save to VFS as .tsx page component
        vfsImportFiles({ [vfsPath]: pageCode });
        setGeneratedPages(prev => ({ ...prev, [pageName]: pageCode }));
        
        // Re-scaffold the router to include the new page
        const allFiles = getSandpackFiles();
        allFiles[vfsPath] = pageCode;
        const scaffolded = scaffoldMultiPageVFS(allFiles['/src/App.tsx'] || previewCode, allFiles);
        
        // Import the updated App.tsx with router if new routes were added
        if (scaffolded.scaffoldedPages.length > 0 || scaffolded.files['/src/App.tsx'] !== allFiles['/src/App.tsx']) {
          vfsImportFiles(scaffolded.files);
          // Update preview to reflect new router
          const newAppCode = scaffolded.files['/src/App.tsx'] || previewCode;
          lastSyncedCodeRef.current = newAppCode;
          setPreviewCode(newAppCode);
        }
        
        // Set editor to the new page file
        setActivePagePath(vfsPath);
        lastSyncedCodeRef.current = pageCode;
        setEditorCode(pageCode);

        // Tell preview to navigate to the new route
        if (source && requestId) {
          source.postMessage({ type: 'NAV_ROUTE', requestId, route: `/${pageName}` }, '*');
        }

        toast.success(`${navLabel || pageName} page created!`);
        
        // Re-hydrate playground
        setTimeout(() => {
          const updatedFiles = getSandpackFiles();
          if (Object.keys(updatedFiles).length > 0) {
            creatorPlayground.hydrateFromVFS(virtualFS.nodes, updatedFiles);
          }
        }, 200);
      } else {
        throw new Error('No page content generated');
      }
    } catch (err) {
      console.error('[WebBuilder] Page generation failed:', err);
      toast.error(`Failed to generate ${navLabel || pageName} page`);
      if (source && requestId) {
        source.postMessage({ type: 'NAV_PAGE_ERROR', requestId, error: 'Generation failed' }, '*');
      }
    } finally {
      setIsGeneratingPage(false);
      setCurrentNavPage(null);
    }
  }, [getSandpackFiles, vfsImportFiles, previewCode, generatedPages, businessDataContext, userDesignProfile, activeSystemType]);

  // Ref to always hold the latest triggerPageGeneration (avoids stale closure in INTENT_TRIGGER handler)
  const triggerPageGenRef = useRef(triggerPageGeneration);
  useEffect(() => { triggerPageGenRef.current = triggerPageGeneration; }, [triggerPageGeneration]);

  useEffect(() => {
    const handleNavPageGenerate = async (event: MessageEvent) => {
      if (event.data?.type !== 'NAV_PAGE_GENERATE') return;
      const { pageName, navLabel, requestId } = event.data;
      const source = (event.source && typeof (event.source as any).postMessage === 'function')
        ? (event.source as Window) : null;
      await triggerPageGeneration(pageName, navLabel || pageName, source, requestId);
    };
    
    // Handle fallback reload request when in-iframe navigation fails
    const handleNavPageReload = (event: MessageEvent) => {
      if (event.data?.type !== 'NAV_PAGE_RELOAD_REQUIRED') return;
      const { pageName, pageContent } = event.data;
      console.log('[WebBuilder] Navigation reload required for:', pageName);
      
      if (pageContent) {
        const componentName = pageName.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
        const vfsPath = `/src/pages/${componentName}.tsx`;
        
        // Force update the preview by setting the code
        lastSyncedCodeRef.current = pageContent;
        setPreviewCode(pageContent);
        setEditorCode(pageContent);
        
        // Store in VFS as React component for future navigation
        virtualFS.importFiles({ [vfsPath]: pageContent });
        setActivePagePath(vfsPath);
      }
    };
    
    window.addEventListener('message', handleNavPageGenerate);
    window.addEventListener('message', handleNavPageReload);
    return () => {
      window.removeEventListener('message', handleNavPageGenerate);
      window.removeEventListener('message', handleNavPageReload);
    };
  }, [triggerPageGeneration]);
  
  // Clear draft when template is saved
  const clearDraft = useCallback(() => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    lastSavedCodeRef.current = '';
  }, []);

  // Add console log to confirm component is rendering
  console.log('[WebBuilder] Component rendering with CodeMirror...');

  // Load template from navigation state (from Web Design Kit)
  useEffect(() => {
    const navState = location.state as {
      vfsFiles?: Record<string, string>;
      generatedCode?: string;
      generatedTemplate?: any;
      templateName?: string;
      aesthetic?: string;
      startInPreview?: boolean;
      systemType?: string;
    } | null;

    // If a pre-built VFS plan was passed (e.g. from System Launcher AI edits), import it first.
    if (navState?.vfsFiles) {
      const vfsFiles = { ...navState.vfsFiles };

      // Extract embedded TEMPLATE_STYLES/TEMPLATE_CSS from App.tsx and route to CSS file
      const appKey = vfsFiles["/src/App.tsx"] ? "/src/App.tsx" : vfsFiles["/App.tsx"] ? "/App.tsx" : null;
      if (appKey && !vfsFiles["/src/template.css"]) {
        const { cleanCode, css } = extractEmbeddedCSS(vfsFiles[appKey]);
        if (css) {
          vfsFiles[appKey] = cleanCode;
          vfsFiles["/src/template.css"] = css;
        }
      }

      if (Object.keys(vfsFiles).length > 0) {
        virtualFS.importFiles(vfsFiles);

        // Find React entry point — prioritize /src/App.tsx, then /App.tsx
        const entry = vfsFiles["/src/App.tsx"] || vfsFiles["/App.tsx"] || Object.values(vfsFiles)[0];
        if (entry) {
          // Ensure React imports are present
          const safeEntry = ensureReactImports(entry);
          setEditorCode(safeEntry);
          setPreviewCode(safeEntry);
        }

        // Keep builder metadata in sync for VFS-first launches
        if (navState.templateName) setCurrentTemplateName(navState.templateName);
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
        setEditorCode(result.code);
        setPreviewCode(result.code);
        // Ensure template.css exists in VFS when component imports it
        if (result.css) {
          vfsImportFiles({ '/src/template.css': result.css });
        }
      } else {
        // Extract any legacy TEMPLATE_STYLES/TEMPLATE_CSS from React code
        const { cleanCode, css } = extractEmbeddedCSS(generatedCode);
        setEditorCode(cleanCode);
        setPreviewCode(cleanCode);
        if (css) {
          vfsImportFiles({ '/src/template.css': css });
        }
      }
      
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
      
      setEditorCode(reactCode);
      setPreviewCode(reactCode);
      setViewMode('code');
      toast(`${templateName || generatedTemplate.name} loaded!`, {
        description: `${aesthetic || generatedTemplate.description} - View and edit in Code Editor`,
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handle AI code generation
  const handleAICodeGenerated = (code: string) => {
    console.log('[WebBuilder] AI code received:', code.substring(0, 100));
    setEditorCode(code);
    setPreviewCode(code);
    setViewMode('canvas'); // Switch to canvas view to show the generated template preview
    toast('AI Template Generated!', {
      description: 'Glass UI template is ready for preview',
    });
  };

  // Clear canvas and reset to initial state
  const handleClearCanvas = () => {
    const defaultCode = '// AI Web Builder - JavaScript Mode\n// Use vanilla JavaScript to create interactive web experiences\n\n// Example: Create a simple interactive button\nconst createButton = () => {\n  const button = document.createElement("button");\n  button.textContent = "Click Me!";\n  button.style.padding = "12px 24px";\n  button.style.fontSize = "16px";\n  button.style.cursor = "pointer";\n  \n  button.onclick = () => {\n    alert("Hello from Web Builder!");\n  };\n  \n  return button;\n};\n\n// Usage: Uncomment to test\n// document.body.appendChild(createButton());';
    
    const defaultPreview = '<!-- AI-generated code will appear here -->\n<div style="padding: 40px; text-align: center;">\n  <h1>Welcome to AI Web Builder</h1>\n  <p>Use the AI Code Assistant to generate components</p>\n</div>';
    
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
    
    // Set the code in both editor and preview
    setEditorCode(code);
    setPreviewCode(code);
    
    // Track the current template ID and name for re-save
    templateFiles.setCurrentTemplateId(template.id);
    setCurrentTemplateName(template.name);
    setSaveProjectName(template.name);
    setSaveProjectDescription(template.description || '');
    
    // Switch to preview mode to show the loaded template
    setBuilderMode('preview');
    
    toast.success(`Opened "${template.name}"`, {
      description: 'Template loaded - you can continue editing',
    });
  }, [templateFiles, integrateCSSIntoHTML]);

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
    
    // Directly set the code - SimplePreview will render it
    setEditorCode(normalized.code);
    setPreviewCode(normalized.code);
    
    // Also import to VFS for code editor
    const files = templateToVFSFiles(normalized.code, name);
    vfsImportFiles(files);
    
    toast.success(`Loaded template: ${name}`, {
      description: 'Template loaded into preview'
    });
  }, [systemType, manifestIdFromState, vfsImportFiles]);

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

    setEditorCode(swappedCode);
    setPreviewCode(swappedCode);

    // Sync to VFS
    const files = templateToVFSFiles(swappedCode, currentTemplateName || 'Untitled');
    vfsImportFiles(files);

    const variant = getVariantById(variantId as VariantId);
    toast.success(`Swapped ${sectionId} → ${variant?.name || variantId}`, {
      description: 'Section layout updated, theme preserved',
    });
  }, [previewCode, currentTemplateName, vfsImportFiles]);

  // Handle saving current template
  // Helper to get final TSX with customizer overrides baked in
  const getFinalCodeWithOverrides = useCallback(() => {
    if (templateCustomizer.isDirty) {
      const baseSource = templateCustomizer.getOriginalSource() || previewCode;
      return templateCustomizer.applyOverrides(baseSource);
    }
    return previewCode;
  }, [templateCustomizer, previewCode]);

  const handleSaveTemplate = useCallback(async (
    name: string,
    description: string,
    isPublic: boolean
  ) => {
    const finalCode = getFinalCodeWithOverrides();
    await templateFiles.saveTemplate(name, description, isPublic, finalCode);
  }, [templateFiles, getFinalCodeWithOverrides]);

  // Handle quick save (update existing template)
  const handleQuickSave = useCallback(async () => {
    if (templateFiles.currentTemplateId) {
      const finalCode = getFinalCodeWithOverrides();
      await templateFiles.updateTemplate(templateFiles.currentTemplateId, finalCode);
    } else {
      setFileManagerOpen(true);
    }
  }, [templateFiles, getFinalCodeWithOverrides]);

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
      
      if (isUpdating) {
        // Update existing template
        await templateFiles.updateTemplate(templateFiles.currentTemplateId, finalCode);
        toast.success(`Updated "${saveProjectName}"`);
      } else {
        // Save as new template
        await templateFiles.saveTemplate(saveProjectName, saveProjectDescription, false, finalCode);
        toast.success(`Saved "${saveProjectName}" to Projects`);
      }
      
      setSaveProjectDialogOpen(false);
      clearDraft(); // Clear auto-save draft after successful save
    } catch (error) {
      console.error("Error saving to projects:", error);
      toast.error("Failed to save template");
    } finally {
      setIsSavingProject(false);
    }
  }, [saveProjectName, saveProjectDescription, templateFiles, getFinalCodeWithOverrides, clearDraft]);

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

  // Manual refresh handler — works for both VFSPreview (React/Sandpack) and SimplePreview (srcdoc)
  const handleRefreshPreview = useCallback(() => {
    setIsRefreshing(true);
    if (useReactPreview && livePreviewRef.current) {
      livePreviewRef.current.refresh();
    } else if (simplePreviewRef.current) {
      simplePreviewRef.current.refresh();
    }
    setTimeout(() => setIsRefreshing(false), 600);
  }, [useReactPreview]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvasElement = canvasRef.current;
    
    const canvas = new FabricCanvas(canvasElement, {
      width: 1280,
      height: canvasHeight,
      backgroundColor: "#ffffff", // Keep canvas background white to avoid black flashes on zoom
    });

    setFabricCanvas(canvas);

    const handleSelectionCreated = (e: { selected?: FabricCanvas['_objects'] }) => {
      setSelectedObject(e.selected?.[0] || null);
    };

    const handleSelectionUpdated = (e: { selected?: FabricCanvas['_objects'] }) => {
      setSelectedObject(e.selected?.[0] || null);
    };

    const handleSelectionCleared = () => {
      setSelectedObject(null);
    };

    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionUpdated);
    canvas.on("selection:cleared", handleSelectionCleared);

    return () => {
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionUpdated);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.clear();
      canvas.dispose();
      setFabricCanvas(null);
      setSelectedObject(null);
    };
  }, [canvasHeight]);

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
    if (!location.state?.generatedTemplate) return;
    if (!fabricCanvas) {
      console.log('[WebBuilder] Canvas not ready, will process template when canvas is available');
      return;
    }

    const { generatedTemplate } = location.state;
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
  }, [location.state, fabricCanvas, updateTemplate]);

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
      const patchedFiles = elementToVFSPatch(currentFiles, wrappedJsx, element.name);
      
      // Apply to VFS — triggers Sandpack rebundle
      vfsImportFiles(patchedFiles);
      
      // Update previewCode/editorCode to stay in sync
      const updatedApp = patchedFiles['/src/App.tsx'];
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

  const handleExport = (format: string) => {
    // Prefer preview code if available (live HTML preview), otherwise use fabric canvas
    if (previewCode) {
      // Extract HTML body content
      const bodyMatch = previewCode.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const htmlContent = bodyMatch ? bodyMatch[1] : previewCode;
      
      // Extract CSS from style tags
      const styleMatches = previewCode.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      const cssContent = styleMatches 
        ? styleMatches.map(s => s.replace(/<style[^>]*>|<\/style>/gi, '')).join('\n\n')
        : '';
      
      // Extract JavaScript from script tags
      const scriptMatches = previewCode.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      const jsContent = scriptMatches 
        ? scriptMatches
            .map(s => s.replace(/<script[^>]*>|<\/script>/gi, ''))
            .filter(s => s.trim())
            .join('\n\n')
        : '';
      
      setExportHtml(htmlContent);
      setExportCss(cssContent);
      setExportJs(jsContent);
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
    const iframe = useReactPreview
      ? livePreviewRef.current?.getIframe?.()
      : simplePreviewRef.current?.getIframe();
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
  }, [useReactPreview]);

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
    <div ref={mainContainerRef} className="flex flex-col h-screen bg-[#1a0a14]">
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
          
          <div className="h-5 w-px bg-fuchsia-500/50" />
          
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
            currentMode={builderMode}
            onModeChange={(mode) => {
              if (mode === 'select') {
                setEditActivationKey(prev => prev + 1);
              }
              setBuilderMode(mode);
              setIsInteractiveMode(mode === 'preview');
              if (mode === 'preview') {
                setSelectedHTMLElement(null);
                setSelectedObject(null);
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
        </div>

        {/* Center Section: Floating Dock */}
        <div className="flex-1 flex justify-center">
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
                  <span className={cn('tracking-wide', isActive ? 'font-bold' : '')}>{label}</span>
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-fuchsia-300/60" />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="h-5 w-px bg-cyan-500/50" />
          
          {/* Save with status */}
          <div className="flex items-center gap-1.5">
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
            <DeployButton
              files={{ 'index.html': previewCode }}
              defaultSiteName={currentTemplateName || 'unison-site'}
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

          {/* Creator's Playground Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPlaygroundModalOpen(true)}
            className="h-8 px-2.5 rounded-lg text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/15 hover:shadow-[0_0_10px_rgba(0,200,100,0.3)] transition-all duration-200"
            title="Open Creator's Playground"
          >
            <span className="text-sm">🕹️</span>
          </Button>
        </div>
      </div>

      {/* Creator's Playground Modal */}
      <CreatorPlaygroundModal
        open={playgroundModalOpen}
        onOpenChange={(open) => {
          setPlaygroundModalOpen(open);
          if (!open) setPlaygroundInitialSection(undefined);
        }}
        playground={creatorPlayground}
        businessId={businessId || null}
        initialSection={playgroundInitialSection}
        onPageSelect={(pageId) => {
          const page = creatorPlayground.pageRegistry.pages[pageId];
          if (page?.path) {
            toast.info(`Selected page: ${page.title}`, { description: page.path });
          }
        }}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* AI Panel - static left side panel (always visible when builder opens) */}
        {aiPanelOpen && (
          <>
            <ResizablePanel defaultSize={22} minSize={18} maxSize={35}>
              <AIBuilderPanel
                currentCode={previewCode}
                systemType={activeSystemType}
                templateName={currentTemplateName}
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
                onApplyToVFS={(files) => {
                  console.log('[WebBuilder] onApplyToVFS called with files:', Object.keys(files));
                  const result = aiVFS.applyCode(files);
                  console.log('[WebBuilder] aiVFS.applyCode result:', { success: result.success, filesWritten: result.filesWritten, errors: result.errors });
                  if (result.success) {
                    // Update editor/preview state from the main entry file
                    const entry = files['/index.html'] || files['/src/App.tsx'] || files['/App.tsx'];
                    console.log('[WebBuilder] Entry file for preview:', entry ? (entry.substring(0, 100) + '...') : 'NOT FOUND');
                    if (entry) {
                      setEditorCode(entry);
                      setPreviewCode(entry);
                      console.log('[WebBuilder] Updated previewCode state');
                    }
                    setViewMode('canvas');
                    console.log('[WebBuilder] AI→VFS orchestrator applied:', result.filesWritten.length, 'files,', 
                      Object.keys(result.dependencies.dependencies).length, 'deps');
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
                  
                  setEditorCode(normalized.code);
                  setPreviewCode(normalized.code);
                  
                  // Immediately sync to VFS for instant preview update
                  const vfsFiles = virtualFS.getSandpackFiles();
                  const isReactVFS = Object.keys(vfsFiles).some(f => /\.(tsx|jsx)$/.test(f));
                  const targetPath = pageTabs.length > 1
                    ? activePagePath
                    : isReactVFS ? '/src/App.tsx' : '/index.html';
                  virtualFS.importFiles({ ...vfsFiles, [targetPath]: normalized.code });
                  console.log('[WebBuilder] VFS updated directly:', targetPath);
                  
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
                  const entry = files["/index.html"] || files["/src/App.tsx"] || files["/App.tsx"];
                  
                  if (files["/index.html"]) {
                    const normalized = normalizeTemplateForCtaContract({
                      code: files["/index.html"],
                      systemType: effectiveSystemType,
                    });
                    normalizedFiles["/index.html"] = normalized.code;
                    setTemplateCtaAnalysis(normalized.analysis);
                    console.log('[WebBuilder] Auto-wired intents in file patch:', normalized.analysis.intents);
                  }
                  
                  virtualFS.importFiles(normalizedFiles);

                  if (entry) {
                    const finalEntry = normalizedFiles["/index.html"] || normalizedFiles["/src/App.tsx"] || normalizedFiles["/App.tsx"];
                    setEditorCode(finalEntry);
                    setPreviewCode(finalEntry);
                  }

                  setViewMode('canvas');
                  toast.success('Files updated', { description: 'Approved patch plan applied to project files' });
                  return true;
                }}
              />
            </ResizablePanel>
            <ResizableHandle className="w-1.5 bg-gradient-to-b from-transparent via-lime-500/20 to-transparent hover:via-lime-400/50 transition-all duration-300 shadow-[0_0_8px_rgba(0,255,0,0.2)]" />
          </>
        )}

        <ResizablePanel defaultSize={aiPanelOpen ? 78 : 100} minSize={50}>
          {/* Main Content */}
          <div className="h-full flex overflow-x-auto overflow-y-hidden">
        {/* Left Panel - Elements Sidebar */}
        {!leftPanelCollapsed && (
          <div className="w-64 flex-shrink-0 bg-[#0d0d18] border-r-2 border-cyan-500/40 flex flex-col overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.15)]">
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
                    const patchFiles = elementToVFSPatch(currentFiles, html, 'FunctionalBlock');
                    virtualFS.importFiles(patchFiles);
                    
                    // Update legacy state
                    const newAppCode = patchFiles['/src/App.tsx'] || '';
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
                  activePageKey={activePagePath === '/index.html' ? 'home' : activePagePath.replace(/^\//, '').replace(/\.html$/, '')}
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
                        handleIntent(intent, { ...payload, businessId });
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
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* Left Panel Toggle */}
        <div className="relative">
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

        {/* Center Canvas Area */}
        <div className="flex-1 min-w-0 flex flex-col bg-transparent relative">
          {/* Main Content Area - Canvas/Code/Split View */}
          <div 
            ref={canvasContainerRef}
            className="flex-1 overflow-hidden p-2 flex items-stretch justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0c0c12] to-[#0a0a0f] relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isPanning ? 'grabbing' : 'default' }}
          >
            {/* Scroll Navigation Controls - Only for Canvas/Split Mode */}
            {(viewMode === 'canvas' || viewMode === 'split') && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
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
                <div className="h-10 backdrop-blur-md bg-[hsl(0,0%,5%)]/95 border-b border-white/10 flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full shadow-sm",
                      builderMode === 'select' ? "bg-emerald-400" : "bg-slate-500"
                    )} />
                    <span className="text-xs font-medium text-slate-300">
                      {builderMode === 'select' ? 'Select Mode' : 'Preview Mode'}
                    </span>
                    {useReactPreview && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-600">
                        <FileCode className="h-3 w-3" /> HTML Preview
                      </div>
                    )}
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
                        if (useReactPreview) {
                          livePreviewRef.current?.openInNewTab();
                        } else {
                          simplePreviewRef.current?.openInNewTab();
                        }
                      }}
                      className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200"
                      title="Open preview in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {builderMode === 'select' && (
                      <>
                        <span className="w-px h-4 bg-border mx-1" />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                {/* Page tabs removed - navigation happens in-place within preview */}
                <div 
                  ref={scrollContainerRef}
                  data-drop-zone="true"
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  {/* React mode uses VFSPreview with Docker HMR, HTML mode uses SimplePreview */}
                    {useReactPreview ? (
                    <VFSPreview
                      ref={livePreviewRef}
                      nodes={virtualFS.nodes}
                      activeFile={activePagePath}
                      className="w-full h-full min-h-0 flex-1"
                      showToolbar={false}
                      autoStart={true}
                      showBackendIndicator={false}
                      device={device}
                      enableSelection={builderMode === 'select'}
                      selectionActivationKey={editActivationKey}
                      onElementSelect={builderMode === 'select' ? handlePreviewElementSelect : undefined}
                      onNavigate={(path) => {
                        const pageName = path.replace(/^\//, '').replace(/\.html$/, '') || 'index';
                        if (pageName !== 'index') {
                          triggerPageGenRef.current(pageName, pageName, null);
                        }
                      }}
                      onIntentTrigger={(intent, payload) => {
                        if (intent === 'nav.goto' && payload.path) {
                          const pageName = String(payload.path).replace(/^\//, '').replace(/\.html$/, '');
                          if (pageName) triggerPageGenRef.current(pageName, String(payload.text || pageName), null);
                        }
                      }}
                      businessId={businessId || undefined}
                      onReady={() => console.log('[WebBuilder] VFSPreview ready')}
                      onError={(err) => {
                        toast.error(`Preview error: ${err}`);
                        setIframeErrors(prev => [...prev, {
                          type: 'runtime',
                          message: err,
                          timestamp: new Date(),
                        }]);
                      }}
                    />
                  ) : (
                    <SimplePreview
                      ref={simplePreviewRef}
                      code={previewCode}
                      className="w-full h-full min-h-0 flex-1"
                      showToolbar={false}
                      device={device}
                      enableSelection={builderMode === 'select'}
                      selectionActivationKey={editActivationKey}
                      onElementSelect={builderMode === 'select' ? handlePreviewElementSelect : undefined}
                    />
                  )}
                  {/* Inline loading overlay for AI page generation */}
                  {isGeneratingPage && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
                      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] shadow-2xl shadow-black/30">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                        </div>
                        <p className="text-sm font-medium text-white">Generating {currentNavPage}…</p>
                        <div className="w-52 h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-[loading_2s_ease-in-out_infinite]" 
                               style={{ width: '60%', animation: 'loading 2s ease-in-out infinite' }} />
                        </div>
                        <p className="text-xs text-white/60">AI is building a matching page with full design context</p>
                      </div>
                    </div>
                  )}
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
                  <div className="h-10 backdrop-blur-md bg-gradient-to-r from-slate-100/95 to-slate-50/95 border-b border-slate-200/50 flex items-center justify-between px-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">Live Preview</span>
                      {useReactPreview && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-600">
                          <FileCode className="h-3 w-3" /> HTML Preview
                        </div>
                      )}
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
                          if (useReactPreview) {
                            livePreviewRef.current?.openInNewTab();
                          } else {
                            simplePreviewRef.current?.openInNewTab();
                          }
                        }}
                        className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-md transition-all duration-200"
                        title="Open preview in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Page tabs removed - navigation happens in-place within preview */}
                  <div 
                    ref={splitViewDropZoneRef}
                    data-drop-zone="true"
                    className="flex-1 flex flex-col min-h-0 overflow-hidden"
                  >
                    {/* React mode uses VFSPreview with Docker HMR, HTML mode uses SimplePreview */}
                    {useReactPreview ? (
                      <VFSPreview
                        ref={livePreviewRef}
                        nodes={virtualFS.nodes}
                        activeFile={activePagePath}
                        className="w-full h-full min-h-0 flex-1"
                        showToolbar={false}
                        autoStart={true}
                        showBackendIndicator={false}
                        device={device}
                        enableSelection={builderMode === 'select'}
                        selectionActivationKey={editActivationKey}
                        onElementSelect={builderMode === 'select' ? handlePreviewElementSelect : undefined}
                        onNavigate={(path) => {
                          const pageName = path.replace(/^\//, '').replace(/\.html$/, '') || 'index';
                          if (pageName !== 'index') {
                            triggerPageGenRef.current(pageName, pageName, null);
                          }
                        }}
                        onIntentTrigger={(intent, payload) => {
                          if (intent === 'nav.goto' && payload.path) {
                            const pageName = String(payload.path).replace(/^\//, '').replace(/\.html$/, '');
                            if (pageName) triggerPageGenRef.current(pageName, String(payload.text || pageName), null);
                          }
                        }}
                        businessId={businessId || undefined}
                        onReady={() => console.log('[WebBuilder] VFSPreview ready')}
                        onError={(err) => {
                          toast.error(`Preview error: ${err}`);
                          setIframeErrors(prev => [...prev, {
                            type: 'runtime',
                            message: err,
                            timestamp: new Date(),
                          }]);
                        }}
                      />
                    ) : (
                      <SimplePreview
                        ref={simplePreviewRef}
                        code={previewCode}
                        className="w-full h-full min-h-0 flex-1"
                        showToolbar={false}
                        device={device}
                        enableSelection={builderMode === 'select'}
                        selectionActivationKey={editActivationKey}
                        onElementSelect={builderMode === 'select' ? handlePreviewElementSelect : undefined}
                      />
                    )}
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

        {/* Right Panel Toggle */}
        <div className="relative">
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
          <div className="w-64 flex-shrink-0 bg-[#0d0d18] border-l-2 border-fuchsia-500/40 flex flex-col overflow-hidden shadow-[0_0_20px_rgba(255,0,255,0.15)]">
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
              {previewCode && !selectedObject && !selectedHTMLElement ? (
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
              onClearHTMLSelection={() => setSelectedHTMLElement(null)}
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
              onReplaceImage={handleFloatingImageReplace}
              onDelete={handleFloatingDelete}
              onDuplicate={handleFloatingDuplicate}
              onMoveUp={handleFloatingMoveUp}
              onMoveDown={handleFloatingMoveDown}
              onClear={() => setSelectedHTMLElement(null)}
              systemType={activeSystemType}
              systemsBuildContext={systemsBuildContextFromState}
              onAIEditComplete={async (selector, newHtml) => {
                const res = applyElementHtmlUpdate(previewCode, selector, newHtml);
                if (res.ok) {
                  setEditorCode(res.code);
                  setPreviewCode(res.code);
                  // Sync change to VFS so it persists across navigation
                  const targetPath = pageTabs.length > 1 ? activePagePath : '/index.html';
                  const vfsFiles = virtualFS.getSandpackFiles();
                  virtualFS.importFiles({ ...vfsFiles, [targetPath]: res.code });
                  setSelectedHTMLElement(null);
                  toast.success('Element updated by AI');
                  return true;
                } else {
                  toast.error('AI edit could not be applied — element not found');
                  return false;
                }
              }}
            />
          </div>
        )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

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

      {/* Secure HTML Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl h-[90vh] backdrop-blur-2xl bg-gradient-to-b from-[#0d0d14]/98 to-[#0a0a0f]/98 border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-white/70" />
                Live HTML Preview
              </span>
              {templateState.isRendering && (
                <span className="text-xs text-white/40">Rendering...</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <SecureIframePreview
              html={sanitizeHTML(templateState.html)}
              css={templateState.css}
              className="w-full h-full border border-white/[0.08] rounded-xl bg-white"
              onConsole={(type, args) => {
                console.log(`[Preview ${type}]:`, ...args);
              }}
              onError={(error) => {
                console.error('[Preview Error]:', error);
                toast.error('Preview error: ' + error.message);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

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
        projectId={projectId || templateFiles.currentTemplateId || undefined}
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
  );
};
