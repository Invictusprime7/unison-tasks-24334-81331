import { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
  Sparkles,
  Loader2,
  Eye,
} from "lucide-react";
import {
  businessSystems,
  type BusinessSystemType,
  type LayoutCategory,
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
import { normalizeLauncherFiles } from "@/utils/sandpackFilePrep";
import { createRuntimeManifest } from "@/types/runtimeManifest";
import {
  getCompositionContentContext,
  getCompositionMeta,
} from "@/utils/compositionReference";
import {
  getAllReferences,
  getReferencesForIndustry,
  INDUSTRY_CONTEXTS,
  type IndustryTag,
  type PremiumSectionReference,
} from "@/sections/references";

// ============================================================================
// Types
// ============================================================================

type WizardStep = "industry" | "templates" | "aesthetic";

interface SystemLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEP_META: { key: WizardStep; num: number; label: string; sublabel: string }[] = [
  { key: "industry", num: 1, label: "Industry", sublabel: "What you do" },
  { key: "templates", num: 2, label: "Templates", sublabel: "Pick a base" },
  { key: "aesthetic", num: 3, label: "Launch", sublabel: "Name & style" },
];

// Map businessSystem ids → industry tags for premium templates
const SYSTEM_TO_INDUSTRY: Record<string, IndustryTag[]> = {
  booking: ["salon", "restaurant", "fitness"],
  saas: ["universal"],
  agency: ["coaching", "universal"],
  portfolio: ["photography", "universal"],
  store: ["ecommerce", "universal"],
  content: ["universal"],
};

// Industry display metadata
const INDUSTRY_DISPLAY: Record<IndustryTag, { label: string; icon: string }> = {
  salon: { label: "Salon & Beauty", icon: "💇" },
  "local-service": { label: "Local Service", icon: "🔧" },
  coaching: { label: "Coaching & Consulting", icon: "🎯" },
  restaurant: { label: "Restaurant & Food", icon: "🍽️" },
  ecommerce: { label: "E-Commerce", icon: "🛍️" },
  fitness: { label: "Fitness & Wellness", icon: "💪" },
  legal: { label: "Legal", icon: "⚖️" },
  realestate: { label: "Real Estate", icon: "🏠" },
  photography: { label: "Photography", icon: "📷" },
  universal: { label: "Universal", icon: "✦" },
};

const TEMPLATE_INDUSTRY_TO_CATEGORY: Partial<Record<IndustryTag, LayoutCategory>> = {
  salon: "salon",
  "local-service": "contractor",
  coaching: "coaching",
  restaurant: "restaurant",
  ecommerce: "store",
  realestate: "realestate",
  photography: "portfolio",
  legal: "agency",
  fitness: "coaching",
};

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
// Template Preview Card — renders a mini-preview of a premium section
// ============================================================================

interface TemplateCardData {
  id: string;
  label: string;
  description: string;
  industry: IndustryTag;
  sectionTypes: string[];
  traits: string[];
  heroRef?: PremiumSectionReference;
}

function buildTemplateCards(industryTags: IndustryTag[]): TemplateCardData[] {
  const cards: TemplateCardData[] = [];

  for (const tag of industryTags) {
    const refs = getReferencesForIndustry(tag);
    const ctx = INDUSTRY_CONTEXTS.find((c) => c.industry === tag);
    const heroRef = refs.find((r) => r.sectionType === "hero");
    const servicesRef = refs.find((r) => r.sectionType === "services");
    const ctaRef = refs.find((r) => r.sectionType === "cta");

    // Build 1–2 template variants per industry
    if (heroRef) {
      cards.push({
        id: `${tag}-premium`,
        label: `${INDUSTRY_DISPLAY[tag]?.label || tag} Premium`,
        description: ctx?.toneDirective.split(".")[0] || heroRef.description,
        industry: tag,
        sectionTypes: ctx?.sectionFlow.slice(0, 6).map((s) => s) || ["hero", "services", "cta"],
        traits: heroRef.traits.slice(0, 3),
        heroRef,
      });
    }

    // Second variant if we have enough refs
    if (servicesRef && ctaRef && heroRef) {
      const altHero = refs.find((r) => r.sectionType === "hero" && r.id !== heroRef.id);
      if (altHero) {
        cards.push({
          id: `${tag}-alt`,
          label: `${INDUSTRY_DISPLAY[tag]?.label || tag} Minimal`,
          description: "Clean, focused layout emphasizing clarity and conversions",
          industry: tag,
          sectionTypes: ["hero", "services", "testimonials", "cta", "contact", "footer"],
          traits: altHero.traits.slice(0, 3),
          heroRef: altHero,
        });
      }
    }
  }

  // Add universal fallback if empty
  if (cards.length === 0) {
    const allRefs = getAllReferences();
    const universalHero = allRefs.find((r) => r.sectionType === "hero");
    if (universalHero) {
      cards.push({
        id: "universal-default",
        label: "Modern Professional",
        description: "Versatile layout for any business type",
        industry: "universal",
        sectionTypes: ["hero", "features", "testimonials", "cta", "contact", "footer"],
        traits: universalHero.traits.slice(0, 3),
        heroRef: universalHero,
      });
    }
  }

  return cards;
}

const AI_MESSAGE_CHAR_LIMIT = 8_500;
const CUSTOM_INSTRUCTION_CHAR_LIMIT = 600;
const INDUSTRY_CONTEXT_CHAR_LIMIT = 1_200;

function clampPromptText(value: string, max = AI_MESSAGE_CHAR_LIMIT): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function buildTemplateGuidance(card: TemplateCardData | null): string {
  if (!card) return "";

  const industryContext = INDUSTRY_CONTEXTS.find((entry) => entry.industry === card.industry);
  const displayLabel = INDUSTRY_DISPLAY[card.industry]?.label || card.industry;
  const sectionFlow = card.sectionTypes.length > 0
    ? card.sectionTypes
    : industryContext?.sectionFlow || [];

  return [
    `Template: ${card.label}`,
    `Industry: ${displayLabel}`,
    `Description: ${card.description}`,
    sectionFlow.length > 0 ? `Preferred sections: ${sectionFlow.join(" → ")}` : "",
    card.traits.length > 0 ? `Visual traits: ${card.traits.join(", ")}` : "",
    industryContext?.toneDirective ? `Tone direction: ${industryContext.toneDirective}` : "",
    industryContext?.conversionGoals?.length ? `Conversion goals: ${industryContext.conversionGoals.join(", ")}` : "",
    industryContext?.trustSignals?.length ? `Trust signals: ${industryContext.trustSignals.join(", ")}` : "",
    "Use a premium image-first hero, semantic sections, one H1, and HSL design tokens only.",
  ]
    .filter(Boolean)
    .join("\n");
}

function getGenerationCategory(
  system: (typeof businessSystems)[number],
  template: TemplateCardData | null
): LayoutCategory {
  const templateCategory = template
    ? TEMPLATE_INDUSTRY_TO_CATEGORY[template.industry]
    : undefined;

  return (templateCategory || system.templateCategories[0]) as LayoutCategory;
}

function getFunctionErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const withContext = error as Error & { context?: { body?: string } };
    const body = withContext.context?.body;

    if (typeof body === "string" && body) {
      try {
        const parsed = JSON.parse(body) as { error?: string; details?: unknown };
        if (parsed.error) return parsed.error;
      } catch {
        return body;
      }
    }

    return error.message;
  }

  if (typeof error === "string") return error;

  return "Generation failed";
}

// Mini preview component
const TemplatePreview = ({ card, isSelected, onClick }: { card: TemplateCardData; isSelected: boolean; onClick: () => void }) => {
  const display = INDUSTRY_DISPLAY[card.industry];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative rounded-xl text-left transition-all duration-300 overflow-hidden",
        "border focus:outline-none",
        isSelected
          ? "border-cyan-500/40 shadow-[0_0_30px_rgba(0,200,255,0.1)] ring-1 ring-cyan-500/20"
          : "border-white/[0.06] hover:border-white/[0.15]"
      )}
    >
      {/* Mini preview area */}
      <div className={cn(
        "relative h-36 overflow-hidden",
        isSelected ? "bg-cyan-500/[0.04]" : "bg-white/[0.02]"
      )}>
        {/* Simulated section layout preview */}
        <div className="absolute inset-0 p-3 flex flex-col gap-1.5 opacity-60 group-hover:opacity-80 transition-opacity">
          {/* Navbar bar */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1.5 rounded-full bg-white/20" />
            <div className="flex-1" />
            <div className="w-3 h-1 rounded-full bg-white/10" />
            <div className="w-3 h-1 rounded-full bg-white/10" />
            <div className="w-3 h-1 rounded-full bg-white/10" />
          </div>
          {/* Hero block */}
          <div className="flex-1 rounded-lg p-2 flex flex-col justify-center" style={{
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.08))`,
          }}>
            <div className="w-8 h-1 rounded-full bg-primary/40 mb-1.5" />
            <div className="w-16 h-2 rounded bg-white/25 mb-1" />
            <div className="w-12 h-1 rounded bg-white/10 mb-2" />
            <div className="flex gap-1">
              <div className="w-6 h-2 rounded-full bg-primary/50" />
              <div className="w-5 h-2 rounded-full border border-white/15" />
            </div>
          </div>
          {/* Section blocks */}
          <div className="flex gap-1">
            {card.sectionTypes.slice(1, 4).map((_, i) => (
              <div key={i} className="flex-1 h-5 rounded bg-white/[0.03] border border-white/[0.04]" />
            ))}
          </div>
          {/* Footer bar */}
          <div className="h-2 rounded bg-white/[0.03]" />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-white/90 text-xs font-medium">
            <Eye className="h-3.5 w-3.5" />
            Use Template
          </div>
        </div>

        {/* Selected check */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg z-10"
          >
            <Check className="h-3.5 w-3.5 text-[#07080F]" />
          </motion.div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs">{display?.icon}</span>
          <h4 className="text-xs font-semibold text-white/80 truncate">{card.label}</h4>
        </div>
        <p className="text-[10px] text-white/25 leading-relaxed line-clamp-2">{card.description}</p>
        {/* Trait badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          {card.traits.slice(0, 2).map((trait) => (
            <span key={trait} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/20 border border-white/[0.04]">
              {trait}
            </span>
          ))}
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/20 border border-white/[0.04]">
            {card.sectionTypes.length} sections
          </span>
        </div>
      </div>
    </motion.button>
  );
};

// ============================================================================
// Component
// ============================================================================

export const SystemLauncher = ({ open, onOpenChange }: SystemLauncherProps) => {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("industry");
  const [selectedSystem, setSelectedSystem] = useState<BusinessSystemType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCardData | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  const currentStepIdx = STEP_META.findIndex((s) => s.key === step);

  // Build template cards based on selected system
  const templateCards = useMemo(() => {
    if (!selectedSystem) return [];
    const tags = SYSTEM_TO_INDUSTRY[selectedSystem] || ["universal"];
    return buildTemplateCards(tags as IndustryTag[]);
  }, [selectedSystem]);

  // Group templates by industry
  const templatesByIndustry = useMemo(() => {
    const grouped: Record<string, TemplateCardData[]> = {};
    for (const card of templateCards) {
      const key = card.industry;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(card);
    }
    return grouped;
  }, [templateCards]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setStep("industry");
    setSelectedSystem(null);
    setSelectedTemplate(null);
    setSelectedTheme(null);
    setBusinessName("");
    setCustomPrompt("");
    setIsLaunching(false);
  }, []);

  const handleSystemSelect = (systemId: BusinessSystemType) => {
    setSelectedSystem(systemId);
    setSelectedTemplate(null);
    setStep("templates");
  };

  const handleTemplateSelect = (card: TemplateCardData) => {
    setSelectedTemplate(selectedTemplate?.id === card.id ? null : card);
  };

  const handleTemplateNext = () => {
    setStep("aesthetic");
  };

  const handleBack = () => {
    if (step === "aesthetic") {
      setStep("templates");
      setSelectedTheme(null);
    } else if (step === "templates") {
      setStep("industry");
      setSelectedSystem(null);
      setSelectedTemplate(null);
    }
  };

  const handleLaunch = async () => {
    if (!selectedSystem) return;
    const system = businessSystems.find((s) => s.id === selectedSystem);
    if (!system) return;
    if (!businessName.trim()) {
      toast.error("Please enter your business name");
      return;
    }

    setIsLaunching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Please sign in to continue");
        navigate("/auth");
        return;
      }

      const generationCategory = getGenerationCategory(system, selectedTemplate);
      const industryProfile = getIndustryForCategory(generationCategory);
      const compositionMeta = getCompositionMeta(generationCategory);
      const canonicalIntents = Array.from(new Set([
        ...(industryProfile
          ? getAllowedIntents(industryProfile.defaultCapabilities)
          : system.intents),
        ...(compositionMeta?.intents || []),
      ]));

      const fonts = randomFontPairing();
      const design = generateDesignVariation();
      const resolvedIndustry = industryProfile?.industry || generationCategory;

      const blueprint = {
        version: "1.0",
        identity: {
          industry: resolvedIndustry,
          business_model: system.id,
          primary_goal: industryProfile
            ? industryProfile.defaultCapabilities.includes("booking")
              ? "bookings"
              : "leads"
            : "Generate leads and grow the business",
        },
        brand: {
          business_name: businessName.trim(),
          tagline: `Professional ${system.name.toLowerCase()} services you can trust`,
          tone: "professional and friendly",
          typography: fonts,
        },
        design,
        intents: canonicalIntents.map((i: string) => ({ intent: i })),
        template_sections: selectedTemplate?.sectionTypes?.length
          ? selectedTemplate.sectionTypes
          : compositionMeta?.sections,
        template_intents: compositionMeta?.intents,
      };

      const themeInstruction = selectedTheme
        ? `\n\n🎨 VISUAL AESTHETIC: ${selectedTheme.label}\n${selectedTheme.styleDirective}\nPalette: bg=${selectedTheme.palette.bg}, fg=${selectedTheme.palette.fg}, accent=${selectedTheme.palette.accent}${selectedTheme.palette.accent2 ? `, accent2=${selectedTheme.palette.accent2}` : ""}\nTypography: heading=${selectedTheme.typography.headingFont}, body=${selectedTheme.typography.bodyFont}, weight=${selectedTheme.typography.headingWeight}\n`
        : "";
      const customInstruction = customPrompt.trim()
        ? `\n\nADDITIONAL INSTRUCTIONS: ${clampPromptText(customPrompt.trim(), CUSTOM_INSTRUCTION_CHAR_LIMIT)}\n`
        : "";

      const contentContext = clampPromptText(
        getCompositionContentContext(generationCategory) || "",
        INDUSTRY_CONTEXT_CHAR_LIMIT
      );
      const industryContextBlock = contentContext
        ? `\n\n📋 INDUSTRY CONTENT CONTEXT:\n${contentContext}\n`
        : "";

      const templateGuidance = buildTemplateGuidance(selectedTemplate);
      const templateContext = templateGuidance
        ? `\n\n--- TEMPLATE GUIDANCE ---\n${templateGuidance}\n`
        : "";

      const userPrompt = clampPromptText(
        `Create a premium ${resolvedIndustry} website for "${businessName.trim()}".${templateContext}${industryContextBlock}${themeInstruction}${customInstruction}`,
        AI_MESSAGE_CHAR_LIMIT
      );

      toast("Generating your site…", { description: "This takes ~15 seconds" });

      // NOTE: We intentionally do NOT send compositionCode as currentCode here.
      // Sending it disables the fast-path in the edge function and causes timeouts.
      // The blueprint + template guidance in the user prompt provide enough context.
      const { data, error } = await supabase.functions.invoke("ai-code-assistant", {
        body: {
          messages: [{ role: "user", content: userPrompt }],
          mode: "template-react",
          variationSeed: `v${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          templateName: businessName.trim() || system.name,
          aesthetic: selectedTheme?.id || "modern professional",
          source: resolvedIndustry,
          savePattern: false,
          systemsBuildContext: blueprint,
          systemType: selectedSystem,
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

      const rawContent = (data?.content || data?.code || "")
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
        .trim()
        .replace(/^```json?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();

      const baseCSS = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --background: 222.2 84% 4.9%;\n  --foreground: 210 40% 98%;\n  --card: 222.2 84% 4.9%;\n  --card-foreground: 210 40% 98%;\n  --primary: 217.2 91.2% 59.8%;\n  --primary-foreground: 222.2 47.4% 11.2%;\n  --secondary: 217.2 32.6% 17.5%;\n  --secondary-foreground: 210 40% 98%;\n  --muted: 217.2 32.6% 17.5%;\n  --muted-foreground: 215 20.2% 65.1%;\n  --accent: 217.2 32.6% 17.5%;\n  --accent-foreground: 210 40% 98%;\n  --border: 217.2 32.6% 17.5%;\n  --radius: 0.75rem;\n}\n\n* { border-color: hsl(var(--border)); }\nbody { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: hsl(var(--background)); color: hsl(var(--foreground)); }\n`;

      let vfsFiles: Record<string, string> | null = null;
      let parsedEntryPoint: string | undefined;
      try {
        const parsed = JSON.parse(rawContent);
        if (parsed.files && typeof parsed.files === "object") {
          parsedEntryPoint = parsed.entryPoint || undefined;
          // Use normalizeLauncherFiles to ensure consistent structure
          vfsFiles = normalizeLauncherFiles(parsed.files, {
            entryPoint: parsedEntryPoint,
          });
        }
      } catch {
        // single-file output
      }

      const navState = {
        templateName: `${businessName.trim()} Site`,
        aesthetic: selectedTheme?.id,
        templateCategory: generationCategory,
        systemType: selectedSystem,
        systemName: system.name,
        preloadedIntents: canonicalIntents,
        startInPreview: true,
      };

      if (vfsFiles && Object.keys(vfsFiles).length > 0) {
        // Build RuntimeManifest — the contract between launcher and preview
        const runtimeManifest = createRuntimeManifest(vfsFiles, {
          entryPoint: parsedEntryPoint || '/src/App.tsx',
          industry: generationCategory,
          brandName: businessName.trim(),
          aesthetic: selectedTheme?.id,
          backendRequired: false, // Launcher output is always frontend-only
        });

        navigate("/web-builder", {
          state: { vfsFiles, runtimeManifest, ...navState },
        });
      } else if (rawContent.length >= 100 && looksLikeCode(rawContent)) {
        const cleaned = extractCleanCode(rawContent);
        if (!cleaned || !looksLikeCode(cleaned)) {
          toast.error("AI generation produced invalid output. Try again.");
          return;
        }
        const singleFileVfs = {
          "/src/App.tsx": cleaned,
          "/src/main.tsx": `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`,
          "/src/index.css": baseCSS,
        };
        const runtimeManifest = createRuntimeManifest(singleFileVfs, {
          industry: generationCategory,
          brandName: businessName.trim(),
          aesthetic: selectedTheme?.id,
          backendRequired: false,
        });

        navigate("/web-builder", {
          state: {
            vfsFiles: singleFileVfs,
            runtimeManifest,
            ...navState,
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
      const msg = getFunctionErrorMessage(e);
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
      <DialogContent className="max-w-[960px] p-0 overflow-hidden border-0 bg-[#07080F] max-h-[92vh] shadow-[0_0_100px_rgba(0,200,255,0.06),0_0_40px_rgba(0,0,0,0.5)]">
        <DialogHeader className="sr-only">
          <DialogTitle>Launch Your Website</DialogTitle>
          <DialogDescription>
            Choose your industry, select a template, and customize.
          </DialogDescription>
        </DialogHeader>

        {/* ─── Header + Step Indicator ─── */}
        <div className="relative px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-cyan-500/[0.04] rounded-full blur-[100px]" />
          </div>

          <div className="relative flex items-center justify-between mb-4">
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
                      "w-14 h-px mx-1.5 transition-colors duration-500",
                      isPast ? "bg-gradient-to-r from-cyan-500/60 to-cyan-500/30" : "bg-white/[0.06]"
                    )} />
                  )}
                  <button
                    onClick={() => {
                      if (isPast) {
                        setStep(s.key);
                        if (s.key === "industry") { setSelectedSystem(null); setSelectedTemplate(null); setSelectedTheme(null); }
                        if (s.key === "templates") setSelectedTheme(null);
                      }
                    }}
                    disabled={!isPast && !isActive}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 outline-none",
                      isActive && "bg-cyan-500/12 text-cyan-400 ring-1 ring-cyan-500/25",
                      isPast && "bg-cyan-500/8 text-cyan-500/60 hover:text-cyan-400 cursor-pointer",
                      !isActive && !isPast && "text-white/20"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
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
              className="px-6 pt-7 pb-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                  What are you building?
                </h2>
                <p className="text-sm text-white/35 max-w-md mx-auto">
                  Pick your industry — we'll show you premium templates built for it.
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
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                      card.gradient
                    )} />
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

              <div className="text-center mt-7">
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

          {/* ══ Step 2: Templates ══ */}
          {step === "templates" && selectedSystem && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col"
            >
              <div className="px-6 pt-4 pb-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8 text-white/35 hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Choose a template</h2>
                  <p className="text-xs text-white/30">
                    Premium layouts for{" "}
                    <span className="text-cyan-400/70 font-medium">
                      {INDUSTRY_CARDS.find((c) => c.systemId === selectedSystem)?.label}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex-1 max-h-[55vh] overflow-y-auto px-6 pb-4 scrollbar-hide">
                {Object.entries(templatesByIndustry).map(([industryKey, cards]) => {
                  const display = INDUSTRY_DISPLAY[industryKey as IndustryTag];
                  return (
                    <div key={industryKey} className="mb-5 last:mb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">{display?.icon}</span>
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          {display?.label || industryKey}
                        </h3>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {cards.map((card) => (
                          <TemplatePreview
                            key={card.id}
                            card={card}
                            isSelected={selectedTemplate?.id === card.id}
                            onClick={() => handleTemplateSelect(card)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {templateCards.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-white/30 text-sm">No premium templates available for this category yet.</p>
                    <p className="text-white/15 text-xs mt-1">AI will generate a custom layout.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex-1 text-sm">
                  {selectedTemplate ? (
                    <span className="flex items-center gap-2 text-white/50">
                      <Check className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-cyan-400 font-medium text-xs">{selectedTemplate.label}</span>
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">Select a template or continue for AI layout</span>
                  )}
                </div>
                <Button
                  onClick={handleTemplateNext}
                  className={cn(
                    "bg-cyan-500/12 text-cyan-400 border border-cyan-500/25",
                    "hover:bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(0,200,255,0.12)]",
                    "transition-all"
                  )}
                >
                  Continue
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ══ Step 3: Aesthetic + Name ══ */}
          {step === "aesthetic" && selectedSystem && (
            <motion.div
              key="aesthetic"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col"
            >
              <div className="px-6 pt-4 pb-3 flex items-center gap-3">
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
                    Name & style
                  </h2>
                  <p className="text-xs text-white/30">
                    Final details before we generate your site
                  </p>
                </div>
              </div>

              <div className="flex-1 max-h-[55vh] overflow-y-auto px-6 pb-4 scrollbar-hide">
                {/* Business Name */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                    Business Name <span className="text-cyan-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Stellar Studio, QuickFix Plumbing…"
                    className={cn(
                      "w-full px-4 py-3 text-sm rounded-xl transition-all duration-200",
                      "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20",
                      "focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/25 focus:bg-white/[0.06]",
                      "outline-none"
                    )}
                    autoFocus
                  />
                </div>

                {/* Theme Grid */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    Visual Style <span className="text-white/20">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    {THEME_PRESETS.map((theme) => {
                      const isSelected = selectedTheme?.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setSelectedTheme(isSelected ? null : theme)}
                          className={cn(
                            "relative p-3.5 rounded-xl text-left transition-all duration-300",
                            "border focus:outline-none overflow-hidden",
                            isSelected
                              ? "bg-cyan-500/[0.06] border-cyan-500/35"
                              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]"
                          )}
                        >
                          {/* Color swatches */}
                          <div className="flex gap-1.5 mb-3">
                            {[theme.palette.bg, theme.palette.accent, theme.palette.accent2 || theme.palette.fg].map(
                              (color, ci) => (
                                <div
                                  key={ci}
                                  className="w-6 h-6 rounded-md ring-1 ring-white/5"
                                  style={{ backgroundColor: color }}
                                />
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm opacity-60">{theme.icon}</span>
                            <h3 className="font-semibold text-xs text-white/90">{theme.label}</h3>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center"
                              >
                                <Check className="h-2.5 w-2.5 text-[#07080F]" />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-[10px] text-white/25 leading-relaxed">{theme.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom prompt */}
                <div>
                  <label className="text-xs font-medium text-white/40 mb-2 block">
                    Custom instructions <span className="text-white/15">(optional)</span>
                  </label>
                  <textarea
                    placeholder="e.g., Include a pricing section, use warm tones…"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className={cn(
                      "w-full min-h-[56px] p-3 text-sm rounded-xl resize-none transition-all",
                      "bg-white/[0.03] border border-white/[0.06] text-white/80 placeholder:text-white/15",
                      "focus:ring-1 focus:ring-cyan-500/25 focus:border-cyan-500/25 focus:bg-white/[0.05]",
                      "outline-none"
                    )}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    {selectedTemplate && (
                      <span className="flex items-center gap-1">
                        <span className="text-white/50">Template:</span>
                        <span className="text-cyan-400/70">{selectedTemplate.label}</span>
                      </span>
                    )}
                    {selectedTheme && (
                      <span className="flex items-center gap-1">
                        <span className="text-white/50">Style:</span>
                        <span className="text-cyan-400/70">{selectedTheme.label}</span>
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleLaunch}
                  disabled={isLaunching || !businessName.trim()}
                  className={cn(
                    "h-10 px-6 text-sm font-semibold",
                    "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/15 text-cyan-400",
                    "border border-cyan-500/30",
                    "hover:from-cyan-500/30 hover:to-fuchsia-500/20",
                    "hover:shadow-[0_0_24px_rgba(0,200,255,0.15)]",
                    "transition-all duration-300",
                    "disabled:opacity-30"
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
