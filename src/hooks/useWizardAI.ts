/**
 * useWizardAI Hook
 * 
 * Bridges SystemLauncher wizard with AI execution system.
 * Provides simplified interface for multi-step AI operations during site generation
 * and allows wizard steps to trigger AI analysis, code generation, and optimization.
 * 
 * This hook wraps AITaskExecutor with wizard-specific context awareness.
 */

import { useState, useCallback, useRef } from 'react';
import { AITaskExecutor, type TaskStep, type TaskResult } from '@/services/aiTaskExecutor';
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
      executorRef.current = new AITaskExecutor();
    }
    return executorRef.current;
  }, []);

  // Helper: Execute a task with error handling and progress tracking
  const executeAITask = useCallback(
    async (taskName: string, steps: TaskStep[], timeoutMs: number = 30000): Promise<WizardAIResult> => {
      const startTime = Date.now();
      
      try {
        setIsExecuting(true);
        setCurrentTask(taskName);
        setProgress(0);
        setErrors([]);
        
        const executor = getExecutor();
        
        // Create task with proper ID generation
        const taskId = `wizard:${taskName}:${Date.now()}`;
        
        // Add required id and status fields to each step
        const stepsWithMeta: TaskStep[] = steps.map((step, idx) => ({
          ...step,
          id: step.id || `step_${idx}`,
          status: (step.status || 'pending') as TaskStep['status'],
        }));

        // Create task first, then execute by returned task id.
        const created = await executor.executeToolCall('create_task', {
          name: taskName,
          description: `Wizard AI task for ${options.businessName} (${options.systemType})`,
          steps: stepsWithMeta.map((step) => ({
            name: step.name,
            type: step.type,
            input: step.input,
          })),
        }) as { taskId?: string };

        const runnableTaskId = created?.taskId || taskId;
        const resultPromise = executor.executeTask(runnableTaskId);

        // Wrap with timeout
        const timeoutPromise = new Promise<TaskResult>((_, reject) => {
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
          success: result.success,
          executionTime,
          error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
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
    [getExecutor, options.businessName, options.systemType]
  );

  // Generate design variations based on aesthetic preferences
  const generateDesign = useCallback(
    async (prompt: string): Promise<WizardAIResult> => {
      const steps: TaskStep[] = [
        {
          id: 'analyze_aesthetic',
          type: 'analyze',
          name: 'Analyze User Preferences',
          input: prompt,
          status: 'pending',
        },
        {
          id: 'design_system',
          type: 'command',
          name: 'Generate Design System',
          input: `echo "Generating design for aesthetic: ${options.aesthetic}"`,
          status: 'pending',
        },
      ];

      return executeAITask('generateDesign', steps, 25000);
    },
    [options.aesthetic, executeAITask]
  );

  // Generate code for specific sections
  const generateCode = useCallback(
    async (sections: string[], styling?: string): Promise<WizardAIResult> => {
      const sectionList = sections.join(', ');
      const steps: TaskStep[] = [
        {
          id: 'load_blueprint',
          type: 'analyze',
          name: 'Load Blueprint',
          input: `Load context for sections: ${sectionList}`,
          status: 'pending',
        },
        {
          id: 'generate_sections',
          type: 'command',
          name: 'Generate Section Code',
          input: `Generate TSX components for: ${sectionList}${styling ? ` with styling: ${styling}` : ''}`,
          status: 'pending',
        },
      ];

      return executeAITask('generateCode', steps, 30000);
    },
    [executeAITask]
  );

  // Optimize UX of existing code
  const optimizeUX = useCallback(
    async (currentCode: string): Promise<WizardAIResult> => {
      const codeLength = currentCode.length;
      const steps: TaskStep[] = [
        {
          id: 'analyze_code',
          type: 'analyze',
          name: 'Analyze Current Code',
          input: `Analyze code of length ${codeLength}`,
          status: 'pending',
        },
        {
          id: 'suggest_improvements',
          type: 'help-request',
          name: 'Generate UX Improvements',
          input: `Suggest UX improvements for code of length ${codeLength}`,
          status: 'pending',
        },
      ];

      return executeAITask('optimizeUX', steps, 30000);
    },
    [executeAITask]
  );

  // Analyze template for consistency and improvements
  const analyzeTemplate = useCallback(
    async (code: string): Promise<WizardAIResult> => {
      const codeLength = code.length;
      const steps: TaskStep[] = [
        {
          id: 'template_analysis',
          type: 'analyze',
          name: 'Template Analysis',
          input: `Analyze template code of length ${codeLength}`,
          status: 'pending',
        },
        {
          id: 'detailed_assessment',
          type: 'help-request',
          name: 'Detailed Assessment',
          input: `Assess: performance, accessibility, SEO for code of length ${codeLength}`,
          status: 'pending',
        },
      ];

      return executeAITask('analyzeTemplate', steps, 25000);
    },
    [executeAITask]
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
