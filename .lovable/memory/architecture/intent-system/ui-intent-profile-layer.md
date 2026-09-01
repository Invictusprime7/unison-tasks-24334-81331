---
name: UI Intent Profile Layer
description: Per-industry contract declaring affordance/icon/variant/label authority for each canonical intent placement; orchestrated by System Launcher via bindingGuide prompt injection.
type: feature
---

# UI Intent Profile Layer (v1)

Sits between `IndustryIntentProfile` (which intents must exist) and rendered section components (what gets drawn). The industry intent profile says "salon must surface booking.create"; the UI intent profile says "and it must be a primary Button sized lg with a `Calendar` icon and label from {Book Now, Reserve, Schedule Visit}, on home/hero.primary-cta, home/navbar.primary-cta, and services/services.card-cta".

## Files

- `src/platform/core/uiIntentProfile.ts` — schema, registry, resolver (`resolveUIIntentPlacements`), prompt builder (`buildUIIntentContract`).
- `src/platform/core/uiIntentProfiles/salon.ui.ts` — salon profile (booking.create, contact.call, contact.email, location.directions, newsletter.subscribe, favorite.toggle, share.open).
- `src/platform/core/uiIntentProfiles/index.ts` — re-exports.

## Shape

```ts
UIIntentProfile {
  industry,
  intents: { [coreIntent]: { placements: UIIntentPlacement[] } }
}
UIIntentPlacement {
  pageRole | '*', section, slot,
  affordance: button|icon-button|link|menu-item|card-cta|form-submit,
  icon: string[],          // allowed lucide-react names (first = canonical)
  labelOptions: string[],  // allowed copy (first = canonical)
  variant?, size?, required, ifPageExists?
}
```

## Flow

1. Wizard runs `resolveCapabilities` → bindings list.
2. `buildWizardBindingGuide(snapshot, { industry })` calls `resolveUIIntentPlacements(profile, bindings, availablePages)` then `buildUIIntentContract(industry, resolution)` and appends the `--- UI INTENT CONTRACT ---` block to the bindingGuide string.
3. The bindingGuide already flows into the Lane B wizard seed prompt → AI honors required placements, label set, icon set, affordance.
4. Permissive default profile (`__permissive__`) for unmigrated industries — no contract block, no regression.

## Resolver

`resolveUIIntentPlacements(profile, bindings, availablePageRoles)` returns:
- `placements` — every applicable placement with `covered` flag.
- `unsatisfiedRequired` — required placements not yet covered by any binding (publish-gate signal; not yet wired to publish gate in v1).
- Honors `ifPageExists` and wildcard `pageRole: '*'`.

## v1 scope

- Salon only. Other industries fall through to permissive default.
- Prompt contract is the enforcement mechanism. Publish-gate integration, edge `reviewPass` label/icon repair, and `data-ui-affordance` DOM stamping are deferred.

## Adding a new industry

1. Create `src/platform/core/uiIntentProfiles/<industry>.ui.ts`.
2. Register in `UI_INTENT_PROFILES` map in `uiIntentProfile.ts`.
3. `hasUIIntentProfile(industry)` will start returning true; bindingGuide auto-emits the contract.

## Tests

`src/test/uiIntentProfile.test.ts` — 8 tests covering registry, salon shape, resolver coverage/required detection, `ifPageExists`, prompt block content, permissive no-op.
