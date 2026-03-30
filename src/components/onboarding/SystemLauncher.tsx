import { useState, useMemo, useEffect } from "react";
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
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Layout,
  Eye,
  Database,
  Workflow,
  Shield,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  businessSystems,
  type BusinessSystemType,
  type LayoutTemplate,
  type LayoutCategory,
} from "@/data/templates/types";
import { getTemplatesByCategory, getTemplateReactCode, getTemplateReactCodeWithCSS } from "@/data/templates";
import { getCompositionReactCode, getCompositionMeta, getCompositionContentContext } from "@/utils/compositionReference";
import {
  getTemplateManifest,
  getDefaultManifestForSystem,
} from "@/data/templates/manifest";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AICodeAssistant } from "@/components/creatives/AICodeAssistant";
import { buildPageStructureContext } from "@/utils/pageStructureContext";
import {
  generateDesignVariation,
  randomFontPairing,
} from "@/utils/designVariation";
import { THEME_PRESETS, type ThemePreset } from "./themePresets";
import {
  createBlueprintFromIndustry,
  compileContract,
  getIndustryForCategory,
  getAllowedIntents,
} from "@/contracts";
import { extractCleanCode, looksLikeCode } from "@/utils/aiCodeCleaner";

// ============================================================================
// Component
// ============================================================================

interface SystemLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = "industry" | "templates" | "theme";

const STEP_META: Record<WizardStep, { num: number; label: string }> = {
  industry: { num: 1, label: "Industry" },
  templates: { num: 2, label: "Template" },
  theme: { num: 3, label: "Theme" },
};

export const SystemLauncher = ({
  open,
  onOpenChange,
}: SystemLauncherProps) => {
  const navigate = useNavigate();
  const [selectedSystem, setSelectedSystem] =
    useState<BusinessSystemType | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<LayoutTemplate | null>(null);
  const [step, setStep] = useState<WizardStep>("industry");
  const [isLaunching, setIsLaunching] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<LayoutCategory | "all">(
    "all"
  );
  const [customPrompt, setCustomPrompt] = useState("");

  // Pre-launch AI edits
  const [aiEditOpen, setAiEditOpen] = useState(false);
  const [editedTemplateCode, setEditedTemplateCode] = useState<string | null>(
    null
  );
  const [editedTemplateFiles, setEditedTemplateFiles] = useState<Record<
    string,
    string
  > | null>(null);

  // User saved templates
  const [userSavedTemplates, setUserSavedTemplates] = useState<
    LayoutTemplate[]
  >([]);
  useEffect(() => {
    const loadUserTemplates = async () => {
      const { data } = await supabase
        .from("design_templates")
        .select("id, name, description, canvas_data")
        .order("updated_at", { ascending: false })
        .limit(12);
      if (data) {
        const mapped: LayoutTemplate[] = data
          .filter((t) => {
            const cd = t.canvas_data as Record<string, unknown> | null;
            return (
              cd &&
              typeof cd === "object" &&
              ("code" in cd || "html" in cd || "previewHtml" in cd)
            );
          })
          .map((t) => {
            const cd = t.canvas_data as Record<string, string>;
            return {
              id: `saved-${t.id}`,
              name: t.name,
              description: t.description || "Your saved template",
              category: "saved" as LayoutCategory,
              code: cd.code || cd.html || cd.previewHtml || "",
              tags: ["saved"],
            };
          });
        setUserSavedTemplates(mapped);
      }
    };
    if (open) loadUserTemplates();
  }, [open]);

  // Derived data
  const systemTemplates = useMemo(() => {
    if (!selectedSystem) return [];
    const system = businessSystems.find((s) => s.id === selectedSystem);
    if (!system) return [];
    return system.templateCategories.flatMap((cat) =>
      getTemplatesByCategory(cat)
    );
  }, [selectedSystem]);

  const allTemplates = useMemo(
    () => [...systemTemplates, ...userSavedTemplates],
    [systemTemplates, userSavedTemplates]
  );

  const availableCategories = useMemo(() => {
    const cats = new Set<LayoutCategory>();
    allTemplates.forEach((t) => cats.add(t.category));
    return Array.from(cats);
  }, [allTemplates]);

  const visibleTemplates = useMemo(() => {
    if (categoryFilter === "all") return allTemplates;
    return allTemplates.filter((t) => t.category === categoryFilter);
  }, [allTemplates, categoryFilter]);

  const selectedManifest = useMemo(() => {
    if (!selectedTemplate || !selectedSystem) return null;
    return (
      getTemplateManifest(selectedTemplate.id) ||
      getDefaultManifestForSystem(selectedSystem)
    );
  }, [selectedTemplate, selectedSystem]);

  const selectedSystemData = selectedSystem
    ? businessSystems.find((s) => s.id === selectedSystem)
    : null;
  const effectiveTemplateCode = selectedTemplate
    ? editedTemplateCode ?? getTemplateReactCode(selectedTemplate)
    : null;

  // ─── Handlers ───

  const handleSystemSelect = (systemId: BusinessSystemType) => {
    setSelectedSystem(systemId);
    setSelectedTemplate(null);
    setCategoryFilter("all");
    setStep("templates");
  };

  const handleThemeSelect = (theme: ThemePreset) => {
    setSelectedTheme(
      selectedTheme?.id === theme.id ? null : theme
    );
  };

  const handleTemplateContinue = () => setStep("theme");

  const handleTemplateSelect = (template: LayoutTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplateCode(null);
    setEditedTemplateFiles(null);
  };

  const handleDeleteSavedTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const dbId = templateId.replace("saved-", "");
    const { error } = await supabase.from("design_templates").delete().eq("id", dbId);
    if (error) {
      toast.error("Failed to delete template");
      return;
    }
    setUserSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
      setEditedTemplateCode(null);
      setEditedTemplateFiles(null);
    }
    toast.success("Template deleted");
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

      const manifest =
        getTemplateManifest(selectedTemplate.id) ||
        getDefaultManifestForSystem(selectedSystem);
      let effectiveResult = editedTemplateCode 
        ? { code: editedTemplateCode, css: '' }
        : getTemplateReactCodeWithCSS(selectedTemplate);

      if (selectedTheme && !editedTemplateFiles) {
        try {
          toast("Applying theme…", { description: selectedTheme.label });
          const { data: aiData, error: aiError } =
            await supabase.functions.invoke("ai-code-assistant", {
              body: {
                messages: [
                  {
                    role: "user",
                    content:
                      `Apply the "${selectedTheme.label}" aesthetic to this template.\n\n` +
                      `${selectedTheme.styleDirective}\n\n` +
                      `STRICT RULES:\n` +
                      `1. ONLY modify: font families, font sizes, font weights, colors, color schemes, text styling, backgrounds, border-radius, shadows\n` +
                      `2. DO NOT change: text content, copy, headlines, descriptions, service names, industry-specific language\n` +
                      `3. DO NOT change: layout structure, section order, images, icons, button positions, navigation structure\n` +
                      `4. PRESERVE ALL: data-ut-intent, data-intent, data-ut-cta, data-no-intent attributes exactly as-is\n` +
                      `5. PRESERVE ALL: form inputs, interactive elements, and their functionality\n\n` +
                      `Output ONLY the complete updated code. No markdown, no explanations.`,
                  },
                ],
                mode: "design",
                currentCode:
                  effectiveResult.code.length > 20_000
                    ? effectiveResult.code.slice(0, 20_000)
                    : effectiveResult.code,
                editMode: true,
                templateAction: "apply-design-preset",
                aesthetic: selectedTheme.id,
              },
            });
          if (!aiError && aiData?.content) {
            const cleanedThemeCode = extractCleanCode(aiData.content);
            if (cleanedThemeCode && looksLikeCode(cleanedThemeCode)) {
              effectiveResult = getTemplateReactCodeWithCSS({ code: cleanedThemeCode, title: selectedTemplate.name });
            } else {
              console.warn("[SystemLauncher] Theme AI returned prose, ignoring");
            }
          }
        } catch (e) {
          console.warn("[SystemLauncher] theme application failed", e);
        }
      }

      const { data, error } = await supabase.functions.invoke(
        "install-system",
        {
          body: {
            systemType: selectedSystem,
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            businessName: `${system.name} Business`,
            templateCategory: selectedTemplate.category,
            designPreset: selectedTheme?.id || null,
          },
        }
      );

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Install failed");
      }

      const businessId = data.data.businessId as string;

      // Always pass as VFS files for multi-file React project support
      const baseCSS = `:root {\n  --background: 222.2 84% 4.9%;\n  --foreground: 210 40% 98%;\n}\n\nbody {\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  background-color: hsl(var(--background));\n  color: hsl(var(--foreground));\n}\n`;
      const vfsFiles = editedTemplateFiles || {
        '/src/App.tsx': effectiveResult.code,
        '/src/main.tsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`,
        '/src/index.css': baseCSS,
        ...(effectiveResult.css ? { '/src/template.css': effectiveResult.css } : {}),
      };

      navigate("/web-builder", {
        state: {
          vfsFiles,
          templateName: selectedTemplate.name,
          aesthetic: selectedTheme?.id,
          designPreset: selectedTheme?.id,
          templateCategory: selectedTemplate.category,
          systemType: selectedSystem,
          systemName: system.name,
          preloadedIntents: system.intents,
          businessId,
          manifestId: manifest.id,
          isProvisioned: true,
          startInPreview: true,
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

  const handleAIGenerate = async () => {
    if (!selectedSystem || !selectedTemplate) return;
    const system = businessSystems.find((s) => s.id === selectedSystem);
    if (!system) return;

    setIsAIGenerating(true);
    try {
      const industry = selectedTemplate.category;
      const fonts = randomFontPairing();
      const design = generateDesignVariation();

      // Use contracts system for canonical intent resolution
      const industryProfile = getIndustryForCategory(industry as LayoutCategory);
      const canonicalIntents = industryProfile
        ? getAllowedIntents(industryProfile.defaultCapabilities)
        : system.intents;

      const blueprint = {
        version: "1.0",
        identity: {
          industry,
          primary_goal: industryProfile
            ? (industryProfile.defaultCapabilities.includes('booking') ? 'bookings' : 'leads')
            : "Generate leads and grow the business",
        },
        brand: {
          business_name: `${system.name} Business`,
          tagline: `Professional ${system.name.toLowerCase()} services you can trust`,
          tone: "professional and friendly",
          typography: fonts,
        },
        design,
        intents: canonicalIntents.map((i) => ({ intent: i })),
      };

      const themeInstruction = selectedTheme
        ? `\n\n🎨 VISUAL AESTHETIC (colors/typography/formatting ONLY — do NOT change industry content or text copy): ${selectedTheme.label}\n${selectedTheme.styleDirective}\nPalette: bg=${selectedTheme.palette.bg}, fg=${selectedTheme.palette.fg}, accent=${selectedTheme.palette.accent}${selectedTheme.palette.accent2 ? `, accent2=${selectedTheme.palette.accent2}` : ''}\nTypography: heading=${selectedTheme.typography.headingFont}, body=${selectedTheme.typography.bodyFont}, weight=${selectedTheme.typography.headingWeight}\n`
        : "";
      const customInstruction = customPrompt.trim()
        ? `\n\nADDITIONAL INSTRUCTIONS: ${customPrompt.trim()}\n`
        : "";

      // Extract industry content context from the selected template composition
      const contentContext = getCompositionContentContext(selectedTemplate.category);
      const industryContextBlock = contentContext
        ? `\n\n📋 INDUSTRY CONTENT CONTEXT (USE THIS AS YOUR CONTENT BASELINE — do NOT invent services/items from other industries):\n${contentContext}\n`
        : '';

      const userPrompt = `Create a unique, premium ${industry} website inspired by but NOT identical to the reference template. Use different color schemes, layout variations, and original copy while maintaining the same quality level.${industryContextBlock}${themeInstruction}${customInstruction}`;

      // Prefer composition-based React code over legacy HTML
      const compositionCode = getCompositionReactCode(selectedTemplate.category);
      const compositionMetaData = getCompositionMeta(selectedTemplate.category);
      const referenceCode = compositionCode || selectedTemplate.code;
      const referenceId = compositionMetaData?.compositionId || selectedTemplate.id;

      const { data, error } = await supabase.functions.invoke(
        "systems-build",
        {
          body: {
            blueprint,
            userPrompt,
            enhanceWithAI: true,
            templateId: referenceId,
            templateHtml: referenceCode,
            variantMode: true,
            variationSeed: `v${Date.now().toString(36)}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            outputFormat: "react",
          },
        }
      );

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Rate limit exceeded. Please try again shortly.");
          return;
        }
        if (error.message?.includes("402")) {
          toast.error("Credits required. Please add credits to continue.");
          return;
        }
        throw error;
      }

      // React fullstack output — expect files from outputFormat:"react"
      const generatedFiles = data?.files;
      const generatedCode = generatedFiles?.["src/App.tsx"] || generatedFiles?.["App.tsx"] || data?.code;

      if (generatedFiles && typeof generatedFiles === "object" && Object.keys(generatedFiles).length > 0) {
        // React VFS mode — pass VFS files as source of truth to WebBuilder
        navigate("/web-builder", {
          state: {
            vfsFiles: generatedFiles,
            templateName: `AI ${selectedTemplate.name}`,
            aesthetic: selectedTheme?.id,
            templateCategory: selectedTemplate.category,
            systemType: selectedSystem,
            systemName: system.name,
            preloadedIntents: system.intents,
            startInPreview: true,
          },
        });
      } else if (generatedCode && typeof generatedCode === "string" && generatedCode.length >= 100) {
        // Fallback: single-file output — clean and validate
        const cleaned = extractCleanCode(generatedCode);
        if (!cleaned || !looksLikeCode(cleaned)) {
          toast.error("AI generation produced invalid output. Try again.");
          return;
        }
        // Ensure it's React-compatible (wrap HTML if needed)
        const reactResult = (cleaned.includes('import ') || cleaned.includes('export default'))
          ? { code: cleaned, css: '' }
          : getTemplateReactCodeWithCSS({ code: cleaned, title: selectedTemplate.name });
        const fallbackVfsFiles: Record<string, string> = {
          '/src/App.tsx': reactResult.code,
          '/src/main.tsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`,
          '/src/index.css': `:root {\n  --background: 222.2 84% 4.9%;\n  --foreground: 210 40% 98%;\n}\n\nbody {\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  background-color: hsl(var(--background));\n  color: hsl(var(--foreground));\n}\n`,
        };
        if (reactResult.css) {
          fallbackVfsFiles['/src/template.css'] = reactResult.css;
        }
        navigate("/web-builder", {
          state: {
            vfsFiles: fallbackVfsFiles,
            templateName: `AI ${selectedTemplate.name}`,
            aesthetic: selectedTheme?.id,
            templateCategory: selectedTemplate.category,
            systemType: selectedSystem,
            systemName: system.name,
            preloadedIntents: system.intents,
            startInPreview: true,
          },
        });
      } else {
        toast.error("AI generation produced no output. Try again.");
        return;
      }

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
    setStep("industry");
    setSelectedSystem(null);
    setSelectedTheme(null);
    setSelectedTemplate(null);
    setAiEditOpen(false);
    setEditedTemplateCode(null);
    setEditedTemplateFiles(null);
    setCategoryFilter("all");
    setCustomPrompt("");
    setIsAIGenerating(false);
  };

  const handleBack = () => {
    if (step === "theme") {
      setStep("templates");
      setSelectedTheme(null);
    } else if (step === "templates") {
      setStep("industry");
      setSelectedSystem(null);
      setSelectedTemplate(null);
      setEditedTemplateCode(null);
      setEditedTemplateFiles(null);
      setCategoryFilter("all");
    }
  };

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
    saved: "My Designs",
  };

  const stepKeys: WizardStep[] = ["industry", "templates", "theme"];
  const currentStepIdx = stepKeys.indexOf(step);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogContent className="max-w-[900px] p-0 overflow-hidden border-0 bg-[#07080F] max-h-[92vh] shadow-[0_0_80px_rgba(0,200,255,0.08)]">
        <DialogHeader className="sr-only">
          <DialogTitle>Launch Your Website</DialogTitle>
          <DialogDescription>
            Choose your industry, select a template, then pick a visual
            theme.
          </DialogDescription>
        </DialogHeader>

        {/* ─── Wizard header bar ─── */}
        <div className="relative px-6 pt-5 pb-4 border-b border-white/[0.06]">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-cyan-500/[0.06] rounded-full blur-[80px]" />
          </div>

          {/* Step indicator */}
          <div className="relative flex items-center justify-center gap-0">
            {stepKeys.map((s, i) => {
              const meta = STEP_META[s];
              const isActive = step === s;
              const isPast = currentStepIdx > i;
              return (
                <div key={s} className="flex items-center">
                  {i > 0 && (
                    <div
                      className={cn(
                        "w-12 h-px mx-1 transition-colors duration-300",
                        isPast ? "bg-cyan-500/60" : "bg-white/[0.08]"
                      )}
                    />
                  )}
                  <button
                    onClick={() => {
                    if (isPast) {
                      if (s === "industry") {
                        setStep("industry");
                        setSelectedSystem(null);
                        setSelectedTheme(null);
                        setSelectedTemplate(null);
                      } else if (s === "templates") {
                        setStep("templates");
                        setSelectedTheme(null);
                      }
                      }
                    }}
                    disabled={!isPast}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 outline-none",
                      isActive &&
                        "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30 shadow-[0_0_12px_rgba(0,200,255,0.15)]",
                      isPast &&
                        "bg-cyan-500/10 text-cyan-500/70 hover:text-cyan-400 cursor-pointer",
                      !isActive && !isPast && "text-white/25"
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                        isActive && "bg-cyan-500 text-[#07080F]",
                        isPast && "bg-cyan-500/30 text-cyan-400",
                        !isActive && !isPast && "bg-white/[0.06] text-white/30"
                      )}
                    >
                      {isPast ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        meta.num
                      )}
                    </span>
                    <span className="hidden sm:inline">{meta.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Content ─── */}
        <AnimatePresence mode="wait">
          {/* ── Step 1: Industry ── */}
          {step === "industry" && (
            <motion.div
              key="industry"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="px-6 pt-6 pb-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-1.5 tracking-tight">
                  What are you building?
                </h2>
                <p className="text-sm text-white/40">
                  Pick your industry — we'll match templates and install the
                  right backend.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {businessSystems.map((system) => (
                  <motion.button
                    key={system.id}
                    onClick={() => handleSystemSelect(system.id)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "group relative p-5 rounded-2xl text-left transition-all duration-200",
                      "bg-white/[0.03] border border-white/[0.06]",
                      "hover:bg-white/[0.06] hover:border-cyan-500/30",
                      "hover:shadow-[0_0_20px_rgba(0,200,255,0.06)]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                    )}
                  >
                    <div className="text-3xl mb-2.5 group-hover:scale-110 transition-transform duration-200">
                      {system.icon}
                    </div>
                    <h3 className="font-semibold text-sm text-white/90 mb-0.5">
                      {system.name}
                    </h3>
                    <p className="text-xs text-white/30 line-clamp-2 leading-relaxed">
                      {system.tagline}
                    </p>
                  </motion.button>
                ))}
              </div>

              <div className="text-center mt-8">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate("/web-builder");
                    onOpenChange(false);
                  }}
                  className="text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                >
                  Skip — start from scratch
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Templates ── */}
          {step === "templates" && selectedSystemData && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <div className="px-6 pt-4 pb-2 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{selectedSystemData.icon}</span>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        {selectedSystemData.name} Templates
                      </h2>
                      <p className="text-xs text-white/35">
                        {systemTemplates.length} starters
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {availableCategories.length > 1 && (
                <div className="px-6 pb-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200",
                      categoryFilter === "all"
                        ? "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30"
                        : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                    )}
                  >
                    All
                  </button>
                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoryFilter(cat);
                        if (selectedTemplate && selectedTemplate.category !== cat)
                          setSelectedTemplate(null);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200",
                        categoryFilter === cat
                          ? "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30"
                          : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                      )}
                    >
                      {categoryLabels[cat] || cat}
                    </button>
                  ))}
                </div>
              )}

              <ScrollArea className="flex-1 max-h-[46vh] px-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleTemplates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    return (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTemplateSelect(template)}
                        className={cn(
                          "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
                          "border",
                          isSelected
                            ? "border-cyan-500/40 shadow-[0_0_20px_rgba(0,200,255,0.08)] bg-cyan-500/[0.03]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="aspect-[16/10] bg-white/[0.02] relative overflow-hidden">
                          <div className="absolute inset-0 p-1.5 overflow-hidden">
                            <div
                              className="w-full h-full rounded bg-white transform scale-[0.25] origin-top-left"
                              style={{ width: "400%", height: "400%", pointerEvents: "none" }}
                              dangerouslySetInnerHTML={{
                                __html: template.code.replace(/<script[\s\S]*?<\/script>/gi, ""),
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <Eye className="h-5 w-5 text-white/80" />
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg"
                            >
                              <Check className="h-3.5 w-3.5 text-[#07080F]" />
                            </motion.div>
                          )}
                        </div>
                        <div className="p-3 flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-xs text-white/80 mb-1 line-clamp-1">
                              {template.name}
                            </h3>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-white/[0.05] text-white/40 border-0">
                                {categoryLabels[template.category] || template.category}
                              </Badge>
                              {template.tags?.slice(0, 1).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 text-white/25 border-white/[0.08]">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {template.id.startsWith("saved-") && (
                            <button
                              onClick={(e) => handleDeleteSavedTemplate(template.id, e)}
                              className="shrink-0 p-1 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete saved template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {selectedTemplate ? (
                    <div className="flex items-center gap-2.5">
                      <Layout className="h-4 w-4 text-cyan-400/60 shrink-0" />
                      <p className="text-sm font-medium text-white/80 truncate">
                        {selectedTemplate.name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/25">Select a template to continue</p>
                  )}
                </div>
                <Button
                  onClick={handleTemplateContinue}
                  disabled={!selectedTemplate}
                  className={cn(
                    "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
                    "hover:bg-cyan-500/25 hover:shadow-[0_0_16px_rgba(0,200,255,0.15)]",
                    "transition-all"
                  )}
                >
                  Continue
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Theme (styling only — no layout/content changes) ── */}
          {step === "theme" && selectedSystemData && selectedTemplate && (
            <motion.div
              key="theme"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <div className="px-6 pt-4 pb-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Choose your aesthetic
                  </h2>
                  <p className="text-xs text-white/35">
                    Style your{" "}
                    <span className="text-cyan-400/70">{selectedTemplate.name}</span>{" "}
                    template
                  </p>
                </div>
              </div>

              <ScrollArea className="flex-1 max-h-[52vh] px-6 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {THEME_PRESETS.map((theme) => {
                    const isSelected = selectedTheme?.id === theme.id;
                    return (
                      <motion.button
                        key={theme.id}
                        onClick={() => handleThemeSelect(theme)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "relative p-4 rounded-2xl text-left transition-all duration-200",
                          "border focus:outline-none",
                          isSelected
                            ? "bg-cyan-500/[0.08] border-cyan-500/40 shadow-[0_0_24px_rgba(0,200,255,0.08)]"
                            : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]"
                        )}
                      >
                        <div className="flex gap-1.5 mb-3">
                          {[theme.palette.bg, theme.palette.accent, theme.palette.accent2 || theme.palette.fg].map(
                            (color, ci) => (
                              <div
                                key={ci}
                                className={cn("w-7 h-7 rounded-lg transition-transform duration-200", isSelected && "scale-110")}
                                style={{ backgroundColor: color, boxShadow: isSelected ? `0 0 8px ${color}40` : "none" }}
                              />
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base opacity-70">{theme.icon}</span>
                          <h3 className="font-semibold text-sm text-white/90">{theme.label}</h3>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center"
                            >
                              <Check className="h-3 w-3 text-[#07080F]" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-xs text-white/30 leading-relaxed">{theme.description}</p>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <label className="text-xs font-medium text-white/50 mb-2 block">
                    Custom instructions <span className="text-white/20">(optional)</span>
                  </label>
                  <textarea
                    placeholder="e.g., Dark navy background, warm earth tones…"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className={cn(
                      "w-full min-h-[72px] p-3 text-sm rounded-xl resize-none transition-all",
                      "bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder:text-white/20",
                      "focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/30 focus:bg-white/[0.05]",
                      "outline-none"
                    )}
                  />
                </div>
              </ScrollArea>

              <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex-1 text-sm">
                  {selectedTheme ? (
                    <span className="flex items-center gap-2 text-white/60">
                      <span className="text-lg">{selectedTheme.icon}</span>
                      <span>
                        <span className="text-cyan-400 font-medium">{selectedTheme.label}</span> selected
                      </span>
                    </span>
                  ) : (
                    <span className="text-white/25">No theme — default minimal style</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAiEditOpen(true)}
                    disabled={isAIGenerating}
                    className="text-white/40 hover:text-white/70 hover:bg-white/[0.04] h-9 text-xs"
                  >
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                    AI edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAIGenerate}
                    disabled={isAIGenerating || isLaunching}
                    className={cn(
                      "h-9 text-xs px-4",
                      "bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30",
                      "hover:bg-fuchsia-500/25 hover:shadow-[0_0_16px_rgba(255,0,255,0.12)]"
                    )}
                  >
                    {isAIGenerating ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        AI Variation
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleLaunch}
                    disabled={isLaunching || isAIGenerating}
                    className={cn(
                      "h-9 text-xs px-5",
                      "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
                      "hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,200,255,0.15)]",
                      "transition-all"
                    )}
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Installing…
                      </>
                    ) : (
                      <>
                        <Zap className="mr-1.5 h-3.5 w-3.5" />
                        Start Building
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI edit dialog */}
        <Dialog open={aiEditOpen} onOpenChange={setAiEditOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>AI edit: {selectedTemplate?.name}</DialogTitle>
              <DialogDescription>
                Propose a multi-file patch plan and apply it before opening
                the full builder.
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && selectedSystem ? (
              <AICodeAssistant
                currentCode={
                  effectiveTemplateCode ?? getTemplateReactCode(selectedTemplate)
                }
                systemType={selectedSystem}
                templateName={selectedTemplate.name}
                pageStructureContext={buildPageStructureContext(
                  effectiveTemplateCode ?? getTemplateReactCode(selectedTemplate)
                )}
                backendStateContext={
                  selectedManifest
                    ? `- tables: ${selectedManifest.tables.length}\n- workflows: ${selectedManifest.workflows.length}\n- intents: ${selectedManifest.intents.length}`
                    : null
                }
                businessDataContext={
                  "- (not installed yet; business data will be available after install)"
                }
                onCodeGenerated={(code) => {
                  const cleaned = extractCleanCode(code);
                  if (cleaned && looksLikeCode(cleaned)) {
                    setEditedTemplateCode(cleaned);
                  } else {
                    console.warn("[SystemLauncher] AI edit returned prose, ignoring");
                    toast.error("AI returned text instead of code. Try again.");
                    return;
                  }
                  setEditedTemplateFiles(null);
                }}
                onFilesPatch={(files) => {
                  setEditedTemplateFiles(files);
                  const entry =
                    files["/src/App.tsx"] ||
                    files["/App.tsx"] ||
                    Object.values(files).find(v => v.includes('export default'));
                  if (entry) setEditedTemplateCode(entry);
                  return true;
                }}
              />
            ) : (
              <p className="text-sm text-white/40">
                Select a template first.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default SystemLauncher;
