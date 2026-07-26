import { describe, expect, it } from 'vitest';
import { resolveCapabilityIntentBindings } from '@/services/capabilityIntentBindingResolver';

describe('resolveCapabilityIntentBindings', () => {
  it('stamps a concrete service-card action slot and booking intent', () => {
    const result = resolveCapabilityIntentBindings([
      { target: 'service-card.primary-action', intent: 'booking.create' },
    ], {
      '/src/pages/Services.tsx': '<button className="cta primary">Book this service</button>',
    });

    expect(result.unresolved).toEqual([]);
    expect(result.resolved).toEqual([{
      symbolicTarget: 'service-card.primary-action',
      filePath: '/src/pages/Services.tsx',
      slot: 'service-card.primary-action',
      intent: 'booking.create',
    }]);
    expect(result.files['/src/pages/Services.tsx']).toContain('data-ut-slot="service-card.primary-action"');
    expect(result.files['/src/pages/Services.tsx']).toContain('data-ut-intent="booking.create"');
  });

  it('leaves a plan unresolved when no concrete target exists', () => {
    const result = resolveCapabilityIntentBindings([
      { target: 'service-card.primary-action', intent: 'booking.create' },
    ], { '/src/pages/Home.tsx': '<main>Welcome</main>' });

    expect(result.resolved).toEqual([]);
    expect(result.unresolved).toHaveLength(1);
  });
});