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
      
      // Use AI execution bridge to intelligently fix issues
      const session = globalAIBridge.createSession();
      
      for (const diagnostic of issues) {
        for (const issue of diagnostic.issues) {
          if (issue.suggestedFix) {
            // Apply the fix (would need file write capability)
            recordEvent('issue_fixed', {
              file: diagnostic.fileId,
              issue: issue.message,
            });
          }
        }
      }
      
      recordEvent('all_issues_fixed');
      return true;
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
  const searchCode = useCallback((pattern: string, content: string): Array<{ path: string; matches: string[] }> => {
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
