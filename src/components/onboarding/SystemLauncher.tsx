/**
 * SystemLauncher — Main Wizard Component
 *
 * 7-step wizard for launching a prewired business system.
 * Rendered as a full-screen modal overlay.
 *
 * Pipeline: template structure → intent wiring → theme override → build
 *
 * Steps:
 *   1. system-type   → Select business system type
 *   2. industry      → Select industry within system type
 *   3. family        → Choose template family (4 structural families)
 *   4. variant       → Choose visual variant (A/B/C)
 *   5. theme         → Choose theme identity + optional token overrides
 *   6. build-mode    → Fast Launch or AI Enhanced
 *   7. generate      → Review + build
 */
import { useCallback, useState } from 'react';
import { useWizardState, WIZARD_STEPS } from '@/hooks/useWizardState';
import { SystemTypeStep } from './steps/SystemTypeStep';
import { IndustryStep } from './steps/IndustryStep';
import { FamilyStep } from './steps/FamilyStep';
import { VariantStep } from './steps/VariantStep';
import { ThemeStep } from './steps/ThemeStep';
import { BuildModeStep } from './steps/BuildModeStep';
import { GenerateStep } from './steps/GenerateStep';
import { buildSystemBlueprint } from '@/data/blueprintBuilder';
import { getStructure } from '@/data/templateFamilies';
import type { LaunchConfig } from '@/types/launchConfig';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  arcadeGlows,
  arcadeButtonPrimary,
  arcadeButtonGhost,
} from '@/lib/arcadeTheme';

interface Props {
  open: boolean;
  onClose: () => void;
  onLaunch: (config: LaunchConfig) => void | Promise<void>;
}

const STEP_LABELS: Record<string, string> = {
  'system-type': 'System',
  'industry': 'Industry',
  'family': 'Template',
  'variant': 'Variant',
  'theme': 'Theme',
  'build-mode': 'Build Mode',
  'generate': 'Launch',
};

export function SystemLauncher({ open, onClose, onLaunch }: Props) {
  const { state, dispatch, next, prev, canAdvance, isFirstStep, isLastStep, totalSteps } = useWizardState();
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!state.systemType || !state.industryId || !state.familyId || !state.variantId || !state.themeIdentity || !state.buildMode) {
      dispatch({ type: 'GENERATION_ERROR', payload: 'Please complete all steps before generating.' });
      return;
    }

    dispatch({ type: 'START_GENERATING' });
    setProgressMessage(state.buildMode === 'ai-enhanced' ? 'Interpreting business model...' : null);

    try {
      const blueprint = buildSystemBlueprint(state.systemType, state.industryId);
      const structure = getStructure(state.familyId, state.variantId);

      const config: LaunchConfig = {
        blueprint,
        structure,
        skin: {
          identity: state.themeIdentity,
          overrides: state.tokenOverrides,
        },
        buildMode: state.buildMode,
      };

      await onLaunch(config);
      toast.success('System generation started!');
    } catch (err) {
      dispatch({ type: 'GENERATION_ERROR', payload: err instanceof Error ? err.message : 'Generation failed' });
      setProgressMessage(null);
    }
  }, [state, dispatch, onLaunch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-2xl overflow-hidden flex flex-col",
        "bg-[#0d0d18] border border-cyan-500/20",
        arcadeGlows.panel
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#0a0a12]">
          <div>
            <h1 className="text-lg font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(255,255,0,0.5)]">
              Launch Your System
            </h1>
            <p className="text-xs text-gray-500">
              Step {state.stepIndex + 1} of {totalSteps}
            </p>
          </div>

          {/* Step Indicators */}
          <div className="hidden md:flex items-center gap-1">
            {WIZARD_STEPS.map((step, i) => (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-1",
                  i <= state.stepIndex ? 'text-cyan-400' : 'text-gray-600'
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i < state.stepIndex
                    ? 'bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.6)]'
                    : i === state.stepIndex
                      ? 'bg-cyan-400 ring-2 ring-cyan-400/30 shadow-[0_0_8px_rgba(0,255,255,0.6)]'
                      : 'bg-gray-700'
                )} />
                <span className="text-xs hidden lg:inline">{STEP_LABELS[step]}</span>
                {i < WIZARD_STEPS.length - 1 && <span className="text-gray-700 mx-0.5">—</span>}
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-cyan-500/10 transition-colors text-gray-500 hover:text-cyan-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 arcade-scrollbar">
          {state.step === 'system-type' && (
            <SystemTypeStep selected={state.systemType} dispatch={dispatch} />
          )}
          {state.step === 'industry' && state.systemType && (
            <IndustryStep systemType={state.systemType} selected={state.industryId} dispatch={dispatch} />
          )}
          {state.step === 'family' && (
            <FamilyStep selected={state.familyId} industryId={state.industryId} dispatch={dispatch} />
          )}
          {state.step === 'variant' && state.familyId && (
            <VariantStep familyId={state.familyId} selected={state.variantId} dispatch={dispatch} />
          )}
          {state.step === 'theme' && (
            <ThemeStep
              selectedIdentity={state.themeIdentity}
              overrides={state.tokenOverrides}
              dispatch={dispatch}
            />
          )}
          {state.step === 'build-mode' && (
            <BuildModeStep selected={state.buildMode} dispatch={dispatch} />
          )}
          {state.step === 'generate' && (
            <GenerateStep state={state} onGenerate={handleGenerate} progressMessage={progressMessage} />
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-cyan-500/20 bg-[#0a0a12]">
          <button
            onClick={prev}
            disabled={isFirstStep}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              isFirstStep
                ? 'text-gray-700 cursor-not-allowed'
                : cn(arcadeButtonGhost, 'px-4 py-2')
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {!isLastStep && (
            <button
              onClick={next}
              disabled={!canAdvance}
              className={cn(
                "inline-flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-medium transition-all",
                canAdvance
                  ? arcadeButtonPrimary
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              )}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
