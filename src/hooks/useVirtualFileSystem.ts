import { useState, useCallback, useMemo } from 'react';

export interface VirtualFile {
  id: string;
  name: string;
  content: string;
  type: 'file';
  language: string;
  parentId: string | null;
  path?: string;
  readOnly?: boolean;
}

export interface VirtualFolder {
  id: string;
  name: string;
  type: 'folder';
  parentId: string | null;
  isOpen?: boolean;
  path?: string;
}

export type VirtualNode = VirtualFile | VirtualFolder;

// Minimal empty structure - just the essential folders
// Files are added only when templates are loaded or AI generates code
const EMPTY_PROJECT_STRUCTURE: VirtualNode[] = [
  { id: 'src', name: 'src', type: 'folder', parentId: null, isOpen: true, path: '/src' },
];

// DEFAULT_PROJECT_STRUCTURE has been permanently removed.
// All templates MUST come from the Launcher industry theme pipeline.
// The VFS initializes with EMPTY_PROJECT_STRUCTURE only.

export function getLanguageFromFileName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'typescript';
    case 'jsx':
    case 'js':
      return 'javascript';
    case 'css':
    case 'scss':
    case 'sass':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return 'react';
    case 'ts':
      return 'typescript';
    case 'js':
      return 'javascript';
    case 'css':
    case 'scss':
    case 'sass':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'svg':
      return 'svg';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return 'image';
    default:
      return 'file';
  }
}

// Convert VFS to Sandpack files format
export function vfsToSandpackFiles(nodes: VirtualNode[]): Record<string, string> {
  const files: Record<string, string> = {};
  
  nodes.forEach(node => {
    if (node.type === 'file' && 'content' in node && node.path) {
      // Sandpack expects paths without leading slash for some files
      files[node.path] = node.content;
    }
  });
  
  return files;
}

/**
 * FileMap type: The standard format for VFS snapshots
 * Key = path (e.g., "/src/App.tsx")
 * Value = file content
 */
export type FileMap = Record<string, string>;

/**
 * Convert VFS nodes to FileMap snapshot for preview sessions
 * Filters to files only (excludes folders), maps path → content
 */
export function vfsToFileMap(nodes: VirtualNode[]): FileMap {
  const fileMap: FileMap = {};
  
  nodes.forEach(node => {
    if (node.type === 'file' && 'content' in node) {
      const file = node as VirtualFile;
      const path = file.path || `/${file.name}`;
      fileMap[path] = file.content;
    }
  });
  
  return fileMap;
}

/**
 * Get all file paths in the VFS
 */
export function getFilePaths(nodes: VirtualNode[]): string[] {
  return nodes
    .filter((node): node is VirtualFile => node.type === 'file' && 'content' in node)
    .map(file => file.path || `/${file.name}`)
    .sort();
}

export function useVirtualFileSystem() {
  // Start with empty structure - files added via templates/AI
  const [nodes, setNodes] = useState<VirtualNode[]>(EMPTY_PROJECT_STRUCTURE);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [openTabs, setOpenTabs] = useState<string[]>([]);

  const getNodePath = useCallback((nodeId: string, currentNodes: VirtualNode[]): string => {
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) return '';
    
    if (!node.parentId) return `/${node.name}`;
    
    const parentPath = getNodePath(node.parentId, currentNodes);
    return `${parentPath}/${node.name}`;
  }, []);

  const createFile = useCallback((name: string, parentId: string | null = 'src') => {
    const id = `file-${Date.now()}`;
    const language = getLanguageFromFileName(name);
    
    // Get default content based on file type
    const getDefaultContent = (fileName: string): string => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'tsx':
          const componentName = fileName.replace(/\.\w+$/, '').replace(/[^a-zA-Z]/g, '');
          return `import React from 'react';

interface ${componentName}Props {
  // Add your props here
}

export function ${componentName}({ }: ${componentName}Props) {
  return (
    <div>
      <h1>${componentName}</h1>
    </div>
  );
}

export default ${componentName};`;
        case 'ts':
          return `// ${fileName}\n\nexport {};\n`;
        case 'css':
          return `/* ${fileName} */\n\n`;
        case 'json':
          return '{\n  \n}\n';
        default:
          return '';
      }
    };
    
    setNodes(prev => {
      const path = parentId ? `${getNodePath(parentId, prev)}/${name}` : `/${name}`;
      const newFile: VirtualFile = {
        id,
        name,
        content: getDefaultContent(name),
        type: 'file',
        language,
        parentId,
        path,
      };
      return [...prev, newFile];
    });
    
    setActiveFileId(id);
    setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]);
    return id;
  }, [getNodePath]);

  const createFolder = useCallback((name: string, parentId: string | null = 'src') => {
    const id = `folder-${Date.now()}`;
    
    setNodes(prev => {
      const path = parentId ? `${getNodePath(parentId, prev)}/${name}` : `/${name}`;
      const newFolder: VirtualFolder = {
        id,
        name,
        type: 'folder',
        parentId,
        isOpen: true,
        path,
      };
      return [...prev, newFolder];
    });
    return id;
  }, [getNodePath]);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => {
      // Check if node is read-only
      const node = prev.find(n => n.id === id);
      if (node?.type === 'file' && (node as VirtualFile).readOnly) {
        console.warn('Cannot delete read-only file:', node.name);
        return prev;
      }
      
      const toDelete = new Set<string>([id]);
      const findChildren = (parentId: string) => {
        prev.forEach(node => {
          if (node.parentId === parentId) {
            toDelete.add(node.id);
            if (node.type === 'folder') {
              findChildren(node.id);
            }
          }
        });
      };
      findChildren(id);
      
      // Update open tabs
      setOpenTabs(tabs => tabs.filter(tabId => !toDelete.has(tabId)));
      
      // Update active file
      if (toDelete.has(activeFileId)) {
        const remainingFiles = prev.filter(n => n.type === 'file' && !toDelete.has(n.id));
        setActiveFileId(remainingFiles[0]?.id || '');
      }
      
      return prev.filter(n => !toDelete.has(n.id));
    });
  }, [activeFileId]);

  const renameNode = useCallback((id: string, newName: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        // Check if node is read-only
        if (node.type === 'file' && (node as VirtualFile).readOnly) {
          console.warn('Cannot rename read-only file:', node.name);
          return node;
        }
        
        const newPath = node.parentId 
          ? `${getNodePath(node.parentId, prev)}/${newName}`
          : `/${newName}`;
        
        if (node.type === 'file') {
          return { 
            ...node, 
            name: newName, 
            path: newPath,
            language: getLanguageFromFileName(newName)
          };
        }
        return { ...node, name: newName, path: newPath };
      }
      return node;
    }));
  }, [getNodePath]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    const newId = `${node.type}-${Date.now()}`;
    const nameMatch = node.name.match(/^(.+?)( \((\d+)\))?(\.[^.]+)?$/);
    const baseName = nameMatch?.[1] || node.name;
    const extension = nameMatch?.[4] || '';
    const newName = `${baseName} (copy)${extension}`;

    if (node.type === 'file') {
      const newFile: VirtualFile = {
        ...node,
        id: newId,
        name: newName,
        path: node.parentId ? `${getNodePath(node.parentId, nodes)}/${newName}` : `/${newName}`,
        readOnly: false, // Duplicated files are never read-only
      };
      setNodes(prev => [...prev, newFile]);
      setActiveFileId(newId);
      setOpenTabs(prev => [...prev, newId]);
    } else {
      const newFolder: VirtualFolder = {
        ...node,
        id: newId,
        name: newName,
        path: node.parentId ? `${getNodePath(node.parentId, nodes)}/${newName}` : `/${newName}`,
      };
      setNodes(prev => [...prev, newFolder]);
    }
  }, [nodes, getNodePath]);

  const moveNode = useCallback((nodeId: string, newParentId: string | null) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        const newPath = newParentId 
          ? `${getNodePath(newParentId, prev)}/${node.name}`
          : `/${node.name}`;
        return { ...node, parentId: newParentId, path: newPath };
      }
      return node;
    }));
  }, [getNodePath]);

  const updateFileContent = useCallback((id: string, content: string) => {
    setNodes(prev => prev.map(node =>
      node.id === id && node.type === 'file' ? { ...node, content } : node
    ));
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setNodes(prev => prev.map(node =>
      node.id === id && node.type === 'folder' 
        ? { ...node, isOpen: !node.isOpen } 
        : node
    ));
  }, []);

  const expandAll = useCallback(() => {
    setNodes(prev => prev.map(node =>
      node.type === 'folder' ? { ...node, isOpen: true } : node
    ));
  }, []);

  const collapseAll = useCallback(() => {
    setNodes(prev => prev.map(node =>
      node.type === 'folder' ? { ...node, isOpen: false } : node
    ));
  }, []);

  const getActiveFile = useCallback(() => {
    return nodes.find(n => n.id === activeFileId && n.type === 'file') as VirtualFile | undefined;
  }, [nodes, activeFileId]);

  const openFile = useCallback((id: string) => {
    const file = nodes.find(n => n.id === id && n.type === 'file');
    if (file) {
      setActiveFileId(id);
      setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]);
    }
  }, [nodes]);

  const closeTab = useCallback((id: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(tabId => tabId !== id);
      if (activeFileId === id && newTabs.length > 0) {
        setActiveFileId(newTabs[newTabs.length - 1]);
      } else if (newTabs.length === 0) {
        setActiveFileId('');
      }
      return newTabs;
    });
  }, [activeFileId]);

  const getOpenFiles = useCallback(() => {
    return openTabs
      .map(id => nodes.find(n => n.id === id && n.type === 'file') as VirtualFile)
      .filter(Boolean);
  }, [openTabs, nodes]);

  // Get all files for Sandpack
  const getSandpackFiles = useCallback(() => {
    return vfsToSandpackFiles(nodes);
  }, [nodes]);

  // Import files from external source (e.g., AI-generated code)
  const importFiles = useCallback((files: Record<string, string>) => {
    console.log('[VFS] importFiles called with:', Object.keys(files));
    setNodes(prev => {
      let changed = false;
      const newNodes = [...prev];
      
      Object.entries(files).forEach(([path, content]) => {
        // Normalize path
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        console.log('[VFS] Processing file:', normalizedPath, 'content length:', content.length);
        
        // Check if file already exists
        const existingFile = newNodes.find(n => n.type === 'file' && n.path === normalizedPath);
        if (existingFile) {
          // Skip update if content is identical
          if ((existingFile as VirtualFile).content === content) {
            return;
          }
          // Update existing file
          changed = true;
          const idx = newNodes.indexOf(existingFile);
          newNodes[idx] = { ...existingFile, content } as VirtualFile;
        } else {
          // Create new file and any missing parent folders
          changed = true;
          const pathParts = normalizedPath.split('/').filter(Boolean);
          const fileName = pathParts.pop()!;
          
          let currentParentId: string | null = null;
          let currentPath = '';
          
          // Create parent folders if they don't exist
          pathParts.forEach((folderName) => {
            currentPath += `/${folderName}`;
            const existingFolder = newNodes.find(n => n.type === 'folder' && n.path === currentPath);
            
            if (!existingFolder) {
              const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              newNodes.push({
                id: folderId,
                name: folderName,
                type: 'folder',
                parentId: currentParentId,
                isOpen: true,
                path: currentPath,
              });
              currentParentId = folderId;
            } else {
              currentParentId = existingFolder.id;
            }
          });
          
          // Create the file
          const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          newNodes.push({
            id: fileId,
            name: fileName,
            content,
            type: 'file',
            language: getLanguageFromFileName(fileName),
            parentId: currentParentId,
            path: normalizedPath,
          });
        }
      });
      
      // Return previous array if nothing actually changed (prevents unnecessary re-renders)
      if (!changed) return prev;
      
      console.log('[VFS] After import, total nodes:', newNodes.length, 'files:', newNodes.filter(n => n.type === 'file').length);
      return newNodes;
    });
  }, []);

  // Sort nodes: folders first, then files, alphabetically
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [nodes]);

  // File statistics
  const stats = useMemo(() => {
    const files = nodes.filter(n => n.type === 'file');
    const folders = nodes.filter(n => n.type === 'folder');
    return {
      totalFiles: files.length,
      totalFolders: folders.length,
      byLanguage: files.reduce((acc, file) => {
        const lang = (file as VirtualFile).language || 'unknown';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [nodes]);

  // Reset to empty structure
  const resetToEmpty = useCallback(() => {
    setNodes(EMPTY_PROJECT_STRUCTURE);
    setActiveFileId('');
    setOpenTabs([]);
  }, []);

  // Load the full default React project template
  // NOTE: This now loads the same empty structure — Launcher pipeline is the only way to load a template.
  const loadDefaultTemplate = useCallback(() => {
    console.warn('[VFS] loadDefaultTemplate is deprecated — use Launcher industry pipeline instead.');
    setNodes(EMPTY_PROJECT_STRUCTURE);
    setActiveFileId('');
    setOpenTabs([]);
  }, []);

  // Check if VFS has any user files (not just folders)
  const hasFiles = useMemo(() => {
    return nodes.some(n => n.type === 'file');
  }, [nodes]);

  return useMemo(() => ({
    nodes: sortedNodes,
    activeFileId,
    openTabs,
    stats,
    hasFiles,
    setActiveFileId,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    duplicateNode,
    moveNode,
    updateFileContent,
    toggleFolder,
    expandAll,
    collapseAll,
    getActiveFile,
    openFile,
    closeTab,
    getOpenFiles,
    getNodePath,
    getSandpackFiles,
    importFiles,
    resetToEmpty,
    loadDefaultTemplate,
  }), [
    sortedNodes,
    activeFileId,
    openTabs,
    stats,
    hasFiles,
    setActiveFileId,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    duplicateNode,
    moveNode,
    updateFileContent,
    toggleFolder,
    expandAll,
    collapseAll,
    getActiveFile,
    openFile,
    closeTab,
    getOpenFiles,
    getNodePath,
    getSandpackFiles,
    importFiles,
    resetToEmpty,
    loadDefaultTemplate,
  ]);
}
