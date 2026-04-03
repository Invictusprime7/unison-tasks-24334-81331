import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, ChevronDown, File, Folder, FolderOpen, MoreVertical, 
  Plus, Search, FolderPlus, FilePlus, ChevronUp, ChevronsUpDown,
  FileCode, FileJson, FileText, FileImage, FileType, Braces
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { VirtualNode, getFileIcon } from '@/hooks/useVirtualFileSystem';
import { cn } from '@/lib/utils';

interface FileExplorerProps {
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
}

const FileIcon = ({ name }: { name: string }) => {
  const iconType = getFileIcon(name);
  const iconClass = "h-4 w-4 flex-shrink-0";
  
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

export function FileExplorer({
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
}: FileExplorerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createName, setCreateName] = useState('');
  const [createParentId, setCreateParentId] = useState<string | null>('src');

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
    
    // Find all matching files
    nodes.forEach(node => {
      if (node.name.toLowerCase().includes(query)) {
        matchingIds.add(node.id);
        // Add all parent folders
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

  const renderNode = (node: VirtualNode, depth: number = 0): React.ReactNode => {
    // Skip if filtered out
    if (filteredNodeIds && !filteredNodeIds.has(node.id)) return null;
    
    const isEditing = editingId === node.id;
    const isActive = node.type === 'file' && activeFileId === node.id;
    const children = nodes.filter(n => n.parentId === node.id);
    const hasChildren = children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-1 px-2 py-1.5 hover:bg-accent/50 cursor-pointer text-sm transition-colors",
            isActive && "bg-primary/10 text-primary border-l-2 border-primary"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {node.type === 'folder' ? (
            <button
              onClick={() => onToggleFolder(node.id)}
              className="hover:bg-muted rounded p-0.5 transition-colors"
            >
              {node.isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => node.type === 'file' ? onFileSelect(node.id) : onToggleFolder(node.id)}
          >
            {node.type === 'folder' ? (
              node.isOpen ? (
                <FolderOpen className="h-4 w-4 text-amber-400 flex-shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-amber-400 flex-shrink-0" />
              )
            ) : (
              <FileIcon name={node.name} />
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
                className="h-6 px-1.5 text-xs bg-background"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={cn(
                "truncate",
                isActive && "font-medium"
              )}>
                {node.name}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-1 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover">
              {node.type === 'folder' && (
                <>
                  <DropdownMenuItem onClick={() => openCreateDialog('file', node.id)}>
                    <FilePlus className="h-4 w-4 mr-2" />
                    New File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openCreateDialog('folder', node.id)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => handleRename(node.id, node.name)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(node.id)}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(node.id)}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  const path = node.type === 'file' ? (node as any).path : (node as any).path;
                  navigator.clipboard.writeText(path || node.name);
                }}
                className="text-xs text-muted-foreground"
              >
                Copy Path
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {node.type === 'folder' && (node.isOpen || filteredNodeIds) && (
          <div>
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = nodes.filter(n => n.parentId === null);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col border-r bg-card/50">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b bg-background/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Explorer
          </span>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => openCreateDialog('file')}
                >
                  <FilePlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New File</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => openCreateDialog('folder')}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Folder</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
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
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="h-7 pl-7 text-xs bg-background"
            />
          </div>
        </div>

        {/* File Tree */}
        <ScrollArea className="flex-1">
          <div className="py-1">
            {rootNodes.map(node => renderNode(node, 0))}
          </div>
        </ScrollArea>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Create New {createType === 'file' ? 'File' : 'Folder'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={createType === 'file' ? 'filename.tsx' : 'folder-name'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                autoFocus
              />
              {createType === 'file' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Use .tsx, .ts, .js, .css, .html, .json extensions
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!createName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
