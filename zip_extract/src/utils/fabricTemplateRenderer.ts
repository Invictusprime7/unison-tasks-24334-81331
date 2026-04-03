import { Canvas as FabricCanvas, Rect, Circle, Ellipse, IText, FabricImage, Triangle, Line } from 'fabric';
import type { Template, Frame, Layer } from '@/schemas/templateSchema';
import { templateToDocument } from './templateAdapter';
import { preloadAssets } from './assetPreloader';

/**
 * Renders Zod-validated templates to Fabric canvas
 */
export class FabricTemplateRenderer {
  private canvas: FabricCanvas;

  constructor(canvas: FabricCanvas) {
    this.canvas = canvas;
  }

  async renderTemplate(template: Template): Promise<void> {
    console.log('[FabricTemplateRenderer] Rendering template:', template.name);
    
    // Preload assets
    const imageUrls = this.extractImageUrls(template);
    const fonts = this.extractFonts(template);
    
    console.log('[FabricTemplateRenderer] Preloading:', { images: imageUrls.length, fonts });
    await preloadAssets(imageUrls);
    
    // Preload fonts
    for (const font of fonts) {
      await document.fonts.load(`16px ${font}`);
    }

    // Get first frame
    const frame = template.frames[0];
    if (!frame) {
      throw new Error('Template has no frames');
    }

    // Set canvas size
    this.canvas.setWidth(frame.width);
    this.canvas.setHeight(frame.height);
    this.canvas.backgroundColor = frame.background;
    this.canvas.clear();

    // Render all layers
    for (const layer of frame.layers) {
      await this.renderLayer(layer);
    }

    this.canvas.renderAll();
    console.log('[FabricTemplateRenderer] Render complete');
  }

  private async renderLayer(layer: Layer): Promise<void> {
    if (!layer.visible) return;

    try {
      switch (layer.type) {
        case 'text':
          await this.renderTextLayer(layer as any);
          break;
        case 'image':
          await this.renderImageLayer(layer as any);
          break;
        case 'shape':
          await this.renderShapeLayer(layer as any);
          break;
        case 'group':
          // Render group layers recursively
          if ('layers' in layer && Array.isArray(layer.layers)) {
            for (const childLayer of layer.layers) {
              await this.renderLayer(childLayer);
            }
          }
          break;
      }
    } catch (error) {
      console.error('[FabricTemplateRenderer] Error rendering layer:', layer, error);
    }
  }

  private async renderTextLayer(layer: any): Promise<void> {
    const text = new IText(layer.content || 'Text', {
      left: layer.x,
      top: layer.y,
      fontSize: layer.fontSize || 16,
      fontFamily: layer.fontFamily || 'Inter',
      fontWeight: layer.fontWeight || 'normal',
      fontStyle: layer.fontStyle || 'normal',
      fill: layer.color || '#000000',
      textAlign: layer.textAlign || 'left',
      opacity: layer.opacity ?? 1,
      angle: layer.rotation || 0,
      selectable: !layer.locked,
      width: layer.width,
    });

    // Apply line height and letter spacing
    if (layer.lineHeight) {
      text.set('lineHeight', layer.lineHeight);
    }
    if (layer.letterSpacing) {
      text.set('charSpacing', layer.letterSpacing * 10);
    }

    this.canvas.add(text);
  }

  private async renderImageLayer(layer: any): Promise<void> {
    try {
      const img = await FabricImage.fromURL(layer.src, {
        crossOrigin: 'anonymous',
      });

      img.set({
        left: layer.x,
        top: layer.y,
        opacity: layer.opacity ?? 1,
        angle: layer.rotation || 0,
        selectable: !layer.locked,
      });

      // Apply fit mode
      const targetWidth = layer.width;
      const targetHeight = layer.height;
      
      if (layer.fit === 'cover') {
        const scale = Math.max(targetWidth / (img.width || 1), targetHeight / (img.height || 1));
        img.scale(scale);
      } else if (layer.fit === 'contain') {
        const scale = Math.min(targetWidth / (img.width || 1), targetHeight / (img.height || 1));
        img.scale(scale);
      } else if (layer.fit === 'fill') {
        img.scaleToWidth(targetWidth);
        img.scaleToHeight(targetHeight);
      }

      // Apply border radius using clipPath
      if (layer.borderRadius && layer.borderRadius > 0) {
        const clipPath = new Rect({
          width: targetWidth,
          height: targetHeight,
          rx: layer.borderRadius,
          ry: layer.borderRadius,
          originX: 'left',
          originY: 'top',
        });
        img.clipPath = clipPath;
      }

      this.canvas.add(img);
    } catch (error) {
      console.error('[FabricTemplateRenderer] Error loading image:', layer.src, error);
      // Render placeholder
      const placeholder = new Rect({
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        fill: '#e5e7eb',
        stroke: '#9ca3af',
        strokeWidth: 2,
        rx: layer.borderRadius || 0,
        ry: layer.borderRadius || 0,
      });
      this.canvas.add(placeholder);
    }
  }

  private async renderShapeLayer(layer: any): Promise<void> {
    let shape: any;

    const commonProps = {
      left: layer.x,
      top: layer.y,
      fill: layer.fill || '#cccccc',
      stroke: layer.stroke,
      strokeWidth: layer.strokeWidth || 0,
      opacity: layer.opacity ?? 1,
      angle: layer.rotation || 0,
      selectable: !layer.locked,
    };

    switch (layer.shape) {
      case 'rectangle':
        shape = new Rect({
          ...commonProps,
          width: layer.width,
          height: layer.height,
          rx: layer.borderRadius || 0,
          ry: layer.borderRadius || 0,
        });
        break;

      case 'circle':
        shape = new Circle({
          ...commonProps,
          radius: Math.min(layer.width, layer.height) / 2,
        });
        break;

      case 'ellipse':
        shape = new Ellipse({
          ...commonProps,
          rx: layer.width / 2,
          ry: layer.height / 2,
        });
        break;

      case 'triangle':
        shape = new Triangle({
          ...commonProps,
          width: layer.width,
          height: layer.height,
        });
        break;

      case 'line':
        shape = new Line([layer.x, layer.y, layer.x + layer.width, layer.y + layer.height], {
          stroke: layer.stroke || layer.fill || '#000000',
          strokeWidth: layer.strokeWidth || 2,
          opacity: layer.opacity ?? 1,
          angle: layer.rotation || 0,
          selectable: !layer.locked,
        });
        break;

      default:
        shape = new Rect({
          ...commonProps,
          width: layer.width,
          height: layer.height,
        });
    }

    if (shape) {
      this.canvas.add(shape);
    }
  }

  private extractImageUrls(template: Template): string[] {
    const urls: string[] = [];
    
    const extractFromLayers = (layers: Layer[]) => {
      for (const layer of layers) {
        if (layer.type === 'image' && 'src' in layer) {
          urls.push(layer.src as string);
        } else if (layer.type === 'group' && 'layers' in layer) {
          extractFromLayers((layer as any).layers);
        }
      }
    };

    for (const frame of template.frames) {
      extractFromLayers(frame.layers);
    }

    return urls;
  }

  private extractFonts(template: Template): string[] {
    const fonts = new Set<string>();
    
    const extractFromLayers = (layers: Layer[]) => {
      for (const layer of layers) {
        if (layer.type === 'text' && 'fontFamily' in layer) {
          fonts.add((layer as any).fontFamily);
        } else if (layer.type === 'group' && 'layers' in layer) {
          extractFromLayers((layer as any).layers);
        }
      }
    };

    for (const frame of template.frames) {
      extractFromLayers(frame.layers);
    }

    return Array.from(fonts);
  }
}
