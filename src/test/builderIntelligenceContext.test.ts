import { describe, expect, it } from 'vitest';

import { shrinkBuilderTurnPayload } from '@/services/builderPayloadBudget';
import { buildUnisonAIContext } from '@/unison/aiContext';
import type { TaskPlan } from '@/unison/nlTypes';

const plan: TaskPlan = {
  planId: 'plan-1',
  route: 'builder.edit',
  intent: {
    primaryIntent: 'Improve the checkout flow',
    secondaryIntents: ['intent.bind'],
    targetScope: 'page',
    targetFiles: ['/src/pages/Checkout.tsx'],
    targetPageIds: ['checkout'],
    targetSections: ['payment'],
    confidence: 0.94,
    entities: { pageTitle: 'Checkout', intentName: 'checkout.submit' },
    requestedOutcome: 'A validated checkout interaction',
    constraints: ['Preserve the current theme'],
    requiresClarification: false,
  },
  steps: [{
    id: 'step-1',
    type: 'patch',
    description: 'Patch the checkout form',
    targets: ['/src/pages/Checkout.tsx'],
    dependsOn: [],
    complexity: 4,
    status: 'running',
    startedAt: '2026-01-01T00:00:00.000Z',
  }],
  estimatedComplexity: 13,
  requiresUserConfirmation: false,
};

describe('builder intelligence context', () => {
  it('keeps semantic facts and removes mutable execution state', () => {
    const context = buildUnisonAIContext(plan);

    expect(context).toMatchObject({
      route: 'builder.edit',
      primaryIntent: 'Improve the checkout flow',
      estimatedComplexity: 13,
      targetFiles: ['/src/pages/Checkout.tsx'],
    });
    expect(context.steps[0]).not.toHaveProperty('status');
    expect(context.steps[0]).not.toHaveProperty('startedAt');
  });

  it('preserves the semantic contract when optional VFS context is trimmed', () => {
    const unisonContext = buildUnisonAIContext(plan);
    const result = shrinkBuilderTurnPayload({
      messages: [{ role: 'user', content: 'Improve checkout' }],
      requestEnvelope: { requestKinds: ['builder.edit'] },
      unisonContext,
      vfsFiles: {
        '/src/pages/Checkout.tsx': 'x'.repeat(30_000),
        '/src/pages/Other.tsx': 'y'.repeat(30_000),
      },
    }, 8_000);

    expect(result.payload.unisonContext).toEqual(unisonContext);
    expect(result.payload.requestEnvelope).toEqual({ requestKinds: ['builder.edit'] });
    expect(result.trimmed.some((entry) => entry.startsWith('vfsFiles'))).toBe(true);
  });
});