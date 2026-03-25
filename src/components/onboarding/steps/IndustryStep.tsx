/**
 * IndustryStep — Step 2
 *
 * Select industry within the chosen system type.
 */
import { getIndustriesForSystem } from '@/data/industries';
import type { BusinessSystemType } from '@/data/templates/types';
import type { WizardAction } from '@/hooks/useWizardState';
import { cn } from '@/lib/utils';
import { arcadeGlows } from '@/lib/arcadeTheme';

interface Props {
  systemType: BusinessSystemType;
  selected: string | null;
  dispatch: React.Dispatch<WizardAction>;
}

export function IndustryStep({ systemType, selected, dispatch }: Props) {
  const industries = getIndustriesForSystem(systemType);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Select Your Industry</h2>
        <p className="text-gray-400 mt-2">
          This refines content, copy, and service defaults for your system.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {industries.map((industry) => (
          <button
            key={industry.id}
            onClick={() => dispatch({ type: 'SET_INDUSTRY', payload: industry.id })}
            className={cn(
              "flex items-center gap-3 p-4 rounded-lg border transition-all duration-200",
              "hover:-translate-y-0.5",
              selected === industry.id
                ? cn("border-cyan-500/60 bg-cyan-500/10", arcadeGlows.cyan)
                : "border-cyan-500/20 bg-[#12121e] hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.1)]"
            )}
          >
            <span className="text-2xl">{industry.icon}</span>
            <div className="text-left">
              <span className="font-medium text-sm block text-gray-200">{industry.name}</span>
              <span className="text-xs text-gray-500">{industry.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
