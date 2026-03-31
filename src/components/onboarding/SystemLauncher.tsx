import { useState, useCallback } from "react";
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
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  businessSystems,
  type BusinessSystemType,
} from "@/data/templates/types";
import { THEME_PRESETS, type ThemePreset } from "./themePresets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getIndustryForCategory,
  getAllowedIntents,
} from "@/contracts";
import {
  generateDesignVariation,
  randomFontPairing,
} from "@/utils/designVariation";
import { extractCleanCode, looksLikeCode } from "@/utils/aiCodeCleaner";
import { getCompositionReactCode, getCompositionMeta, getCompositionContentContext } from "@/utils/compositionReference";
import { buildFullPagePrompt } from "@/sections/references";

// ============================================================================
// Types
// ============================================================================

type WizardStep = "industry" | "details" | "aesthetic";

interface SystemLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEP_META: { key: WizardStep; num: number; label: string; sublabel: string }[] = [
  { key: "industry", num: 1, label: "Industry", sublabel: "What you do" },
  { key: "details", num: 2, label: "Your Brand", sublabel: "Name & voice" },
  { key: "aesthetic", num: 3, label: "Aesthetic", sublabel: "Look & feel" },
];

// Extended industry cards with richer visuals
const INDUSTRY_CARDS: {
  systemId: BusinessSystemType;
  icon: string;
  label: string;
  tagline: string;
  gradient: string;
  glowColor: string;
}[] = [
  {
    systemId: "booking",
    icon: "📅",
    label: "Booking & Services",
    tagline: "Salons, spas, restaurants, contractors",
    gradient: "from-pink-500/20 via-transparent to-transparent",
    glowColor: "rgba(236,72,153,0.15)",
  },
  {
    systemId: "saas",
    icon: "🚀",
    label: "SaaS & Software",
    tagline: "Products, platforms, developer tools",
    gradient: "from-blue-500/20 via-transparent to-transparent",
    glowColor: "rgba(59,130,246,0.15)",
  },
  {
    systemId: "agency",
    icon: "🏢",
    label: "Agency & Consulting",
    tagline: "Creative studios, legal, real estate",
    gradient: "from-purple-500/20 via-transparent to-transparent",
    glowColor: "rgba(168,85,247,0.15)",
  },
  {
    systemId: "portfolio",
    icon: "🎨",
    label: "Portfolio & Creative",
    tagline: "Designers, photographers, artists",
    gradient: "from-amber-500/20 via-transparent to-transparent",
    glowColor: "rgba(245,158,11,0.15)",
  },
  {
    systemId: "store",
    icon: "🛍️",
    label: "Store & E-Commerce",
    tagline: "Products, retail, marketplace",
    gradient: "from-emerald-500/20 via-transparent to-transparent",
    glowColor: "rgba(16,185,129,0.15)",
  },
  {
    systemId: "content",
    icon: "📝",
    label: "Content & Media",
    tagline: "Blogs, newsletters, nonprofits",
    gradient: "from-orange-500/20 via-transparent to-transparent",
    glowColor: "rgba(249,115,22,0.15)",
  },
];

// ============================================================================
// Component
// ============================================================================

export const SystemLauncher = ({ open, onOpenChange }: SystemLauncherProps) => {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("industry");
  const [selectedSystem, setSelectedSystem] = useState<BusinessSystemType | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  const currentStepIdx = STEP_META.findIndex((s) => s.key === step);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setStep("industry");
    setSelectedSystem(null);
    setSelectedTheme(null);
    setBusinessName("");
    setBusinessDescription("");
    setCustomPrompt("");
    setIsLaunching(false);
  }, []);

  const handleSystemSelect = (systemId: BusinessSystemType) => {
    setSelectedSystem(systemId);
    setStep("details");
  };

  const handleDetailsNext = () => {
    if (!businessName.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    setStep("aesthetic");
  };

  const handleBack = () => {
    if (step === "aesthetic") {
      setStep("details");
      setSelectedTheme(null);
    } else if (step === "details") {
      setStep("industry");
      setSelectedSystem(null);
    }
  };

  const handleLaunch = async () => {
    if (!selectedSystem) return;
    const system = businessSystems.find((s) => s.id === selectedSystem);
    if (!system) return;

    setIsLaunching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Please sign in to continue");
        navigate("/auth");
        return;
      }

      // Build industry context
      const primaryCategory = system.templateCategories[0];
      const industryProfile = getIndustryForCategory(primaryCategory as any);
      const canonicalIntents = industryProfile
        ? getAllowedIntents(industryProfile.defaultCapabilities)
        : system.intents;

      const fonts = randomFontPairing();
      const design = generateDesignVariation();

      const blueprint = {
        version: "1.0",
        identity: {
          industry: primaryCategory,
          primary_goal: industryProfile
            ? industryProfile.defaultCapabilities.includes("booking")
              ? "bookings"
              : "leads"
            : "Generate leads and grow the business",
        },
        brand: {
          business_name: businessName.trim() || `${system.name} Business`,
          tagline: businessDescription.trim() || `Professional ${system.name.toLowerCase()} services you can trust`,
          tone: "professional and friendly",
          typography: fonts,
        },
        design,
        intents: canonicalIntents.map((i: string) => ({ intent: i })),
      };

      // Build AI prompt with premium section references
      const themeInstruction = selectedTheme
        ? `\n\n🎨 VISUAL AESTHETIC: ${selectedTheme.label}\n${selectedTheme.styleDirective}\nPalette: bg=${selectedTheme.palette.bg}, fg=${selectedTheme.palette.fg}, accent=${selectedTheme.palette.accent}${selectedTheme.palette.accent2 ? `, accent2=${selectedTheme.palette.accent2}` : ""}\nTypography: heading=${selectedTheme.typography.headingFont}, body=${selectedTheme.typography.bodyFont}, weight=${selectedTheme.typography.headingWeight}\n`
        : "";
      const customInstruction = customPrompt.trim()
        ? `\n\nADDITIONAL INSTRUCTIONS: ${customPrompt.trim()}\n`
        : "";

      // Pull premium reference prompt for the industry
      const industryTag = primaryCategory === "contractor" ? "local-service"
        : primaryCategory === "salon" ? "salon"
        : primaryCategory === "coaching" ? "coaching"
        : undefined;
      const premiumRefPrompt = industryTag ? buildFullPagePrompt(industryTag as any) : "";

      const contentContext = getCompositionContentContext(primaryCategory);
      const industryContextBlock = contentContext
        ? `\n\n📋 INDUSTRY CONTENT CONTEXT:\n${contentContext}\n`
        : "";

      const userPrompt = `Create a premium ${primaryCategory} website for "${businessName.trim()}".${businessDescription.trim() ? ` Business description: ${businessDescription.trim()}.` : ""}${industryContextBlock}${themeInstruction}${customInstruction}${premiumRefPrompt ? `\n\n--- PREMIUM SECTION REFERENCES ---\n${premiumRefPrompt}` : ""}`;

      // Get composition reference code if available
      const compositionCode = getCompositionReactCode(primaryCategory);
      const compositionMetaData = getCompositionMeta(primaryCategory);

      toast("Generating your site…", { description: "This takes ~20 seconds" });

      const { data, error } = await supabase.functions.invoke("ai-code-assistant", {
        body: {
          messages: [{ role: "user", content: userPrompt }],
          mode: "template-react",
          variationSeed: `v${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          templateName: businessName.trim() || system.name,
          aesthetic: selectedTheme?.id || "modern professional",
          source: primaryCategory,
          savePattern: true,
          currentCode: compositionCode || undefined,
          templateAction: compositionCode ? "use-as-schema" : undefined,
          systemsBuildContext: blueprint,
        },
      });

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

      // Process output
      const generatedFiles = data?.files;
      const generatedCode = generatedFiles?.["src/App.tsx"] || generatedFiles?.["App.tsx"] || data?.code;

      const baseCSS = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --background: 222.2 84% 4.9%;\n  --foreground: 210 40% 98%;\n  --card: 222.2 84% 4.9%;\n  --card-foreground: 210 40% 98%;\n  --primary: 217.2 91.2% 59.8%;\n  --primary-foreground: 222.2 47.4% 11.2%;\n  --secondary: 217.2 32.6% 17.5%;\n  --secondary-foreground: 210 40% 98%;\n  --muted: 217.2 32.6% 17.5%;\n  --muted-foreground: 215 20.2% 65.1%;\n  --accent: 217.2 32.6% 17.5%;\n  --accent-foreground: 210 40% 98%;\n  --border: 217.2 32.6% 17.5%;\n  --radius: 0.75rem;\n}\n\n* { border-color: hsl(var(--border)); }\nbody { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: hsl(var(--background)); color: hsl(var(--foreground)); }\n`;

      if (generatedFiles && typeof generatedFiles === "object" && Object.keys(generatedFiles).length > 0) {
        navigate("/web-builder", {
          state: {
            vfsFiles: generatedFiles,
            templateName: `${businessName.trim()} Site`,
            aesthetic: selectedTheme?.id,
            templateCategory: primaryCategory,
            systemType: selectedSystem,
            systemName: system.name,
            preloadedIntents: system.intents,
            startInPreview: true,
          },
        });
      } else if (generatedCode && typeof generatedCode === "string" && generatedCode.length >= 100) {
        const cleaned = extractCleanCode(generatedCode);
        if (!cleaned || !looksLikeCode(cleaned)) {
          toast.error("AI generation produced invalid output. Try again.");
          return;
        }
        navigate("/web-builder", {
          state: {
            vfsFiles: {
              "/src/App.tsx": cleaned,
              "/src/main.tsx": `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`,
              "/src/index.css": baseCSS,
            },
            templateName: `${businessName.trim()} Site`,
            aesthetic: selectedTheme?.id,
            templateCategory: primaryCategory,
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
      toast.success("Site generated! Opening builder…");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      console.error("[SystemLauncher] error", e);
      toast.error(msg);
    } finally {
      setIsLaunching(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogContent className="max-w-[940px] p-0 overflow-hidden border-0 bg-[#07080F] max-h-[92vh] shadow-[0_0_100px_rgba(0,200,255,0.06),0_0_40px_rgba(0,0,0,0.5)]">
        <DialogHeader className="sr-only">
          <DialogTitle>Launch Your Website</DialogTitle>
          <DialogDescription>
            Choose your industry, describe your business, and pick a visual style.
          </DialogDescription>
        </DialogHeader>

        {/* ─── Header + Step Indicator ─── */}
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.06]">
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-cyan-500/[0.04] rounded-full blur-[100px]" />
          </div>

          <div className="relative flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center text-sm">
                ⚡
              </div>
              <div>
                <h2 className="text-sm font-bold text-white/90 tracking-tight">Unison Launcher</h2>
                <p className="text-[11px] text-white/30">AI-powered site generation</p>
              </div>
            </div>
          </div>

          {/* Step pills */}
          <div className="relative flex items-center gap-0">
            {STEP_META.map((s, i) => {
              const isActive = step === s.key;
              const isPast = currentStepIdx > i;
              return (
                <div key={s.key} className="flex items-center">
                  {i > 0 && (
                    <div className={cn(
                      "w-16 h-px mx-2 transition-colors duration-500",
                      isPast ? "bg-gradient-to-r from-cyan-500/60 to-cyan-500/30" : "bg-white/[0.06]"
                    )} />
                  )}
                  <button
                    onClick={() => {
                      if (isPast) {
                        setStep(s.key);
                        if (s.key === "industry") { setSelectedSystem(null); setSelectedTheme(null); }
                        if (s.key === "details") setSelectedTheme(null);
                      }
                    }}
                    disabled={!isPast && !isActive}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 outline-none",
                      isActive && "bg-cyan-500/12 text-cyan-400 ring-1 ring-cyan-500/25 shadow-[0_0_16px_rgba(0,200,255,0.1)]",
                      isPast && "bg-cyan-500/8 text-cyan-500/60 hover:text-cyan-400 cursor-pointer",
                      !isActive && !isPast && "text-white/20"
                    )}
                  >
                    <span className={cn(
                      "w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
                      "w-[22px] h-[22px]",
                      isActive && "bg-cyan-500 text-[#07080F]",
                      isPast && "bg-cyan-500/25 text-cyan-400",
                      !isActive && !isPast && "bg-white/[0.05] text-white/25"
                    )}>
                      {isPast ? <Check className="h-3 w-3" /> : s.num}
                    </span>
                    <div className="hidden sm:block text-left">
                      <div className="leading-none">{s.label}</div>
                      <div className={cn(
                        "text-[9px] mt-0.5 leading-none",
                        isActive ? "text-cyan-400/50" : "text-white/15"
                      )}>{s.sublabel}</div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Content ─── */}
        <AnimatePresence mode="wait">
          {/* ══ Step 1: Industry ══ */}
          {step === "industry" && (
            <motion.div
              key="industry"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="px-6 pt-8 pb-10"
            >
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                  What are you building?
                </h2>
                <p className="text-sm text-white/35 max-w-md mx-auto">
                  Pick your industry — we'll generate a premium site with the right structure,
                  content, and backend.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-[640px] mx-auto">
                {INDUSTRY_CARDS.map((card) => (
                  <motion.button
                    key={card.systemId}
                    onClick={() => handleSystemSelect(card.systemId)}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "group relative p-5 rounded-2xl text-left transition-all duration-300",
                      "bg-white/[0.02] border border-white/[0.06]",
                      "hover:border-cyan-500/25",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
                      "overflow-hidden"
                    )}
                  >
                    {/* Hover gradient */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                      card.gradient
                    )} />
                    {/* Hover glow */}
                    <div
                      className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none"
                      style={{ background: card.glowColor }}
                    />

                    <div className="relative">
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300 will-change-transform">
                        {card.icon}
                      </div>
                      <h3 className="font-semibold text-sm text-white/90 mb-1 group-hover:text-white transition-colors">
                        {card.label}
                      </h3>
                      <p className="text-[11px] text-white/25 leading-relaxed group-hover:text-white/40 transition-colors">
                        {card.tagline}
                      </p>
                    </div>
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
                  className="text-white/25 hover:text-white/50 hover:bg-white/[0.03] text-xs"
                >
                  Skip — start from scratch
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ══ Step 2: Business Details ══ */}
          {step === "details" && selectedSystem && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col"
            >
              <div className="px-6 pt-5 pb-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8 text-white/35 hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Tell us about your business</h2>
                  <p className="text-xs text-white/30">
                    We'll use this to generate relevant content and copy.
                  </p>
                </div>
              </div>

              <div className="px-6 py-8 flex-1">
                <div className="max-w-lg mx-auto space-y-6">
                  {/* Business name */}
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                      Business Name <span className="text-cyan-400/60">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., Stellar Studio, QuickFix Plumbing…"
                      className={cn(
                        "w-full px-4 py-3.5 text-sm rounded-xl transition-all duration-200",
                        "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20",
                        "focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/25 focus:bg-white/[0.06]",
                        "outline-none"
                      )}
                      autoFocus
                    />
                  </div>

                  {/* Business description */}
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                      What do you do? <span className="text-white/20">(optional)</span>
                    </label>
                    <textarea
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      placeholder="Briefly describe your services, audience, or what makes you unique…"
                      rows={3}
                      className={cn(
                        "w-full px-4 py-3 text-sm rounded-xl resize-none transition-all duration-200",
                        "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20",
                        "focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/25 focus:bg-white/[0.06]",
                        "outline-none"
                      )}
                    />
                  </div>

                  {/* Selected system badge */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-2xl">
                      {INDUSTRY_CARDS.find((c) => c.systemId === selectedSystem)?.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white/70">
                        {INDUSTRY_CARDS.find((c) => c.systemId === selectedSystem)?.label}
                      </div>
                      <div className="text-[10px] text-white/25">
                        Industry-optimized sections, content, and backend
                      </div>
                    </div>
                    <button
                      onClick={handleBack}
                      className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex-1">
                  {businessName.trim() ? (
                    <p className="text-sm text-white/60">
                      <span className="text-cyan-400 font-medium">{businessName.trim()}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-white/20">Enter a name to continue</p>
                  )}
                </div>
                <Button
                  onClick={handleDetailsNext}
                  disabled={!businessName.trim()}
                  className={cn(
                    "bg-cyan-500/12 text-cyan-400 border border-cyan-500/25",
                    "hover:bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(0,200,255,0.12)]",
                    "transition-all disabled:opacity-30"
                  )}
                >
                  Continue
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ══ Step 3: Aesthetic ══ */}
          {step === "aesthetic" && selectedSystem && (
            <motion.div
              key="aesthetic"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col"
            >
              <div className="px-6 pt-5 pb-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8 text-white/35 hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Choose your aesthetic
                  </h2>
                  <p className="text-xs text-white/30">
                    Visual style for{" "}
                    <span className="text-cyan-400/70 font-medium">{businessName.trim()}</span>
                  </p>
                </div>
              </div>

              <div className="flex-1 max-h-[52vh] overflow-y-auto px-6 pb-4 scrollbar-hide">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {THEME_PRESETS.map((theme) => {
                    const isSelected = selectedTheme?.id === theme.id;
                    return (
                      <motion.button
                        key={theme.id}
                        onClick={() => setSelectedTheme(isSelected ? null : theme)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "relative p-5 rounded-2xl text-left transition-all duration-300",
                          "border focus:outline-none overflow-hidden",
                          isSelected
                            ? "bg-cyan-500/[0.06] border-cyan-500/35 shadow-[0_0_30px_rgba(0,200,255,0.08)]"
                            : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]"
                        )}
                      >
                        {/* Color swatches */}
                        <div className="flex gap-2 mb-4">
                          {[theme.palette.bg, theme.palette.accent, theme.palette.accent2 || theme.palette.fg].map(
                            (color, ci) => (
                              <div
                                key={ci}
                                className={cn(
                                  "w-8 h-8 rounded-lg transition-all duration-300 ring-1 ring-white/5",
                                  isSelected && "scale-110 ring-cyan-500/20"
                                )}
                                style={{
                                  backgroundColor: color,
                                  boxShadow: isSelected ? `0 0 12px ${color}30` : "none",
                                }}
                              />
                            )
                          )}
                        </div>

                        {/* Label */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base opacity-60">{theme.icon}</span>
                          <h3 className="font-semibold text-sm text-white/90">{theme.label}</h3>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center shadow-[0_0_8px_rgba(0,200,255,0.3)]"
                            >
                              <Check className="h-3 w-3 text-[#07080F]" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-[11px] text-white/25 leading-relaxed">{theme.description}</p>

                        {/* Typography preview */}
                        <div className="mt-3 pt-3 border-t border-white/[0.04]">
                          <div className="text-[10px] text-white/15 flex items-center gap-2">
                            <span style={{ fontFamily: theme.typography.headingFont }}>
                              {theme.typography.headingFont}
                            </span>
                            <span className="text-white/8">+</span>
                            <span style={{ fontFamily: theme.typography.bodyFont }}>
                              {theme.typography.bodyFont}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Custom prompt */}
                <div className="mt-5">
                  <label className="text-xs font-medium text-white/40 mb-2 block">
                    Custom instructions <span className="text-white/15">(optional)</span>
                  </label>
                  <textarea
                    placeholder="e.g., Dark navy background, warm earth tones, include a pricing section…"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className={cn(
                      "w-full min-h-[68px] p-3 text-sm rounded-xl resize-none transition-all",
                      "bg-white/[0.03] border border-white/[0.06] text-white/80 placeholder:text-white/15",
                      "focus:ring-1 focus:ring-cyan-500/25 focus:border-cyan-500/25 focus:bg-white/[0.05]",
                      "outline-none"
                    )}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex-1 text-sm">
                  {selectedTheme ? (
                    <span className="flex items-center gap-2 text-white/50">
                      <span className="text-base">{selectedTheme.icon}</span>
                      <span>
                        <span className="text-cyan-400 font-medium">{selectedTheme.label}</span>{" "}
                        <span className="text-white/25">aesthetic</span>
                      </span>
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">AI will choose a fitting style</span>
                  )}
                </div>

                <Button
                  onClick={handleLaunch}
                  disabled={isLaunching}
                  className={cn(
                    "h-10 px-6 text-sm font-semibold",
                    "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/15 text-cyan-400",
                    "border border-cyan-500/30",
                    "hover:from-cyan-500/30 hover:to-fuchsia-500/20",
                    "hover:shadow-[0_0_24px_rgba(0,200,255,0.15)]",
                    "transition-all duration-300"
                  )}
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Site
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default SystemLauncher;
