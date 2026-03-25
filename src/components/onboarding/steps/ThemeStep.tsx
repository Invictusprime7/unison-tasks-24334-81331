/**
 * ThemeStep — Step 5
 *
 * Choose theme identity (Modern, Editorial, Bold, Futuristic, Organic)
 * + optional token-only overrides (primary color, font heading, etc.)
 *
 * Token overrides ONLY change presentation, never structure or behavior.
 */
import { useState } from 'react';
import { THEME_IDENTITY_META, type ThemeIdentity } from '@/themes/identities.stylex';
import type { ThemeTokenOverrides } from '@/types/launchConfig';
import type { WizardAction } from '@/hooks/useWizardState';
import { cn } from '@/lib/utils';
import { arcadeGlows, arcadeInput } from '@/lib/arcadeTheme';

interface Props {
  selectedIdentity: ThemeIdentity | null;
  overrides: ThemeTokenOverrides;
  dispatch: React.Dispatch<WizardAction>;
}

// Swatch colors for quick visual preview of each identity
const IDENTITY_SWATCHES: Record<ThemeIdentity, string[]> = {
  modern:     ['#6366F1', '#8B5CF6', '#06B6D4', '#F9FAFB'],
  editorial:  ['#1A1A2E', '#C4A35A', '#FEFDFB', '#FAF8F5'],
  bold:       ['#DC2626', '#1E293B', '#FACC15', '#FFFFFF'],
  futuristic: ['#8B5CF6', '#06B6D4', '#22D3EE', '#0B0F19'],
  organic:    ['#78716C', '#A3B18A', '#E07A5F', '#FBF9F6'],
};

const identityList = Object.values(THEME_IDENTITY_META);

export function ThemeStep({ selectedIdentity, overrides, dispatch }: Props) {
  const [showOverrides, setShowOverrides] = useState(false);

  const handleOverrideChange = (key: keyof ThemeTokenOverrides, value: string) => {
    dispatch({
      type: 'SET_TOKEN_OVERRIDES',
      payload: { ...overrides, [key]: value || undefined },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Choose Theme Identity</h2>
        <p className="text-gray-400 mt-2">
          Controls colors, typography, radius, shadows, and surface treatment — not layout.
        </p>
      </div>

      {/* Identity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {identityList.map((meta) => {
          const swatches = IDENTITY_SWATCHES[meta.id];
          return (
            <button
              key={meta.id}
              onClick={() => dispatch({ type: 'SET_THEME_IDENTITY', payload: meta.id })}
              className={cn(
                "text-left p-5 rounded-xl border transition-all duration-200",
                "hover:-translate-y-0.5",
                selectedIdentity === meta.id
                  ? cn("border-cyan-500/60 bg-cyan-500/10", arcadeGlows.cyan)
                  : "border-cyan-500/20 bg-[#12121e] hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.1)]"
              )}
            >
              {/* Color swatches */}
              <div className="flex gap-1 mb-3">
                {swatches.map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-md border border-gray-700/50"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <h3 className="font-bold text-lg text-gray-200">{meta.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{meta.description}</p>

              <div className="flex flex-wrap gap-1 mt-2">
                {meta.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 bg-[#0a0a12] border border-gray-700/50 rounded text-xs text-gray-500">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Token Overrides Toggle */}
      {selectedIdentity && (
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowOverrides(!showOverrides)}
            className="text-sm text-cyan-400 hover:underline"
          >
            {showOverrides ? 'Hide' : 'Show'} optional token overrides
          </button>

          {showOverrides && (
            <div className="mt-4 p-4 rounded-lg border border-cyan-500/20 bg-[#12121e] space-y-3">
              <p className="text-xs text-gray-500">
                Override individual tokens. These only change presentation — not structure or behavior.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1 text-gray-300">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={overrides.primary ?? '#6366F1'}
                      onChange={(e) => handleOverrideChange('primary', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={overrides.primary ?? ''}
                      onChange={(e) => handleOverrideChange('primary', e.target.value)}
                      placeholder="#6366F1"
                      className={cn(arcadeInput, "flex-1 px-2 py-1 text-xs")}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1 text-gray-300">Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={overrides.secondary ?? '#8B5CF6'}
                      onChange={(e) => handleOverrideChange('secondary', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={overrides.secondary ?? ''}
                      onChange={(e) => handleOverrideChange('secondary', e.target.value)}
                      placeholder="#8B5CF6"
                      className={cn(arcadeInput, "flex-1 px-2 py-1 text-xs")}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1 text-gray-300">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={overrides.accent ?? '#F59E0B'}
                      onChange={(e) => handleOverrideChange('accent', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={overrides.accent ?? ''}
                      onChange={(e) => handleOverrideChange('accent', e.target.value)}
                      placeholder="#F59E0B"
                      className={cn(arcadeInput, "flex-1 px-2 py-1 text-xs")}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1 text-gray-300">Heading Font</label>
                  <input
                    type="text"
                    value={overrides.fontHeading ?? ''}
                    onChange={(e) => handleOverrideChange('fontHeading', e.target.value)}
                    placeholder="Inter, sans-serif"
                    className={cn(arcadeInput, "w-full px-2 py-1 text-xs")}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1 text-gray-300">Body Font</label>
                  <input
                    type="text"
                    value={overrides.fontBody ?? ''}
                    onChange={(e) => handleOverrideChange('fontBody', e.target.value)}
                    placeholder="Inter, sans-serif"
                    className={cn(arcadeInput, "w-full px-2 py-1 text-xs")}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1 text-gray-300">Border Radius</label>
                  <select
                    value={overrides.radiusScale ?? ''}
                    onChange={(e) => handleOverrideChange('radiusScale', e.target.value)}
                    className={cn(arcadeInput, "w-full px-2 py-1 text-xs")}
                  >
                    <option value="">Default</option>
                    <option value="sharp">Sharp</option>
                    <option value="soft">Soft</option>
                    <option value="rounded">Rounded</option>
                    <option value="pill">Pill</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
