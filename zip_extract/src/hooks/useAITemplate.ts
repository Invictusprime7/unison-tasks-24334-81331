import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AIGeneratedTemplate, AITemplatePrompt } from '@/types/template';
import { toast } from 'sonner';

export const useAITemplate = () => {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<AIGeneratedTemplate | null>(null);

  const generateTemplate = async (prompt: AITemplatePrompt): Promise<AIGeneratedTemplate | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-template', {
        body: { 
          prompt: {
            description: `Create a ${prompt.format} template for ${prompt.industry}. 
Goal: ${prompt.goal}
${prompt.targetAudience ? `Target Audience: ${prompt.targetAudience}` : ''}
${prompt.keyMessages?.length ? `Key Messages: ${prompt.keyMessages.join(', ')}` : ''}
${prompt.preferredStyle ? `Style: ${prompt.preferredStyle}` : ''}
${prompt.brandKit ? `Brand Colors: Primary ${prompt.brandKit.primaryColor}, Secondary ${prompt.brandKit.secondaryColor}` : ''}`
          }
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

      const generatedTemplate = data.template as AIGeneratedTemplate;
      setTemplate(generatedTemplate);
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
    template,
    generateTemplate,
    generateImage,
  };
};
