import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Sparkles } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";


interface HeroSectionProps {
  user: User | null;
  onStartLauncher: () => void;
  onAuthRequired: () => void;
}

const INDUSTRY_CHIPS = [
  { label: "Salon & Spa",   emoji: "💆", color: "hover:border-fuchsia-400/60 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 hover:shadow-[0_0_14px_rgba(255,0,255,0.2)]" },
  { label: "Restaurant",    emoji: "🍽️", color: "hover:border-orange-400/60 hover:text-orange-300 hover:bg-orange-500/10 hover:shadow-[0_0_14px_rgba(255,140,0,0.2)]" },
  { label: "Fitness",       emoji: "🏋️", color: "hover:border-lime-400/60 hover:text-lime-300 hover:bg-lime-500/10 hover:shadow-[0_0_14px_rgba(132,204,22,0.2)]" },
  { label: "Real Estate",   emoji: "🏠", color: "hover:border-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10 hover:shadow-[0_0_14px_rgba(0,255,255,0.2)]" },
  { label: "Agency",        emoji: "🚀", color: "hover:border-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10 hover:shadow-[0_0_14px_rgba(168,85,247,0.2)]" },
  { label: "Consulting",    emoji: "💼", color: "hover:border-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10 hover:shadow-[0_0_14px_rgba(59,130,246,0.2)]" },
  { label: "E-commerce",    emoji: "🛍️", color: "hover:border-yellow-400/60 hover:text-yellow-300 hover:bg-yellow-500/10 hover:shadow-[0_0_14px_rgba(250,204,21,0.2)]" },
  { label: "Healthcare",    emoji: "🏥", color: "hover:border-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-500/10 hover:shadow-[0_0_14px_rgba(52,211,153,0.2)]" },
];

const STAT_ITEMS = [
  { value: "< 60s", label: "to live site" },
  { value: "8",     label: "industries" },
  { value: "CRM",   label: "built in" },
  { value: "∞",     label: "customizable" },
];

export function HeroSection({ user, onStartLauncher, onAuthRequired }: HeroSectionProps) {
  const handleLaunch = () => {
    if (user) {
      onStartLauncher();
    } else {
      onAuthRequired();
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cyan-500/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-fuchsia-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-lime-500/6 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 pt-16 pb-12 sm:pt-20 sm:pb-16 md:pt-28 md:pb-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Brand title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mb-6"
          >
            <span
              className="inline-block text-5xl sm:text-6xl md:text-8xl font-black tracking-tight select-none"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #a5f3fc 50%, #67e8f9 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Unison Tasks
            </span>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Badge className={cn(
              "mb-5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-xs font-medium px-4 py-1.5",
              "shadow-[0_0_20px_rgba(0,255,255,0.15)]"
            )}>
              <Sparkles className="h-3 w-3 mr-1.5" />
              AI-powered wizard · CRM + automation included
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4 leading-snug tracking-normal text-white/60"
          >
            Your business,{" "}
            <span className="text-cyan-400/80">live in 60 seconds</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-base sm:text-lg text-white/50 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Pick your industry. We build you a complete site with booking, CRM, automations,
            and a live backend — no dev work required.
          </motion.p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
          >
            <Button
              size="lg"
              onClick={handleLaunch}
              className={cn(
                "h-14 px-10 text-base font-bold rounded-xl w-full sm:w-auto",
                "bg-cyan-500 text-black",
                "hover:bg-cyan-400",
                "shadow-[0_0_40px_rgba(0,200,255,0.35)]",
                "hover:shadow-[0_0_55px_rgba(0,200,255,0.55)]",
                "transition-all duration-300 group"
              )}
            >
              <Zap className="h-5 w-5 mr-2" />
              Build Your Site
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            {!user && (
              <p className="text-xs text-white/30 sm:hidden">
                No credit card required
              </p>
            )}
          </motion.div>

          {/* Industry chips */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-2 mb-10 px-2"
          >
            {INDUSTRY_CHIPS.map(({ label, emoji, color }) => (
              <button
                key={label}
                onClick={handleLaunch}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm text-white/40",
                  "border border-white/8 bg-white/2 backdrop-blur-sm",
                  "transition-all duration-200 cursor-pointer",
                  color
                )}
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-x-8 gap-y-3"
          >
            {STAT_ITEMS.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-xl font-bold text-cyan-400">{value}</span>
                <span className="text-xs text-white/30">{label}</span>
              </div>
            ))}
          </motion.div>

          {!user && (
            <p className="mt-6 text-xs text-white/25 hidden sm:block">
              No credit card required · Works in your browser · Deploy in one click
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
