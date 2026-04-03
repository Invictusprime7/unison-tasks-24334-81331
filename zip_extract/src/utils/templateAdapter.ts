import { nanoid } from 'nanoid';
import { Template, Frame, Layer } from '@/schemas/templateSchema';
import { Document, Page, Layer as DocLayer, Fill } from '@/types/document';

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute layout rectangles for frames/layers based on layout rules
 */
export function computeFrameLayout(frame: Frame): Map<string, LayoutRect> {
  const rectMap = new Map<string, LayoutRect>();
  const { width: frameWidth, height: frameHeight, padding, gap, layout } = frame;

  if (layout === 'free') {
    // Free positioning - just clamp to frame bounds
    frame.layers.forEach((layer) => {
      const layerId = layer.id || nanoid();
      rectMap.set(layerId, {
        x: Math.max(0, Math.min(layer.x, frameWidth - layer.width)),
        y: Math.max(0, Math.min(layer.y, frameHeight - layer.height)),
        width: Math.max(1, Math.min(layer.width, frameWidth)),
        height: Math.max(1, Math.min(layer.height, frameHeight)),
      });
    });
  } else if (layout === 'flex-column') {
    // Vertical stack
    let currentY = padding;
    frame.layers.forEach((layer) => {
      const layerId = layer.id || nanoid();
      const width = Math.max(1, Math.min(layer.width, frameWidth - 2 * padding));
      const height = Math.max(1, layer.height);
      
      rectMap.set(layerId, {
        x: padding + (frameWidth - 2 * padding - width) / 2, // Center horizontally
        y: currentY,
        width,
        height,
      });
      
      currentY += height + gap;
    });
  } else if (layout === 'flex-row') {
    // Horizontal stack
    let currentX = padding;
    frame.layers.forEach((layer) => {
      const layerId = layer.id || nanoid();
      const width = Math.max(1, layer.width);
      const height = Math.max(1, Math.min(layer.height, frameHeight - 2 * padding));
      
      rectMap.set(layerId, {
        x: currentX,
        y: padding + (frameHeight - 2 * padding - height) / 2, // Center vertically
        width,
        height,
      });
      
      currentX += width + gap;
    });
  } else if (layout === 'grid') {
    // Simple grid layout (2 columns for now)
    const cols = 2;
    const cellWidth = (frameWidth - 2 * padding - gap * (cols - 1)) / cols;
    
    frame.layers.forEach((layer, idx) => {
      const layerId = layer.id || nanoid();
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      
      rectMap.set(layerId, {
        x: padding + col * (cellWidth + gap),
        y: padding + row * (layer.height + gap),
        width: Math.max(1, Math.min(cellWidth, layer.width)),
        height: Math.max(1, layer.height),
      });
    });
  }

  return rectMap;
}

/**
 * Convert a validated Template to Document format
 */
export function templateToDocument(template: Template): Document {
  const pages: Page[] = template.frames.map((frame) => {
    const frameId = frame.id || nanoid();
    const layoutRects = computeFrameLayout(frame);
    
    const layers: DocLayer[] = frame.layers.map((layer, idx) => {
      const layerId = layer.id || nanoid();
      const rect = layoutRects.get(layerId) || {
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
      };
      
      // Base properties common to all layers
      const baseProps: DocLayer = {
        id: layerId,
        kind: layer.type === 'text' ? 'text' : layer.type === 'image' ? 'image' : 'shape',
        transform: {
          x: rect.x,
          y: rect.y,
          scale: 1,
          rotate: layer.rotation,
        },
        opacity: layer.opacity,
        blend: 'normal' as const,
        visible: layer.visible,
        locked: layer.locked,
        sortOrder: idx,
        payload: {},
      };

      // Convert layer based on type
      if (layer.type === 'text') {
        return {
          ...baseProps,
          kind: 'text' as const,
          payload: {
            text: layer.content,
            fontFamily: layer.fontFamily,
            fontSize: layer.fontSize,
            fontWeight: layer.fontWeight,
            fontStyle: layer.fontStyle,
            textAlign: layer.textAlign,
            color: layer.color,
            lineHeight: layer.lineHeight,
            letterSpacing: layer.letterSpacing,
            width: rect.width,
            height: rect.height,
          },
        };
      } else if (layer.type === 'image') {
        return {
          ...baseProps,
          kind: 'image' as const,
          payload: {
            src: layer.src,
            fit: layer.fit,
            filters: layer.filters,
            borderRadius: layer.borderRadius,
            width: rect.width,
            height: rect.height,
          },
        };
      } else if (layer.type === 'shape') {
        return {
          ...baseProps,
          kind: 'shape' as const,
          payload: {
            shape: layer.shape,
            fill: layer.fill,
            stroke: layer.stroke,
            strokeWidth: layer.strokeWidth,
            borderRadius: layer.borderRadius,
            width: rect.width,
            height: rect.height,
          },
        };
      }
      
      return baseProps;
    });

    const background: Fill = {
      type: 'solid' as const,
      color: frame.background,
    };

    return {
      id: frameId,
      documentId: template.id || nanoid(),
      name: frame.name,
      width: frame.width,
      height: frame.height,
      background,
      layers,
      sortOrder: 0,
    };
  });

  return {
    id: template.id || nanoid(),
    title: template.name,
    type: 'design' as const,
    userId: '',
    pages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Extract all image URLs from a template for preloading
 */
export function extractTemplateAssets(template: Template): string[] {
  const assets: string[] = [];
  
  function extractFromLayers(layers: Layer[]) {
    layers.forEach((layer) => {
      if (layer.type === 'image') {
        assets.push(layer.src);
      } else if (layer.type === 'group' && 'layers' in layer) {
        extractFromLayers(layer.layers);
      }
    });
  }
  
  template.frames.forEach((frame) => {
    extractFromLayers(frame.layers);
  });
  
  return assets;
}
