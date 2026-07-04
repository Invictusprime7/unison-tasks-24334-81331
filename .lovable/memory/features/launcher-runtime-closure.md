---
name: Launcher → Runtime Closure (businessId + industry + catalog hydration)
description: LaunchState carries top-level `industry`; SystemLauncher forwards it into intent-router via setDefaultIndustry; WebBuilder asserts real vs preview-placeholder businessId; autoEmitSectionBindings fires `lovable:catalog-seeded` window event so CatalogInspectorPanel and downstream consumers refresh without manual reload.
type: feature
---

## Wiring
1. `LaunchState.industry` (top-level) mirrors `blueprint.identity.industry`. `createLaunchState` back-fills from blueprint when caller omits it.
2. `SystemLauncher` passes `industry: resolvedIndustry` into `createLaunchState` and into the `install-system` body (persists on `businesses.industry`).
3. After `autoEmitSectionBindings` emits ≥1 binding, launcher dispatches:
   ```ts
   window.dispatchEvent(new CustomEvent('lovable:catalog-seeded', {
     detail: { businessId, projectId, industry, bindingIds }
   }));
   ```
4. `WebBuilder` calls `setDefaultBusinessId(effectiveBusinessId)` + `setDefaultIndustry(launch?.industry ?? snapshot.industry ?? activeSystemType)`. If `businessId` is a preview placeholder (no launcher provision), a `console.warn` fires — surface point for future Health Pill.
5. `intentRouter` injects `defaultIndustry` on every payload before dispatch so edge `intent-router` reads it without a DB round-trip on cold requests.
6. `CatalogInspectorPanel` listens for `lovable:catalog-seeded` and bumps its `reloadKey` when the event matches its `projectId` (or has no projectId filter).

## Publish gate
`buildNativePublishReadinessManifest` already uses `IndustryIntentProfiles` via `industryOverlay`. No changes required for Pass B — industry propagates via the same `resolvedIndustry` variable in SystemLauncher.

## Next
- **Pass C:** AI Builder migration proposals + user approval (`ai-builder-propose` / `ai-builder-apply` edge functions + `MigrationProposalPanel`).
- Optional: promote the businessId placeholder warn into an `IntentHealthPill` badge.
