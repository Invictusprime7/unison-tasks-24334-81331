/**
 * AI Terminal Conversation Manager
 * 
 * Maintains the context and history of AI-Terminal bidirectional conversations.
 * Tracks:
 * - All messages exchanged between AI and terminal
 * - VFS state snapshots at key points
 * - Resolved issues and their solutions
 * - Dependencies and their changes
 * 
 * Enables multi-turn troubleshooting where AI remembers context.
 */

import type {
  AITerminalConversation,
  ConversationMessage,
} from '@/types/aiTerminalIntegration';

/**
 * Manages a single AI-Terminal conversation session
 */
export class AITerminalConversationManager {
  private conversation: AITerminalConversation;
  private maxMessages = 500; // Keep last 500 messages
  private listeners: Array<(conv: AITerminalConversation) => void> = [];

  constructor(initialId?: string) {
    this.conversation = {
      id: initialId || this.generateId(),
      createdAt: Date.now(),
      messages: [],
      resolvedIssues: [],
    };
  }

  /**
   * Add a message to the conversation
   */
  addMessage(
    sender: 'ai' | 'terminal',
    content: string,
    type: ConversationMessage['type'],
    metadata?: ConversationMessage['metadata']
  ): ConversationMessage {
    const message: ConversationMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      sender,
      content,
      type,
      metadata,
    };

    this.conversation.messages.push(message);

    // Trim old messages to stay under limit
    if (this.conversation.messages.length > this.maxMessages) {
      this.conversation.messages = this.conversation.messages.slice(-this.maxMessages);
    }

    this.notifyListeners();
    return message;
  }

  /**
   * Record that an issue was identified and solved
   */
  recordResolvedIssue(
    issue: string,
    aiSolution: string,
    executionCommand: string,
    success: boolean
  ): void {
    this.conversation.resolvedIssues.push({
      issue,
      aiSolution,
      executionCommand,
      success,
    });
    this.notifyListeners();
  }

  /**
   * Update VFS snapshot in conversation context
   */
  setVFSSnapshot(snapshot: Record<string, string>): void {
    this.conversation.vfsSnapshot = snapshot;
    this.notifyListeners();
  }

  /**
   * Update dependencies snapshot
   */
  setDependencies(deps: Record<string, string>): void {
    this.conversation.dependencies = deps;
    this.notifyListeners();
  }

  /**
   * Get all messages with optional filtering
   */
  getMessages(filter?: { sender?: 'ai' | 'terminal'; type?: ConversationMessage['type'] }): ConversationMessage[] {
    if (!filter) {
      return this.conversation.messages;
    }

    return this.conversation.messages.filter(msg => {
      if (filter.sender && msg.sender !== filter.sender) return false;
      if (filter.type && msg.type !== filter.type) return false;
      return true;
    });
  }

  /**
   * Get recent messages (last N)
   */
  getRecentMessages(limit: number = 20): ConversationMessage[] {
    return this.conversation.messages.slice(-limit);
  }

  /**
   * Get resolved issues
   */
  getResolvedIssues() {
    return this.conversation.resolvedIssues;
  }

  /**
   * Get the full conversation
   */
  getConversation(): AITerminalConversation {
    return this.conversation;
  }

  /**
   * Get context summary for AI (recent message summary + resolved issues)
   */
  getContextSummary(): string {
    const recentMessages = this.getRecentMessages(10).map(m => `[${m.sender}] ${m.content}`);
    const resolvedSummary = this.conversation.resolvedIssues
      .map(issue => `FIXED: ${issue.issue} → ${issue.aiSolution}`)
      .slice(-5);

    const summary = [
      '=== Recent Conversation ===',
      ...recentMessages,
      '',
      '=== Recently Fixed Issues ===',
      ...resolvedSummary,
    ].join('\n');

    return summary;
  }

  /**
   * Reset the conversation (clear messages but keep ID)
   */
  reset(): void {
    this.conversation.messages = [];
    this.conversation.resolvedIssues = [];
    this.conversation.vfsSnapshot = undefined;
    this.conversation.dependencies = undefined;
    this.notifyListeners();
  }

  /**
   * Subscribe to conversation changes
   */
  subscribe(listener: (conv: AITerminalConversation) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ============================================
  // Private helpers
  // ============================================

  private generateId(): string {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.conversation);
    });
  }
}

// ============================================================================
// Singleton instance for app-wide use
// ============================================================================

let globalConversation: AITerminalConversationManager | null = null;

export function getGlobalAITerminalConversation(): AITerminalConversationManager {
  if (!globalConversation) {
    globalConversation = new AITerminalConversationManager();
  }
  return globalConversation;
}

export function resetGlobalConversation(): void {
  globalConversation = null;
}
