/**
 * CreatorPlaygroundPanel — The site operating panel inside Web Builder.
 * 
 * Manages pages, funnels, products, services, forms, and business info
 * through a tabbed interface. Edits structured business objects so pages react.
 */

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, ShoppingBag, Briefcase, GitBranch, Settings,
  Plus, Trash2, Copy, Home, Eye, EyeOff, GripVertical,
  ArrowRight, ChevronDown, ChevronUp, Star, FormInput
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseCreatorPlaygroundReturn } from "@/hooks/useCreatorPlayground";
import type { BuilderPageType, FunnelRole } from "@/types/pageRegistry";

// ============================================================================
// Props
// ============================================================================

interface CreatorPlaygroundPanelProps {
  playground: UseCreatorPlaygroundReturn;
  onPageSelect?: (pageId: string) => void;
  selectedPageId?: string;
  className?: string;
}

// ============================================================================
// Page Type Options
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

// ============================================================================
// Component
// ============================================================================

export const CreatorPlaygroundPanel: React.FC<CreatorPlaygroundPanelProps> = ({
  playground,
  onPageSelect,
  selectedPageId,
  className,
}) => {
  const [activeTab, setActiveTab] = useState("pages");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPagePath, setNewPagePath] = useState("");
  const [newPageType, setNewPageType] = useState<BuilderPageType>("custom");
  const [newFunnelName, setNewFunnelName] = useState("");
  const [expandedFunnel, setExpandedFunnel] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Pages Tab
  // --------------------------------------------------------------------------

  const handleAddPage = useCallback(() => {
    if (!newPageTitle.trim()) return;
    const path = newPagePath.trim() || `/${newPageTitle.toLowerCase().replace(/\s+/g, "-")}`;
    const page = playground.addPage(newPageTitle.trim(), path, newPageType);
    setNewPageTitle("");
    setNewPagePath("");
    setNewPageType("custom");
    onPageSelect?.(page.pageId);
  }, [newPageTitle, newPagePath, newPageType, playground, onPageSelect]);

  const allPages = playground.getAllPages().sort((a, b) => a.navOrder - b.navOrder);

  // --------------------------------------------------------------------------
  // Funnels Tab
  // --------------------------------------------------------------------------

  const handleAddFunnel = useCallback(() => {
    if (!newFunnelName.trim()) return;
    const funnel = playground.addFunnel(newFunnelName.trim());
    setNewFunnelName("");
    setExpandedFunnel(funnel.funnelId);
  }, [newFunnelName, playground]);

  const funnels = Object.values(playground.pageRegistry.funnels);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className={cn("flex flex-col h-full bg-background/95 backdrop-blur-sm", className)}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Creator's Playground
          </h3>
          {playground.isDirty && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/50 text-amber-400">
              Unsaved
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start px-2 pt-1.5 pb-0 bg-transparent gap-0.5 border-b border-border/30 rounded-none h-auto flex-wrap">
          <TabsTrigger value="pages" className="text-[11px] px-2 py-1.5 h-auto rounded-t-md rounded-b-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <FileText className="h-3 w-3 mr-1" />Pages
          </TabsTrigger>
          <TabsTrigger value="funnels" className="text-[11px] px-2 py-1.5 h-auto rounded-t-md rounded-b-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <GitBranch className="h-3 w-3 mr-1" />Funnels
          </TabsTrigger>
          <TabsTrigger value="content" className="text-[11px] px-2 py-1.5 h-auto rounded-t-md rounded-b-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <ShoppingBag className="h-3 w-3 mr-1" />Content
          </TabsTrigger>
          <TabsTrigger value="forms" className="text-[11px] px-2 py-1.5 h-auto rounded-t-md rounded-b-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <FormInput className="h-3 w-3 mr-1" />Forms
          </TabsTrigger>
          <TabsTrigger value="business" className="text-[11px] px-2 py-1.5 h-auto rounded-t-md rounded-b-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <Settings className="h-3 w-3 mr-1" />Business
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* PAGES TAB */}
        {/* ================================================================ */}
        <TabsContent value="pages" className="flex-1 m-0 overflow-hidden flex flex-col">
          {/* Add Page Form */}
          <div className="p-2.5 border-b border-border/30 space-y-2">
            <div className="flex gap-1.5">
              <Input
                value={newPageTitle}
                onChange={e => setNewPageTitle(e.target.value)}
                placeholder="Page title..."
                className="h-7 text-xs flex-1 bg-muted/50"
                onKeyDown={e => e.key === "Enter" && handleAddPage()}
              />
              <Button size="sm" onClick={handleAddPage} disabled={!newPageTitle.trim()} className="h-7 px-2 text-xs">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Input
                value={newPagePath}
                onChange={e => setNewPagePath(e.target.value)}
                placeholder="/path (auto)"
                className="h-6 text-[10px] flex-1 bg-muted/30"
              />
              <Select value={newPageType} onValueChange={(v) => setNewPageType(v as BuilderPageType)}>
                <SelectTrigger className="h-6 text-[10px] w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Page List */}
          <ScrollArea className="flex-1">
            <div className="p-1.5 space-y-0.5">
              {allPages.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-6">
                  No pages yet. Add your first page above.
                </p>
              )}
              {allPages.map(page => (
                <div
                  key={page.pageId}
                  className={cn(
                    "group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                    selectedPageId === page.pageId
                      ? "bg-primary/15 text-primary"
                      : "hover:bg-muted/50 text-foreground"
                  )}
                  onClick={() => onPageSelect?.(page.pageId)}
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium truncate">{page.title}</span>
                      {page.isHome && <Home className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-muted-foreground font-mono truncate">{page.path}</span>
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-border/40">
                        {page.pageType}
                      </Badge>
                      {page.funnelRole && (
                        <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                          {page.funnelRole}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon"
                      className="h-5 w-5"
                      onClick={(e) => { e.stopPropagation(); playground.updatePage(page.pageId, { showInNav: !page.showInNav }); }}
                      title={page.showInNav ? "Hide from nav" : "Show in nav"}
                    >
                      {page.showInNav ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />}
                    </Button>
                    {!page.isHome && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); playground.setHomePage(page.pageId); }}
                        title="Set as homepage"
                      >
                        <Star className="h-2.5 w-2.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="h-5 w-5"
                      onClick={(e) => { e.stopPropagation(); playground.duplicatePage(page.pageId); }}
                      title="Duplicate"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-5 w-5 text-destructive"
                      onClick={(e) => { e.stopPropagation(); playground.removePage(page.pageId); }}
                      title="Delete"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ================================================================ */}
        {/* FUNNELS TAB */}
        {/* ================================================================ */}
        <TabsContent value="funnels" className="flex-1 m-0 overflow-hidden flex flex-col">
          {/* Add Funnel */}
          <div className="p-2.5 border-b border-border/30">
            <div className="flex gap-1.5">
              <Input
                value={newFunnelName}
                onChange={e => setNewFunnelName(e.target.value)}
                placeholder="Funnel name..."
                className="h-7 text-xs flex-1 bg-muted/50"
                onKeyDown={e => e.key === "Enter" && handleAddFunnel()}
              />
              <Button size="sm" onClick={handleAddFunnel} disabled={!newFunnelName.trim()} className="h-7 px-2 text-xs">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-1.5 space-y-1">
              {funnels.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-6">
                  No funnels yet. Create one to define multi-page flows.
                </p>
              )}
              {funnels.map(funnel => (
                <div key={funnel.funnelId} className="rounded-lg border border-border/40 overflow-hidden">
                  {/* Funnel Header */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedFunnel(expandedFunnel === funnel.funnelId ? null : funnel.funnelId)}
                  >
                    <GitBranch className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium flex-1">{funnel.name}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                      {funnel.steps.length} steps
                    </Badge>
                    {expandedFunnel === funnel.funnelId ? (
                      <ChevronUp className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost" size="icon" className="h-5 w-5 text-destructive"
                      onClick={(e) => { e.stopPropagation(); playground.removeFunnel(funnel.funnelId); }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>

                  {/* Funnel Steps */}
                  {expandedFunnel === funnel.funnelId && (
                    <div className="px-2.5 py-2 space-y-1.5 bg-background/50">
                      {funnel.steps.sort((a, b) => a.sortOrder - b.sortOrder).map((step, idx) => {
                        const page = playground.pageRegistry.pages[step.pageId];
                        return (
                          <div key={step.stepId} className="flex items-center gap-1.5">
                            {idx > 0 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground/60 -mt-1 flex-shrink-0" />
                            )}
                            <div className="flex-1 flex items-center gap-1 px-2 py-1 rounded bg-muted/40 text-xs">
                              <Badge variant="secondary" className="text-[8px] h-3.5 px-1">{step.role}</Badge>
                              <span className="truncate">{page?.title || step.pageId}</span>
                            </div>
                            <Button
                              variant="ghost" size="icon" className="h-4 w-4"
                              onClick={() => playground.removeFunnelStep(funnel.funnelId, step.stepId)}
                            >
                              <Trash2 className="h-2 w-2" />
                            </Button>
                          </div>
                        );
                      })}

                      {/* Add Step */}
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
          </ScrollArea>
        </TabsContent>

        {/* ================================================================ */}
        {/* CONTENT TAB (Products + Services) */}
        {/* ================================================================ */}
        <TabsContent value="content" className="flex-1 m-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-2.5 space-y-3">
              {/* Products Section */}
              <ContentSection
                title="Products"
                icon={<ShoppingBag className="h-3.5 w-3.5" />}
                items={Object.values(playground.creatorData.products)}
                onAdd={() => playground.addProduct({ name: "New Product", price: 0, currency: "USD", inStock: true })}
                onRemove={(id) => playground.removeProduct(id)}
                renderItem={(p) => (
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate">{(p as any).name}</span>
                    <span className="text-[10px] text-muted-foreground">${(p as any).price}</span>
                  </div>
                )}
                getId={(p) => (p as any).productId}
              />

              {/* Services Section */}
              <ContentSection
                title="Services"
                icon={<Briefcase className="h-3.5 w-3.5" />}
                items={Object.values(playground.creatorData.services)}
                onAdd={() => playground.addService({ name: "New Service", bookable: false })}
                onRemove={(id) => playground.removeService(id)}
                renderItem={(s) => (
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate">{(s as any).name}</span>
                    {(s as any).price && <span className="text-[10px] text-muted-foreground">${(s as any).price}</span>}
                  </div>
                )}
                getId={(s) => (s as any).serviceId}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ================================================================ */}
        {/* FORMS TAB */}
        {/* ================================================================ */}
        <TabsContent value="forms" className="flex-1 m-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-2.5 space-y-3">
              <ContentSection
                title="Forms"
                icon={<FormInput className="h-3.5 w-3.5" />}
                items={Object.values(playground.creatorData.forms)}
                onAdd={() => playground.addForm({
                  name: "New Form",
                  fields: [{ fieldId: "f1", label: "Email", type: "email", required: true, sortOrder: 0 }],
                  submitLabel: "Submit",
                  successMessage: "Thanks! We'll be in touch.",
                })}
                onRemove={(id) => playground.removeForm(id)}
                renderItem={(f) => (
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate">{(f as any).name}</span>
                    <span className="text-[10px] text-muted-foreground">{(f as any).fields?.length || 0} fields</span>
                  </div>
                )}
                getId={(f) => (f as any).formId}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ================================================================ */}
        {/* BUSINESS TAB */}
        {/* ================================================================ */}
        <TabsContent value="business" className="flex-1 m-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-2.5 space-y-3">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Business Name</label>
                <Input
                  value={playground.creatorData.businessInfo.businessName}
                  onChange={e => playground.updateBusinessInfo({ businessName: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tagline</label>
                <Input
                  value={playground.creatorData.businessInfo.tagline || ""}
                  onChange={e => playground.updateBusinessInfo({ tagline: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="Your catchy tagline..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Phone</label>
                <Input
                  value={playground.creatorData.businessInfo.phone || ""}
                  onChange={e => playground.updateBusinessInfo({ phone: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                <Input
                  value={playground.creatorData.businessInfo.email || ""}
                  onChange={e => playground.updateBusinessInfo({ email: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="hello@business.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Address</label>
                <Input
                  value={playground.creatorData.businessInfo.address || ""}
                  onChange={e => playground.updateBusinessInfo({ address: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="123 Main St, City, State"
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

/** Generic content section with add/remove */
function ContentSection<T>({
  title, icon, items, onAdd, onRemove, renderItem, getId,
}: {
  title: string;
  icon: React.ReactNode;
  items: T[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  renderItem: (item: T) => React.ReactNode;
  getId: (item: T) => string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          {icon}
          {title}
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-1">{items.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={onAdd}>
          <Plus className="h-2.5 w-2.5 mr-0.5" />Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground pl-5">None yet</p>
      ) : (
        <div className="space-y-0.5 pl-5">
          {items.map(item => (
            <div key={getId(item)} className="group flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/40 transition-colors">
              <div className="flex-1 min-w-0">{renderItem(item)}</div>
              <Button
                variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={() => onRemove(getId(item))}
              >
                <Trash2 className="h-2 w-2" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Inline add step to funnel */
function AddFunnelStepInline({
  pages, existingPageIds, onAdd,
}: {
  pages: Array<{ pageId: string; title: string }>;
  existingPageIds: string[];
  onAdd: (pageId: string, role: FunnelRole) => void;
}) {
  const [selectedPage, setSelectedPage] = useState("");
  const [selectedRole, setSelectedRole] = useState<FunnelRole>("offer");
  const available = pages.filter(p => !existingPageIds.includes(p.pageId));

  if (available.length === 0) return null;

  return (
    <div className="flex items-center gap-1 pt-1 border-t border-border/20">
      <Select value={selectedPage} onValueChange={setSelectedPage}>
        <SelectTrigger className="h-6 text-[10px] flex-1">
          <SelectValue placeholder="Add page..." />
        </SelectTrigger>
        <SelectContent>
          {available.map(p => (
            <SelectItem key={p.pageId} value={p.pageId} className="text-xs">{p.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedRole} onValueChange={v => setSelectedRole(v as FunnelRole)}>
        <SelectTrigger className="h-6 text-[10px] w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FUNNEL_ROLE_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm" className="h-6 px-1.5 text-[10px]"
        disabled={!selectedPage}
        onClick={() => { onAdd(selectedPage, selectedRole); setSelectedPage(""); }}
      >
        <Plus className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
}

export default CreatorPlaygroundPanel;
