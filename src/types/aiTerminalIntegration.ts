/**
 * AI-Terminal Integration Types
 * 
 * Defines the contract for bidirectional communication between AI services
 * and the VFS terminal command engine. Enables AI to:
 * - Execute terminal commands and receive structured output
 * - Run real Node.js runtime operations (npm, tsc, tests)
 * - Request diagnostic analysis and code fixes
 * - Watch VFS changes and adapt recommendations
 * 
 * Terminal can also:
 * - Request AI help for syntax/import errors
 * - Ask AI to explain or fix issues
 * - Share diagnostics for AI context
 */

import type { VirtualNode } from '@/hooks/useVirtualFileSystem';
import type { TerminalLine } from '@/services/terminalCommands';

// ============================================================================
// AI → Terminal: Command Execution
// ============================================================================

/**
 * Request to execute a terminal command from AI
 */
export interface AICommandRequest {
  /** Unique ID for tracking this request */
  id: string;
  /** The command to execute (e.g., "ls /src", "diagnose", "install react") */
  command: string;
  /** Optional context about why AI is running this command */
  reason?: string;
  /** If true, AI expects structured output instead of text */
  structured?: boolean;
  /** Timeout in ms (default: 30000) */
  timeout?: number;
}

/**
 * Response from executing an AI command request
 */
export interface AICommandResult {
  /** Request ID this is responding to */
  requestId: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Terminal output lines */
  output: TerminalLine[];
  /** Structured result (if structured=true was set) */
  structured?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
  /** Execution time in ms */
  duration: number;
}

// ============================================================================
// AI → Terminal: Runtime Execution
// ============================================================================

/**
 * Request to execute a real Node.js runtime command
 * Examples: npm install, tsc --noEmit, npm run test
 */
export interface AIRuntimeRequest {
  id: string;
  /** Command to run in the actual Node.js runtime */
  command: string;
  /** Working directory (default: workspace root) */
  cwd?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** If true, stream output as it arrives */
  stream?: boolean;
  timeout?: number;
}

/**
 * Response from Node.js runtime execution
 */
export interface AIRuntimeResult {
  requestId: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  /** Parsed log lines if stream=true */
  lines?: TerminalLine[];
  duration: number;
}

// ============================================================================
// Terminal → AI: Requests for Help
// ============================================================================

/**
 * Terminal user asks AI for help fixing an issue
 */
export interface TerminalAIHelpRequest {
  /** Type of help being requested */
  type: 'fix-error' | 'explain-issue' | 'suggest-command' | 'analyze-imports' | 'resolve-deps';
  /** The problem description or error message */
  problem: string;
  /** File path if relevant */
  filePath?: string;
  /** Context code snippet */
  code?: string;
  /** Current VFS state for context */
  vfsContext?: VirtualNode[];
}

/**
 * AI's response to help request
 */
export interface TerminalAIHelpResponse {
  /** ID of the terminal request */
  requestId: string;
  /** Suggested solution or explanation */
  suggestion: string;
  /** Commands to run (if applicable) */
  suggestedCommands?: string[];
  /** Code fix (if applicable) */
  codeFix?: { filePath: string; newContent: string }[];
  /** Confidence level (0-1) */
  confidence: number;
}

// ============================================================================
// Bidirectional: Conversation State
// ============================================================================

/**
 * A single message in an AI-Terminal conversation
 */
export interface ConversationMessage {
  id: string;
  timestamp: number;
  /** 'ai' or 'terminal' */
  sender: 'ai' | 'terminal';
  /** The actual message or command */
  content: string;
  /** Message type for routing */
  type: 'command' | 'response' | 'observation' | 'help-request' | 'help-response';
  /** Metadata about the message */
  metadata?: {
    commandId?: string;
    success?: boolean;
    duration?: number;
    affectedFiles?: string[];
  };
}

/**
 * Full conversation session tracking AI-Terminal interaction
 */
export interface AITerminalConversation {
  id: string;
  createdAt: number;
  /** All messages in order */
  messages: ConversationMessage[];
  /** Current VFS snapshot for context */
  vfsSnapshot?: Record<string, string>;
  /** Current npm dependencies */
  dependencies?: Record<string, string>;
  /** Issues that have been identified and fixed */
  resolvedIssues: {
    issue: string;
    aiSolution: string;
    executionCommand: string;
    success: boolean;
  }[];
}

// ============================================================================
// AI Terminal Interface - Main API
// ============================================================================

/**
 * Main interface for AI-Terminal bidirectional communication
 * 
 * Usage:
 *   const aiTerminal = new AITerminalInterface(vfsNodes, deps);
 *   
 *   // AI executes a command
 *   const result = await aiTerminal.executeCommand({
 *     command: 'diagnose',
 *     reason: 'Check for missing dependencies'
 *   });
 *   
 *   // Terminal asks for help
 *   const fix = await aiTerminal.requestHelp({
 *     type: 'fix-error',
 *     problem: 'Cannot find module react'
 *   });
 */
export interface AITerminalInterface {
  // ============================================
  // AI Commands
  // ============================================

  /**
   * AI executes a terminal command and gets structured output
   */
  executeCommand(request: AICommandRequest): Promise<AICommandResult>;

  /**
   * AI runs a real Node.js runtime command (npm, tsc, etc)
   */
  executeRuntime(request: AIRuntimeRequest): Promise<AIRuntimeResult>;

  /**
   * AI watches VFS for changes and gets notified
   */
  watchVFS(callback: (changes: string[]) => void): () => void;

  /**
   * AI queries current VFS state
   */
  getVFSSnapshot(): Record<string, string>;

  /**
   * AI queries current dependencies
   */
  getCurrentDependencies(): Record<string, string>;

  // ============================================
  // Terminal Requests
  // ============================================

  /**
   * Terminal user asks AI for help
   */
  requestHelp(request: TerminalAIHelpRequest): Promise<TerminalAIHelpResponse>;

  /**
   * Terminal sends an observation/context to AI
   */
  sendObservation(observation: string): Promise<void>;

  // ============================================
  // Conversation Management
  // ============================================

  /**
   * Get the current conversation session
   */
  getConversation(): AITerminalConversation;

  /**
   * Add a message to conversation history
   */
  addMessage(message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage;

  /**
   * Get conversation history
   */
  getHistory(limit?: number): ConversationMessage[];

  /**
   * Clear conversation and start fresh
   */
  resetConversation(): void;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler for processing AI command requests
 */
export type AICommandHandler = (request: AICommandRequest) => Promise<AICommandResult>;

/**
 * Handler for processing AI runtime requests
 */
export type AIRuntimeHandler = (request: AIRuntimeRequest) => Promise<AIRuntimeResult>;

/**
 * Handler for processing help requests from terminal
 */
export type TerminalHelpHandler = (request: TerminalAIHelpRequest) => Promise<TerminalAIHelpResponse>;
