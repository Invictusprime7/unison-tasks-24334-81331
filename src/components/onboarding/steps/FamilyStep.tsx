/**
 * FamilyStep — Step 3
 *
 * Choose template family (4 structural families).
 * Shows metadata: best-for, page depth, conversion focus, included flows.
 */
import { templateFamilies } from '@/data/templateFamilies';
import type { TemplateFamilyId } from '@/types/launchConfig';
import type { WizardAction } from '@/hooks/useWizardState';
import { cn } from '@/lib/utils';
import { arcadeGlows, arcadeBadge } from '@/lib/arcadeTheme';

interface Props {
  selected: TemplateFamilyId | null;
  industryId: string | null;
  dispatch: React.Dispatch<WizardAction>;
}

const DEPTH_BADGES: Record<string, string> = {
  simple: arcadeBadge.lime,
  medium: arcadeBadge.cyan,
  advanced: arcadeBadge.purple,
};

const CONVERSION_BADGES: Record<string, string> = {
  high: arcadeBadge.red,
  medium: arcadeBadge.yellow,
  low: arcadeBadge.blue,
};

export function FamilyStep({ selected, industryId, dispatch }: Props) {
  // Sort families: show best-match first if industry is known
  const sorted = [...templateFamilies].sort((a, b) => {
    if (!industryId) return 0;
    const aMatch = a.bestFor.includes(industryId) ? -1 : 0;
    const bMatch = b.bestFor.includes(industryId) ? -1 : 0;
    return aMatch - bMatch;
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Choose Template Family</h2>
        <p className="text-gray-400 mt-2">
          Each family defines layout structure and composition — not colors or fonts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {sorted.map((family) => {
          const isRecommended = industryId ? family.bestFor.includes(industryId) : false;

          return (
            <button
              key={family.id}
              onClick={() => dispatch({ type: 'SET_FAMILY', payload: family.id })}
              className={cn(
                "relative text-left p-5 rounded-xl border transition-all duration-200",
                "hover:-translate-y-0.5",
                selected === family.id
                  ? cn("border-cyan-500/60 bg-cyan-500/10", arcadeGlows.cyan)
                  : "border-cyan-500/20 bg-[#12121e] hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.1)]"
              )}
            >
              {isRecommended && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-cyan-500 text-black text-xs rounded-full font-bold shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                  Recommended
                </span>
              )}

              <h3 className="font-bold text-lg text-gray-200">{family.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{family.description}</p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${DEPTH_BADGES[family.pageDepth]}`}>
                  {family.pageDepth} depth
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${CONVERSION_BADGES[family.conversionFocus]}`}>
                  {family.conversionFocus} conversion
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {family.includedFlows.map(flow => (
                  <span key={flow} className="px-2 py-0.5 bg-[#0a0a12] border border-gray-700/50 rounded text-xs text-gray-500">
                    {flow}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
