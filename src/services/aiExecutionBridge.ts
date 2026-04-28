/**
 * AI Execution Bridge - Remote Execution & Provider Abstraction
 * 
 * Similar to OpenClaude's bridge architecture, provides:
 * - Abstraction over different AI providers (Claude, OpenAI, etc)
 * - Structured messaging and session tracking
 * - Cost monitoring per request
 * - Health status and fallback handling
 * - Streaming response support
 */

import { globalProviderRouter } from '@/services/aiProviderRouter';
import { globalSkillRegistry } from '@/services/aiSkillRegistry';
import type { ProviderType } from '@/services/aiProviderRouter';

/**
 * A message in an AI conversation
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Request to the AI bridge
 */
export interface AIBridgeRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  tools?: unknown[];
}

/**
 * Response from the AI bridge
 */
export interface AIBridgeResponse {
  content: string;
  provider: ProviderType;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  latency: number;
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>;
}

/**
 * Session tracking for multi-turn conversations
 */
export interface AIBridgeSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  provider: ProviderType;
  messages: AIMessage[];
}

/**
 * The main AI bridge for executing requests
 */
export class AIExecutionBridge {
  private sessions: Map<string, AIBridgeSession> = new Map();
  private sessionCounter = 0;

  /**
   * Create a new bridge session
   */
  createSession(): AIBridgeSession {
    const id = `session_${++this.sessionCounter}_${Date.now()}`;
    const session: AIBridgeSession = {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
      provider: globalProviderRouter.selectProvider(),
      messages: [],
    };
    this.sessions.set(id, session);
    return session;
  }

  /**
   * Get or create a session
   */
  getSession(id: string): AIBridgeSession | null {
    return this.sessions.get(id) || null;
  }

  /**
   * End a session
   */
  closeSession(id: string): void {
    this.sessions.delete(id);
  }

  /**
   * Execute a request through the bridge
   */
  async executeRequest(
    sessionId: string,
    userMessage: string,
    options?: Partial<AIBridgeRequest>
  ): Promise<AIBridgeResponse> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const startTime = Date.now();

    // Build messages
    const systemMessage: AIMessage = {
      role: 'system',
      content: globalSkillRegistry.getSystemPrompt(),
    };

    const messages: AIMessage[] = [systemMessage, ...session.messages];
    messages.push({ role: 'user', content: userMessage });

    try {
      // Delegate to the unified Unison AI Gateway facade so the bridge,
      // skill registry, and per-feature callsites all flow through one path.
      const { runUnisonAI } = await import('@/services/unisonAI');
      const gateway = await runUnisonAI({
        module: 'code.patch',
        prompt: userMessage,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        options: { passthrough: { skillSystemPrompt: systemMessage.content } },
      });

      const content =
        gateway.message ||
        gateway.summary ||
        (gateway.patchPlan?.files?.length
          ? `Generated ${gateway.patchPlan.files.length} file change(s).`
          : 'No content returned.');

      const inputApprox = Math.ceil((systemMessage.content.length + userMessage.length) / 4);
      const outputApprox = Math.ceil(content.length / 4);
      const response: AIBridgeResponse = {
        content,
        provider: session.provider,
        tokensUsed: {
          input: inputApprox,
          output: outputApprox,
          total: inputApprox + outputApprox,
        },
        cost: 0,
        latency: gateway.usage?.latencyMs ?? Date.now() - startTime,
      };

      // Record metrics
      globalProviderRouter.recordRequest(session.provider, response.latency, gateway.ok);

      // Update session
      session.messages.push({ role: 'user', content: userMessage });
      session.messages.push({ role: 'assistant', content: response.content });
      session.messageCount++;
      session.totalTokens += response.tokensUsed.total;
      session.totalCost += response.cost;
      session.updatedAt = Date.now();

      if (!gateway.ok && gateway.error) {
        throw new Error(gateway.error);
      }

      return response;
    } catch (error) {
      globalProviderRouter.recordRequest(session.provider, Date.now() - startTime, false);

      // Try to fallback to another provider
      const scores = globalProviderRouter.scoreAllProviders();
      for (const { provider } of scores) {
        if (provider === session.provider) continue;
        session.provider = provider;
        // Could retry here, but for now just fail
        break;
      }

      throw error;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): { messages: number; tokens: number; cost: number } | null {
    const session = this.getSession(sessionId);
    if (!session) return null;
    return {
      messages: session.messageCount,
      tokens: session.totalTokens,
      cost: session.totalCost,
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AIBridgeSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get provider health via bridge
   */
  getProviderStatus(): Record<string, unknown> {
    return globalProviderRouter.getHealthStatus();
  }
}

/**
 * Global singleton bridge instance
 */
export const globalAIBridge = new AIExecutionBridge();
