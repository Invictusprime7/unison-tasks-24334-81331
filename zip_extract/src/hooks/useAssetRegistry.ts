/**
 * useAssetRegistry Hook
 * 
 * React hook for managing assets with upload, analysis, and retrieval.
 * Provides a reactive interface to the AssetRegistry service.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { getAssetRegistry, AssetRegistry } from '@/services/assetRegistry';
import type { 
  Asset, 
  AssetKind, 
  AssetUploadResult, 
  AssetReference,
  PlacementIntent 
} from '@/types/asset';
import { toast } from 'sonner';

interface UseAssetRegistryOptions {
  autoSync?: boolean;
}

interface UseAssetRegistryReturn {
  // State
  assets: Asset[];
  loading: boolean;
  
  // Actions
  uploadAsset: (file: File, tags?: string[]) => Promise<AssetUploadResult>;
  uploadAssets: (files: File[], tags?: string[]) => Promise<AssetUploadResult[]>;
  getAsset: (assetId: string) => Asset | undefined;
  getAssetRef: (assetId: string) => AssetReference | undefined;
  getAssetsByKind: (kind: AssetKind) => Asset[];
  getAssetsByTag: (tag: string) => Asset[];
  searchAssets: (query: string) => Asset[];
  updateAssetTags: (assetId: string, tags: string[]) => void;
  deleteAsset: (assetId: string) => Promise<void>;
  
  // AI Integration
  getAssetsForAI: () => AssetContextForAI;
  applyPlacements: (placements: PlacementIntent[]) => PlacementResult[];
  
  // Registry access
  registry: AssetRegistry;
}

/**
 * Asset context formatted for AI prompts
 */
export interface AssetContextForAI {
  summary: string;
  assets: Array<{
    id: string;
    name: string;
    kind: AssetKind;
    tags: string[];
    dimensions?: string;
    colors?: string[];
  }>;
  availableForPlacement: string[];
}

interface PlacementResult {
  assetId: string;
  slotId: string;
  success: boolean;
  cssClasses?: string[];
  error?: string;
}

export function useAssetRegistry(options: UseAssetRegistryOptions = {}): UseAssetRegistryReturn {
  const { autoSync = true } = options;
  const registry = useMemo(() => getAssetRegistry(), []);
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync state with registry
  const syncAssets = useCallback(() => {
    setAssets(registry.getAll());
  }, [registry]);

  // Initial load and optional auto-sync
  useEffect(() => {
    syncAssets();
    
    if (autoSync) {
      // Listen for storage changes (cross-tab sync)
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'asset_registry_cache') {
          syncAssets();
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, [syncAssets, autoSync]);

  /**
   * Upload a single file as an asset
   */
  const uploadAsset = useCallback(async (file: File, tags?: string[]): Promise<AssetUploadResult> => {
    setLoading(true);
    try {
      const result = await registry.upload({ file, tags, autoAnalyze: true });
      
      if (result.success && result.asset) {
        syncAssets();
        
        if (result.isDuplicate) {
          toast.info('Asset already exists', {
            description: `"${file.name}" was found in your library`,
          });
        } else {
          toast.success('Asset uploaded', {
            description: `"${result.asset.name}" added with ${result.asset.tags?.length || 0} auto-tags`,
          });
        }
      } else if (result.error) {
        toast.error('Upload failed', { description: result.error });
      }
      
      return result;
    } finally {
      setLoading(false);
    }
  }, [registry, syncAssets]);

  /**
   * Upload multiple files
   */
  const uploadAssets = useCallback(async (files: File[], tags?: string[]): Promise<AssetUploadResult[]> => {
    setLoading(true);
    try {
      const results = await Promise.all(
        files.map(file => registry.upload({ file, tags, autoAnalyze: true }))
      );
      
      syncAssets();
      
      const successful = results.filter(r => r.success).length;
      const duplicates = results.filter(r => r.isDuplicate).length;
      
      if (successful > 0) {
        toast.success(`${successful} asset${successful > 1 ? 's' : ''} uploaded`, {
          description: duplicates > 0 ? `(${duplicates} already existed)` : undefined,
        });
      }
      
      return results;
    } finally {
      setLoading(false);
    }
  }, [registry, syncAssets]);

  /**
   * Get asset by ID
   */
  const getAsset = useCallback((assetId: string): Asset | undefined => {
    return registry.get(assetId);
  }, [registry]);

  /**
   * Get asset reference for code generation
   */
  const getAssetRef = useCallback((assetId: string): AssetReference | undefined => {
    return registry.getReference(assetId);
  }, [registry]);

  /**
   * Get assets by kind
   */
  const getAssetsByKind = useCallback((kind: AssetKind): Asset[] => {
    return registry.getByKind(kind);
  }, [registry]);

  /**
   * Get assets by tag
   */
  const getAssetsByTag = useCallback((tag: string): Asset[] => {
    return registry.getByTag(tag);
  }, [registry]);

  /**
   * Search assets
   */
  const searchAssets = useCallback((query: string): Asset[] => {
    return registry.search(query);
  }, [registry]);

  /**
   * Update asset tags
   */
  const updateAssetTags = useCallback((assetId: string, tags: string[]): void => {
    if (registry.updateTags(assetId, tags)) {
      syncAssets();
      toast.success('Tags updated');
    }
  }, [registry, syncAssets]);

  /**
   * Delete asset
   */
  const deleteAsset = useCallback(async (assetId: string): Promise<void> => {
    const asset = registry.get(assetId);
    if (await registry.delete(assetId)) {
      syncAssets();
      toast.success('Asset deleted', {
        description: asset?.name,
      });
    }
  }, [registry, syncAssets]);

  /**
   * Get assets context formatted for AI prompts
   */
  const getAssetsForAI = useCallback((): AssetContextForAI => {
    const allAssets = registry.getAll();
    const images = allAssets.filter(a => a.kind === 'image');
    
    const assetList = allAssets.map(a => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      tags: a.tags || [],
      dimensions: a.width && a.height ? `${a.width}x${a.height}` : undefined,
      colors: a.dominantColors,
    }));

    const summary = `
📦 AVAILABLE ASSETS:
Total: ${allAssets.length} assets
Images: ${images.length}

${assetList.map(a => `• ${a.id}: "${a.name}" [${a.kind}] ${a.dimensions || ''} tags: ${a.tags.join(', ') || 'none'}`).join('\n')}

IMPORTANT: When placing images, use assetId references like:
- assets.get("${images[0]?.id || 'asset_xxx'}").url
- Never use hardcoded paths like "./image.png"
`.trim();

    return {
      summary,
      assets: assetList,
      availableForPlacement: images.map(a => a.id),
    };
  }, [registry]);

  /**
   * Apply AI placement intents to generate CSS/placement data
   */
  const applyPlacements = useCallback((placements: PlacementIntent[]): PlacementResult[] => {
    return placements.map(placement => {
      const asset = registry.get(placement.assetId);
      
      if (!asset) {
        return {
          assetId: placement.assetId,
          slotId: placement.slotId,
          success: false,
          error: `Asset ${placement.assetId} not found`,
        };
      }

      // Generate CSS classes based on fit and position
      const cssClasses: string[] = [];
      
      switch (placement.fit) {
        case 'cover':
          cssClasses.push('object-cover', 'w-full', 'h-full');
          break;
        case 'contain':
          cssClasses.push('object-contain', 'w-full', 'h-full');
          break;
        case 'fill':
          cssClasses.push('object-fill', 'w-full', 'h-full');
          break;
        case 'scale-down':
          cssClasses.push('object-scale-down', 'max-w-full', 'max-h-full');
          break;
        default:
          cssClasses.push('object-none');
      }

      switch (placement.position) {
        case 'top':
          cssClasses.push('object-top');
          break;
        case 'bottom':
          cssClasses.push('object-bottom');
          break;
        case 'left':
          cssClasses.push('object-left');
          break;
        case 'right':
          cssClasses.push('object-right');
          break;
        default:
          cssClasses.push('object-center');
      }

      if (placement.opacity !== undefined && placement.opacity < 1) {
        cssClasses.push(`opacity-${Math.round(placement.opacity * 100)}`);
      }

      return {
        assetId: placement.assetId,
        slotId: placement.slotId,
        success: true,
        cssClasses,
      };
    });
  }, [registry]);

  return {
    assets,
    loading,
    uploadAsset,
    uploadAssets,
    getAsset,
    getAssetRef,
    getAssetsByKind,
    getAssetsByTag,
    searchAssets,
    updateAssetTags,
    deleteAsset,
    getAssetsForAI,
    applyPlacements,
    registry,
  };
}
