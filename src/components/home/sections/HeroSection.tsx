import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Sparkles, Loader2, Wrench, Scissors, Utensils, ShoppingBag, Palette, Users, Home, Heart } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

// Industry chips for quick-start
const INDUSTRY_CHIPS = [
  { id: "local_service", label: "Local Service", icon: Wrench, prompt: "Create a professional website for a local service business with service areas, booking form, testimonials, and emergency contact" },
  { id: "salon_spa", label: "Salon & Spa", icon: Scissors, prompt: "Create an elegant salon or spa website with service menu, appointment booking, stylist profiles, gallery, and gift card section" },
  { id: "restaurant", label: "Restaurant", icon: Utensils, prompt: "Create a restaurant website with menu display, online ordering, reservation system, location/hours, and photo gallery" },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingBag, prompt: "Create an e-commerce storefront with product catalog, shopping cart, checkout flow, and customer reviews" },
  { id: "creator", label: "Creator", icon: Palette, prompt: "Create a creator portfolio website with project showcase, about section, client testimonials, and contact form" },
  { id: "coaching", label: "Coaching", icon: Users, prompt: "Create a coaching or consulting website with services offered, booking calendar, client success stories, and free resource downloads" },
  { id: "real_estate", label: "Real Estate", icon: Home, prompt: "Create a real estate agent website with property listings, search filters, agent bio, market insights, and contact form" },
  { id: "nonprofit", label: "Nonprofit", icon: Heart, prompt: "Create a nonprofit organization website with mission statement, donation form, volunteer signup, events calendar, and impact stories" },
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
      </div>
      <div className="relative container mx-auto px-4 py-12 md:py-20">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <Badge className={cn(
            "mb-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
            "shadow-[0_0_15px_rgba(255,255,0,0.2)]"
          )}>
            <Zap className="h-3 w-3 mr-1" />
            Installable systems · real backend included
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-foreground leading-tight">
            Describe your business.
            <span className="block text-cyan-400 drop-shadow-[0_0_30px_rgba(0,255,255,0.5)]">We'll build the system.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI generates your site with working pages, booking, payments, and
            automations — ready to launch in minutes.
          </p>

          {/* AI Prompt Box — primary entry */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="max-w-2xl mx-auto mb-6"
          >
            <div className={cn(
              "relative rounded-xl border border-cyan-500/30 bg-[#0d0d18]/80 backdrop-blur-sm",
              "shadow-[0_0_25px_rgba(0,200,255,0.12)]",
              "transition-all duration-300",
              "focus-within:border-cyan-400/60 focus-within:shadow-[0_0_35px_rgba(0,200,255,0.25)]"
            )}>
              <textarea
                placeholder="Describe your website... e.g., A modern salon with online booking and gift cards"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={isGenerating}
                rows={3}
                className={cn(
                  "w-full bg-transparent text-foreground placeholder:text-muted-foreground/50",
                  "px-4 py-3 pr-14 text-base resize-none rounded-xl",
                  "focus:outline-none",
                  isGenerating && "opacity-50"
                )}
              />
              <button
                className={cn(
                  "absolute right-3 bottom-3 h-10 w-10 rounded-full flex items-center justify-center",
                  "bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
                  "hover:from-cyan-400 hover:to-blue-500",
                  "shadow-[0_0_20px_rgba(0,200,255,0.3)]",
                  "transition-all duration-200",
                  (isGenerating || !prompt.trim()) && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleSubmit}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Progress bar */}
            {isGenerating && progressMessage && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-cyan-400 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{progressMessage}</span>
              </div>
            )}
          </motion.div>

          {/* Industry Chips */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
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

          {/* Secondary CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              size="lg"
              variant="outline"
              onClick={onStartLauncher}
              className={cn(
                "text-base px-8 h-12 font-semibold",
                "border-cyan-500/40 text-cyan-400",
                "hover:bg-cyan-500/10 hover:border-cyan-500/60",
                "hover:shadow-[0_0_20px_rgba(0,200,255,0.2)]",
                "transition-all duration-200"
              )}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Launch Guided
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate("/web-builder")}
              className={cn(
                "text-base px-8 h-12 border border-fuchsia-500/30 text-fuchsia-400",
                "hover:bg-fuchsia-500/15 hover:border-fuchsia-500/50",
                "hover:shadow-[0_0_15px_rgba(255,0,255,0.2)]",
                "transition-all duration-200"
              )}
            >
              Explore Builder
            </Button>
          </motion.div>

          {!user && (
            <p className="mt-6 text-sm text-muted-foreground/60">
              No credit card required · You'll sign in when you install
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
