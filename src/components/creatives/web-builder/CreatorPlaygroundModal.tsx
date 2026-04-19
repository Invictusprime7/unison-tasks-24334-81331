import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SetupWizardPanel } from "./setup-wizard/SetupWizardPanel";
import { useSetupWizard, type SetupStepId } from "@/hooks/useSetupWizard";
import type { UseCreatorPlaygroundReturn } from "@/hooks/useCreatorPlayground";
import type { BuilderPageType, FunnelRole, PageRegistry } from "@/types/pageRegistry";
import type {
  PlaygroundBinding,
  PlaygroundCalendar,
  PlaygroundIntentDependency,
  PlaygroundIntentReadinessReport,
  PlaygroundPopup,
  PlaygroundSetupField,
  PlaygroundSetupSnapshot,
  PlaygroundState,
  PlaygroundValidation,
  WizardSelections,
} from "@/types/playground";
import { validatePlayground, getValidationSummary } from "@/services/playgroundValidationService";
import { buildIntentReadinessReport } from "@/services/intentReadinessService";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  FormInput,
  Gauge,
  GitBranch,
  GripVertical,
  Home,
  Info,
  Link2,
  MessageSquare,
  Plus,
  Rocket,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";

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

type Section =
  | "launch"
  | "overview"
  | "pages"
  | "funnels"
  | "intent_registry"
  | "readiness"
  | "forms"
  | "calendars"
  | "products"
  | "popups"
  | "services"
  | "business";

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType; highlight?: boolean }[] = [
  { id: "launch", label: "Launch Wizard", icon: Rocket, highlight: true },
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "funnels", label: "Funnels", icon: GitBranch },
  { id: "intent_registry", label: "Intent Registry", icon: Link2 },
  { id: "readiness", label: "Readiness", icon: ShieldCheck },
  { id: "forms", label: "Forms", icon: FormInput },
  { id: "calendars", label: "Calendars", icon: Calendar },
  { id: "products", label: "Products", icon: ShoppingBag },
  { id: "popups", label: "Popups", icon: MessageSquare },
  { id: "services", label: "Services", icon: Briefcase },
  { id: "business", label: "Business Setup", icon: Settings },
];

const INTENT_LABELS: Record<string, string> = {
  "nav.goto_page": "Navigate",
  "funnel.goto_step": "Funnel Step",
  "form.open": "Open Form",
  "popup.open": "Open Popup",
  "calendar.open": "Open Calendar",
  "checkout.start": "Start Checkout",
  "product.view": "View Product",
  "external.open": "External Link",
};

const BOOKING_TYPE_LABELS: Record<string, string> = {
  appointment: "Appointment",
  consultation: "Consultation",
  class: "Class",
  reservation: "Reservation",
  general: "General",
};

const POPUP_TRIGGER_LABELS: Record<string, string> = {
  cta_click: "CTA Click",
  timer: "Timer",
  scroll: "Scroll",
  exit_intent: "Exit Intent",
  manual: "Manual",
};

const SETUP_STEP_IDS = new Set<SetupStepId>([
  "booking_calendar",
  "notifications",
  "payments",
  "database",
  "domain",
  "seo",
  "analytics",
]);

interface CreatorPlaygroundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playground: UseCreatorPlaygroundReturn;
  onPageSelect?: (pageId: string) => void;
  onPageAdd?: (pageId: string, title: string, path: string, pageType: BuilderPageType) => void;
  onPageRemove?: (pageId: string, path: string) => void;
  onFunnelCreate?: (funnelId: string, stepPages: { pageId: string; title: string; path: string; role: FunnelRole }[]) => void;
  businessId?: string | null;
  initialSection?: Section;
  initialBindingId?: string;
  initialSetupField?: PlaygroundSetupField;
  bindings?: Record<string, PlaygroundBinding>;
  calendars?: Record<string, PlaygroundCalendar>;
  popups?: Record<string, PlaygroundPopup>;
  vfsFiles?: Record<string, string>;
  setupSnapshot?: PlaygroundSetupSnapshot;
  wizardSelections?: WizardSelections | null;
}

function formatIntentPackLabel(wizardSelections?: WizardSelections | null): string | null {
  if (!wizardSelections) return null;
  const source = wizardSelections.industryOverlay !== "general"
    ? wizardSelections.industryOverlay
    : wizardSelections.businessModel;
  return `${source.split("_").map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(" ")} Pack`;
}

function getReadinessBadgeClass(status?: PlaygroundBinding["previewStatus"]) {
  switch (status) {
    case "ready":
      return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
    case "partial":
      return "border-amber-500/30 text-amber-400 bg-amber-500/10";
    case "blocked":
      return "border-red-500/30 text-red-400 bg-red-500/10";
    default:
      return "border-border/40 text-muted-foreground";
  }
}

function getPageTitle(registry: PageRegistry, pageId: string) {
  return registry.pages[pageId]?.title || pageId;
}

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
  initialBindingId,
  initialSetupField,
  bindings = {},
  calendars = {},
  popups = {},
  vfsFiles = {},
  setupSnapshot,
  wizardSelections = null,
}: CreatorPlaygroundModalProps) {
  const [activeSection, setActiveSection] = useState<Section>(initialSection || "overview");
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(initialBindingId || null);
  const [businessFocusField, setBusinessFocusField] = useState<PlaygroundSetupField | null>(initialSetupField || null);
  const setupWizard = useSetupWizard(businessId);

  const playgroundState: PlaygroundState = useMemo(() => ({
    creatorData: playground.creatorData,
    pageRegistry: playground.pageRegistry,
    bindings,
    calendars,
    popups,
  }), [bindings, calendars, playground.creatorData, playground.pageRegistry, popups]);

  const validations = useMemo(() => validatePlayground(playgroundState, vfsFiles), [playgroundState, vfsFiles]);
  const validationSummary = useMemo(() => getValidationSummary(validations), [validations]);
  const readinessReport = useMemo<PlaygroundIntentReadinessReport>(() => buildIntentReadinessReport(
    playgroundState,
    validations,
    {
      ...setupSnapshot,
      setupSteps: setupWizard.steps.map((step) => ({
        id: step.id,
        status: step.status,
        config: step.config,
      })),
    },
  ), [playgroundState, setupSnapshot, setupWizard.steps, validations]);

  useEffect(() => {
    if (open && initialSection) setActiveSection(initialSection);
  }, [initialSection, open]);

  useEffect(() => {
    if (open && initialBindingId) {
      setSelectedBindingId(initialBindingId);
      setActiveSection("intent_registry");
    }
  }, [initialBindingId, open]);

  useEffect(() => {
    if (open && initialSetupField) {
      setBusinessFocusField(initialSetupField);
      setActiveSection("business");
    }
  }, [initialSetupField, open]);

  const handleResolveDependency = (dependency: PlaygroundIntentDependency) => {
    if (
      dependency.resolverSection === "launch" &&
      dependency.resolverStepId &&
      SETUP_STEP_IDS.has(dependency.resolverStepId as SetupStepId)
    ) {
      setupWizard.setActiveStep(dependency.resolverStepId as SetupStepId);
      setActiveSection("launch");
      return;
    }
    if (dependency.resolverSection === "business") {
      if (dependency.resolverField) setBusinessFocusField(dependency.resolverField);
      setActiveSection("business");
      return;
    }
    if (dependency.resolverSection) setActiveSection(dependency.resolverSection);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[92vw] h-[82vh] flex flex-col p-0 gap-0 bg-[#09090f] border border-emerald-500/30 shadow-[0_0_60px_rgba(0,200,100,0.12)] overflow-hidden [&>button]:text-emerald-400 [&>button]:hover:text-white">
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
                  Structure • Behavior • Readiness
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

        <div className="flex flex-1 min-h-0">
          <nav className="w-48 flex-shrink-0 border-r border-emerald-500/15 bg-[#0a0a12] py-2">
            {NAV_ITEMS.map(({ id, label, icon: Icon, highlight }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-all duration-150",
                  activeSection === id
                    ? highlight
                      ? "bg-violet-500/15 text-violet-400 border-r-2 border-violet-400"
                      : "bg-emerald-500/15 text-emerald-400 border-r-2 border-emerald-400"
                    : highlight
                      ? "text-violet-400/70 hover:text-violet-400 hover:bg-violet-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
                {id === "launch" && setupWizard.completedCount < setupWizard.totalCount && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-violet-500/40 text-violet-400 bg-violet-500/10">
                    {setupWizard.completedCount}/{setupWizard.totalCount}
                  </Badge>
                )}
                {id === "pages" && <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-border/40">{playground.getAllPages().length}</Badge>}
                {id === "funnels" && <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-border/40">{Object.keys(playground.pageRegistry.funnels).length}</Badge>}
                {id === "products" && <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-border/40">{Object.keys(playground.creatorData.products).length}</Badge>}
                {id === "intent_registry" && Object.keys(readinessReport.bindings).length > 0 && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-border/40">{Object.keys(readinessReport.bindings).length}</Badge>
                )}
                {id === "readiness" && readinessReport.summary.blocked > 0 && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-red-500/40 text-red-400 bg-red-500/10">{readinessReport.summary.blocked}</Badge>
                )}
                {id === "readiness" && readinessReport.summary.blocked === 0 && readinessReport.summary.previewOnly > 0 && (
                  <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-amber-500/40 text-amber-400 bg-amber-500/10">{readinessReport.summary.previewOnly}</Badge>
                )}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-5">
                {activeSection === "launch" && <SetupWizardPanel wizard={setupWizard} businessId={businessId} />}
                {activeSection === "overview" && (
                  <OverviewSection
                    playground={playground}
                    bindings={readinessReport.bindings}
                    readinessReport={readinessReport}
                    wizardSelections={wizardSelections}
                    validationSummary={validationSummary}
                    onNavigate={setActiveSection}
                  />
                )}
                {activeSection === "pages" && <PagesSection playground={playground} onPageSelect={onPageSelect} onPageAdd={onPageAdd} onPageRemove={onPageRemove} />}
                {activeSection === "funnels" && <FunnelsSection playground={playground} onFunnelCreate={onFunnelCreate} />}
                {activeSection === "products" && <ProductsSection playground={playground} />}
                {activeSection === "services" && <ServicesSection playground={playground} />}
                {activeSection === "forms" && <FormsSection playground={playground} />}
                {activeSection === "calendars" && <CalendarsSection calendars={calendars} registry={playground.pageRegistry} />}
                {activeSection === "popups" && <PopupsSection popups={popups} registry={playground.pageRegistry} />}
                {activeSection === "intent_registry" && (
                  <BindingsSection
                    bindings={readinessReport.bindings}
                    registry={playground.pageRegistry}
                    readinessReport={readinessReport}
                    selectedBindingId={selectedBindingId}
                    onBindingSelect={setSelectedBindingId}
                    onResolveDependency={handleResolveDependency}
                  />
                )}
                {activeSection === "readiness" && (
                  <ReadinessSection
                    validations={validations}
                    summary={validationSummary}
                    readinessReport={readinessReport}
                    registry={playground.pageRegistry}
                    onInspectBinding={(bindingId) => {
                      setSelectedBindingId(bindingId);
                      setActiveSection("intent_registry");
                    }}
                    onResolveDependency={handleResolveDependency}
                  />
                )}
                {activeSection === "business" && (
                  <BusinessSection
                    playground={playground}
                    setupSnapshot={setupSnapshot}
                    focusField={businessFocusField}
                    onFocusHandled={() => setBusinessFocusField(null)}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OverviewSection({
  playground,
  bindings,
  readinessReport,
  wizardSelections,
  validationSummary,
  onNavigate,
}: {
  playground: UseCreatorPlaygroundReturn;
  bindings: Record<string, PlaygroundBinding>;
  readinessReport: PlaygroundIntentReadinessReport;
  wizardSelections?: WizardSelections | null;
  validationSummary: ReturnType<typeof getValidationSummary>;
  onNavigate: (section: Section) => void;
}) {
  const activePackLabel = formatIntentPackLabel(wizardSelections);
  const pages = playground.getAllPages();
  const funnels = Object.values(playground.pageRegistry.funnels);
  const products = Object.values(playground.creatorData.products);
  const forms = Object.values(playground.creatorData.forms);

  const cards = [
    { section: "intent_registry" as Section, label: "Total Intents", count: readinessReport.summary.totalIntents, icon: Link2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { section: "readiness" as Section, label: "Hardened", count: readinessReport.summary.hardened, icon: ShieldCheck, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { section: "readiness" as Section, label: "Preview Only", count: readinessReport.summary.previewOnly, icon: Eye, color: "text-amber-400", bg: "bg-amber-500/10" },
    { section: "readiness" as Section, label: "Blocked", count: readinessReport.summary.blocked, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Site Overview</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {playground.creatorData.businessInfo.businessName || "Your site"} is organized around structure, business behavior, and publish readiness.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ section, label, count, icon: Icon, color, bg }) => (
          <button key={`${section}-${label}`} onClick={() => onNavigate(section)} className="flex items-center gap-3 p-4 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40 transition-all text-left">
            <div className={cn("p-2 rounded-lg", bg)}><Icon className={cn("h-5 w-5", color)} /></div>
            <div>
              <div className="text-2xl font-bold text-foreground">{count}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Behavior Model</h3>
              <p className="text-[11px] text-muted-foreground mt-1">Intent Registry and Readiness are now the primary operating views.</p>
            </div>
            {activePackLabel && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">{activePackLabel}</Badge>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <QuickCountCard label="Pages" count={pages.length} onClick={() => onNavigate("pages")} />
            <QuickCountCard label="Funnels" count={funnels.length} onClick={() => onNavigate("funnels")} />
            <QuickCountCard label="Forms" count={forms.length} onClick={() => onNavigate("forms")} />
            <QuickCountCard label="Products" count={products.length} onClick={() => onNavigate("products")} />
          </div>
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-muted-foreground">
            Active registry: {Object.keys(bindings).length} intent{Object.keys(bindings).length === 1 ? "" : "s"} mapped into the canvas and business graph.
          </div>
        </div>

        <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
          <h3 className="text-sm font-semibold text-foreground">Readiness Snapshot</h3>
          <div className="mt-3 space-y-2 text-xs">
            <SummaryRow label="Preview" value={`${readinessReport.summary.previewReady} ready / ${readinessReport.summary.previewPartial} partial / ${readinessReport.summary.previewBlocked} blocked`} />
            <SummaryRow label="Publish" value={`${readinessReport.summary.publishReady} ready / ${readinessReport.summary.publishPartial} partial / ${readinessReport.summary.publishBlocked} blocked`} />
            <SummaryRow label="Structural Validation" value={`${validationSummary.errors} errors / ${validationSummary.warnings} warnings`} />
          </div>
          <Button variant="outline" size="sm" className="mt-4 h-8 text-xs" onClick={() => onNavigate("readiness")}>Open Readiness</Button>
        </div>
      </div>
    </div>
  );
}

function QuickCountCard({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-border/20 bg-background/30 px-3 py-2 text-left">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{count}</div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/20 bg-background/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function PagesSection({
  playground,
  onPageSelect,
  onPageAdd,
  onPageRemove,
}: {
  playground: UseCreatorPlaygroundReturn;
  onPageSelect?: (pageId: string) => void;
  onPageAdd?: (pageId: string, title: string, path: string, pageType: BuilderPageType) => void;
  onPageRemove?: (pageId: string, path: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newPath, setNewPath] = useState("");
  const [newType, setNewType] = useState<BuilderPageType>("custom");
  const pages = playground.getAllPages().sort((a, b) => a.navOrder - b.navOrder);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const path = newPath.trim() || `/${newTitle.toLowerCase().replace(/\s+/g, "-")}`;
    const page = playground.addPage(newTitle.trim(), path, newType);
    onPageAdd?.(page.pageId, page.title, page.path, page.pageType);
    onPageSelect?.(page.pageId);
    setNewTitle("");
    setNewPath("");
    setNewType("custom");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Pages</h2>
        <Badge variant="outline" className="text-[10px]">{pages.length} pages</Badge>
      </div>

      <div className="flex gap-2 p-3 rounded-lg border border-border/30 bg-muted/10">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Page title..." className="h-8 text-xs flex-1 bg-background/50" />
        <Input value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="/path (auto)" className="h-8 text-xs w-32 bg-background/50" />
        <Select value={newType} onValueChange={(value) => setNewType(value as BuilderPageType)}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{PAGE_TYPE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value} className="text-xs">{option.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()} className="h-8 px-3"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
      </div>

      <div className="space-y-1">
        {pages.map((page) => (
          <div key={page.pageId} className="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/30 cursor-pointer border border-transparent hover:border-border/30" onClick={() => onPageSelect?.(page.pageId)}>
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
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(event) => { event.stopPropagation(); playground.updatePage(page.pageId, { showInNav: !page.showInNav }); }}>
                {page.showInNav ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
              </Button>
              {!page.isHome && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(event) => { event.stopPropagation(); playground.setHomePage(page.pageId); }}><Star className="h-3 w-3" /></Button>}
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(event) => { event.stopPropagation(); playground.removePage(page.pageId); onPageRemove?.(page.pageId, page.path); }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelsSection({ playground, onFunnelCreate }: { playground: UseCreatorPlaygroundReturn; onFunnelCreate?: CreatorPlaygroundModalProps["onFunnelCreate"] }) {
  const [newName, setNewName] = useState("");
  const [expandedFunnel, setExpandedFunnel] = useState<string | null>(null);
  const funnels = Object.values(playground.pageRegistry.funnels);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const funnel = playground.addFunnel(newName.trim(), []);
    onFunnelCreate?.(funnel.funnelId, []);
    setExpandedFunnel(funnel.funnelId);
    setNewName("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-3 rounded-lg border border-border/30 bg-muted/10">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Funnel name..." className="h-8 text-xs flex-1 bg-background/50" />
        <Button size="sm" onClick={handleAdd} disabled={!newName.trim()} className="h-8 px-3"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
      </div>

      <div className="space-y-2">
        {funnels.map((funnel) => (
          <div key={funnel.funnelId} className="rounded-xl border border-border/30 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-muted/20 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedFunnel(expandedFunnel === funnel.funnelId ? null : funnel.funnelId)}>
              <GitBranch className="h-4 w-4 text-fuchsia-400 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{funnel.name}</span>
              <Badge variant="outline" className="text-[10px] h-5 px-2">{funnel.steps.length} steps</Badge>
              {expandedFunnel === funnel.funnelId ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(event) => { event.stopPropagation(); playground.removeFunnel(funnel.funnelId); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {expandedFunnel === funnel.funnelId && (
              <div className="px-4 py-3 space-y-2 bg-background/30">
                {funnel.steps.length === 0 && <p className="text-[11px] text-muted-foreground">No funnel steps added yet.</p>}
                {funnel.steps.sort((a, b) => a.sortOrder - b.sortOrder).map((step, index) => (
                  <div key={step.stepId} className="flex items-center gap-2">
                    {index > 0 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />}
                    <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 text-sm">
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{step.role}</Badge>
                      <span className="truncate">{playground.pageRegistry.pages[step.pageId]?.title || step.pageId}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => playground.removeFunnelStep(funnel.funnelId, step.stepId)}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductsSection({ playground }: { playground: UseCreatorPlaygroundReturn }) {
  const products = Object.values(playground.creatorData.products);
  return <SimpleObjectSection title="Products" empty="No products configured yet." items={products.map((product) => ({ id: product.productId, label: product.name, meta: `$${product.price}` }))} onRemove={(id) => playground.removeProduct(id)} />;
}

function ServicesSection({ playground }: { playground: UseCreatorPlaygroundReturn }) {
  const services = Object.values(playground.creatorData.services);
  return <SimpleObjectSection title="Services" empty="No services configured yet." items={services.map((service) => ({ id: service.serviceId, label: service.name, meta: service.duration ? `${service.duration} min` : "service" }))} onRemove={(id) => playground.removeService(id)} />;
}

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
      <SimpleObjectList items={forms.map((form) => ({ id: form.formId, label: form.name, meta: `${form.fields.length} fields` }))} onRemove={(id) => playground.removeForm(id)} empty="No forms configured yet." />
    </div>
  );
}

function CalendarsSection({ calendars, registry }: { calendars: Record<string, PlaygroundCalendar>; registry: PageRegistry }) {
  const list = Object.values(calendars).sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Calendars</h2>
        <Badge variant="outline" className="text-[10px]">{list.length} calendars</Badge>
      </div>
      {list.map((calendar) => (
        <div key={calendar.calendarId} className="rounded-xl border border-border/30 bg-muted/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10"><Calendar className="h-4 w-4 text-cyan-400" /></div>
            <div>
              <div className="text-sm font-medium text-foreground">{calendar.name}</div>
              <div className="text-[11px] text-muted-foreground">{BOOKING_TYPE_LABELS[calendar.bookingType] || calendar.bookingType} • {calendar.defaultDuration} min</div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Pages: {calendar.attachedPageIds.map((pageId) => getPageTitle(registry, pageId)).join(", ") || "none"}
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="text-sm text-muted-foreground">No calendars configured yet.</p>}
    </div>
  );
}

function PopupsSection({ popups, registry }: { popups: Record<string, PlaygroundPopup>; registry: PageRegistry }) {
  const list = Object.values(popups).sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Popups</h2>
        <Badge variant="outline" className="text-[10px]">{list.length} popups</Badge>
      </div>
      {list.map((popup) => (
        <div key={popup.popupId} className="rounded-xl border border-border/30 bg-muted/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-fuchsia-500/10"><MessageSquare className="h-4 w-4 text-fuchsia-400" /></div>
            <div>
              <div className="text-sm font-medium text-foreground">{popup.name}</div>
              <div className="text-[11px] text-muted-foreground">{POPUP_TRIGGER_LABELS[popup.trigger] || popup.trigger} • {popup.contentType}</div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Active on: {popup.activeOnPageIds.map((pageId) => getPageTitle(registry, pageId)).join(", ") || "none"}
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="text-sm text-muted-foreground">No popups configured yet.</p>}
    </div>
  );
}

function SimpleObjectSection({
  title,
  empty,
  items,
  onRemove,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; label: string; meta: string }>;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <SimpleObjectList items={items} onRemove={onRemove} empty={empty} />
    </div>
  );
}

function SimpleObjectList({
  items,
  onRemove,
  empty,
}: {
  items: Array<{ id: string; label: string; meta: string }>;
  onRemove: (id: string) => void;
  empty: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="group flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/10">
          <div>
            <div className="text-sm font-medium text-foreground">{item.label}</div>
            <div className="text-xs text-muted-foreground">{item.meta}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => onRemove(item.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function BusinessSection({
  playground,
  setupSnapshot,
  focusField,
  onFocusHandled,
}: {
  playground: UseCreatorPlaygroundReturn;
  setupSnapshot?: PlaygroundSetupSnapshot;
  focusField?: PlaygroundSetupField | null;
  onFocusHandled?: () => void;
}) {
  const info = playground.creatorData.businessInfo;
  const fieldRefs = useRef<Partial<Record<PlaygroundSetupField, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (!focusField) return;
    const target = fieldRefs.current[focusField];
    if (target) {
      target.focus();
      target.select();
      onFocusHandled?.();
    }
  }, [focusField, onFocusHandled]);

  const bindFieldRef = (field: PlaygroundSetupField) => (element: HTMLInputElement | null) => {
    fieldRefs.current[field] = element;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Business Setup</h2>
          <p className="text-xs text-muted-foreground mt-1">Resolve operational gaps here so publish readiness has a concrete owner, destination, and provider.</p>
        </div>
        <div className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Publish</div>
          <div className={cn("text-sm font-medium", setupSnapshot?.publishStatus ? "text-foreground" : "text-amber-400")}>{setupSnapshot?.publishStatus || "draft"}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Business Name"><Input ref={bindFieldRef("businessName")} value={info.businessName} onChange={(e) => playground.updateBusinessInfo({ businessName: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="Tagline"><Input value={info.tagline || ""} onChange={(e) => playground.updateBusinessInfo({ tagline: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="Phone"><Input ref={bindFieldRef("phone")} value={info.phone || ""} onChange={(e) => playground.updateBusinessInfo({ phone: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="Email"><Input ref={bindFieldRef("email")} value={info.email || ""} onChange={(e) => playground.updateBusinessInfo({ email: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="Address"><Input ref={bindFieldRef("address")} value={info.address || ""} onChange={(e) => playground.updateBusinessInfo({ address: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="Notification Email"><Input ref={bindFieldRef("notificationEmail")} value={info.notificationEmail ?? setupSnapshot?.notificationEmail ?? ""} onChange={(e) => playground.updateBusinessInfo({ notificationEmail: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="Booking Owner"><Input ref={bindFieldRef("bookingOwner")} value={info.bookingOwner || ""} onChange={(e) => playground.updateBusinessInfo({ bookingOwner: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="Payment Provider"><Input ref={bindFieldRef("paymentProvider")} value={info.paymentProvider || ""} onChange={(e) => playground.updateBusinessInfo({ paymentProvider: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="CRM Destination"><Input ref={bindFieldRef("crmDestination")} value={info.crmDestination || ""} onChange={(e) => playground.updateBusinessInfo({ crmDestination: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="Publish Domain"><Input ref={bindFieldRef("publishDomain")} value={info.publishDomain ?? setupSnapshot?.customDomain ?? ""} onChange={(e) => playground.updateBusinessInfo({ publishDomain: e.target.value })} className="h-9 text-sm" /></Field>
        <Field label="Follow-up Channel"><Input ref={bindFieldRef("followUpChannel")} value={info.followUpChannel || ""} onChange={(e) => playground.updateBusinessInfo({ followUpChannel: e.target.value })} className="h-9 text-sm" /></Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function BindingsSection({
  bindings,
  registry,
  readinessReport,
  selectedBindingId,
  onBindingSelect,
  onResolveDependency,
}: {
  bindings: Record<string, PlaygroundBinding>;
  registry: PageRegistry;
  readinessReport: PlaygroundIntentReadinessReport;
  selectedBindingId?: string | null;
  onBindingSelect: (bindingId: string | null) => void;
  onResolveDependency: (dependency: PlaygroundIntentDependency) => void;
}) {
  const bindingList = Object.values(bindings).sort((a, b) => {
    const aBlocked = readinessReport.readiness[a.bindingId]?.publishStatus === "blocked" ? 0 : 1;
    const bBlocked = readinessReport.readiness[b.bindingId]?.publishStatus === "blocked" ? 0 : 1;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;
    return (a.elementKey || a.bindingId).localeCompare(b.elementKey || b.bindingId);
  });

  if (bindingList.length === 0) {
    return <p className="text-sm text-muted-foreground">No intents are registered yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Intent Registry</h3>
        <p className="text-[10px] text-muted-foreground mt-1">Inspect how each CTA, trigger, and route resolves in preview and publish.</p>
      </div>
      <div className="space-y-2">
        {bindingList.map((binding) => {
          const readiness = readinessReport.readiness[binding.bindingId];
          const isSelected = selectedBindingId === binding.bindingId;
          const targetLabel = binding.targetType === "page" ? getPageTitle(registry, binding.targetId) : readiness?.targetSummary || binding.targetId;

          return (
            <div key={binding.bindingId} className={cn("rounded-xl border bg-muted/10 text-xs", isSelected ? "border-emerald-500/40" : "border-border/30")}>
              <button type="button" onClick={() => onBindingSelect(isSelected ? null : binding.bindingId)} className="w-full px-4 py-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">{binding.coreIntent || INTENT_LABELS[binding.intent] || binding.intent}</Badge>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 capitalize">{binding.uiAction || "navigate"}</Badge>
                      <span className="truncate text-foreground">{targetLabel}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground md:grid-cols-2">
                      <span>Source: {binding.elementKey || `${getPageTitle(registry, binding.sourcePageId)} / ${binding.sourceLabel || "unnamed"}`}</span>
                      <span>Target Type: {binding.targetType.replace("_", " ")}</span>
                      <span>Preview: <span className="text-foreground">{readiness?.previewStatus || binding.previewStatus || "ready"}</span></span>
                      <span>Publish: <span className="text-foreground">{readiness?.publishStatus || binding.publishStatus || "ready"}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[9px] h-5 px-1.5", getReadinessBadgeClass(readiness?.previewStatus || binding.previewStatus))}>Preview {readiness?.previewStatus || binding.previewStatus || "ready"}</Badge>
                    <Badge variant="outline" className={cn("text-[9px] h-5 px-1.5", getReadinessBadgeClass(readiness?.publishStatus || binding.publishStatus))}>Publish {readiness?.publishStatus || binding.publishStatus || "ready"}</Badge>
                  </div>
                </div>
              </button>

              {isSelected && readiness && (
                <div className="border-t border-border/20 bg-background/30 px-4 py-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Inspector</div>
                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        <div>Canonical intent: <span className="text-foreground">{binding.coreIntent || binding.intent}</span></div>
                        <div>Source page: <span className="text-foreground">{getPageTitle(registry, binding.sourcePageId)}</span></div>
                        <div>Source element key: <span className="text-foreground">{binding.elementKey || "not assigned"}</span></div>
                        <div>Target: <span className="text-foreground">{targetLabel}</span></div>
                        <div>Confidence: <span className="text-foreground">{(binding.confidence * 100).toFixed(0)}%</span></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fix Actions</div>
                      {readiness.dependencies.length === 0 ? (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-400">This intent is ready in preview and publish.</div>
                      ) : (
                        readiness.dependencies.map((dependency) => (
                          <div key={dependency.id} className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[11px] font-medium text-foreground">{dependency.label}</div>
                              <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", getReadinessBadgeClass(dependency.status))}>{dependency.mode} {dependency.status}</Badge>
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">{dependency.message}</div>
                            {dependency.fixHint && <div className="mt-1 text-[10px] text-muted-foreground/80">{dependency.fixHint}</div>}
                            {(dependency.resolverSection || dependency.resolverStepId) && <Button variant="outline" size="sm" className="mt-2 h-7 text-[11px]" onClick={() => onResolveDependency(dependency)}>Resolve</Button>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadinessSection({
  validations,
  summary,
  readinessReport,
  registry,
  onInspectBinding,
  onResolveDependency,
}: {
  validations: PlaygroundValidation[];
  summary: ReturnType<typeof getValidationSummary>;
  readinessReport: PlaygroundIntentReadinessReport;
  registry: PageRegistry;
  onInspectBinding: (bindingId: string) => void;
  onResolveDependency: (dependency: PlaygroundIntentDependency) => void;
}) {
  const blockedBindings = Object.values(readinessReport.bindings).filter((binding) => binding.publishStatus === "blocked");
  const partialBindings = Object.values(readinessReport.bindings).filter((binding) => binding.publishStatus === "partial");

  const severityIcon = (severity: PlaygroundValidation["severity"]) => {
    switch (severity) {
      case "error": return <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />;
      case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />;
      case "info": return <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Readiness</h3>
        <p className="text-[10px] text-muted-foreground mt-1">Structural validation tells you whether the graph is coherent. Readiness tells you whether the business action can actually run after publish.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Preview" value={`${readinessReport.summary.previewReady} ready / ${readinessReport.summary.previewPartial} partial / ${readinessReport.summary.previewBlocked} blocked`} />
        <SummaryCard title="Publish" value={`${readinessReport.summary.publishReady} ready / ${readinessReport.summary.publishPartial} partial / ${readinessReport.summary.publishBlocked} blocked`} />
        <SummaryCard title="Validation" value={`${summary.errors} errors / ${summary.warnings} warnings / ${summary.info} info`} />
        <SummaryCard title="Publish Blockers" value={`${blockedBindings.length}`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Publish Blockers</h4>
            <Badge variant="outline" className="border-red-500/30 text-red-400">{blockedBindings.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {blockedBindings.length === 0 ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-400">No publish blockers are currently open.</div>
            ) : (
              blockedBindings.map((binding) => {
                const readiness = readinessReport.readiness[binding.bindingId];
                return (
                  <div key={binding.bindingId} className="rounded-lg border border-border/20 bg-background/30 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-medium text-foreground">{binding.coreIntent || binding.intent}</div>
                        <div className="text-[10px] text-muted-foreground">{getPageTitle(registry, binding.sourcePageId)} • {binding.elementKey || binding.sourceLabel}</div>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onInspectBinding(binding.bindingId)}>Inspect</Button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {readiness.dependencies.filter((dependency) => dependency.status === "blocked").map((dependency) => (
                        <div key={dependency.id} className="rounded-md border border-red-500/20 bg-red-500/5 px-2.5 py-2">
                          <div className="text-[11px] text-foreground">{dependency.message}</div>
                          {dependency.fixHint && <div className="mt-1 text-[10px] text-muted-foreground">{dependency.fixHint}</div>}
                          {(dependency.resolverSection || dependency.resolverStepId) && <Button variant="outline" size="sm" className="mt-2 h-7 text-[11px]" onClick={() => onResolveDependency(dependency)}>Resolve</Button>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Preview-Only Intents</h4>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400">{partialBindings.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {partialBindings.length === 0 ? (
              <div className="rounded-lg border border-border/20 bg-background/30 px-3 py-2 text-[11px] text-muted-foreground">No preview-only intents are waiting on publish setup.</div>
            ) : (
              partialBindings.map((binding) => (
                <button key={binding.bindingId} type="button" className="w-full rounded-lg border border-border/20 bg-background/30 px-3 py-2 text-left" onClick={() => onInspectBinding(binding.bindingId)}>
                  <div className="text-[11px] font-medium text-foreground">{binding.coreIntent || binding.intent}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{readinessReport.readiness[binding.bindingId]?.missingDependencies.join(", ") || "Needs publish setup"}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Structural Layer</h4>
          <Badge variant="outline" className={cn(summary.isHealthy ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400")}>{summary.isHealthy ? "Healthy" : "Needs Review"}</Badge>
        </div>
        <div className="mt-3 space-y-1.5">
          {validations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No validation issues detected. The structure graph is consistent.</p>
          ) : (
            validations.map((validation) => (
              <div key={validation.id} className={cn(
                "flex items-start gap-2 p-2 rounded-md border text-xs",
                validation.severity === "error" ? "border-red-500/30 bg-red-500/5" : validation.severity === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-blue-500/30 bg-blue-500/5",
              )}>
                {severityIcon(validation.severity)}
                <div className="flex-1 min-w-0">
                  <div className="text-foreground">{validation.message}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 capitalize">{validation.scope}</Badge>
                    {validation.targetId && <span className="text-muted-foreground text-[9px] truncate">{validation.targetId}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs">
      <div className="text-muted-foreground">{title}</div>
      <div className="mt-1 text-foreground">{value}</div>
    </div>
  );
}

export default CreatorPlaygroundModal;
