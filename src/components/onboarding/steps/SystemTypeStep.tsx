/**
 * SystemTypeStep — Step 1
 *
 * Select business system type: booking, leads, store, portfolio, agency, SaaS
 */
import { businessSystems } from '@/data/templates/types';
import type { BusinessSystemType } from '@/data/templates/types';
import type { WizardAction } from '@/hooks/useWizardState';
import { cn } from '@/lib/utils';
import { arcadeGlows } from '@/lib/arcadeTheme';

interface Props {
  selected: BusinessSystemType | null;
  dispatch: React.Dispatch<WizardAction>;
}

export function SystemTypeStep({ selected, dispatch }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Choose Your Business System</h2>
        <p className="text-gray-400 mt-2">
          What type of business are you launching?
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {businessSystems.map((system) => (
          <button
            key={system.id}
            onClick={() => dispatch({ type: 'SET_SYSTEM_TYPE', payload: system.id })}
            className={cn(
              "flex flex-col items-center p-6 rounded-xl border transition-all duration-200",
              "hover:-translate-y-0.5",
              selected === system.id
                ? cn("border-cyan-500/60 bg-cyan-500/10", arcadeGlows.cyan)
                : "border-cyan-500/20 bg-[#12121e] hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.1)]"
            )}
          >
            <span className="text-3xl mb-3">{system.icon}</span>
            <span className="font-semibold text-sm text-gray-200">{system.name}</span>
            <span className="text-xs text-gray-500 mt-1 text-center leading-tight">
              {system.tagline}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
