import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Sparkles, Loader2, Wrench, Scissors, Utensils, ShoppingBag, Palette, Users, Home, Heart, Layout, Crown } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

// Industry chips for quick-start
const INDUSTRY_CHIPS = [
  { id: "local_service", label: "Contractor", icon: Wrench, prompt: "Create a professional website for a local service business with service areas, booking form, testimonials, and emergency contact" },
  { id: "salon_spa", label: "Salon & Spa", icon: Scissors, prompt: "Create an elegant salon or spa website with service menu, appointment booking, stylist profiles, gallery, and gift card section" },
  { id: "restaurant", label: "Restaurant", icon: Utensils, prompt: "Create a restaurant website with menu display, online ordering, reservation system, location/hours, and photo gallery" },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingBag, prompt: "Create an e-commerce storefront with product catalog, shopping cart, checkout flow, and customer reviews" },
  { id: "creator", label: "Portfolio", icon: Palette, prompt: "Create a creator portfolio website with project showcase, about section, client testimonials, and contact form" },
  { id: "coaching", label: "Agency", icon: Users, prompt: "Create an agency website with services offered, team profiles, case studies, and contact form" },
  { id: "real_estate", label: "Medical", icon: Home, prompt: "Create a medical practice website with services, doctor profiles, appointment booking, patient resources, and contact form" },
  { id: "nonprofit", label: "SaaS", icon: Heart, prompt: "Create a SaaS product landing page with feature showcase, pricing table, testimonials, and sign-up flow" },
] as const;

interface HeroSectionProps {
  user: User | null;
  onStartLauncher: () => void;
  onAuthRequired: () => void;
  onAIGenerate?: (prompt: string, chipId: string | null) => Promise<void>;
  isGenerating?: boolean;
  progressMessage?: string;
}

export function HeroSection({ user, onStartLauncher, onAuthRequired, onAIGenerate, isGenerating, progressMessage }: HeroSectionProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const handleChipClick = (chipId: string) => {
    const chip = INDUSTRY_CHIPS.find(c => c.id === chipId);
    if (chip) {
      setSelectedChip(chipId);
      setPrompt(chip.prompt);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || !onAIGenerate) return;
    await onAIGenerate(prompt, selectedChip);
  }, [prompt, selectedChip, onAIGenerate]);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-lime-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative container mx-auto px-4 py-12 md:py-20">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <Badge className={cn(
            "mb-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
            "shadow-[0_0_15px_rgba(255,255,0,0.2)]"
          )}>
            <Zap className="h-3 w-3 mr-1" />
            11 industries · premium templates · AI generation
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-foreground leading-tight">
            Pick a template or describe it.
            <span className="block text-cyan-400 drop-shadow-[0_0_30px_rgba(0,255,255,0.5)]">Launch a real business.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Browse handcrafted industry templates with design presets, or let AI generate 
            your site — every button, form, and payment flow works out of the box.
          </p>

          {/* Two-path entry */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8"
          >
            {/* Path 1: Browse Templates */}
            <button
              onClick={onStartLauncher}
              className={cn(
                "group relative rounded-xl border-2 border-lime-500/30 bg-[#0d0d18]/80 backdrop-blur-sm p-6 text-left",
                "hover:border-lime-400/60 hover:shadow-[0_0_30px_rgba(132,204,22,0.15)]",
                "transition-all duration-300"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-lime-500/15 flex items-center justify-center">
                  <Layout className="h-5 w-5 text-lime-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-lime-400">Browse Templates</h3>
                  <p className="text-xs text-muted-foreground">Handcrafted starters</p>
                </div>
                <ArrowRight className="h-4 w-4 text-lime-400/50 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Salon', 'Restaurant', 'Agency', 'E-commerce', 'SaaS'].map((label) => (
                  <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400/70 border border-lime-500/20">
                    {label}
                  </span>
                ))}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400/70 border border-lime-500/20">
                  +6 more
                </span>
              </div>
              <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground">
                <Crown className="h-3 w-3 text-yellow-500" />
                <span>Includes premium templates with design presets</span>
              </div>
            </button>

            {/* Path 2: AI Generate */}
            <div className={cn(
              "relative rounded-xl border-2 border-cyan-500/30 bg-[#0d0d18]/80 backdrop-blur-sm p-4",
              "shadow-[0_0_25px_rgba(0,200,255,0.08)]",
              "transition-all duration-300",
              "focus-within:border-cyan-400/60 focus-within:shadow-[0_0_35px_rgba(0,200,255,0.2)]"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-bold text-cyan-400">AI Generate</h3>
              </div>
              <div className="relative">
                <textarea
                  placeholder="Describe your website..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={isGenerating}
                  rows={2}
                  className={cn(
                    "w-full bg-[#0a0a14] text-foreground placeholder:text-muted-foreground/40",
                    "px-3 py-2 pr-10 text-sm resize-none rounded-lg border border-white/5",
                    "focus:outline-none focus:border-cyan-500/30",
                    isGenerating && "opacity-50"
                  )}
                />
                <button
                  className={cn(
                    "absolute right-2 bottom-2 h-8 w-8 rounded-full flex items-center justify-center",
                    "bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
                    "hover:from-cyan-400 hover:to-blue-500",
                    "shadow-[0_0_15px_rgba(0,200,255,0.3)]",
                    "transition-all duration-200",
                    (isGenerating || !prompt.trim()) && "opacity-40 cursor-not-allowed"
                  )}
                  onClick={handleSubmit}
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Progress */}
              {isGenerating && progressMessage && (
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-cyan-400 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{progressMessage}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Industry Chips */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto mb-8"
          >
            {INDUSTRY_CHIPS.map((chip) => {
              const Icon = chip.icon;
              const isSelected = selectedChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => handleChipClick(chip.id)}
                  disabled={isGenerating}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                    "border",
                    isSelected
                      ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(0,200,255,0.2)]"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:text-cyan-400",
                    isGenerating && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </motion.div>

          {/* Explore Builder link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/web-builder")}
              className="text-sm text-fuchsia-400/70 hover:text-fuchsia-400 hover:bg-fuchsia-500/10"
            >
              or open the builder from scratch
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </motion.div>

          {!user && (
            <p className="mt-6 text-sm text-muted-foreground/60">
              No credit card required · Free to start
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
