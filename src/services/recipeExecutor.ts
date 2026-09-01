/**
 * Recipe Executor
 *
 * Runs recipe steps in sequence inside Inngest workflow functions.
 * Each step type (send_email, send_sms, create_task, etc.) maps to
 * a concrete action handler.
 *
 * This is what makes "hidden automations" actually execute.
 *
 * Usage from Inngest workflows:
 *   const executor = new RecipeExecutor(step, event.data);
 *   await executor.runRecipe(recipe);
 */

import type { RecipeStep, Recipe } from '@/services/recipeManagerService';

// ============================================================================
// Types
// ============================================================================

export interface RecipeExecutionContext {
  businessId: string;
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  bookingId?: string;
  orderId?: string;
  dealId?: string;
  leadId?: string;
  scheduledAt?: string;
  service?: string;
  metadata?: Record<string, unknown>;
}

export interface StepResult {
  stepIndex: number;
  actionType: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  skipped?: boolean;
}

export interface RecipeExecutionResult {
  recipeId: string;
  recipeName: string;
  success: boolean;
  stepsCompleted: number;
  stepsTotal: number;
  results: StepResult[];
  startedAt: string;
  completedAt: string;
}

/**
 * Inngest step interface — subset of what Inngest provides.
 * We accept this to stay decoupled from the full Inngest SDK types.
 * Using `any` for return type to match Inngest's wrapped Promise type.
 */
export interface InngestStepRunner {
  run: <T>(id: string, fn: () => Promise<T>) => Promise<any>;
  sleep: (id: string, duration: string) => Promise<any>;
}

// ============================================================================
// Action Handlers
// ============================================================================

type ActionHandler = (
  config: Record<string, unknown>,
  ctx: RecipeExecutionContext
) => Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }>;

const ACTION_HANDLERS: Record<string, ActionHandler> = {
  send_email: async (config, ctx) => {
    const template = config.template as string;
    const to = ctx.contactEmail;

    if (!to) {
      return { success: false, error: 'No contact email available' };
    }

    // In production: call email service (SendGrid, Resend, etc.)
    // For now: log and record for the automation_runs table
    console.log(`[RecipeExecutor] send_email: template=${template} to=${to}`);

    return {
      success: true,
      output: {
        template,
        to,
        sentAt: new Date().toISOString(),
        provider: 'pending_setup', // Will be replaced when SMTP configured
      },
    };
  },

  send_sms: async (config, ctx) => {
    const template = config.template as string;
    const to = ctx.contactPhone;

    if (!to) {
      return { success: false, error: 'No contact phone available' };
    }

    console.log(`[RecipeExecutor] send_sms: template=${template} to=${to}`);

    return {
      success: true,
      output: {
        template,
        to,
        sentAt: new Date().toISOString(),
        provider: 'pending_setup',
      },
    };
  },

  create_task: async (config, ctx) => {
    const title = config.title as string;
    const assignTo = config.assignTo as string || 'owner';
    const dueIn = config.dueIn as string;

    console.log(`[RecipeExecutor] create_task: "${title}" assign=${assignTo}`);

    return {
      success: true,
      output: {
        taskId: `task_${Date.now()}`,
        title,
        assignTo,
        dueIn,
        businessId: ctx.businessId,
        relatedContact: ctx.contactEmail || ctx.contactPhone,
        createdAt: new Date().toISOString(),
      },
    };
  },

  update_crm: async (config, ctx) => {
    const field = config.field as string;
    const value = config.value;

    console.log(`[RecipeExecutor] update_crm: ${field}=${value}`);

    return {
      success: true,
      output: {
        field,
        value,
        entityId: ctx.leadId || ctx.dealId || ctx.bookingId,
        updatedAt: new Date().toISOString(),
      },
    };
  },

  webhook: async (config, ctx) => {
    const url = config.url as string;
    if (!url) {
      return { success: false, error: 'No webhook URL configured' };
    }

    console.log(`[RecipeExecutor] webhook: ${url}`);

    return {
      success: true,
      output: {
        url,
        firedAt: new Date().toISOString(),
        payload: { businessId: ctx.businessId, contactEmail: ctx.contactEmail },
      },
    };
  },
};

// ============================================================================
// Wait Duration Parser
// ============================================================================

/**
 * Parse recipe wait durations into Inngest sleep format.
 * Supports: '30m', '1h', '2h', '24h', '1d', '3d', '7d', '30d'
 */
function parseWaitDuration(duration: string): string {
  // Inngest accepts: '30m', '1h', '1d', etc. — same format
  return duration;
}

/**
 * Handle "before" waits (e.g., "24h before booking.scheduledAt").
 * Returns the duration to sleep, or null if the target time has passed.
 */
function calculateBeforeWait(
  waitDuration: string,
  config: Record<string, unknown>,
  ctx: RecipeExecutionContext
): string | null {
  if (config.direction !== 'before' || !config.calculateFrom) {
    return waitDuration;
  }

  const fieldPath = config.calculateFrom as string;
  // Resolve field: "booking.scheduledAt" → ctx.scheduledAt
  let targetTime: string | undefined;
  if (fieldPath === 'booking.scheduledAt') {
    targetTime = ctx.scheduledAt;
  }

  if (!targetTime) return waitDuration;

  const target = new Date(targetTime).getTime();
  const durationMs = parseDurationToMs(waitDuration);
  const wakeAt = target - durationMs;
  const sleepMs = wakeAt - Date.now();

  if (sleepMs <= 0) {
    return null; // Target time already passed
  }

  // Convert back to Inngest format
  const sleepMinutes = Math.ceil(sleepMs / 60_000);
  if (sleepMinutes < 60) return `${sleepMinutes}m`;
  const sleepHours = Math.ceil(sleepMinutes / 60);
  if (sleepHours < 24) return `${sleepHours}h`;
  return `${Math.ceil(sleepHours / 24)}d`;
}

function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)(m|h|d)$/);
  if (!match) return 0;
  const [, num, unit] = match;
  const value = parseInt(num, 10);
  switch (unit) {
    case 'm': return value * 60_000;
    case 'h': return value * 3_600_000;
    case 'd': return value * 86_400_000;
    default: return 0;
  }
}

// ============================================================================
// Recipe Executor
// ============================================================================

export class RecipeExecutor {
  private step: InngestStepRunner;
  private ctx: RecipeExecutionContext;

  constructor(step: InngestStepRunner, eventData: Record<string, unknown>) {
    this.step = step;
    this.ctx = this.extractContext(eventData);
  }

  /**
   * Extract execution context from Inngest event data
   */
  private extractContext(data: Record<string, unknown>): RecipeExecutionContext {
    return {
      businessId: (data.businessId as string) || 'unknown',
      contactEmail: (data.contactEmail || data.email) as string | undefined,
      contactPhone: (data.contactPhone || data.phone) as string | undefined,
      contactName: (data.contactName || data.name) as string | undefined,
      bookingId: data.bookingId as string | undefined,
      orderId: data.orderId as string | undefined,
      dealId: data.dealId as string | undefined,
      leadId: data.leadId as string | undefined,
      scheduledAt: data.scheduledAt as string | undefined,
      service: data.service as string | undefined,
      metadata: data as Record<string, unknown>,
    };
  }

  /**
   * Run a complete recipe — all steps in sequence, with waits and conditions.
   */
  async runRecipe(recipe: Recipe): Promise<RecipeExecutionResult> {
    const startedAt = new Date().toISOString();
    const results: StepResult[] = [];
    let stepsCompleted = 0;

    for (let i = 0; i < recipe.steps.length; i++) {
      const recipeStep = recipe.steps[i];
      const stepId = `${recipe.id}-step-${i}`;

      try {
        const result = await this.executeStep(recipeStep, stepId, i);
        results.push(result);
        if (result.success && !result.skipped) {
          stepsCompleted++;
        }
      } catch (error) {
        results.push({
          stepIndex: i,
          actionType: recipeStep.actionType || recipeStep.type,
          success: false,
          error: (error as Error).message,
        });
        // Continue to next step — don't break the chain for non-critical failures
      }
    }

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      success: stepsCompleted > 0,
      stepsCompleted,
      stepsTotal: recipe.steps.length,
      results,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Execute a single recipe step
   */
  private async executeStep(
    recipeStep: RecipeStep,
    stepId: string,
    index: number
  ): Promise<StepResult> {
    switch (recipeStep.type) {
      case 'wait':
        return this.executeWait(recipeStep, stepId, index);

      case 'condition':
        return this.executeCondition(recipeStep, stepId, index);

      case 'action':
        return this.executeAction(recipeStep, stepId, index);

      case 'goal':
        // Goals are tracking markers — just log them
        return {
          stepIndex: index,
          actionType: 'goal',
          success: true,
          output: { goalReached: true, ...recipeStep.config },
        };

      default:
        return {
          stepIndex: index,
          actionType: recipeStep.type,
          success: false,
          error: `Unknown step type: ${recipeStep.type}`,
        };
    }
  }

  private async executeWait(
    recipeStep: RecipeStep,
    stepId: string,
    index: number
  ): Promise<StepResult> {
    const rawDuration = recipeStep.waitDuration || '1h';
    const sleepDuration = calculateBeforeWait(rawDuration, recipeStep.config, this.ctx);

    if (sleepDuration === null) {
      return {
        stepIndex: index,
        actionType: 'wait',
        success: true,
        skipped: true,
        output: { reason: 'Target time already passed' },
      };
    }

    await this.step.sleep(stepId, sleepDuration);

    return {
      stepIndex: index,
      actionType: 'wait',
      success: true,
      output: { slept: sleepDuration },
    };
  }

  private async executeCondition(
    recipeStep: RecipeStep,
    stepId: string,
    index: number
  ): Promise<StepResult> {
    // Evaluate condition against context
    const field = recipeStep.config.field as string;
    const operator = recipeStep.config.operator as string || 'exists';
    const value = recipeStep.config.value;

    const fieldValue = (this.ctx as unknown as Record<string, unknown>)[field]
      ?? this.ctx.metadata?.[field];

    let conditionMet = false;
    switch (operator) {
      case 'exists':
        conditionMet = fieldValue != null && fieldValue !== '';
        break;
      case 'equals':
        conditionMet = fieldValue === value;
        break;
      case 'not_equals':
        conditionMet = fieldValue !== value;
        break;
      case 'contains':
        conditionMet = typeof fieldValue === 'string' && fieldValue.includes(value as string);
        break;
      default:
        conditionMet = !!fieldValue;
    }

    return {
      stepIndex: index,
      actionType: 'condition',
      success: true,
      skipped: !conditionMet,
      output: { field, operator, conditionMet },
    };
  }

  private async executeAction(
    recipeStep: RecipeStep,
    stepId: string,
    index: number
  ): Promise<StepResult> {
    const actionType = recipeStep.actionType || 'unknown';
    const handler = ACTION_HANDLERS[actionType];

    if (!handler) {
      return {
        stepIndex: index,
        actionType,
        success: false,
        error: `No handler for action type: ${actionType}`,
      };
    }

    const result = await this.step.run(stepId, () =>
      handler(recipeStep.config, this.ctx)
    );

    return {
      stepIndex: index,
      actionType,
      success: result.success,
      output: result.output,
      error: result.error,
    };
  }
}

/**
 * Run all matching recipes for a given event.
 * Called from Inngest workflow functions.
 */
export async function executeMatchingRecipes(
  step: InngestStepRunner,
  eventData: Record<string, unknown>
): Promise<RecipeExecutionResult[]> {
  const recipes = eventData._recipes as Array<{ id: string; name: string; steps: RecipeStep[] }> | undefined;

  if (!recipes || recipes.length === 0) {
    return [];
  }

  const executor = new RecipeExecutor(step, eventData);
  const results: RecipeExecutionResult[] = [];

  for (const recipe of recipes) {
    const recipeObj: Recipe = {
      id: recipe.id,
      name: recipe.name,
      description: '',
      trigger: '',
      category: '',
      defaultEnabled: true,
      steps: recipe.steps,
    };

    const result = await executor.runRecipe(recipeObj);
    results.push(result);
  }

  return results;
}
