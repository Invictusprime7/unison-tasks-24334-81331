import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyButtonBinding, detectSlotBindingViolations } from '@/services/aiBindingTool';
import type { PageRegistry } from '@/types/pageRegistry';

vi.mock('@/services/intentBindingService', () => ({
  upsertIntentBinding: vi.fn(async (b: any) => ({
    id: 'binding-1',
    businessId: b.businessId,
    projectId: b.projectId,
    pagePath: b.pagePath,
    elementKey: b.elementKey,
    elementLabel: b.elementLabel ?? null,
    intent: b.intent,
    intentConfidence: 1,
    workflowId: null,
    recipeIds: [],
    enabled: true,
    payloadSchema: b.payloadSchema ?? {},
    lastTriggeredAt: null,
    triggerCount: 0,
  })),
}));

const baseRegistry: PageRegistry = {
  pages: {
    'page-home': { id: 'page-home', slug: '/', name: 'Home' } as any,
    'page-pricing': { id: 'page-pricing', slug: '/pricing', name: 'Pricing' } as any,
  },
} as any;

const baseInput = {
  businessId: 'biz-1',
  projectId: 'proj-1',
  pagePath: '/',
  slot: 'hero.primary-cta',
};

describe('applyButtonBinding', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unknown intents before touching the database', async () => {
    const r = await applyButtonBinding(
      { ...baseInput, intent: 'totally.fake' },
      { pageRegistry: baseRegistry },
    );
    expect(r.ok).toBe(false);
    expect((r as any).code).toBe('invalid_intent');
  });

  it('requires targetPageId for nav.goto', async () => {
    const r = await applyButtonBinding(
      { ...baseInput, intent: 'nav.goto' },
      { pageRegistry: baseRegistry },
    );
    expect(r.ok).toBe(false);
    expect((r as any).code).toBe('missing_target_page');
  });

  it('rejects nav.goto pointing at a page that does not exist', async () => {
    const r = await applyButtonBinding(
      { ...baseInput, intent: 'nav.goto', targetPageId: 'page-ghost' },
      { pageRegistry: baseRegistry },
    );
    expect(r.ok).toBe(false);
    expect((r as any).code).toBe('unknown_target_page');
  });

  it('persists a valid nav.goto binding with targetPageId in payload', async () => {
    const r = await applyButtonBinding(
      { ...baseInput, intent: 'nav.goto', targetPageId: 'page-pricing' },
      { pageRegistry: baseRegistry },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.binding.payloadSchema.targetPageId).toBe('page-pricing');
  });

  it('respects an injected slotExists guard', async () => {
    const r = await applyButtonBinding(
      { ...baseInput, intent: 'contact.submit' },
      { pageRegistry: baseRegistry, slotExists: () => false },
    );
    expect(r.ok).toBe(false);
    expect((r as any).code).toBe('slot_not_found');
  });
});

describe('detectSlotBindingViolations', () => {
  const before = `
    <button data-ut-slot="hero.primary-cta" data-ut-intent="contact.submit">Get started</button>
    <a data-ut-slot="hero.secondary" href="#pricing">Pricing</a>
  `;

  it('flags inline onClick added to a slotted element', () => {
    const after = before.replace(
      'data-ut-intent="contact.submit"',
      'data-ut-intent="contact.submit" onClick={() => alert(1)}',
    );
    const v = detectSlotBindingViolations(before, after);
    expect(v.length).toBe(1);
    expect(v[0].slot).toBe('hero.primary-cta');
  });

  it('flags intent rewires on slotted elements', () => {
    const after = before.replace('contact.submit', 'booking.create');
    const v = detectSlotBindingViolations(before, after);
    expect(v.some(x => x.slot === 'hero.primary-cta')).toBe(true);
  });

  it('allows purely textual edits inside slotted elements', () => {
    const after = before.replace('Get started', 'Start free trial');
    expect(detectSlotBindingViolations(before, after)).toEqual([]);
  });

  it('allows brand-new slots (scaffold path)', () => {
    const after =
      before +
      `<button data-ut-slot="footer.cta" data-ut-intent="newsletter.subscribe">Join</button>`;
    expect(detectSlotBindingViolations(before, after)).toEqual([]);
  });

  it('flags removing or renaming existing slots', () => {
    const after = before.replace('data-ut-slot="hero.primary-cta"', 'data-ut-slot="hero.primary-renamed"');
    const v = detectSlotBindingViolations(before, after);
    expect(v.some(x => x.slot === 'hero.primary-cta')).toBe(true);
  });
});
