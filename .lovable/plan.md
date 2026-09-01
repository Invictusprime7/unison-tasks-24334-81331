# Repair the Wizard-to-Builder generation journey

## Goal
Make a multi-page Wizard launch complete its AI-authored Lane B output, seal one coherent SiteBundleSnapshot, and hand that exact snapshot to WebBuilder/Sandpack without returning to the launcher because of contradictory chrome rules or stacked request deadlines.

## Confirmed causes
- **Chrome ownership is split.** The launcher and final merge require each page to render one navbar and one footer, while the edge orchestrator and Stage 4b scaffold still instruct/build body-only pages around shared router chrome. The final merge then removes those shared modules, so valid generation can be rejected as “no navigation landmark.”
- **Healthy AI work is being cancelled.** A 120s browser ceiling undercuts the edge function’s 135s provider budget, with additional 2s/5s margins and nested abort controllers. Gateway logs include a client-cancelled HTTP 499.
- **The fixed 600s run budget cannot fit the current schedule.** One page per response, concurrency 2, up to three completion rounds, and module closure can consume the full budget before a typical 7–9 page site finishes.
- **The builder redirect is not the failing component.** Missing pages trigger `LaunchFatalError` before preflight, persistence, and handoff; the top-level catch intentionally leaves the launcher open.

## Implementation

### 1. One ownership rule, no prescriptive chrome contract
Keep a single structural rule and let Wizard generation decide everything else about navigation and footers.

- **Ownership (kept, non-negotiable):** each generated page owns its own chrome, because the canonical router is route-only and the final merge already removes shared chrome modules. Ambiguous ownership is what produced both the duplicate-chrome bug and the current false rejections.
- **Form (removed):** drop the prescriptive rules that dictate a specific primitive, tag, attribute, position, or link set. The AI may author a floating bar, sidebar, split header, overlay menu, minimal mark, or an unconventional per-industry treatment, and may vary it between sites.
- **Sync every generator to that single rule:** edge prompts/context builders, Stage 4b scaffolding, topology refresh, and generation briefs. Stop producing or depending on `SiteNavbar.tsx` / `SiteFooter.tsx` in Wizard artifacts.
- **Chrome checking becomes advisory, never fatal:** report missing or duplicated chrome as a launch note and at most one targeted repair turn. It can no longer reject a page or fail a launch, so an unusual-but-valid design ships.


### 2. Replace stacked timeout races with bounded scheduling
- Remove client-side timer aborts around in-flight AI/Gateway requests; retain cancellation only for explicit user cancellation.
- Remove the 120s browser ceiling and nested `withTimeout`/deadline margins that cancel work while the edge request is still valid.
- Remove per-provider timer slicing in the edge loop for Wizard generation; branch on returned HTTP status and apply bounded backoff only to 429/5xx responses.
- Replace the fixed 600s shared countdown with a page-count-aware scheduler: one page per response, bounded parallel waves, one targeted content-repair turn per rejected page, and a separate bounded module-closure pass.
- Use `Promise.allSettled`-style wave accounting so one failed request cannot discard successful sibling pages.

### 3. Preserve strict authorship without fallback leakage
- Keep the “every registered page is AI-authored” seal and module/import integrity checks.
- Do not substitute scaffold pages, remove repair/integrity gates, or create a second acceptance path.
- Classify failures by transport, retryable provider response, syntax error, and unresolved import; only retry the categories that can recover. Chrome and other visual notes never count as failures.
- Surface the exact terminal reason inline if a real provider/configuration failure remains, rather than the generic missing-pages summary.

### 4. Make handoff atomic and deterministic
- Run Lane B generation, per-page acceptance, module closure, canonical merge, and preflight as one explicit enrich transaction.
- Persist only after all registered pages pass; derive the deterministic router from the sealed PageRegistry immediately before commit.
- Hand WebBuilder the persisted revision/snapshot identity and verify Sandpack compiles the same resolved files before closing the launcher.

## Verification
- Add regression tests that run real Stage 4b scaffold output through chrome counting and final merge, proving exactly one navbar/footer survives per page and no shared chrome modules remain.
- Add scheduler tests for 4-, 7-, and 9-page sites, delayed responses, one retryable failure, one quality repair, and module closure; verify successful siblings are retained and no timer produces HTTP 499.
- Add an end-to-end Wizard launch test that confirms: all selected routes are AI-authored, PageRegistry paths match the deterministic router, the SiteBundleSnapshot is persisted once, WebBuilder opens, and Sandpack resolves every page/module.
- Invoke the changed AI route once and inspect the Gateway and edge-function response/logs before completion; then run focused pipeline, chrome, persistence, and preview tests.

## Technical scope
Primary areas: `SystemLauncher`, Wizard generation prompts/context builders, Stage 4b/topology scaffolding, provider loop/client request handling, canonical launch merge, launcher persistence/handoff, and focused tests. No scaffold fallback or integrity-boundary removal.
