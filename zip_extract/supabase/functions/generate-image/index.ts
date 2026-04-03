/**
 * Supabase Edge Function: Generate Image
 * Generates AI images using Lovable AI Gateway (Gemini image model)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  style?: 'digital-art' | 'realistic' | 'artistic' | 'photography' | 'illustration' | 'anime' | '3d-render' | 'logo' | 'icon';
  quality?: 'standard' | 'high' | 'ultra';
  placement?: {
    position: string; // e.g., "top-left", "center", "bottom-right"
    container?: string; // e.g., "header", "hero", "sidebar"
  };
}

interface ImageGenerationResponse {
  imageUrl: string;
  url: string;
  base64?: string;
  placement?: {
    position: string;
    css: string;
  };
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      negative_prompt,
      width = 1024,
      height = 1024,
      style = 'digital-art',
      quality = 'high',
      placement
    }: ImageGenerationRequest = await req.json();

    console.log('[Generate-Image] Request:', { prompt, style, quality, placement });

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhance prompt based on style
    const stylePrompts: Record<string, string> = {
      'digital-art': 'digital art style, vibrant colors, professional, high quality',
      'realistic': 'photorealistic, highly detailed, professional photography',
      'artistic': 'artistic painting style, creative, expressive brushstrokes',
      'photography': 'professional photography, sharp focus, perfect lighting',
      'illustration': 'illustrated style, clean lines, professional illustration',
      'anime': 'anime art style, vibrant colors, manga aesthetic',
      '3d-render': '3D rendered, CGI, professional 3D visualization',
      'logo': 'clean logo design, minimal, professional brand identity, vector style',
      'icon': 'clean icon design, simple, flat design, scalable'
    };

    // Add size context for better generation
    const aspectRatio = width > height ? 'landscape' : width < height ? 'portrait' : 'square';
    const sizeContext = `${aspectRatio} ${width}x${height} aspect ratio`;

    const enhancedPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts['digital-art']}, ${sizeContext}`;
    
    // Add negative prompt handling
    const fullPrompt = negative_prompt 
      ? `${enhancedPrompt}. Avoid: ${negative_prompt}`
      : enhancedPrompt;

    console.log('[Generate-Image] Enhanced prompt:', fullPrompt);

    // Call Lovable AI Gateway with Gemini image model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Generate-Image] Lovable AI Error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Credits required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Failed to generate image: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Generate-Image] Response received');

    // Extract image from response
    const imageData = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      throw new Error('No image generated');
    }

    // Generate placement CSS if specified
    let placementInfo = undefined;
    if (placement) {
      placementInfo = generatePlacementCSS(placement.position, placement.container);
    }

    const responseData: ImageGenerationResponse = {
      imageUrl: imageData,
      url: imageData,
      base64: imageData.startsWith('data:') ? imageData : undefined,
      placement: placementInfo
    };

    console.log('[Generate-Image] Success');

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Generate-Image] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        imageUrl: '',
        url: ''
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generatePlacementCSS(position: string, container?: string): { position: string; css: string } {
  const positionMap: Record<string, string> = {
    'top-left': 'position: absolute; top: 10px; left: 10px;',
    'top-center': 'position: absolute; top: 10px; left: 50%; transform: translateX(-50%);',
    'top-right': 'position: absolute; top: 10px; right: 10px;',
    'center-left': 'position: absolute; top: 50%; left: 10px; transform: translateY(-50%);',
    'center': 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);',
    'center-right': 'position: absolute; top: 50%; right: 10px; transform: translateY(-50%);',
    'bottom-left': 'position: absolute; bottom: 10px; left: 10px;',
    'bottom-center': 'position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);',
    'bottom-right': 'position: absolute; bottom: 10px; right: 10px;',
    'corner-left': 'position: absolute; top: 10px; left: 10px;',
    'corner-right': 'position: absolute; top: 10px; right: 10px;',
  };

  const css = positionMap[position] || positionMap['top-left'];
  
  return {
    position,
    css: css + ' max-width: 100%; cursor: move; resize: both; overflow: hidden;'
  };
}
