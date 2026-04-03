/**
 * Modern File Explorer - Enhanced VFS UI
 * 
 * Features:
 * - Modern glassmorphism design
 * - Visual indicators for modified/AI-generated files
 * - Automatic file highlighting on changes
 * - Smooth animations
 * - Mini-map preview
 * - File type badges
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronRight, ChevronDown, File, Folder, FolderOpen, MoreVertical, 
  Search, FolderPlus, FilePlus, ChevronsUpDown, Sparkles, Circle,
  FileCode, FileJson, FileText, FileImage, FileType, Braces, RefreshCw,
  ChevronUp, Eye, Code2, Zap, Package, Settings, GitBranch
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { VirtualNode, VirtualFile, getFileIcon } from '@/hooks/useVirtualFileSystem';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ModernFileExplorerProps {
  nodes: VirtualNode[];
  activeFileId: string;
  onFileSelect: (id: string) => void;
  onCreateFile: (name: string, parentId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDuplicate: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  modifiedFiles?: Set<string>;
  aiGeneratedFiles?: Set<string>;
  recentlyChangedFiles?: Set<string>;
}

// File icon component with modern styling
const ModernFileIcon = ({ name, isAIGenerated }: { name: string; isAIGenerated?: boolean }) => {
  const iconType = getFileIcon(name);
  const iconClass = "h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110";
  
  const getIcon = () => {
    switch (iconType) {
      case 'react':
        return <FileCode className={cn(iconClass, "text-cyan-400")} />;
      case 'typescript':
        return <FileCode className={cn(iconClass, "text-blue-400")} />;
      case 'javascript':
        return <FileCode className={cn(iconClass, "text-yellow-400")} />;
      case 'css':
        return <FileType className={cn(iconClass, "text-pink-400")} />;
      case 'html':
        return <FileCode className={cn(iconClass, "text-orange-400")} />;
      case 'json':
        return <Braces className={cn(iconClass, "text-yellow-500")} />;
      case 'markdown':
        return <FileText className={cn(iconClass, "text-slate-400")} />;
      case 'image':
        return <FileImage className={cn(iconClass, "text-green-400")} />;
      default:
        return <File className={cn(iconClass, "text-muted-foreground")} />;
    }
  };

  return (
    <div className="relative">
      {getIcon()}
      {isAIGenerated && (
        <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-purple-400" />
      )}
    </div>
  );
};

// File type badge
const FileTypeBadge = ({ name }: { name: string }) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const badges: Record<string, { label: string; className: string }> = {
    'tsx': { label: 'TSX', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    'ts': { label: 'TS', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'jsx': { label: 'JSX', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    'js': { label: 'JS', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    'css': { label: 'CSS', className: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    'json': { label: 'JSON', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    'html': { label: 'HTML', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  };
  
  const badge = badges[ext];
  if (!badge) return null;
  
  return (
    <span className={cn(
      "text-[9px] font-mono px-1 py-0.5 rounded border opacity-0 group-hover:opacity-100 transition-opacity",
      badge.className
    )}>
      {badge.label}
    </span>
  );
};

export function ModernFileExplorer({
  nodes,
  activeFileId,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  onDuplicate,
  onToggleFolder,
  onExpandAll,
  onCollapseAll,
  modifiedFiles = new Set(),
  aiGeneratedFiles = new Set(),
  recentlyChangedFiles = new Set(),
}: ModernFileExplorerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createName, setCreateName] = useState('');
  const [createParentId, setCreateParentId] = useState<string | null>('src');
  const [highlightedFiles, setHighlightedFiles] = useState<Set<string>>(new Set());
  const prevNodesRef = useRef<VirtualNode[]>([]);

  // Track file changes for highlighting
  useEffect(() => {
    const currentFiles = nodes.filter(n => n.type === 'file');
    const prevFiles = prevNodesRef.current.filter(n => n.type === 'file');
    
    // Find new or modified files
    const changedIds = new Set<string>();
    currentFiles.forEach(file => {
      const prevFile = prevFiles.find(p => p.id === file.id);
      if (!prevFile) {
        changedIds.add(file.id);
      } else if (prevFile.type === 'file' && file.type === 'file') {
        if ((prevFile as VirtualFile).content !== (file as VirtualFile).content) {
          changedIds.add(file.id);
        }
      }
    });
    
    if (changedIds.size > 0) {
      setHighlightedFiles(prev => new Set([...prev, ...changedIds]));
      
      // Clear highlights after animation
      setTimeout(() => {
        setHighlightedFiles(prev => {
          const next = new Set(prev);
          changedIds.forEach(id => next.delete(id));
          return next;
        });
      }, 2000);
    }
    
    prevNodesRef.current = nodes;
  }, [nodes]);

  const handleRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingValue(currentName);
  };

  const commitRename = () => {
    if (editingId && editingValue.trim()) {
      onRename(editingId, editingValue.trim());
    }
    setEditingId(null);
  };

  const openCreateDialog = (type: 'file' | 'folder', parentId: string | null = 'src') => {
    setCreateType(type);
    setCreateParentId(parentId);
    setCreateName('');
    setShowCreateDialog(true);
  };

  const handleCreate = () => {
    if (!createName.trim()) return;
    
    if (createType === 'file') {
      onCreateFile(createName.trim(), createParentId);
    } else {
      onCreateFolder(createName.trim(), createParentId);
    }
    setShowCreateDialog(false);
    setCreateName('');
  };

  // Filter nodes based on search
  const filteredNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    const matchingIds = new Set<string>();
    
    nodes.forEach(node => {
      if (node.name.toLowerCase().includes(query)) {
        matchingIds.add(node.id);
        let parentId = node.parentId;
        while (parentId) {
          matchingIds.add(parentId);
          const parent = nodes.find(n => n.id === parentId);
          parentId = parent?.parentId || null;
        }
      }
    });
    
    return matchingIds;
  }, [searchQuery, nodes]);

  // File statistics
  const stats = useMemo(() => {
    const files = nodes.filter(n => n.type === 'file');
    const folders = nodes.filter(n => n.type === 'folder');
    return { fileCount: files.length, folderCount: folders.length };
  }, [nodes]);

  const renderNode = (node: VirtualNode, depth: number = 0): React.ReactNode => {
    if (filteredNodeIds && !filteredNodeIds.has(node.id)) return null;
    
    const isEditing = editingId === node.id;
    const isActive = node.type === 'file' && activeFileId === node.id;
    const isModified = modifiedFiles.has(node.id);
    const isAIGenerated = aiGeneratedFiles.has(node.id);
    const isHighlighted = highlightedFiles.has(node.id) || recentlyChangedFiles.has(node.id);
    const children = nodes.filter(n => n.parentId === node.id);

    return (
      <motion.div 
        key={node.id}
        initial={isHighlighted ? { backgroundColor: 'rgba(139, 92, 246, 0.3)' } : {}}
        animate={{ backgroundColor: 'transparent' }}
        transition={{ duration: 2 }}
      >
        <div
          className={cn(
            "group flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-sm transition-all duration-200",
            "hover:bg-white/5 rounded-md mx-1",
            isActive && "bg-gradient-to-r from-primary/20 to-primary/5 border-l-2 border-primary shadow-sm",
            isHighlighted && "animate-pulse bg-purple-500/20",
            isModified && !isActive && "border-l-2 border-amber-400"
          )}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {/* Folder toggle or spacer */}
          {node.type === 'folder' ? (
            <button
              onClick={() => onToggleFolder(node.id)}
              className="hover:bg-white/10 rounded p-0.5 transition-colors"
            >
              <motion.div
                animate={{ rotate: node.isOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </motion.div>
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* Icon and name */}
          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => node.type === 'file' ? onFileSelect(node.id) : onToggleFolder(node.id)}
          >
            {node.type === 'folder' ? (
              <motion.div
                animate={{ scale: node.isOpen ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {node.isOpen ? (
                  <FolderOpen className="h-4 w-4 text-amber-400 drop-shadow-sm" />
                ) : (
                  <Folder className="h-4 w-4 text-amber-400/80" />
                )}
              </motion.div>
            ) : (
              <ModernFileIcon name={node.name} isAIGenerated={isAIGenerated} />
            )}

            {isEditing ? (
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="h-6 px-1.5 text-xs bg-background/80 backdrop-blur-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={cn(
                "truncate transition-colors",
                isActive && "font-medium text-primary",
                isAIGenerated && "text-purple-300"
              )}>
                {node.name}
              </span>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-1">
            {isModified && (
              <Tooltip>
                <TooltipTrigger>
                  <Circle className="h-2 w-2 fill-amber-400 text-amber-400" />
                </TooltipTrigger>
                <TooltipContent>Modified</TooltipContent>
              </Tooltip>
            )}
            
            {node.type === 'file' && <FileTypeBadge name={node.name} />}
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-1 transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover/95 backdrop-blur-sm border-white/10">
              {node.type === 'folder' && (
                <>
                  <DropdownMenuItem onClick={() => openCreateDialog('file', node.id)}>
                    <FilePlus className="h-4 w-4 mr-2 text-cyan-400" />
                    New File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openCreateDialog('folder', node.id)}>
                    <FolderPlus className="h-4 w-4 mr-2 text-amber-400" />
                    New Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                </>
              )}
              <DropdownMenuItem onClick={() => handleRename(node.id, node.name)}>
                <Code2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(node.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={() => onDelete(node.id)}
                className="text-red-400 focus:text-red-400"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        <AnimatePresence>
          {node.type === 'folder' && (node.isOpen || filteredNodeIds) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children.map(child => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const rootNodes = nodes.filter(n => n.parentId === null);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-gradient-to-b from-slate-900/50 to-slate-950/50 backdrop-blur-sm border-r border-white/5">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Files
            </span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-white/5 text-white/50">
              {stats.fileCount}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-white/10"
                  onClick={() => openCreateDialog('file')}
                >
                  <FilePlus className="h-3.5 w-3.5 text-cyan-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New File</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-white/10"
                  onClick={() => openCreateDialog('folder')}
                >
                  <FolderPlus className="h-3.5 w-3.5 text-amber-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Folder</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/10">
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-sm">
                <DropdownMenuItem onClick={onExpandAll}>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Expand All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCollapseAll}>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Collapse All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="h-8 pl-8 text-xs bg-white/5 border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-white/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 bg-white/[0.01]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-white/10">
                <GitBranch className="h-3 w-3 mr-1" />
                main
              </Button>
            </TooltipTrigger>
            <TooltipContent>Branch</TooltipContent>
          </Tooltip>
          
          {aiGeneratedFiles.size > 0 && (
            <Badge className="h-5 px-1.5 text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              {aiGeneratedFiles.size} AI
            </Badge>
          )}
          
          {modifiedFiles.size > 0 && (
            <Badge className="h-5 px-1.5 text-[9px] bg-amber-500/20 text-amber-300 border-amber-500/30">
              <Circle className="h-2 w-2 mr-1 fill-current" />
              {modifiedFiles.size} modified
            </Badge>
          )}
        </div>

        {/* File Tree */}
        <ScrollArea className="flex-1">
          <div className="py-1">
            {rootNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Folder className="h-10 w-10 text-white/10 mb-3" />
                <p className="text-xs text-white/40 mb-2">No files yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCreateDialog('file')}
                  className="text-xs h-7 border-white/10 hover:bg-white/10"
                >
                  <FilePlus className="h-3 w-3 mr-1" />
                  Create File
                </Button>
              </div>
            ) : (
              rootNodes.map(node => renderNode(node, 0))
            )}
          </div>
        </ScrollArea>

        {/* Footer with stats */}
        <div className="px-3 py-2 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span>{stats.fileCount} files, {stats.folderCount} folders</span>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-green-400" />
              <span className="text-green-400">VFS Active</span>
            </div>
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {createType === 'file' ? (
                  <FilePlus className="h-5 w-5 text-cyan-400" />
                ) : (
                  <FolderPlus className="h-5 w-5 text-amber-400" />
                )}
                Create New {createType === 'file' ? 'File' : 'Folder'}
              </DialogTitle>
              <DialogDescription>
                {createType === 'file' 
                  ? 'Enter a filename with extension (e.g., Component.tsx)'
                  : 'Enter a folder name'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={createType === 'file' ? 'MyComponent.tsx' : 'folder-name'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                className="bg-white/5 border-white/10 focus:border-primary/50"
                autoFocus
              />
              {createType === 'file' && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {['tsx', 'ts', 'css', 'json', 'html'].map(ext => (
                    <button
                      key={ext}
                      onClick={() => setCreateName(prev => {
                        const base = prev.split('.')[0] || 'file';
                        return `${base}.${ext}`;
                      })}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 transition-colors"
                    >
                      .{ext}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setShowCreateDialog(false)}
                className="hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!createName.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default ModernFileExplorer;
