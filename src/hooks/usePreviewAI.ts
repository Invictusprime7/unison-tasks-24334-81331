/**
 * usePreviewAI Hook
 *
 * Bridges VFSPreview with AI execution and terminal commands for live debugging,
 * code analysis, and interactive optimization within the preview environment.
 *
 * Provides:
 * - Live terminal command execution from preview
 * - Real-time code diagnostics and fixes
 * - VFS troubleshooting and recovery
 * - Intent execution analytics
 * - Session recording for AI training
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getGlobalAITerminalBridge } from '@/services/aiTerminalBridge';
import { globalAIBridge } from '@/services/aiExecutionBridge';
import type { AICommandRequest, AIRuntimeRequest } from '@/types/aiTerminalIntegration';

interface ParsedFileWrite {
  path: string;
  content: string;
}

function encodeUtf8Base64(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function extractFileWritesFromAI(content: string): ParsedFileWrite[] {
  const writes: ParsedFileWrite[] = [];

  // Format: FILE: /path/to/file followed by fenced code block.
  const labeledBlockRegex = /FILE:\s*(\/[\w./-]+)\s*\n```[\w-]*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = labeledBlockRegex.exec(content)) !== null) {
    writes.push({ path: match[1], content: match[2] });
  }

  // Format: ```tsx /path/to/file
  // <content>
  // ```
  const inlinePathRegex = /```[\w-]*\s+(\/[\w./-]+)\n([\s\S]*?)```/gi;
  while ((match = inlinePathRegex.exec(content)) !== null) {
    writes.push({ path: match[1], content: match[2] });
  }

  // Deduplicate by keeping the last suggested content for each path.
  const merged = new Map<string, string>();
  writes.forEach((write) => {
    merged.set(write.path, write.content);
  });

  return Array.from(merged.entries()).map(([path, fileContent]) => ({
    path,
    content: fileContent,
  }));
}

// ============================================================================
// Types
// ============================================================================

export interface PreviewCommand {
  id: string;
  command: string;
  timestamp: number;
  result?: string;
  error?: string;
  duration?: number;
}

export interface PreviewDiagnostic {
  fileId: string;
  fileName: string;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    column?: number;
    suggestedFix?: string;
  }>;
  timestamp: number;
}

export interface UsePreviewAIReturn {
  // Terminal operations
  executeCommand: (command: string) => Promise<string | null>;
  executeRuntime: (code: string) => Promise<unknown>;
  
  // Code analysis
  analyzeCurrent: () => Promise<PreviewDiagnostic[] | null>;
  fixIssues: (issues: PreviewDiagnostic[]) => Promise<boolean>;
  
  // VFS operations
  getVFSSnapshot: () => Record<string, string>;
  searchCode: (pattern: string, content: string) => Array<{ path: string; matches: string[] }>;
  
  // Help and guidance
  requestHelp: (topic: string) => Promise<string>;
  explainError: (error: string) => Promise<string>;
  
  // Session tracking
  recordEvent: (type: string, data: Record<string, unknown>) => void;
  getSessionLogs: () => string[];
  clearLogs: () => void;
  
  // Status
  isExecuting: boolean;
  lastCommand: PreviewCommand | null;
  commandHistory: PreviewCommand[];
  diagnostics: PreviewDiagnostic[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePreviewAI(): UsePreviewAIReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastCommand, setLastCommand] = useState<PreviewCommand | null>(null);
  const [commandHistory, setCommandHistory] = useState<PreviewCommand[]>([]);
  const [diagnostics, setDiagnostics] = useState<PreviewDiagnostic[]>([]);
  
  const sessionLogsRef = useRef<string[]>([]);
  const sessionIdRef = useRef(`preview:${Date.now()}`);

  // Execute terminal command with execution bridge
  const executeCommand = useCallback(async (command: string): Promise<string | null> => {
    const commandId = `cmd:${Date.now()}`;
    const startTime = Date.now();
    
    try {
      setIsExecuting(true);
      recordEvent('command_execution', { command, commandId });
      
      const bridge = getGlobalAITerminalBridge();
      const request: AICommandRequest = {
        id: commandId,
        command,
        structured: false,
      };
      const result = await bridge.executeCommand(request);
      
      const duration = Date.now() - startTime;
      const outputText = result?.output?.map((line: any) => line.text).join('\n') || '';
      const cmdRecord: PreviewCommand = {
        id: commandId,
        command,
        timestamp: startTime,
        result: outputText,
        duration,
      };
      
      setLastCommand(cmdRecord);
      setCommandHistory((prev) => [cmdRecord, ...prev].slice(0, 50)); // Keep last 50
      recordEvent('command_success', { command, duration, commandId });
      
      return outputText || null;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      const cmdRecord: PreviewCommand = {
        id: commandId,
        command,
        timestamp: startTime,
        error: errorMsg,
        duration,
      };
      
      setLastCommand(cmdRecord);
      setCommandHistory((prev) => [cmdRecord, ...prev].slice(0, 50));
      recordEvent('command_error', { command, error: errorMsg, duration, commandId });
      
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Execute runtime code in preview context
  const executeRuntime = useCallback(async (code: string): Promise<unknown> => {
    try {
      setIsExecuting(true);
      recordEvent('runtime_execution', { codeLength: code.length });
      
      const bridge = getGlobalAITerminalBridge();
      const request: AIRuntimeRequest = {
        id: `runtime:${Date.now()}`,
        command: code,
      };
      const result = await bridge.executeRuntime(request);
      
      recordEvent('runtime_success', { codeLength: code.length });
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      recordEvent('runtime_error', { error: errorMsg });
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Analyze current preview code for issues
  const analyzeCurrent = useCallback(async (): Promise<PreviewDiagnostic[] | null> => {
    try {
      setIsExecuting(true);
      recordEvent('analysis_start');
      
      // Get VFS snapshot and analyze for common issues
      const bridge = getGlobalAITerminalBridge();
      const vfsSnapshot = bridge.getVFSSnapshot();
      
      // Parse files for issues
      const diags: PreviewDiagnostic[] = [];
      Object.entries(vfsSnapshot).forEach(([path, content]) => {
        const issues = [];
        // Basic linting: check for common errors
        if (content.includes('import') && !content.includes('from')) {
          issues.push({
            type: 'error' as const,
            message: 'Invalid import statement',
            line: 1,
          });
        }
        if (issues.length > 0) {
          diags.push({
            fileId: path,
            fileName: path.split('/').pop() || path,
            issues,
            timestamp: Date.now(),
          });
        }
      });
      
      setDiagnostics(diags);
      recordEvent('analysis_complete', { issueCount: diags.length });
      return diags.length > 0 ? diags : null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      recordEvent('analysis_error', { error: errorMsg });
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Fix identified issues using AI
  const fixIssues = useCallback(async (issues: PreviewDiagnostic[]): Promise<boolean> => {
    if (issues.length === 0) return true;
    
    try {
      setIsExecuting(true);
      recordEvent('fix_issues', { issueCount: issues.length });
      
      const bridge = getGlobalAITerminalBridge();
      const session = globalAIBridge.createSession();
      const vfsSnapshot = bridge.getVFSSnapshot();
      const summarizedIssues = issues
        .flatMap((diagnostic) =>
          diagnostic.issues.map((issue) => {
            const loc = issue.line ? `:${issue.line}${issue.column ? `:${issue.column}` : ''}` : '';
            return `- ${diagnostic.fileId}${loc} [${issue.type}] ${issue.message}`;
          })
        )
        .join('\n');

      const aiResponse = await globalAIBridge.executeRequest(
        session.id,
        [
          'Analyze and fix these preview issues.',
          'If code changes are needed, return file updates using one of these formats:',
          '1) FILE: /src/File.tsx then a fenced code block with full file content',
          '2) fenced code block with path on the opening line, like ```tsx /src/File.tsx',
          'You can also return shell-style commands (one per line) using this command set:',
          'diagnose, deps, tree, find <pattern>, cat <path>, install <pkg>, uninstall <pkg>, writeb64 <path> <base64>.',
          '',
          'Issues:',
          summarizedIssues,
          '',
          `VFS files: ${Object.keys(vfsSnapshot).slice(0, 120).join(', ')}`,
        ].join('\n')
      );

      const parsedWrites = extractFileWritesFromAI(aiResponse.content);
      if (parsedWrites.length > 0) {
        for (const write of parsedWrites) {
          const payload = encodeUtf8Base64(write.content);
          const writeResult = await bridge.executeCommand({
            id: `preview-fix:write:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`,
            command: `writeb64 ${write.path} ${payload}`,
            reason: 'Preview AI fix apply file update',
            structured: false,
          });

          recordEvent(writeResult.success ? 'fix_file_write_succeeded' : 'fix_file_write_failed', {
            path: write.path,
            duration: writeResult.duration,
            requestId: writeResult.requestId,
          });
        }
      }

      const candidateCommands = aiResponse.content
        .split('\n')
        .map((line) => line.trim())
        .map((line) => line.replace(/^[-*\d.)\s]+/, ''))
        .filter((line) => /^(diagnose|deps|tree|find\s+|cat\s+|install\s+|uninstall\s+|writeb64\s+)/i.test(line));

      const commandsToRun = candidateCommands.length > 0
        ? candidateCommands.slice(0, 3)
        : ['diagnose'];

      let succeeded = false;
      for (const command of commandsToRun) {
        const result = await bridge.executeCommand({
          id: `preview-fix:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`,
          command,
          reason: 'Preview AI fix workflow',
          structured: false,
        });

        const commandFailed = !result.success;
        recordEvent(commandFailed ? 'fix_command_failed' : 'fix_command_succeeded', {
          command,
          duration: result.duration,
          requestId: result.requestId,
        });

        if (!commandFailed) {
          succeeded = true;
        }
      }

      recordEvent('all_issues_fixed', { succeeded, commandsExecuted: commandsToRun.length });
      return succeeded;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      recordEvent('fix_error', { error: errorMsg });
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Get VFS snapshot for analysis
  const getVFSSnapshot = useCallback((): Record<string, string> => {
    const bridge = getGlobalAITerminalBridge();
    return bridge.getVFSSnapshot();
  }, []);

  // Search VFS for code patterns
  const searchCode = useCallback((pattern: string, _content: string): Array<{ path: string; matches: string[] }> => {
    const bridge = getGlobalAITerminalBridge();
    const snapshot = bridge.getVFSSnapshot();
    const results: Array<{ path: string; matches: string[] }> = [];
    
    Object.entries(snapshot).forEach(([path, fileContent]) => {
      if (fileContent.includes(pattern)) {
        const lines = fileContent.split('\n');
        const matches = lines.filter(line => line.includes(pattern));
        if (matches.length > 0) {
          results.push({ path, matches });
        }
      }
    });
    
    return results;
  }, []);

  // Request AI help on a topic
  const requestHelp = useCallback(async (topic: string): Promise<string> => {
    try {
      recordEvent('help_requested', { topic });
      
      // Use execution bridge to get contextual help
      const bridge = getGlobalAITerminalBridge();
      const response = await bridge.requestHelp({
        type: 'suggest-command',
        problem: topic,
      });
      
      recordEvent('help_provided', { topic });
      return response.suggestion || `No help available for ${topic}`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      recordEvent('help_error', { topic, error: errorMsg });
      return `Error getting help: ${errorMsg}`;
    }
  }, []);

  // Explain an error with AI analysis
  const explainError = useCallback(async (error: string): Promise<string> => {
    try {
      recordEvent('error_explanation_requested', { error });
      
      const bridge = getGlobalAITerminalBridge();
      const response = await bridge.requestHelp({
        type: 'explain-issue',
        problem: error,
      });
      
      recordEvent('error_explained');
      return response.suggestion || 'Unable to explain error';
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      recordEvent('explanation_error', { error: errorMsg });
      return `Error explaining: ${errorMsg}`;
    }
  }, []);

  // Record event for session logging
  const recordEvent = useCallback((type: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type}${data ? ': ' + JSON.stringify(data) : ''}`;
    sessionLogsRef.current.push(logEntry);
    
    // Keep logs manageable (last 1000 entries)
    if (sessionLogsRef.current.length > 1000) {
      sessionLogsRef.current = sessionLogsRef.current.slice(-1000);
    }
  }, []);

  const getSessionLogs = useCallback(() => {
    return [...sessionLogsRef.current];
  }, []);

  const clearLogs = useCallback(() => {
    sessionLogsRef.current = [];
  }, []);

  // Initialize session on mount
  useEffect(() => {
    recordEvent('session_start', { sessionId: sessionIdRef.current });
    
    return () => {
      recordEvent('session_end', {
        commandCount: commandHistory.length,
        logCount: sessionLogsRef.current.length,
      });
    };
  }, []);

  return {
    executeCommand,
    executeRuntime,
    analyzeCurrent,
    fixIssues,
    getVFSSnapshot,
    searchCode,
    requestHelp,
    explainError,
    recordEvent,
    getSessionLogs,
    clearLogs,
    isExecuting,
    lastCommand,
    commandHistory,
    diagnostics,
  };
}
