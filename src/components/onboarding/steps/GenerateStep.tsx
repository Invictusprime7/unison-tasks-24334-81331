/**
 * GenerateStep — Step 7 (terminal)
 *
 * System Plan sheet: shows what will be built before the user commits.
 * Displays business identity, site map, working actions, theme direction,
 * and runtime level so the user understands the full system scope.
 */
import type { WizardState } from '@/hooks/useWizardState';
import { getIndustryById } from '@/data/industries';
import { getFamilyById } from '@/data/templateFamilies';
import { getSystemById } from '@/data/templates/types';
import { getSystemContract } from '@/data/templates/contracts';
import { buildSystemBlueprint } from '@/data/blueprintBuilder';
import { THEME_IDENTITY_META } from '@/themes/identities.stylex';
import { BUILD_MODES } from '@/types/launchConfig';
import { Loader2, Rocket, FileText, Zap, Palette, Server } from 'lucide-react';
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
  const contract = state.systemType ? getSystemContract(state.systemType) : null;
  const blueprint = state.systemType && state.industryId
    ? buildSystemBlueprint(state.systemType, state.industryId)
    : null;

  const hasOverrides = Object.values(state.tokenOverrides).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">System Plan</h2>
        <p className="text-gray-400 mt-2">
          Here's what we'll build for you. Review and launch.
        </p>
      </div>

      {/* Plan Grid */}
      <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Business Identity */}
        <PlanCard icon="🏢" title="Business Identity">
          <PlanItem label="System" value={system?.name} icon={system?.icon} />
          <PlanItem label="Industry" value={industry?.name} icon={industry?.icon} />
          <PlanItem label="Template" value={`${family?.name ?? '—'} / Variant ${state.variantId ?? '—'}`} />
        </PlanCard>

        {/* Site Map */}
        <PlanCard icon={<FileText className="w-4 h-4 text-cyan-400" />} title="Site Map">
          {blueprint?.pages && blueprint.pages.length > 0 ? (
            blueprint.pages.map((page) => (
              <div key={page.slug} className="flex items-center gap-2 text-xs">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  page.required ? "bg-cyan-400" : "bg-gray-600"
                )} />
                <span className="text-gray-300">{page.name}</span>
                <span className="text-gray-600 ml-auto">{page.slug}</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-gray-500">Pages resolved at build time</span>
          )}
        </PlanCard>

        {/* Working Actions */}
        <PlanCard icon={<Zap className="w-4 h-4 text-yellow-400" />} title="Working Actions">
          {contract?.requiredIntents && contract.requiredIntents.length > 0 ? (
            contract.requiredIntents.slice(0, 6).map((intent) => (
              <div key={intent} className="text-xs text-gray-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <span className="font-mono">{intent}</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-gray-500">Intents resolved from system type</span>
          )}
          {contract?.requiredIntents && contract.requiredIntents.length > 6 && (
            <span className="text-xs text-gray-500">+{contract.requiredIntents.length - 6} more</span>
          )}
        </PlanCard>

        {/* Theme & Runtime */}
        <PlanCard icon={<Palette className="w-4 h-4 text-fuchsia-400" />} title="Theme & Runtime">
          <PlanItem label="Theme" value={theme?.name} />
          {hasOverrides && <PlanItem label="Overrides" value="Custom tokens applied" />}
          <PlanItem label="Build Mode" value={buildMode?.name} />
          <div className="flex items-center gap-1.5 text-xs mt-1">
            <Server className="w-3 h-3 text-gray-500" />
            <span className="text-gray-500">
              Runtime: {state.buildMode === 'ai-enhanced' ? 'Auto-selected at build' : 'Simple engine'}
            </span>
          </div>
        </PlanCard>
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

function PlanCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-[#12121e] border border-cyan-500/20 space-y-2">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-500/10">
        <span className="text-sm">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      </div>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function PlanItem({ label, value, icon }: { label: string; value?: string; icon?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 flex items-center gap-1">
        {icon && <span>{icon}</span>}
        {value ?? '—'}
      </span>
    </div>
  );
}
