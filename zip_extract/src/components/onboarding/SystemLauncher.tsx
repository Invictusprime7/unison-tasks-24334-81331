import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, ArrowLeft, Check, Zap, Layout, Eye, Database, Workflow, Shield, Sparkles, Loader2 } from "lucide-react";
import { businessSystems, type BusinessSystemType, type LayoutTemplate, type LayoutCategory } from "@/data/templates/types";
import { getTemplatesByCategory } from "@/data/templates";
import { getTemplateManifest, getDefaultManifestForSystem } from "@/data/templates/manifest";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AICodeAssistant } from "@/components/creatives/AICodeAssistant";
import { buildPageStructureContext } from "@/utils/pageStructureContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SystemLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SystemLauncher = ({ open, onOpenChange }: SystemLauncherProps) => {
  const navigate = useNavigate();
  const [selectedSystem, setSelectedSystem] = useState<BusinessSystemType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LayoutTemplate | null>(null);
  const [step, setStep] = useState<"select" | "templates">("select");
  const [isLaunching, setIsLaunching] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  // Web Design Kit integration (launcher-level)
  const [categoryFilter, setCategoryFilter] = useState<LayoutCategory | "all">("all");
  const [designPreset, setDesignPreset] = useState<string>("none");

  const designPresets = useMemo(
    () => [
      { id: "none", label: "No preset" },
      { id: "editorial", label: "Editorial" },
      { id: "minimal", label: "Minimal" },
      { id: "luxury", label: "Luxury" },
      { id: "playful", label: "Playful" },
      { id: "retro", label: "Retro" },
      { id: "cyberpunk", label: "Cyberpunk" },
      { id: "glass", label: "Glass" },
    ],
    []
  );

  // Pre-launch edits (AI patch plan) live here until the user opens the full builder.
  const [aiEditOpen, setAiEditOpen] = useState(false);
  const [editedTemplateCode, setEditedTemplateCode] = useState<string | null>(null);
  const [editedTemplateFiles, setEditedTemplateFiles] = useState<Record<string, string> | null>(null);

  // All templates are now production-ready with CoreIntent wiring
  // Get templates for the selected system
  const systemTemplates = useMemo(() => {
    if (!selectedSystem) return [];
    const system = businessSystems.find(s => s.id === selectedSystem);
    if (!system) return [];
    return system.templateCategories.flatMap(cat => getTemplatesByCategory(cat));
  }, [selectedSystem]);

  const availableCategories = useMemo(() => {
    const cats = new Set<LayoutCategory>();
    systemTemplates.forEach((t) => cats.add(t.category));
    return Array.from(cats);
  }, [systemTemplates]);

  const visibleTemplates = useMemo(() => {
    if (categoryFilter === "all") return systemTemplates;
    return systemTemplates.filter((t) => t.category === categoryFilter);
  }, [systemTemplates, categoryFilter]);

  // Get manifest for selected template to show backend info
  const selectedManifest = useMemo(() => {
    if (!selectedTemplate || !selectedSystem) return null;
    return getTemplateManifest(selectedTemplate.id) || getDefaultManifestForSystem(selectedSystem);
  }, [selectedTemplate, selectedSystem]);

  const handleSystemSelect = (systemId: BusinessSystemType) => {
    setSelectedSystem(systemId);
    setSelectedTemplate(null);
    setCategoryFilter("all");
    setDesignPreset("none");
    setStep("templates");
  };

  const handleTemplateSelect = (template: LayoutTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplateCode(null);
    setEditedTemplateFiles(null);
  };

  const handleLaunch = async () => {
    if (!selectedSystem || !selectedTemplate) return;

    const system = businessSystems.find((s) => s.id === selectedSystem);
    if (!system) return;

    setIsLaunching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Please sign in to install this system");
        navigate("/auth");
        return;
      }

      const manifest = getTemplateManifest(selectedTemplate.id) || getDefaultManifestForSystem(selectedSystem);

      // Optional: restyle the template before install + builder navigation
      let effectiveCode = editedTemplateCode ?? selectedTemplate.code;
      // Design presets only modify typography and thematic styling - NOT structure or assets
      const shouldApplyPreset = designPreset && designPreset !== "none";
      if (shouldApplyPreset && !editedTemplateFiles) {
        try {
          toast("Applying design preset…", { description: designPreset });
          const { data: aiData, error: aiError } = await supabase.functions.invoke("ai-code-assistant", {
            body: {
              messages: [
                {
                  role: "user",
                  content:
                    `Apply the "${designPreset}" typography and color theme to this template.\n\n` +
                    `STRICT RULES - You must follow these exactly:\n` +
                    `1. ONLY modify: font families, font sizes, font weights, colors, color schemes, text styling\n` +
                    `2. DO NOT change: layout structure, section order, hero formations, grid layouts, spacing between sections\n` +
                    `3. DO NOT change: images, icons, logos, or any visual assets\n` +
                    `4. DO NOT change: button positions, form placements, navigation structure\n` +
                    `5. PRESERVE ALL: data-ut-intent, data-intent, data-ut-cta, data-no-intent attributes exactly as-is\n` +
                    `6. PRESERVE ALL: form inputs, interactive elements, and their functionality\n\n` +
                    `Theme Guidelines for "${designPreset}":\n` +
                    `- Editorial: Serif headings, refined typography, muted elegant colors\n` +
                    `- Minimal: Clean sans-serif, monochromatic, high contrast\n` +
                    `- Bold: Strong typography weights, vibrant accent colors\n` +
                    `- Playful: Rounded fonts, bright cheerful colors\n` +
                    `- Corporate: Professional fonts, business-appropriate blues/grays\n\n` +
                    `Output ONLY the complete updated HTML. No markdown, no explanations.`,
                },
              ],
              mode: "design",
              currentCode: effectiveCode.length > 20_000 ? effectiveCode.slice(0, 20_000) : effectiveCode,
              editMode: true,
              templateAction: "apply-design-preset",
            },
          });
          if (!aiError && aiData?.content) {
            effectiveCode = aiData.content;
          }
        } catch (e) {
          console.warn("[SystemLauncher] design preset application failed", e);
        }
      }

      const { data, error } = await supabase.functions.invoke("install-system", {
        body: {
          systemType: selectedSystem,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          businessName: `${system.name} Business`,
          templateCategory: selectedTemplate.category,
          designPreset: shouldApplyPreset ? designPreset : null,
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Install failed");
      }

      const businessId = data.data.businessId as string;
      console.log("[SystemLauncher] Installed system:", selectedSystem, "businessId:", businessId);

       navigate("/web-builder", {
        state: {
           generatedCode: effectiveCode,
           vfsFiles: editedTemplateFiles,
          templateName: selectedTemplate.name,
          aesthetic: shouldApplyPreset ? designPreset : undefined,
          designPreset: shouldApplyPreset ? designPreset : undefined,
          templateCategory: selectedTemplate.category,
          systemType: selectedSystem,
          systemName: system.name,
          preloadedIntents: system.intents,
          businessId,
          manifestId: manifest.id,
          isProvisioned: true,
        },
      });

      onOpenChange(false);
      resetState();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Install failed";
      console.error("[SystemLauncher] install error", e);
      toast.error(msg);
    } finally {
      setIsLaunching(false);
    }
  };

  /**
   * Generate a unique AI variation using the selected template as a quality reference.
   * Routes through systems-build with the template HTML injected into the prompt.
   */
  const handleAIGenerate = async () => {
    if (!selectedSystem || !selectedTemplate) return;

    const system = businessSystems.find(s => s.id === selectedSystem);
    if (!system) return;

    setIsAIGenerating(true);
    try {
      // Build a blueprint from the selected system
      const industry = selectedTemplate.category;
      const blueprint = {
        version: "1.0",
        identity: {
          industry,
          primary_goal: "Generate leads and grow the business",
        },
        brand: {
          business_name: `${system.name} Business`,
          tagline: `Professional ${system.name.toLowerCase()} services you can trust`,
          tone: "professional and friendly",
          typography: { heading: "Plus Jakarta Sans", body: "Inter" },
        },
        design: {
          layout: { hero_style: "split" as const, section_spacing: "spacious" as const, navigation_style: "fixed" as const },
          effects: { animations: true, scroll_animations: true, hover_effects: true, gradient_backgrounds: true, glassmorphism: true, shadows: "dramatic" as const },
          sections: { include_stats: true, include_testimonials: true, include_faq: true, include_cta_banner: true, include_newsletter: true, include_social_proof: true },
        },
        intents: system.intents.map(i => ({ intent: i })),
      };

      console.log(`[SystemLauncher] AI generating with template reference: ${selectedTemplate.id}`);

      const { data, error } = await supabase.functions.invoke("systems-build", {
        body: {
          blueprint,
          userPrompt: `Create a unique, premium ${system.name.toLowerCase()} website inspired by but NOT identical to the reference template. Use different color schemes, layout variations, and original copy while maintaining the same quality level.`,
          enhanceWithAI: true,
          templateId: selectedTemplate.id,
          templateHtml: selectedTemplate.code,
        },
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error("Rate limit exceeded. Please try again shortly.");
          return;
        }
        if (error.message?.includes('402')) {
          toast.error("Credits required. Please add credits to continue.");
          return;
        }
        throw error;
      }

      const generatedCode = data?.code;
      if (!generatedCode || generatedCode.length < 100) {
        toast.error("AI generation produced no output. Try again.");
        return;
      }

      console.log(`[SystemLauncher] AI generated ${generatedCode.length} chars`);

      // Navigate to builder with the AI-generated code
      navigate("/web-builder", {
        state: {
          generatedCode,
          templateName: `AI ${selectedTemplate.name}`,
          aesthetic: designPreset !== "none" ? designPreset : undefined,
          templateCategory: selectedTemplate.category,
          systemType: selectedSystem,
          systemName: system.name,
          preloadedIntents: system.intents,
          startInPreview: true,
        },
      });

      onOpenChange(false);
      resetState();
      toast.success("AI website generated! Opening in builder…");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI generation failed";
      console.error("[SystemLauncher] AI generation error", e);
      toast.error(msg);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const resetState = () => {
    setStep("select");
    setSelectedSystem(null);
    setSelectedTemplate(null);
    setAiEditOpen(false);
    setEditedTemplateCode(null);
    setEditedTemplateFiles(null);
    setCategoryFilter("all");
    setDesignPreset("none");
    setIsAIGenerating(false);
  };

  const handleBack = () => {
    if (step === "templates") {
      setStep("select");
      setSelectedSystem(null);
      setSelectedTemplate(null);
      setAiEditOpen(false);
      setEditedTemplateCode(null);
      setEditedTemplateFiles(null);
      setCategoryFilter("all");
      setDesignPreset("none");
    }
  };

  const selectedSystemData = selectedSystem 
    ? businessSystems.find(s => s.id === selectedSystem) 
    : null;

  const effectiveTemplateCode = selectedTemplate ? (editedTemplateCode ?? selectedTemplate.code) : null;

  // Category display names
  const categoryLabels: Record<string, string> = {
    salon: "Salon & Spa",
    landing: "Landing Pages",
    portfolio: "Portfolio",
    restaurant: "Restaurant",
    store: "E-Commerce",
    contractor: "Local Service",
    coaching: "Coaching",
    realestate: "Real Estate",
    nonprofit: "Nonprofit",
    agency: "Agency",
    content: "Content",
    saas: "SaaS",
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background border-border max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>System Launcher</DialogTitle>
          <DialogDescription>
            Choose a business system and a contract-ready starter template. Installation will provision backend packs.
          </DialogDescription>
        </DialogHeader>
        <AnimatePresence mode="wait">
          {step === "select" ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4">
                  <Zap className="h-3 w-3 mr-1" />
                  Quick Launch
                </Badge>
                <h2 className="text-3xl font-bold mb-2 text-foreground">
                  What are you launching?
                </h2>
                <p className="text-muted-foreground">
                  Choose your business type. We'll show you ready-made templates.
                </p>
              </div>

              {/* System Grid - all systems now have wired templates */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {businessSystems
                  .map((system) => (
                  <motion.button
                    key={system.id}
                    onClick={() => handleSystemSelect(system.id)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative p-6 rounded-xl border-2 text-left transition-all",
                      "hover:border-primary hover:shadow-lg",
                      "bg-card border-border",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    )}
                  >
                    <div className="text-4xl mb-3">{system.icon}</div>
                    <h3 className="font-semibold text-lg mb-1 text-foreground">
                      {system.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {system.tagline}
                    </p>
                  </motion.button>
                ))}
              </div>

              {/* Skip option */}
              <div className="text-center mt-8">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate("/web-builder");
                    onOpenChange(false);
                  }}
                  className="text-muted-foreground"
                >
                  Skip and start from scratch
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full"
            >
              {selectedSystemData && (
                <>
                  {/* Header with back button */}
                  <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                        className="shrink-0"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{selectedSystemData.icon}</span>
                          <div>
                            <h2 className="text-xl font-bold text-foreground">
                              Choose a {selectedSystemData.name} Template
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              {systemTemplates.length} contract-ready starters available
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Template Grid */}
                  <ScrollArea className="flex-1 max-h-[50vh] p-6">
                    {/* Category filter (selected inline per template card, but applied globally) */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
                      <div className="text-sm text-muted-foreground">
                        Filter by category (optional)
                      </div>
                      <div className="w-full sm:w-[260px]">
                        <Select
                          value={categoryFilter}
                          onValueChange={(v) => {
                            const next = v as LayoutCategory | "all";
                            setCategoryFilter(next);
                            // If current selection becomes hidden, clear it.
                            if (selectedTemplate && next !== "all" && selectedTemplate.category !== next) {
                              setSelectedTemplate(null);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {availableCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {categoryLabels[cat] || cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleTemplates.map((template) => (
                        <motion.div
                          key={template.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleTemplateSelect(template)}
                          className={cn(
                            "relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all",
                            "bg-card hover:shadow-lg",
                            selectedTemplate?.id === template.id
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {/* Template Preview */}
                          <div className="aspect-video bg-muted/50 relative overflow-hidden">
                            {/* Mini preview of template code */}
                            <div className="absolute inset-0 p-2 overflow-hidden">
                               <div 
                                className="w-full h-full rounded bg-white transform scale-[0.25] origin-top-left"
                                style={{ 
                                  width: '400%', 
                                  height: '400%',
                                  pointerEvents: 'none'
                                }}
                                dangerouslySetInnerHTML={{ 
                                   __html: (template.id === selectedTemplate?.id ? (effectiveTemplateCode ?? template.code) : template.code)
                                     .replace(/<script[\s\S]*?<\/script>/gi, '') 
                                }}
                              />
                            </div>
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-primary/0 hover:bg-primary/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                              <Eye className="h-6 w-6 text-primary" />
                            </div>
                          </div>
                          
                          {/* Template Info */}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                                {template.name}
                              </h3>
                              {selectedTemplate?.id === template.id && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] px-2 py-0">
                                {categoryLabels[template.category] || template.category}
                              </Badge>
                              {template.tags?.slice(0, 2).map((tag) => (
                                <Badge 
                                  key={tag} 
                                  variant="outline" 
                                  className="text-[10px] px-2 py-0 text-muted-foreground"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            {/* Inline Web Design Kit preset selection (only for the active template card) */}
                            {selectedTemplate?.id === template.id && (
                              <div className="mt-3 grid gap-2">
                                <div className="text-xs text-muted-foreground">Design preset</div>
                                <Select value={designPreset} onValueChange={(v) => setDesignPreset(v)}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Choose a preset" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {designPresets.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground">
                                  Preset is applied during launch (restyles this template, keeps intents).
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Footer with Launch Button */}
                  <div className="p-6 border-t border-border bg-muted/30">
                    <div className="flex items-center justify-between gap-4">
                      {/* Selected template info */}
                      <div className="flex-1">
                        {selectedTemplate ? (
                          <div className="flex items-center gap-3">
                            <Layout className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {selectedTemplate.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Installs backend packs + opens the builder
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Select a template to get started
                          </p>
                        )}
                      </div>
                      
                      {/* Backend features hint */}
                      <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
                        {selectedManifest && (
                          <>
                            <div className="flex items-center gap-1">
                              <Database className="h-3 w-3 text-primary" />
                              <span>{selectedManifest.tables.length} tables</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Workflow className="h-3 w-3 text-primary" />
                              <span>{selectedManifest.workflows.length} workflows</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3 text-primary" />
                              <span>{selectedManifest.intents.length} intents</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Launch buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => setAiEditOpen(true)}
                          disabled={!selectedTemplate || isAIGenerating}
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          AI edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={handleAIGenerate}
                          disabled={!selectedTemplate || isAIGenerating || isLaunching}
                          className="min-w-[160px]"
                        >
                          {isAIGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating…
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate with AI
                            </>
                          )}
                        </Button>
                        <Button
                          size="lg"
                          onClick={handleLaunch}
                          disabled={!selectedTemplate || isLaunching || isAIGenerating}
                          className="min-w-[180px]"
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          {isLaunching ? "Installing…" : "Start Building"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI edit surface (pre-builder) */}
        <Dialog open={aiEditOpen} onOpenChange={setAiEditOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>AI edit: {selectedTemplate?.name}</DialogTitle>
              <DialogDescription>
                Propose a multi-file patch plan and apply it before opening the full builder.
              </DialogDescription>
            </DialogHeader>

            {selectedTemplate && selectedSystem ? (
              <AICodeAssistant
                currentCode={effectiveTemplateCode ?? selectedTemplate.code}
                systemType={selectedSystem}
                templateName={selectedTemplate.name}
                pageStructureContext={buildPageStructureContext(effectiveTemplateCode ?? selectedTemplate.code)}
                backendStateContext={selectedManifest ? `- tables: ${selectedManifest.tables.length}\n- workflows: ${selectedManifest.workflows.length}\n- intents: ${selectedManifest.intents.length}` : null}
                businessDataContext={"- (not installed yet; business data will be available after install)"}
                onCodeGenerated={(code) => {
                  setEditedTemplateCode(code);
                  setEditedTemplateFiles(null);
                }}
                onFilesPatch={(files) => {
                  setEditedTemplateFiles(files);
                  const entry = files["/index.html"] || files["/src/App.tsx"] || files["/App.tsx"];
                  if (entry) setEditedTemplateCode(entry);
                  return true;
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a template first.</p>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default SystemLauncher;
