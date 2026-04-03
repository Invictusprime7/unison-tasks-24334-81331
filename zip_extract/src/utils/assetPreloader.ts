/**
 * Pillar 4: Asset Preloading & Fallbacks
 * Preload images and fonts before rendering to prevent loading failures
 */
export class AssetPreloader {
  private imageCache = new Map<string, HTMLImageElement>();
  private fontCache = new Set<string>();
  
  /**
   * Preload all images referenced in template
   */
  async preloadImages(imageUrls: string[], onProgress?: (loaded: number, total: number) => void): Promise<Map<string, HTMLImageElement>> {
    const results = new Map<string, HTMLImageElement>();
    let loaded = 0;
    const total = imageUrls.length;

    const promises = imageUrls.map(async (url) => {
      try {
        // Check cache first
        if (this.imageCache.has(url)) {
          results.set(url, this.imageCache.get(url)!);
          loaded++;
          onProgress?.(loaded, total);
          return;
        }

        const img = await this.loadImage(url);
        this.imageCache.set(url, img);
        results.set(url, img);
        loaded++;
        onProgress?.(loaded, total);
      } catch (error) {
        console.warn(`Failed to preload image: ${url}`, error);
        // Use placeholder for failed images
        const placeholder = this.createPlaceholder();
        results.set(url, placeholder);
        loaded++;
        onProgress?.(loaded, total);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Load a single image
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error(`Image load timeout: ${url}`));
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Create a placeholder image for failed loads
   */
  private createPlaceholder(): HTMLImageElement {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    
    // Draw placeholder
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Image unavailable', canvas.width / 2, canvas.height / 2);
    
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  /**
   * Preload fonts used in template
   */
  async preloadFonts(fontFamilies: string[]): Promise<void> {
    const uniqueFonts = [...new Set(fontFamilies)];
    
    const promises = uniqueFonts.map(async (fontFamily) => {
      if (this.fontCache.has(fontFamily)) {
        return; // Already loaded
      }

      try {
        await document.fonts.load(`16px "${fontFamily}"`);
        this.fontCache.add(fontFamily);
      } catch (error) {
        console.warn(`Failed to load font: ${fontFamily}`, error);
        // Fallback to system fonts will be handled by CSS
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Extract all asset URLs from template
   */
  extractAssetUrls(template: any): { images: string[]; fonts: string[] } {
    const images = new Set<string>();
    const fonts = new Set<string>();

    // Extract from brand kit
    if (template.brandKit?.logoUrl) {
      images.add(template.brandKit.logoUrl);
    }
    if (template.brandKit?.fonts) {
      Object.values(template.brandKit.fonts).forEach((font: any) => {
        if (typeof font === 'string') fonts.add(font);
      });
    }

    // Extract from components recursively
    const extractFromComponents = (components: any[]) => {
      if (!Array.isArray(components)) return;
      
      components.forEach((comp) => {
        // Images
        if (comp.type === 'image' && comp.dataBinding?.defaultValue) {
          images.add(comp.dataBinding.defaultValue);
        }
        if (comp.fabricProps?.src) {
          images.add(comp.fabricProps.src);
        }

        // Fonts
        if (comp.fabricProps?.fontFamily) {
          fonts.add(comp.fabricProps.fontFamily);
        }

        // Recursively check children
        if (comp.children) {
          extractFromComponents(comp.children);
        }
      });
    };

    // Extract from all sections
    if (Array.isArray(template.sections)) {
      template.sections.forEach((section: any) => {
        if (section.components) {
          extractFromComponents(section.components);
        }
      });
    }

    return {
      images: Array.from(images),
      fonts: Array.from(fonts),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.imageCache.clear();
    this.fontCache.clear();
  }
}

/**
 * Standalone function to preload assets
 */
export async function preloadAssets(urls: string[]): Promise<Array<{ url: string; status: 'loaded' | 'failed'; size?: { width: number; height: number } }>> {
  const preloader = new AssetPreloader();
  const results = await preloader.preloadImages(urls);
  
  return urls.map(url => {
    const img = results.get(url);
    if (img && img.complete && img.naturalWidth > 0) {
      return {
        url,
        status: 'loaded' as const,
        size: { width: img.naturalWidth, height: img.naturalHeight },
      };
    }
    return { url, status: 'failed' as const };
  });
}
