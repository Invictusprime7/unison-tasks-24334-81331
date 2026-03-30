import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  Loader2,
  Settings,
  Scissors,
  Utensils,
  ShoppingBag,
  Palette,
  Users,
  Home,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTemplatesByCategory } from "@/data/templates";
import type { BusinessSystemType, LayoutCategory } from "@/data/templates/types";
import { getCompositionReactCode, getCompositionMeta } from "@/utils/compositionReference";
import { useUserDesignProfile } from "@/hooks/useUserDesignProfile";
import { generateDesignVariation, randomFontPairing } from "@/utils/designVariation";
import {
  createBlueprintFromIndustry,
  compileContract,
  getIndustryProfile,
  type BusinessBlueprint,
} from "@/contracts";

// Industry chip configurations
const industryChips = [
  { id: "local_service", label: "Local Service", icon: Settings, examples: "Plumber, Electrician, Cleaner", canonicalIndustry: "local-service" },
  { id: "salon_spa", label: "Salon & Spa", icon: Scissors, examples: "Hair, Nails, Massage", canonicalIndustry: "salon" },
  { id: "restaurant", label: "Restaurant", icon: Utensils, examples: "Cafe, Bakery, Food Truck", canonicalIndustry: "restaurant" },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingBag, examples: "Online Store, Boutique", canonicalIndustry: "ecommerce" },
  { id: "creator_portfolio", label: "Creator", icon: Palette, examples: "Designer, Photographer", canonicalIndustry: "portfolio" },
  { id: "coaching_consulting", label: "Coaching", icon: Users, examples: "Coach, Consultant, Trainer", canonicalIndustry: "coaching" },
  { id: "real_estate", label: "Real Estate", icon: Home, examples: "Agent, Property Manager", canonicalIndustry: "real-estate" },
  { id: "nonprofit", label: "Nonprofit", icon: Heart, examples: "Charity, Foundation", canonicalIndustry: "nonprofit" },
];

/**
 * Resolve canonical industry key from chip ID.
 * Uses the contracts/industryMatrix as the single source of truth.
 */
function getCanonicalIndustry(chipId: string): string {
  const chip = industryChips.find(c => c.id === chipId);
  return chip?.canonicalIndustry || 'agency';
}

/**
 * Get the LayoutCategory for a chip (used for template/composition lookup).
 */
function getCategoryForChip(chipId: string): LayoutCategory {
  const industry = getCanonicalIndustry(chipId);
  const profile = getIndustryProfile(industry);
  return profile?.layoutCategories[0] || 'landing';
}

/**
 * Get the BusinessSystemType for a chip.
 */
function getSystemTypeForChip(chipId: string): BusinessSystemType {
  const industry = getCanonicalIndustry(chipId);
  const profile = getIndustryProfile(industry);
  return profile?.systemType || 'agency';
}

/**
 * Get template reference for systems-build from chip selection.
 * Prefers React composition code from the section registry; falls back to legacy HTML.
 */
function getTemplateReference(chipId: string): { templateId: string; templateHtml: string; systemType: BusinessSystemType } | null {
  const systemType = getSystemTypeForChip(chipId);
  const category = getCategoryForChip(chipId);

  // Prefer composition-based React code
  const compositionCode = getCompositionReactCode(category);
  const compositionMeta = getCompositionMeta(category);
  if (compositionCode && compositionMeta) {
    return {
      templateId: compositionMeta.compositionId,
      templateHtml: compositionCode,
      systemType,
    };
  }
  
  // Fallback to legacy HTML templates
  const templates = getTemplatesByCategory(category);
  if (!templates.length) return null;
  
  const bestTemplate = templates[0];
  if (!bestTemplate.code || bestTemplate.code.length < 100) return null;
  
  return {
    templateId: bestTemplate.id,
    templateHtml: bestTemplate.code,
    systemType,
  };
}

/**
 * Build a BusinessBlueprint from chip selection and prompt for systems-build.
 * Now uses the canonical contracts system as the source of truth for
 * capabilities, intents, and industry mapping.
 */
function buildBlueprintFromChip(chipId: string, prompt: string, businessName?: string) {
  const chip = industryChips.find(c => c.id === chipId);
  const canonicalIndustry = getCanonicalIndustry(chipId);
  const name = businessName || chip?.label || "My Business";

  try {
    // Use canonical blueprint from contracts system
    const blueprint = createBlueprintFromIndustry(canonicalIndustry, name, {
      prompt,
    });

    // Compile to validate — log warnings but don't block
    const compiled = compileContract(blueprint);
    if (compiled.validation.warnings > 0) {
      console.warn(`[BusinessLauncher] Blueprint warnings:`, compiled.validation.issues.filter(i => i.severity === 'warning'));
    }

    // Convert to the edge function's expected format (SystemsBuildContext shape)
    const fonts = randomFontPairing();
    const design = generateDesignVariation();

    return {
      version: "1.0",
      identity: {
        industry: canonicalIndustry,
        primary_goal: blueprint.capabilities.primaryGoal,
      },
      brand: {
        business_name: name,
        tagline: blueprint.identity.tagline || `Professional ${chip?.label || "business"} services you can trust`,
        tone: "professional and friendly",
        typography: fonts,
      },
      design,
      intents: blueprint.intents.allowed.map(i => ({ intent: i })),
      // Pass compiled contract data for richer context
      _contract: {
        capabilities: blueprint.capabilities.enabled,
        primaryCta: blueprint.intents.primaryCta,
        requiredTables: compiled.requiredTables,
        intentBindings: compiled.intentBindings,
        pages: compiled.pages,
      },
    };
  } catch (e) {
    // Fallback if industry not found in contracts
    console.warn(`[BusinessLauncher] Contract creation failed for "${canonicalIndustry}", using fallback`, e);
    const fonts = randomFontPairing();
    const design = generateDesignVariation();
    return {
      version: "1.0",
      identity: { industry: canonicalIndustry, primary_goal: "Generate leads and grow the business" },
      brand: {
        business_name: name,
        tagline: `Professional ${chip?.label || "business"} services you can trust`,
        tone: "professional and friendly",
        typography: fonts,
      },
      design,
      intents: [{ intent: "contact.submit" }, { intent: "newsletter.subscribe" }],
    };
  }
}

interface ClarifyingQuestion {
  id: string;
  question: string;
  type: "boolean" | "text" | "select";
  default?: unknown;
  options?: string[];
}

type FlowStep = "prompt" | "building" | "complete";

interface BusinessLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessLauncher({ open, onOpenChange }: BusinessLauncherProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // User Design Profile - analyzes saved projects for style-matching
  const { 
    hasProfile, 
    profile: designProfile,
    getPromptContext: getDesignPromptContext,
    projectCount: savedProjectCount 
  } = useUserDesignProfile();
  
  // Flow state
  const [step, setStep] = useState<FlowStep>("prompt");
  const [prompt, setPrompt] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Building progress
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStatus, setBuildStatus] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const resetFlow = useCallback(() => {
    setStep("prompt");
    setPrompt("");
    setSelectedChip(null);
    setBuildProgress(0);
    setBuildStatus("");
    setGeneratedCode(null);
  }, []);

  const handleClose = useCallback(() => {
    resetFlow();
    onOpenChange(false);
  }, [resetFlow, onOpenChange]);

  const handleChipClick = (chipId: string) => {
    setSelectedChip(chipId);
    const chip = industryChips.find(c => c.id === chipId);
    if (chip) {
      setPrompt(prev => prev ? `${prev} (${chip.label})` : `I need a website for my ${chip.label.toLowerCase()} business`);
    }
  };

  /**
   * Extract business name from prompt
   */
  const extractBusinessName = (text: string): string | undefined => {
    const quotedMatch = text.match(/["']([^"']+)["']/);
    const calledMatch = text.match(/called\s+([A-Z][A-Za-z\s&']+)/i);
    const namedMatch = text.match(/(?:named|for)\s+([A-Z][A-Za-z\s&']+)/i);
    return quotedMatch?.[1] || calledMatch?.[1] || namedMatch?.[1];
  };

  /**
   * Main handler - uses systems-build edge function
   */
  const handleBuild = async () => {
    if (!prompt.trim() && !selectedChip) {
      toast({ title: "Please describe your business or select a category", variant: "destructive" });
      return;
    }

    setStep("building");
    setBuildProgress(0);
    setBuildStatus("Initializing...");
    setIsLoading(true);

    try {
      // Progress: Preparing
      setBuildProgress(10);
      setBuildStatus("Analyzing your business...");
      await new Promise(r => setTimeout(r, 400));

      // Determine chip to use
      const chipId = selectedChip || detectChipFromPrompt(prompt);
      const businessName = extractBusinessName(prompt);
      
      // Build blueprint for systems-build
      const blueprint = chipId 
        ? buildBlueprintFromChip(chipId, prompt, businessName)
        : buildGenericBlueprint(prompt, businessName);
      
      // Get template reference for quality baseline
      const ref = chipId ? getTemplateReference(chipId) : null;

      setBuildProgress(25);
      setBuildStatus("Generating your website...");

      console.log(`[BusinessLauncher] Using systems-build with${ref ? ` template: ${ref.templateId}` : 'out template'}${hasProfile ? ` + design profile (${savedProjectCount} projects)` : ''}`);

      // Add user design profile context for style-matched generation
      const designProfileContext = hasProfile ? getDesignPromptContext() : null;
      const enhancedPrompt = designProfileContext 
        ? `${designProfileContext}\n\n---\n\nUser Request:\n${prompt}`
        : prompt;

      // Call systems-build edge function with React output
      const { data, error } = await supabase.functions.invoke("systems-build", {
        body: {
          blueprint,
          userPrompt: enhancedPrompt,
          enhanceWithAI: true,
          templateId: ref?.templateId,
          templateHtml: ref?.templateHtml,
          variantMode: true,
          variationSeed: `v${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          outputFormat: "react",
          userDesignProfile: hasProfile ? {
            projectCount: savedProjectCount,
            dominantStyle: designProfile?.dominantStyle,
            industryHints: designProfile?.industryHints,
          } : undefined,
        },
      });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('429')) {
          toast({ title: "Rate limit exceeded", description: "Please wait a moment before trying again.", variant: "destructive" });
          setStep("prompt");
          return;
        }
        if (msg.includes('402')) {
          toast({ title: "Credits required", description: "Please add credits to continue.", variant: "destructive" });
          setStep("prompt");
          return;
        }
        throw error;
      }

      setBuildProgress(70);
      setBuildStatus("Finalizing pages...");
      await new Promise(r => setTimeout(r, 300));

      // Prefer React VFS files; fallback to single code string
      const reactFiles = data?.files;
      const code = reactFiles?.["src/App.tsx"] || reactFiles?.["App.tsx"] || data?.code || "";
      if (!code || code.length < 50) {
        throw new Error("Failed to generate website code");
      }

      setGeneratedCode(code);
      
      setBuildProgress(90);
      setBuildStatus("Preparing builder...");
      await new Promise(r => setTimeout(r, 300));

      setBuildProgress(100);
      setBuildStatus("Complete!");
      setStep("complete");

    } catch (error) {
      console.error("Build error:", error);
      toast({ title: "Failed to generate website", description: "Please try again", variant: "destructive" });
      setStep("prompt");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Detect best chip from prompt text
   */
  const detectChipFromPrompt = (text: string): string | null => {
    const lower = text.toLowerCase();
    if (/salon|spa|hair|barber|nail|beauty|massage/.test(lower)) return "salon_spa";
    if (/restaurant|cafe|coffee|bakery|pizza|food/.test(lower)) return "restaurant";
    if (/shop|store|sell|ecommerce|retail|boutique/.test(lower)) return "ecommerce";
    if (/coach|consult|mentor|trainer/.test(lower)) return "coaching_consulting";
    if (/portfolio|creative|designer|photographer|artist/.test(lower)) return "creator_portfolio";
    if (/real estate|realtor|property/.test(lower)) return "real_estate";
    if (/nonprofit|charity|foundation|donate/.test(lower)) return "nonprofit";
    if (/plumb|electric|hvac|clean|repair|contractor|service/.test(lower)) return "local_service";
    return null;
  };

  /**
   * Build generic blueprint for free-form prompts
   */
  const buildGenericBlueprint = (text: string, businessName?: string) => {
    const fonts = randomFontPairing();
    const design = generateDesignVariation();

    return {
      version: "1.0",
      identity: {
        industry: "other",
        primary_goal: "Generate leads and grow the business",
      },
      brand: {
        business_name: businessName || "My Business",
        tagline: "Professional services you can trust",
        tone: "professional and friendly",
        palette: { primary: "#0EA5E9", secondary: "#22D3EE", accent: "#F59E0B", background: "#0F172A", foreground: "#F8FAFC" },
        typography: fonts,
      },
      design,
      intents: [{ intent: "contact.submit" }, { intent: "quote.request" }],
    };
  };

  const handleOpenBuilder = async () => {
    if (generatedCode) {
      // Parse multi-page output if present
      const { hasMultiPageMarkers, parseMultiPageOutput, generateMultiPageVFS } = await import('@/utils/redirectPageGenerator');
      let vfsFiles: Record<string, string> | undefined;
      
      if (hasMultiPageMarkers(generatedCode)) {
        const parsed = parseMultiPageOutput(generatedCode);
        vfsFiles = generateMultiPageVFS(parsed);
      }
      
      sessionStorage.setItem('ai_assistant_generated_code', generatedCode);
      navigate("/web-builder", {
        state: {
          generatedCode: vfsFiles ? undefined : generatedCode,
          vfsFiles: vfsFiles,
          templateName: `AI ${selectedChip ? industryChips.find(c => c.id === selectedChip)?.label : "Generated"}`,
          aesthetic: "modern",
          startInPreview: true,
        },
      });
      handleClose();
    }
  };

  const renderPromptStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Describe your business</h2>
        <p className="text-muted-foreground">Tell us about your business and we'll build a working system for you.</p>
      </div>
      
      <div className="relative">
        <Input
          placeholder="e.g., Mobile car detailing in Chicago. I want booking and quotes."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleBuild()}
          className="pr-12 py-6 text-lg"
        />
        <Button 
          size="icon" 
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={handleBuild}
          disabled={isLoading || (!prompt.trim() && !selectedChip)}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">Or choose a category:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {industryChips.map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.id}
                onClick={() => handleChipClick(chip.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full border transition-all",
                  selectedChip === chip.id 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background hover:bg-muted border-border hover:border-primary/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderBuildingStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div 
          className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ animationDuration: '1s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-2">Building your system</h2>
        <p className="text-muted-foreground">{buildStatus}</p>
      </div>
      
      <Progress value={buildProgress} className="w-full" />
      
      <div className="text-sm text-muted-foreground space-y-1">
        {buildProgress >= 15 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> Business created</p>}
        {buildProgress >= 30 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> CRM configured</p>}
        {buildProgress >= 50 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> Pages generated</p>}
        {buildProgress >= 70 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> Buttons wired</p>}
        {buildProgress >= 85 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> Automations active</p>}
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
        <Check className="h-10 w-10 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Your system is ready!</h2>
        <p className="text-muted-foreground">Everything is set up and working. Open the builder to customize your site.</p>
      </div>
      
      <div className="space-y-3">
        <Button className="w-full" size="lg" onClick={handleOpenBuilder}>
          Open in Builder
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button variant="outline" className="w-full" onClick={handleClose}>
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Launch Your Business</DialogTitle>
          <DialogDescription>Create a working business system in minutes</DialogDescription>
        </DialogHeader>
        
        {step === "prompt" && renderPromptStep()}
        {step === "building" && renderBuildingStep()}
        {step === "complete" && renderCompleteStep()}
      </DialogContent>
    </Dialog>
  );
}

export default BusinessLauncher;
