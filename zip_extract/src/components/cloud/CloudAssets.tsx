/**
 * CLOUD ASSETS - Immersive file and media asset management
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Image, Upload, Folder, File, Trash2, Download, Copy, 
  Search, Grid, List, MoreVertical, X, Check, Loader2,
  CloudUpload, FileImage, FileVideo, FileText, Music,
  HardDrive, Filter, SortAsc, Eye, Link2, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CloudAssetsProps {
  userId: string;
  businessId?: string; // Required for proper scoping
  projectId?: string; // Optional - if provided, assets are project-specific
  onAssetSelect?: (asset: Asset) => void; // For image picker integration
  mode?: 'manage' | 'picker'; // picker mode for WebBuilder integration
}

interface Asset {
  id: string;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  url?: string;
  public_url?: string; // Stable URL for published sites (not signed)
  created_at: string;
  folder?: string;
  business_id?: string;
  project_id?: string;
  is_public?: boolean;
}

const STORAGE_BUCKET = 'project-assets';

function getFileIcon(mimeType: string) {
  if (mimeType?.startsWith('image/')) return FileImage;
  if (mimeType?.startsWith('video/')) return FileVideo;
  if (mimeType?.startsWith('audio/')) return Music;
  if (mimeType?.includes('pdf') || mimeType?.includes('document')) return FileText;
  return File;
}

function getFileColor(mimeType: string) {
  if (mimeType?.startsWith('image/')) return 'text-pink-400 bg-pink-500/20';
  if (mimeType?.startsWith('video/')) return 'text-purple-400 bg-purple-500/20';
  if (mimeType?.startsWith('audio/')) return 'text-orange-400 bg-orange-500/20';
  if (mimeType?.includes('pdf')) return 'text-red-400 bg-red-500/20';
  return 'text-slate-400 bg-slate-500/20';
}

export function CloudAssets({ 
  userId, 
  businessId, 
  projectId, 
  onAssetSelect,
  mode = 'manage' 
}: CloudAssetsProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadAssets();
    }
  }, [userId, businessId, projectId]); // Reload when scope changes

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesUpload(Array.from(files));
    }
  }, []);

  const loadAssets = async () => {
    try {
      // Build query based on scope
      // Priority: project_id > business_id > user_id (for backwards compatibility)
      let query = supabase
        .from('project_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        // Most specific: assets for a specific project
        query = query.eq('project_id', projectId);
      } else if (businessId) {
        // Business-wide assets (shared across projects)
        query = query.eq('business_id', businessId);
      } else {
        // Fallback for legacy: user-owned assets
        query = query.eq('user_id', userId);
      }

      const { data: dbAssets, error: dbError } = await query;

      if (!dbError && dbAssets) {
        const assetsWithUrls = await Promise.all(
          dbAssets.map(async (asset) => {
            // Use public_url if asset is marked public, otherwise generate signed URL
            if (asset.is_public && asset.public_url) {
              return {
                ...asset,
                url: asset.public_url,
              };
            }
            const { data } = await supabase.storage
              .from(STORAGE_BUCKET)
              .createSignedUrl(asset.path, 3600);
            return {
              ...asset,
              url: data?.signedUrl,
            };
          })
        );
        setAssets(assetsWithUrls);
      } else {
        // Fallback to storage listing for backwards compatibility
        const storagePath = businessId && projectId 
          ? `${businessId}/${projectId}`
          : businessId 
            ? businessId
            : userId;

        const { data: storageFiles, error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list(storagePath, { limit: 100 });

        if (!storageError && storageFiles) {
          const assetsFromStorage = await Promise.all(
            storageFiles
              .filter(f => f.name !== '.emptyFolderPlaceholder')
              .map(async (file) => {
                const path = `${storagePath}/${file.name}`;
                const { data } = await supabase.storage
                  .from(STORAGE_BUCKET)
                  .createSignedUrl(path, 3600);
                return {
                  id: file.id || file.name,
                  name: file.name,
                  path,
                  size: file.metadata?.size || 0,
                  mime_type: file.metadata?.mimetype || 'application/octet-stream',
                  url: data?.signedUrl,
                  created_at: file.created_at || new Date().toISOString(),
                  business_id: businessId,
                  project_id: projectId,
                };
              })
          );
          setAssets(assetsFromStorage);
        } else {
          setAssets([]);
        }
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleFilesUpload(Array.from(files));
  };

  const handleFilesUpload = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);
    const uploadedAssets: Asset[] = [];
    const totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i) / totalFiles) * 100));
        
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        // Use business/project scoped path for proper organization
        // This enables CDN-friendly stable URLs for published sites
        const storagePath = businessId && projectId
          ? `${businessId}/${projectId}/${fileName}`
          : businessId
            ? `${businessId}/${fileName}`
            : `${userId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: 'Upload failed',
            description: `Failed to upload ${file.name}: ${uploadError.message}`,
            variant: 'destructive',
          });
          continue;
        }

        const { data: urlData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(storagePath, 3600);

        // Generate a stable public URL for CDN access (used for published sites)
        // This avoids the expiring signed URL problem
        const publicUrl = businessId && projectId
          ? `${STORAGE_BUCKET}/${businessId}/${projectId}/${fileName}`
          : `${STORAGE_BUCKET}/${userId}/${fileName}`;

        const { data: assetData, error: assetError } = await supabase
          .from('project_assets')
          .insert({
            user_id: userId,
            business_id: businessId || null, // CRITICAL: Include business_id
            project_id: projectId || null, // CRITICAL: Include project_id
            name: file.name,
            path: storagePath, // Use the scoped storage path
            size: file.size,
            mime_type: file.type,
            public_url: publicUrl, // Store stable URL for published sites
            is_public: false, // Private by default, set to true on publish
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!assetError && assetData) {
          uploadedAssets.push({
            ...assetData,
            url: urlData?.signedUrl,
          });
        } else {
          uploadedAssets.push({
            id: uploadData.path,
            name: file.name,
            path: storagePath,
            size: file.size,
            mime_type: file.type,
            url: urlData?.signedUrl,
            created_at: new Date().toISOString(),
            business_id: businessId,
            project_id: projectId,
          });
        }
      }

      setAssets([...uploadedAssets, ...assets]);
      toast({
        title: 'Upload complete',
        description: `${uploadedAssets.length} file(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error('Error uploading:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload files.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteAsset = async (asset: Asset) => {
    if (!confirm(`Delete "${asset.name}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([asset.path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      await supabase
        .from('project_assets')
        .delete()
        .eq('id', asset.id);

      setAssets(assets.filter(a => a.id !== asset.id));
      toast({
        title: 'Asset deleted',
        description: `${asset.name} has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete asset.',
        variant: 'destructive',
      });
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Copied',
        description: 'URL copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy URL.',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (mimeType: string) => mimeType?.startsWith('image/');

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSize = assets.reduce((sum, asset) => sum + (asset.size || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={dropZoneRef}
      className="space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-dashed border-blue-500/50">
            <CloudUpload className="h-16 w-16 text-blue-400 mx-auto mb-4 animate-bounce" />
            <p className="text-xl font-semibold text-white text-center">Drop files to upload</p>
            <p className="text-slate-400 text-center mt-2">Images, videos, PDFs, and documents</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-white/[0.02] to-transparent border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <HardDrive className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
            <p className="text-xs text-slate-500">Storage used</p>
          </div>
        </div>
        <div className="h-8 w-px bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Folder className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{assets.length}</p>
            <p className="text-xs text-slate-500">Total files</p>
          </div>
        </div>
        <div className="flex-1" />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx"
          className="hidden"
        />
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={uploading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {uploadProgress}%
            </>
          ) : (
            <>
              <CloudUpload className="h-4 w-4 mr-2" />
              Upload Files
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-white/[0.03] border-white/5 focus:border-blue-500/50 rounded-xl h-11"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={cn(
              "rounded-lg",
              viewMode === 'grid' && "bg-white/10"
            )}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('list')}
            className={cn(
              "rounded-lg",
              viewMode === 'list' && "bg-white/10"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <div className="relative rounded-2xl border-2 border-dashed border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
          <div className="relative text-center py-20 px-4">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-700/50 border border-white/10">
                <CloudUpload className="h-12 w-12 text-blue-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">
              {searchQuery ? 'No assets found' : 'Your asset library is empty'}
            </h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : 'Drag and drop files here, or click to browse. Supports images, videos, PDFs, and documents.'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upload Your First Asset
              </Button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => {
            const FileIcon = getFileIcon(asset.mime_type);
            const fileColor = getFileColor(asset.mime_type);
            
            return (
              <div 
                key={asset.id} 
                className="group relative rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
              >
                <div className="aspect-square relative bg-gradient-to-br from-slate-800/50 to-slate-900/50">
                  {isImage(asset.mime_type) && asset.url ? (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className={cn("p-4 rounded-xl", fileColor)}>
                        <FileIcon className="h-8 w-8" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end pb-4 gap-2">
                    <div className="flex items-center gap-2">
                      {asset.url && (
                        <Button size="sm" variant="secondary" onClick={() => copyUrl(asset.url!)} className="h-8 w-8 p-0" title="Copy URL">
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                      {asset.url && (
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0" asChild title="Preview">
                          <a href={asset.url} target="_blank" rel="noopener">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {asset.url && (
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0" asChild title="Download">
                          <a href={asset.url} download={asset.name}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => deleteAsset(asset)}
                        className="h-8 w-8 p-0"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate text-white" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(asset.size)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5">
            {filteredAssets.map((asset) => {
              const FileIcon = getFileIcon(asset.mime_type);
              const fileColor = getFileColor(asset.mime_type);
              
              return (
                <div
                  key={asset.id}
                  className="group flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-700/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {isImage(asset.mime_type) && asset.url ? (
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={cn("p-2 rounded-lg", fileColor)}>
                        <FileIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-white">{asset.name}</p>
                    <p className="text-sm text-slate-500">
                      {formatFileSize(asset.size)} · {new Date(asset.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                      {asset.url && (
                        <DropdownMenuItem onClick={() => copyUrl(asset.url!)}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Copy URL
                        </DropdownMenuItem>
                      )}
                      {asset.url && (
                        <DropdownMenuItem asChild>
                          <a href={asset.url} target="_blank" rel="noopener">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </a>
                        </DropdownMenuItem>
                      )}
                      {asset.url && (
                        <DropdownMenuItem asChild>
                          <a href={asset.url} download={asset.name} target="_blank" rel="noopener">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem 
                        onClick={() => deleteAsset(asset)}
                        className="text-red-400 focus:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
