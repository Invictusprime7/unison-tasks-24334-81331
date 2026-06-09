---
name: Industry Intent Profiles (Unified)
description: One source of truth per industry. INDUSTRY_INTENT_PROFILES[industry].intents map declares level + synthesize for each CoreIntent; legacy required/primary/secondary/optional/forbidden arrays auto-derived. synthesizeIndustryBindings() runs in wizardCapabilityResolver before return — strips forbidden, stamps missing required/secondary onto canonical slot coords. Salon fully migrated; other industries still legacy arrays (synthesis no-ops).
type: feature
---

# Unified industry intent profile

File: `src/platform/core/industryIntentProfiles.ts`

## Shape
```ts
INDUSTRY_INTENT_PROFILES.salon = profileFromMap('salon', {
  'booking.create': {
    level: 'required',
    synthesize: [
      { pageRole, section, slot, ifPageExists?, label?, intent?, targetRef?, uiAction?, payloadTemplate? },
      ...
    ],
  },
  'quote.request': { level: 'forbidden' },
  ...
});
```

`profileFromMap` derives the flat `required/primary/secondary/optional/forbidden` arrays from `intents` for back-compat. Industries without an `intents` map keep shipping the legacy arrays only.

## Resolver wiring
`wizardCapabilityResolver.resolveCapabilities()` calls `synthesizeIndustryBindings(profile, bindingSpecsV2, { availablePageRoles })` right before return. Returns:
- `kept`: existing bindings minus any whose `coreIntent` is in `profile.forbidden`
- `synthesized`: new `PlaygroundBindingSpecV2[]` for any required/primary/secondary intent whose canonical slots are not occupied (respects `ifPageExists`)
- `unsatisfiedRequired`: required intents nothing could cover (publish-blocker signal)
- `strippedForbidden`: removed bindings (audit)

Idempotent: running twice yields the same result (slot occupancy check covers both `kept` and previously synthesized).

## Slot vocabulary additions
Added to `BindingSlotRole`: `newsletter-submit`, `phone-link`, `email-link`, `address-link` so footer secondary intents (contact.call, location.directions, newsletter.subscribe) have canonical coords.

## How to add an industry intent
One line in the `intents` map of the relevant profile. Validation + synthesis both pick it up; no separate fallback recipe table to keep in sync.
