/**
 * TemplatePreviewThumbnail
 * Renders a lightweight painted thumbnail without starting another runtime.
 * The Web Builder's VFSPreview is the only executable preview surface.
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { LayoutCategory } from '@/data/templates/types';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface TemplatePreviewThumbnailProps {
  html: string;
  device: PreviewDevice;
  className?: string;
  title?: string;
  category?: LayoutCategory;
}

const DEVICE_CONFIGS: Record<PreviewDevice, { width: number; height: number; scale: number }> = {
  desktop: { width: 1280, height: 720, scale: 0.18 },
  tablet: { width: 768, height: 1024, scale: 0.15 },
  mobile: { width: 375, height: 667, scale: 0.28 },
};

export const TemplatePreviewThumbnail: React.FC<TemplatePreviewThumbnailProps> = ({
  html,
  device,
  className,
  title = 'Template',
  category,
}) => {
  const config = DEVICE_CONFIGS[device];
  
  // Calculate container dimensions based on scale
  const containerWidth = config.width * config.scale;
  const containerHeight = config.height * config.scale;

  const palette = useMemo(() => {
    const categoryHue: Partial<Record<LayoutCategory, number>> = {
      salon: 330,
      restaurant: 24,
      contractor: 205,
      coaching: 155,
      saas: 225,
      agency: 275,
      portfolio: 38,
      store: 145,
      content: 18,
      nonprofit: 150,
      realestate: 195,
      landing: 250,
      saved: 215,
    };
    let hash = 0;
    for (let index = 0; index < Math.min(html.length, 4_000); index += 1) {
      hash = ((hash << 5) - hash + html.charCodeAt(index)) | 0;
    }
    const baseHue = categoryHue[category || 'landing'] ?? 250;
    const hue = (baseHue + Math.abs(hash % 24)) % 360;
    return {
      accent: `hsl(${hue} 68% 52%)`,
      soft: `hsl(${hue} 70% 94%)`,
      ink: `hsl(${hue} 24% 16%)`,
    };
  }, [category, html]);

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-md border border-border/50 bg-white",
        className
      )}
      style={{
        width: containerWidth,
        height: containerHeight,
      }}
    >
      <div
        className="absolute inset-0 flex flex-col overflow-hidden bg-white"
        role="img"
        aria-label={`${title} template thumbnail`}
      >
        <div className="flex h-[14%] items-center justify-between border-b border-black/5 px-[6%]">
          <div className="h-1.5 w-[22%] rounded-full" style={{ background: palette.ink }} />
          <div className="flex w-[35%] justify-end gap-1.5">
            <div className="h-1 w-[26%] rounded-full bg-slate-200" />
            <div className="h-1 w-[26%] rounded-full bg-slate-200" />
            <div className="h-2 w-[28%] rounded-full" style={{ background: palette.accent }} />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-[1.1fr_0.9fr] items-center gap-[5%] px-[7%]" style={{ background: palette.soft }}>
          <div className="space-y-2">
            <div className="h-2 w-[84%] rounded-full" style={{ background: palette.ink }} />
            <div className="h-2 w-[68%] rounded-full" style={{ background: palette.ink }} />
            <div className="h-1 w-[92%] rounded-full bg-slate-300" />
            <div className="h-1 w-[76%] rounded-full bg-slate-300" />
            <div className="h-3 w-[36%] rounded-full" style={{ background: palette.accent }} />
          </div>
          <div className="aspect-[4/3] rounded-lg border border-white/80 bg-white/75 p-2 shadow-sm">
            <div className="h-full rounded-md" style={{ background: `linear-gradient(145deg, ${palette.accent}, ${palette.soft})` }} />
          </div>
        </div>
        <div className="grid h-[27%] grid-cols-3 gap-[4%] px-[7%] py-[4%]">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-md border border-slate-100 bg-white p-1 shadow-sm">
              <div className="mb-1 h-1.5 w-1.5 rounded-full" style={{ background: palette.accent }} />
              <div className="mb-1 h-1 w-[74%] rounded bg-slate-300" />
              <div className="h-1 w-[92%] rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Device indicator */}
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] rounded">
        {config.width}×{config.height}
      </div>
    </div>
  );
};

export default TemplatePreviewThumbnail;
