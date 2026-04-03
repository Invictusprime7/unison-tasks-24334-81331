import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import TemplateFeedback from "./TemplateFeedback";
import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Plus, Layout, Type, Square, Eye, Play,
  Monitor, Tablet, Smartphone, ZoomIn, ZoomOut,
  Sparkles, Code, Undo2, Redo2, Save, Keyboard, Zap,
  ChevronsDown, ChevronsUp, ArrowDown, ArrowUp, FileCode, Copy, Maximize2, Trash2,
  FolderOpen, Cloud, CloudOff
} from "lucide-react";
import { CloudPanel } from "./web-builder/CloudPanel";
import { toast } from "sonner";
import CodeMirrorEditor from './CodeMirrorEditor';
import { SimplePreview, type SimplePreviewHandle } from '@/components/SimplePreview';
import { VFSPreview, type VFSPreviewHandle } from '../VFSPreview';
import { LiveHTMLPreview, type LiveHTMLPreviewHandle } from './LiveHTMLPreview';
import { CollapsiblePropertiesPanel } from "./web-builder/CollapsiblePropertiesPanel";
import { ElementsSidebar, WebElement } from "./ElementsSidebar";
import { CanvasDragDropService } from "@/services/canvasDragDropService";
import { CodePreviewDialog } from "./web-builder/CodePreviewDialog";
import { AICodeAssistant } from "./AICodeAssistant";
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
import { setDefaultBusinessId, handleIntent, IntentPayload } from "@/runtime/intentRouter";
import { IntentPipelineOverlay, type PipelineConfig } from "./web-builder/IntentPipelineOverlay";
import { DemoIntentOverlay, type DemoIntentOverlayConfig } from "./web-builder/DemoIntentOverlay";
import { ResearchOverlay, type ResearchOverlayPayload } from "./web-builder/ResearchOverlay";
import { decideIntentUx } from "@/runtime/intentUx";
import SystemHealthPanel from "@/components/web-builder/SystemHealthPanel";
import type { BusinessSystemType } from "@/data/templates/types";
import { normalizeTemplateForCtaContract, type TemplateCtaAnalysis } from "@/utils/ctaContract";
import { supabase } from "@/integrations/supabase/client";
import { buildPageStructureContext } from "@/utils/pageStructureContext";
import { AIActivityPanel } from "@/components/ai-agent/AIActivityPanel";
import { useAIActivityMonitor } from "@/hooks/useAIActivityMonitor";
import { useTemplateCustomizer } from "@/hooks/useTemplateCustomizer";
import { TemplateCustomizerPanel } from "./web-builder/TemplateCustomizerPanel";
import { ElementFloatingToolbar } from "./web-builder/ElementFloatingToolbar";

function getOrCreatePreviewBusinessId(systemType?: string): string {
  const key = systemType ? `webbuilder_businessId:${systemType}` : 'webbuilder_businessId';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    // Fallback when localStorage is unavailable
    return crypto.randomUUID();
  }
}

/**
 * Build a context-aware prompt for dynamic page generation
 * Used when user clicks navigation links to generate linked pages on-the-fly
 */
function buildDynamicPagePrompt(
  pageName: string,
  pageContext: string,
  navLabel: string,
  mainPageCode: string
): string {
  // Extract brand/styling context from main page
  const colorMatch = mainPageCode.match(/(?:bg-|text-|from-|to-)([a-z]+-\d+)/g);
  const colors = colorMatch ? [...new Set(colorMatch)].slice(0, 10).join(', ') : 'blue, purple, gray';
  
  // Page-specific prompts based on context
  const pagePrompts: Record<string, string> = {
    checkout: `Create a COMPLETE checkout page with:
- Order summary section showing cart items with prices
- Shipping address form (name, email, address, city, state, zip)
- Payment section with card input fields (card number, expiry, CVV)
- Order total with subtotal, shipping, tax breakdown
- "Complete Purchase" button with data-ut-intent="checkout.complete"
- Trust badges and secure payment icons
- Back to cart link`,
    
    cart: `Create a COMPLETE shopping cart page with:
- Cart items list with product images, names, quantities, prices
- Quantity adjusters (+/- buttons) with data-no-intent
- Remove item buttons
- Subtotal calculation
- "Proceed to Checkout" button with data-ut-intent="checkout.start"
- "Continue Shopping" link back to main page
- Empty cart state message`,
    
    booking: `Create a COMPLETE booking/appointment page with:
- Service selection dropdown or cards
- Date picker calendar UI
- Available time slots grid
- Customer info form (name, email, phone)
- Special requests textarea
- "Confirm Booking" button with data-ut-intent="booking.create"
- Cancellation policy notice`,
    
    contact: `Create a COMPLETE contact page with:
- Contact form (name, email, phone, subject, message)
- Form validation styling
- "Send Message" button with data-ut-intent="contact.submit"
- Business contact info (address, phone, email, hours)
- Embedded map placeholder
- Social media links`,
    
    services: `Create a COMPLETE services page with:
- Hero section with services overview
- Individual service cards with icons, descriptions, pricing
- "Book Now" buttons with data-ut-intent="booking.create"
- Service comparison table (if applicable)
- FAQ section about services
- CTA to contact for custom quotes`,
    
    about: `Create a COMPLETE about page with:
- Company story/mission section
- Team member profiles with photos and bios
- Company values or philosophy
- Timeline or milestones
- Awards/certifications
- CTA to contact or learn more`,
    
    products: `Create a COMPLETE products catalog page with:
- Product grid with images, names, prices
- Filter/sort controls (data-no-intent on these)
- "Add to Cart" buttons with data-ut-intent="cart.add"
- Product quick view modals
- Pagination or load more
- Featured products section`,
    
    login: `Create a COMPLETE login page with:
- Login form (email, password)
- "Sign In" button with data-ut-intent="auth.signin"
- "Forgot Password" link
- "Create Account" link
- Social login buttons (Google, Apple)
- Remember me checkbox`,
    
    signup: `Create a COMPLETE registration page with:
- Signup form (name, email, password, confirm password)
- Password strength indicator
- Terms & conditions checkbox
- "Create Account" button with data-ut-intent="auth.signup"
- Already have account? Sign in link
- Social signup options`,
    
    pricing: `Create a COMPLETE pricing page with:
- 3 pricing tiers (Basic, Pro, Enterprise)
- Feature comparison table
- Toggle for monthly/yearly pricing
- "Get Started" buttons with appropriate intents
- FAQ about billing
- Money-back guarantee notice`,
    
    gallery: `Create a COMPLETE gallery/portfolio page with:
- Masonry or grid image gallery
- Category filter tabs (data-no-intent)
- Lightbox-style image viewing
- Project descriptions
- Client testimonials
- CTA to inquire about projects`,
  };

  const specificPrompt = pagePrompts[pageName.toLowerCase()] || 
    `Create a complete ${navLabel || pageName} page with relevant content, forms, and call-to-action buttons properly wired with data-ut-intent attributes.`;

  return `🚀 CREATE A DYNAMIC "${navLabel || pageName.toUpperCase()}" PAGE

This page is part of a multi-page website. The user clicked "${navLabel}" from the main page.

${specificPrompt}

📋 CRITICAL REQUIREMENTS:

1. **COMPLETE HTML DOCUMENT** - Start with <!DOCTYPE html>, include Tailwind CSS
2. **MATCH MAIN PAGE STYLING** - Use similar colors: ${colors}
3. **NAVIGATION** - Include header with nav links back to main page and other pages
4. **REAL CONTENT** - Write actual text, not placeholders
5. **WORKING INTENTS** - Wire all CTAs with data-ut-intent, data-ut-cta, data-intent attributes
6. **RESPONSIVE** - Mobile-first with md: and lg: breakpoints
7. **FOOTER** - Match the main page footer style

🔌 INTENT WIRING:
- Navigation: data-ut-intent="nav.goto" data-ut-path="/index.html"
- Forms: data-ut-intent on submit buttons (contact.submit, booking.create, etc.)
- E-commerce: cart.add, cart.view, checkout.start, checkout.complete
- Auth: auth.signin, auth.signup, auth.signout
- Add data-no-intent to UI controls that shouldn't trigger actions (filters, tabs, quantity adjusters)

CONTEXT FROM MAIN PAGE (extract styling patterns):
${mainPageCode.substring(0, 2000)}

OUTPUT: Complete HTML page only, no markdown, no explanations.`;
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
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
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
  const [editorCode, setEditorCode] = useState('// AI Web Builder - JavaScript Mode\n// Use vanilla JavaScript to create interactive web experiences\n\n// Example: Create a simple interactive button\nconst createButton = () => {\n  const button = document.createElement("button");\n  button.textContent = "Click Me!";\n  button.style.padding = "12px 24px";\n  button.style.fontSize = "16px";\n  button.style.cursor = "pointer";\n  \n  button.onclick = () => {\n    alert("Hello from Web Builder!");\n  };\n  \n  return button;\n};\n\n// Usage: Uncomment to test\n// document.body.appendChild(createButton());');
  const [previewCode, setPreviewCode] = useState('<!-- AI-generated code will appear here -->\n<div style="padding: 40px; text-align: center;">\n  <h1>Welcome to AI Web Builder</h1>\n  <p>Use the AI Code Assistant to generate components</p>\n</div>');
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
  const [aiEditRequested, setAiEditRequested] = useState(false);

  // Parse template when previewCode changes (but NOT when customizer is applying overrides)
  useEffect(() => {
    if (previewCode && previewCode.trim().startsWith('<')) {
      // Skip re-parsing if the change came from customizer applying overrides
      // This prevents resetting the images array and losing user-uploaded data URLs
      if (templateCustomizer.consumeCustomizerApplyFlag()) {
        return;
      }
      templateCustomizer.parseTemplate(previewCode);
    }
  }, [previewCode]);

  // Apply customizer overrides to preview
  const applyCustomizerOverrides = useCallback(() => {
    if (!templateCustomizer.isDirty) return;
    // Always apply on the original (base) HTML, not the already-customized previewCode
    const baseHtml = templateCustomizer.getOriginalHtml() || previewCode;
    if (!baseHtml) return;
    const customized = templateCustomizer.applyOverrides(baseHtml);
    if (customized !== previewCode) {
      setPreviewCode(customized);
      setEditorCode(customized);
    }
  }, [templateCustomizer, previewCode]);

  // Auto-apply overrides when customizer state changes (e.g. after image replacement)
  // Patches the iframe DOM in-place to avoid scroll-reset & blink.
  useEffect(() => {
    if (templateCustomizer.overrideVersion <= 0 || !templateCustomizer.isDirty) return;

    const iframe = simplePreviewRef.current?.getIframe();
    const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (!iframeDoc || !iframeDoc.head) {
      // Iframe not ready — fall back to full HTML replace (initial load)
      const baseHtml = templateCustomizer.getOriginalHtml() || previewCode;
      if (!baseHtml) return;
      const customized = templateCustomizer.applyOverrides(baseHtml);
      if (customized !== previewCode) {
        setPreviewCode(customized);
        setEditorCode(customized);
      }
      return;
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

    // 2. Apply text / image element overrides directly on DOM nodes
    templateCustomizer.elementOverrides.forEach((override) => {
      try {
        if (override.textContent !== undefined) {
          const el = iframeDoc.querySelector(override.selector);
          if (el) el.textContent = override.textContent;
        }
        if (override.imageSrc) {
          const el = iframeDoc.querySelector(override.selector) as HTMLImageElement | null;
          if (el) el.setAttribute('src', override.imageSrc);
        }
        // Inline style overrides (for per-element tweaks beyond the CSS sheet)
        if (override.styles && Object.keys(override.styles).length) {
          const el = iframeDoc.querySelector(override.selector) as HTMLElement | null;
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
        let el = iframeDoc.querySelector(img.selector) as HTMLImageElement | null;
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

    // 4. Keep editorCode in sync (generate the full HTML for code-editor pane)
    const baseHtml = templateCustomizer.getOriginalHtml() || previewCode;
    if (baseHtml) {
      const customized = templateCustomizer.applyOverrides(baseHtml);
      if (customized !== previewCode) {
        setEditorCode(customized);
      }
    }
  }, [templateCustomizer.overrideVersion]);

  // Handle element-level edits from floating toolbar
  const handleFloatingStyleUpdate = useCallback((selector: string, styles: Record<string, string>) => {
    templateCustomizer.setElementOverride(selector, { styles });
    // Don't call applyCustomizerOverrides synchronously — setElementOverride
    // increments overrideVersion which triggers the reactive useEffect
  }, [templateCustomizer]);

  const handleFloatingTextUpdate = useCallback((selector: string, text: string) => {
    templateCustomizer.setElementOverride(selector, { textContent: text });
  }, [templateCustomizer]);

  const handleFloatingImageReplace = useCallback((selector: string, src: string) => {
    templateCustomizer.setElementOverride(selector, { imageSrc: src });
  }, [templateCustomizer]);


  const applyElementHtmlUpdate = useCallback((code: string, selector: string, newHtml: string) => {
    try {
      const trimmed = (code || '').trim();
      const isDoc = trimmed.toLowerCase().startsWith('<!doctype') || trimmed.toLowerCase().startsWith('<html');
      // This targeted replace is only safe for HTML templates.
      if (!trimmed.startsWith('<') || trimmed.includes('export default') || trimmed.includes('import React')) {
        return { ok: false as const, code };
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(isDoc ? trimmed : `<!DOCTYPE html><html><body>${trimmed}</body></html>`, 'text/html');

      // Try multiple selector strategies to handle DOM structure differences
      // between the live preview iframe and the re-parsed source HTML
      let target: Element | null = null;

      // 1. Try the exact selector
      try { target = doc.querySelector(selector); } catch { /* invalid selector */ }

      // 2. Strip html > body prefix (live DOM includes injected elements that shift nth-child)
      if (!target) {
        const stripped = selector
          .replace(/^html\s*>\s*body[^\s>]*\s*>\s*/, '')
          .replace(/^body[^\s>]*\s*>\s*/, '');
        if (stripped !== selector) {
          try { target = doc.querySelector(stripped); } catch { /* noop */ }
        }
      }

      // 3. Remove all :nth-child() qualifiers (index mismatch from injected elements)
      if (!target) {
        const noNth = selector.replace(/:nth-child\(\d+\)/g, '');
        try { target = doc.querySelector(noNth); } catch { /* noop */ }
        if (!target) {
          const strippedNoNth = noNth
            .replace(/^html\s*>\s*body[^\s>]*\s*>\s*/, '')
            .replace(/^body[^\s>]*\s*>\s*/, '');
          if (strippedNoNth !== noNth) {
            try { target = doc.querySelector(strippedNoNth); } catch { /* noop */ }
          }
        }
      }

      // 4. Tag-only path fallback (most permissive)
      if (!target) {
        const tagPath = selector
          .split(/\s*>\s*/)
          .map(part => part.replace(/[.#:[][^\s>]*/g, '').trim())
          .filter(Boolean)
          .filter(t => t !== 'html' && t !== 'body')
          .join(' > ');
        if (tagPath) {
          try { target = doc.querySelector(tagPath); } catch { /* noop */ }
        }
      }

      if (!target) {
        console.warn('[applyElementHtmlUpdate] No match for selector:', selector);
        return { ok: false as const, code };
      }

      // Replace outerHTML via DOM manipulation
      const container = doc.createElement('div');
      container.innerHTML = newHtml;
      const replacement = container.firstElementChild as Element | null;
      if (!replacement) return { ok: false as const, code };
      target.replaceWith(replacement);

      const next = isDoc
        ? `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`
        : doc.body.innerHTML;
      return { ok: true as const, code: next };
    } catch (err) {
      console.error('[applyElementHtmlUpdate] Error:', err);
      return { ok: false as const, code };
    }
  }, []);
  
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
  
  // Virtual file system for code editor
  const virtualFS = useVirtualFileSystem();
  
  // Track modified and AI-generated files for modern UI
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());
  const [aiGeneratedFiles, setAIGeneratedFiles] = useState<Set<string>>(new Set());
  const [recentlyChangedFiles, setRecentlyChangedFiles] = useState<Set<string>>(new Set());
  const originalFileContents = useRef<Map<string, string>>(new Map());
  
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
  }, [modifiedFiles]);
  
  // Mark files as AI-generated when importing from templates
  const markFilesAsAIGenerated = useCallback((fileIds: string[]) => {
    setAIGeneratedFiles(prev => new Set([...prev, ...fileIds]));
  }, []);
  
  // Sync previewCode to VFS when it changes (for templates and AI-generated code)
  // This ensures the preview component sees the same code as the editor
  const lastSyncedCodeRef = useRef<string>('');
  const syncingFromVFSRef = useRef(false);
  
  useEffect(() => {
    // Skip if we're syncing from VFS to avoid loops
    if (syncingFromVFSRef.current) return;
    
    // Sync if previewCode has content and changed
    if (previewCode && previewCode !== lastSyncedCodeRef.current) {
      console.log('[WebBuilder] Syncing previewCode to VFS, length:', previewCode.length);
      // Determine file type based on content
      const isHTML = previewCode.trim().startsWith('<!DOCTYPE') || 
                     previewCode.trim().startsWith('<html') ||
                     previewCode.includes('<body');
      const isTSX = previewCode.includes('import React') || 
                    previewCode.includes('export default') ||
                    previewCode.includes('const ') && previewCode.includes('return (');
      
      console.log('[WebBuilder] Content type detection - isHTML:', isHTML, 'isTSX:', isTSX);
      
      if (isHTML) {
        // For HTML templates, sync to index.html
        console.log('[WebBuilder] Importing as /index.html');
        virtualFS.importFiles({
          '/index.html': previewCode,
        });
      } else if (isTSX) {
        // For React/TSX, sync to App.tsx
        console.log('[WebBuilder] Importing as /src/App.tsx');
        virtualFS.importFiles({
          '/src/App.tsx': previewCode,
        });
      } else {
        // Default to index.html for simple HTML snippets
        virtualFS.importFiles({
          '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  ${previewCode}
</body>
</html>`,
        });
      }
      lastSyncedCodeRef.current = previewCode;
    }
  }, [previewCode, virtualFS]);
  
  // Sync VFS changes back to previewCode (for code editor edits)
  // This keeps the legacy previewCode state in sync with VFS
  useEffect(() => {
    const activeFile = virtualFS.getActiveFile();
    if (activeFile && activeFile.content !== lastSyncedCodeRef.current) {
      // Check if this is a main file that should update previewCode
      const isMainFile = activeFile.path === '/src/App.tsx' || 
                         activeFile.path === '/index.html' ||
                         activeFile.path === '/App.tsx';
      if (isMainFile) {
        console.log('[WebBuilder] Syncing VFS to previewCode:', activeFile.path);
        syncingFromVFSRef.current = true;
        setPreviewCode(activeFile.content);
        lastSyncedCodeRef.current = activeFile.content;
        // Reset the flag after state update
        setTimeout(() => {
          syncingFromVFSRef.current = false;
        }, 0);
      }
    }
  }, [virtualFS.nodes, virtualFS.activeFileId]);
  
  // Auto-save functionality
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedCodeRef = useRef<string>('');
  const AUTO_SAVE_KEY = 'webbuilder_autosave_draft';
  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  
  // Track unsaved changes for back button warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialCodeRef = useRef<string>(previewCode);
  
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

  // AI context (page structure + backend state + business data)
  const pageStructureContext = useMemo(() => buildPageStructureContext(previewCode), [previewCode]);
  const backendStateContext = useMemo(() => {
    const lines: string[] = [];
    lines.push(`- backendInstalled: ${backendInstalled ? "yes" : "no"}`);
    if (activeSystemType) lines.push(`- systemType: ${activeSystemType}`);
    if (currentTemplateId) lines.push(`- templateId: ${currentTemplateId}`);
    if (manifestIdFromState || currentManifestId) lines.push(`- manifestId: ${manifestIdFromState || currentManifestId}`);
    if (businessId) lines.push(`- businessId: ${businessId}`);
    return lines.join("\n");
  }, [backendInstalled, activeSystemType, currentTemplateId, manifestIdFromState, currentManifestId, businessId]);

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
    
    // Cleanup on unmount
    return () => {
      setDefaultBusinessId(null);
    };
  }, [businessId, systemType]);

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

          if (!handled) {
            // Don't show error toast - form may already be visible or user can scroll manually
            console.log('[WebBuilder] Booking form not found - user may need to scroll manually');
          }
          
          // Send success result for booking intent - iframe will show confirmation page
          sendResultToIframe({
            success: true,
            bookingId: `BK-${Date.now().toString(36).toUpperCase()}`,
            message: 'Appointment request received'
          });
        })();
        return;
      }

      // Demo intents: open in new tab (no overlay).
      if (decision.mode === 'demo') {
        const url = decision.demoUrl || (payload as any)?.demoUrl || (payload as any)?.supademoUrl;
        if (typeof url === 'string' && url.trim().length > 0) {
          window.open(url, '_blank', 'noopener,noreferrer');
          toast('Opening demo…');
        } else {
          toast('Demo requested');
        }
        return;
      }

      // Default: autorun everything else (no pipeline UI).
      const toastLabel = decision.toastLabel || 'Action';
      toast(`${toastLabel} running…`);
      void (async () => {
        try {
          const res = await handleIntent(intent, payload as IntentPayload);
          if (res.success) {
            toast.success(`${toastLabel} complete`);
            // Send success result back to iframe for confirmation page
            sendResultToIframe({
              success: true,
              ...res,
              message: `${toastLabel} complete`
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
    return () => window.removeEventListener('message', handleIntentMessage);
  }, []);

  // Dynamic page generation state
  const [generatedPages, setGeneratedPages] = useState<Record<string, string>>({});
  const [isGeneratingPage, setIsGeneratingPage] = useState(false);
  const [currentNavPage, setCurrentNavPage] = useState<string | null>(null);

  // Listen for NAV_PAGE_GENERATE messages from iframe for dynamic page creation
  useEffect(() => {
    const handleNavPageGenerate = async (event: MessageEvent) => {
      if (event.data?.type !== 'NAV_PAGE_GENERATE') return;
      
      const { pageName, pageContext, navLabel, requestId } = event.data;
      console.log('[WebBuilder] Dynamic page generation requested:', pageName, pageContext);
      
      const source = (event.source && typeof (event.source as any).postMessage === 'function')
        ? (event.source as Window)
        : null;

      // Check if page already exists in VFS or cache
      const existingPage = virtualFS.nodes[`/${pageName}.html`] || generatedPages[pageName];
      if (existingPage) {
        console.log('[WebBuilder] Page already exists:', pageName);
        const pageContent = typeof existingPage === 'string' ? existingPage : (existingPage as any).content;
        if (source) {
          source.postMessage({
            type: 'NAV_PAGE_READY',
            requestId,
            pageName,
            pageContent
          }, '*');
        }
        return;
      }

      // Generate new page with AI
      setIsGeneratingPage(true);
      setCurrentNavPage(pageName);

      try {
        // Build context-aware prompt for the page
        const pagePrompt = buildDynamicPagePrompt(pageName, pageContext, navLabel, previewCode);
        
        const { data, error } = await supabase.functions.invoke("ai-code-assistant", {
          body: {
            messages: [{ role: "user", content: pagePrompt }],
            mode: "code",
            templateAction: "full-control",
            editMode: false,
          },
        });

        if (error) throw error;

        const content = data?.content || "";
        let codeMatch = content.match(/```(?:html|jsx|tsx|javascript|js|typescript|ts)\n([\s\S]*?)```/);
        if (!codeMatch) codeMatch = content.match(/```\n([\s\S]*?)```/);
        
        let pageCode = codeMatch ? codeMatch[1].trim() : content.trim();
        
        // Clean markdown artifacts
        pageCode = pageCode
          .replace(/^#{1,6}\s+.*$/gm, '')
          .replace(/```[\w]*\n?/g, '')
          .replace(/<<<|>>>|---/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        if (pageCode) {
          // Store in VFS and cache
          virtualFS.importFiles({ [`/${pageName}.html`]: pageCode });
          setGeneratedPages(prev => ({ ...prev, [pageName]: pageCode }));

          console.log('[WebBuilder] Dynamic page generated:', pageName, pageCode.length, 'chars');
          
          if (source) {
            source.postMessage({
              type: 'NAV_PAGE_READY',
              requestId,
              pageName,
              pageContent: pageCode
            }, '*');
          }

          toast.success(`${navLabel || pageName} page created!`);
        } else {
          throw new Error('No page content generated');
        }
      } catch (err) {
        console.error('[WebBuilder] Page generation failed:', err);
        toast.error(`Failed to generate ${navLabel || pageName} page`);
        
        if (source) {
          source.postMessage({
            type: 'NAV_PAGE_ERROR',
            requestId,
            pageName,
            error: err instanceof Error ? err.message : 'Generation failed'
          }, '*');
        }
      } finally {
        setIsGeneratingPage(false);
        setCurrentNavPage(null);
      }
    };

    window.addEventListener('message', handleNavPageGenerate);
    return () => window.removeEventListener('message', handleNavPageGenerate);
  }, [virtualFS, previewCode, generatedPages]);
  
  // Clear draft when template is saved
  const clearDraft = useCallback(() => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    lastSavedCodeRef.current = '';
  }, []);

  // Add console log to confirm component is rendering
  console.log('[WebBuilder] Component rendering with CodeMirror...');

  // Load template from navigation state (from Web Design Kit)
  useEffect(() => {
    // If a pre-built VFS plan was passed (e.g. from System Launcher AI edits), import it first.
    if (location.state?.vfsFiles) {
      const vfsFiles = (location.state as { vfsFiles?: Record<string, string> })?.vfsFiles;
      if (vfsFiles && Object.keys(vfsFiles).length > 0) {
        virtualFS.importFiles(vfsFiles);
        const entry = vfsFiles["/index.html"] || vfsFiles["/src/App.tsx"] || vfsFiles["/App.tsx"];
        if (entry) {
          setEditorCode(entry);
          setPreviewCode(entry);
        }
      }
    }

    if (location.state?.generatedCode) {
      const { generatedCode, templateName, aesthetic, startInPreview } = location.state;
      console.log('[WebBuilder] Loading template code:', templateName, 'startInPreview:', startInPreview);
      if (templateName) setCurrentTemplateName(templateName);
      setEditorCode(generatedCode);
      setPreviewCode(generatedCode);
      
      // Start in canvas/preview mode if coming from homepage AI panel, otherwise code mode
      if (startInPreview) {
        setViewMode('canvas');
        toast(`${templateName} loaded!`, {
          description: `${aesthetic} - Preview your AI-generated website`,
        });
      } else {
        setViewMode('code');
        toast(`${templateName} loaded!`, {
          description: `${aesthetic} - View and edit in Code Editor`,
        });
      }
      // Clear the state to prevent re-loading on subsequent renders
      window.history.replaceState({}, document.title);
    } else if (location.state?.generatedTemplate) {
      const { generatedTemplate, templateName, aesthetic } = location.state;
      console.log('[WebBuilder] Loading template from Web Design Kit:', templateName);
      
      // Convert template to HTML code
      const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generatedTemplate.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Template: ${generatedTemplate.name} */
        /* Colors: Primary ${generatedTemplate.brandKit.primaryColor}, Secondary ${generatedTemplate.brandKit.secondaryColor} */
        
        html {
            scroll-behavior: smooth;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
            animation: fadeIn 0.6s ease-out;
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Generated Template: ${generatedTemplate.name} -->
    <!-- ${generatedTemplate.description} -->
    
    ${generatedTemplate.sections.map(section => `
    <!-- Section: ${section.name} (${section.type}) -->
    <section class="py-16 px-6">
        <div class="max-w-7xl mx-auto">
            <h2 class="text-4xl font-bold mb-8">${section.name}</h2>
            <div class="grid gap-6 md:grid-cols-${section.components.length > 2 ? '3' : '2'}">
                ${section.components.map(comp => `
                <div class="p-6 bg-white rounded-lg shadow-lg">
                    <h3 class="text-2xl font-semibold mb-4">${comp.props.title || 'Component'}</h3>
                    <p class="text-gray-600">${comp.props.description || 'Component content'}</p>
                </div>
                `).join('\n                ')}
            </div>
        </div>
    </section>
    `).join('\n    ')}
</body>
</html>`;
      
      setEditorCode(htmlCode);
      setPreviewCode(htmlCode);
      setViewMode('code'); // Start in code view to show the template in CodeMirror
      toast(`${templateName || generatedTemplate.name} loaded!`, {
        description: `${aesthetic || generatedTemplate.description} - View and edit in Code Editor`,
      });
      // Clear the state to prevent re-loading on subsequent renders
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
    virtualFS.importFiles(files);
    
    toast.success(`Loaded template: ${name}`, {
      description: 'Template loaded into preview'
    });
  }, [systemType, manifestIdFromState, virtualFS]);

  // Handle saving current template
  const handleSaveTemplate = useCallback(async (
    name: string,
    description: string,
    isPublic: boolean
  ) => {
    await templateFiles.saveTemplate(name, description, isPublic, previewCode);
  }, [templateFiles, previewCode]);

  // Handle quick save (update existing template)
  const handleQuickSave = useCallback(async () => {
    if (templateFiles.currentTemplateId) {
      await templateFiles.updateTemplate(templateFiles.currentTemplateId, previewCode);
    } else {
      setFileManagerOpen(true);
    }
  }, [templateFiles, previewCode]);

  // Handle save to projects from preview
  const handleSaveToProjects = useCallback(async (saveAsNew: boolean = false) => {
    if (!saveProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    
    setIsSavingProject(true);
    try {
      const isUpdating = templateFiles.currentTemplateId && !saveAsNew;
      
      if (isUpdating) {
        // Update existing template
        await templateFiles.updateTemplate(templateFiles.currentTemplateId, previewCode);
        toast.success(`Updated "${saveProjectName}"`);
      } else {
        // Save as new template
        await templateFiles.saveTemplate(saveProjectName, saveProjectDescription, false, previewCode);
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
  }, [saveProjectName, saveProjectDescription, templateFiles, previewCode, clearDraft]);

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

  // History management - both canvas and code history
  const canvasHistory = useCanvasHistory(fabricCanvas);
  const codeHistory = useCodeHistory(100);

  // Track code changes for undo/redo
  useEffect(() => {
    if (previewCode && !previewCode.includes('AI-generated code will appear here')) {
      codeHistory.push(previewCode);
    }
  }, [previewCode]);

  // Unified undo handler
  const handleUndo = useCallback(() => {
    const previousCode = codeHistory.undo();
    if (previousCode) {
      setPreviewCode(previousCode);
      setEditorCode(previousCode);
      toast.success('Undo', { description: 'Previous state restored' });
    } else if (canvasHistory.canUndo) {
      canvasHistory.undo();
    }
  }, [codeHistory, canvasHistory]);

  // Unified redo handler
  const handleRedo = useCallback(() => {
    const nextCode = codeHistory.redo();
    if (nextCode) {
      setPreviewCode(nextCode);
      setEditorCode(nextCode);
      toast.success('Redo', { description: 'Next state restored' });
    } else if (canvasHistory.canRedo) {
      canvasHistory.redo();
    }
  }, [codeHistory, canvasHistory]);

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
      action: () => selectedObject && handleDelete(),
    },
    {
      ...defaultWebBuilderShortcuts.backspace,
      action: () => selectedObject && handleDelete(),
    },
    {
      ...defaultWebBuilderShortcuts.duplicate,
      action: () => selectedObject && handleDuplicate(),
    },
    {
      ...defaultWebBuilderShortcuts.save,
      action: () => {
        canvasHistory.save();
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
    if (location.state?.generatedTemplate) {
      const { generatedTemplate, templateName } = location.state;
      console.log('[WebBuilder] Template received from route state:', generatedTemplate);
      
      // Ensure canvas is ready
      if (!fabricCanvas) {
        console.log('[WebBuilder] Canvas not ready, will process template when canvas is available');
        return;
      }

      // Use template state to render the template
      templateState.updateTemplate(generatedTemplate).then(() => {
        console.log('[WebBuilder] ✅ Template successfully rendered from route state');
        setShowPreview(true);
        // Clear the state to prevent re-loading
        window.history.replaceState({}, document.title);
      }).catch((error) => {
        console.error('[WebBuilder] ❌ Failed to render template from route state:', error);
        toast.error('Failed to render template: ' + (error instanceof Error ? error.message : 'Unknown error'));
      });
    }
  }, [location.state, fabricCanvas, templateState]);

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
      setTimeout(() => canvasHistory.save(), 100);
    };

    fabricCanvas.on("object:added", handleObjectModified);
    fabricCanvas.on("object:removed", handleObjectModified);
    fabricCanvas.on("object:modified", handleObjectModified);

    return () => {
      fabricCanvas.off("object:added", handleObjectModified);
      fabricCanvas.off("object:removed", handleObjectModified);
      fabricCanvas.off("object:modified", handleObjectModified);
    };
  }, [fabricCanvas, canvasHistory, canvasHeight, updateCanvasHeight]);

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

    // Handle drop events - render elements with smart positioning
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
      
      // Parse the current HTML to insert at the right position
      const parser = new DOMParser();
      const doc = parser.parseFromString(previewCode || '<body></body>', 'text/html');
      const body = doc.body;
      
      // Create wrapper for the new element with data attributes for reordering
      const wrapper = doc.createElement('div');
      wrapper.setAttribute('data-element-id', `element-${Date.now()}`);
      wrapper.setAttribute('data-element-type', element.category);
      wrapper.setAttribute('draggable', 'true');
      wrapper.setAttribute('class', 'canvas-element');
      wrapper.innerHTML = element.htmlTemplate;
      
      // Smart positioning based on drop context
      if (context.position === 'prepend') {
        body.insertBefore(wrapper, body.firstChild);
      } else if (context.position === 'append' || !body.children.length) {
        body.appendChild(wrapper);
      } else {
        // Insert at a specific position based on drop location
        const children = Array.from(body.children);
        const middleIndex = Math.floor(children.length / 2);
        const referenceNode = children[middleIndex];
        body.insertBefore(wrapper, referenceNode);
      }
      
      // Get the updated HTML with proper formatting
      const newCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .canvas-element {
      position: relative;
      cursor: move;
      transition: opacity 0.3s, transform 0.3s;
    }
    .canvas-element:hover {
      opacity: 0.95;
    }
    .canvas-element.dragging {
      opacity: 0.5;
    }
    .canvas-element.drag-over-top::before {
      content: '';
      position: absolute;
      top: -2px;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3B82F6, #8B5CF6);
      border-radius: 2px;
    }
    .canvas-element.drag-over-bottom::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3B82F6, #8B5CF6);
      border-radius: 2px;
    }
  </style>
</head>
<body>
${body.innerHTML}
<script>
  // Enable reordering of elements via drag and drop
  (function() {
    let draggedElement = null;
    let dragOverElement = null;
    
    function handleDragStart(e) {
      draggedElement = e.currentTarget;
      draggedElement.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', draggedElement.innerHTML);
    }
    
    function handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if (!draggedElement || e.currentTarget === draggedElement) return;
      
      const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
      dragOverElement = e.currentTarget;
      
      // Remove previous indicators
      document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      
      // Add indicator
      if (afterElement) {
        dragOverElement.classList.add('drag-over-bottom');
      } else {
        dragOverElement.classList.add('drag-over-top');
      }
    }
    
    function handleDragLeave(e) {
      e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
    }
    
    function handleDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (!draggedElement || !dragOverElement || draggedElement === dragOverElement) return;
      
      const afterElement = getDragAfterElement(dragOverElement, e.clientY);
      
      if (afterElement) {
        dragOverElement.parentNode.insertBefore(draggedElement, dragOverElement.nextSibling);
      } else {
        dragOverElement.parentNode.insertBefore(draggedElement, dragOverElement);
      }
      
      dragOverElement.classList.remove('drag-over-top', 'drag-over-bottom');
    }
    
    function handleDragEnd(e) {
      e.currentTarget.classList.remove('dragging');
      document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      draggedElement = null;
      dragOverElement = null;
    }
    
    function getDragAfterElement(container, y) {
      const box = container.getBoundingClientRect();
      const offset = y - box.top;
      return offset > box.height / 2;
    }
    
    // Attach event listeners to all canvas elements
    function initDragAndDrop() {
      document.querySelectorAll('.canvas-element').forEach(element => {
        element.addEventListener('dragstart', handleDragStart);
        element.addEventListener('dragover', handleDragOver);
        element.addEventListener('dragleave', handleDragLeave);
        element.addEventListener('drop', handleDrop);
        element.addEventListener('dragend', handleDragEnd);
      });
    }
    
    // Initialize on load and when new elements are added
    initDragAndDrop();
    
    // Observe for new elements
    const observer = new MutationObserver(() => {
      initDragAndDrop();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  })();
</script>
</body>
</html>`;
      
      setPreviewCode(newCode);
      setEditorCode(newCode);
      
      toast.success(`Added ${element.name}`, {
        description: `${element.category} element added. Drag to reorder!`,
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
  // Note: Direct DOM manipulation not supported in Sandpack preview
  const handleDeleteHTMLElement = useCallback(() => {
    if (!selectedHTMLElement?.selector) return;
    toast.info('Direct element deletion not available in preview mode. Edit the code instead.');
    setSelectedHTMLElement(null);
  }, [selectedHTMLElement]);

  // Handle duplicate for HTML elements in the live preview
  // Note: Direct DOM manipulation not supported in Sandpack preview
  const handleDuplicateHTMLElement = useCallback(() => {
    if (!selectedHTMLElement?.selector) return;
    toast.info('Direct element duplication not available in preview mode. Edit the code instead.');
  }, [selectedHTMLElement]);

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

  // Scroll navigation functions
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        top: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        top: 300,
        behavior: 'smooth'
      });
    }
  };

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
    <div ref={mainContainerRef} className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Interactive Element Highlighting Styles */}
      <InteractiveElementHighlight isInteractiveMode={isInteractiveMode} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Elements Sidebar */}
        {!leftPanelCollapsed && (
          <div className="w-80 bg-background border-r border-border/20 flex flex-col overflow-hidden">
            <Tabs defaultValue="elements" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full justify-start rounded-none border-b border-border/20 bg-card px-2 h-10 shrink-0">
                <TabsTrigger value="elements" className="text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Elements</TabsTrigger>
                <TabsTrigger value="functional" className="text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Functional</TabsTrigger>
                <TabsTrigger value="ai-plugins" className="text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">AI Plugins</TabsTrigger>
                <TabsTrigger value="health" className="text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Health</TabsTrigger>
              </TabsList>
              <TabsContent value="elements" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ElementsSidebar
              onElementDragStart={(element) => {
                dragDropServiceRef.current.onDragStart(element);
                toast(`Dragging ${element.name}`, {
                  description: 'Drop onto preview area to add element'
                });
              }}
              onElementDragEnd={() => {
                dragDropServiceRef.current.onDragEnd();
              }}
              onAIImageGenerated={(imageUrl, metadata) => {
                // Create AI image element HTML
                const imageAlt = (metadata?.prompt as string) || 'AI Generated Image';
                const styleInfo = metadata?.style ? `<span className="text-xs opacity-75">Style: ${metadata.style}</span>` : '';
                
                const imageHtml = `
                  <figure className="relative group overflow-hidden rounded-2xl shadow-2xl my-6">
                    <img 
                      src="${imageUrl}" 
                      alt="${imageAlt}"
                      loading="lazy"
                      className="w-full h-auto object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
                      style={{ aspectRatio: '16/9', maxWidth: '100%' }}
                    />
                    <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-sm font-medium">${imageAlt}</p>
                      ${styleInfo}
                    </figcaption>
                  </figure>
                `;
                
                // Use VFS to add image
                const currentFiles = virtualFS.getSandpackFiles();
                const patchFiles = elementToVFSPatch(currentFiles, imageHtml, 'AIImage');
                virtualFS.importFiles(patchFiles);
                
                // Update legacy state
                const newAppCode = patchFiles['/src/App.tsx'] || '';
                if (newAppCode) {
                  setEditorCode(newAppCode);
                  setPreviewCode(newAppCode);
                }
                
                toast('AI Image Added!', {
                  description: 'AI-generated image added to VFS preview'
                });
              }}
              onElementClick={(element: WebElement) => {
                // Use VFS to add element
                const currentFiles = virtualFS.getSandpackFiles();
                const patchFiles = elementToVFSPatch(currentFiles, element.htmlTemplate, element.name);
                virtualFS.importFiles(patchFiles);
                
                // Update legacy state for compatibility
                const newAppCode = patchFiles['/src/App.tsx'] || '';
                if (newAppCode) {
                  setEditorCode(newAppCode);
                  setPreviewCode(newAppCode);
                }
                
                toast.success(`Added ${element.name}`, {
                  description: 'Element added to VFS preview'
                });
              }}
            />
              </TabsContent>

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
              <TabsContent value="ai-plugins" className="flex-1 m-0 min-h-0 overflow-hidden">
                <AIPluginsPanel 
                  businessId={businessId}
                  pluginInstanceId={cloudState.installedPacks?.[0]}
                />
              </TabsContent>
              <TabsContent value="health" className="flex-1 m-0 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3">
                    <SystemHealthPanel
                      systemType={activeSystemType}
                      preloadedIntents={templateCtaAnalysis.intents}
                      templateSlots={templateCtaAnalysis.slots}
                      backendInstalled={backendInstalled}
                      onPublishCheck={handleRunPublishChecks}
                    />
                  </div>
                </ScrollArea>
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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-12 w-6 rounded-r-md rounded-l-none bg-[#1a1a1a] border-l-0 border border-white/10 text-white/70 hover:text-white hover:bg-[#252525]"
            title={leftPanelCollapsed ? "Show left panel" : "Hide left panel"}
          >
            {leftPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
          {/* Unified Topbar with Dock */}
          <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2">
            {/* Left Section: Back Button & Device Breakpoints */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackNavigation}
                className="text-white/70 hover:text-white h-8 px-2"
                title={`Go back to ${referrerPageName}${hasUnsavedChanges ? ' (unsaved changes will be auto-saved)' : ''} - Alt+←`}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="flex items-center gap-1">
                  Back
                  {hasUnsavedChanges && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" title="Unsaved changes" />
                  )}
                </span>
              </Button>
              
              <div className="h-5 w-px bg-white/10" />
              
              {/* Device Breakpoints */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant={device === "desktop" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setDevice("desktop")}
                  className="h-7 w-7 text-white/70 hover:text-white"
                  title="Desktop"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={device === "tablet" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setDevice("tablet")}
                  className="h-7 w-7 text-white/70 hover:text-white"
                  title="Tablet"
                >
                  <Tablet className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={device === "mobile" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setDevice("mobile")}
                  className="h-7 w-7 text-white/70 hover:text-white"
                  title="Mobile"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </div>
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
              />
            </div>

            {/* Right Section: View Mode & AI Activity */}
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
                <Button
                  variant={viewMode === "canvas" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("canvas")}
                  className="text-white/70 hover:text-white h-7 px-2"
                >
                  <Square className="h-3.5 w-3.5 mr-1" />
                  Canvas
                </Button>
                <Button
                  variant={viewMode === "code" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("code")}
                  className="text-white/70 hover:text-white h-7 px-2"
                >
                  <FileCode className="h-3.5 w-3.5 mr-1" />
                  Code
                </Button>
                <Button
                  variant={viewMode === "split" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("split")}
                  className="text-white/70 hover:text-white h-7 px-2"
                >
                  <Layout className="h-3.5 w-3.5 mr-1" />
                  Split
                </Button>
              </div>
              
              {/* AI Activity Indicator & Panel */}
              <div className="h-5 w-px bg-white/10" />
              <AIActivityPanel
                events={aiActivity.events}
                activityState={aiActivity.activityState}
                attentionCount={aiActivity.attentionCount}
                isLoading={aiActivity.isLoading}
                onViewDetails={() => {
                  // Navigate to AI plugins tab in sidebar
                  setLeftPanelCollapsed(false);
                  toast.info('View AI plugin details in the sidebar', {
                    description: 'Go to AI Plugins tab for full analysis',
                  });
                }}
              />
            </div>
          </div>

          {/* Secondary Toolbar - Mode & Actions */}
          <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-white/[0.02]">
            {/* Left: Mode Toggle */}
            <SimpleModeToggle
              currentMode={builderMode}
              onModeChange={(mode) => {
              setBuilderMode(mode);
                setIsInteractiveMode(mode === 'preview');
                // Clear edit selection when entering preview mode
                if (mode === 'preview') {
                  setSelectedHTMLElement(null);
                  setSelectedObject(null);
                  setAiEditRequested(false);
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

            {/* Center: Template Info */}
            {currentTemplateName && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/20 rounded text-xs text-primary">
                  <Cloud className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{currentTemplateName}</span>
                </div>
                {currentDesignPreset && (
                  <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                    {currentDesignPreset}
                  </Badge>
                )}
              </div>
            )}

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Auto-save status indicator */}
              {autoSaveStatus !== 'idle' && (
                <div className="flex items-center gap-1 text-xs text-white/50">
                  {autoSaveStatus === 'saving' ? (
                    <>
                      <div className="animate-spin h-3 w-3 border border-white/30 border-t-white/70 rounded-full" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="h-3 w-3 text-primary" />
                      <span className="text-primary">Saved</span>
                    </>
                  )}
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSaveProjectDialogOpen(true)}
                className="h-7 text-white/70 hover:text-white hover:bg-white/10 px-2"
                title={currentTemplateName ? `Update "${currentTemplateName}"` : "Save to Projects"}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">{currentTemplateName ? 'Update' : 'Save'}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearCanvas}
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                title="Clear Canvas"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              
              <span className="text-xs text-white/40">{getCanvasWidth()}×{getCanvasHeight()}</span>
            </div>
          </div>

          {/* Main Content Area - Canvas/Code/Split View */}
          <div 
            ref={canvasContainerRef}
            className="flex-1 overflow-hidden p-4 flex items-start justify-center bg-[#0a0a0a] relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isPanning ? 'grabbing' : 'default' }}
          >
            {/* Scroll Navigation Controls - Only for Canvas/Split Mode */}
            {(viewMode === 'canvas' || viewMode === 'split') && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollToTop}
                  className="h-10 w-10 bg-[#1a1a1a] border border-white/10 text-white/70 hover:text-white hover:bg-[#252525] shadow-lg"
                  title="Scroll to top"
                >
                  <ChevronsUp className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollUp}
                  className="h-10 w-10 bg-[#1a1a1a] border border-white/10 text-white/70 hover:text-white hover:bg-[#252525] shadow-lg"
                  title="Scroll up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollDown}
                  className="h-10 w-10 bg-[#1a1a1a] border border-white/10 text-white/70 hover:text-white hover:bg-[#252525] shadow-lg"
                  title="Scroll down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollToBottom}
                  className="h-10 w-10 bg-[#1a1a1a] border border-white/10 text-white/70 hover:text-white hover:bg-[#252525] shadow-lg"
                  title="Scroll to bottom"
                >
                  <ChevronsDown className="h-5 w-5" />
                </Button>
              </div>
            )}
            
            {/* Canvas Mode - AI Live Preview Only */}
            {viewMode === 'canvas' && (
              <div className="w-full h-full flex flex-col bg-white rounded-lg overflow-hidden border border-white/10 shadow-2xl relative">
                <div className="h-10 bg-muted/50 border-b flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      builderMode === 'select' ? "bg-primary" : "bg-accent-foreground"
                    )} />
                    <span className="text-xs font-medium text-muted-foreground">
                      {builderMode === 'select' ? 'Select Mode - Click elements to edit' : 'Preview Mode - Test interactions'}
                    </span>
                  </div>
                  {builderMode === 'select' && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Del</kbd>
                      <span>Delete</span>
                      <span className="mx-1">·</span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘D</kbd>
                      <span>Duplicate</span>
                    </div>
                  )}
                </div>
                <div 
                  ref={scrollContainerRef}
                  data-drop-zone="true"
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  {/* Both modes use SimplePreview for consistent rendering */}
                  <SimplePreview
                    ref={simplePreviewRef}
                    code={previewCode}
                    className="w-full h-full min-h-0 flex-1"
                    showToolbar={false}
                    device={device}
                    enableSelection={builderMode === 'select'}
                    onElementSelect={builderMode === 'select' ? (el) => {
                      setSelectedHTMLElement({
                        tagName: el.tagName,
                        textContent: el.textContent,
                        styles: el.styles,
                        attributes: el.attributes,
                        selector: el.selector,
                        html: el.html,
                        section: el.section,
                      });
                    } : undefined}
                  />
                </div>
              </div>
            )}

            {/* Code Mode - Full Code Editor with Folder Structure */}
            {viewMode === 'code' && (
              <div className="w-full h-full bg-[#0d1117] rounded-lg overflow-hidden border border-white/10 shadow-xl" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  {/* Modern File Explorer */}
                  <ResizablePanel defaultSize={22} minSize={18} maxSize={35}>
                    <ModernFileExplorer
                      nodes={virtualFS.nodes}
                      activeFileId={virtualFS.activeFileId}
                      onFileSelect={virtualFS.openFile}
                      onCreateFile={virtualFS.createFile}
                      onCreateFolder={virtualFS.createFolder}
                      onDelete={virtualFS.deleteNode}
                      onRename={virtualFS.renameNode}
                      onDuplicate={virtualFS.duplicateNode}
                      onToggleFolder={virtualFS.toggleFolder}
                      onExpandAll={virtualFS.expandAll}
                      onCollapseAll={virtualFS.collapseAll}
                      modifiedFiles={modifiedFiles}
                      aiGeneratedFiles={aiGeneratedFiles}
                      recentlyChangedFiles={recentlyChangedFiles}
                    />
                  </ResizablePanel>

                  <ResizableHandle withHandle className="bg-white/5 hover:bg-primary/20 transition-colors" />

                  {/* Editor Panel */}
                  <ResizablePanel defaultSize={78}>
                    <div className="h-full flex flex-col">
                      {/* Modern Editor Tabs */}
                      <ModernEditorTabs
                        tabs={virtualFS.getOpenFiles().map(f => ({ 
                          id: f.id, 
                          name: f.name,
                          path: f.path,
                          isModified: modifiedFiles.has(f.id),
                          isAIGenerated: aiGeneratedFiles.has(f.id),
                        }))}
                        activeTabId={virtualFS.activeFileId}
                        onTabSelect={virtualFS.openFile}
                        onTabClose={virtualFS.closeTab}
                        onCloseOthers={(keepId) => {
                          const openFiles = virtualFS.getOpenFiles();
                          openFiles.filter(f => f.id !== keepId).forEach(f => virtualFS.closeTab(f.id));
                        }}
                        onCloseAll={() => {
                          const openFiles = virtualFS.getOpenFiles();
                          openFiles.forEach(f => virtualFS.closeTab(f.id));
                        }}
                        modifiedTabs={modifiedFiles}
                        aiGeneratedTabs={aiGeneratedFiles}
                      />

                      {/* Code Editor */}
                      <div className="flex-1">
                        {(() => {
                          const activeFile = virtualFS.getActiveFile();
                          if (activeFile) {
                            const lang = (['javascript', 'typescript', 'html', 'css', 'json'].includes(activeFile.language)
                              ? (activeFile.language === 'typescript' ? 'javascript' : activeFile.language)
                              : 'javascript') as 'javascript' | 'html' | 'css' | 'json';
                            return (
                              <CodeMirrorEditor
                                height="100%"
                                language={lang}
                                value={activeFile.content}
                                onChange={(value) => {
                                  virtualFS.updateFileContent(activeFile.id, value);
                                  trackFileModification(activeFile.id, value);
                                }}
                                theme="vs-dark"
                                isAIProcessing={templateState.isRendering}
                                options={{
                                  minimap: { enabled: true },
                                  fontSize: 14,
                                  lineNumbers: 'on',
                                  roundedSelection: true,
                                  scrollBeyondLastLine: false,
                                  automaticLayout: true,
                                  tabSize: 2,
                                  wordWrap: 'on',
                                  formatOnPaste: true,
                                  formatOnType: true,
                                  suggestOnTriggerCharacters: true,
                                  quickSuggestions: true,
                                }}
                                className="w-full h-full"
                              />
                            );
                          }
                          // Show empty state with options when no files exist
                          if (!virtualFS.hasFiles) {
                            return (
                              <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-[#1a1a1a] p-8">
                                <div className="text-center max-w-md">
                                  <h3 className="text-xl font-semibold text-white mb-2">No Project Loaded</h3>
                                  <p className="text-sm mb-6">Load a template or generate code with AI to get started</p>
                                  <div className="flex gap-3 justify-center flex-wrap">
                                    <Button
                                      variant="outline"
                                      onClick={() => virtualFS.loadDefaultTemplate()}
                                      className="gap-2"
                                    >
                                      <Layout className="w-4 h-4" />
                                      Load React Template
                                    </Button>
                                    <Button
                                      variant="default"
                                      onClick={() => {
                                        // Create a simple starter file
                                        virtualFS.importFiles({
                                          '/src/App.tsx': `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Hello World</h1>
        <p className="text-gray-600">Start editing to build something amazing!</p>
      </div>
    </div>
  );
}`,
                                        });
                                      }}
                                      className="gap-2"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Create New File
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-[#1a1a1a]">
                              <p className="text-lg font-medium">No file selected</p>
                              <p className="text-sm mt-1">Select a file from the explorer to start editing</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            )}

            {/* Split Mode - Live Preview + Code Editor */}
            {viewMode === 'split' && (
              <div className="w-full h-full flex gap-4">
                {/* Live Preview - Main viewing area */}
                <div className="flex-1 bg-white rounded-lg overflow-hidden border border-white/10 shadow-2xl relative flex flex-col">
                  <div className="h-10 bg-muted border-b flex items-center px-4 flex-shrink-0">
                    <Eye className="w-4 h-4 text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">Live Preview - AI Generated Template</span>
                  </div>
                  <div 
                    ref={splitViewDropZoneRef}
                    data-drop-zone="true"
                    className="flex-1 flex flex-col min-h-0 overflow-hidden"
                  >
                    {/* Both modes use SimplePreview for consistent rendering */}
                    <SimplePreview
                      ref={simplePreviewRef}
                      code={previewCode}
                      className="w-full h-full min-h-0 flex-1"
                      showToolbar={false}
                      enableSelection={builderMode === 'select'}
                      onElementSelect={builderMode === 'select' ? (el) => {
                        setSelectedHTMLElement({
                          tagName: el.tagName,
                          textContent: el.textContent,
                          styles: el.styles,
                          attributes: el.attributes,
                          selector: el.selector,
                          html: el.html,
                          section: el.section,
                        });
                      } : undefined}
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
                      <CodeMirrorEditor
                        height="100%"
                        language="javascript"
                        value={editorCode}
                        onChange={(value) => {
                          setEditorCode(value || '');
                          setPreviewCode(value || '');
                        }}
                        theme="vs-dark"
                        isAIProcessing={templateState.isRendering}
                        options={{
                          minimap: { enabled: true },
                          fontSize: 13,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          tabSize: 2,
                          wordWrap: 'on',
                          suggestOnTriggerCharacters: true,
                          quickSuggestions: true,
                          formatOnPaste: true,
                          formatOnType: true,
                        }}
                      />
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
                          navigator.clipboard.writeText(editorCode);
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

          {/* Bottom Controls - Zoom and Pan Reset */}
          <div className="h-12 border-t border-white/10 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="text-white/70 hover:text-white h-8 w-8 p-0"
                title="Zoom out (or use scroll wheel)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-white/50 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="text-white/70 hover:text-white h-8 w-8 p-0"
                title="Zoom in (or use scroll wheel)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setZoom(0.5);
                  setPanOffset({ x: 0, y: 0 });
                  if (fabricCanvas) {
                    fabricCanvas.setZoom(0.5);
                    fabricCanvas.renderAll();
                  }
                }}
                className="text-white/70 hover:text-white text-xs"
                title="Reset zoom and pan"
              >
                Reset View
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel Toggle */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-12 w-6 rounded-l-md rounded-r-none bg-[#1a1a1a] border-r-0 border border-white/10 text-white/70 hover:text-white hover:bg-[#252525]"
            title={rightPanelCollapsed ? "Show right panel" : "Hide right panel"}
          >
            {rightPanelCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Right Panel: Customizer OR Properties */}
        {!rightPanelCollapsed && (
          previewCode && !selectedObject ? (
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
          )
        )}

        {/* Floating Element Toolbar - appears over selected elements */}
        {selectedHTMLElement && viewMode === 'canvas' && builderMode === 'select' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <ElementFloatingToolbar
              element={selectedHTMLElement}
              onUpdateStyles={handleFloatingStyleUpdate}
              onUpdateText={handleFloatingTextUpdate}
              onReplaceImage={handleFloatingImageReplace}
              onDelete={(selector) => {
                if (simplePreviewRef.current) {
                  simplePreviewRef.current.deleteElement(selector);
                  setSelectedHTMLElement(null);
                }
              }}
              onDuplicate={(selector) => {
                if (simplePreviewRef.current) {
                  simplePreviewRef.current.duplicateElement(selector);
                }
              }}
              onClear={() => { setSelectedHTMLElement(null); setAiEditRequested(false); }}
              onRequestAI={() => setAiEditRequested(true)}
            />
          </div>
        )}
      </div>

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
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-[#1a1a1a] border-l border-white/10 shadow-2xl z-50 flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-white">Performance</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPerformancePanelOpen(false)}
              className="text-white/70 hover:text-white"
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
        <DialogContent className="max-w-6xl h-[90vh] bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live HTML Preview
              </span>
              {templateState.isRendering && (
                <span className="text-xs text-white/50">Rendering...</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <SecureIframePreview
              html={sanitizeHTML(templateState.html)}
              css={templateState.css}
              className="w-full h-full border border-white/10 rounded bg-white"
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
        <DialogContent className="bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
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
                  <span className="text-white/70">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-white/90 text-xs font-mono">
                    {parts.join("+")}
                  </kbd>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Code Assistant */}
      <AICodeAssistant
        fabricCanvas={fabricCanvas}
        currentCode={previewCode}
        systemType={activeSystemType}
        templateName={currentTemplateName}
        templateCtaAnalysis={templateCtaAnalysis}
        pageStructureContext={pageStructureContext}
        backendStateContext={backendStateContext}
        businessDataContext={businessDataContext}
        selectedElement={
          aiEditRequested && selectedHTMLElement?.selector && selectedHTMLElement?.html
            ? {
                selector: selectedHTMLElement.selector,
                html: selectedHTMLElement.html,
                section: selectedHTMLElement.section,
              }
            : undefined
        }
        requestAIEdit={aiEditRequested}
        onAIEditDismissed={() => setAiEditRequested(false)}
        onElementUpdate={(selector, newHtml) => {
          const res = applyElementHtmlUpdate(previewCode, selector, newHtml);
          if (!res.ok) {
            toast.error('Section redesign currently supports HTML templates only (not React/TSX).');
            return false;
          }
          setEditorCode(res.code);
          setPreviewCode(res.code);
          toast.success('Section redesigned');
          return true;
        }}
        onCodeGenerated={(code) => {
          console.log('[WebBuilder] ========== AI CODE GENERATED ==========');
          console.log('[WebBuilder] Code length:', code.length);
          console.log('[WebBuilder] Code preview:', code.substring(0, 200));
          
          // Set the code - SimplePreview will render it directly
          setEditorCode(code);
          setPreviewCode(code);
          
          // Switch to canvas view to show the preview
          setViewMode('canvas');
          
          toast.success('Code Generated!', {
            description: 'Your AI-generated content is now in the preview'
          });
        }}
        onFilesPatch={(files) => {
          if (!files || Object.keys(files).length === 0) return false;

          virtualFS.importFiles(files);

          const entry = files["/index.html"] || files["/src/App.tsx"] || files["/App.tsx"];
          if (entry) {
            setEditorCode(entry);
            setPreviewCode(entry);
          }

          setViewMode('canvas');
          toast.success('Files updated', { description: 'Approved patch plan applied to project files' });
          return true;
        }}
        onSwitchToCanvasView={() => {
          setViewMode('canvas');
        }}
      />

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
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base">
              {templateFiles.currentTemplateId ? 'Update Template' : 'Save to Projects'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {templateFiles.currentTemplateId 
                ? `Updating "${currentTemplateName}" - or save as a new template`
                : 'Save your current template design to access it later'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-3">
            {templateFiles.currentTemplateId && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/10 rounded-md text-xs text-primary">
                <Cloud className="h-3 w-3" />
                <span>Editing: {currentTemplateName}</span>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="project-name" className="text-xs">Name *</Label>
              <Input
                id="project-name"
                value={saveProjectName}
                onChange={(e) => setSaveProjectName(e.target.value)}
                placeholder="My Template Design"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project-description" className="text-xs">Description</Label>
              <Textarea
                id="project-description"
                value={saveProjectDescription}
                onChange={(e) => setSaveProjectDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setSaveProjectDialogOpen(false)}>
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
    </div>
  );
};
