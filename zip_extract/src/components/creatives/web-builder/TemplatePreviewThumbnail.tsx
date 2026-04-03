/**
 * TemplatePreviewThumbnail
 * Renders a scaled live preview of template HTML at the specified device width
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface TemplatePreviewThumbnailProps {
  html: string;
  device: PreviewDevice;
  className?: string;
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
}) => {
  const config = DEVICE_CONFIGS[device];
  
  // Calculate container dimensions based on scale
  const containerWidth = config.width * config.scale;
  const containerHeight = config.height * config.scale;

  // Create a complete HTML document for the iframe
  const iframeSrc = useMemo(() => {
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
    return `data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`;
  }, [html]);

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
      <iframe
        src={iframeSrc}
        title="Template Preview"
        className="pointer-events-none"
        style={{
          width: config.width,
          height: config.height,
          transform: `scale(${config.scale})`,
          transformOrigin: 'top left',
          border: 'none',
        }}
        sandbox="allow-same-origin"
      />
      
      {/* Device indicator */}
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] rounded">
        {config.width}×{config.height}
      </div>
    </div>
  );
};

export default TemplatePreviewThumbnail;
