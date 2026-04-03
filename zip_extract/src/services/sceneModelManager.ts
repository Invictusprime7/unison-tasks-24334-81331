/**
 * Scene Model Manager
 * 
 * Central orchestrator for the unified scene graph.
 * Manages state, applies patches, coordinates renderers,
 * and maintains history for undo/redo.
 * 
 * Key principle: All visual state changes go through this manager.
 * Renderers subscribe to changes and produce their output format.
 */

import {
  RootNode,
  SceneNode,
  ScenePatch,
  SceneState,
  SceneEvent,
  SceneEventListener,
  NodeId,
  NodeLayout,
  NodeStyle,
  ImageNode,
  TextNode,
  SlotNode,
  createDefaultRoot,
  findNode,
  findParent,
  hasChildren,
  traverseNodes,
} from '@/types/scene';
import type { AssetReference, PlacementIntent } from '@/types/asset';

const MAX_HISTORY_SIZE = 100;

/**
 * Scene Model Manager - single source of truth for visual state
 */
export class SceneModelManager {
  private state: SceneState;
  private listeners: Set<SceneEventListener> = new Set();
  private transactionPatches: ScenePatch[] = [];
  private inTransaction = false;

  constructor(width = 1280, height = 800) {
    this.state = {
      root: createDefaultRoot(width, height),
      selectedNodeIds: [],
      hoveredNodeId: undefined,
      version: 0,
      history: [],
      historyIndex: -1,
    };
  }

  // ============================================
  // State Access
  // ============================================

  /**
   * Get the current scene root
   */
  getRoot(): RootNode {
    return this.state.root;
  }

  /**
   * Get a node by ID
   */
  getNode(nodeId: NodeId): SceneNode | undefined {
    return findNode(this.state.root, nodeId);
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType<T extends SceneNode>(type: T['type']): T[] {
    const nodes: T[] = [];
    traverseNodes(this.state.root, (node) => {
      if (node.type === type) {
        nodes.push(node as T);
      }
    });
    return nodes;
  }

  /**
   * Get selected node IDs
   */
  getSelectedNodeIds(): NodeId[] {
    return [...this.state.selectedNodeIds];
  }

  /**
   * Get selected nodes
   */
  getSelectedNodes(): SceneNode[] {
    return this.state.selectedNodeIds
      .map(id => this.getNode(id))
      .filter((n): n is SceneNode => n !== undefined);
  }

  /**
   * Get scene version
   */
  getVersion(): number {
    return this.state.version;
  }

  // ============================================
  // Selection
  // ============================================

  /**
   * Select nodes
   */
  selectNodes(nodeIds: NodeId[]): void {
    this.state.selectedNodeIds = nodeIds;
    this.emit({ type: 'nodeSelected', nodeIds });
  }

  /**
   * Add to selection
   */
  addToSelection(nodeId: NodeId): void {
    if (!this.state.selectedNodeIds.includes(nodeId)) {
      this.state.selectedNodeIds.push(nodeId);
      this.emit({ type: 'nodeSelected', nodeIds: this.state.selectedNodeIds });
    }
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    if (this.state.selectedNodeIds.length > 0) {
      this.state.selectedNodeIds = [];
      this.emit({ type: 'nodeSelected', nodeIds: [] });
    }
  }

  /**
   * Set hovered node
   */
  setHoveredNode(nodeId: NodeId | undefined): void {
    if (this.state.hoveredNodeId !== nodeId) {
      this.state.hoveredNodeId = nodeId;
      this.emit({ type: 'nodeHovered', nodeId });
    }
  }

  // ============================================
  // Patch Application
  // ============================================

  /**
   * Apply a single patch
   */
  applyPatch(patch: ScenePatch): void {
    if (this.inTransaction) {
      this.transactionPatches.push(patch);
      this.applyPatchInternal(patch);
    } else {
      this.applyPatchInternal(patch);
      this.addToHistory([patch]);
      this.state.version++;
      this.emit({ type: 'nodeChanged', nodeId: patch.nodeId, patch });
    }
  }

  /**
   * Apply multiple patches as a transaction
   */
  applyPatches(patches: ScenePatch[]): void {
    this.beginTransaction();
    try {
      patches.forEach(p => this.applyPatch(p));
    } finally {
      this.commitTransaction();
    }
  }

  /**
   * Begin a transaction (groups patches for undo)
   */
  beginTransaction(): void {
    this.inTransaction = true;
    this.transactionPatches = [];
  }

  /**
   * Commit transaction
   */
  commitTransaction(): void {
    if (this.inTransaction && this.transactionPatches.length > 0) {
      this.addToHistory(this.transactionPatches);
      this.state.version++;
      this.emit({ type: 'sceneChanged', patches: this.transactionPatches });
    }
    this.inTransaction = false;
    this.transactionPatches = [];
  }

  /**
   * Rollback transaction
   */
  rollbackTransaction(): void {
    // Undo applied patches in reverse order
    [...this.transactionPatches].reverse().forEach(patch => {
      // Apply inverse patch
      this.applyInversePatch(patch);
    });
    this.inTransaction = false;
    this.transactionPatches = [];
  }

  /**
   * Internal patch application
   */
  private applyPatchInternal(patch: ScenePatch): void {
    const node = this.getNode(patch.nodeId);
    if (!node && patch.type !== 'addNode' && patch.type !== 'batch') {
      console.warn(`Node ${patch.nodeId} not found for patch`, patch);
      return;
    }

    switch (patch.type) {
      case 'setProperty':
        this.applySetProperty(node!, patch.property, patch.value);
        break;

      case 'setStyle':
        this.applySetStyle(node!, patch.styleUpdates);
        break;

      case 'setLayout':
        this.applySetLayout(node!, patch.layoutUpdates);
        break;

      case 'addNode':
        this.applyAddNode(patch.parentId, patch.node, patch.index);
        break;

      case 'removeNode':
        this.applyRemoveNode(patch.nodeId);
        break;

      case 'moveNode':
        this.applyMoveNode(patch.nodeId, patch.newParentId, patch.newIndex);
        break;

      case 'replaceNode':
        this.applyReplaceNode(patch.nodeId, patch.newNode);
        break;

      case 'bindAsset':
        this.applyBindAsset(node!, patch.assetRef, patch.slotId);
        break;

      case 'setText':
        this.applySetText(node as TextNode, patch.content);
        break;

      case 'batch':
        patch.patches.forEach(p => this.applyPatchInternal(p));
        break;
    }
  }

  private applySetProperty(node: SceneNode, property: string, value: unknown): void {
    (node as unknown as Record<string, unknown>)[property] = value;
  }

  private applySetStyle(node: SceneNode, updates: Partial<NodeStyle>): void {
    if ('style' in node) {
      node.style = { ...node.style, ...updates };
    }
  }

  private applySetLayout(node: SceneNode, updates: Partial<NodeLayout>): void {
    if ('layout' in node) {
      node.layout = { ...node.layout, ...updates };
    }
  }

  private applyAddNode(parentId: NodeId, node: SceneNode, index?: number): void {
    const parent = this.getNode(parentId);
    if (parent && hasChildren(parent)) {
      if (index !== undefined) {
        parent.children.splice(index, 0, node);
      } else {
        parent.children.push(node);
      }
    }
  }

  private applyRemoveNode(nodeId: NodeId): void {
    const parent = findParent(this.state.root, nodeId);
    if (parent && hasChildren(parent)) {
      const index = parent.children.findIndex(c => c.id === nodeId);
      if (index !== -1) {
        parent.children.splice(index, 1);
      }
    }
  }

  private applyMoveNode(nodeId: NodeId, newParentId: NodeId, newIndex: number): void {
    const node = this.getNode(nodeId);
    if (!node) return;

    // Remove from current parent
    this.applyRemoveNode(nodeId);

    // Add to new parent
    this.applyAddNode(newParentId, node, newIndex);
  }

  private applyReplaceNode(nodeId: NodeId, newNode: SceneNode): void {
    const parent = findParent(this.state.root, nodeId);
    if (parent && hasChildren(parent)) {
      const index = parent.children.findIndex(c => c.id === nodeId);
      if (index !== -1) {
        parent.children[index] = newNode;
      }
    }
  }

  private applyBindAsset(node: SceneNode, assetRef: AssetReference, slotId?: string): void {
    if (node.type === 'image') {
      (node as ImageNode).assetRef = assetRef;
    } else if (node.type === 'slot') {
      (node as SlotNode).currentAsset = assetRef;
    }
    this.emit({ type: 'assetBound', nodeId: node.id, assetRef });
  }

  private applySetText(node: TextNode, content: string): void {
    if (node.type === 'text') {
      node.content = content;
    }
  }

  private applyInversePatch(patch: ScenePatch): void {
    // Simplified inverse - in production, store old values with each patch
    switch (patch.type) {
      case 'addNode':
        this.applyRemoveNode(patch.node.id);
        break;
      case 'removeNode':
        // Would need to store the removed node
        console.warn('Cannot inverse removeNode without stored node');
        break;
      // Other cases would need stored old values
    }
  }

  // ============================================
  // History (Undo/Redo)
  // ============================================

  private addToHistory(patches: ScenePatch[]): void {
    // Remove future history if we're not at the end
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    }

    this.state.history.push(patches);
    this.state.historyIndex = this.state.history.length - 1;

    // Limit history size
    if (this.state.history.length > MAX_HISTORY_SIZE) {
      this.state.history.shift();
      this.state.historyIndex--;
    }

    this.emit({
      type: 'historyChanged',
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  canUndo(): boolean {
    return this.state.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.state.historyIndex < this.state.history.length - 1;
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    const patches = this.state.history[this.state.historyIndex];
    [...patches].reverse().forEach(p => this.applyInversePatch(p));
    this.state.historyIndex--;
    this.state.version++;

    this.emit({
      type: 'historyChanged',
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.state.historyIndex++;
    const patches = this.state.history[this.state.historyIndex];
    patches.forEach(p => this.applyPatchInternal(p));
    this.state.version++;

    this.emit({
      type: 'historyChanged',
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
    return true;
  }

  // ============================================
  // Convenience Methods
  // ============================================

  /**
   * Update node layout
   */
  updateLayout(nodeId: NodeId, layout: Partial<NodeLayout>): void {
    this.applyPatch({
      type: 'setLayout',
      nodeId,
      layoutUpdates: layout,
    });
  }

  /**
   * Update node style
   */
  updateStyle(nodeId: NodeId, style: Partial<NodeStyle>): void {
    this.applyPatch({
      type: 'setStyle',
      nodeId,
      styleUpdates: style,
    });
  }

  /**
   * Add a child node
   */
  addChild(parentId: NodeId, node: SceneNode, index?: number): void {
    this.applyPatch({
      type: 'addNode',
      nodeId: node.id,
      parentId,
      node,
      index,
    });
  }

  /**
   * Remove a node
   */
  removeNode(nodeId: NodeId): void {
    this.applyPatch({
      type: 'removeNode',
      nodeId,
    });
  }

  /**
   * Bind an asset to an image or slot node
   */
  bindAsset(nodeId: NodeId, assetRef: AssetReference): void {
    this.applyPatch({
      type: 'bindAsset',
      nodeId,
      assetRef,
    });
  }

  /**
   * Apply placement intents from AI
   */
  applyPlacementIntents(intents: PlacementIntent[]): void {
    this.beginTransaction();
    try {
      const slots = this.getNodesByType<SlotNode>('slot');
      
      for (const intent of intents) {
        const slot = slots.find(s => s.slotId === intent.slotId);
        if (slot) {
          this.applyPatch({
            type: 'bindAsset',
            nodeId: slot.id,
            assetRef: {
              assetId: intent.assetId,
              url: '', // Will be resolved by renderer
            },
            slotId: intent.slotId,
          });
          
          // Store placement intent for renderers
          this.applyPatch({
            type: 'setProperty',
            nodeId: slot.id,
            property: 'placementIntent',
            value: intent,
          });
        }
      }
    } finally {
      this.commitTransaction();
    }
  }

  /**
   * Set text content
   */
  setText(nodeId: NodeId, content: string): void {
    this.applyPatch({
      type: 'setText',
      nodeId,
      content,
    });
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Export scene to JSON
   */
  toJSON(): string {
    return JSON.stringify({
      root: this.state.root,
      version: this.state.version,
    }, null, 2);
  }

  /**
   * Import scene from JSON
   */
  fromJSON(json: string): void {
    try {
      const data = JSON.parse(json);
      this.state.root = data.root;
      this.state.version = data.version || 0;
      this.state.history = [];
      this.state.historyIndex = -1;
      this.clearSelection();
      this.emit({ type: 'sceneChanged', patches: [] });
    } catch (error) {
      console.error('Failed to import scene:', error);
    }
  }

  /**
   * Reset scene to defaults
   */
  reset(width = 1280, height = 800): void {
    this.state = {
      root: createDefaultRoot(width, height),
      selectedNodeIds: [],
      hoveredNodeId: undefined,
      version: 0,
      history: [],
      historyIndex: -1,
    };
    this.emit({ type: 'sceneChanged', patches: [] });
  }

  // ============================================
  // Event System
  // ============================================

  /**
   * Subscribe to scene events
   */
  subscribe(listener: SceneEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: SceneEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}

// ============================================
// Singleton
// ============================================

let sceneManager: SceneModelManager | null = null;

export function getSceneManager(width = 1280, height = 800): SceneModelManager {
  if (!sceneManager) {
    sceneManager = new SceneModelManager(width, height);
  }
  return sceneManager;
}

export function resetSceneManager(): void {
  sceneManager = null;
}
