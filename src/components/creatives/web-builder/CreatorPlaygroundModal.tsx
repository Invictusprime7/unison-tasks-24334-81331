/**
 * CreatorPlaygroundModal — Full Creator's Playground as a large centered dialog
 * with internal sidebar navigation + content area.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, ShoppingBag, Briefcase, GitBranch, Settings,
  Plus, Trash2, Copy, Home, Eye, EyeOff, GripVertical,
  ArrowRight, ChevronDown, ChevronUp, Star, FormInput,
  Gauge, Zap, Rocket, Link2, ShieldCheck, AlertTriangle,
  CheckCircle, Info, XCircle, Calendar, MessageSquare,
} from "lucide-react";
import { SetupWizardPanel } from "./setup-wizard/SetupWizardPanel";
import { useSetupWizard } from "@/hooks/useSetupWizard";
import { cn } from "@/lib/utils";
import type { UseCreatorPlaygroundReturn } from "@/hooks/useCreatorPlayground";
import type { BuilderPageType, FunnelRole } from "@/types/pageRegistry";
import type { PlaygroundBinding, PlaygroundValidation, PlaygroundState, PlaygroundCalendar, PlaygroundPopup } from "@/types/playground";
import { validatePlayground, getValidationSummary } from "@/services/playgroundValidationService";

// ============================================================================
// Constants
// ============================================================================

const PAGE_TYPE_OPTIONS: { value: BuilderPageType; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "landing", label: "Landing" },
  { value: "about", label: "About" },
  { value: "contact", label: "Contact" },
  { value: "shop", label: "Shop" },
  { value: "product", label: "Product" },
  { value: "checkout", label: "Checkout" },
  { value: "cart", label: "Cart" },
  { value: "thankyou", label: "Thank You" },
  { value: "booking", label: "Booking" },
  { value: "gallery", label: "Gallery" },
  { value: "blog", label: "Blog" },
  { value: "faq", label: "FAQ" },
  { value: "pricing", label: "Pricing" },
  { value: "legal", label: "Legal" },
  { value: "custom", label: "Custom" },
];

const FUNNEL_ROLE_OPTIONS: { value: FunnelRole; label: string }[] = [
  { value: "entry", label: "Entry" },
  { value: "offer", label: "Offer" },
  { value: "checkout", label: "Checkout" },
  { value: "upsell", label: "Upsell" },
  { value: "downsell", label: "Downsell" },
  { value: "confirmation", label: "Confirmation" },
  { value: "thankyou", label: "Thank You" },
];

type Section = "pages" | "funnels" | "products" | "services" | "forms" | "calendars" | "popups" | "business" | "overview" | "launch" | "bindings" | "validation";

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType; highlight?: boolean }[] = [
  { id: "launch", label: "Launch Wizard", icon: Rocket, highlight: true },
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "funnels", label: "Funnels", icon: GitBranch },
  { id: "forms", label: "Forms", icon: FormInput },
  { id: "calendars", label: "Calendars", icon: Calendar },
  { id: "products", label: "Products", icon: ShoppingBag },
  { id: "popups", label: "Popups", icon: MessageSquare },
  { id: "services", label: "Services", icon: Briefcase },
  { id: "bindings", label: "Bindings", icon: Link2 },
  { id: "validation", label: "Validation", icon: ShieldCheck },
  { id: "business", label: "Business Info", icon: Settings },
];

// ============================================================================
// Props
// ============================================================================

interface CreatorPlaygroundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playground: UseCreatorPlaygroundReturn;
  onPageSelect?: (pageId: string) => void;
  /** Called after a page is added via the playground — wire to VFS file creation */
  onPageAdd?: (pageId: string, title: string, path: string, pageType: BuilderPageType) => void;
  /** Called after a page is removed — wire to VFS file deletion */
  onPageRemove?: (pageId: string, path: string) => void;
  /** Called after a funnel is created with auto-generated steps — wire to VFS scaffolding */
  onFunnelCreate?: (funnelId: string, stepPages: { pageId: string; title: string; path: string; role: FunnelRole }[]) => void;
  businessId?: string | null;
  initialSection?: Section;
  /** Bindings from playground materializer */
  bindings?: Record<string, PlaygroundBinding>;
  /** Calendars from playground materializer */
  calendars?: Record<string, PlaygroundCalendar>;
  /** Popups from playground materializer */
  popups?: Record<string, PlaygroundPopup>;
  /** VFS files for validation context */
  vfsFiles?: Record<string, string>;
}

// ============================================================================
// Component
// ============================================================================

export function CreatorPlaygroundModal({
  open,
  onOpenChange,
  playground,
  onPageSelect,
  onPageAdd,
  onPageRemove,
  onFunnelCreate,
  businessId = null,
  initialSection,
  bindings = {},
  calendars = {},
  popups = {},
  vfsFiles = {},
}: CreatorPlaygroundModalProps) {
  const [activeSection, setActiveSection] = useState<Section>(initialSection || "overview");
  const setupWizard = useSetupWizard(businessId);

  // Build playground state for validation
  const playgroundState: PlaygroundState = useMemo(() => ({
    creatorData: playground.creatorData,
    pageRegistry: playground.pageRegistry,
    bindings,
    calendars: {},
    popups: {},
  }), [playground.creatorData, playground.pageRegistry, bindings]);

  const validations = useMemo(() => validatePlayground(playgroundState, vfsFiles), [playgroundState, vfsFiles]);
  const validationSummary = useMemo(() => getValidationSummary(validations), [validations]);

  // Allow external callers to set the initial section
  useEffect(() => {
    if (initialSection && open) {
      setActiveSection(initialSection);
    }
  }, [initialSection, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[92vw] h-[82vh] flex flex-col p-0 gap-0 bg-[#09090f] border border-emerald-500/30 shadow-[0_0_60px_rgba(0,200,100,0.12)] overflow-hidden [&>button]:text-emerald-400 [&>button]:hover:text-white">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b border-emerald-500/20 bg-[#0a0a14] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 shadow-[0_0_12px_rgba(0,200,100,0.3)]">
                <Zap className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-emerald-400 tracking-wide">
                  Creator's Playground
                </DialogTitle>
                <p className="text-[10px] text-emerald-400/50 mt-0.5">
                  Site management • Pages • Funnels • Content
                </p>
              </div>
            </div>
            {playground.isDirty && (
              <Badge variant="outline" className="text-[10px] h-5 px-2 border-amber-500/50 text-amber-400 bg-amber-500/10">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1 min-h-0">
          {/* Internal Sidebar */}
          <nav className="w-48 flex-shrink-0 border-r border-emerald-500/15 bg-[#0a0a12] py-2">
            {NAV_ITEMS.map(({ id, label, icon: Icon, highlight }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-all duration-150",
                  activeSection === id
                    ? highlight
                      ? "bg-violet-500/15 text-violet-400 border-r-2 border-violet-400 shadow-[inset_-8px_0_20px_rgba(139,92,246,0.05)]"
                      : "bg-emerald-500/15 text-emerald-400 border-r-2 border-emerald-400 shadow-[inset_-8px_0_20px_rgba(0,200,100,0.05)]"
                    : highlight
                      ? "text-violet-400/70 hover:text-violet-400 hover:bg-violet-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
                {id === "launch" && setupWizard.completedCount < setupWizard.totalCount && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-violet-500/40 text-violet-400 bg-violet-500/10">
                    {setupWizard.completedCount}/{setupWizard.totalCount}
                  </Badge>
                )}
                {id === "pages" && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-border/40">
                    {playground.getAllPages().length}
                  </Badge>
                )}
                {id === "funnels" && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-border/40">
                    {Object.keys(playground.pageRegistry.funnels).length}
                  </Badge>
                )}
                {id === "products" && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-border/40">
                    {Object.keys(playground.creatorData.products).length}
                  </Badge>
                )}
                {id === "bindings" && Object.keys(bindings).length > 0 && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-border/40">
                    {Object.keys(bindings).length}
                  </Badge>
                )}
                {id === "validation" && validationSummary.errors > 0 && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-red-500/40 text-red-400 bg-red-500/10">
                    {validationSummary.errors}
                  </Badge>
                )}
                {id === "validation" && validationSummary.errors === 0 && validationSummary.warnings > 0 && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-amber-500/40 text-amber-400 bg-amber-500/10">
                    {validationSummary.warnings}
                  </Badge>
                )}
              </button>
            ))}
          </nav>

          {/* Content Area */}
          <div className="flex-1 min-w-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-5">
                {activeSection === "launch" && <SetupWizardPanel wizard={setupWizard} businessId={businessId} />}
                {activeSection === "overview" && <OverviewSection playground={playground} onNavigate={setActiveSection} />}
                {activeSection === "pages" && <PagesSection playground={playground} onPageSelect={onPageSelect} onPageAdd={onPageAdd} onPageRemove={onPageRemove} />}
                {activeSection === "funnels" && <FunnelsSection playground={playground} onFunnelCreate={onFunnelCreate} />}
                {activeSection === "products" && <ProductsSection playground={playground} />}
                {activeSection === "services" && <ServicesSection playground={playground} />}
                {activeSection === "forms" && <FormsSection playground={playground} />}
                {activeSection === "bindings" && <BindingsSection bindings={bindings} registry={playground.pageRegistry} />}
                {activeSection === "validation" && <ValidationSection validations={validations} summary={validationSummary} />}
                {activeSection === "business" && <BusinessSection playground={playground} />}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Section: Overview
// ============================================================================

function OverviewSection({ playground, onNavigate }: { playground: UseCreatorPlaygroundReturn; onNavigate: (s: Section) => void }) {
  const pages = playground.getAllPages();
  const funnels = Object.values(playground.pageRegistry.funnels);
  const products = Object.values(playground.creatorData.products);
  const services = Object.values(playground.creatorData.services);
  const forms = Object.values(playground.creatorData.forms);

  const cards = [
    { section: "pages" as Section, label: "Pages", count: pages.length, icon: FileText, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { section: "funnels" as Section, label: "Funnels", count: funnels.length, icon: GitBranch, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
    { section: "products" as Section, label: "Products", count: products.length, icon: ShoppingBag, color: "text-amber-400", bg: "bg-amber-500/10" },
    { section: "services" as Section, label: "Services", count: services.length, icon: Briefcase, color: "text-lime-400", bg: "bg-lime-500/10" },
    { section: "forms" as Section, label: "Forms", count: forms.length, icon: FormInput, color: "text-violet-400", bg: "bg-violet-500/10" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Site Overview</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {playground.creatorData.businessInfo.businessName || "Your site"} — manage all pages, funnels, and content from here.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map(({ section, label, count, icon: Icon, color, bg }) => (
          <button
            key={section}
            onClick={() => onNavigate(section)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40 transition-all text-left group"
            )}
          >
            <div className={cn("p-2 rounded-lg", bg)}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{count}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          </button>
        ))}
      </div>

      {playground.lastHydration && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Last Hydration</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
            <span>Pages: {playground.lastHydration.stats.pagesDetected}</span>
            <span>Products: {playground.lastHydration.stats.productsExtracted}</span>
            <span>Services: {playground.lastHydration.stats.servicesExtracted}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Section: Pages
// ============================================================================

function PagesSection({ playground, onPageSelect, onPageAdd, onPageRemove }: { 
  playground: UseCreatorPlaygroundReturn; 
  onPageSelect?: (id: string) => void;
  onPageAdd?: (pageId: string, title: string, path: string, pageType: BuilderPageType) => void;
  onPageRemove?: (pageId: string, path: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newPath, setNewPath] = useState("");
  const [newType, setNewType] = useState<BuilderPageType>("custom");
  const allPages = playground.getAllPages().sort((a, b) => a.navOrder - b.navOrder);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const path = newPath.trim() || `/${newTitle.toLowerCase().replace(/\s+/g, "-")}`;
    const page = playground.addPage(newTitle.trim(), path, newType);
    setNewTitle("");
    setNewPath("");
    setNewType("custom");
    onPageAdd?.(page.pageId, page.title, page.path, page.pageType);
    onPageSelect?.(page.pageId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Pages</h2>
        <Badge variant="outline" className="text-[10px]">{allPages.length} pages</Badge>
      </div>

      {/* Add Page */}
      <div className="flex gap-2 p-3 rounded-lg border border-border/30 bg-muted/10">
        <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Page title..." className="h-8 text-xs flex-1 bg-background/50" onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <Input value={newPath} onChange={e => setNewPath(e.target.value)} placeholder="/path (auto)" className="h-8 text-xs w-32 bg-background/50" />
        <Select value={newType} onValueChange={v => setNewType(v as BuilderPageType)}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{PAGE_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()} className="h-8 px-3"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
      </div>

      {/* Page List */}
      <div className="space-y-1">
        {allPages.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No pages yet. Add your first page above.</p>}
        {allPages.map(page => (
          <div
            key={page.pageId}
            className="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors border border-transparent hover:border-border/30"
            onClick={() => onPageSelect?.(page.pageId)}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{page.title}</span>
                {page.isHome && <Home className="h-3 w-3 text-amber-400 flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono truncate">{page.path}</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">{page.pageType}</Badge>
                {page.funnelRole && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{page.funnelRole}</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); playground.updatePage(page.pageId, { showInNav: !page.showInNav }); }}>
                {page.showInNav ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
              </Button>
              {!page.isHome && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); playground.setHomePage(page.pageId); }}><Star className="h-3 w-3" /></Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); playground.duplicatePage(page.pageId); }}><Copy className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); playground.removePage(page.pageId); onPageRemove?.(page.pageId, page.path); }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Section: Funnels
// ============================================================================

function FunnelsSection({ playground, onFunnelCreate }: { 
  playground: UseCreatorPlaygroundReturn;
  onFunnelCreate?: (funnelId: string, stepPages: { pageId: string; title: string; path: string; role: FunnelRole }[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [expandedFunnel, setExpandedFunnel] = useState<string | null>(null);
  const funnels = Object.values(playground.pageRegistry.funnels);
  const allPages = playground.getAllPages().sort((a, b) => a.navOrder - b.navOrder);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const f = playground.addFunnel(newName.trim());
    setNewName("");
    setExpandedFunnel(f.funnelId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Funnels</h2>
        <Badge variant="outline" className="text-[10px]">{funnels.length} funnels</Badge>
      </div>

      <div className="flex gap-2 p-3 rounded-lg border border-border/30 bg-muted/10">
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Funnel name..." className="h-8 text-xs flex-1 bg-background/50" onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <Button size="sm" onClick={handleAdd} disabled={!newName.trim()} className="h-8 px-3"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
      </div>

      <div className="space-y-2">
        {funnels.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No funnels yet. Create one to define multi-page flows.</p>}
        {funnels.map(funnel => (
          <div key={funnel.funnelId} className="rounded-xl border border-border/30 overflow-hidden">
            <div
              className="flex items-center gap-2.5 px-4 py-3 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedFunnel(expandedFunnel === funnel.funnelId ? null : funnel.funnelId)}
            >
              <GitBranch className="h-4 w-4 text-fuchsia-400 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{funnel.name}</span>
              <Badge variant="outline" className="text-[10px] h-5 px-2">{funnel.steps.length} steps</Badge>
              {expandedFunnel === funnel.funnelId ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); playground.removeFunnel(funnel.funnelId); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {expandedFunnel === funnel.funnelId && (
              <div className="px-4 py-3 space-y-2 bg-background/30">
                {funnel.steps.sort((a, b) => a.sortOrder - b.sortOrder).map((step, idx) => {
                  const page = playground.pageRegistry.pages[step.pageId];
                  return (
                    <div key={step.stepId} className="flex items-center gap-2">
                      {idx > 0 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />}
                      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 text-sm">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{step.role}</Badge>
                        <span className="truncate">{page?.title || step.pageId}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => playground.removeFunnelStep(funnel.funnelId, step.stepId)}>
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  );
                })}

                {allPages.length > 0 && (
                  <AddFunnelStepInline
                    pages={allPages}
                    existingPageIds={funnel.steps.map(s => s.pageId)}
                    onAdd={(pageId, role) => playground.addFunnelStep(funnel.funnelId, pageId, role)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Section: Products
// ============================================================================

function ProductsSection({ playground }: { playground: UseCreatorPlaygroundReturn }) {
  const products = Object.values(playground.creatorData.products);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Products</h2>
        <Button size="sm" onClick={() => playground.addProduct({ name: "New Product", price: 0, currency: "USD", inStock: true })} className="h-8 px-3">
          <Plus className="h-3.5 w-3.5 mr-1" />Add Product
        </Button>
      </div>
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No products yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {products.map(p => (
            <div key={p.productId} className="group flex items-center justify-between p-3 rounded-lg border border-border/30 hover:border-border/50 bg-muted/10 transition-colors">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">${p.price} {p.currency}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => playground.removeProduct(p.productId)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Section: Services
// ============================================================================

function ServicesSection({ playground }: { playground: UseCreatorPlaygroundReturn }) {
  const services = Object.values(playground.creatorData.services);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Services</h2>
        <Button size="sm" onClick={() => playground.addService({ name: "New Service", bookable: false })} className="h-8 px-3">
          <Plus className="h-3.5 w-3.5 mr-1" />Add Service
        </Button>
      </div>
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No services yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {services.map(s => (
            <div key={s.serviceId} className="group flex items-center justify-between p-3 rounded-lg border border-border/30 hover:border-border/50 bg-muted/10 transition-colors">
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                {s.price && <div className="text-xs text-muted-foreground">${s.price}</div>}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => playground.removeService(s.serviceId)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Section: Forms
// ============================================================================

function FormsSection({ playground }: { playground: UseCreatorPlaygroundReturn }) {
  const forms = Object.values(playground.creatorData.forms);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Forms</h2>
        <Button size="sm" onClick={() => playground.addForm({ name: "New Form", fields: [{ fieldId: "f1", label: "Email", type: "email", required: true, sortOrder: 0 }], submitLabel: "Submit", successMessage: "Thanks!" })} className="h-8 px-3">
          <Plus className="h-3.5 w-3.5 mr-1" />Add Form
        </Button>
      </div>
      {forms.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No forms yet.</p>
      ) : (
        <div className="space-y-2">
          {forms.map(f => (
            <div key={f.formId} className="group flex items-center justify-between p-3 rounded-lg border border-border/30 hover:border-border/50 bg-muted/10 transition-colors">
              <div>
                <div className="text-sm font-medium">{f.name}</div>
                <div className="text-xs text-muted-foreground">{f.fields?.length || 0} fields</div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => playground.removeForm(f.formId)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Section: Business Info
// ============================================================================

function BusinessSection({ playground }: { playground: UseCreatorPlaygroundReturn }) {
  const info = playground.creatorData.businessInfo;
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-foreground">Business Info</h2>
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Name</label>
          <Input value={info.businessName} onChange={e => playground.updateBusinessInfo({ businessName: e.target.value })} className="h-9 text-sm" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tagline</label>
          <Input value={info.tagline || ""} onChange={e => playground.updateBusinessInfo({ tagline: e.target.value })} className="h-9 text-sm" placeholder="Your catchy tagline..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</label>
          <Input value={info.phone || ""} onChange={e => playground.updateBusinessInfo({ phone: e.target.value })} className="h-9 text-sm" placeholder="(555) 123-4567" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
          <Input value={info.email || ""} onChange={e => playground.updateBusinessInfo({ email: e.target.value })} className="h-9 text-sm" placeholder="hello@business.com" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</label>
          <Input value={info.address || ""} onChange={e => playground.updateBusinessInfo({ address: e.target.value })} className="h-9 text-sm" placeholder="123 Main St, City, State" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AddFunnelStepInline
// ============================================================================

function AddFunnelStepInline({ pages, existingPageIds, onAdd }: {
  pages: Array<{ pageId: string; title: string }>;
  existingPageIds: string[];
  onAdd: (pageId: string, role: FunnelRole) => void;
}) {
  const [selectedPage, setSelectedPage] = useState("");
  const [selectedRole, setSelectedRole] = useState<FunnelRole>("offer");
  const available = pages.filter(p => !existingPageIds.includes(p.pageId));

  if (available.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-border/20">
      <Select value={selectedPage} onValueChange={setSelectedPage}>
        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Add page..." /></SelectTrigger>
        <SelectContent>{available.map(p => <SelectItem key={p.pageId} value={p.pageId} className="text-xs">{p.title}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={selectedRole} onValueChange={v => setSelectedRole(v as FunnelRole)}>
        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
        <SelectContent>{FUNNEL_ROLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" className="h-7 px-2" disabled={!selectedPage} onClick={() => { onAdd(selectedPage, selectedRole); setSelectedPage(""); }}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}


// ============================================================================
// Section: Bindings
// ============================================================================

const INTENT_LABELS: Record<string, string> = {
  'nav.goto_page': 'Navigate',
  'funnel.goto_step': 'Funnel Step',
  'form.open': 'Open Form',
  'popup.open': 'Open Popup',
  'calendar.open': 'Open Calendar',
  'checkout.start': 'Start Checkout',
  'product.view': 'View Product',
  'external.open': 'External Link',
};

function BindingsSection({ bindings, registry }: { bindings: Record<string, PlaygroundBinding>; registry: import("@/types/pageRegistry").PageRegistry }) {
  const bindingList = Object.values(bindings);
  const getPageTitle = (pageId: string) => registry.pages[pageId]?.title || pageId;

  if (bindingList.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Bindings / Actions</h3>
        <p className="text-xs text-muted-foreground">No bindings configured yet. Bindings are auto-created when pages are generated via the Wizard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Bindings / Actions</h3>
      <p className="text-[10px] text-muted-foreground mb-2">
        Shows how pages talk to each other — CTAs, navigation, form triggers, and funnel steps.
      </p>
      <div className="space-y-1.5">
        {bindingList.map(b => (
          <div key={b.bindingId} className="flex items-center gap-2 p-2 rounded-md border border-border/40 bg-muted/10 text-xs">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-foreground font-medium truncate">{getPageTitle(b.sourcePageId)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-500/30 text-emerald-400">
                  {INTENT_LABELS[b.intent] || b.intent}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground truncate">
                  {b.targetType === 'page' ? getPageTitle(b.targetId) : b.targetId}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-muted-foreground">"{b.sourceLabel}"</span>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-muted-foreground capitalize">{b.targetType}</span>
                <span className="text-muted-foreground/50">•</span>
                <span className={cn("text-[9px]", b.confidence >= 0.8 ? "text-emerald-400" : b.confidence >= 0.5 ? "text-amber-400" : "text-red-400")}>
                  {(b.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            </div>
            {b.isValid ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Section: Validation
// ============================================================================

function ValidationSection({ validations, summary }: { validations: PlaygroundValidation[]; summary: ReturnType<typeof getValidationSummary> }) {
  const severityIcon = (sev: PlaygroundValidation['severity']) => {
    switch (sev) {
      case 'error': return <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />;
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />;
      case 'info': return <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Site Validation</h3>

      {/* Summary */}
      <div className="flex gap-3 mb-3">
        <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium", summary.isHealthy ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30")}>
          {summary.isHealthy ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {summary.isHealthy ? 'Healthy' : `${summary.errors} Error${summary.errors !== 1 ? 's' : ''}`}
        </div>
        {summary.warnings > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-3.5 w-3.5" />
            {summary.warnings} Warning{summary.warnings !== 1 ? 's' : ''}
          </div>
        )}
        {summary.info > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Info className="h-3.5 w-3.5" />
            {summary.info} Info
          </div>
        )}
      </div>

      {validations.length === 0 ? (
        <p className="text-xs text-muted-foreground">No validation issues detected. Your site structure is clean.</p>
      ) : (
        <div className="space-y-1.5">
          {validations.map(v => (
            <div key={v.id} className={cn(
              "flex items-start gap-2 p-2 rounded-md border text-xs",
              v.severity === 'error' ? "border-red-500/30 bg-red-500/5" :
              v.severity === 'warning' ? "border-amber-500/30 bg-amber-500/5" :
              "border-blue-500/30 bg-blue-500/5"
            )}>
              {severityIcon(v.severity)}
              <div className="flex-1 min-w-0">
                <div className="text-foreground">{v.message}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 capitalize">{v.scope}</Badge>
                  {v.targetId && <span className="text-muted-foreground text-[9px] truncate">{v.targetId}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CreatorPlaygroundModal;
