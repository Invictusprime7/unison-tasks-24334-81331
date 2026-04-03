/**
 * React hook for Scene Model
 * 
 * Provides reactive access to the Scene Model Manager
 * and utilities for rendering to different targets.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SceneModelManager,
  getSceneManager,
  resetSceneManager,
} from '@/services/sceneModelManager';
import {
  RootNode,
  SceneNode,
  ScenePatch,
  SceneEvent,
  NodeId,
  NodeLayout,
  NodeStyle,
  ImageNode,
  TextNode,
  SlotNode,
  createNode,
  traverseNodes,
} from '@/types/scene';
import type { AssetReference, PlacementIntent } from '@/types/asset';
import { getAssetRegistry } from '@/services/assetRegistry';

/**
 * Hook options
 */
export interface UseSceneModelOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  autoSync?: boolean;
}

/**
 * Hook return type
 */
export interface UseSceneModelReturn {
  // Scene state
  root: RootNode;
  version: number;
  selectedNodes: SceneNode[];
  hoveredNodeId: NodeId | undefined;
  
  // Selection
  selectNodes: (nodeIds: NodeId[]) => void;
  addToSelection: (nodeId: NodeId) => void;
  clearSelection: () => void;
  setHoveredNode: (nodeId: NodeId | undefined) => void;
  
  // Node operations
  getNode: (nodeId: NodeId) => SceneNode | undefined;
  addNode: (type: SceneNode['type'], parentId: NodeId, overrides?: Partial<SceneNode>) => NodeId;
  removeNode: (nodeId: NodeId) => void;
  updateLayout: (nodeId: NodeId, layout: Partial<NodeLayout>) => void;
  updateStyle: (nodeId: NodeId, style: Partial<NodeStyle>) => void;
  
  // Asset binding
  bindAsset: (nodeId: NodeId, assetRef: AssetReference) => void;
  applyPlacementIntents: (intents: PlacementIntent[]) => void;
  
  // Text
  setText: (nodeId: NodeId, content: string) => void;
  
  // History
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  
  // Rendering
  renderToDOM: () => string;
  renderToTSX: () => string;
  
  // Serialization
  exportJSON: () => string;
  importJSON: (json: string) => void;
  reset: () => void;
  
  // Manager access
  manager: SceneModelManager;
}

/**
 * Main Scene Model hook
 */
export function useSceneModel(options: UseSceneModelOptions = {}): UseSceneModelReturn {
  const { canvasWidth = 1280, canvasHeight = 800, autoSync = true } = options;
  
  // Get or create manager
  const manager = useMemo(() => getSceneManager(canvasWidth, canvasHeight), [canvasWidth, canvasHeight]);
  const assetRegistry = useMemo(() => getAssetRegistry(), []);
  
  // Local state for reactivity
  const [root, setRoot] = useState<RootNode>(() => manager.getRoot());
  const [version, setVersion] = useState(() => manager.getVersion());
  const [selectedNodeIds, setSelectedNodeIds] = useState<NodeId[]>(() => manager.getSelectedNodeIds());
  const [hoveredNodeId, setHoveredNodeIdState] = useState<NodeId | undefined>();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Subscribe to scene events
  useEffect(() => {
    if (!autoSync) return;
    
    const unsubscribe = manager.subscribe((event: SceneEvent) => {
      switch (event.type) {
        case 'nodeSelected':
          setSelectedNodeIds(event.nodeIds);
          break;
        case 'nodeHovered':
          setHoveredNodeIdState(event.nodeId);
          break;
        case 'nodeChanged':
        case 'sceneChanged':
          setRoot({ ...manager.getRoot() }); // Shallow copy for React
          setVersion(manager.getVersion());
          break;
        case 'historyChanged':
          setCanUndo(event.canUndo);
          setCanRedo(event.canRedo);
          break;
      }
    });
    
    return unsubscribe;
  }, [manager, autoSync]);
  
  // Memoized selected nodes
  const selectedNodes = useMemo(() => {
    return selectedNodeIds
      .map(id => manager.getNode(id))
      .filter((n): n is SceneNode => n !== undefined);
  }, [manager, selectedNodeIds, version]);
  
  // Selection handlers
  const selectNodes = useCallback((nodeIds: NodeId[]) => {
    manager.selectNodes(nodeIds);
  }, [manager]);
  
  const addToSelection = useCallback((nodeId: NodeId) => {
    manager.addToSelection(nodeId);
  }, [manager]);
  
  const clearSelection = useCallback(() => {
    manager.clearSelection();
  }, [manager]);
  
  const setHoveredNode = useCallback((nodeId: NodeId | undefined) => {
    manager.setHoveredNode(nodeId);
  }, [manager]);
  
  // Node operations
  const getNode = useCallback((nodeId: NodeId) => {
    return manager.getNode(nodeId);
  }, [manager]);
  
  const addNode = useCallback((
    type: SceneNode['type'],
    parentId: NodeId,
    overrides?: Partial<SceneNode>
  ): NodeId => {
    const node = createNode(type as Exclude<SceneNode['type'], 'root'>, overrides);
    manager.addChild(parentId, node);
    return node.id;
  }, [manager]);
  
  const removeNode = useCallback((nodeId: NodeId) => {
    manager.removeNode(nodeId);
  }, [manager]);
  
  const updateLayout = useCallback((nodeId: NodeId, layout: Partial<NodeLayout>) => {
    manager.updateLayout(nodeId, layout);
  }, [manager]);
  
  const updateStyle = useCallback((nodeId: NodeId, style: Partial<NodeStyle>) => {
    manager.updateStyle(nodeId, style);
  }, [manager]);
  
  // Asset binding
  const bindAsset = useCallback((nodeId: NodeId, assetRef: AssetReference) => {
    // Resolve asset URL if not provided
    if (!assetRef.url && assetRef.assetId) {
      const asset = assetRegistry.get(assetRef.assetId);
      if (asset) {
        assetRef = { ...assetRef, url: asset.url };
      }
    }
    manager.bindAsset(nodeId, assetRef);
  }, [manager, assetRegistry]);
  
  const applyPlacementIntents = useCallback((intents: PlacementIntent[]) => {
    manager.applyPlacementIntents(intents);
  }, [manager]);
  
  // Text
  const setText = useCallback((nodeId: NodeId, content: string) => {
    manager.setText(nodeId, content);
  }, [manager]);
  
  // History
  const undo = useCallback(() => {
    manager.undo();
  }, [manager]);
  
  const redo = useCallback(() => {
    manager.redo();
  }, [manager]);
  
  // Rendering - DOM
  const renderToDOM = useCallback((): string => {
    return renderRootToHTML(root, assetRegistry);
  }, [root, assetRegistry]);
  
  // Rendering - TSX
  const renderToTSX = useCallback((): string => {
    return renderRootToTSX(root, assetRegistry);
  }, [root, assetRegistry]);
  
  // Serialization
  const exportJSON = useCallback(() => {
    return manager.toJSON();
  }, [manager]);
  
  const importJSON = useCallback((json: string) => {
    manager.fromJSON(json);
  }, [manager]);
  
  const reset = useCallback(() => {
    manager.reset(canvasWidth, canvasHeight);
  }, [manager, canvasWidth, canvasHeight]);
  
  return {
    root,
    version,
    selectedNodes,
    hoveredNodeId,
    selectNodes,
    addToSelection,
    clearSelection,
    setHoveredNode,
    getNode,
    addNode,
    removeNode,
    updateLayout,
    updateStyle,
    bindAsset,
    applyPlacementIntents,
    setText,
    canUndo,
    canRedo,
    undo,
    redo,
    renderToDOM,
    renderToTSX,
    exportJSON,
    importJSON,
    reset,
    manager,
  };
}

// ============================================
// DOM Renderer
// ============================================

function renderRootToHTML(root: RootNode, assetRegistry: ReturnType<typeof getAssetRegistry>): string {
  const { width, height, backgroundColor } = root.canvas;
  
  const childrenHTML = root.children.map(node => renderNodeToHTML(node, assetRegistry)).join('\n');
  
  return `<div class="scene-root" style="width: ${width}px; height: ${height}px; background-color: ${backgroundColor}; position: relative; overflow: hidden;">
${childrenHTML}
</div>`;
}

function renderNodeToHTML(node: SceneNode, assetRegistry: ReturnType<typeof getAssetRegistry>, indent = 2): string {
  const pad = ' '.repeat(indent);
  const style = buildStyleString(node);
  const dataAttrs = `data-node-id="${node.id}" data-node-type="${node.type}"`;
  
  switch (node.type) {
    case 'container':
    case 'frame':
    case 'group': {
      const tag = node.type === 'container' && node.tag ? node.tag : 'div';
      const children = (node.children as SceneNode[])
        .map(c => renderNodeToHTML(c, assetRegistry, indent + 2))
        .join('\n');
      return `${pad}<${tag} ${dataAttrs} style="${style}">\n${children}\n${pad}</${tag}>`;
    }
    
    case 'text': {
      return `${pad}<p ${dataAttrs} style="${style}">${escapeHTML(node.content)}</p>`;
    }
    
    case 'image': {
      const url = resolveAssetUrl(node.assetRef, assetRegistry);
      return `${pad}<img ${dataAttrs} src="${url}" alt="${node.assetRef.alt || ''}" style="${style}; object-fit: ${node.objectFit};" />`;
    }
    
    case 'video': {
      const url = resolveAssetUrl(node.assetRef, assetRegistry);
      const attrs = [
        node.autoplay ? 'autoplay' : '',
        node.loop ? 'loop' : '',
        node.muted ? 'muted' : '',
        node.controls ? 'controls' : '',
      ].filter(Boolean).join(' ');
      return `${pad}<video ${dataAttrs} src="${url}" ${attrs} style="${style}"></video>`;
    }
    
    case 'shape': {
      if (node.shapeType === 'rectangle') {
        return `${pad}<div ${dataAttrs} style="${style}; background-color: ${node.fill || 'transparent'}; border: ${node.strokeWidth || 0}px solid ${node.stroke || 'transparent'};"></div>`;
      }
      // Other shapes would need SVG
      return `${pad}<div ${dataAttrs} style="${style};"><!-- ${node.shapeType} shape --></div>`;
    }
    
    case 'slot': {
      const url = node.currentAsset ? resolveAssetUrl(node.currentAsset, assetRegistry) : '';
      if (url) {
        return `${pad}<img ${dataAttrs} data-slot-id="${node.slotId}" src="${url}" alt="" style="${style};" />`;
      }
      return `${pad}<div ${dataAttrs} data-slot-id="${node.slotId}" style="${style}; border: 2px dashed #ccc;"><!-- Slot: ${node.slotId} --></div>`;
    }
    
    case 'component': {
      return `${pad}<div ${dataAttrs} data-component="${node.componentId}" style="${style};"><!-- Component: ${node.componentId} --></div>`;
    }
    
    default:
      return `${pad}<!-- Unknown node type -->`;
  }
}

function buildStyleString(node: SceneNode): string {
  if (!('layout' in node) || !('style' in node)) {
    return '';
  }
  
  const { layout, style } = node;
  const styles: string[] = [];
  
  // Position
  styles.push(`position: absolute`);
  styles.push(`left: ${layout.x}px`);
  styles.push(`top: ${layout.y}px`);
  styles.push(`width: ${layout.width}px`);
  styles.push(`height: ${layout.height}px`);
  
  // Transform
  const transforms: string[] = [];
  if (layout.rotation) transforms.push(`rotate(${layout.rotation}deg)`);
  if (layout.scaleX !== undefined || layout.scaleY !== undefined) {
    transforms.push(`scale(${layout.scaleX ?? 1}, ${layout.scaleY ?? 1})`);
  }
  if (transforms.length) styles.push(`transform: ${transforms.join(' ')}`);
  
  // Background
  if (style.backgroundColor) styles.push(`background-color: ${style.backgroundColor}`);
  if (style.backgroundImage) styles.push(`background-image: url(${style.backgroundImage})`);
  if (style.backgroundSize) styles.push(`background-size: ${style.backgroundSize}`);
  
  // Border
  if (style.borderWidth) styles.push(`border-width: ${style.borderWidth}px`);
  if (style.borderColor) styles.push(`border-color: ${style.borderColor}`);
  if (style.borderStyle) styles.push(`border-style: ${style.borderStyle}`);
  if (style.borderRadius !== undefined) {
    const radius = Array.isArray(style.borderRadius)
      ? style.borderRadius.map(r => `${r}px`).join(' ')
      : `${style.borderRadius}px`;
    styles.push(`border-radius: ${radius}`);
  }
  
  // Effects
  if (style.opacity !== undefined) styles.push(`opacity: ${style.opacity}`);
  if (style.boxShadow) styles.push(`box-shadow: ${style.boxShadow}`);
  if (style.filter) styles.push(`filter: ${style.filter}`);
  if (style.backdropFilter) styles.push(`backdrop-filter: ${style.backdropFilter}`);
  
  // Overflow
  if (style.overflow) styles.push(`overflow: ${style.overflow}`);
  
  // Z-index
  if (style.zIndex !== undefined) styles.push(`z-index: ${style.zIndex}`);
  
  return styles.join('; ');
}

// ============================================
// TSX Renderer
// ============================================

function renderRootToTSX(root: RootNode, assetRegistry: ReturnType<typeof getAssetRegistry>): string {
  const { width, height, backgroundColor } = root.canvas;
  
  const childrenTSX = root.children.map(node => renderNodeToTSX(node, assetRegistry, 2)).join('\n');
  
  const imports = generateImports(root);
  const assetDeclarations = generateAssetDeclarations(root, assetRegistry);
  
  return `${imports}

export default function GeneratedScene() {
${assetDeclarations}
  return (
    <div className="relative overflow-hidden" style={{ width: ${width}, height: ${height}, backgroundColor: '${backgroundColor}' }}>
${childrenTSX}
    </div>
  );
}
`;
}

function renderNodeToTSX(node: SceneNode, assetRegistry: ReturnType<typeof getAssetRegistry>, indent: number): string {
  const pad = ' '.repeat(indent);
  const className = buildClassName(node);
  const styleProps = buildStyleProps(node);
  
  switch (node.type) {
    case 'container':
    case 'frame':
    case 'group': {
      const Tag = node.type === 'container' && node.tag ? node.tag : 'div';
      const children = (node.children as SceneNode[])
        .map(c => renderNodeToTSX(c, assetRegistry, indent + 2))
        .join('\n');
      return `${pad}<${Tag} className="${className}"${styleProps}>\n${children}\n${pad}</${Tag}>`;
    }
    
    case 'text': {
      return `${pad}<p className="${className}"${styleProps}>${escapeJSX(node.content)}</p>`;
    }
    
    case 'image': {
      const assetVar = node.assetRef.assetId ? `asset_${sanitizeVarName(node.assetRef.assetId)}` : `"${node.assetRef.url}"`;
      return `${pad}<img className="${className} object-${node.objectFit}"${styleProps} src={${assetVar}.url} alt="${node.assetRef.alt || ''}" />`;
    }
    
    case 'video': {
      const assetVar = node.assetRef.assetId ? `asset_${sanitizeVarName(node.assetRef.assetId)}` : `"${node.assetRef.url}"`;
      const boolProps = [
        node.autoplay ? 'autoPlay' : '',
        node.loop ? 'loop' : '',
        node.muted ? 'muted' : '',
        node.controls ? 'controls' : '',
      ].filter(Boolean).join(' ');
      return `${pad}<video className="${className}"${styleProps} src={${assetVar}.url} ${boolProps} />`;
    }
    
    case 'slot': {
      const slotIdClean = sanitizeVarName(node.slotId);
      return `${pad}<img className="${className}" data-slot="${node.slotId}" src={slots.${slotIdClean}?.url || ''} alt="" />`;
    }
    
    case 'shape': {
      if (node.shapeType === 'rectangle') {
        return `${pad}<div className="${className}"${styleProps} style={{ backgroundColor: '${node.fill || 'transparent'}' }} />`;
      }
      return `${pad}{/* ${node.shapeType} shape */}`;
    }
    
    case 'component': {
      const ComponentName = toPascalCase(node.componentId);
      const propsStr = Object.entries(node.props)
        .map(([k, v]) => `${k}={${JSON.stringify(v)}}`)
        .join(' ');
      return `${pad}<${ComponentName} ${propsStr} />`;
    }
    
    default:
      return `${pad}{/* Unknown node */}`;
  }
}

function buildClassName(node: SceneNode): string {
  const classes: string[] = ['absolute'];
  
  if ('style' in node && node.style) {
    if (node.style.overflow === 'hidden') classes.push('overflow-hidden');
  }
  
  return classes.join(' ');
}

function buildStyleProps(node: SceneNode): string {
  if (!('layout' in node)) return '';
  
  const { layout, style } = node as { layout: NodeLayout; style: NodeStyle };
  const styleObj: Record<string, string | number> = {
    left: layout.x,
    top: layout.y,
    width: layout.width,
    height: layout.height,
  };
  
  if (layout.rotation) styleObj.transform = `rotate(${layout.rotation}deg)`;
  if (style?.opacity !== undefined && style.opacity !== 1) styleObj.opacity = style.opacity;
  if (style?.borderRadius) styleObj.borderRadius = style.borderRadius as number;
  
  return ` style={${JSON.stringify(styleObj)}}`;
}

function generateImports(root: RootNode): string {
  const imports: string[] = [];
  imports.push("import { useAssetRegistry } from '@/hooks/useAssetRegistry';");
  
  // Check for components
  const components = new Set<string>();
  traverseNodes(root, (node) => {
    if (node.type === 'component') {
      components.add((node as { componentId: string }).componentId);
    }
  });
  
  components.forEach(comp => {
    imports.push(`import { ${toPascalCase(comp)} } from '@/components/${comp}';`);
  });
  
  return imports.join('\n');
}

function generateAssetDeclarations(root: RootNode, assetRegistry: ReturnType<typeof getAssetRegistry>): string {
  const assetIds = new Set<string>();
  
  traverseNodes(root, (node) => {
    if (node.type === 'image' || node.type === 'video') {
      const assetRef = (node as ImageNode).assetRef;
      if (assetRef.assetId) {
        assetIds.add(assetRef.assetId);
      }
    }
  });
  
  if (assetIds.size === 0) return '';
  
  const declarations: string[] = ['  const { getAsset } = useAssetRegistry();'];
  assetIds.forEach(id => {
    const varName = `asset_${sanitizeVarName(id)}`;
    declarations.push(`  const ${varName} = getAsset('${id}');`);
  });
  
  return declarations.join('\n');
}

// ============================================
// Utility Functions
// ============================================

function resolveAssetUrl(assetRef: AssetReference, assetRegistry: ReturnType<typeof getAssetRegistry>): string {
  if (assetRef.url) return assetRef.url;
  if (assetRef.assetId) {
    const asset = assetRegistry.get(assetRef.assetId);
    return asset?.url || '';
  }
  return '';
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeJSX(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;');
}

function sanitizeVarName(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '_');
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}
