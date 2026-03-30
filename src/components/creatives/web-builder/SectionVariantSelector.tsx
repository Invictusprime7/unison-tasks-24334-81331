/**
 * SectionVariantSelector — Variant picker interface for the customizer panel
 * 
 * Displays available layout variants for each section in the current template
 * as a thumbnail grid. Selecting a variant swaps the section's renderer
 * while preserving its data (props). Sections without variants are skipped.
 */

import React, { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, LayoutGrid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getVariantsForSection, hasVariants } from '@/sections/variants';
import type { SectionVariant, VariantId } from '@/sections/variants';
import type { SectionType } from '@/sections/types';

// ============================================================================
// Types
// ============================================================================

interface SectionForVariants {
  id: string;
  type: SectionType;
  label: string;
}

interface SectionVariantSelectorProps {
  /** Sections in the current template (from customizer.sections or template.sections) */
  sections: SectionForVariants[];
  /** Currently active variant for each section instance, keyed by section id */
  activeVariants: Record<string, VariantId>;
  /** Callback when user selects a variant */
  onVariantSelect: (sectionId: string, variantId: VariantId) => void;
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

/** Single variant thumbnail card */
const VariantCard: React.FC<{
  variant: SectionVariant;
  isActive: boolean;
  onSelect: () => void;
}> = ({ variant, isActive, onSelect }) => (
  <button
    onClick={onSelect}
    className={cn(
      'relative group rounded-lg border overflow-hidden transition-all text-left',
      'hover:shadow-lg hover:shadow-violet-500/10 hover:border-violet-400/50',
      isActive
        ? 'border-violet-500 ring-2 ring-violet-500/30 shadow-md shadow-violet-500/15'
        : 'border-white/[0.08] hover:border-white/20'
    )}
  >
    {/* Thumbnail */}
    <div className="relative aspect-[12/7] bg-[#0d0d18] overflow-hidden">
      <img
        src={variant.thumbnail}
        alt={variant.name}
        className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
        onError={(e) => {
          // Fallback to a colored placeholder if SVG fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.style.display = 'flex';
          target.parentElement!.style.alignItems = 'center';
          target.parentElement!.style.justifyContent = 'center';
        }}
      />
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shadow-lg">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}
    </div>

    {/* Label */}
    <div className="px-2 py-1.5 border-t border-white/[0.04]">
      <p className={cn(
        'text-[11px] font-medium truncate',
        isActive ? 'text-violet-300' : 'text-white/70'
      )}>
        {variant.name}
      </p>
      <p className="text-[9px] text-white/40 truncate mt-0.5">
        {variant.description}
      </p>
    </div>
  </button>
);

/** Section group with its variant options */
const SectionVariantGroup: React.FC<{
  section: SectionForVariants;
  variants: SectionVariant[];
  activeVariantId: VariantId | undefined;
  onVariantSelect: (variantId: VariantId) => void;
}> = ({ section, variants, activeVariantId, onVariantSelect }) => {
  // Determine which variant is active (default to the one marked isDefault)
  const resolvedActive = activeVariantId
    || variants.find(v => v.isDefault)?.id
    || variants[0]?.id;

  return (
    <div className="border-b border-white/[0.06] pb-3 mb-3 last:border-0 last:mb-0">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <LayoutGrid className="w-3.5 h-3.5 text-violet-400/60" />
        <span className="text-xs font-medium text-white/80">{section.label}</span>
        <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-violet-500/10 text-violet-300 border-0">
          {variants.length} layouts
        </Badge>
      </div>

      {/* Variant thumbnail grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {variants.map(variant => (
          <VariantCard
            key={variant.id}
            variant={variant}
            isActive={resolvedActive === variant.id}
            onSelect={() => onVariantSelect(variant.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const SectionVariantSelector: React.FC<SectionVariantSelectorProps> = ({
  sections,
  activeVariants,
  onVariantSelect,
  className,
}) => {
  /** Filter to only sections that have variant options */
  const sectionsWithVariants = useMemo(() => {
    return sections
      .filter(s => hasVariants(s.type))
      .map(s => ({
        section: s,
        variants: getVariantsForSection(s.type),
      }));
  }, [sections]);

  const handleVariantSelect = useCallback((sectionId: string, variantId: VariantId) => {
    onVariantSelect(sectionId, variantId);
  }, [onVariantSelect]);

  if (sectionsWithVariants.length === 0) {
    return (
      <div className={cn('text-center py-8 px-4', className)}>
        <LayoutGrid className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-xs text-white/40">
          No section layout variants available for the current template
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="px-1 mb-2">
        <p className="text-[10px] text-white/40 leading-relaxed">
          Choose a layout style for each section. Your content will be preserved — only the visual layout changes.
        </p>
      </div>
      {sectionsWithVariants.map(({ section, variants }) => (
        <SectionVariantGroup
          key={section.id}
          section={section}
          variants={variants}
          activeVariantId={activeVariants[section.id]}
          onVariantSelect={(variantId) => handleVariantSelect(section.id, variantId)}
        />
      ))}
    </div>
  );
};
