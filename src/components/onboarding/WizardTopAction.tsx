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
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WizardPipelineRail,
  WIZARD_PIPELINE_STAGES,
  deriveStageFromStatus,
} from "./WizardPipelineRail";

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

  // The stage label is derived only from real runtime status and never advances
  // on a timer — a long stage keeps showing that stage until the pipeline moves on.
  const [reachedStage, setReachedStage] = useState(0);
  useEffect(() => {
    if (!isLaunching) {
      setReachedStage(0);
      return;
    }
    if (!launchStatus) return;
    const derived = deriveStageFromStatus(launchStatus);
    setReachedStage((prev) => (derived > prev ? derived : prev));
  }, [isLaunching, launchStatus]);

  const mergedStage = useMemo(() => (isLaunching ? reachedStage : -1), [isLaunching, reachedStage]);


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
            {WIZARD_PIPELINE_STAGES[Math.min(mergedStage, WIZARD_PIPELINE_STAGES.length - 1)]?.label ?? "Generating…"}
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

      {/* Horizontally compact pipeline projector — only while generating */}
      <WizardPipelineRail isLaunching={isLaunching} launchStatus={launchStatus} />
    </div>
  );
}
