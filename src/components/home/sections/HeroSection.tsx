import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Sparkles } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface HeroSectionProps {
  user: User | null;
  onStartLauncher: () => void;
  onAuthRequired: () => void;
}

export function HeroSection({ user, onStartLauncher, onAuthRequired }: HeroSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" />
      </div>
      <div className="relative container mx-auto px-4 py-10 sm:py-12 md:py-20">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <Badge className={cn(
            "mb-3 sm:mb-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs sm:text-sm",
            "shadow-[0_0_15px_rgba(255,255,0,0.2)]"
          )}>
            <Zap className="h-3 w-3 mr-1" />
            Installable systems · real backend included
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-3 sm:mb-4 text-foreground leading-tight">
            Launch-ready business systems
            <span className="block text-cyan-400 drop-shadow-[0_0_30px_rgba(0,255,255,0.5)]">that ship with working logic</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Pick a system, choose a contract-ready starter, and we'll install the backend packs
            (data, workflows, intents) automatically.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-4 sm:mb-6 px-4 sm:px-0"
          >
            <Button
              size="lg"
              onClick={onStartLauncher}
              className={cn(
                "text-base sm:text-lg px-6 sm:px-10 h-12 sm:h-14 font-bold w-full sm:w-auto",
                "bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
                "hover:from-cyan-400 hover:to-blue-500",
                "shadow-[0_0_30px_rgba(0,200,255,0.3)]",
                "hover:shadow-[0_0_40px_rgba(0,200,255,0.5)]",
                "transition-all duration-300"
              )}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Launch Your System
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate("/web-builder")}
              className={cn(
                "text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 border border-fuchsia-500/40 text-fuchsia-400 w-full sm:w-auto",
                "hover:bg-fuchsia-500/20 hover:border-fuchsia-500/60",
                "hover:shadow-[0_0_20px_rgba(255,0,255,0.3)]",
                "transition-all duration-200"
              )}
            >
              Explore Builder
            </Button>
          </motion.div>

          {!user && (
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground/60">
              No credit card required · You'll sign in when you install
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
