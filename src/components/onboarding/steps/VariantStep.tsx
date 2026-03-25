/**
 * VariantStep — Step 4
 *
 * Choose visual variant (A, B, or C) within the selected family.
 * Shows section layout summary for each variant.
 */
import { templateVariants, getStructure } from '@/data/templateFamilies';
import type { TemplateFamilyId, TemplateVariantId } from '@/types/launchConfig';
import type { WizardAction } from '@/hooks/useWizardState';
import { cn } from '@/lib/utils';
import { arcadeGlows } from '@/lib/arcadeTheme';

interface Props {
  familyId: TemplateFamilyId;
  selected: TemplateVariantId | null;
  dispatch: React.Dispatch<WizardAction>;
}

const HERO_LABELS: Record<string, string> = {
  fullbleed: 'Full-bleed hero',
  split: 'Split hero (text + image)',
  centered: 'Centered hero',
  minimal: 'Minimal hero',
  video: 'Video hero',
};

export function VariantStep({ familyId, selected, dispatch }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Choose Layout Variant</h2>
        <p className="text-gray-400 mt-2">
          Each variant has a different section arrangement and density.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {templateVariants.map((variant) => {
          const structure = getStructure(familyId, variant.id);
          const sectionTypes = structure.sections.map(s => s.type);

          return (
            <button
              key={variant.id}
              onClick={() => dispatch({ type: 'SET_VARIANT', payload: variant.id })}
              className={cn(
                "text-left p-5 rounded-xl border transition-all duration-200",
                "hover:-translate-y-0.5",
                selected === variant.id
                  ? cn("border-cyan-500/60 bg-cyan-500/10", arcadeGlows.cyan)
                  : "border-cyan-500/20 bg-[#12121e] hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.1)]"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "w-8 h-8 rounded-lg font-bold flex items-center justify-center text-sm",
                  selected === variant.id
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-[#0a0a12] text-gray-400 border border-gray-700/50"
                )}>
                  {variant.id}
                </span>
                <h3 className="font-semibold text-gray-200">{variant.name}</h3>
              </div>

              <p className="text-xs text-gray-500 mb-3">{variant.description}</p>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500">Hero:</span>
                  <span className="font-medium text-gray-300">{HERO_LABELS[structure.heroStyle] ?? structure.heroStyle}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500">Density:</span>
                  <span className="font-medium text-gray-300 capitalize">{structure.density}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500">Columns:</span>
                  <span className="font-medium text-gray-300">{structure.columnsDesktop}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-cyan-500/10">
                <p className="text-xs text-gray-500 mb-1">Sections:</p>
                <div className="flex flex-wrap gap-1">
                  {sectionTypes.map((type, i) => (
                    <span key={`${type}-${i}`} className="px-1.5 py-0.5 bg-[#0a0a12] border border-gray-700/50 rounded text-[10px] text-gray-500">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
