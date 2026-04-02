/**
 * VFS Event Bus — Reactive pub/sub system for VFS state changes
 * 
 * Provides a centralized event bus that components subscribe to for:
 * - File CRUD operations (create, update, delete, rename)
 * - Batch imports (AI code apply, template load)
 * - Preview sync triggers
 * - Dependency resolution events
 * - Snapshot/undo events
 * 
 * Architecture:
 *   VFS Hook → EventBus.emit() → [Preview, Monaco, AI Context, Terminal]
 */

// ============================================================================
// Event Types
// ============================================================================

export type VFSEventType =
  | 'file:created'
  | 'file:updated'
  | 'file:deleted'
  | 'file:renamed'
  | 'folder:created'
  | 'folder:deleted'
  | 'batch:import'
  | 'batch:complete'
  | 'deps:resolved'
  | 'deps:error'
  | 'deps:install'
  | 'deps:remove'
  | 'preview:sync'
  | 'preview:refresh'
  | 'preview:error'
  | 'snapshot:created'
  | 'snapshot:restored'
  | 'ai:apply:start'
  | 'ai:apply:complete'
  | 'ai:apply:error'
  | 'ai:terminal:exec'
  | 'build:log'
  | 'build:error'
  | 'build:success';

export interface VFSEvent<T = unknown> {
  type: VFSEventType;
  timestamp: number;
  payload: T;
}

export interface FileEvent {
  path: string;
  content?: string;
  previousContent?: string;
  source: 'user' | 'ai' | 'import' | 'system';
}

export interface BatchEvent {
  files: string[];
  source: 'ai' | 'import' | 'template';
  totalFiles: number;
}

export interface DepsEvent {
  dependencies: Record<string, string>;
  newDeps: string[];
  removedDeps: string[];
}

export interface BuildLogEvent {
  level: 'info' | 'warn' | 'error';
  message: string;
  source?: string;
  line?: number;
  column?: number;
  file?: string;
}

export interface SnapshotEvent {
  snapshotId: string;
  label: string;
  fileCount: number;
}

// ============================================================================
// Listener Type
// ============================================================================

type Listener<T = unknown> = (event: VFSEvent<T>) => void;
type Unsubscribe = () => void;

// ============================================================================
// Event Bus Class
// ============================================================================

export class VFSEventBus {
  private listeners = new Map<VFSEventType, Set<Listener>>();
  private wildcardListeners = new Set<Listener>();
  private history: VFSEvent[] = [];
  private maxHistory = 200;
  private paused = false;
  private pendingQueue: VFSEvent[] = [];

  // --- Subscribe ---

  on<T = unknown>(type: VFSEventType, listener: Listener<T>): Unsubscribe {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as Listener);
    return () => {
      this.listeners.get(type)?.delete(listener as Listener);
    };
  }

  /** Subscribe to all events */
  onAny(listener: Listener): Unsubscribe {
    this.wildcardListeners.add(listener);
    return () => {
      this.wildcardListeners.delete(listener);
    };
  }

  /** Subscribe to multiple event types */
  onMany(types: VFSEventType[], listener: Listener): Unsubscribe {
    const unsubs = types.map(t => this.on(t, listener));
    return () => unsubs.forEach(u => u());
  }

  // --- Emit ---

  emit<T = unknown>(type: VFSEventType, payload: T): void {
    const event: VFSEvent<T> = {
      type,
      timestamp: Date.now(),
      payload,
    };

    if (this.paused) {
      this.pendingQueue.push(event as VFSEvent);
      return;
    }

    this._dispatch(event as VFSEvent);
  }

  private _dispatch(event: VFSEvent): void {
    // Add to history
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Notify type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (err) {
          console.error(`[VFSEventBus] Listener error for ${event.type}:`, err);
        }
      }
    }

    // Notify wildcard listeners
    for (const listener of this.wildcardListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error(`[VFSEventBus] Wildcard listener error:`, err);
      }
    }
  }

  // --- Batch Control ---

  /** Pause event dispatch (queue events for batch processing) */
  pause(): void {
    this.paused = true;
  }

  /** Resume and flush queued events */
  resume(): void {
    this.paused = false;
    const queued = [...this.pendingQueue];
    this.pendingQueue = [];
    for (const event of queued) {
      this._dispatch(event);
    }
  }

  // --- History ---

  getHistory(filter?: VFSEventType): VFSEvent[] {
    if (filter) return this.history.filter(e => e.type === filter);
    return [...this.history];
  }

  getRecentEvents(count = 20): VFSEvent[] {
    return this.history.slice(-count);
  }

  clearHistory(): void {
    this.history = [];
  }

  // --- Cleanup ---

  removeAllListeners(type?: VFSEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
      this.wildcardListeners.clear();
    }
  }

  get listenerCount(): number {
    let count = this.wildcardListeners.size;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const vfsEventBus = new VFSEventBus();
