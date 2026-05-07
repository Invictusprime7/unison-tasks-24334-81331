/**
 * AI Terminal Interface Implementation
 * 
 * Implements bidirectional communication between AI services and the VFS terminal.
 * This is the main integration point where:
 * - AI can execute terminal commands and get structured output
 * - AI can run real Node.js runtime operations
 * - Terminal can request help from AI
 * - Both maintain conversation context and history
 */

import type { VirtualFile, VirtualNode } from '@/hooks/useVirtualFileSystem';
import { vfsToFileMap } from '@/hooks/useVirtualFileSystem';
import { executeTerminalCommand } from '@/services/terminalCommands';
import { AITerminalConversationManager } from '@/services/aiTerminalConversation';
import type {
  AICommandRequest,
  AICommandResult,
  AIRuntimeRequest,
  AIRuntimeResult,
  TerminalAIHelpRequest,
  TerminalAIHelpResponse,
  AITerminalConversation,
  ConversationMessage,
} from '@/types/aiTerminalIntegration';

/**
 * Main AI-Terminal bidirectional interface
 */
export class AITerminalBridge {
  private conversation: AITerminalConversationManager;
  private vfsNodes: VirtualNode[] = [];
  private currentDeps: Record<string, string> = {};
  private vfsWatchers: Array<(changes: string[]) => void> = [];

  constructor(initialNodes?: VirtualNode[], initialDeps?: Record<string, string>) {
    this.conversation = new AITerminalConversationManager();
    if (initialNodes) this.vfsNodes = initialNodes;
    if (initialDeps) this.currentDeps = initialDeps;
  }

  // ============================================================================
  // AI → Terminal: Command Execution
  // ============================================================================

  /**
   * AI executes a terminal command and gets structured output
   */
  async executeCommand(request: AICommandRequest): Promise<AICommandResult> {
    const startTime = Date.now();

    try {
      // Record the command in conversation
      this.conversation.addMessage(
        'ai',
        request.command,
        'command',
        { commandId: request.id, duration: 0 }
      );

      // Execute the command using existing terminal infrastructure
      const commandResult = await executeTerminalCommand(request.command, {
        nodes: this.vfsNodes,
        currentDeps: this.currentDeps,
        // Add handlers for VFS modifications
        onAddDep: (pkg, version) => this.handleDepAdded(pkg, version),
        onRemoveDep: (pkg) => this.handleDepRemoved(pkg),
        onWriteFile: (path, content) => this.handleFileWritten(path, content),
      });

      const duration = Date.now() - startTime;

      const result: AICommandResult = {
        requestId: request.id,
        success: !commandResult.lines.some(l => l.type === 'error'),
        output: commandResult.lines,
        duration,
      };

      // If structured output requested, parse lines into structured format
      if (request.structured) {
        result.structured = this.parseStructuredOutput(commandResult.lines);
      }

      // Record response in conversation
      this.conversation.addMessage(
        'ai',
        `Command completed: ${request.command}`,
        'response',
        {
          commandId: request.id,
          success: result.success,
          duration,
          affectedFiles: this.extractAffectedFiles(commandResult.lines),
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: AICommandResult = {
        requestId: request.id,
        success: false,
        output: [],
        error: error instanceof Error ? error.message : String(error),
        duration,
      };

      this.conversation.addMessage(
        'ai',
        `Command failed: ${request.command}`,
        'response',
        { commandId: request.id, success: false, duration }
      );

      return result;
    }
  }

  /**
   * AI runs a real Node.js runtime command
   * Examples: npm install, tsc --noEmit, npm test
   */
  async executeRuntime(request: AIRuntimeRequest): Promise<AIRuntimeResult> {
    const startTime = Date.now();

    try {
      this.conversation.addMessage(
        'ai',
        `Executing runtime: ${request.command}`,
        'command',
        { commandId: request.id }
      );

      const mappedCommands = this.mapRuntimeToTerminalCommands(request.command);
      let stdout = '';
      let stderr = '';
      const lines: AIRuntimeResult['lines'] = [];
      let success = true;

      for (const command of mappedCommands) {
        const commandResult = await executeTerminalCommand(command, {
          nodes: this.vfsNodes,
          currentDeps: this.currentDeps,
          onAddDep: (pkg, version) => this.handleDepAdded(pkg, version),
          onRemoveDep: (pkg) => this.handleDepRemoved(pkg),
          onWriteFile: (path, content) => this.handleFileWritten(path, content),
        });

        const commandFailed = commandResult.lines.some((line) => line.type === 'error');
        if (commandFailed) {
          success = false;
        }

        commandResult.lines.forEach((line) => {
          lines?.push(line);
          if (line.type === 'error') {
            stderr += `${line.text}\n`;
          } else {
            stdout += `${line.text}\n`;
          }
        });

        if (commandFailed) {
          break;
        }
      }

      const result: AIRuntimeResult = {
        requestId: request.id,
        success,
        stdout,
        stderr,
        exitCode: success ? 0 : 1,
        lines,
        duration: Date.now() - startTime,
      };

      this.conversation.addMessage(
        'ai',
        `Runtime command completed: ${request.command}`,
        'response',
        { commandId: request.id, success: true, duration: result.duration }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        requestId: request.id,
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        duration,
      };
    }
  }

  /**
   * Watch VFS for changes
   */
  watchVFS(callback: (changes: string[]) => void): () => void {
    this.vfsWatchers.push(callback);
    return () => {
      this.vfsWatchers = this.vfsWatchers.filter(w => w !== callback);
    };
  }

  /**
   * Get current VFS snapshot
   */
  getVFSSnapshot(): Record<string, string> {
    return vfsToFileMap(this.vfsNodes);
  }

  /**
   * Get current dependencies
   */
  getCurrentDependencies(): Record<string, string> {
    return { ...this.currentDeps };
  }

  // ============================================================================
  // Terminal → AI: Requests for Help
  // ============================================================================

  /**
   * Terminal user asks AI for help fixing an issue
   */
  async requestHelp(request: TerminalAIHelpRequest): Promise<TerminalAIHelpResponse> {
    // Record help request in conversation
    this.conversation.addMessage(
      'terminal',
      `Help request: ${request.type} - ${request.problem}`,
      'help-request'
    );

    const suggestions = this.buildHelpSuggestions(request);
    const suggestionText = this.formatHelpSuggestion(request, suggestions);

    const response: TerminalAIHelpResponse = {
      requestId: 'help_' + Date.now(),
      suggestion: suggestionText,
      suggestedCommands: suggestions,
      confidence: suggestions.length > 0 ? 0.82 : 0.55,
    };

    // Record AI's help response
    this.conversation.addMessage(
      'ai',
      response.suggestion,
      'help-response'
    );

    return response;
  }

  /**
   * Terminal sends an observation to AI
   */
  async sendObservation(observation: string): Promise<void> {
    this.conversation.addMessage(
      'terminal',
      observation,
      'observation'
    );
  }

  // ============================================================================
  // Conversation Management
  // ============================================================================

  /**
   * Get the current conversation
   */
  getConversation(): AITerminalConversation {
    return this.conversation.getConversation();
  }

  /**
   * Add a message to conversation
   */
  addMessage(
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): ConversationMessage {
    return this.conversation.addMessage(message.sender, message.content, message.type, message.metadata);
  }

  /**
   * Get conversation history
   */
  getHistory(limit?: number): ConversationMessage[] {
    return this.conversation.getRecentMessages(limit);
  }

  /**
   * Get context summary for AI
   */
  getContextSummary(): string {
    return this.conversation.getContextSummary();
  }

  /**
   * Reset conversation
   */
  resetConversation(): void {
    this.conversation.reset();
  }

  // ============================================================================
  // State Management
  // ============================================================================

  updateVFSNodes(nodes: VirtualNode[]): void {
    this.vfsNodes = nodes;
    this.notifyVFSWatchers([]);
  }

  updateDependencies(deps: Record<string, string>): void {
    this.currentDeps = deps;
    this.conversation.setDependencies(deps);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private handleDepAdded(pkg: string, version: string): void {
    this.currentDeps[pkg] = version;
    this.conversation.addMessage(
      'terminal',
      `Dependency added: ${pkg}@${version}`,
      'observation'
    );
  }

  private handleDepRemoved(pkg: string): void {
    delete this.currentDeps[pkg];
    this.conversation.addMessage(
      'terminal',
      `Dependency removed: ${pkg}`,
      'observation'
    );
  }

  private handleFileWritten(path: string, content: string): void {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const existingIndex = this.vfsNodes.findIndex(
      (node) => node.type === 'file' && (node as VirtualFile).path === normalizedPath
    );

    if (existingIndex >= 0) {
      const existing = this.vfsNodes[existingIndex] as VirtualFile;
      this.vfsNodes = this.vfsNodes.map((node, idx) =>
        idx === existingIndex ? { ...existing, content } : node
      );
    } else {
      const segments = normalizedPath.split('/').filter(Boolean);
      const fileName = segments.pop() || 'untitled.tsx';
      const newFile: VirtualFile = {
        id: `bridge-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: fileName,
        content,
        type: 'file',
        language: 'plaintext',
        parentId: null,
        path: normalizedPath,
      };
      this.vfsNodes = [...this.vfsNodes, newFile];
    }

    this.conversation.setVFSSnapshot(this.getVFSSnapshot());
    this.notifyVFSWatchers([normalizedPath]);
  }

  private notifyVFSWatchers(changes: string[]): void {
    this.vfsWatchers.forEach(watcher => {
      try {
        watcher(changes);
      } catch (error) {
        console.error('VFS watcher error:', error);
      }
    });
  }

  private parseStructuredOutput(lines: any[]): Record<string, unknown> {
    // Basic parsing: convert lines to structured format
    const structured: Record<string, unknown> = {
      lineCount: lines.length,
      hasErrors: lines.some(l => l.type === 'error'),
      hasWarnings: lines.some(l => l.type === 'warn'),
      lines: lines.map(l => ({ type: l.type, text: l.text })),
    };
    return structured;
  }

  private extractAffectedFiles(lines: any[]): string[] {
    // Extract file paths mentioned in output
    const files: string[] = [];
    const fileRegex = /['"](\/[^'"]*\.tsx?)['"]/g;
    lines.forEach(line => {
      let match;
      while ((match = fileRegex.exec(line.text)) !== null) {
        if (!files.includes(match[1])) {
          files.push(match[1]);
        }
      }
    });
    return files;
  }

  private mapRuntimeToTerminalCommands(rawCommand: string): string[] {
    const normalized = rawCommand.trim().toLowerCase();
    if (!normalized) {
      return ['diagnose'];
    }

    const installMatch = normalized.match(/^(npm|pnpm|yarn|bun)\s+(install|add)\s+(.+)$/);
    if (installMatch) {
      const packages = installMatch[3].split(/\s+/).filter(Boolean);
      return packages.length > 0 ? [`install ${packages.join(' ')}`] : ['deps'];
    }

    const uninstallMatch = normalized.match(/^(npm|pnpm|yarn|bun)\s+(remove|uninstall)\s+(.+)$/);
    if (uninstallMatch) {
      const packages = uninstallMatch[3].split(/\s+/).filter(Boolean);
      return packages.length > 0 ? [`uninstall ${packages.join(' ')}`] : ['deps'];
    }

    if (/(npm|pnpm|yarn|bun)\s+(run\s+)?(test|lint|build|typecheck|tsc)/.test(normalized)) {
      return ['diagnose'];
    }

    if (normalized === 'npm ls' || normalized === 'pnpm list' || normalized === 'yarn list' || normalized === 'bun pm ls') {
      return ['deps'];
    }

    return [rawCommand];
  }

  private buildHelpSuggestions(request: TerminalAIHelpRequest): string[] {
    const lowerProblem = request.problem.toLowerCase();
    const suggestions: string[] = ['diagnose'];

    if (request.type === 'resolve-deps' || request.type === 'analyze-imports') {
      suggestions.push('deps', 'find import');
      return suggestions;
    }

    if (lowerProblem.includes('cannot find module') || lowerProblem.includes('module not found')) {
      suggestions.push('deps', 'find package', 'tree');
      return suggestions;
    }

    if (lowerProblem.includes('import') || lowerProblem.includes('export')) {
      suggestions.push('find import', 'tree', 'cat /src/App.tsx');
      return suggestions;
    }

    if (lowerProblem.includes('syntax') || lowerProblem.includes('unexpected token')) {
      suggestions.push('cat /src/App.tsx', 'cat /src/main.tsx');
      return suggestions;
    }

    if (lowerProblem.includes('runtime') || lowerProblem.includes('crash')) {
      suggestions.push('tree', 'cat /src/App.tsx');
      return suggestions;
    }

    suggestions.push('tree');
    return suggestions;
  }

  private formatHelpSuggestion(request: TerminalAIHelpRequest, commands: string[]): string {
    const heading = `Analyzing ${request.type}: ${request.problem}`;
    if (commands.length === 0) {
      return `${heading}\n\nNo deterministic command suggestions were found. Start with a full diagnostic pass.`;
    }

    const commandList = commands.map((cmd) => `- ${cmd}`).join('\n');
    return `${heading}\n\nRecommended next commands:\n${commandList}\n\nRun them in order and share the first error line for a targeted fix.`;
  }
}

// ============================================================================
// Singleton instance for app-wide use
// ============================================================================

let globalBridge: AITerminalBridge | null = null;

export function getGlobalAITerminalBridge(
  nodes?: VirtualNode[],
  deps?: Record<string, string>
): AITerminalBridge {
  if (!globalBridge) {
    globalBridge = new AITerminalBridge(nodes, deps);
  }
  return globalBridge;
}

export function resetGlobalAITerminalBridge(): void {
  globalBridge = null;
}
