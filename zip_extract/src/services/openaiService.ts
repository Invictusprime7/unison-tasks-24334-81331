/**
 * OpenAI Service Integration
 * Client-side utilities for OpenAI API interactions via Supabase Edge Functions
 */

import { supabase } from '@/integrations/supabase/client';

export interface OpenAIImageRequest {
  prompt: string;
  negative_prompt?: string;
  style?: 'digital-art' | 'realistic' | 'sketch' | 'painting' | 'fantasy';
  quality?: 'standard' | 'hd';
  width?: number;
  height?: number;
  num_images?: number;
}

export interface OpenAIImageResponse {
  url: string;
  revised_prompt?: string;
}

export interface OpenAICodeRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  mode?: 'creative' | 'technical' | 'web' | 'component';
}

export interface OpenAICodeResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Generate AI image using DALL-E via Supabase Edge Function
export async function generateAIImage(request: OpenAIImageRequest): Promise<OpenAIImageResponse> {
  try {
    console.log('[OpenAI] Generating image with prompt:', request.prompt);
    
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: request
    });

    if (error) {
      console.error('[OpenAI] Image generation error:', error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }

    if (!data || !data.url) {
      throw new Error('No image URL received from the API');
    }

    console.log('[OpenAI] Image generated successfully');
    return data;
    
  } catch (error) {
    console.error('[OpenAI] Image generation failed:', error);
    throw error;
  }
}

// Generate AI code using Lovable AI Gateway via Supabase Edge Function
export async function generateAICode(request: OpenAICodeRequest): Promise<OpenAICodeResponse> {
  try {
    console.log('[OpenAI] Generating code with mode:', request.mode);
    
    const { data, error } = await supabase.functions.invoke('ai-code-assistant', {
      body: {
        messages: request.messages,
        mode: request.mode || 'creative',
        savePattern: true
      }
    });

    if (error) {
      console.error('[OpenAI] Code generation error:', error);
      
      if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (error.message.includes('402')) {
        throw new Error('Credits required. Please add credits to continue using AI features.');
      }
      
      throw new Error(`Failed to generate code: ${error.message}`);
    }

    if (!data || !data.content) {
      throw new Error('No content received from the AI assistant');
    }

    console.log('[OpenAI] Code generated successfully');
    return data;
    
  } catch (error) {
    console.error('[OpenAI] Code generation failed:', error);
    throw error;
  }
}

// Rewrite copy/text using AI via Supabase Edge Function
export async function rewriteCopy(
  text: string, 
  tone: 'professional' | 'casual' | 'friendly' | 'formal' | 'creative' = 'professional',
  purpose: 'general' | 'seo' | 'cta' = 'general'
): Promise<string> {
  try {
    console.log('[OpenAI] Rewriting copy with tone:', tone, 'purpose:', purpose);
    
    const { data, error } = await supabase.functions.invoke('copy-rewrite', {
      body: { text, tone, purpose }
    });

    if (error) {
      console.error('[OpenAI] Copy rewrite error:', error);
      throw new Error(`Failed to rewrite copy: ${error.message}`);
    }

    if (!data || !data.rewrittenText) {
      throw new Error('No rewritten text received from the API');
    }

    console.log('[OpenAI] Copy rewritten successfully');
    return data.rewrittenText;
    
  } catch (error) {
    console.error('[OpenAI] Copy rewrite failed:', error);
    throw error;
  }
}

// Generate a complete web page using AI
export async function generatePage(
  prompt: string,
  theme?: string,
  sectionType?: 'hero' | 'features' | 'cta' | 'footer'
): Promise<unknown> {
  try {
    console.log('[OpenAI] Generating page with prompt:', prompt);
    
    const { data, error } = await supabase.functions.invoke('generate-page', {
      body: { prompt, theme, sectionType }
    });

    if (error) {
      console.error('[OpenAI] Page generation error:', error);
      throw new Error(`Failed to generate page: ${error.message}`);
    }

    if (!data) {
      throw new Error('No page data received from the API');
    }

    console.log('[OpenAI] Page generated successfully');
    return data;
    
  } catch (error) {
    console.error('[OpenAI] Page generation failed:', error);
    throw error;
  }
}

// Check if OpenAI features are available
export function isOpenAIAvailable(): boolean {
  return true; // The edge functions handle the availability check
}

// Get AI service status
export async function getAIServiceStatus(): Promise<{
  openai: boolean;
  lovable: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase.functions.invoke('ai-code-assistant', {
      body: {
        messages: [{ role: 'user', content: 'test' }],
        mode: 'test'
      }
    });

    if (error) {
      if (error.message.includes('LOVABLE_API_KEY not configured') || 
          error.message.includes('OPENAI_API_KEY not configured')) {
        return {
          openai: false,
          lovable: false,
          message: 'AI API keys not configured. Please set up your OpenAI and Lovable API keys.'
        };
      }
      
      return {
        openai: false,
        lovable: false,
        message: 'AI services are temporarily unavailable.'
      };
    }

    return {
      openai: true,
      lovable: true,
      message: 'All AI services are available.'
    };
    
  } catch (error) {
    console.error('[OpenAI] Service status check failed:', error);
    return {
      openai: false,
      lovable: false,
      message: 'Unable to check AI service status.'
    };
  }
}