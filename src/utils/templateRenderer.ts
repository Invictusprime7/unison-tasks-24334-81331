import { Canvas as FabricCanvas, Rect, Circle, IText, FabricImage } from 'fabric';
import type { AIGeneratedTemplate, TemplateComponent } from '@/types/template';
import { LayoutEngine, type LayoutResult } from './layoutEngine';
import { validateTemplate } from './zodTemplateValidator';
import { AssetPreloader } from './assetPreloader';

/**
 * Pillar 2 & 3: Deterministic Layout + Safe Adapter
 * Renders validated templates with preloaded assets
 */
export class TemplateRenderer {
  private canvas: FabricCanvas;
  private layoutEngine: LayoutEngine;
  private preloader: AssetPreloader;
  private preloadedImages: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: FabricCanvas) {
    this.canvas = canvas;
    this.layoutEngine = new LayoutEngine();
    this.preloader = new AssetPreloader();
  }

  /**
   * Render AI-generated template to Fabric canvas
   * Implements all 5 pillars of reliable rendering
   */
  async renderTemplate(template: any, data?: Record<string, any>) {
    try {
      // Pillar 1: Validate and normalize template
      const validationResult = validateTemplate(template);
      if (!validationResult.success || !validationResult.data) {
        throw new Error('Template validation failed: ' + (validationResult.errors?.join(', ') || 'Unknown error'));
      }
      const validatedTemplate = validationResult.data;
      console.log('[TemplateRenderer] Template validated:', validatedTemplate);

      // Pillar 4: Preload assets
      const assets = this.preloader.extractAssetUrls(validatedTemplate);
      console.log('[TemplateRenderer] Preloading assets:', assets);
      
      await this.preloader.preloadFonts(assets.fonts);
      this.preloadedImages = await this.preloader.preloadImages(assets.images, (loaded, total) => {
        console.log(`[TemplateRenderer] Loading images: ${loaded}/${total}`);
      });

      // Merge data with defaults (for any data bindings)
      const mergedData = { ...data };
      
      // Clear canvas
      this.canvas.clear();

      // Set canvas size based on first frame (guaranteed to exist after validation)
      const frame = validatedTemplate.frames[0];
      this.canvas.setWidth(frame.width);
      this.canvas.setHeight(frame.height);
      this.canvas.backgroundColor = frame.background || '#ffffff';

      // Pillar 2 & 3: Render layers from frame
      for (const layer of frame.layers) {
        await this.renderLayer(layer, mergedData);
      }

      this.canvas.renderAll();
      console.log('[TemplateRenderer] Rendering complete');
      
    } catch (error) {
      // Pillar 5: Error isolation
      console.error('[TemplateRenderer] Render failed:', error);
      this.renderErrorState(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async renderLayer(layer: any, data: Record<string, any>) {
    if (!layer.visible) return;

    switch (layer.type) {
      case 'text': {
        const text = new IText(layer.content || 'Text', {
          left: layer.x,
          top: layer.y,
          fontSize: layer.fontSize,
          fontFamily: layer.fontFamily,
          fill: layer.color,
          fontWeight: layer.fontWeight,
          fontStyle: layer.fontStyle,
          textAlign: layer.textAlign,
          opacity: layer.opacity,
          angle: layer.rotation,
          selectable: !layer.locked,
          editable: !layer.locked,
          hasControls: !layer.locked,
          hasBorders: !layer.locked,
        });
        this.canvas.add(text);
        break;
      }

      case 'image': {
        if (layer.src) {
          try {
            const img = await FabricImage.fromURL(layer.src);
            img.set({
              left: layer.x,
              top: layer.y,
              width: layer.width,
              height: layer.height,
              opacity: layer.opacity,
              angle: layer.rotation,
              selectable: !layer.locked,
              hasControls: !layer.locked,
              hasBorders: !layer.locked,
            });
            
            // Apply filters if any
            if (layer.filters && layer.filters.length > 0) {
              // Note: Fabric.js filters would need to be applied here
              console.log('Filters:', layer.filters);
            }
            
            this.canvas.add(img);
          } catch (error) {
            console.error('Error loading image:', error);
          }
        }
        break;
      }

      case 'shape': {
        let shapeObject;
        
        if (layer.shape === 'circle' || layer.shape === 'ellipse') {
          shapeObject = new Circle({
            left: layer.x,
            top: layer.y,
            radius: layer.width / 2,
            fill: layer.fill,
            stroke: layer.stroke,
            strokeWidth: layer.strokeWidth,
            opacity: layer.opacity,
            angle: layer.rotation,
            selectable: !layer.locked,
            hasControls: !layer.locked,
            hasBorders: !layer.locked,
          });
        } else {
          // Rectangle or other shapes
          shapeObject = new Rect({
            left: layer.x,
            top: layer.y,
            width: layer.width,
            height: layer.height,
            fill: layer.fill,
            stroke: layer.stroke,
            strokeWidth: layer.strokeWidth,
            rx: layer.borderRadius,
            ry: layer.borderRadius,
            opacity: layer.opacity,
            angle: layer.rotation,
            selectable: !layer.locked,
            hasControls: !layer.locked,
            hasBorders: !layer.locked,
          });
        }
        
        this.canvas.add(shapeObject);
        break;
      }

      case 'group': {
        // Recursively render group layers
        if (layer.layers && Array.isArray(layer.layers)) {
          for (const childLayer of layer.layers) {
            await this.renderLayer(childLayer, data);
          }
        }
        break;
      }
    }
  }

  /**
   * Pillar 5: Error isolation - render error state
   */
  private renderErrorState(errorMessage: string): void {
    this.canvas.clear();
    this.canvas.backgroundColor = '#fee2e2';

    const errorText = new IText('Failed to render template', {
      left: this.canvas.width! / 2,
      top: this.canvas.height! / 2 - 20,
      fontSize: 20,
      fontFamily: 'Inter, sans-serif',
      fill: '#991b1b',
      originX: 'center',
      originY: 'center',
      fontWeight: 'bold',
    });
    this.canvas.add(errorText);

    const detailText = new IText(errorMessage, {
      left: this.canvas.width! / 2,
      top: this.canvas.height! / 2 + 20,
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fill: '#7f1d1d',
      originX: 'center',
      originY: 'center',
    });
    this.canvas.add(detailText);

    this.canvas.renderAll();
  }
}
