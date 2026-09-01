# Repair the Wizard-to-Builder generation journey

## Goal
Make a multi-page Wizard launch complete its AI-authored Lane B output, seal one coherent SiteBundleSnapshot, and hand that exact snapshot to WebBuilder/Sandpack without returning to the launcher because of contradictory chrome rules or stacked request deadlines.

## Confirmed causes
- **Chrome ownership is split.** The launcher and final merge require each page to render one navbar and one footer, while the edge orchestrator and Stage 4b scaffold still instruct/build body-only pages around shared router chrome. The final merge then removes those shared modules, so valid generation can be rejected as “no navigation landmark.”
- **Healthy AI work is being cancelled.** A 120s browser ceiling undercuts the edge function’s 135s provider budget, with additional 2s/5s margins and nested abort controllers. Gateway logs include a client-cancelled HTTP 499.
- **The fixed 600s run budget cannot fit the current schedule.** One page per response, concurrency 2, up to three completion rounds, and module closure can consume the full budget before a typical 7–9 page site finishes.
- **The builder redirect is not the failing component.** Missing pages trigger `LaunchFatalError` before preflight, persistence, and handoff; the top-level catch intentionally leaves the launcher open.

## Implementation

### 1. Remove chrome as a platform contract entirely
Chrome is a design decision the Wizard AI makes per site and per page — not a platform requirement.

- **No chrome requirements anywhere:** delete chrome counting, chrome landmark prompts, chrome repair turns, and chrome-based page rejection from the launcher, edge prompts/context builders, generation briefs, and the presentation guard. A page is valid because it parses, resolves its imports, and serves its route — not because of any header/nav/footer shape.
- **Delete the hardcoded shared chrome system outright:** remove the canonical `SiteNavbar.tsx`/`SiteFooter.tsx` source templates and their path constants, the builder that injects them into the Stage 4b scaffold, the topology `refreshSharedChrome` step that re-adds them on edits, and the `globalSharedChrome` flag that makes the scaffold omit chrome from page bodies. Nothing generates them, so nothing needs to strip them — the merge-time deletion goes away with the modules rather than staying as a cleanup workaround.
- **One owner remains by construction:** page bodies are the only place chrome can exist, and the deterministic router stays route-only and never injects nav or footer. With no competing module and no router injection, overlapping chrome systems are structurally impossible instead of policed.
- **Navigation stays available by prompt, not by mandate:** generation briefs describe the site’s routes and tell the AI it *may* link between them however it sees fit (nav bar, inline links, footer menu, or none) — with zero enforcement.

### 1b. Each page contextually consistent, never a repeated hero
Freeing chrome must not turn into every page opening with the same hero block. Pages share the brand, not the layout.

- **Per-page role in the brief:** each generation brief carries that page's own purpose, audience moment, and expected content beats (home = positioning, services = offer depth, about = story/team, contact = conversion, etc.), plus the list of sibling pages and what they already cover, so the AI writes for that page rather than re-emitting the homepage.
- **Explicit anti-duplication directive:** the Lane B prompt forbids reusing the home hero's structure, headline pattern, media treatment, or CTA wording on secondary pages; each page must open in a way that fits its own role (split intro, list-led, editorial header, straight into content — the AI decides).
- **Shared identity stays fixed:** the sealed theme tokens, typography, palette, spacing, and voice continue to bind every page, so free-form layout does not become visually inconsistent.
- **Cross-page awareness at batch time:** since pages are generated one per response, each request includes a short digest of already-accepted pages (their opening pattern and section order) so later pages can deliberately differ.
- **Advisory similarity check, never fatal:** after acceptance, compare opening-section shape and headline text across pages; a near-duplicate triggers one targeted regeneration turn for that single page, and if it still matches, the page ships with a warning surfaced in the launch report — it never blocks the launch.


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
- Add a repo-wide guard test asserting no `SiteNavbar`/`SiteFooter` template, path constant, injector, refresh step, `globalSharedChrome` flag, or chrome requirement remains in any generator, prompt, scaffold, or guard.
- Add acceptance tests proving pages with any chrome style — floating bar, plain header, footer-only links, or none — pass acceptance and reach the preview unchanged.
- Add tests that a multi-page generation produces distinct opening sections/headlines per page, that the similarity check triggers exactly one regeneration turn, and that a still-similar page ships with a warning instead of failing the launch.
- Add scheduler tests for 4-, 7-, and 9-page sites, delayed responses, one retryable failure, one quality repair, and module closure; verify successful siblings are retained and no timer produces HTTP 499.
- Add an end-to-end Wizard launch test that confirms: all selected routes are AI-authored, PageRegistry paths match the deterministic router, the SiteBundleSnapshot is persisted once, WebBuilder opens, and Sandpack resolves every page/module.
- Invoke the changed AI route once and inspect the Gateway and edge-function response/logs before completion; then run focused pipeline, chrome, persistence, and preview tests.

## Technical scope
Primary areas: `SystemLauncher`, Wizard generation prompts/context builders, shared-chrome module and its scaffolding/refresh call sites, Stage 4b/topology scaffolding, presentation guard, provider loop/client request handling, canonical launch merge, launcher persistence/handoff, and focused tests. No scaffold fallback and no removal of syntax, import-closure, or persistence integrity boundaries.
