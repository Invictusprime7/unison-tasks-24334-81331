/**
 * Scene Model Types
 * 
 * Unified Scene Graph for rendering to multiple targets:
 * - DOM Preview
 * - Fabric.js Canvas
 * - CodeMirror (TSX/HTML)
 * 
 * The Scene Model is the single source of truth for the visual state.
 * All renderers subscribe to it and produce their own output format.
 */

import type { Asset, AssetReference, PlacementIntent } from './asset';

/**
 * Unique identifier for scene nodes
 */
export type NodeId = string;

/**
 * Base scene node interface
 */
export interface SceneNodeBase {
  id: NodeId;
  type: SceneNodeType;
  name?: string;
  visible: boolean;
  locked: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * All possible scene node types
 */
export type SceneNodeType =
  | 'root'
  | 'frame'
  | 'container'
  | 'text'
  | 'image'
  | 'video'
  | 'shape'
  | 'component'
  | 'slot'
  | 'group';

/**
 * Scene node with positioning
 */
export interface PositionedNode extends SceneNodeBase {
  layout: NodeLayout;
  style: NodeStyle;
}

/**
 * Layout properties for a node
 */
export interface NodeLayout {
  // Position
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Rotation & Scale
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  
  // Anchor point (0-1)
  originX?: number;
  originY?: number;
  
  // Flexbox-like layout
  display?: 'block' | 'flex' | 'grid' | 'inline' | 'inline-block';
  flexDirection?: 'row' | 'column';
  justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around';
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number;
  
  // Padding & Margin
  padding?: [number, number, number, number];
  margin?: [number, number, number, number];
  
  // Constraints
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Style properties for a node
 */
export interface NodeStyle {
  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  
  // Border
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number | [number, number, number, number];
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  
  // Effects
  opacity?: number;
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  
  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  
  // Z-index for stacking
  zIndex?: number;
}

/**
 * Root scene node - the top level container
 */
export interface RootNode extends SceneNodeBase {
  type: 'root';
  children: SceneNode[];
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };
}

/**
 * Frame node - a bounded area (like an artboard)
 */
export interface FrameNode extends PositionedNode {
  type: 'frame';
  children: SceneNode[];
  clipContent: boolean;
}

/**
 * Container node - a div-like grouping
 */
export interface ContainerNode extends PositionedNode {
  type: 'container';
  children: SceneNode[];
  tag?: 'div' | 'section' | 'article' | 'header' | 'footer' | 'main' | 'nav';
}

/**
 * Text node
 */
export interface TextNode extends PositionedNode {
  type: 'text';
  content: string;
  textStyle: TextStyle;
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number | string;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  color?: string;
}

/**
 * Image node - references an asset
 */
export interface ImageNode extends PositionedNode {
  type: 'image';
  assetRef: AssetReference;
  objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
}

/**
 * Video node
 */
export interface VideoNode extends PositionedNode {
  type: 'video';
  assetRef: AssetReference;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls: boolean;
  poster?: string;
}

/**
 * Shape node - basic shapes
 */
export interface ShapeNode extends PositionedNode {
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse' | 'line' | 'polygon' | 'path';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  path?: string; // SVG path data for 'path' type
  points?: [number, number][]; // For polygon
}

/**
 * Component node - a reusable component instance
 */
export interface ComponentNode extends PositionedNode {
  type: 'component';
  componentId: string;
  props: Record<string, unknown>;
  children?: SceneNode[];
}

/**
 * Slot node - a placeholder for dynamic content
 */
export interface SlotNode extends PositionedNode {
  type: 'slot';
  slotId: string;
  slotType: string;
  currentAsset?: AssetReference;
  placementIntent?: PlacementIntent;
}

/**
 * Group node - a logical grouping of nodes
 */
export interface GroupNode extends PositionedNode {
  type: 'group';
  children: SceneNode[];
}

/**
 * Union of all scene node types
 */
export type SceneNode =
  | RootNode
  | FrameNode
  | ContainerNode
  | TextNode
  | ImageNode
  | VideoNode
  | ShapeNode
  | ComponentNode
  | SlotNode
  | GroupNode;

/**
 * Scene Patch - atomic change to the scene
 */
export type ScenePatch =
  | SetPropertyPatch
  | SetStylePatch
  | SetLayoutPatch
  | AddNodePatch
  | RemoveNodePatch
  | MoveNodePatch
  | ReplaceNodePatch
  | BindAssetPatch
  | SetTextPatch
  | BatchPatch;

interface PatchBase {
  type: string;
  nodeId: NodeId;
  timestamp?: number;
}

export interface SetPropertyPatch extends PatchBase {
  type: 'setProperty';
  property: string;
  value: unknown;
}

export interface SetStylePatch extends PatchBase {
  type: 'setStyle';
  styleUpdates: Partial<NodeStyle>;
}

export interface SetLayoutPatch extends PatchBase {
  type: 'setLayout';
  layoutUpdates: Partial<NodeLayout>;
}

export interface AddNodePatch extends PatchBase {
  type: 'addNode';
  parentId: NodeId;
  node: SceneNode;
  index?: number;
}

export interface RemoveNodePatch extends PatchBase {
  type: 'removeNode';
  // nodeId from base is the node to remove
}

export interface MoveNodePatch extends PatchBase {
  type: 'moveNode';
  newParentId: NodeId;
  newIndex: number;
}

export interface ReplaceNodePatch extends PatchBase {
  type: 'replaceNode';
  newNode: SceneNode;
}

export interface BindAssetPatch extends PatchBase {
  type: 'bindAsset';
  assetRef: AssetReference;
  slotId?: string;
}

export interface SetTextPatch extends PatchBase {
  type: 'setText';
  content: string;
}

export interface BatchPatch {
  type: 'batch';
  nodeId: 'root';
  patches: ScenePatch[];
}

/**
 * Scene Model state
 */
export interface SceneState {
  root: RootNode;
  selectedNodeIds: NodeId[];
  hoveredNodeId?: NodeId;
  version: number;
  history: ScenePatch[][];
  historyIndex: number;
}

/**
 * Renderer output types
 */
export interface DOMRenderOutput {
  html: string;
  styles: string;
}

export interface FabricRenderOutput {
  objects: unknown[]; // fabric.Object[] when fabric.js is available
}

export interface CodeRenderOutput {
  tsx: string;
  css?: string;
}

/**
 * Renderer interface - implemented by DOM, Fabric, and Code renderers
 */
export interface SceneRenderer<T> {
  readonly name: string;
  render(scene: RootNode): T;
  applyPatch(scene: RootNode, patch: ScenePatch): T;
}

/**
 * Scene model event types
 */
export type SceneEvent =
  | { type: 'nodeSelected'; nodeIds: NodeId[] }
  | { type: 'nodeHovered'; nodeId: NodeId | undefined }
  | { type: 'nodeChanged'; nodeId: NodeId; patch: ScenePatch }
  | { type: 'sceneChanged'; patches: ScenePatch[] }
  | { type: 'assetBound'; nodeId: NodeId; assetRef: AssetReference }
  | { type: 'historyChanged'; canUndo: boolean; canRedo: boolean };

/**
 * Scene event listener
 */
export type SceneEventListener = (event: SceneEvent) => void;

/**
 * Create default root node
 */
export function createDefaultRoot(width = 1280, height = 800): RootNode {
  return {
    id: 'root',
    type: 'root',
    visible: true,
    locked: false,
    children: [],
    canvas: {
      width,
      height,
      backgroundColor: '#ffffff',
    },
  };
}

/**
 * Create a new node with defaults
 */
export function createNode(
  type: Exclude<SceneNodeType, 'root'>,
  overrides: Partial<SceneNode> = {}
): SceneNode {
  const id = overrides.id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const baseLayout: NodeLayout = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };

  const baseStyle: NodeStyle = {
    opacity: 1,
  };

  const base = {
    id,
    visible: true,
    locked: false,
    layout: baseLayout,
    style: baseStyle,
    ...overrides,
  };

  switch (type) {
    case 'frame':
      return {
        ...base,
        type: 'frame',
        children: [],
        clipContent: true,
      } as FrameNode;
      
    case 'container':
      return {
        ...base,
        type: 'container',
        children: [],
        tag: 'div',
      } as ContainerNode;
      
    case 'text':
      return {
        ...base,
        type: 'text',
        content: 'Text',
        textStyle: {
          fontSize: 16,
          fontFamily: 'Inter, sans-serif',
          color: '#000000',
        },
      } as TextNode;
      
    case 'image':
      return {
        ...base,
        type: 'image',
        assetRef: { assetId: '', url: '' },
        objectFit: 'cover',
      } as ImageNode;
      
    case 'video':
      return {
        ...base,
        type: 'video',
        assetRef: { assetId: '', url: '' },
        autoplay: true,
        loop: true,
        muted: true,
        controls: false,
      } as VideoNode;
      
    case 'shape':
      return {
        ...base,
        type: 'shape',
        shapeType: 'rectangle',
        fill: '#cccccc',
      } as ShapeNode;
      
    case 'component':
      return {
        ...base,
        type: 'component',
        componentId: '',
        props: {},
      } as ComponentNode;
      
    case 'slot':
      return {
        ...base,
        type: 'slot',
        slotId: '',
        slotType: 'generic',
      } as SlotNode;
      
    case 'group':
      return {
        ...base,
        type: 'group',
        children: [],
      } as GroupNode;
      
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}

/**
 * Check if a node has children
 */
export function hasChildren(node: SceneNode): node is SceneNode & { children: SceneNode[] } {
  return 'children' in node && Array.isArray((node as { children?: unknown }).children);
}

/**
 * Get node by ID from scene tree
 */
export function findNode(root: RootNode, nodeId: NodeId): SceneNode | undefined {
  if (root.id === nodeId) return root;
  
  function search(nodes: SceneNode[]): SceneNode | undefined {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (hasChildren(node)) {
        const found = search(node.children);
        if (found) return found;
      }
    }
    return undefined;
  }
  
  return search(root.children);
}

/**
 * Get parent of a node
 */
export function findParent(root: RootNode, nodeId: NodeId): SceneNode | undefined {
  function search(parent: SceneNode, nodes: SceneNode[]): SceneNode | undefined {
    for (const node of nodes) {
      if (node.id === nodeId) return parent;
      if (hasChildren(node)) {
        const found = search(node, node.children);
        if (found) return found;
      }
    }
    return undefined;
  }
  
  return search(root, root.children);
}

/**
 * Traverse all nodes in the scene
 */
export function traverseNodes(root: RootNode, callback: (node: SceneNode, depth: number) => void): void {
  function traverse(nodes: SceneNode[], depth: number): void {
    for (const node of nodes) {
      callback(node, depth);
      if (hasChildren(node)) {
        traverse(node.children, depth + 1);
      }
    }
  }
  
  callback(root, 0);
  traverse(root.children, 1);
}
