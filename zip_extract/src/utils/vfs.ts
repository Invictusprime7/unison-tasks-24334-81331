/**
 * Virtual Filesystem (VFS) for managing files in memory
 */

export interface VFSFile {
  path: string;
  content: string;
  modified: number;
}

export type VFSOp = 
  | { type: 'put'; path: string; content: string }
  | { type: 'delete'; path: string };

export class VirtualFilesystem {
  private files = new Map<string, VFSFile>();
  private listeners = new Set<(op: VFSOp) => void>();

  writeFile(path: string, content: string): void {
    const normalizedPath = this.normalizePath(path);
    this.files.set(normalizedPath, {
      path: normalizedPath,
      content,
      modified: Date.now()
    });
    
    this.notifyListeners({ type: 'put', path: normalizedPath, content });
  }

  readFile(path: string): string | null {
    const normalizedPath = this.normalizePath(path);
    const file = this.files.get(normalizedPath);
    return file ? file.content : null;
  }

  deleteFile(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const existed = this.files.delete(normalizedPath);
    
    if (existed) {
      this.notifyListeners({ type: 'delete', path: normalizedPath });
    }
    
    return existed;
  }

  exists(path: string): boolean {
    return this.files.has(this.normalizePath(path));
  }

  listFiles(prefix?: string): VFSFile[] {
    const files = Array.from(this.files.values());
    
    if (prefix) {
      const normalizedPrefix = this.normalizePath(prefix);
      return files.filter(f => f.path.startsWith(normalizedPrefix));
    }
    
    return files;
  }

  getSnapshot(): Record<string, string> {
    const snapshot: Record<string, string> = {};
    for (const [path, file] of this.files) {
      snapshot[path] = file.content;
    }
    return snapshot;
  }

  loadSnapshot(snapshot: Record<string, string>): void {
    this.files.clear();
    for (const [path, content] of Object.entries(snapshot)) {
      this.writeFile(path, content);
    }
  }

  subscribe(listener: (op: VFSOp) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(op: VFSOp): void {
    this.listeners.forEach(listener => listener(op));
  }

  private normalizePath(path: string): string {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Remove double slashes
    path = path.replace(/\/+/g, '/');
    
    return path;
  }

  clear(): void {
    this.files.clear();
  }
}
