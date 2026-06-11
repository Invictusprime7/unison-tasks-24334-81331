# UI-Intent Profile Layer

Adds a per-industry contract that declares *how* each canonical intent must surface in the UI (affordance type, icon set, label options, variant, required placements). Slots above existing intent binding system without changing what works. Orchestrated by the System Launcher wizard during Lane B seed, mirroring how industry intent profiles + capability bindings are already resolved.

## Architecture fit

Sits between `IndustryIntentProfile` (what intents must exist) and section components (what gets rendered):

```text
Capability Pack
    │
    ▼
IndustryIntentProfile  ── declares required/forbidden coreIntents + slot coords
    │
    ▼
UIIntentProfile  ◄── NEW: declares affordance/icon/label/variant per (intent, placement)
    │
    ▼
wizardCapabilityResolver  ── merges bindings + ui-intent resolution
    │
    ▼
builder_drafts.metadata.uiIntents  ── persisted slice (JSON)
    │
    ▼
VFS scaffolder + InteractiveIcon + AutoBinder  ── materializes affordances
    │
    ▼
IntegrityReport / Publish Gate  ── UIIntentConformanceCheck
```

No new tables. No DOM contract change. AI chooses *within* allowed sets; required placements are non-negotiable.

## Scope

Salon profile only in v1 (proves the layer end-to-end). Other industries fall back to a no-op "permissive" profile so nothing regresses. Forbidden/required UI rules apply only where a profile exists.

## Deliverables

1. **Schema** — `src/platform/core/uiIntentProfile.ts`
   - `UIIntentPlacement { pageRole, section, slot, affordance: 'button'|'icon-button'|'link'|'menu-item'|'card-cta', variant?, size?, icon: string | string[], labelOptions: string[], required: boolean, ifPageExists?: string }`
   - `UIIntentProfile { industry, intents: Record<CoreIntent, { placements: UIIntentPlacement[] }> }`
   - `UI_INTENT_PROFILES: Partial<Record<IndustryOverlay, UIIntentProfile>>`
   - `getUIIntentProfile(industry)` + permissive default.
   - Zod validator (`uiIntentProfileSchema`) reused by edge `reviewPass` and integrity check.

2. **Salon profile** — `src/platform/core/uiIntentProfiles/salon.ui.ts`
   - `booking.create`: hero/primary-cta (Button lg primary, `Calendar`, ["Book Now","Reserve","Schedule Visit"], required), services-grid/card-cta (Button default, `CalendarPlus`, ["Book","Reserve"], required), nav/nav-cta (Button primary, `Calendar`, ["Book"], required), footer/footer-cta (Button outline, `Calendar`, ["Book Now"], optional).
   - `contact.call`: hero/secondary-cta (icon-button, `Phone`, ["Call"], optional), footer/phone-link (link, `Phone`, required), nav/utility (icon-button, `Phone`, optional).
   - `location.directions`: footer/address-link (link, `MapPin`, ["Get Directions"], required), contact-page/address (link, required).
   - `newsletter.subscribe`: footer/newsletter-submit (Button default, `Mail`, ["Subscribe","Join"], optional).
   - `contact.email`: footer/email-link (link, `Mail`, optional).
   - `share.open`: services-grid/icon-share (icon-button, `Share2`, optional).
   - `favorite.toggle`: services-grid/icon-favorite (icon-button, `Heart`, optional).

3. **Resolver** — extend `src/services/wizardCapabilityResolver.ts`
   - New `resolveUIIntents(profile, bindings, availablePageRoles)` returns `{ resolvedPlacements, unsatisfiedRequired, conflicts }`.
   - For each binding from `synthesizeIndustryBindings`, look up the UI profile entry by `(coreIntent, pageRole, section, slot)`; pick first allowed `labelOption` (AI may override later within allowed set); attach `affordance`, `icon`, `variant`.
   - For required placements not covered by any binding → record `unsatisfiedRequired`.
   - Return added to `CapabilityResolutionResult.uiIntents`.

4. **AI prompt contract** — `supabase/functions/ai-code-assistant/wizardSeedPrompt.ts` (or current wizard prompt builder)
   - Inject resolved `uiIntents` JSON into prompt as `UI_INTENT_CONTRACT`.
   - Rule: AI must render each required placement exactly once, using one label from `labelOptions`, icon from `icon` set, affordance/variant as declared. AI may add optional placements when industry context warrants.

5. **VFS materialization** — `src/services/wizardBindingBridge.ts` + `src/runtime/autoBinder.ts`
   - When binding is stamped on a slot, also stamp `data-ui-affordance`, `data-ui-icon`, `data-ui-variant` (read from resolved profile) so the existing AutoBinder / InteractiveIcon pipeline can verify post-hoc.
   - `applyWizardBindingsToVfs` writes resolved placements into the section's JSX where the AI omitted them (post-pass; non-destructive — only fills missing required affordances).

6. **Persistence** — `builder_drafts.metadata.uiIntents` slice
   - Written by Launcher after resolver runs (same call site as `recommendedBindingsV2`).
   - Re-hydrated on Builder remount alongside bindings — no schema change, just an extra JSON key.

7. **Integrity + Publish Gate** — `src/services/siteIntegrityReport.ts` (UIIntentConformanceCheck)
   - For each `required` placement in the active profile, verify a DOM node with the matching `data-ut-intent` + slot coords exists in the generated VFS.
   - Missing required placements → publish blocker (joins existing Closure B logic).
   - Surface in Intent Health Pill alongside binding readiness.

8. **Edge `reviewPass`** — normalize: if AI emits a button for a required intent without the canonical icon/label set, repair to nearest allowed value before commit; log to `intent_execution_log`.

9. **Tests** — `src/test/uiIntentProfile.test.ts`
   - Schema validation.
   - Salon profile: `booking.create` resolves to hero/services/nav placements with allowed icons/labels.
   - Resolver: forbidden intent (e.g. `quote.request` on salon) produces no UI placement; missing required → `unsatisfiedRequired` populated.
   - Integrity: VFS missing hero booking button → publish blocked.
   - `applyWizardBindingsToVfs` stamps `data-ui-affordance` on existing buttons; doesn't duplicate.

## Out of scope (v1)

- Other industry profiles (contractor / restaurant / nonprofit / ecommerce / coaching) — placeholder permissive profiles only; follow-up PR.
- Visual-editor UI to edit `UIIntentProfile` (read-only this round).
- A11y rule expansion beyond what the affordance type already implies.
- Copy-pack pluralization / locale variants.

## Files touched

- New: `src/platform/core/uiIntentProfile.ts`
- New: `src/platform/core/uiIntentProfiles/salon.ui.ts`
- New: `src/platform/core/uiIntentProfiles/index.ts`
- New: `src/test/uiIntentProfile.test.ts`
- Edit: `src/services/wizardCapabilityResolver.ts` (add `resolveUIIntents`, extend result)
- Edit: `src/services/wizardBindingBridge.ts` (stamp affordance attrs; fill missing required)
- Edit: `src/services/siteIntegrityReport.ts` (UIIntentConformanceCheck → publish gate)
- Edit: `src/components/onboarding/SystemLauncher.tsx` (persist `uiIntents` into `builder_drafts.metadata`)
- Edit: `supabase/functions/ai-code-assistant/orchestrator.ts` or wizard prompt module (inject `UI_INTENT_CONTRACT`)
- Edit: `supabase/functions/ai-code-assistant/reviewPass.ts` (repair to allowed icon/label set)
- Edit: `.lovable/memory/index.md` + new memory file documenting the layer.

## Validation

- All 252+ existing tests pass.
- New tests for schema, resolver, integrity, bridge stamping.
- Manual: run salon wizard end-to-end; confirm hero/services/nav booking buttons render with canonical icons and labels; remove hero button in editor → publish gate blocks with actionable fix.

## Risks

- AI label drift: mitigated by `reviewPass` repair pass + integrity check.
- Section component doesn't expose the required slot: integrity check catches and reports; resolver's `ifPageExists` already filters.
- Other industries currently undeclared: permissive default = no-op, no regression.
