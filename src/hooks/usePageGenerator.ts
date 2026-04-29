import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { runUnisonAI } from '@/services/unisonAI';
import { toast } from 'sonner';

export interface PageSchema {
  title: string;
  themeTokens: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    fontHeading: string;
    fontBody: string;
  };
  sections: PageSection[];
}

export interface PageSection {
  id: string;
  type: 'hero' | 'content' | 'gallery' | 'cta' | 'footer' | 'custom';
  layout: 'container' | 'full-width' | 'split';
  backgroundColor?: string;
  components: PageComponent[];
}

export interface PageComponent {
  type: 'heading' | 'text' | 'button' | 'image' | 'grid' | 'card';
  content: string;
  props?: {
    className?: string;
    href?: string;
    src?: string;
    [key: string]: any;
  };
}

export const usePageGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [generatedPage, setGeneratedPage] = useState<PageSchema | null>(null);

  const generatePage = async (prompt: string, theme?: string): Promise<PageSchema | null> => {
    setLoading(true);
    try {
      const resp = await runUnisonAI({
        module: 'page.graph',
        prompt,
        options: { passthrough: { theme } },
      });

      if (!resp.ok) {
        const errMsg = resp.error ?? '';
        if (errMsg.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (errMsg.includes('402')) {
          toast.error('Payment required. Please add credits to your workspace.');
        } else {
          toast.error('Failed to generate page: ' + errMsg);
        }
        return null;
      }

      const data = resp.raw as { schema?: PageSchema } | null;
      const schema = data?.schema as PageSchema;
      setGeneratedPage(schema);
      toast.success('Page generated successfully!');
      return schema;
    } catch (error) {
      console.error('Error generating page:', error);
      toast.error('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateSection = async (
    prompt: string, 
    sectionType: PageSection['type'],
    theme?: string
  ): Promise<PageSection | null> => {
    setLoading(true);
    try {
      const resp = await runUnisonAI({
        module: 'page.graph',
        prompt,
        options: { passthrough: { theme, sectionType } },
      });

      if (!resp.ok) {
        toast.error('Failed to generate section: ' + (resp.error ?? 'Unknown error'));
        return null;
      }

      const data = resp.raw as { schema?: { sections?: PageSection[] } } | null;
      const section = data?.schema?.sections?.[0] as PageSection;
      toast.success('Section generated successfully!');
      return section;
    } catch (error) {
      console.error('Error generating section:', error);
      toast.error('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const savePage = async (schema: PageSchema, prompt: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('generated_pages')
        .insert([{
          user_id: user?.id || null,
          title: schema.title,
          prompt,
          schema: schema as any,
          theme_tokens: schema.themeTokens as any
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Page saved successfully!');
      return data;
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Failed to save page');
      return null;
    }
  };

  return {
    loading,
    generatedPage,
    generatePage,
    generateSection,
    savePage
  };
};