/**
 * SystemsAIPanel - AI Code Assistant panel for the homepage
 * 
 * Allows users to describe what they want to build and generates
 * production-ready code using the systems-build edge function with
 * premium template references for quality baseline.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Loader2,
  Wrench,
  Scissors,
  Utensils,
  ShoppingBag,
  Palette,
  Users,
  Home,
  Heart,
  Code2
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { getTemplatesByCategory } from "@/data/templates";
import type { BusinessSystemType, LayoutCategory } from "@/data/templates/types";

// Map chip IDs to BusinessSystemType for template lookup
const CHIP_TO_SYSTEM: Record<string, BusinessSystemType> = {
  local_service: "booking",
  salon_spa: "booking",
  restaurant: "booking",
  ecommerce: "store",
  creator: "portfolio",
  coaching: "booking",
  real_estate: "agency",
  nonprofit: "content",
};

// Map chip IDs to industry string for the blueprint
const CHIP_TO_INDUSTRY: Record<string, string> = {
  local_service: "local_service",
  salon_spa: "salon_spa",
  restaurant: "restaurant",
  ecommerce: "ecommerce",
  creator: "creator_portfolio",
  coaching: "coaching_consulting",
  real_estate: "real_estate",
  nonprofit: "nonprofit",
};

// Industry/business prompt chips for quick actions
const codePromptChips = [
  { id: "local_service", label: "Local Service", icon: Wrench, color: "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20", prompt: "Create a professional website for a local service business like plumbing, HVAC, or electrical with service areas, booking form, testimonials, and emergency contact" },
  { id: "salon_spa", label: "Salon & Spa", icon: Scissors, color: "bg-pink-500/10 text-pink-600 border-pink-200 hover:bg-pink-500/20", prompt: "Create an elegant salon or spa website with service menu, appointment booking, stylist profiles, gallery, and gift card section" },
  { id: "restaurant", label: "Restaurant", icon: Utensils, color: "bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/20", prompt: "Create a restaurant website with menu display, online ordering, reservation system, location/hours, and photo gallery" },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingBag, color: "bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20", prompt: "Create an e-commerce storefront with product catalog, shopping cart, checkout flow, and customer reviews" },
  { id: "creator", label: "Creator", icon: Palette, color: "bg-indigo-500/10 text-indigo-600 border-indigo-200 hover:bg-indigo-500/20", prompt: "Create a creator portfolio website with project showcase, about section, client testimonials, and contact form" },
  { id: "coaching", label: "Coaching", icon: Users, color: "bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20", prompt: "Create a coaching or consulting website with services offered, booking calendar, client success stories, and free resource downloads" },
  { id: "real_estate", label: "Real Estate", icon: Home, color: "bg-cyan-500/10 text-cyan-600 border-cyan-200 hover:bg-cyan-500/20", prompt: "Create a real estate agent website with property listings, search filters, agent bio, market insights, and contact form" },
  { id: "nonprofit", label: "Nonprofit", icon: Heart, color: "bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-500/20", prompt: "Create a nonprofit organization website with mission statement, donation form, volunteer signup, events calendar, and impact stories" },
];

interface SystemsAIPanelProps {
  user: User | null;
  onAuthRequired?: () => void;
}

// Map chip IDs to LayoutCategory for direct template lookup
const CHIP_TO_CATEGORY: Record<string, LayoutCategory> = {
  local_service: "contractor",
  salon_spa: "salon",
  restaurant: "restaurant",
  ecommerce: "store",
  creator: "portfolio",
  coaching: "coaching",
  real_estate: "realestate",
  nonprofit: "nonprofit",
};

/**
 * Picks the best template HTML for a given chip to use as AI reference.
 * Prefers the first (dark luxury) variant as it's typically the most premium.
 */
function getTemplateReference(chipId: string): { templateId: string; templateHtml: string; systemType: BusinessSystemType } | null {
  const systemType = CHIP_TO_SYSTEM[chipId];
  const category = CHIP_TO_CATEGORY[chipId];
  if (!systemType || !category) return null;
  
  const templates = getTemplatesByCategory(category);
  if (!templates.length) return null;
  
  // Pick first template (dark luxury variant) as the quality baseline
  const bestTemplate = templates[0];
  if (!bestTemplate.code || bestTemplate.code.length < 100) return null;
  
  return {
    templateId: bestTemplate.id,
    templateHtml: bestTemplate.code,
    systemType,
  };
}

/**
 * Build a minimal BusinessBlueprint from a chip selection for systems-build
 */
function buildBlueprintFromChip(chipId: string, prompt: string) {
  const chip = codePromptChips.find(c => c.id === chipId);
  const industry = CHIP_TO_INDUSTRY[chipId] || "other";
  
  // Industry-specific defaults
  const INDUSTRY_DEFAULTS: Record<string, { palette: Record<string, string>; intents: string[] }> = {
    salon_spa: { palette: { primary: "#D4A574", secondary: "#8B6F4E", accent: "#E8D5C4", background: "#1A1A2E", foreground: "#F5F5F5" }, intents: ["booking.create", "contact.submit", "newsletter.subscribe"] },
    restaurant: { palette: { primary: "#D4A574", secondary: "#8B4513", accent: "#FFD700", background: "#1A1A1A", foreground: "#FFFFFF" }, intents: ["booking.create", "contact.submit", "newsletter.subscribe"] },
    local_service: { palette: { primary: "#0EA5E9", secondary: "#22D3EE", accent: "#F59E0B", background: "#0F172A", foreground: "#F8FAFC" }, intents: ["quote.request", "contact.submit", "booking.create"] },
    ecommerce: { palette: { primary: "#8B5CF6", secondary: "#A78BFA", accent: "#F59E0B", background: "#0F0F0F", foreground: "#FFFFFF" }, intents: ["newsletter.subscribe", "contact.submit"] },
    creator: { palette: { primary: "#6366F1", secondary: "#818CF8", accent: "#F472B6", background: "#0A0A0A", foreground: "#FAFAFA" }, intents: ["contact.submit", "quote.request"] },
    coaching: { palette: { primary: "#10B981", secondary: "#34D399", accent: "#F59E0B", background: "#0F172A", foreground: "#F8FAFC" }, intents: ["booking.create", "contact.submit", "newsletter.subscribe", "quote.request"] },
    real_estate: { palette: { primary: "#D4AF37", secondary: "#C9B037", accent: "#1E3A5F", background: "#0A0A0A", foreground: "#FFFFFF" }, intents: ["contact.submit", "quote.request", "newsletter.subscribe"] },
    nonprofit: { palette: { primary: "#E11D48", secondary: "#FB7185", accent: "#F59E0B", background: "#FFFFFF", foreground: "#1E293B" }, intents: ["contact.submit", "newsletter.subscribe"] },
  };

  const defaults = INDUSTRY_DEFAULTS[chipId] || { palette: { primary: "#0EA5E9" }, intents: ["contact.submit"] };

  return {
    version: "1.0",
    identity: {
      industry: industry,
      primary_goal: "Generate leads and grow the business",
    },
    brand: {
      business_name: chip?.label || "My Business",
      tagline: `Professional ${chip?.label || "business"} services you can trust`,
      tone: "professional and friendly",
      palette: defaults.palette,
      typography: { heading: "Plus Jakarta Sans", body: "Inter" },
    },
    design: {
      layout: { hero_style: "split" as const, section_spacing: "spacious" as const, navigation_style: "fixed" as const },
      effects: { animations: true, scroll_animations: true, hover_effects: true, gradient_backgrounds: true, glassmorphism: true, shadows: "dramatic" as const },
      sections: { include_stats: true, include_testimonials: true, include_faq: true, include_cta_banner: true, include_newsletter: true, include_social_proof: true },
    },
    intents: defaults.intents.map(i => ({ intent: i })),
  };
}

export function SystemsAIPanel({ user, onAuthRequired }: SystemsAIPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Code Assistant state
  const [codePrompt, setCodePrompt] = useState("");
  const [selectedCodeChip, setSelectedCodeChip] = useState<string | null>(null);
  const [isCodeLoading, setIsCodeLoading] = useState(false);

  // Handler for code chip click
  const handleCodeChipClick = (chipId: string) => {
    const chip = codePromptChips.find(c => c.id === chipId);
    if (chip) {
      setSelectedCodeChip(chipId);
      setCodePrompt(chip.prompt);
    }
  };

  // Handler for code assistant submit - routes through systems-build with template reference
  const handleCodeSubmit = async () => {
    if (!codePrompt.trim()) {
      toast({ title: "Please describe what you want to build", variant: "destructive" });
      return;
    }

    setIsCodeLoading(true);

    try {
      // If a chip is selected, use systems-build with template reference for premium quality
      if (selectedCodeChip) {
        const ref = getTemplateReference(selectedCodeChip);
        const blueprint = buildBlueprintFromChip(selectedCodeChip, codePrompt);

        console.log(`[SystemsAIPanel] Using systems-build with${ref ? ` template reference: ${ref.templateId}` : 'out template reference'}`);

        const { data, error } = await supabase.functions.invoke("systems-build", {
          body: {
            blueprint,
            userPrompt: codePrompt,
            enhanceWithAI: true,
            templateId: ref?.templateId,
            templateHtml: ref?.templateHtml,
          },
        });

        if (error) {
          if (error.message?.includes('429')) {
            toast({ title: "Rate limit exceeded", description: "Please wait a moment before trying again.", variant: "destructive" });
            return;
          }
          if (error.message?.includes('402')) {
            toast({ title: "Credits required", description: "Please add credits to continue using AI features.", variant: "destructive" });
            return;
          }
          throw error;
        }

        const generatedCode = data?.code || "";
        if (generatedCode && generatedCode.length > 50) {
          console.log('[SystemsAIPanel] systems-build generated', generatedCode.length, 'chars');
          sessionStorage.setItem('ai_assistant_generated_code', generatedCode);
          navigate("/web-builder", {
            state: {
              generatedCode,
              templateName: `AI ${codePromptChips.find(c => c.id === selectedCodeChip)?.label || "Generated"}`,
              aesthetic: "modern",
              startInPreview: true,
              systemType: ref?.systemType,
            },
          });
          toast({ title: "Website generated!", description: "Opening in Web Builder..." });
          return;
        }
      }

      // Fallback: use ai-code-assistant for free-form prompts without a chip selected
      const enhancedPrompt = buildFreeformPrompt(codePrompt);

      const { data, error } = await supabase.functions.invoke("ai-code-assistant", {
        body: {
          messages: [{ role: "user", content: enhancedPrompt }],
          mode: "code",
          templateAction: "full-control",
          editMode: false,
        },
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast({ title: "Rate limit exceeded", description: "Please wait a moment.", variant: "destructive" });
          return;
        }
        if (error.message?.includes('402')) {
          toast({ title: "Credits required", description: "Please add credits.", variant: "destructive" });
          return;
        }
        throw error;
      }

      const content = data?.content || "";
      let codeMatch = content.match(/```(?:html|jsx|tsx|javascript|js|typescript|ts)\n([\s\S]*?)```/);
      if (!codeMatch) codeMatch = content.match(/```\n([\s\S]*?)```/);
      if (!codeMatch) codeMatch = content.match(/```(?:html|jsx|tsx|javascript|js|typescript|ts)?\n?([\s\S]*?)```/);
      
      let generatedCode = codeMatch ? codeMatch[1].trim() : content.trim();
      if (generatedCode) {
        generatedCode = generatedCode
          .replace(/^#{1,6}\s+.*$/gm, '')
          .replace(/```[\w]*\n?/g, '')
          .replace(/^[<>-]{3,}.*$/gm, '')
          .replace(/<<<|>>>|---/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      if (generatedCode) {
        sessionStorage.setItem('ai_assistant_generated_code', generatedCode);
        navigate("/web-builder", {
          state: { generatedCode, templateName: "AI Generated", aesthetic: "modern", startInPreview: true },
        });
        toast({ title: "Code generated!", description: "Opening in Web Builder..." });
      } else {
        toast({ title: "No code generated", description: "Please try a different prompt", variant: "destructive" });
      }
    } catch (error) {
      console.error("Code generation error:", error);
      toast({ title: "Generation failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsCodeLoading(false);
    }
  };

  return (
    <section id="systems-ai" className="relative py-16 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-primary mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI Code Assistant</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Describe what you want to build
            </h2>
            <p className="text-lg text-muted-foreground">
              Tell the AI what you need and get production-ready code in seconds
            </p>
          </div>

          {/* Main Input Card */}
          <Card className="border-2 shadow-lg bg-card/80 backdrop-blur">
            <CardContent className="p-6">
              {/* Text Input */}
              <div className="relative mb-6">
                <textarea
                  placeholder="e.g., Create a modern landing page with a hero section, feature cards, testimonials carousel, and a contact form with email validation."
                  value={codePrompt}
                  onChange={(e) => setCodePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCodeSubmit();
                    }
                  }}
                  className="w-full min-h-[120px] p-4 pr-14 text-lg border-2 rounded-xl resize-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background"
                />
                <Button 
                  size="icon"
                  className="absolute right-3 bottom-3 h-10 w-10 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  onClick={handleCodeSubmit}
                  disabled={isCodeLoading || !codePrompt.trim()}
                >
                  {isCodeLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Code Prompt Chips */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">Or choose a template type:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {codePromptChips.map((chip) => {
                    const Icon = chip.icon;
                    const isSelected = selectedCodeChip === chip.id;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => handleCodeChipClick(chip.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${isSelected ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-600 scale-105 shadow-md" : chip.color}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* What you'll get */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium">AI-powered code</p>
              <p className="text-xs text-muted-foreground">Smart generation</p>
            </div>
            <div className="p-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center">
                <Code2 className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm font-medium">Clean HTML/CSS</p>
              <p className="text-xs text-muted-foreground">Tailwind, React...</p>
            </div>
            <div className="p-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium">Open in builder</p>
              <p className="text-xs text-muted-foreground">Edit & customize</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Build an enhanced freeform prompt for ai-code-assistant (no chip selected)
 */
function buildFreeformPrompt(prompt: string): string {
  return `🚀 CREATE A COMPLETE, POLISHED, PRODUCTION-READY MULTI-PAGE WEBSITE

USER REQUEST: ${prompt}

📋 CRITICAL REQUIREMENTS - YOU MUST INCLUDE ALL OF THESE:

1. **COMPLETE HTML DOCUMENT** - Start with <!DOCTYPE html> and include full <html>, <head>, <body>
2. **TAILWIND CSS** - Include <script src="https://cdn.tailwindcss.com"></script>
3. **MULTI-SECTION LAYOUT** - Include AT MINIMUM:
   - Navigation header with logo and menu links
   - Hero section with compelling headline, subtext, and CTA button
   - Features/services section with 3-4 feature cards
   - Testimonials or social proof section
   - Contact/CTA section
   - Footer with links and copyright

4. **REAL, COMPELLING CONTENT** - NOT placeholder text
5. **POLISHED VISUAL DESIGN** - Modern color scheme, gradients, typography, hover effects
6. **INTERACTIVE ELEMENTS** - Working navigation, hover states, scroll animations
7. **BACKEND INTENT WIRING** - data-ut-intent attributes on CTAs
8. **UI CONTROLS WITHOUT INTENTS** - data-no-intent on non-conversion elements

OUTPUT FORMAT:
- Return ONLY the complete HTML code
- NO markdown, NO explanations
- Start with <!DOCTYPE html>`;
}

export default SystemsAIPanel;
