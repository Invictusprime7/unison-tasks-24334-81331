# Goal

Guarantee that every interactive button across every industry site has a working `data-ut-intent` wired to a real page route (or capability target) *before* the generated VFS leaves the System Launcher and lands in Preview. Today only buttons that have an explicit entry in `siteBundleSnapshot.bindings` get stamped by `applyWizardBindingsToVfs`; everything else (AI-emitted "Learn More", footer column links, sub-page CTAs, "Read more" cards) ships unbound and renders as dead clicks on sub-routes.

# Strategy

Add a deterministic **Preflight Nav Wiring** stage that runs in the same pre-Preview pass as `applyWizardBindingsToVfs`, walking the VFS for unbound interactive elements and binding them to a page route resolved from:

1. Existing slot/markers (already covered by `applyWizardBindingsToVfs`).
2. Anchor `href`/`to` values that match a known route in `pageRegistry`.
3. Label text matched (case/punctuation-insensitive) against page `title` / `pageRole` / industry alias map (e.g. "Shop" → `/shop`, "Book" → `/booking`, "Contact us" → `/contact`).
4. Section context (e.g. NavbarSection link, FooterSection column item) — bind to nearest page role declared by the topology.
5. Capability fallback from `slotBindingPolicy` when no page match exists (e.g. "Book Now" with no booking page → `booking.create` if capability present, else strip the dead CTA from the gate report).

# Where it plugs in

```text
SystemLauncher AI payload
   ↓ sanitizeGeneratedFiles
   ↓ applyWizardBindingsToVfs        (explicit snapshot.bindings)
   ↓ preflightNavWiring (NEW)        ← this plan
   ↓ assessWizardGenerationQuality
   ↓ canonicalLaunchVfs.buildCanonicalLaunchArtifacts
        └ same preflight runs again for non-launcher entrypoints
   ↓ Preview
```

# Work items

### 1. `src/services/preflightNavWiring.ts` (new)

Pure function:

```ts
preflightNavWiring(
  files: Record<string,string>,
  snapshot: SiteBundleSnapshot,
): {
  files: Record<string,string>;
  wired: number;
  skipped: Array<{ filePath; label; reason }>;
}
```

Per file, walk JSX with the existing TS AST helpers in `wizardBindingBridge.ts`. For each `<button>/<a>/<Link>/<NavLink>/motion.button/motion.a>`:
- Skip if already has `data-ut-intent`.
- Resolve target page via the priority order above using `pageRegistry`, `pageRoleAliases`, and industry profile.
- Stamp `data-ut-intent="nav.goto"` + `data-ut-target-page-id="<pageId>"` + `data-ut-label="<label>"`.
- For anchors, also rewrite `href` to `#<route>` so HashRouter navigation works without JS.

### 2. Shared helpers extracted from `wizardBindingBridge.ts`

Move `resolveBindingFilePath`, `escapeAttr`, JSX walker, and `normalizeText` into `src/intents/jsxBindingUtils.ts`. `preflightNavWiring` and `applyWizardBindingsToVfs` both import. No behavior change for existing pass.

### 3. Wiring into the launcher pipeline

- `src/components/onboarding/SystemLauncher.tsx` — call `preflightNavWiring(boundFiles, siteBundleSnapshot)` right after the existing `applyWizardBindingsToVfs` call (~line 1730). Log `wired` + `skipped` into existing console group; feed `skipped` into the binding gate report.
- `src/services/canonicalLaunchVfs.ts` — same call inserted after `bindingApplication` (~line 242), so any non-launcher entry (Builder recompiles, replay) also gets the preflight.
- Both surfaces share one helper, so behavior is identical between first launch and re-hydration.

### 4. Gate + readiness reporting

- `src/services/intentReadinessService.ts` — surface preflight `skipped` items as `partial` (label couldn't resolve) vs `blocked` (label looks like nav but no candidate page). Keeps publish gate honest.
- Add `preflightNavWiring.applied` counter to the `binding_telemetry` already emitted by `persistGeneratedBindings.ts`.

### 5. Tests

- `src/test/preflightNavWiring.test.ts` (new): salon, ecommerce, nonprofit, coaching fixtures. Asserts every `<button>`/`<a>` in scaffolded files ends up with a `data-ut-intent` OR is on the skipped list with a reason.
- Extend `src/test/wizardIntentBinding.test.ts` with a fixture where AI emits a generic `<button>Contact us</button>` on the Services page — expect it bound to the Contact page id.

# Out of scope

- No prompt changes to the AI Lane B generator.
- No new DB tables (`intent_execution_log` already exists).
- No changes to Preview runtime intent dispatch — relies on existing `data-ut-intent` interceptor.
- Cart/booking/checkout behavioral intents stay the responsibility of `applyWizardBindingsToVfs` + `slotBindingPolicy`; preflight only fills the nav gap.

# Risk + rollback

- Pure additive pass; if it throws, both call sites already wrap in try/catch and fall back to the un-preflighted files (mirrors current binding-bridge pattern).
- Behind no flag — but the function is a no-op when `snapshot.pageRegistry.pages` has ≤1 route, so single-page industries are unaffected.
