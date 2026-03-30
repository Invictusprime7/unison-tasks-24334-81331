/**
 * Asset Registry Service
 * 
 * Persistent single source of truth for all assets.
 * Handles upload to Supabase Storage, deduplication, and metadata extraction.
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  Asset, 
  AssetKind, 
  AssetUploadOptions, 
  AssetUploadResult, 
  AssetAnalysis,
  AssetReference,
  AssetQueryFilters
} from '@/types/asset';

const ASSET_BUCKET = 'user-assets';
const ASSET_STORAGE_KEY = 'asset_registry_cache';

/**
 * Generate SHA-256 checksum for file deduplication
 */
async function generateChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Determine asset kind from MIME type
 */
function getAssetKind(mime: string): AssetKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('font/') || mime.includes('font')) return 'font';
  if (mime === 'application/json' || mime === 'text/csv' || mime.includes('spreadsheet')) return 'data';
  return 'document';
}

/**
 * Extract dominant colors from an image using canvas
 */
async function extractDominantColors(imageUrl: string, sampleCount = 5): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }

        // Sample at reduced size for performance
        const sampleSize = 50;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const pixels = imageData.data;

        // Simple color quantization
        const colorMap = new Map<string, number>();
        
        for (let i = 0; i < pixels.length; i += 16) { // Sample every 4th pixel
          const r = Math.round(pixels[i] / 32) * 32;
          const g = Math.round(pixels[i + 1] / 32) * 32;
          const b = Math.round(pixels[i + 2] / 32) * 32;
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }

        // Sort by frequency and take top colors
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, sampleCount)
          .map(([color]) => color);

        resolve(sortedColors);
      } catch {
        resolve([]);
      }
    };

    img.onerror = () => resolve([]);
    img.src = imageUrl;
  });
}

/**
 * Analyze image to extract dimensions, colors, and metadata
 */
async function analyzeImage(file: File): Promise<AssetAnalysis> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      const analysis: AssetAnalysis = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: `${img.naturalWidth}:${img.naturalHeight}`,
      };

      // Check for transparency (PNG/WebP)
      if (file.type === 'image/png' || file.type === 'image/webp') {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = Math.min(img.naturalWidth, 100);
            canvas.height = Math.min(img.naturalHeight, 100);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            analysis.hasTransparency = Array.from(imageData.data).some((_, i) => i % 4 === 3 && imageData.data[i] < 255);
          }
        } catch {
          // Ignore transparency check errors
        }
      }

      // Extract dominant colors
      analysis.dominantColors = await extractDominantColors(url);

      // Suggest tags based on dimensions and aspect ratio
      analysis.suggestedTags = [];
      const ratio = img.naturalWidth / img.naturalHeight;
      
      if (ratio > 2) analysis.suggestedTags.push('banner', 'wide');
      else if (ratio > 1.5) analysis.suggestedTags.push('landscape', 'hero');
      else if (ratio < 0.75) analysis.suggestedTags.push('portrait', 'tall');
      else if (Math.abs(ratio - 1) < 0.1) analysis.suggestedTags.push('square', 'icon', 'avatar');
      
      if (img.naturalWidth <= 64 && img.naturalHeight <= 64) analysis.suggestedTags.push('icon', 'small');
      if (img.naturalWidth >= 1920) analysis.suggestedTags.push('hd', 'large');
      if (analysis.hasTransparency) analysis.suggestedTags.push('transparent', 'logo');

      URL.revokeObjectURL(url);
      resolve(analysis);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };

    img.src = url;
  });
}

/**
 * Asset Registry - Central store for all assets
 */
export class AssetRegistry {
  private assets: Map<string, Asset> = new Map();
  private checksumIndex: Map<string, string> = new Map(); // checksum -> assetId

  constructor() {
    this.loadFromCache();
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(ASSET_STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as { assets: Asset[] };
        data.assets.forEach(asset => {
          this.assets.set(asset.id, asset);
          this.checksumIndex.set(asset.checksum, asset.id);
        });
      }
    } catch (e) {
      console.warn('Failed to load asset cache:', e);
    }
  }

  private saveToCache(): void {
    try {
      const data = { assets: Array.from(this.assets.values()) };
      localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save asset cache:', e);
    }
  }

  /**
   * Upload a file and register it as an asset
   */
  async upload(options: AssetUploadOptions): Promise<AssetUploadResult> {
    const { file, tags = [], autoAnalyze = true } = options;

    try {
      // Generate checksum for deduplication
      const checksum = await generateChecksum(file);

      // Check for duplicate
      const existingAssetId = this.checksumIndex.get(checksum);
      if (existingAssetId) {
        const existingAsset = this.assets.get(existingAssetId);
        if (existingAsset) {
          return {
            success: true,
            asset: existingAsset,
            isDuplicate: true,
            existingAssetId,
          };
        }
      }

      // Generate unique ID and path
      const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const ext = file.name.split('.').pop() || 'bin';
      const storagePath = `assets/${assetId}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(ASSET_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '31536000', // 1 year cache
          upsert: true,
        });

      if (uploadError) {
        // If bucket doesn't exist or auth issue, fall back to local data URL
        console.warn('Storage upload failed, using local URL:', uploadError.message);
        return this.createLocalAsset(assetId, file, checksum, tags, autoAnalyze);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(ASSET_BUCKET)
        .getPublicUrl(storagePath);

      const url = urlData.publicUrl;

      // Analyze if image
      let analysis: AssetAnalysis = {};
      if (autoAnalyze && file.type.startsWith('image/')) {
        analysis = await analyzeImage(file);
      }

      // Create asset record
      const asset: Asset = {
        id: assetId,
        kind: getAssetKind(file.type),
        name: file.name,
        mime: file.type,
        url,
        checksum,
        width: analysis.width,
        height: analysis.height,
        dominantColors: analysis.dominantColors,
        tags: [...tags, ...(analysis.suggestedTags || [])],
        metadata: {
          originalName: file.name,
          fileSize: file.size,
          aspectRatio: analysis.aspectRatio,
          hasTransparency: analysis.hasTransparency,
          format: ext,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Register asset
      this.assets.set(assetId, asset);
      this.checksumIndex.set(checksum, assetId);
      this.saveToCache();

      return { success: true, asset };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  /**
   * Create asset with local data URL (fallback when storage unavailable)
   */
  private async createLocalAsset(
    assetId: string,
    file: File,
    checksum: string,
    tags: string[],
    autoAnalyze: boolean
  ): Promise<AssetUploadResult> {
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    let analysis: AssetAnalysis = {};
    if (autoAnalyze && file.type.startsWith('image/')) {
      analysis = await analyzeImage(file);
    }

    const asset: Asset = {
      id: assetId,
      kind: getAssetKind(file.type),
      name: file.name,
      mime: file.type,
      url,
      checksum,
      width: analysis.width,
      height: analysis.height,
      dominantColors: analysis.dominantColors,
      tags: [...tags, ...(analysis.suggestedTags || [])],
      metadata: {
        originalName: file.name,
        fileSize: file.size,
        aspectRatio: analysis.aspectRatio,
        hasTransparency: analysis.hasTransparency,
        format: file.name.split('.').pop(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.assets.set(assetId, asset);
    this.checksumIndex.set(checksum, assetId);
    this.saveToCache();

    return { success: true, asset };
  }

  /**
   * Get asset by ID
   */
  get(assetId: string): Asset | undefined {
    return this.assets.get(assetId);
  }

  /**
   * Get asset reference for code generation
   */
  getReference(assetId: string): AssetReference | undefined {
    const asset = this.get(assetId);
    if (!asset) return undefined;

    return {
      assetId: asset.id,
      url: asset.url,
      alt: asset.name,
      width: asset.width,
      height: asset.height,
    };
  }

  /**
   * Get all assets (optionally filtered)
   */
  getAll(filters?: AssetQueryFilters): Asset[] {
    let assets = Array.from(this.assets.values());
    
    if (filters) {
      if (filters.ids && filters.ids.length > 0) {
        const idsSet = new Set(filters.ids);
        assets = assets.filter(a => idsSet.has(a.id));
      }
      if (filters.kinds && filters.kinds.length > 0) {
        const kindsSet = new Set(filters.kinds);
        assets = assets.filter(a => kindsSet.has(a.kind));
      }
      if (filters.tags && filters.tags.length > 0) {
        assets = assets.filter(a => 
          filters.tags!.some(tag => a.tags?.includes(tag))
        );
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        assets = assets.filter(a => 
          a.name.toLowerCase().includes(search) ||
          a.tags?.some(t => t.toLowerCase().includes(search))
        );
      }
    }
    
    return assets;
  }

  /**
   * Get assets by kind
   */
  getByKind(kind: AssetKind): Asset[] {
    return this.getAll().filter(a => a.kind === kind);
  }

  /**
   * Get assets by tag
   */
  getByTag(tag: string): Asset[] {
    return this.getAll().filter(a => a.tags?.includes(tag));
  }

  /**
   * Search assets by name or tags
   */
  search(query: string): Asset[] {
    const q = query.toLowerCase();
    return this.getAll().filter(a => 
      a.name.toLowerCase().includes(q) ||
      a.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  /**
   * Update asset tags
   */
  updateTags(assetId: string, tags: string[]): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;

    asset.tags = tags;
    asset.updatedAt = new Date().toISOString();
    this.saveToCache();
    return true;
  }

  /**
   * Delete asset
   */
  async delete(assetId: string): Promise<boolean> {
    const asset = this.assets.get(assetId);
    if (!asset) return false;

    // Remove from storage if it's a remote URL
    if (!asset.url.startsWith('data:')) {
      try {
        const path = asset.url.split('/').pop();
        if (path) {
          await supabase.storage.from(ASSET_BUCKET).remove([`assets/${path}`]);
        }
      } catch (e) {
        console.warn('Failed to delete from storage:', e);
      }
    }

    this.assets.delete(assetId);
    this.checksumIndex.delete(asset.checksum);
    this.saveToCache();
    return true;
  }

  /**
   * Clear all assets
   */
  clear(): void {
    this.assets.clear();
    this.checksumIndex.clear();
    localStorage.removeItem(ASSET_STORAGE_KEY);
  }

  /**
   * Export assets for serialization
   */
  export(): Asset[] {
    return this.getAll();
  }

  /**
   * Import assets from serialized data
   */
  import(assets: Asset[]): void {
    assets.forEach(asset => {
      this.assets.set(asset.id, asset);
      this.checksumIndex.set(asset.checksum, asset.id);
    });
    this.saveToCache();
  }
}

// Singleton instance
let registryInstance: AssetRegistry | null = null;

export function getAssetRegistry(): AssetRegistry {
  if (!registryInstance) {
    registryInstance = new AssetRegistry();
  }
  return registryInstance;
}

export function resetAssetRegistry(): void {
  registryInstance?.clear();
  registryInstance = null;
}
