/**
 * DiagnosticsAggregator — Unified diagnostic collection from all sources
 * 
 * Combines:
 * - TypeScript / ESLint diagnostics (from Monaco)
 * - Preview runtime errors (from Sandpack iframe)
 * - Terminal output errors (from VFS terminal)
 * - Workflow / intent errors
 * 
 * Normalizes everything into a single schema for the Debug Agent.
 */

// ============================================================================
// Types
// ============================================================================

export type DiagnosticSource = 'typescript' | 'eslint' | 'preview' | 'terminal' | 'workflow' | 'intent' | 'build' | 'import';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  id: string;
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  message: string;
  raw?: string;
  timestamp: number;
  /** Whether this diagnostic has been addressed by the agent */
  resolved?: boolean;
}

export interface DiagnosticSnapshot {
  diagnostics: Diagnostic[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  sources: DiagnosticSource[];
  timestamp: number;
}

// ============================================================================
// Aggregator
// ============================================================================

class DiagnosticsAggregatorService {
  private diagnostics: Map<string, Diagnostic> = new Map();
  private listeners: Set<(snapshot: DiagnosticSnapshot) => void> = new Set();
  private idCounter = 0;

  private genId(): string {
    return `diag-${++this.idCounter}-${Date.now()}`;
  }

  /** Add a diagnostic. Deduplicates by source+file+line+message. */
  add(input: Omit<Diagnostic, 'id' | 'timestamp' | 'resolved'>): Diagnostic {
    const dedupeKey = `${input.source}:${input.file ?? ''}:${input.line ?? ''}:${input.message}`;
    
    // If already exists with same key, skip
    for (const [, existing] of this.diagnostics) {
      if (`${existing.source}:${existing.file ?? ''}:${existing.line ?? ''}:${existing.message}` === dedupeKey && !existing.resolved) {
        return existing;
      }
    }

    const diag: Diagnostic = {
      ...input,
      id: this.genId(),
      timestamp: Date.now(),
      resolved: false,
    };
    this.diagnostics.set(diag.id, diag);
    this.notify();
    return diag;
  }

  /** Bulk-add diagnostics from a source, replacing all previous from that source */
  replaceSource(source: DiagnosticSource, items: Omit<Diagnostic, 'id' | 'timestamp' | 'resolved' | 'source'>[]): void {
    // Remove all existing from this source
    for (const [id, d] of this.diagnostics) {
      if (d.source === source) this.diagnostics.delete(id);
    }
    // Add new
    for (const item of items) {
      const diag: Diagnostic = {
        ...item,
        source,
        id: this.genId(),
        timestamp: Date.now(),
        resolved: false,
      };
      this.diagnostics.set(diag.id, diag);
    }
    this.notify();
  }

  /** Ingest iframe errors from AIBuilderPanel */
  ingestIframeErrors(errors: Array<{ type: string; message: string; stack?: string; file?: string; line?: number; column?: number }>): void {
    const items = errors.map(e => ({
      severity: 'error' as DiagnosticSeverity,
      file: e.file,
      line: e.line,
      column: e.column,
      message: e.message,
      raw: e.stack,
      code: e.type,
    }));
    this.replaceSource('preview', items);
  }

  /** Ingest terminal output lines looking for errors */
  ingestTerminalOutput(lines: Array<{ type: string; text: string }>): void {
    const errorLines = lines.filter(l => l.type === 'error');
    const items = errorLines.map(l => {
      // Try to parse file:line:col from error text
      const match = l.text.match(/(?:at\s+)?([^\s]+):(\d+):(\d+)/);
      return {
        severity: 'error' as DiagnosticSeverity,
        file: match?.[1],
        line: match ? parseInt(match[2]) : undefined,
        column: match ? parseInt(match[3]) : undefined,
        message: l.text,
        raw: l.text,
      };
    });
    this.replaceSource('terminal', items);
  }

  /** Mark a diagnostic as resolved */
  resolve(id: string): void {
    const d = this.diagnostics.get(id);
    if (d) {
      d.resolved = true;
      this.notify();
    }
  }

  /** Clear all diagnostics */
  clear(): void {
    this.diagnostics.clear();
    this.notify();
  }

  /** Clear diagnostics from a specific source */
  clearSource(source: DiagnosticSource): void {
    for (const [id, d] of this.diagnostics) {
      if (d.source === source) this.diagnostics.delete(id);
    }
    this.notify();
  }

  /** Get current snapshot */
  getSnapshot(): DiagnosticSnapshot {
    const all = Array.from(this.diagnostics.values()).filter(d => !d.resolved);
    const sources = [...new Set(all.map(d => d.source))];
    return {
      diagnostics: all.sort((a, b) => {
        const sevOrder = { error: 0, warning: 1, info: 2 };
        return (sevOrder[a.severity] - sevOrder[b.severity]) || (b.timestamp - a.timestamp);
      }),
      errorCount: all.filter(d => d.severity === 'error').length,
      warningCount: all.filter(d => d.severity === 'warning').length,
      infoCount: all.filter(d => d.severity === 'info').length,
      sources,
      timestamp: Date.now(),
    };
  }

  /** Get diagnostics as compact context string for AI prompts */
  getContextForAI(maxChars = 3000): string {
    const snap = this.getSnapshot();
    if (snap.diagnostics.length === 0) return 'No diagnostics found.';

    const lines: string[] = [
      `## Active Diagnostics: ${snap.errorCount} errors, ${snap.warningCount} warnings`,
    ];

    let chars = lines[0].length;
    for (const d of snap.diagnostics) {
      const line = `- [${d.severity.toUpperCase()}] ${d.source}${d.file ? ` in ${d.file}` : ''}${d.line ? `:${d.line}` : ''}: ${d.message}`;
      if (chars + line.length > maxChars) {
        lines.push(`... and ${snap.diagnostics.length - lines.length + 1} more`);
        break;
      }
      lines.push(line);
      chars += line.length;
    }

    return lines.join('\n');
  }

  /** Subscribe to diagnostic changes */
  subscribe(listener: (snapshot: DiagnosticSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      try { listener(snap); } catch (e) { console.error('[DiagnosticsAggregator] listener error:', e); }
    }
  }
}

export const diagnosticsAggregator = new DiagnosticsAggregatorService();
