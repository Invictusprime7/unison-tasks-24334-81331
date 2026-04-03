/**
 * useWizardAI Hook
 * 
 * Bridges SystemLauncher wizard with AI execution system.
 * Provides simplified interface for multi-step AI operations during site generation
 * and allows wizard steps to trigger AI analysis, code generation, and optimization.
 * 
 * This hook wraps aiTaskExecutor with wizard-specific context awareness.
 */

import { useState, useCallback, useRef } from 'react';
import { AITaskExecutor, type TaskStep } from '@/services/aiTaskExecutor';
import { getGlobalAITerminalBridge } from '@/services/aiTerminalBridge';
import type { LaunchBlueprint } from '@/types/launchState';

// ============================================================================
// Types
// ============================================================================

export interface WizardAIOptions {
  businessName: string;
  systemType: string;
  blueprint: LaunchBlueprint;
  aesthetic?: string;
  customPrompt?: string;
}

export interface WizardAIResult {
  success: boolean;
  code?: string;
  files?: Record<string, string>;
  error?: string;
  executionTime?: number;
}

export interface UseWizardAIReturn {
  // Operation triggers
  generateDesign: (prompt: string) => Promise<WizardAIResult>;
  generateCode: (sections: string[], styling?: string) => Promise<WizardAIResult>;
  optimizeUX: (currentCode: string) => Promise<WizardAIResult>;
  analyzeTemplate: (code: string) => Promise<WizardAIResult>;
  
  // Status tracking
  isExecuting: boolean;
  currentTask: string | null;
  progress: number; // 0-100
  errors: string[];
  
  // Session management
  cancelTask: () => void;
  clearErrors: () => void;
  getExecutionHistory: () => string[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWizardAI(options: WizardAIOptions): UseWizardAIReturn {
  const executorRef = useRef<AITaskExecutor | null>(null);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  
  const executionHistoryRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize executor on first use
  const getExecutor = useCallback(() => {
    if (!executorRef.current) {
      const bridge = getGlobalAITerminalBridge();
      executorRef.current = new AITaskExecutor({
        sessionId: `wizard:${options.businessName}:${Date.now()}`,
        debug: true,
        tools: {
          executeCommand: (cmd: string) => bridge.executeCommand(cmd),
          getVFSSnapshot: () => bridge.getVFSSnapshot(),
          searchCode: (pattern: string) => bridge.searchVFS(pattern),
        },
      });
    }
    return executorRef.current;
  }, [options.businessName]);

  // Helper: Execute a task with error handling and progress tracking
  const executeTask = useCallback(
    async (taskName: string, steps: TaskStep[], timeoutMs: number = 30000): Promise<WizardAIResult> => {
      const startTime = Date.now();
      
      try {
        setIsExecuting(true);
        setCurrentTask(taskName);
        setProgress(0);
        setErrors([]);
        
        const executor = getExecutor();
        
        // Execute the task with timeout
        const resultPromise = executor.execute({
          name: taskName,
          description: taskName,
          steps,
          context: {
            blueprint: options.blueprint,
            businessName: options.businessName,
            systemType: options.systemType,
            aesthetic: options.aesthetic,
          },
        });

        // Wrap with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Task '${taskName}' timed out after ${timeoutMs}ms`));
          }, timeoutMs);
          abortControllerRef.current = new AbortController();
        });

        const result = await Promise.race([resultPromise, timeoutPromise]);

        const executionTime = Date.now() - startTime;
        executionHistoryRef.current.push(`${taskName} (${executionTime}ms)`);

        setProgress(100);
        setCurrentTask(null);
        setIsExecuting(false);

        return {
          success: true,
          code: result.output?.code,
          files: result.output?.files,
          executionTime,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setErrors((prev) => [...prev, errorMsg]);
        setCurrentTask(null);
        setIsExecuting(false);

        return {
          success: false,
          error: errorMsg,
        };
      }
    },
    [options, getExecutor]
  );

  // Generate design variations based on aesthetic preferences
  const generateDesign = useCallback(
    async (prompt: string): Promise<WizardAIResult> => {
      const steps: TaskStep[] = [
        {
          type: 'context',
          name: 'Load Design Context',
          input: {
            blueprint: options.blueprint,
            aesthetic: options.aesthetic,
          },
        },
        {
          type: 'command',
          name: 'Analyze User Preferences',
          input: prompt,
        },
        {
          type: 'analysis',
          name: 'Generate Design System',
          input: {
            aesthetic: options.aesthetic,
            prompt,
          },
        },
      ];

      return executeTask('generateDesign', steps, 25000);
    },
    [options, executeTask]
  );

  // Generate code for specific sections
  const generateCode = useCallback(
    async (sections: string[], styling?: string): Promise<WizardAIResult> => {
      const steps: TaskStep[] = [
        {
          type: 'context',
          name: 'Load Blueprint',
          input: { blueprint: options.blueprint },
        },
        {
          type: 'tool',
          name: 'Generate Section Code',
          toolName: 'code-generator',
          input: {
            sections,
            styling,
            systemType: options.systemType,
            businessName: options.businessName,
          },
        },
      ];

      return executeTask('generateCode', steps, 30000);
    },
    [options, executeTask]
  );

  // Optimize UX of existing code
  const optimizeUX = useCallback(
    async (currentCode: string): Promise<WizardAIResult> => {
      const steps: TaskStep[] = [
        {
          type: 'analysis',
          name: 'Analyze Current Code',
          input: { code: currentCode },
        },
        {
          type: 'tool',
          toolName: 'ux-analyzer',
          name: 'Generate UX Improvements',
          input: {
            code: currentCode,
            systemType: options.systemType,
          },
        },
      ];

      return executeTask('optimizeUX', steps, 30000);
    },
    [options, executeTask]
  );

  // Analyze template for consistency and improvements
  const analyzeTemplate = useCallback(
    async (code: string): Promise<WizardAIResult> => {
      const steps: TaskStep[] = [
        {
          type: 'analysis',
          name: 'Template Analysis',
          input: { code, blueprint: options.blueprint },
        },
        {
          type: 'skill',
          skillName: 'Code Analysis',
          name: 'Detailed Assessment',
          input: {
            code,
            focus: ['performance', 'a11y', 'seo'],
          },
        },
      ];

      return executeTask('analyzeTemplate', steps, 25000);
    },
    [options, executeTask]
  );

  const cancelTask = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExecuting(false);
    setCurrentTask(null);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getExecutionHistory = useCallback(
    () => executionHistoryRef.current,
    []
  );

  return {
    generateDesign,
    generateCode,
    optimizeUX,
    analyzeTemplate,
    isExecuting,
    currentTask,
    progress,
    errors,
    cancelTask,
    clearErrors,
    getExecutionHistory,
  };
}
