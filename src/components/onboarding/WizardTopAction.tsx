/**
 * WizardTopAction — top-right action button for the SystemLauncher wizard.
 *
 * Renders the primary Continue / Generate button in the header (top-right)
 * and, while generating, expands into a live pipeline stepper that walks
 * through the wizard → Lane B → snapshot → intent-wiring → preview stages.
 *
 * The button is fully driven by props; all pipeline state derivation lives
 * here so the launcher shell stays lean.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WizardStepKey = "industry" | "questions" | "templates" | "aesthetic";

interface WizardTopActionProps {
  step: WizardStepKey;
  isLaunching: boolean;
  launchStatus: string;
  canContinueQuestions: boolean;
  canGenerate: boolean;
  onQuestionsNext: () => void;
  onTemplatesNext: () => void;
  onLaunch: () => void;
}

// Canonical pipeline stages surfaced to the user during generation.
const PIPELINE_STAGES: { id: string; label: string; keywords: string[] }[] = [
  { id: "plan", label: "Planning topology", keywords: ["plan", "topology"] },
  { id: "generate", label: "Generating pages", keywords: ["generat"] },
  { id: "repair", label: "Backfilling missing pages", keywords: ["remaining", "repair", "missing"] },
  { id: "snapshot", label: "Merging snapshot & theme", keywords: ["snapshot", "theme", "merge"] },
  { id: "intents", label: "Wiring intents & routes", keywords: ["intent", "wiring", "route"] },
  { id: "preview", label: "Finalizing preview", keywords: ["preview", "finaliz", "commit"] },
];

function deriveStageFromStatus(status: string): number {
  if (!status) return 0;
  const lower = status.toLowerCase();
  for (let i = PIPELINE_STAGES.length - 1; i >= 0; i--) {
    if (PIPELINE_STAGES[i].keywords.some((k) => lower.includes(k))) return i;
  }
  return 0;
}

export function WizardTopAction(props: WizardTopActionProps) {
  const {
    step,
    isLaunching,
    launchStatus,
    canContinueQuestions,
    canGenerate,
    onQuestionsNext,
    onTemplatesNext,
    onLaunch,
  } = props;

  // Auto-advance a soft "expected stage" so users see motion even when the
  // backend doesn't emit granular status updates. Real status keywords still
  // win — see mergedStage below.
  const [tickStage, setTickStage] = useState(0);
  useEffect(() => {
    if (!isLaunching) {
      setTickStage(0);
      return;
    }
    setTickStage(0);
    const interval = window.setInterval(() => {
      setTickStage((prev) => Math.min(prev + 1, PIPELINE_STAGES.length - 2));
    }, 2200);
    return () => window.clearInterval(interval);
  }, [isLaunching]);

  const mergedStage = useMemo(() => {
    if (!isLaunching) return -1;
    const derived = deriveStageFromStatus(launchStatus);
    return Math.max(derived, tickStage);
  }, [isLaunching, launchStatus, tickStage]);

  // Which button variant to render based on wizard step.
  const buttonNode = (() => {
    if (step === "industry") return null;

    if (step === "questions") {
      return (
        <Button
          onClick={onQuestionsNext}
          disabled={!canContinueQuestions}
          className={cn(
            "h-8 px-4 text-xs font-semibold",
            "bg-cyan-500/12 text-cyan-400 border border-cyan-500/25",
            "hover:bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(0,200,255,0.12)]",
            "transition-all disabled:opacity-30"
          )}
        >
          Continue
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      );
    }

    if (step === "templates") {
      return (
        <Button
          onClick={onTemplatesNext}
          className={cn(
            "h-8 px-4 text-xs font-semibold",
            "bg-cyan-500/12 text-cyan-400 border border-cyan-500/25",
            "hover:bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(0,200,255,0.12)]",
            "transition-all"
          )}
        >
          Continue
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      );
    }

    // aesthetic (generate)
    return (
      <Button
        onClick={onLaunch}
        disabled={isLaunching || !canGenerate}
        className={cn(
          "h-9 px-5 text-xs font-semibold",
          "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/15 text-cyan-400",
          "border border-cyan-500/30",
          "hover:from-cyan-500/30 hover:to-fuchsia-500/20",
          "hover:shadow-[0_0_24px_rgba(0,200,255,0.15)]",
          "transition-all duration-300 disabled:opacity-30"
        )}
      >
        {isLaunching ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            {PIPELINE_STAGES[Math.min(mergedStage, PIPELINE_STAGES.length - 1)]?.label ?? "Generating…"}
          </>
        ) : (
          <>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Generate Site
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </>
        )}
      </Button>
    );
  })();

  return (
    <div className="flex flex-col items-end gap-2">
      {buttonNode}

      {/* Pipeline stepper — only while generating */}
      <AnimatePresence>
        {isLaunching && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className="w-[280px] rounded-xl border border-cyan-500/15 bg-[#0b0d18]/95 shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-cyan-400/70 font-semibold">
              Pipeline
            </div>
            <ul className="p-2 space-y-1">
              {PIPELINE_STAGES.map((stage, idx) => {
                const done = idx < mergedStage;
                const active = idx === mergedStage;
                return (
                  <li
                    key={stage.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors",
                      active && "bg-cyan-500/[0.08] text-cyan-300",
                      done && "text-cyan-500/60",
                      !active && !done && "text-white/25"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                        done && "bg-cyan-500/25 text-cyan-300",
                        active && "bg-cyan-500 text-[#07080F]",
                        !active && !done && "bg-white/[0.05] text-white/30"
                      )}
                    >
                      {done ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : active ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <span className="text-[9px]">{idx + 1}</span>
                      )}
                    </span>
                    <span className="truncate">{stage.label}</span>
                  </li>
                );
              })}
            </ul>
            {launchStatus && (
              <div className="px-3 py-2 border-t border-white/[0.06] text-[10px] text-white/40 font-mono truncate">
                {launchStatus}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
