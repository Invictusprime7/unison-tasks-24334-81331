/**
 * WizardTopAction — top-right action button for the SystemLauncher wizard.
 *
 * While generation is active, the real shared launch clock drives a circular
 * progress surface. It remains mounted through the explicit 100% completion
 * frame immediately before navigation to Web Builder.
 */

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WizardLaunchProgress } from "@/services/wizardLaunchRuntime";

export type WizardStepKey = "industry" | "questions" | "templates" | "aesthetic";

interface WizardTopActionProps {
  step: WizardStepKey;
  isLaunching: boolean;
  launchProgress: WizardLaunchProgress | null;
  canContinueQuestions: boolean;
  canGenerate: boolean;
  onQuestionsNext: () => void;
  onTemplatesNext: () => void;
  onLaunch: () => void;
}

const PROGRESS_RADIUS = 42;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

export function WizardTopAction(props: WizardTopActionProps) {
  const {
    step,
    isLaunching,
    launchProgress,
    canContinueQuestions,
    canGenerate,
    onQuestionsNext,
    onTemplatesNext,
    onLaunch,
  } = props;

  const completionPercent = Math.min(
    100,
    Math.max(0, launchProgress?.completionPercent ?? 0),
  );
  const progressOffset = PROGRESS_CIRCUMFERENCE * (1 - completionPercent / 100);

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
            "transition-all disabled:opacity-30",
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
            "transition-all",
          )}
        >
          Continue
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      );
    }

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
          "transition-all duration-300 disabled:opacity-30",
        )}
      >
        {isLaunching ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            {launchProgress?.label ?? "Generating…"}
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

      <AnimatePresence>
        {isLaunching && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            role="progressbar"
            aria-label={launchProgress?.label ?? "Generating website"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(completionPercent)}
            className="w-[260px] rounded-xl border border-cyan-500/15 bg-[#0b0d18]/95 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md sm:w-[280px]"
          >
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 flex-none">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <circle
                    cx="50"
                    cy="50"
                    r={PROGRESS_RADIUS}
                    fill="none"
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={PROGRESS_RADIUS}
                    fill="none"
                    stroke="rgb(34 211 238)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={PROGRESS_CIRCUMFERENCE}
                    style={{
                      strokeDashoffset: progressOffset,
                      transition: "stroke-dashoffset 450ms ease-out",
                    }}
                    className="drop-shadow-[0_0_7px_rgba(34,211,238,0.65)]"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {launchProgress?.complete ? (
                    <Check className="h-7 w-7 text-cyan-300" />
                  ) : (
                    <span className="text-lg font-semibold tabular-nums text-white">
                      {Math.round(completionPercent)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/70">
                  {launchProgress?.complete ? "Complete" : "Building website"}
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-white">
                  {launchProgress?.label ?? "Preparing your site…"}
                </p>
                <p className="mt-1.5 text-[10px] font-mono text-white/40">
                  {launchProgress?.complete
                    ? "Opening Web Builder"
                    : `${Math.max(1, Math.floor((launchProgress?.elapsedMs ?? 0) / 1_000))}s elapsed`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
