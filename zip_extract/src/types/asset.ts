/**
 * Asset Graph Types
 * Single source of truth for all uploaded/referenced assets
 */

export type AssetKind = 'image' | 'font' | 'data' | 'document';

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  mime: string;
  width?: number;
  height?: number;
  dominantColors?: string[];
  url: string;          // stable, renderable URL
  checksum: string;     // dedupe hash
  tags?: string[];      // "logo", "hero", "product", etc.
  metadata?: AssetMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface AssetMetadata {
  originalName?: string;
  fileSize?: number;
  aspectRatio?: string;
  hasTransparency?: boolean;
  format?: string;
  // For fonts
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  // For data files
  rowCount?: number;
  columns?: string[];
  // For documents
  pageCount?: number;
}

export interface AssetUploadOptions {
  file: File;
  tags?: string[];
  autoAnalyze?: boolean;
}

export interface AssetUploadResult {
  success: boolean;
  asset?: Asset;
  error?: string;
  isDuplicate?: boolean;
  existingAssetId?: string;
}

export interface AssetAnalysis {
  width?: number;
  height?: number;
  dominantColors?: string[];
  suggestedTags?: string[];
  aspectRatio?: string;
  hasTransparency?: boolean;
}

/**
 * Placement Intent - AI's structured request for asset placement
 */
export interface PlacementIntent {
  assetId: string;
  slotId: string;
  fit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'background' | 'inline';
  opacity?: number;
  filters?: AssetFilters;
}

export interface AssetFilters {
  brightness?: number;
  contrast?: number;
  saturate?: number;
  blur?: number;
  grayscale?: boolean;
}

/**
 * Asset Query Filters - for searching/filtering assets
 */
export interface AssetQueryFilters {
  ids?: string[];
  kinds?: AssetKind[];
  tags?: string[];
  search?: string;
}

/**
 * Asset Reference - used in code generation
 * AI should only reference assets via these, never hardcoded paths
 */
export interface AssetReference {
  assetId: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}
