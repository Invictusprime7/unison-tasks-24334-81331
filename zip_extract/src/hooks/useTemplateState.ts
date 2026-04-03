import { useState, useCallback, useEffect } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import type { AIGeneratedTemplate } from '@/types/template';
import { TemplateRenderer } from '@/utils/templateRenderer';
import { TemplateToHTMLExporter } from '@/utils/templateToHTMLExporter';
import { AssetPreloader } from '@/utils/assetPreloader';
import { sanitizeHTML, sanitizeCSS } from '@/utils/htmlSanitizer';

/**
 * Phase 3: State Management Hook
 * Template schema as single source of truth
 * Syncs to both Fabric Canvas and HTML Preview
 */
export const useTemplateState = (fabricCanvas: FabricCanvas | null) => {
  const [template, setTemplate] = useState<AIGeneratedTemplate | null>(null);
  const [html, setHtml] = useState<string>('');
  const [css, setCss] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);
  const [assetPreloader] = useState(() => new AssetPreloader());

  /**
   * Update template state and trigger dual rendering
   */
  const updateTemplate = useCallback(async (newTemplate: AIGeneratedTemplate) => {
    console.log('[TemplateState] updateTemplate called with:', newTemplate);
    
    if (!fabricCanvas) {
      console.error('[TemplateState] Fabric canvas not initialized');
      throw new Error('Canvas not ready. Please wait for the canvas to initialize.');
    }

    setIsRendering(true);
    setTemplate(newTemplate);

    try {
      // Validate template structure
      if (!newTemplate.sections || !Array.isArray(newTemplate.sections)) {
        throw new Error('Invalid template: missing sections array');
      }
      if (!newTemplate.formats || !Array.isArray(newTemplate.formats) || newTemplate.formats.length === 0) {
        throw new Error('Invalid template: missing formats');
      }

      // Phase 4: Preload assets before rendering
      const assets = assetPreloader.extractAssetUrls(newTemplate);
      console.log('[TemplateState] Preloading assets:', assets);
      
      await assetPreloader.preloadFonts(assets.fonts);
      await assetPreloader.preloadImages(assets.images, (loaded, total) => {
        console.log(`[TemplateState] Preloading images: ${loaded}/${total}`);
      });

      console.log('[TemplateState] Assets preloaded, starting canvas render');

      // Render to Fabric Canvas (editing mode)
      const renderer = new TemplateRenderer(fabricCanvas);
      await renderer.renderTemplate(newTemplate);
      console.log('[TemplateState] ✅ Template rendered to Fabric Canvas');

      // Export to HTML (preview mode)
      const exporter = new TemplateToHTMLExporter();
      const exportedHtml = exporter.exportToHTML(newTemplate);

      // Phase 4: Apply sanitization before iframe injection
      const sanitizedHtml = sanitizeHTML(exportedHtml);
      
      // Extract and sanitize CSS
      const cssMatch = sanitizedHtml.match(/<style>([\s\S]*?)<\/style>/);
      const rawCss = cssMatch ? cssMatch[1] : '';
      const sanitizedCss = sanitizeCSS(rawCss);

      setHtml(sanitizedHtml);
      setCss(sanitizedCss);
      console.log('[TemplateState] ✅ HTML/CSS exported and sanitized');

    } catch (error) {
      console.error('[TemplateState] ❌ Error rendering template:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown rendering error';
      throw new Error(`Failed to render template: ${errorMsg}`);
    } finally {
      setIsRendering(false);
    }
  }, [fabricCanvas, assetPreloader]);

  /**
   * Update specific template data (for data binding)
   */
  const updateTemplateData = useCallback(async (data: Record<string, any>) => {
    if (!template) return;

    const updatedTemplate = {
      ...template,
      data: { ...template.data, ...data }
    };

    await updateTemplate(updatedTemplate);
  }, [template, updateTemplate]);

  /**
   * Clear template state
   */
  const clearTemplate = useCallback(() => {
    setTemplate(null);
    setHtml('');
    setCss('');
    assetPreloader.clearCache();
    
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas, assetPreloader]);

  /**
   * Re-render current template (useful after canvas edits)
   */
  const reRender = useCallback(async () => {
    if (template) {
      await updateTemplate(template);
    }
  }, [template, updateTemplate]);

  return {
    // State
    template,
    html,
    css,
    isRendering,

    // Actions
    updateTemplate,
    updateTemplateData,
    clearTemplate,
    reRender,
  };
};
