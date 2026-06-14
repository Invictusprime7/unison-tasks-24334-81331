import { describe, expect, it } from 'vitest';
import {
  buildUIIntentContract,
  getUIIntentProfile,
  hasUIIntentProfile,
  resolveUIIntentPlacements,
} from '@/platform/core/uiIntentProfile';
import { SALON_UI_INTENT_PROFILE } from '@/platform/core/uiIntentProfiles/salon.ui';
import type { PlaygroundBindingSpecV2, PlaygroundPageRole } from '@/types/playground';

describe('UI Intent Profile', () => {
  it('returns permissive default for unknown industry', () => {
    expect(hasUIIntentProfile('photography')).toBe(false);
    expect(hasUIIntentProfile(null)).toBe(false);
    const profile = getUIIntentProfile('photography');
    expect(profile.industry).toBe('__permissive__');
    expect(Object.keys(profile.intents)).toHaveLength(0);
  });

  it('returns salon profile when registered', () => {
    expect(hasUIIntentProfile('salon')).toBe(true);
    const profile = getUIIntentProfile('salon');
    expect(profile.industry).toBe('salon');
    expect(profile.intents['booking.create']).toBeDefined();
  });

  it('salon booking.create declares required hero/nav/services placements', () => {
    const placements = SALON_UI_INTENT_PROFILE.intents['booking.create']!.placements;
    const required = placements.filter((p) => p.required);
    const slots = required.map((p) => `${p.pageRole}/${p.section}.${p.slot}`);
    expect(slots).toContain('home/hero.primary-cta');
    expect(slots).toContain('home/navbar.primary-cta');
    expect(slots).toContain('services/services.card-cta');
  });

  it('every placement icon and label sets are non-empty', () => {
    for (const [intent, spec] of Object.entries(SALON_UI_INTENT_PROFILE.intents)) {
      for (const p of spec!.placements) {
        expect(p.icon.length, `${intent} icons`).toBeGreaterThan(0);
        expect(p.labelOptions.length, `${intent} labels`).toBeGreaterThan(0);
      }
    }
  });

  it('resolver marks covered placements and flags unsatisfied required', () => {
    const pages = new Set<PlaygroundPageRole>(['home', 'services', 'contact']);
    const bindings: PlaygroundBindingSpecV2[] = [
      {
        sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta',
        label: 'Book Now', coreIntent: 'booking.create', intent: 'calendar.open',
        targetRef: 'main_booking', uiAction: 'overlay',
      },
    ];
    const resolution = resolveUIIntentPlacements(SALON_UI_INTENT_PROFILE, bindings, pages);
    const heroCta = resolution.placements.find(
      (p) => p.pageRole === 'home' && p.section === 'hero' && p.slot === 'primary-cta',
    );
    expect(heroCta?.covered).toBe(true);
    // navbar primary-cta is required but uncovered
    const navUncovered = resolution.unsatisfiedRequired.some(
      (p) => p.pageRole === 'home' && p.section === 'navbar' && p.slot === 'primary-cta',
    );
    expect(navUncovered).toBe(true);
  });

  it('resolver respects ifPageExists', () => {
    const onlyHome = new Set<PlaygroundPageRole>(['home']);
    const resolution = resolveUIIntentPlacements(SALON_UI_INTENT_PROFILE, [], onlyHome);
    const servicesCard = resolution.placements.find(
      (p) => p.section === 'services' && p.slot === 'card-cta',
    );
    expect(servicesCard).toBeUndefined();
  });

  it('buildUIIntentContract emits prompt block with required markers and label sets', () => {
    const pages = new Set<PlaygroundPageRole>(['home', 'services']);
    const resolution = resolveUIIntentPlacements(SALON_UI_INTENT_PROFILE, [], pages);
    const contract = buildUIIntentContract('salon', resolution);
    expect(contract).toContain('UI INTENT CONTRACT');
    expect(contract).toContain('[REQUIRED] booking.create');
    expect(contract).toContain('"Book Now"');
    expect(contract).toContain('Calendar');
    expect(contract).toContain('affordance=button');
  });

  it('buildUIIntentContract returns empty for unmigrated industry', () => {
    const pages = new Set<PlaygroundPageRole>(['home']);
    const profile = getUIIntentProfile('photography');
    const resolution = resolveUIIntentPlacements(profile, [], pages);
    expect(buildUIIntentContract('photography', resolution)).toBe('');
  });
});
