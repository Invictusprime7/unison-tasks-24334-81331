/**
 * GenerateStep — Step 7 (terminal)
 *
 * Review all selections and launch the build.
 */
import type { WizardState } from '@/hooks/useWizardState';
import { getIndustryById } from '@/data/industries';
import { getFamilyById } from '@/data/templateFamilies';
import { getSystemById } from '@/data/templates/types';
import { THEME_IDENTITY_META } from '@/themes/identities.stylex';
import { BUILD_MODES } from '@/types/launchConfig';
import { Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { arcadeGlows, arcadeButtonPrimary } from '@/lib/arcadeTheme';

interface Props {
  state: WizardState;
  onGenerate: () => void;
  progressMessage?: string | null;
}

export function GenerateStep({ state, onGenerate, progressMessage }: Props) {
  const system = state.systemType ? getSystemById(state.systemType) : null;
  const industry = state.industryId ? getIndustryById(state.industryId) : null;
  const family = state.familyId ? getFamilyById(state.familyId) : null;
  const theme = state.themeIdentity ? THEME_IDENTITY_META[state.themeIdentity] : null;
  const buildMode = state.buildMode ? BUILD_MODES.find(b => b.mode === state.buildMode) : null;

  const hasOverrides = Object.values(state.tokenOverrides).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Ready to Launch</h2>
        <p className="text-gray-400 mt-2">
          Review your selections and generate your system.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="max-w-lg mx-auto space-y-3">
        <SummaryRow label="System" value={system?.name} icon={system?.icon} />
        <SummaryRow label="Industry" value={industry?.name} icon={industry?.icon} />
        <SummaryRow label="Template" value={`${family?.name ?? '—'} / Variant ${state.variantId ?? '—'}`} />
        <SummaryRow label="Theme" value={theme?.name} />
        {hasOverrides && (
          <SummaryRow label="Overrides" value="Custom token overrides applied" />
        )}
        <SummaryRow label="Build Mode" value={buildMode?.name} />
      </div>

      {/* Error */}
      {state.error && (
        <div className="max-w-lg mx-auto p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {state.error}
        </div>
      )}

      {/* Generate Button */}
      <div className="text-center">
        <button
          onClick={onGenerate}
          disabled={state.isGenerating}
          className={cn(
            "inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all",
            state.isGenerating
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : cn(arcadeButtonPrimary, "hover:-translate-y-0.5")
          )}
        >
          {state.isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {progressMessage || 'Generating...'}
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              Generate System
            </>
          )}
        </button>
        {state.isGenerating && state.buildMode === 'ai-enhanced' && (
          <p className="text-xs text-gray-500 mt-3">
            AI generation may take 15–30 seconds
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, icon }: { label: string; value?: string; icon?: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[#12121e] border border-cyan-500/20">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-200 flex items-center gap-1.5">
        {icon && <span>{icon}</span>}
        {value ?? '—'}
      </span>
    </div>
  );
}
