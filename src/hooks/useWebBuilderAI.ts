import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Canvas as FabricCanvas, Rect, Circle, IText, Textbox, FabricImage } from 'fabric';
import { toast } from 'sonner';
import { TemplateRenderer } from '@/utils/templateRenderer';
import { TemplateToHTMLExporter } from '@/utils/templateToHTMLExporter';
import type { AIGeneratedTemplate, AITemplatePrompt } from '@/types/template';

// Generate a unique variation seed for diverse template outputs
const generateVariationSeed = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export interface AICanvasObject {
  type: 'rect' | 'circle' | 'text' | 'textbox' | 'image' | 'group';
  left: number;
  top: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  src?: string;
  radius?: number;
  rx?: number;
  ry?: number;
  shadow?: any;
}

export interface AIResponse {
  objects: AICanvasObject[];
  explanation: string;
}

export interface AITemplateResponse {
  template: AIGeneratedTemplate;
  explanation: string;
}

export const useWebBuilderAI = (
  fabricCanvas: FabricCanvas | null,
  onTemplateGenerated?: (template: AIGeneratedTemplate) => void
) => {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);

  const generateDesign = async (prompt: string, action: 'create' | 'modify' = 'create'): Promise<AIResponse | null> => {
    if (!fabricCanvas) {
      toast.error('Canvas not ready');
      return null;
    }

    setLoading(true);
    try {
      // Get current canvas state for context
      const canvasState = {
        objects: fabricCanvas.getObjects().length,
        dimensions: {
          width: fabricCanvas.width,
          height: fabricCanvas.height
        }
      };

      const { data, error } = await supabase.functions.invoke('web-builder-ai', {
        body: { 
          prompt,
          canvasState,
          action
        }
      });

      if (error) {
        if (error.message.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('402')) {
          toast.error('Payment required. Please add credits to your workspace.');
        } else {
          toast.error('Failed to generate design: ' + error.message);
        }
        return null;
      }

      const aiResponse = data as AIResponse;
      setLastResponse(aiResponse);

      // Add objects to canvas
      await addObjectsToCanvas(aiResponse.objects);

      toast.success(aiResponse.explanation || 'Design generated successfully!');
      return aiResponse;
    } catch (error) {
      console.error('Error generating design:', error);
      toast.error('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addObjectsToCanvas = async (objects: AICanvasObject[]) => {
    if (!fabricCanvas) return;

    const canvasWidth = fabricCanvas.width || 1280;
    const canvasHeight = fabricCanvas.height || 800;

    const constrainPosition = (value: number, max: number, size: number = 0) => {
      return Math.max(0, Math.min(value, max - size));
    };

    for (const obj of objects) {
      try {
        let fabricObj;

        switch (obj.type) {
          case 'rect': {
            const rectWidth = obj.width || 200;
            const rectHeight = obj.height || 100;
            fabricObj = new Rect({
              left: constrainPosition(obj.left, canvasWidth, rectWidth),
              top: constrainPosition(obj.top, canvasHeight, rectHeight),
              width: rectWidth,
              height: rectHeight,
              fill: obj.fill || '#3b82f6',
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth || 0,
              rx: obj.rx || 0,
              ry: obj.ry || 0,
              shadow: obj.shadow,
            });
            break;
          }

          case 'circle': {
            const radius = obj.radius || 50;
            fabricObj = new Circle({
              left: constrainPosition(obj.left, canvasWidth, radius * 2),
              top: constrainPosition(obj.top, canvasHeight, radius * 2),
              radius: radius,
              fill: obj.fill || '#3b82f6',
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth || 0,
            });
            break;
          }

          case 'text': {
            fabricObj = new IText(obj.text || 'Text', {
              left: constrainPosition(obj.left, canvasWidth),
              top: constrainPosition(obj.top, canvasHeight),
              fill: obj.fill || '#000000',
              fontSize: obj.fontSize || 24,
              fontFamily: obj.fontFamily || 'Arial',
            });
            break;
          }

          case 'textbox': {
            const textboxWidth = obj.width || 200;
            fabricObj = new Textbox(obj.text || 'Text', {
              left: constrainPosition(obj.left, canvasWidth, textboxWidth),
              top: constrainPosition(obj.top, canvasHeight),
              width: textboxWidth,
              fill: obj.fill || '#000000',
              fontSize: obj.fontSize || 16,
              fontFamily: obj.fontFamily || 'Arial',
            });
            break;
          }

          case 'image':
            if (obj.src) {
              try {
                fabricObj = await FabricImage.fromURL(obj.src, {
                  crossOrigin: 'anonymous'
                });
                const imgWidth = obj.width || fabricObj.width || 100;
                const imgHeight = obj.height || fabricObj.height || 100;
                fabricObj.set({
                  left: constrainPosition(obj.left, canvasWidth, imgWidth),
                  top: constrainPosition(obj.top, canvasHeight, imgHeight),
                  scaleX: obj.width ? obj.width / (fabricObj.width || 1) : 1,
                  scaleY: obj.height ? obj.height / (fabricObj.height || 1) : 1,
                });
              } catch (error) {
                console.error('Error loading image:', error);
                toast.error('Failed to load image: ' + obj.src);
                continue;
              }
            }
            break;
        }

        if (fabricObj) {
          fabricCanvas.add(fabricObj);
        }
      } catch (error) {
        console.error('Error adding object to canvas:', error);
      }
    }

    fabricCanvas.renderAll();
  };

  const generateTemplate = async (prompt: string): Promise<AITemplateResponse | null> => {
    setLoading(true);
    try {
      const variationSeed = generateVariationSeed();
      console.log('[useWebBuilderAI] Generating template via ai-code-assistant, prompt:', prompt, 'seed:', variationSeed);
      
      const { data, error } = await supabase.functions.invoke('ai-code-assistant', {
        body: { 
          messages: [{ role: 'user', content: prompt }],
          mode: 'template-json',
          variationSeed,
          savePattern: true
        }
      });

      if (error) {
        console.error('[useWebBuilderAI] Edge function error:', error);
        if (error.message.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('402')) {
          toast.error('Payment required. Please add credits to your workspace.');
        } else {
          toast.error('Failed to generate template: ' + error.message);
        }
        return null;
      }

      console.log('[useWebBuilderAI] Received data:', data);

      // ai-code-assistant returns { content } with raw JSON string - parse it
      let template;
      if (data.content) {
        // Parse JSON from content string (may have markdown code fences)
        let jsonContent = data.content;
        jsonContent = jsonContent.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        try {
          template = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error('[useWebBuilderAI] Failed to parse template JSON:', parseError);
          toast.error('AI returned invalid template format');
          return null;
        }
      } else {
        // Fallback for legacy response format
        template = data.template || data;
      }
      
      // Normalize variants to formats for compatibility
      if (template.variants && !template.formats) {
        template.formats = template.variants;
        delete template.variants;
      }
      
      if (!template || !template.sections || !template.formats) {
        console.error('[useWebBuilderAI] Invalid template structure:', template);
        toast.error('Generated template has invalid structure');
        return null;
      }

      const aiTemplateResponse: AITemplateResponse = {
        template: template,
        explanation: data.explanation || 'AI template generated successfully!'
      };
      
      console.log('[useWebBuilderAI] Valid template created:', aiTemplateResponse);
      
      // Notify parent - template state will handle dual rendering
      if (onTemplateGenerated) {
        console.log('[useWebBuilderAI] Calling onTemplateGenerated callback');
        onTemplateGenerated(aiTemplateResponse.template);
      }

      toast.success(aiTemplateResponse.explanation);
      return aiTemplateResponse;
    } catch (error) {
      console.error('[useWebBuilderAI] Error generating template:', error);
      toast.error('An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Structured template generation with detailed prompt (merged from useAITemplate)
  const generateStructuredTemplate = async (prompt: AITemplatePrompt): Promise<AIGeneratedTemplate | null> => {
    setLoading(true);
    try {
      const variationSeed = generateVariationSeed();
      const promptText = `Create a ${prompt.format} template for ${prompt.industry}. 
Goal: ${prompt.goal}
${prompt.targetAudience ? `Target Audience: ${prompt.targetAudience}` : ''}
${prompt.keyMessages?.length ? `Key Messages: ${prompt.keyMessages.join(', ')}` : ''}
${prompt.preferredStyle ? `Style: ${prompt.preferredStyle}` : ''}
${prompt.brandKit ? `Brand Colors: Primary ${prompt.brandKit.primaryColor}, Secondary ${prompt.brandKit.secondaryColor}` : ''}`;

      const { data, error } = await supabase.functions.invoke('ai-code-assistant', {
        body: { 
          messages: [{ role: 'user', content: promptText }],
          mode: 'template-json',
          variationSeed,
          savePattern: true
        }
      });

      if (error) {
        if (error.message.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('402')) {
          toast.error('Payment required. Please add credits to your workspace.');
        } else {
          toast.error('Failed to generate template: ' + error.message);
        }
        return null;
      }

      // Parse JSON from ai-code-assistant content response
      let generatedTemplate: AIGeneratedTemplate;
      if (data.content) {
        let jsonContent = data.content;
        jsonContent = jsonContent.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        try {
          generatedTemplate = JSON.parse(jsonContent) as AIGeneratedTemplate;
        } catch (parseError) {
          console.error('[useWebBuilderAI] Failed to parse structured template JSON:', parseError);
          toast.error('AI returned invalid template format');
          return null;
        }
      } else {
        generatedTemplate = data.template as AIGeneratedTemplate;
      }
      
      toast.success('AI template generated successfully!');
      return generatedTemplate;
    } catch (error) {
      console.error('Error generating AI template:', error);
      toast.error('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Generate template image (merged from useAITemplate)
  const generateImage = async (prompt: string, style?: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-template-image', {
        body: { prompt, style }
      });

      if (error) {
        if (error.message.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('402')) {
          toast.error('Payment required. Please add credits to your workspace.');
        } else {
          toast.error('Failed to generate image: ' + error.message);
        }
        return null;
      }

      return data.imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
      return null;
    }
  };

  return {
    loading,
    lastResponse,
    generateDesign,
    generateTemplate,
    generateStructuredTemplate,
    generateImage,
  };
};