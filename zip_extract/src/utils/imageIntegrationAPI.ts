/**
 * Image Integration API for AI Assistant
 * Handles live image sources with proper error handling and canvas integration
 * Supports Unsplash, Picsum, and other reliable image services
 */
// ...existing code...
/**
 * Image Integration API for AI Assistant
 * Handles live image sources with proper error handling and canvas integration
 * Supports Unsplash, Picsum, and other reliable image services
 */

import { FabricImage } from 'fabric';

export interface ImageConfig {
  width?: number;
  height?: number;
  category?: string;
  quality?: number;
  seed?: string;
  author?: string;
  blur?: number;
  grayscale?: boolean;
}

export interface ImageSource {
  id: string;
  name: string;
  baseUrl: string;
  supportsCategories: boolean;
  supportsCustomSize: boolean;
  defaultParams: Record<string, string | number | boolean>;
}

/**
 * Available image sources for AI assistant
 */
export const IMAGE_SOURCES: Record<string, ImageSource> = {
  unsplash: {
    id: 'unsplash',
    name: 'Unsplash',
    baseUrl: 'https://images.unsplash.com',
    supportsCategories: true,
    supportsCustomSize: true,
    defaultParams: { w: 800, h: 600, q: 80, fit: 'crop' }
  },
  picsum: {
    id: 'picsum',
    name: 'Lorem Picsum',
    baseUrl: 'https://picsum.photos',
    supportsCategories: false,
    supportsCustomSize: true,
    defaultParams: {}
  },
  placeholder: {
    id: 'placeholder',
    name: 'Placeholder.co',
    baseUrl: 'https://placehold.co',
    supportsCategories: false,
    supportsCustomSize: true,
    defaultParams: { format: 'webp' }
  }
};

/**
 * Popular image categories for Unsplash
 */
export const IMAGE_CATEGORIES = {
  nature: ['landscape', 'forest', 'ocean', 'mountain', 'sunset', 'flowers'],
  business: ['office', 'meeting', 'handshake', 'laptop', 'team', 'conference'],
  technology: ['computer', 'phone', 'code', 'ai', 'robot', 'datacenter'],
  people: ['portrait', 'team', 'diverse', 'professional', 'group', 'person'],
  food: ['restaurant', 'cooking', 'healthy', 'coffee', 'meal', 'kitchen'],
  travel: ['city', 'airport', 'hotel', 'vacation', 'adventure', 'culture'],
  abstract: ['pattern', 'texture', 'geometric', 'minimal', 'color', 'art'],
  architecture: ['building', 'modern', 'interior', 'exterior', 'design', 'structure']
};

/**
 * Generate image URL from Unsplash
 */
export function generateUnsplashUrl(config: ImageConfig & { query?: string; photoId?: string }): string {
  const { width = 800, height = 600, quality = 80, query, photoId } = config;
  const baseUrl = IMAGE_SOURCES.unsplash.baseUrl;
  
  if (photoId) {
    // Specific photo by ID
    return `${baseUrl}/photo-${photoId}?w=${width}&h=${height}&q=${quality}&fit=crop`;
  }
  
  if (query) {
    // Search-based URL (using photo IDs for consistency)
    const photoIds = getPhotoIdsByCategory(query);
    const randomId = photoIds[Math.floor(Math.random() * photoIds.length)];
    return `${baseUrl}/photo-${randomId}?w=${width}&h=${height}&q=${quality}&fit=crop`;
  }
  
  // Random photo
  return `${baseUrl}/photo-1441974231531-c6227db76b6e?w=${width}&h=${height}&q=${quality}&fit=crop`;
}

/**
 * Generate image URL from Lorem Picsum
 */
export function generatePicsumUrl(config: ImageConfig & { seed?: string; blur?: number; grayscale?: boolean }): string {
  const { width = 800, height = 600, seed, blur, grayscale } = config;
  const baseUrl = IMAGE_SOURCES.picsum.baseUrl;
  
  let url = `${baseUrl}/${width}/${height}`;
  
  if (seed) {
    url += `?random=${seed}`;
  }
  
  const params = new URLSearchParams();
  if (blur && blur > 0) params.append('blur', blur.toString());
  if (grayscale) params.append('grayscale', '');
  
  if (params.toString()) {
    url += (url.includes('?') ? '&' : '?') + params.toString();
  }
  
  return url;
}

/**
 * Generate placeholder image URL
 */
export function generatePlaceholderUrl(config: ImageConfig & { text?: string; bgColor?: string; textColor?: string }): string {
  const { width = 800, height = 600, text, bgColor = '6366f1', textColor = 'ffffff' } = config;
  const baseUrl = IMAGE_SOURCES.placeholder.baseUrl;
  
  let url = `${baseUrl}/${width}x${height}/${bgColor}/${textColor}`;
  
  if (text) {
    url += `?text=${encodeURIComponent(text)}`;
  }
  
  return url;
}

/**
 * Smart image URL generation based on context
 */
export function generateSmartImageUrl(
  description: string,
  config: ImageConfig = {},
  preferredSource: keyof typeof IMAGE_SOURCES = 'unsplash'
): string {
  const { width = 800, height = 600 } = config;
  
  // Extract category from description
  const category = extractCategoryFromDescription(description);
  
  switch (preferredSource) {
    case 'unsplash':
      return generateUnsplashUrl({
        ...config,
        query: category || description
      });
    
    case 'picsum':
      return generatePicsumUrl({
        ...config,
        seed: hashStringToNumber(description).toString()
      });
    
    case 'placeholder':
      return generatePlaceholderUrl({
        ...config,
        text: description.slice(0, 20)
      });
    
    default:
      return generateUnsplashUrl({ ...config, query: category || description });
  }
}

/**
 * Load image with error handling and retry logic
 */
export async function loadImageWithFallback(
  description: string,
  config: ImageConfig = {},
  canvas?: unknown
): Promise<FabricImage> {
  const sources: (keyof typeof IMAGE_SOURCES)[] = ['unsplash', 'picsum', 'placeholder'];
  
  for (const source of sources) {
    try {
      const url = generateSmartImageUrl(description, config, source);
      console.log(`[ImageAPI] Attempting to load image from ${source}:`, url);
      
      const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
      
      // Apply any additional configurations
      if (config.quality && config.quality < 100) {
        // Quality is handled in URL generation
      }
      
      console.log(`[ImageAPI] Successfully loaded image from ${source}`);
      return img;
      
    } catch (error) {
      console.warn(`[ImageAPI] Failed to load from ${source}:`, error);
      
      // If this is the last source, throw the error
      if (source === sources[sources.length - 1]) {
        throw new Error(`Failed to load image for: ${description}`);
      }
    }
  }
  
  throw new Error('All image sources failed');
}

/**
 * Extract category from description using keywords
 */
function extractCategoryFromDescription(description: string): string | null {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(IMAGE_CATEGORIES)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return keyword;
      }
    }
  }
  
  // Try to match category names directly
  for (const category of Object.keys(IMAGE_CATEGORIES)) {
    if (lowerDesc.includes(category)) {
      return category;
    }
  }
  
  return null;
}

/**
 * Get photo IDs by category for consistent results
 */
function getPhotoIdsByCategory(category: string): string[] {
  const photoIdMaps: Record<string, string[]> = {
    landscape: ['1441974231531-c6227db76b6e', '1506905925346-21bda4d32df4', '1469474968028-56623f02e42e'],
    forest: ['1441974231531-c6227db76b6e', '1518837695005-2083093ee35b', '1448375240586-882707db888b'],
    ocean: ['1505142468610-359e7d316be0', '1544551763-46a013bb70d5', '1439066615861-d267077b32d0'],
    mountain: ['1506905925346-21bda4d32df4', '1464822759444-d93c0c3c9b74', '1485827404815-00316f580f24'],
    office: ['1497366216548-37526070297c', '1497366811353-6870744d04b2', '1556155092-8707de31f9c4'],
    meeting: ['1552664730-d307ca04331b', '1559136555-9303baea8ebd', '1517245386807-bb43f82c33c4'],
    computer: ['1518756131217-31b517e25e32', '1461749280684-dccba630e2f6', '1487017159068-eaec41579157'],
    phone: ['1511707171634-5f897ff02aa9', '1467949576168-6ce8e2df4e13', '1512941937669-90a1b58e7e9c'],
    portrait: ['1507003211169-0a1dd7ef0fd8', '1494790108755-2616b169ad47', '1438761681033-6461ffad8d80'],
    team: ['1522202176988-66273c2fd55f', '1517048676732-d65dc8cc572f', '1556155092-8707de31f9c4'],
    city: ['1449824904737-e11f87acfe86', '1477959858617-67f85cf4f1df', '1514565131-fce6d2d65e11'],
    building: ['1486406146494-f7ef3a19553a', '1497366216548-37526070297c', '1449824904737-e11f87acfe86']
  };
  
  return photoIdMaps[category] || photoIdMaps.landscape;
}

/**
 * Hash string to number for consistent seeding
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Validate image URL accessibility
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get image dimensions from URL
 */
export async function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension detection'));
    };
    
    img.src = url;
  });
}

/**
 * Generate responsive image URLs for different screen sizes
 */
export function generateResponsiveImageUrls(
  description: string,
  baseConfig: ImageConfig = {}
): Record<string, string> {
  const breakpoints = {
    mobile: { width: 400, height: 300 },
    tablet: { width: 768, height: 576 },
    desktop: { width: 1200, height: 800 },
    large: { width: 1920, height: 1080 }
  };
  
  const urls: Record<string, string> = {};
  
  for (const [breakpoint, dimensions] of Object.entries(breakpoints)) {
    urls[breakpoint] = generateSmartImageUrl(description, {
      ...baseConfig,
      ...dimensions
    });
  }
  
  return urls;
}