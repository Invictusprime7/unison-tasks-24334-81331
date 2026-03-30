/**
 * SectionLayoutPicker — Section-level variant browser for the Floating Dock
 * 
 * Shows available layout variants grouped by section type.
 * Styled for the dark arcade dock UI. Scrollable.
 */

import React, { useMemo } from 'react';
import { Layout, Layers, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVariantsForSection, getSectionTypesWithVariants } from '@/sections/variants/registry';
import { detectSections, type DetectedSection } from '@/utils/sectionSwapper';
import type { SectionVariant } from '@/sections/variants/types';
import type { SectionType } from '@/sections/types';

interface SectionLayoutPickerProps {
  currentCode: string;
  onSwapSection: (sectionId: string, variantId: string) => void;
}

const sectionTypeLabels: Partial<Record<SectionType, { emoji: string; label: string }>> = {
  navbar: { emoji: '🧭', label: 'Navigation' },
  hero: { emoji: '🦸', label: 'Hero' },
  cta: { emoji: '📢', label: 'Call to Action' },
  services: { emoji: '🛠️', label: 'Services' },
  testimonials: { emoji: '⭐', label: 'Testimonials' },
  footer: { emoji: '🔻', label: 'Footer' },
  pricing: { emoji: '💰', label: 'Pricing' },
  contact: { emoji: '✉️', label: 'Contact' },
  faq: { emoji: '❓', label: 'FAQ' },
  team: { emoji: '👥', label: 'Team' },
  gallery: { emoji: '🖼️', label: 'Gallery' },
  stats: { emoji: '📊', label: 'Stats' },
  about: { emoji: 'ℹ️', label: 'About' },
  features: { emoji: '✨', label: 'Features' },
};

export const SectionLayoutPicker: React.FC<SectionLayoutPickerProps> = ({
  currentCode,
  onSwapSection,
}) => {
  const detectedSections = useMemo(() => detectSections(currentCode), [currentCode]);

  const swappableSections = useMemo(() => {
    const typesWithVariants = getSectionTypesWithVariants();
    return detectedSections.filter(s => typesWithVariants.includes(s.type));
  }, [detectedSections]);

  // Empty state
  if (detectedSections.length === 0) {
    return (
      <div className="p-8 text-center">
        <Layout className="h-10 w-10 mx-auto mb-3 text-yellow-400/30" />
        <p className="text-sm text-yellow-400/60 font-medium">
          Load a template first
        </p>
        <p className="text-[10px] text-white/30 mt-1.5 max-w-[240px] mx-auto">
          Use the Templates tab to load a page, then come back here to swap section layouts.
        </p>
      </div>
    );
  }

  // No swappable sections
  if (swappableSections.length === 0) {
    return (
      <div className="p-8 text-center">
        <Sparkles className="h-10 w-10 mx-auto mb-3 text-fuchsia-400/30" />
        <p className="text-sm text-fuchsia-400/60 font-medium">
          {detectedSections.length} sections detected
        </p>
        <p className="text-[10px] text-white/30 mt-1.5 max-w-[240px] mx-auto">
          No alternative layouts available yet for these section types. More variants coming soon!
        </p>
        <div className="flex flex-wrap gap-1 justify-center mt-3">
          {detectedSections.map(s => (
            <span key={s.id} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
              {s.type}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
        <Layers className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-[10px] text-white/50">
          {detectedSections.length} sections · {swappableSections.length} swappable
        </span>
        <div className="flex gap-1 ml-auto">
          {detectedSections.map(s => (
            <span
              key={s.id}
              className={cn(
                "text-[8px] px-1.5 py-0.5 rounded-full border",
                swappableSections.includes(s)
                  ? "bg-cyan-500/15 text-cyan-400/80 border-cyan-500/30"
                  : "bg-white/5 text-white/25 border-white/10"
              )}
            >
              {s.type}
            </span>
          ))}
        </div>
      </div>

      {/* Variant groups */}
      {swappableSections.map(section => {
        const variants = getVariantsForSection(section.type);
        if (variants.length < 2) return null;
        const meta = sectionTypeLabels[section.type];

        return (
          <div key={section.id} className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold text-white/80">
                {meta ? `${meta.emoji} ${meta.label}` : section.type}
              </h4>
              <span className="text-[9px] text-fuchsia-400/60 font-medium">
                {variants.length} layouts
              </span>
            </div>

            <div className="grid gap-1.5">
              {variants.map(variant => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  onSelect={() => onSwapSection(section.id, variant.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Non-swappable sections note */}
      {detectedSections.filter(s => !swappableSections.includes(s)).length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-[10px] text-white/25 mb-1.5">More variants coming soon:</p>
          <div className="flex flex-wrap gap-1">
            {detectedSections
              .filter(s => !swappableSections.includes(s))
              .map(s => (
                <span key={s.id} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/20 border border-white/5">
                  {s.type}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** Variant card styled for dark dock */
const VariantCard: React.FC<{
  variant: SectionVariant;
  onSelect: () => void;
}> = ({ variant, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200",
        "text-left group cursor-pointer",
        variant.isDefault
          ? "bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/15"
          : "bg-white/[0.03] border-white/10 hover:border-yellow-400/40 hover:bg-yellow-500/10"
      )}
    >
      {/* Thumbnail */}
      <div className="w-14 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
        {variant.thumbnail ? (
          <img
            src={variant.thumbnail}
            alt={variant.name}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-[8px] font-bold text-white/30 uppercase tracking-wider">${variant.slug.slice(0, 6)}</span>`;
            }}
          />
        ) : (
          <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
            {variant.slug.slice(0, 6)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-white/80 truncate">{variant.name}</span>
          {variant.isDefault && (
            <span className="text-[7px] px-1 py-0 rounded-full bg-cyan-500/20 text-cyan-400 font-bold uppercase shrink-0">
              active
            </span>
          )}
        </div>
        {variant.description && (
          <p className="text-[9px] text-white/35 line-clamp-1 mt-0.5">
            {variant.description}
          </p>
        )}
        {variant.tags && (
          <div className="flex gap-1 mt-1">
            {variant.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[7px] text-white/20 bg-white/5 rounded px-1 py-0">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <ArrowRight className="h-3.5 w-3.5 text-white/15 group-hover:text-yellow-400 transition-colors shrink-0" />
    </button>
  );
};
