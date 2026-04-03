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

import type { VirtualNode } from '@/hooks/useVirtualFileSystem';
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
      // For now, return a mock implementation
      // In production, this would execute actual Node.js commands
      this.conversation.addMessage(
        'ai',
        `Executing runtime: ${request.command}`,
        'command',
        { commandId: request.id }
      );

      const result: AIRuntimeResult = {
        requestId: request.id,
        success: true,
        stdout: `[Mock] ${request.command} executed successfully\n`,
        stderr: '',
        exitCode: 0,
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
    const snapshot: Record<string, string> = {};

    const traverse = (node: VirtualNode, path: string = '') => {
      const nodePath = path ? `${path}/${node.name}` : node.name;
      if ('children' in node) {
        // Folder
        const children = (node as any).children;
        if (Array.isArray(children)) {
          children.forEach(child => traverse(child, nodePath));
        }
      } else {
        // File
        snapshot[nodePath] = (node as any).content || '';
      }
    };

    this.vfsNodes.forEach(node => traverse(node));
    return snapshot;
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

    // For now, return a structured response
    // In production, this would call the AI service (systemsAI.ts or Claude API)
    const response: TerminalAIHelpResponse = {
      requestId: 'help_' + Date.now(),
      suggestion: `Analyzing ${request.type}: ${request.problem}\n\nRecommendation pending AI service integration.`,
      suggestedCommands: ['diagnose', 'tree'],
      confidence: 0.5,
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

  private handleFileWritten(path: string, _content: string): void {
    this.notifyVFSWatchers([path]);
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
