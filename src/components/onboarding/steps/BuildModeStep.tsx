/**
 * BuildModeStep — Step 6
 *
 * Choose build mode: Fast Launch (prewired) or AI Enhanced (unique variant).
 */
import { BUILD_MODES, type BuildMode } from '@/types/launchConfig';
import type { WizardAction } from '@/hooks/useWizardState';
import { Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { arcadeGlows } from '@/lib/arcadeTheme';

interface Props {
  selected: BuildMode | null;
  dispatch: React.Dispatch<WizardAction>;
}

const ICONS: Record<BuildMode, React.ReactNode> = {
  'fast-launch': <Zap className="w-8 h-8" />,
  'ai-enhanced': <Sparkles className="w-8 h-8" />,
};

const MODE_GLOW: Record<BuildMode, string> = {
  'fast-launch': arcadeGlows.yellowActive,
  'ai-enhanced': arcadeGlows.cyanActive,
};

export function BuildModeStep({ selected, dispatch }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Choose Build Mode</h2>
        <p className="text-gray-400 mt-2">
          How should your system be generated?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
        {BUILD_MODES.map((config) => (
          <button
            key={config.mode}
            onClick={() => dispatch({ type: 'SET_BUILD_MODE', payload: config.mode })}
            className={cn(
              "text-left p-6 rounded-xl border transition-all duration-200",
              "hover:-translate-y-0.5",
              selected === config.mode
                ? cn("border-cyan-500/60 bg-cyan-500/10", MODE_GLOW[config.mode])
                : "border-cyan-500/20 bg-[#12121e] hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.1)]"
            )}
          >
            <div className={cn(
              "mb-3",
              selected === config.mode
                ? config.mode === 'fast-launch' ? 'text-yellow-400' : 'text-cyan-400'
                : 'text-gray-500'
            )}>
              {ICONS[config.mode]}
            </div>
            <h3 className="font-bold text-lg text-gray-200">{config.name}</h3>
            <p className="text-sm text-gray-400 mt-1">{config.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
